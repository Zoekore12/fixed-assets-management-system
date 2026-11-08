const pool = require("../config/database");
const { createAuditLog } = require("../models/auditModel");

const {
  getAssetMovementById,
} = require("../models/movementModel");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const approveTransfer = async ({
  movementId,
  approverId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get and lock the transfer request
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
          moved_by,
          authorized_by,
          movement_type,
          reason,
          notes,
          movement_status
        FROM asset_movements
        WHERE id = $1
        FOR UPDATE
      `,
      [movementId]
    );

    if (movementResult.rowCount === 0) {
      throw createError(
        "Transfer request not found",
        404
      );
    }

    const movement = movementResult.rows[0];

    // 2. Transfer must still be pending
    if (movement.movement_status !== "PENDING") {
      throw createError(
        `This transfer cannot be approved because its current status is ${movement.movement_status}`,
        400
      );
    }

    // 3. Get the asset and lock it
    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          status,
          is_active
        FROM assets
        WHERE id = $1
        FOR UPDATE
      `,
      [movement.asset_id]
    );

    if (assetResult.rowCount === 0) {
      throw createError(
        "Asset associated with this transfer was not found",
        404
      );
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active) {
      throw createError(
        "This asset is inactive",
        400
      );
    }

    // 4. Make sure the asset has not moved since the transfer request was created
    if (
      asset.building_id !== movement.from_building_id ||
      asset.department_id !== movement.from_department_id ||
      asset.unit_id !== movement.from_unit_id
    ) {
      throw createError(
        "The asset location has changed since this transfer request was created",
        409
      );
    }

    // 5. Get the person trying to approve
    const approverResult = await client.query(
      `
        SELECT
          id,
          name,
          email,
          role,
          staff_type,
          department_id,
          unit_id,
          is_active
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [approverId]
    );

    if (approverResult.rowCount === 0) {
      throw createError(
        "Approving user not found",
        404
      );
    }

    const approver = approverResult.rows[0];

    if (!approver.is_active) {
      throw createError(
        "The approving user is inactive",
        403
      );
    }

    // 6. Determine which authority is required
    let requiredRole;

      const isDifferentBuilding =
        movement.from_building_id !== movement.to_building_id;

      const isDifferentDepartment =
        movement.from_department_id !== movement.to_department_id;

      const isDifferentUnit =
        movement.from_unit_id !== movement.to_unit_id;

      // Building-only transfer:
      // destination building exists, but no department/unit
      const isBuildingOnlyTransfer =
        movement.to_department_id === null &&
        movement.to_unit_id === null;

      if (isBuildingOnlyTransfer) {
        // Moving an asset to another building without
        // assigning it to a department/unit.
        requiredRole = "Administrator";
      } else if (isDifferentBuilding) {
        // Cross-building transfer
        requiredRole = "Administrator";
      } else if (isDifferentDepartment) {
        // Different departments in the same building
        requiredRole = "Administrator";
      } else if (isDifferentUnit) {
        // Different units in the same department
        requiredRole = "HOD";
      } else {
        // Same unit
        requiredRole = "HOU";
      }

      // 7. Administrator approval
      if (requiredRole === "Administrator") {
        if (approver.role !== "Administrator") {
          throw createError(
            "Only an Administrator can approve this transfer",
            403
          );
        }
      }

      // 8. HOD approval
      if (requiredRole === "HOD") {
        if (approver.role !== "HOD") {
          throw createError(
            "Only the Head of Department can approve this transfer",
            403
          );
        }

        if (
          !movement.from_department_id ||
          approver.department_id !== movement.from_department_id
        ) {
          throw createError(
            "You are not the Head of the asset's originating department",
            403
          );
        }
      }

      // 9. HOU approval
      if (requiredRole === "HOU") {
        if (approver.role !== "HOU") {
          throw createError(
            "Only the Head of Unit can approve this transfer",
            403
          );
        }

        if (
          !movement.from_department_id ||
          approver.department_id !== movement.from_department_id
        ) {
          throw createError(
            "You are not in the asset's originating department",
            403
          );
        }

        if (
          !movement.from_unit_id ||
          approver.unit_id !== movement.from_unit_id
        ) {
          throw createError(
            "You are not the Head of the asset's originating unit",
            403
          );
        }
      }

    // 10. Approve the transfer
      const updatedMovementResult = await client.query(
        `
          UPDATE asset_movements
          SET
            movement_status = 'APPROVED',
            authorized_by = $1
          WHERE id = $2
          RETURNING *
        `,
        [approverId, movementId]
      );

    const updatedMovement = updatedMovementResult.rows[0];

      await createAuditLog({
        userId: approverId,
        action: "APPROVE_TRANSFER",
        entityType: "ASSET_MOVEMENT",
        entityId: updatedMovement.id,

        oldData: {
          movement_status: movement.movement_status,
          authorized_by: movement.authorized_by,
        },

        newData: {
          movement_status: updatedMovement.movement_status,
          authorized_by: updatedMovement.authorized_by,

          asset_id: updatedMovement.asset_id,

          from_building_id: updatedMovement.from_building_id,
          from_department_id: updatedMovement.from_department_id,
          from_unit_id: updatedMovement.from_unit_id,

          to_building_id: updatedMovement.to_building_id,
          to_department_id: updatedMovement.to_department_id,
          to_unit_id: updatedMovement.to_unit_id,

          movement_type: updatedMovement.movement_type,
          reason: updatedMovement.reason,
        },

        description: `Transfer request for asset ${asset.asset_tag} was approved`,

        client,
      });

    await client.query("COMMIT");

    // 11. Return the complete movement
    return await getAssetMovementById(
      movementId
    );

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  approveTransfer,
};