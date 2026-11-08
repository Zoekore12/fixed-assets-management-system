const pool = require("../config/database");
const { createAuditLog } = require("../models/auditModel");

const {
  createAssetMovement,
  getAssetMovementById,
} = require("../models/movementModel");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createTransferRequest = async ({
  assetId,
  requestedBy,
  toBuildingId,
  toDepartmentId,
  toUnitId,
  toUserId,
  reason,
  notes,
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
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    // --------------------------------------------------
    // 2. Basic asset validation
    // --------------------------------------------------

    if (!asset.is_active) {
      throw createError("This asset is inactive", 400);
    }

    if (!["ASSIGNED", "AVAILABLE"].includes(asset.status)) {
      throw createError(
        `This asset cannot be transferred because its current status is ${asset.status}`,
        400
      );
    }

    // --------------------------------------------------
    // 3. Validate destination
    // --------------------------------------------------

    const isCrossBuilding = asset.building_id !== toBuildingId;

    if (!toBuildingId) {
      throw createError(
        "Destination building is required",
        400
      );
    }
    if (!isCrossBuilding && !toDepartmentId) {
      throw createError(
        "Destination department is required for transfers within the same building",
        400
      );
    }
    // --------------------------------------------------
    // 4. Verify destination building
    // --------------------------------------------------

    const buildingResult = await client.query(
      `
        SELECT
          id,
          name
        FROM buildings
        WHERE id = $1
        LIMIT 1
      `,
      [toBuildingId]
    );

    if (buildingResult.rows.length === 0) {
      throw createError(
        "Destination building not found",
        404
      );
    }


    // --------------------------------------------------
    // 5. Verify destination department
    // --------------------------------------------------


    if (toDepartmentId) {
        const departmentResult = await client.query(
          `
            SELECT id
            FROM departments
            WHERE id = $1
              AND building_id = $2
          `,
          [toDepartmentId, toBuildingId]
        );

        if (departmentResult.rowCount === 0) {
          throw createError(
            "Destination department does not belong to the destination building",
            400
          );
        }
      }

    // --------------------------------------------------
    // 6. Verify destination unit
    // --------------------------------------------------

    if (toUnitId) {
        const unitResult = await client.query(
          `
            SELECT id
            FROM units
            WHERE id = $1
              AND department_id = $2
          `,
          [toUnitId, toDepartmentId]
        );

        if (unitResult.rowCount === 0) {
          throw createError(
            "Destination unit does not belong to the destination department",
            400
          );
        }
      }


    //protection  against unit being provided without department
    if (toUnitId && !toDepartmentId) {
        throw createError(
          "A destination department is required when specifying a destination unit",
          400
        );
    }
    // --------------------------------------------------
    // 6A. Validate optional designated receiver
    // --------------------------------------------------

    let receiver = null;

    if (toUserId) {
      const receiverResult = await client.query(
        `
          SELECT
            u.id,
            u.name,
            u.role,
            u.department_id,
            u.unit_id,
            u.is_active,
            d.building_id
          FROM users u
          LEFT JOIN departments d
            ON d.id = u.department_id
          WHERE u.id = $1
          FOR UPDATE OF u
        `,
        [toUserId]
      );

      if (receiverResult.rowCount === 0) {
        throw createError("Transfer receiver not found", 404);
      }

      receiver = receiverResult.rows[0];

      if (!receiver.is_active) {
        throw createError(
          "The designated receiver is inactive",
          400
        );
      }

      if (
        String(receiver.building_id) !== String(toBuildingId)
      ) {
        throw createError(
          "The receiver does not belong to the destination building",
          400
        );
      }

      if (
        toDepartmentId &&
        String(receiver.department_id) !== String(toDepartmentId)
      ) {
        throw createError(
          "The receiver does not belong to the destination department",
          400
        );
      }

      if (
        toUnitId &&
        String(receiver.unit_id) !== String(toUnitId)
      ) {
        throw createError(
          "The receiver does not belong to the destination unit",
          400
        );
      }
    }
      

    // --------------------------------------------------
    // 7. Prevent transfer to same location
    // --------------------------------------------------

    const sameLocation =
      asset.building_id === toBuildingId &&
      asset.department_id === toDepartmentId &&
      asset.unit_id === toUnitId;

    if (sameLocation) {
      throw createError(
        "The asset is already located at the selected destination",
        400
      );
    }

    // --------------------------------------------------
    // 8. Prevent duplicate active transfer
    // --------------------------------------------------

    const existingMovementResult = await client.query(
      `
        SELECT
          id,
          movement_status
        FROM asset_movements
        WHERE asset_id = $1
          AND movement_status IN (
            'PENDING',
            'APPROVED',
            'IN_TRANSIT'
          )
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [assetId]
    );

    if (existingMovementResult.rows.length > 0) {
      const existingMovement =
        existingMovementResult.rows[0];

      if (
        existingMovement.movement_status === "PENDING"
      ) {
        throw createError(
          "A transfer request for this asset is already pending approval",
          409
        );
      }

      if (
        existingMovement.movement_status === "APPROVED"
      ) {
        throw createError(
          "This asset already has an approved transfer",
          409
        );
      }

      if (
        existingMovement.movement_status === "IN_TRANSIT"
      ) {
        throw createError(
          "This asset is already in transit",
          409
        );
      }
    }

    // --------------------------------------------------
    // 9. Validate transfer information
    // --------------------------------------------------

    if (!reason || !reason.trim()) {
      throw createError(
        "Reason for transfer is required",
        400
      );
    }

    // --------------------------------------------------
    // 10. Verify requesting user
    // --------------------------------------------------

    const userResult = await client.query(
      `
        SELECT
          id,
          name,
          email,
          role,
          staff_type,
          is_active
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [requestedBy]
    );

    if (userResult.rows.length === 0) {
      throw createError(
        "Requesting user not found",
        404
      );
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw createError(
        "The requesting user is inactive",
        400
      );
    }

    // --------------------------------------------------
    // 11. Determine initial transfer status
    // --------------------------------------------------

    const isAdministrator =
      user.role === "Administrator";

    const movementStatus = isAdministrator
      ? "APPROVED"
      : "PENDING";

    const authorizedBy = isAdministrator
      ? requestedBy
      : null;

    // --------------------------------------------------
    // 12. Create transfer request
    // --------------------------------------------------

    

    const movement = await createAssetMovement(
      {
        assetId,

        // Current asset location
        fromBuildingId: asset.building_id,
        fromDepartmentId: asset.department_id,
        fromUnitId: asset.unit_id,

        // Destination
        toBuildingId,
        toDepartmentId,
        toUnitId,

        // Requester
        requestedBy,

        // Physical mover is assigned later
        movedBy: null,

        // Administrator is automatically the approver
        authorizedBy,

        movementType: "TRANSFER",

        reason: reason.trim(),

        notes: notes
          ? notes.trim()
          : null,

        movementStatus,
      },
      client
    );
    //log the creation of the transfer request
    await createAuditLog({
        userId: requestedBy,
        action: "REQUEST_TRANSFER",
        entityType: "ASSET_MOVEMENT",
        entityId: movement.id,

        oldData: null,

        newData: {
          movement_status: movement.movement_status,
          movement_type: movement.movement_type,

          asset_id: movement.asset_id,

          requested_by: movement.requested_by,
          moved_by: movement.moved_by,
          authorized_by: movement.authorized_by,

          from_building_id: movement.from_building_id,
          from_department_id: movement.from_department_id,
          from_unit_id: movement.from_unit_id,

          to_building_id: movement.to_building_id,
          to_department_id: movement.to_department_id,
          to_unit_id: movement.to_unit_id,

          reason: movement.reason,
          notes: movement.notes,
        },

        description: `Transfer request created for asset ${asset.asset_tag}`,

        client,
      });
    // --------------------------------------------------
    // 13. Commit transaction
    // --------------------------------------------------

    await client.query("COMMIT");

    // --------------------------------------------------
    // 14. Return complete movement
    // --------------------------------------------------

    return await getAssetMovementById(movement.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const assignTransferMover = async ({
  movementId,
  movedBy,
  assignedBy,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find and lock the transfer
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
          requested_by,
          moved_by,
          movement_status
        FROM asset_movements
        WHERE id = $1
        FOR UPDATE
      `,
      [movementId]
    );

    if (movementResult.rowCount === 0) {
      throw createError("Transfer request not found", 404);
    }

    const movement = movementResult.rows[0];

    // 2. Only approved transfers can have a mover assigned
    if (movement.movement_status !== "APPROVED") {
      throw createError(
        `A mover can only be assigned to an APPROVED transfer. Current status: ${movement.movement_status}`,
        400
      );
    }

    // 3. Get the person assigning the mover
    const assignerResult = await client.query(
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
      [assignedBy]
    );

    if (assignerResult.rowCount === 0) {
      throw createError("Assigning user not found", 404);
    }

    const assigner = assignerResult.rows[0];

    if (!assigner.is_active) {
      throw createError(
        "The assigning user is inactive",
        403
      );
    }

    // 4. Check authorization based on transfer scope
    if (assigner.role === "Administrator") {
      // Administrator can assign movers for any transfer.
    } else if (assigner.role === "HOD") {
      if (
        assigner.department_id !==
        movement.from_department_id
      ) {
        throw createError(
          "You can only assign movers for transfers originating from your department",
          403
        );
      }
    } else if (assigner.role === "HOU") {
      if (
        assigner.department_id !==
        movement.from_department_id
      ) {
        throw createError(
          "You can only assign movers for transfers originating from your department",
          403
        );
      }

      if (
        assigner.unit_id !==
        movement.from_unit_id
      ) {
        throw createError(
          "You can only assign movers for transfers originating from your unit",
          403
        );
      }
    } else {
      throw createError(
        "You do not have permission to assign a mover",
        403
      );
    }

    // 5. Find the selected mover
    const moverResult = await client.query(
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
      [movedBy]
    );

    if (moverResult.rowCount === 0) {
      throw createError("Mover not found", 404);
    }

    const mover = moverResult.rows[0];

    // 6. Mover must be active
    if (!mover.is_active) {
      throw createError(
        "The selected mover is inactive",
        400
      );
    }

    // 7. Mover must be Staff
    if (mover.role !== "Staff") {
      throw createError(
        "The assigned mover must have the Staff role",
        400
      );
    }

    // 8. Assign the mover
    await client.query(
      `
        UPDATE asset_movements
        SET moved_by = $1
        WHERE id = $2
      `,
      [movedBy, movementId]
    );

    await client.query("COMMIT");

    return await getAssetMovementById(movementId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const startTransfer = async ({
  movementId,
  moverId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");


    // Lock the transfer
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
          requested_by,
          moved_by,
          authorized_by,
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

    //cross building transfer requires building checkout
    if (movement.from_building_id !== movement.to_building_id) {
      throw createError(
        "Cross-building transfers must use the building checkout process",
        400
      );
    }

    // Transfer must be approved
    if (movement.movement_status !== "APPROVED") {
      throw createError(
        `This transfer cannot be started because its current status is ${movement.movement_status}`,
        400
      );
    }

    // A mover must already be assigned
    if (!movement.moved_by) {
      throw createError(
        "No mover has been assigned to this transfer",
        400
      );
    }

    // Only the assigned mover can start the transfer
    if (movement.moved_by !== moverId) {
      throw createError(
        "Only the assigned mover can start this transfer",
        403
      );
    }

    // Verify mover is still active
    const moverResult = await client.query(
      `
        SELECT
          id,
          name,
          role,
          staff_type,
          is_active
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [moverId]
    );

    if (moverResult.rowCount === 0) {
      throw createError(
        "Assigned mover not found",
        404
      );
    }

    const mover = moverResult.rows[0];

    if (!mover.is_active) {
      throw createError(
        "The assigned mover is inactive",
        403
      );
    }

    // Lock the asset
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

    // Make sure the asset has not moved since the request
    if (
      asset.building_id !== movement.from_building_id ||
      asset.department_id !== movement.from_department_id ||
      asset.unit_id !== movement.from_unit_id
    ) {
      throw createError(
        "The asset location has changed since this transfer was created",
        409
      );
    }

    // Only certain asset states can begin a transfer
    if (
      !["ASSIGNED", "AVAILABLE"].includes(
        asset.status
      )
    ) {
      throw createError(
        `The asset cannot enter transit because its current status is ${asset.status}`,
        400
      );
    }

    // Update transfer
    await client.query(
      `
        UPDATE asset_movements
        SET
          movement_status = 'IN_TRANSIT',
          movement_date = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [movementId]
    );

    // Update asset status
    await client.query(
      `
        UPDATE assets
        SET
          status = 'IN_TRANSIT',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [movement.asset_id]
    );

    await client.query("COMMIT");

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

const confirmMoverPossession = async ({
  movementId,
  moverId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock the transfer
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
          mover_confirmed_at,
          security_verified_by,
          security_verified_at,
          movement_status,
          movement_type
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

    // 2. Must be a transfer
    if (movement.movement_type !== "TRANSFER") {
      throw createError(
        "Mover possession confirmation is only available for asset transfers",
        400
      );
    }

    // 3. Only APPROVED transfers can be confirmed
    if (movement.movement_status !== "APPROVED") {
      throw createError(
        `Mover cannot confirm this transfer because its current status is ${movement.movement_status}`,
        400
      );
    }

    // 4. Verify a mover was assigned
    if (!movement.moved_by) {
      throw createError(
        "No mover has been assigned to this transfer",
        400
      );
    }

    // 5. Only the assigned mover can confirm possession
    if (movement.moved_by !== moverId) {
      throw createError(
        "You are not the assigned mover for this transfer",
        403
      );
    }

    // 6. Prevent duplicate confirmation
    if (movement.mover_confirmed_at) {
      throw createError(
        "The mover has already confirmed possession of this asset",
        409
      );
    }

    // 7. Security must not have already verified the exit
    if (
      movement.security_verified_by ||
      movement.security_verified_at
    ) {
      throw createError(
        "Security has already verified this transfer exit",
        409
      );
    }

    // 8. Verify mover
    const moverResult = await client.query(
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
      [moverId]
    );

    if (moverResult.rowCount === 0) {
      throw createError(
        "Mover not found",
        404
      );
    }

    const mover = moverResult.rows[0];

    if (!mover.is_active) {
      throw createError(
        "The assigned mover is inactive",
        403
      );
    }

    if (mover.role !== "Staff") {
      throw createError(
        "The assigned mover must have the Staff role",
        403
      );
    }

    // 9. Lock the asset
    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          status,
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
      [movement.asset_id]
    );

    if (assetResult.rowCount === 0) {
      throw createError(
        "Asset associated with this transfer was not found",
        404
      );
    }

    const asset = assetResult.rows[0];

    // 10. Asset must be active
    if (!asset.is_active) {
      throw createError(
        "This asset is inactive",
        400
      );
    }

    // 11. Asset must still be at origin building
    if (
      asset.building_id !==
      movement.from_building_id
    ) {
      throw createError(
        "This asset is no longer located at the origin building",
        409
      );
    }

    // 12. Asset cannot already be in transit
    if (asset.status === "IN_TRANSIT") {
      throw createError(
        "This asset is already in transit",
        409
      );
    }

    // 13. Asset must be AVAILABLE or ASSIGNED
    if (
      asset.status !== "AVAILABLE" &&
      asset.status !== "ASSIGNED"
    ) {
      throw createError(
        `The asset cannot be confirmed because its current status is ${asset.status}`,
        400
      );
    }

    // 14. Determine whether this is a building-only transfer
    const isBuildingOnlyTransfer =
      movement.to_department_id === null &&
      movement.to_unit_id === null;

    /*
      BUILDING-ONLY TRANSFER

      Security is currently the custodian.
      The mover is only the physical person transporting
      the asset.

      Therefore:
        current_holder_id = NULL
        current_security_station_id = origin station
    */

    if (isBuildingOnlyTransfer) {
      if (asset.current_holder_id !== null) {
        throw createError(
          "A building-only transfer cannot have a current asset holder during mover confirmation",
          409
        );
      }

      if (!asset.current_security_station_id) {
        throw createError(
          "The building-only transfer asset is not currently in Security custody",
          409
        );
      }
    }

    /*
      DEPARTMENT / UNIT TRANSFER

      The existing holder may remain the recorded holder
      while the mover transports the asset.

      IMPORTANT:
      We do NOT set current_holder_id = moverId.

      moverId is recorded in:
        asset_movements.moved_by
    */

    // 15. Record mover confirmation
        const updatedMovementResult = await client.query(
      `
        UPDATE asset_movements
        SET
          mover_confirmed_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [movementId]
    );

    const updatedMovement = updatedMovementResult.rows[0];
    //audit logs
    await createAuditLog({
      userId: moverId,
      action: "MOVER_CONFIRM",
      entityType: "ASSET_MOVEMENT",
      entityId: movement.id,

      oldData: {
        movement_status: movement.movement_status,
        moved_by: movement.moved_by,
        mover_confirmed_at: movement.mover_confirmed_at,
        security_verified_by: movement.security_verified_by,
        security_verified_at: movement.security_verified_at,
      },

      newData: {
        movement_status: updatedMovement.movement_status,
        moved_by: updatedMovement.moved_by,
        mover_confirmed_at: updatedMovement.mover_confirmed_at,
        security_verified_by: updatedMovement.security_verified_by,
        security_verified_at: updatedMovement.security_verified_at,

        asset_id: movement.asset_id,

        from_building_id: movement.from_building_id,
        from_department_id: movement.from_department_id,
        from_unit_id: movement.from_unit_id,

        to_building_id: movement.to_building_id,
        to_department_id: movement.to_department_id,
        to_unit_id: movement.to_unit_id,
      },

      description: `Mover ${mover.name} confirmed possession of asset ${asset.asset_tag}`,

      client,
    });

    await client.query("COMMIT");

    // 16. Return updated movement
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



const completeTransfer = async ({ movementId, receiverId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // 1. Lock the transfer movement
    // --------------------------------------------------

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
          to_user_id,
          requested_by,
          moved_by,
          authorized_by,
          movement_status,
          mover_confirmed_at,
          security_verified_by,
          security_verified_at,
          building_checkin_by,
          building_checkin_at,
          received_by,
          received_at
        FROM asset_movements
        WHERE id = $1
        FOR UPDATE
      `,
      [movementId]
    );

    if (movementResult.rowCount === 0) {
      throw createError("Transfer movement not found", 404);
    }

    const movement = movementResult.rows[0];

    // --------------------------------------------------
    // 2. Determine transfer type
    // --------------------------------------------------

    const isCrossBuildingTransfer =
      String(movement.from_building_id) !==
      String(movement.to_building_id);

    const isBuildingOnlyTransfer =
      movement.to_department_id === null &&
      movement.to_unit_id === null;

    const isUnitTransfer =
      movement.to_department_id !== null &&
      movement.to_unit_id !== null;

    const isDepartmentTransfer =
      movement.to_department_id !== null &&
      movement.to_unit_id === null;

    // --------------------------------------------------
    // 3. Building-only transfers remain at destination
    // Security after check-in.
    //
    // They must NOT be completed through this receiver
    // collection function.
    // --------------------------------------------------

    if (isBuildingOnlyTransfer) {
      throw createError(
        "This is a building-only transfer. The asset must remain at destination Security after check-in; receiver collection is not required at this stage.",
        409
      );
    }

    // --------------------------------------------------
    // 4. Validate transfer status and security workflow
    // --------------------------------------------------

    if (isCrossBuildingTransfer) {
      if (movement.movement_status !== "ARRIVED") {
        throw createError(
          `Cross-building transfer cannot be completed while its status is ${movement.movement_status}`,
          409
        );
      }

      if (!movement.mover_confirmed_at) {
        throw createError(
          "The mover has not confirmed possession of the asset",
          409
        );
      }

      if (
        !movement.security_verified_by ||
        !movement.security_verified_at
      ) {
        throw createError(
          "Origin Security has not verified the asset exit",
          409
        );
      }

      if (
        !movement.building_checkin_by ||
        !movement.building_checkin_at
      ) {
        throw createError(
          "Destination Security has not checked in the asset",
          409
        );
      }
    } else {
      if (movement.movement_status !== "IN_TRANSIT") {
        throw createError(
          `Internal transfer cannot be completed while its status is ${movement.movement_status}`,
          409
        );
      }

      if (!movement.mover_confirmed_at) {
        throw createError(
          "The mover has not confirmed possession of the asset",
          409
        );
      }
    }

    // --------------------------------------------------
    // 5. Lock the asset
    // --------------------------------------------------

    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          building_id,
          department_id,
          unit_id,
          status,
          condition,
          current_holder_id,
          current_security_station_id,
          is_active
        FROM assets
        WHERE id = $1
        FOR UPDATE
      `,
      [movement.asset_id]
    );

    if (assetResult.rowCount === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active) {
      throw createError("The asset is inactive", 409);
    }

    if (asset.status !== "IN_TRANSIT") {
      throw createError(
        `Expected asset status IN_TRANSIT, received ${asset.status}`,
        409
      );
    }

    if (
      String(asset.building_id) !==
      String(movement.to_building_id)
    ) {
      throw createError(
        "The asset is not physically at the destination building",
        409
      );
    }

    // Cross-building department/unit transfers must first
    // pass through destination Security.
    if (
      isCrossBuildingTransfer &&
      !asset.current_security_station_id
    ) {
      throw createError(
        "The asset is not awaiting collection at destination Security",
        409
      );
    }

    // --------------------------------------------------
    // 6. Find an active assignment linked to this movement
    // --------------------------------------------------

    const linkedAssignmentResult = await client.query(
      `
        SELECT
          aa.id AS assignment_id,
          aa.user_id,
          u.name,
          u.email,
          u.role,
          u.department_id,
          u.unit_id,
          u.is_active,
          d.building_id
        FROM asset_assignments aa
        INNER JOIN users u
          ON u.id = aa.user_id
        LEFT JOIN departments d
          ON d.id = u.department_id
        WHERE aa.asset_id = $1
          AND aa.movement_id = $2
          AND aa.status = 'ACTIVE'
        FOR UPDATE OF aa, u
      `,
      [asset.id, movement.id]
    );

    if (linkedAssignmentResult.rowCount > 1) {
      throw createError(
        "Multiple active assignments are linked to this transfer",
        409
      );
    }

    const linkedAssignment =
      linkedAssignmentResult.rows[0] || null;

    // --------------------------------------------------
    // 7. Resolve the receiving user
    //
    // Priority:
    //   a. Designated receiver
    //   b. Active assignment linked to this movement
    //   c. Destination HOU for a unit transfer
    //   d. Destination HOD for a department transfer
    // --------------------------------------------------

    let receiver = null;
    let receiverAssignment = null;

    // a. Explicitly designated receiver
    if (movement.to_user_id) {
      const designatedUserResult = await client.query(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.department_id,
            u.unit_id,
            u.is_active,
            d.building_id
          FROM users u
          LEFT JOIN departments d
            ON d.id = u.department_id
          WHERE u.id = $1
          FOR UPDATE OF u
        `,
        [movement.to_user_id]
      );

      if (designatedUserResult.rowCount === 0) {
        throw createError(
          "The designated receiving user was not found",
          409
        );
      }

      receiver = designatedUserResult.rows[0];

      if (
        linkedAssignment &&
        String(linkedAssignment.user_id) !==
          String(receiver.id)
      ) {
        throw createError(
          "The designated receiver does not match the transfer's linked assignment",
          409
        );
      }

      if (linkedAssignment) {
        receiverAssignment = {
          id: linkedAssignment.assignment_id,
          user_id: linkedAssignment.user_id,
        };
      }
    } else if (linkedAssignment) {
      // b. Use the active assignment already linked to this transfer.
      receiver = {
        id: linkedAssignment.user_id,
        name: linkedAssignment.name,
        email: linkedAssignment.email,
        role: linkedAssignment.role,
        department_id: linkedAssignment.department_id,
        unit_id: linkedAssignment.unit_id,
        is_active: linkedAssignment.is_active,
        building_id: linkedAssignment.building_id,
      };

      receiverAssignment = {
        id: linkedAssignment.assignment_id,
        user_id: linkedAssignment.user_id,
      };
    } else if (isUnitTransfer) {
      // c. Automatically resolve the HOU for the destination unit.
      const houResult = await client.query(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.department_id,
            u.unit_id,
            u.is_active,
            d.building_id
          FROM users u
          LEFT JOIN departments d
            ON d.id = u.department_id
          WHERE u.unit_id = $1
            AND u.department_id = $2
            AND u.role = 'HOU'
            AND u.is_active = TRUE
          FOR UPDATE OF u
        `,
        [
          movement.to_unit_id,
          movement.to_department_id,
        ]
      );

      if (houResult.rowCount === 0) {
        throw createError(
          "No active HOU was found for the destination unit. Designate a receiver before collection.",
          409
        );
      }

      if (houResult.rowCount > 1) {
        throw createError(
          "Multiple active HOUs were found for the destination unit. Designate a receiver.",
          409
        );
      }

      receiver = houResult.rows[0];
    } else if (isDepartmentTransfer) {
      // d. Automatically resolve the HOD for the destination department.
      const hodResult = await client.query(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.department_id,
            u.unit_id,
            u.is_active,
            d.building_id
          FROM users u
          LEFT JOIN departments d
            ON d.id = u.department_id
          WHERE u.department_id = $1
            AND u.role = 'HOD'
            AND u.is_active = TRUE
          FOR UPDATE OF u
        `,
        [movement.to_department_id]
      );

      if (hodResult.rowCount === 0) {
        throw createError(
          "No active HOD was found for the destination department. Designate a receiver before collection.",
          409
        );
      }

      if (hodResult.rowCount > 1) {
        throw createError(
          "Multiple active HODs were found for the destination department. Designate a receiver.",
          409
        );
      }

      receiver = hodResult.rows[0];
    } else {
      throw createError(
        "Unable to determine the receiving user for this transfer",
        409
      );
    }

    // --------------------------------------------------
    // 8. Validate the resolved receiver
    // --------------------------------------------------

    if (!receiver.is_active) {
      throw createError(
        "The receiving user is inactive",
        409
      );
    }

    if (
      !receiver.building_id ||
      String(receiver.building_id) !==
        String(movement.to_building_id)
    ) {
      throw createError(
        "The receiving user does not belong to the destination building",
        409
      );
    }

    if (
      String(receiver.department_id) !==
      String(movement.to_department_id)
    ) {
      throw createError(
        "The receiving user does not belong to the destination department",
        409
      );
    }

    if (
      isUnitTransfer &&
      String(receiver.unit_id) !==
        String(movement.to_unit_id)
    ) {
      throw createError(
        "The receiving user does not belong to the destination unit",
        409
      );
    }

    // Only the resolved receiving user may confirm collection.
    if (
      !receiverId ||
      String(receiver.id) !== String(receiverId)
    ) {
      throw createError(
        "Only the designated receiver, destination HOD, or destination HOU can confirm collection",
        403
      );
    }

    // --------------------------------------------------
    // 9. Close previous active assignments
    // --------------------------------------------------

    await client.query(
      `
        UPDATE asset_assignments
        SET status = 'RETURNED'
        WHERE asset_id = $1
          AND status = 'ACTIVE'
          AND (
            movement_id IS DISTINCT FROM $2
            OR user_id IS DISTINCT FROM $3
          )
      `,
      [asset.id, movement.id, receiver.id]
    );

    // --------------------------------------------------
    // 10. Update the asset's location and custody
    // --------------------------------------------------

    const updatedAssetResult = await client.query(
      `
        UPDATE assets
        SET
          building_id = $1,
          department_id = $2,
          unit_id = $3,
          current_holder_id = $4,
          current_security_station_id = NULL,
          status = 'ASSIGNED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
          AND status = 'IN_TRANSIT'
        RETURNING *
      `,
      [
        movement.to_building_id,
        movement.to_department_id,
        movement.to_unit_id,
        receiver.id,
        asset.id,
      ]
    );

    if (updatedAssetResult.rowCount !== 1) {
      throw createError(
        "Could not update the asset",
        409
      );
    }

    // --------------------------------------------------
    // 11. Preserve or create the receiver's assignment
    // --------------------------------------------------

    let assignmentResult;

    if (receiverAssignment) {
      assignmentResult = await client.query(
        `
          UPDATE asset_assignments
          SET notes = COALESCE(
            notes,
            'Received through transfer collection'
          )
          WHERE id = $1
            AND asset_id = $2
            AND user_id = $3
            AND movement_id = $4
            AND status = 'ACTIVE'
          RETURNING *
        `,
        [
          receiverAssignment.id,
          asset.id,
          receiver.id,
          movement.id,
        ]
      );

      if (assignmentResult.rowCount !== 1) {
        throw createError(
          "The receiver's existing assignment could not be verified",
          409
        );
      }
    } else {
      const assignedBy =
        movement.authorized_by ||
        movement.moved_by ||
        movement.requested_by;

      if (!assignedBy) {
        throw createError(
          "No user is recorded as authorizing or requesting this transfer",
          409
        );
      }

      const assignmentNotes = isUnitTransfer
        ? "Received by destination unit HOU or designated receiver"
        : "Received by destination department HOD or designated receiver";

      assignmentResult = await client.query(
        `
          INSERT INTO asset_assignments (
            asset_id,
            user_id,
            assigned_by,
            status,
            notes,
            movement_id
          )
          VALUES ($1, $2, $3, 'ACTIVE', $4, $5)
          RETURNING *
        `,
        [
          asset.id,
          receiver.id,
          assignedBy,
          assignmentNotes,
          movement.id,
        ]
      );
    }

    // --------------------------------------------------
    // 12. Complete the transfer
    // --------------------------------------------------

    const expectedMovementStatus = isCrossBuildingTransfer
      ? "ARRIVED"
      : "IN_TRANSIT";

    const completedResult = await client.query(
      `
        UPDATE asset_movements
        SET
          movement_status = 'COMPLETED',
          received_by = $1,
          received_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND movement_status = $3
        RETURNING *
      `,
      [
        receiver.id,
        movement.id,
        expectedMovementStatus,
      ]
    );

    if (completedResult.rowCount !== 1) {
      throw createError(
        "The transfer status changed before completion",
        409
      );
    }

    // --------------------------------------------------
    // 13. Commit transaction
    // --------------------------------------------------

    await client.query("COMMIT");

    return {
      movement: completedResult.rows[0],
      asset: updatedAssetResult.rows[0],
      receiver,
      assignment: assignmentResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


const scanTransferAsset = async ({
  assetTag,
  securityUserId,
  stationId,
}) => {
  if (!assetTag || !securityUserId || !stationId) {
    throw createError(
      "Asset tag, authenticated security user, and station are required",
      400
    );
  }

  // This function only looks up the transfer.
  // It does NOT update the asset or movement status.

  const result = await pool.query(
    `
      SELECT
        am.id AS movement_id,
        am.asset_id,
        am.movement_status,
        am.movement_type,
        am.from_building_id,
        am.from_department_id,
        am.from_unit_id,
        am.to_building_id,
        am.to_department_id,
        am.to_unit_id,
        am.requested_by,
        am.authorized_by,
        am.moved_by,
        am.mover_confirmed_at,
        am.security_verified_by,
        am.security_verified_at,

        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,
        a.is_active AS asset_is_active,

        ss.id AS station_id,
        ss.station_code,
        ss.name AS station_name,
        ss.building_id AS station_building_id

      FROM asset_movements am

      INNER JOIN assets a
        ON a.id = am.asset_id

      INNER JOIN users security_officer
        ON security_officer.id = $2
       AND security_officer.role = 'Staff'
       AND security_officer.staff_type = 'SECURITY'
       AND security_officer.is_active = true

      INNER JOIN security_stations ss
        ON ss.id = $3
       AND ss.is_active = true

      WHERE a.asset_tag = $1
        AND am.movement_type = 'TRANSFER'
        AND am.movement_status = 'APPROVED'
        AND a.is_active = true
        AND a.status = 'ASSIGNED'
        AND ss.building_id = am.from_building_id

      ORDER BY am.created_at DESC
      LIMIT 1
    `,
    [assetTag.trim(), securityUserId, stationId]
  );

  if (result.rowCount === 0) {
    throw createError(
      "No eligible approved transfer was found for this asset at the source security station",
      404
    );
  }

  const movement = result.rows[0];

  // The mover must confirm possession before security can verify exit.
  if (!movement.mover_confirmed_at) {
    throw createError(
      "The assigned mover must confirm possession before security can verify exit",
      409
    );
  }

  // Do not offer another exit verification if it has already happened.
  if (
    movement.security_verified_by ||
    movement.security_verified_at
  ) {
    throw createError(
      "Security has already verified departure for this transfer",
      409
    );
  }

  // Return transfer details only. No UPDATE, transaction, or audit
  // entry is needed for this read-only scan.
  return movement;
};

const verifyTransferExit = async ({
  movementId,
  securityUserId,
  stationId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ---------------------------------------
    // 1. Get and lock the transfer
    // ---------------------------------------
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
          mover_confirmed_at,
          security_verified_by,
          security_verified_at,
          movement_status,
          movement_type
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

    // ---------------------------------------
    // 2. Must be a transfer
    // ---------------------------------------
    if (movement.movement_type !== "TRANSFER") {
      throw createError(
        "Security exit verification is only available for asset transfers",
        400
      );
    }

    // ---------------------------------------
    // 3. Must be cross-building
    // ---------------------------------------
    if (
      movement.from_building_id ===
      movement.to_building_id
    ) {
      throw createError(
        "Security exit verification is only required for transfers between different buildings",
        400
      );
    }

    // ---------------------------------------
    // 4. Transfer must be APPROVED
    // ---------------------------------------
    if (
      movement.movement_status !== "APPROVED"
    ) {
      throw createError(
        `Security cannot verify this transfer because its current status is ${movement.movement_status}`,
        400
      );
    }

    // ---------------------------------------
    // 5. Mover must have confirmed possession
    // ---------------------------------------
    if (!movement.mover_confirmed_at) {
      throw createError(
        "The assigned mover has not confirmed possession of this asset",
        400
      );
    }

    // ---------------------------------------
    // 6. Prevent duplicate verification
    // ---------------------------------------
    if (
      movement.security_verified_by ||
      movement.security_verified_at
    ) {
      throw createError(
        "Security has already verified this transfer",
        409
      );
    }

    // ---------------------------------------
    // 7. Verify Security user
    // ---------------------------------------
    const securityUserResult =
      await client.query(
        `
          SELECT
            id,
            name,
            role,
            staff_type,
            is_active
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [securityUserId]
      );

    if (securityUserResult.rowCount === 0) {
      throw createError(
        "Security user not found",
        404
      );
    }

    const securityUser =
      securityUserResult.rows[0];

    if (!securityUser.is_active) {
      throw createError(
        "Security user is inactive",
        403
      );
    }

    if (
      securityUser.role !== "Staff" ||
      securityUser.staff_type !== "SECURITY"
    ) {
      throw createError(
        "Only Staff users with SECURITY staff type can verify asset exits",
        403
      );
    }

    // ---------------------------------------
    // 8. Verify Security station
    // ---------------------------------------
    if (!stationId) {
      throw createError(
        "No security station is associated with this session",
        403
      );
    }

    const stationResult = await client.query(
      `
        SELECT
          ss.id,
          ss.station_code,
          ss.name AS station_name,
          ss.building_id,
          ss.is_active,
          b.name AS building_name
        FROM security_stations ss
        INNER JOIN buildings b
          ON b.id = ss.building_id
        WHERE ss.id = $1
        LIMIT 1
      `,
      [stationId]
    );

    if (stationResult.rowCount === 0) {
      throw createError(
        "Security station not found",
        404
      );
    }

    const station = stationResult.rows[0];

    if (!station.is_active) {
      throw createError(
        "Security station is inactive",
        403
      );
    }

    // Security must be at the origin building.
    if (
      station.building_id !==
      movement.from_building_id
    ) {
      throw createError(
        "This security station is not located at the origin building for this transfer",
        403
      );
    }

    // ---------------------------------------
    // 9. Lock and verify asset
    // ---------------------------------------
    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          status,
          is_active,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id
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

    // ---------------------------------------
    // 10. Asset must be active
    // ---------------------------------------
    if (!asset.is_active) {
      throw createError(
        "This asset is inactive",
        400
      );
    }

    // ---------------------------------------
    // 11. Asset must still be at origin
    // ---------------------------------------
    if (
      asset.building_id !==
      movement.from_building_id
    ) {
      throw createError(
        "This asset is no longer located at the origin building",
        400
      );
    }

    // ---------------------------------------
    // 12. Asset cannot already be in transit
    // ---------------------------------------
    if (asset.status === "IN_TRANSIT") {
      throw createError(
        "This asset is already in transit",
        409
      );
    }

    // ---------------------------------------
    // 13. Only AVAILABLE or ASSIGNED assets
    //     can leave through internal transfer
    // ---------------------------------------
    if (
      asset.status !== "AVAILABLE" &&
      asset.status !== "ASSIGNED"
    ) {
      throw createError(
        `Security cannot verify this asset because its current status is ${asset.status}`,
        400
      );
    }

    // ---------------------------------------
    // 14. Building-only transfer
    //
    // Asset should normally be in Security custody
    // before leaving.
    // ---------------------------------------
    const isBuildingOnlyTransfer =
      movement.to_department_id === null &&
      movement.to_unit_id === null;

    if (isBuildingOnlyTransfer) {
      if (asset.current_holder_id !== null) {
        throw createError(
          "A building-only transfer cannot have a current asset holder during Security exit verification",
          409
        );
      }

      if (
        asset.current_security_station_id !==
        station.id
      ) {
        throw createError(
          "This asset is not currently in custody of the origin Security station",
          409
        );
      }
    }

    // ---------------------------------------
    // 15. Record Security verification
    // ---------------------------------------
    await client.query(
      `
        UPDATE asset_movements
        SET
          security_verified_by = $1,
          security_verified_at = CURRENT_TIMESTAMP,
          movement_status = 'IN_TRANSIT'
        WHERE id = $2
      `,
      [
        securityUserId,
        movementId,
      ]
    );

    // ---------------------------------------
    // 16. Put asset in transit
    //
    // IMPORTANT:
    // We do NOT change current_holder_id.
    // The mover is only transporting the asset.
    // ---------------------------------------
    const updatedAssetResult = await client.query(
      `
        UPDATE assets
        SET
          status = 'IN_TRANSIT',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          asset_tag,
          name,
          status,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id,
          updated_at
      `,
      [movement.asset_id]
    );

    const updatedAsset = updatedAssetResult.rows[0];
    //audit log for asset movement

    await createAuditLog({
      userId: securityUserId,
      action: "TRANSFER_DEPARTURE",
      entityType: "ASSET",
      entityId: asset.id,

      oldData: {
        status: asset.status,
        building_id: asset.building_id,
        department_id: asset.department_id,
        unit_id: asset.unit_id,
        current_holder_id: asset.current_holder_id,
        current_security_station_id: asset.current_security_station_id,
        movement_id: movement.id,
      },

      newData: {
        status: updatedAsset.status,
        building_id: updatedAsset.building_id,
        department_id: updatedAsset.department_id,
        unit_id: updatedAsset.unit_id,
        current_holder_id: updatedAsset.current_holder_id,
        current_security_station_id: updatedAsset.current_security_station_id,

        movement_id: movement.id,

        security_verified_by: securityUserId,
        security_station_id: station.id,

        to_building_id: movement.to_building_id,
        to_department_id: movement.to_department_id,
        to_unit_id: movement.to_unit_id,
      },

      description: `Asset ${asset.asset_tag} departed the origin building for transfer`,

      client,
    });


    await client.query("COMMIT");

    // ---------------------------------------
    // 17. Return complete movement
    // ---------------------------------------
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


const checkinTransferAtBuilding = async ({
  assetTag,
  securityUserId,
  stationId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ---------------------------------------
    // 1. Get Security station and building
    // ---------------------------------------
    const stationResult = await client.query(
      `
        SELECT
          ss.id,
          ss.station_code,
          ss.name AS station_name,
          ss.building_id,
          ss.is_active,
          b.name AS building_name
        FROM security_stations ss
        INNER JOIN buildings b
          ON b.id = ss.building_id
        WHERE ss.id = $1
        LIMIT 1
      `,
      [stationId]
    );

    if (stationResult.rowCount === 0) {
      throw createError("Security station not found", 404);
    }

    const station = stationResult.rows[0];

    if (!station.is_active) {
      throw createError("Security station is inactive", 403);
    }

    // ---------------------------------------
    // 2. Verify Security user
    // ---------------------------------------
    const securityUserResult = await client.query(
      `
        SELECT id, name, role, staff_type, is_active
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [securityUserId]
    );

    if (securityUserResult.rowCount === 0) {
      throw createError("Security user not found", 404);
    }

    const securityUser = securityUserResult.rows[0];

    if (!securityUser.is_active) {
      throw createError("Security user is inactive", 403);
    }

    if (
      securityUser.role !== "Staff" ||
      securityUser.staff_type !== "SECURITY"
    ) {
      throw createError(
        "Only Staff users with SECURITY staff type can perform building check-in",
        403
      );
    }

    // ---------------------------------------
    // 3. Find and lock the asset
    // ---------------------------------------
    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          brand,
          model,
          status,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id,
          is_active
        FROM assets
        WHERE asset_tag = $1
        LIMIT 1
        FOR UPDATE
      `,
      [assetTag]
    );

    if (assetResult.rowCount === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active) {
      throw createError("This asset is inactive", 400);
    }

    // ---------------------------------------
    // 4. Find and lock the active transfer
    // ---------------------------------------
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
          requested_by,
          authorized_by,
          moved_by,
          mover_confirmed_at,
          security_verified_by,
          security_verified_at,
          building_checkin_by,
          building_checkin_at,
          movement_status,
          movement_type
        FROM asset_movements
        WHERE asset_id = $1
          AND movement_type = 'TRANSFER'
          AND movement_status = 'IN_TRANSIT'
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [asset.id]
    );

    if (movementResult.rowCount === 0) {
      throw createError(
        "No active internal transfer was found for this asset",
        404
      );
    }

    const movement = movementResult.rows[0];

    // ---------------------------------------
    // 5. Validate cross-building transfer
    // ---------------------------------------
    if (
      movement.from_building_id ===
      movement.to_building_id
    ) {
      throw createError(
        "Building check-in is only required for cross-building transfers",
        400
      );
    }

    // ---------------------------------------
    // 6. Mover must confirm possession
    // ---------------------------------------
    if (!movement.mover_confirmed_at) {
      throw createError(
        "The assigned mover has not confirmed possession of this asset",
        400
      );
    }

    // ---------------------------------------
    // 7. Origin Security must verify exit
    // ---------------------------------------
    if (
      !movement.security_verified_by ||
      !movement.security_verified_at
    ) {
      throw createError(
        "Security has not verified this asset for exit from the origin building",
        400
      );
    }

    // ---------------------------------------
    // 8. Asset must still be IN_TRANSIT
    // ---------------------------------------
    if (asset.status !== "IN_TRANSIT") {
      throw createError(
        `Asset cannot be checked in because its current status is ${asset.status}`,
        400
      );
    }

    // ---------------------------------------
    // 9. Destination station must match
    // ---------------------------------------
    if (movement.to_building_id !== station.building_id) {
      throw createError(
        "This asset is destined for another building",
        403
      );
    }

    // ---------------------------------------
    // 10. Prevent duplicate check-in
    // ---------------------------------------
    if (
      movement.building_checkin_by ||
      movement.building_checkin_at
    ) {
      throw createError(
        "This asset has already been checked in at the destination building",
        409
      );
    }

    // ---------------------------------------
    // 11. Determine transfer type
    // ---------------------------------------
    const isBuildingOnlyTransfer =
      movement.to_department_id === null &&
      movement.to_unit_id === null;

    // ---------------------------------------
    // 12. Record physical arrival
    //
    // IMPORTANT:
    // - Do not change current_holder_id.
    // - Do not mark the asset AVAILABLE or ASSIGNED.
    // - Do not require a linked asset assignment.
    // - Receiver collection happens separately.
    // ---------------------------------------
    let updatedAssetResult;

    if (isBuildingOnlyTransfer) {
      // Building-only transfer:
      // Asset arrives at the building Security station.
      // Department/unit are unset because this transfer
      // has no destination department/unit.
      updatedAssetResult = await client.query(
        `
          UPDATE assets
          SET
            building_id = $1,
            department_id = NULL,
            unit_id = NULL,
            current_security_station_id = $2,
            status = 'IN_TRANSIT',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
            AND status = 'IN_TRANSIT'
          RETURNING *
        `,
        [
          movement.to_building_id,
          station.id,
          asset.id,
        ]
      );
    } else {
      // Department/unit transfer:
      // Record the physical building arrival only.
      // Keep the existing department, unit and holder
      // until the intended receiver collects the asset.
      updatedAssetResult = await client.query(
        `
          UPDATE assets
          SET
            building_id = $1,
            current_security_station_id = $2,
            status = 'IN_TRANSIT',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
            AND status = 'IN_TRANSIT'
          RETURNING *
        `,
        [
          movement.to_building_id,
          station.id,
          asset.id,
        ]
      );
    }

    if (updatedAssetResult.rowCount === 0) {
      throw createError(
        "Asset could not be checked in because its status changed",
        409
      );
    }

    const updatedAsset = updatedAssetResult.rows[0];

    // ---------------------------------------
    // 13. Record destination check-in
    // ---------------------------------------
    const checkinResult = await client.query(
      `
        UPDATE asset_movements
        SET
          building_checkin_by = $1,
          building_checkin_at = CURRENT_TIMESTAMP,
          movement_status = 'ARRIVED'
        WHERE id = $2
          AND movement_status = 'IN_TRANSIT'
          AND building_checkin_at IS NULL
        RETURNING id
      `,
      [
        securityUserId,
        movement.id,
      ]
    );

    if (checkinResult.rowCount === 0) {
      throw createError(
        "The transfer has already been checked in or its status changed",
        409
      );
    }

    // ---------------------------------------
    // 14. Audit the physical arrival
    // ---------------------------------------
    await createAuditLog({
      userId: securityUserId,
      action: "TRANSFER_ARRIVAL",
      entityType: "ASSET",
      entityId: asset.id,

      oldData: {
        status: asset.status,
        building_id: asset.building_id,
        department_id: asset.department_id,
        unit_id: asset.unit_id,
        current_holder_id: asset.current_holder_id,
        current_security_station_id:
          asset.current_security_station_id,
        movement_id: movement.id,
      },

      newData: {
        status: updatedAsset.status,
        building_id: updatedAsset.building_id,
        department_id: updatedAsset.department_id,
        unit_id: updatedAsset.unit_id,
        current_holder_id: updatedAsset.current_holder_id,
        current_security_station_id:
          updatedAsset.current_security_station_id,
        movement_id: movement.id,
        movement_status: "ARRIVED",
        transfer_type: isBuildingOnlyTransfer
          ? "BUILDING_ONLY"
          : "DEPARTMENT_UNIT",
        awaitingReceiverCollection: true,
      },

      description:
        `Asset ${asset.asset_tag} arrived at ${station.building_name} and is awaiting collection`,

      client,
    });

    // ---------------------------------------
    // 15. Commit transaction
    // ---------------------------------------
    await client.query("COMMIT");

    // ---------------------------------------
    // 16. Fetch final movement details
    // ---------------------------------------
    const finalMovementResult = await pool.query(
      `
        SELECT
          am.*,

          a.asset_tag,
          a.name AS asset_name,
          a.brand,
          a.model,
          a.status AS asset_status,
          a.current_holder_id,
          a.current_security_station_id,

          requester.name AS requested_by_name,
          approver.name AS authorized_by_name,
          mover.name AS moved_by_name,

          checkin_user.name AS building_checkin_by_name,
          security_user.name AS security_verified_by_name,

          fb.name AS from_building_name,
          fd.name AS from_department_name,
          fu.name AS from_unit_name,

          tb.name AS to_building_name,
          td.name AS to_department_name,
          tu.name AS to_unit_name,

          ss.station_code AS security_station_code,
          ss.name AS security_station_name

        FROM asset_movements am

        INNER JOIN assets a
          ON a.id = am.asset_id

        LEFT JOIN users requester
          ON requester.id = am.requested_by

        LEFT JOIN users approver
          ON approver.id = am.authorized_by

        LEFT JOIN users mover
          ON mover.id = am.moved_by

        LEFT JOIN users checkin_user
          ON checkin_user.id = am.building_checkin_by

        LEFT JOIN users security_user
          ON security_user.id = am.security_verified_by

        LEFT JOIN buildings fb
          ON fb.id = am.from_building_id

        LEFT JOIN departments fd
          ON fd.id = am.from_department_id

        LEFT JOIN units fu
          ON fu.id = am.from_unit_id

        LEFT JOIN buildings tb
          ON tb.id = am.to_building_id

        LEFT JOIN departments td
          ON td.id = am.to_department_id

        LEFT JOIN units tu
          ON tu.id = am.to_unit_id

        LEFT JOIN security_stations ss
          ON ss.id = a.current_security_station_id

        WHERE am.id = $1
      `,
      [movement.id]
    );

    return {
      movement: finalMovementResult.rows[0],
      asset: updatedAsset,
      station,
      assignment: null,
      awaitingReceiverCollection: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};




module.exports = {
  createTransferRequest,
  assignTransferMover,
  startTransfer,
  completeTransfer,
  scanTransferAsset,
  verifyTransferExit,
  checkinTransferAtBuilding,
  confirmMoverPossession,
};