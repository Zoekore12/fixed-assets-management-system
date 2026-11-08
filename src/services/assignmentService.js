const pool = require("../config/database");
const {createAuditLog} = require("../models/auditModel");


const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};


const assignAsset = async ({
  assetId,
  userId,
  assignedBy,
  notes = null,
  movementId = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // 1. Lock the asset
    // --------------------------------------------------
    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          status,
          condition,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id,
          is_active
        FROM assets
        WHERE id = $1
        FOR UPDATE
      `,
      [assetId]
    );

    if (assetResult.rowCount === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    // --------------------------------------------------
    // 2. Asset must be active
    // --------------------------------------------------
    if (!asset.is_active) {
      throw createError("This asset is inactive", 400);
    }

    // --------------------------------------------------
    // 3. Asset must be AVAILABLE
    // --------------------------------------------------
    if (asset.status !== "AVAILABLE") {
      throw createError(
        `Asset cannot be assigned while its status is ${asset.status}`,
        409
      );
    }

    if (asset.current_holder_id) {
      throw createError(
        "The asset is already assigned to a user",
        409
      );
    }

    if (asset.current_security_station_id) {
      throw createError(
        "The asset is still in Security custody",
        409
      );
    }

    // --------------------------------------------------
    // 4. Get receiving user and their building
    // --------------------------------------------------
    const userResult = await client.query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.staff_type,
          u.department_id,
          u.unit_id,
          u.is_active,
          d.building_id
        FROM users u
        LEFT JOIN departments d
          ON d.id = u.department_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      throw createError("User not found", 404);
    }

    const user = userResult.rows[0];
    
    // HOD and HOU may only reassign assets currently
    // assigned to them and within their own hierarchy.
    if (assigner.role === "HOD") {
      const canReassign =
        asset.current_holder_id === assigner.id &&
        asset.department_id === assigner.department_id &&
        asset.unit_id == null &&
        newUser.department_id === assigner.department_id;

      if (!canReassign) {
        throw createError(
          "HODs can only reassign department-level assets assigned to them to staff in their department",
          403
        );
      }
    }

    if (assigner.role === "HOU") {
      const canReassign =
        asset.current_holder_id === assigner.id &&
        Boolean(assigner.unit_id) &&
        asset.department_id === assigner.department_id &&
        asset.unit_id === assigner.unit_id &&
        newUser.department_id === assigner.department_id &&
        newUser.unit_id === assigner.unit_id;

      if (!canReassign) {
        throw createError(
          "HOUs can only reassign unit-level assets assigned to them to staff in their unit",
          403
        );
      }
    }


    // --------------------------------------------------
    // 5. User must be active
    // --------------------------------------------------
    if (!user.is_active) {
      throw createError(
        "Cannot assign an asset to an inactive user",
        400
      );
    }

    if (!user.department_id || !user.building_id) {
      throw createError(
        "The receiving user must belong to a department assigned to a building",
        400
      );
    }

    // --------------------------------------------------
    // 6. Ordinary assignment: location must already match
    // --------------------------------------------------
    if (!movementId) {
      // Building must match.
      if (asset.building_id !== user.building_id) {
        throw createError(
          "TRANSFER_REQUIRED: This asset belongs to another building. Submit a transfer request before assigning it.",
          409
        );
      }

      // A building-only asset must first be allocated
      // to a department.
      if (!asset.department_id) {
        throw createError(
          "This asset is allocated only to a building. Allocate it to a department or unit before assigning it to a staff member.",
          409
        );
      }

      // Department must match.
      if (asset.department_id !== user.department_id) {
        throw createError(
          "TRANSFER_REQUIRED: This asset belongs to another department. Submit a transfer request before assigning it.",
          409
        );
      }

      // If the asset is unit-specific, the receiving
      // user must belong to that unit.
      if (
        asset.unit_id &&
        asset.unit_id !== user.unit_id
      ) {
        throw createError(
          "TRANSFER_REQUIRED: This asset belongs to another unit. Submit a transfer request before assigning it.",
          409
        );
      }
    }

    // --------------------------------------------------
    // 7. Validate transfer-linked assignment
    // --------------------------------------------------
    let movement = null;

    if (movementId) {
      const movementResult = await client.query(
        `
          SELECT
            id,
            asset_id,
            from_building_id,
            from_department_id,
            from_unit_id,
            to_building_id,
            to_department_id,
            to_unit_id,
            movement_status,
            moved_by,
            mover_confirmed_at,
            security_verified_by,
            security_verified_at,
            building_checkin_by,
            building_checkin_at
          FROM asset_movements
          WHERE id = $1
          FOR UPDATE
        `,
        [movementId]
      );

      if (movementResult.rowCount === 0) {
        throw createError(
          "Transfer movement not found",
          404
        );
      }

      movement = movementResult.rows[0];

      // 7A. Movement must belong to this asset.
      if (movement.asset_id !== assetId) {
        throw createError(
          "This transfer does not belong to the selected asset",
          409
        );
      }

      // 7B. Transfer must have arrived.
      if (movement.movement_status !== "ARRIVED") {
        throw createError(
          `The transfer must be ARRIVED before assignment. Current status: ${movement.movement_status}`,
          409
        );
      }

      // 7C. Validate destination hierarchy.
      if (
        !movement.to_department_id &&
        movement.to_unit_id
      ) {
        throw createError(
          "A destination unit cannot be selected without a destination department",
          400
        );
      }

      // 7D. Determine whether the transfer destination
      // was building-only, department-only, or unit-level.
      const isBuildingOnlyTransfer =
        !movement.to_department_id &&
        !movement.to_unit_id;

      const isDepartmentOnlyTransfer =
        Boolean(movement.to_department_id) &&
        !movement.to_unit_id;

      const isUnitTransfer =
        Boolean(movement.to_department_id) &&
        Boolean(movement.to_unit_id);

      // 7E. The asset must have reached the destination
      // building before it can be allocated or assigned.
      if (asset.building_id !== movement.to_building_id) {
        throw createError(
          "The asset has not been received at the destination building",
          409
        );
      }

      if (isBuildingOnlyTransfer) {
        // The transfer originally targeted only a building.
        // The Administrator must allocate the asset first.
        if (!asset.department_id) {
          throw createError(
            "This asset has arrived at the building but has not been allocated to a department. Allocate it before assigning it.",
            409
          );
        }

        // If the asset has been allocated to a unit,
        // the unit must belong to the target user.
        if (
          asset.unit_id &&
          asset.unit_id !== user.unit_id
        ) {
          throw createError(
            "The receiving user does not belong to the asset's allocated unit",
            403
          );
        }

        // For a building-only transfer, the target user
        // must match the asset's current allocation.
        if (asset.department_id !== user.department_id) {
          throw createError(
            "The receiving user does not belong to the asset's allocated department",
            403
          );
        }
      } else {
        // For transfers that specified a department,
        // the asset's location must match the destination.
        if (
          (asset.department_id ?? null) !==
            (movement.to_department_id ?? null) ||
          (asset.unit_id ?? null) !==
            (movement.to_unit_id ?? null)
        ) {
          throw createError(
            "The asset's recorded location does not match the transfer destination. Complete the transfer receipt and location update first.",
            409
          );
        }

        // The receiving user must belong to the destination
        // department.
        if (
          user.department_id !== movement.to_department_id
        ) {
          throw createError(
            "The receiving user does not belong to the transfer destination department",
            403
          );
        }

        // Keep your existing policy that department-only
        // transfers must be assigned to an HOD.
        if (
          isDepartmentOnlyTransfer &&
          user.role !== "HOD"
        ) {
          throw createError(
            "A department-level transfer must be assigned to the Head of Department",
            403
          );
        }

        // Unit-level transfers require a user in that unit.
        if (
          isUnitTransfer &&
          user.unit_id !== movement.to_unit_id
        ) {
          throw createError(
            "The receiving user does not belong to the transfer destination unit",
            403
          );
        }
      }

      // 7F. The receiving user's building must match
      // the transfer destination.
      if (user.building_id !== movement.to_building_id) {
        throw createError(
          "The receiving user's building does not match the transfer destination",
          403
        );
      }

      // 7I. The receiving user must be at the same
      // building as the asset.
      if (user.building_id !== movement.to_building_id) {
        throw createError(
          "The receiving user's building does not match the transfer destination",
          403
        );
      }
    }

    // --------------------------------------------------
    // 8. Prevent duplicate active assignments
    // --------------------------------------------------
    const existingAssignment = await client.query(
      `
        SELECT id
        FROM asset_assignments
        WHERE asset_id = $1
          AND status = 'ACTIVE'
        LIMIT 1
      `,
      [assetId]
    );

    if (existingAssignment.rowCount > 0) {
      throw createError(
        "This asset already has an active assignment",
        409
      );
    }

    // --------------------------------------------------
    // 9. Create assignment
    // --------------------------------------------------
    const assignmentResult = await client.query(
      `
        INSERT INTO asset_assignments (
          asset_id,
          user_id,
          assigned_by,
          assigned_at,
          status,
          notes,
          movement_id
        )
        VALUES (
          $1,
          $2,
          $3,
          CURRENT_TIMESTAMP,
          'ACTIVE',
          $4,
          $5
        )
        RETURNING
          id,
          asset_id,
          user_id,
          assigned_by,
          assigned_at,
          returned_at,
          status,
          notes,
          movement_id
      `,
      [
        assetId,
        userId,
        assignedBy,
        notes,
        movementId,
      ]
    );

    const assignment = assignmentResult.rows[0];

    // --------------------------------------------------
    // 10. Update custody only.
    // Do NOT change building, department, or unit here.
    // --------------------------------------------------
    const updatedAssetResult = await client.query(
      `
        UPDATE assets
        SET
          current_holder_id = $1,
          current_security_station_id = NULL,
          status = 'ASSIGNED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          asset_tag,
          name,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id,
          status,
          condition,
          updated_at
      `,
      [userId, assetId]
    );

    const updatedAsset = updatedAssetResult.rows[0];

    // --------------------------------------------------
    // 11. Audit log
    // --------------------------------------------------
    await createAuditLog({
      userId: assignedBy,
      action: "ASSIGN",
      entityType: "ASSET",
      entityId: asset.id,

      oldData: {
        status: asset.status,
        current_holder_id: asset.current_holder_id,
        building_id: asset.building_id,
        department_id: asset.department_id,
        unit_id: asset.unit_id,
        current_security_station_id:
          asset.current_security_station_id,
      },

      newData: {
        status: updatedAsset.status,
        current_holder_id: updatedAsset.current_holder_id,
        building_id: updatedAsset.building_id,
        department_id: updatedAsset.department_id,
        unit_id: updatedAsset.unit_id,
        current_security_station_id:
          updatedAsset.current_security_station_id,
        assignment_id: assignment.id,
        assigned_to: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },

      description:
        `Asset ${asset.asset_tag} was assigned to ${user.name}`,

      client,
    });

    if (movementId) {
      const completedMovement = await client.query(
        `UPDATE asset_movements
        SET movement_status = 'COMPLETED'
        WHERE id = $1
          AND asset_id = $2
          AND movement_status = 'ARRIVED'
        RETURNING id`,
        [movementId, assetId]
      );

      if (completedMovement.rowCount !== 1) {
        throw createError(
          "Transfer could not be completed. Verify its current status.",
          409
        );
      }
    }

    // --------------------------------------------------
    // 12. Commit transaction
    // --------------------------------------------------
    await client.query("COMMIT");

    // --------------------------------------------------
    // 13. Return result
    // --------------------------------------------------
    return {
      assignment,
      asset: updatedAsset,
      user,
      transfer: movement
        ? {
            id: movement.id,
            status: movement.movement_status,
          }
        : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


module.exports = {
  assignAsset,
};