const pool = require("../config/database");
const { createExitRequest } = require("../models/requestExitModel");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const submitExitRequest = async ({
  assetId,
  userId,
  userRole,
  takenByUserId,
  destination,
  reason,
  expectedReturnDate,
  notes,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    //Lock the asset
    

    const assetResult = await client.query(
      `SELECT
        id,
        asset_tag,
        name,
        status,
        current_holder_id,
        is_active
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    // Basic asset validation
     
    if (!asset.is_active) {
      throw createError("This asset is inactive", 400);
    }

    if (asset.status !== "ASSIGNED") {
      throw createError(
        `This asset cannot be checked out because its current status is ${asset.status}`,
        400
      );
    }

   // Determine who will take the asset
     
    let actualTakenByUserId;

    if (userRole === "Administrator") {
        if (!takenByUserId) {
            throw createError(
            "Administrator must specify the user taking the asset",
            400
            );
        }
        
      actualTakenByUserId = takenByUserId || userId;
    } else {
      
    //Normal staff can only request the asset for themselves.
       
      actualTakenByUserId = userId;

      if (takenByUserId && takenByUserId !== userId) {
        throw createError(
          "Staff can only submit a checkout request for themselves",
          403
        );
      }

      if (asset.current_holder_id !== userId) {
        throw createError(
          "You can only request checkout for an asset assigned to you",
          403
        );
      }
    }

    // Verify the person taking the asset
     

    const takerResult = await client.query(
      `SELECT
        id,
        name,
        email,
        role,
        is_active
       FROM users
       WHERE id = $1`,
      [actualTakenByUserId]
    );

    if (takerResult.rows.length === 0) {
      throw createError(
        "The user taking the asset was not found",
        404
      );
    }

    const taker = takerResult.rows[0];

    if (!taker.is_active) {
      throw createError(
        "The user taking the asset is inactive",
        400
      );
    }

   // Prevent duplicate active checkout requests
     
    const existingRequestResult = await client.query(
      `SELECT
        id,
        status,
        authorization_status
       FROM asset_exit_records
       WHERE asset_id = $1
         AND status IN ('PENDING', 'AUTHORIZED', 'OUT')
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [assetId]
    );

    if (existingRequestResult.rows.length > 0) {
      const existingRequest = existingRequestResult.rows[0];

      if (existingRequest.status === "PENDING") {
        throw createError(
          "A checkout request for this asset is already pending approval",
          409
        );
      }

      if (existingRequest.status === "AUTHORIZED") {
        throw createError(
          "This asset already has an approved checkout request",
          409
        );
      }

      if (existingRequest.status === "OUT") {
        throw createError(
          "This asset is already checked out",
          409
        );
      }
    }

    // Validate request information
    

    if (!destination || !destination.trim()) {
      throw createError("Destination is required", 400);
    }

    if (!reason || !reason.trim()) {
      throw createError("Reason for checkout is required", 400);
    }

    if (expectedReturnDate) {
      const returnDate = new Date(expectedReturnDate);

      if (Number.isNaN(returnDate.getTime())) {
        throw createError(
          "Invalid expected return date",
          400
        );
      }

      if (returnDate <= new Date()) {
        throw createError(
          "Expected return date must be in the future",
          400
        );
      }
    }

    // Determine approval state
    
    //Staff: PENDING
    //Administrator: Automatically AUTHORIZED

    const isAdministrator = userRole === "Administrator";

    const status = isAdministrator
      ? "AUTHORIZED"
      : "PENDING";

    const authorizationStatus = isAdministrator
      ? "AUTHORIZED"
      : "PENDING";

    const authorizedBy = isAdministrator
      ? userId
      : null;

    const authorizedAt = isAdministrator
      ? new Date()
      : null;

    // 8. Create request
    

    const request = await createExitRequest(
      {
        asset_id: assetId,

        requested_by_user_id: userId,

        taken_by_user_id: actualTakenByUserId,

        destination: destination.trim(),

        reason: reason.trim(),

        expected_return_date:
          expectedReturnDate || null,

        notes: notes ? notes.trim() : null,

        status,

        authorization_status: authorizationStatus,

        authorized_by: authorizedBy,

        authorized_at: authorizedAt,
      },
      client
    );

    await client.query("COMMIT");

    return request;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  submitExitRequest,
};