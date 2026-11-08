const pool = require("../config/database");
const { createAuditLog } = require("../models/auditModel");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Approve an existing staff checkout request
const approveExitRequest = async (requestId, adminId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `SELECT *
       FROM asset_exit_records
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw createError("Checkout request not found", 404);
    }

    const request = requestResult.rows[0];

    if (
      request.status !== "PENDING" ||
      request.authorization_status !== "PENDING"
    ) {
      throw createError(
        "Only pending checkout requests can be approved",
        409
      );
    }

    // Lock the asset and verify it is still eligible
    const assetResult = await client.query(
      `SELECT id, status, is_active, current_holder_id
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [request.asset_id]
    );

    if (assetResult.rows.length === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active || asset.status !== "ASSIGNED") {
      throw createError(
        "The asset is no longer eligible for checkout",
        409
      );
    }

    // Pending staff requests must still belong to the current holder.
    if (asset.current_holder_id !== request.taken_by_user_id) {
      throw createError(
        "The asset is no longer assigned to the requesting staff member",
        409
      );
    }

    const result = await client.query(
      `UPDATE asset_exit_records
       SET status = 'AUTHORIZED',
           authorization_status = 'AUTHORIZED',
           authorized_by = $2,
           authorized_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId, adminId]
    );
    const authorizedExit = result.rows[0];

      await createAuditLog({
        userId: adminId,
        action: "AUTHORIZE_EXIT",
        entityType: "ASSET",
        entityId: authorizedExit.asset_id,

        oldData: {
          status: request.status,
          authorization_status: request.authorization_status,
        },

        newData: {
          status: authorizedExit.status,
          authorization_status: authorizedExit.authorization_status,
          exit_record_id: authorizedExit.id,
          taken_by_user_id: authorizedExit.taken_by_user_id,
          destination: authorizedExit.destination,
          reason: authorizedExit.reason,
          expected_return_date: authorizedExit.expected_return_date,
          authorized_at: authorizedExit.authorized_at,
        },

        description: `Exit for asset ${asset.asset_tag} was authorized`,

        client,
      });

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Reject an existing staff checkout request
const rejectExitRequest = async (requestId, adminId, rejectionReason) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `SELECT *
       FROM asset_exit_records
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw createError("Checkout request not found", 404);
    }

    const request = requestResult.rows[0];

    if (
      request.status !== "PENDING" ||
      request.authorization_status !== "PENDING"
    ) {
      throw createError(
        "Only pending checkout requests can be rejected",
        409
      );
    }

    const updatedNotes = [
      request.notes,
      `Rejected by Administrator: ${rejectionReason}`,
    ]
      .filter(Boolean)
      .join("\n");

    // CANCELLED is used because the current status constraint
    // does not include REJECTED. authorization_status records rejection.
    const result = await client.query(
      `UPDATE asset_exit_records
       SET status = 'CANCELLED',
           authorization_status = 'REJECTED',
           authorized_by = $2,
           notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId, adminId, updatedNotes]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  approveExitRequest,
  rejectExitRequest,
};