const pool = require("../config/database");

const {createAuditLog}=require("../models/auditModel")

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const checkoutAsset = async ({
  assetId,
  securityOfficerId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // Lock the asset to prevent concurrent check-outs
    // --------------------------------------------------

    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          status,
          current_holder_id,
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
    // Validate asset
    // --------------------------------------------------

    if (!asset.is_active) {
      throw createError("Asset is inactive", 400);
    }

    if (asset.status !== "ASSIGNED") {
      throw createError(
        `Asset cannot be checked out while its status is ${asset.status}`,
        400
      );
    }

    if (!asset.current_holder_id) {
      throw createError(
        "Asset has no current assigned holder",
        400
      );
    }

    // --------------------------------------------------
    // Find the administrator-authorized exit record
    // --------------------------------------------------

    const exitResult = await client.query(
      `
        SELECT
          id,
          asset_id,
          taken_by_user_id,
          authorized_by,
          destination,
          reason,
          expected_return_date,
          status,
          authorization_status
        FROM asset_exit_records
        WHERE asset_id = $1
          AND status = 'AUTHORIZED'
          AND authorization_status = 'AUTHORIZED'
        ORDER BY authorized_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [assetId]
    );

    if (exitResult.rowCount === 0) {
      throw createError(
        "No authorized exit record exists for this asset",
        409
      );
    }

    const exitRecord = exitResult.rows[0];

    // --------------------------------------------------
    // Verify authorized person
    // --------------------------------------------------

    if (
      exitRecord.taken_by_user_id !==
      asset.current_holder_id
    ) {
      throw createError(
        "The authorized person is not the current asset holder",
        409
      );
    }

    // --------------------------------------------------
    // Record the physical departure
    // --------------------------------------------------

    const updatedExitResult = await client.query(
      `
        UPDATE asset_exit_records
        SET
          status = 'OUT',
          date_out = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          notes = CASE
            WHEN $1::text IS NULL THEN notes
            WHEN notes IS NULL THEN $1
            ELSE notes || E'\\nCheckout: ' || $1
          END
        WHERE id = $2
        RETURNING
          id,
          asset_id,
          taken_by_user_id,
          authorized_by,
          destination,
          reason,
          date_out,
          expected_return_date,
          actual_return_date,
          status,
          authorization_status,
          authorized_at,
          notes
      `,
      [
        `Checked out by security officer ${securityOfficerId}`,
        exitRecord.id,
      ]
    );


// Update asset operational status
// --------------------------------------------------

const updatedAssetResult = await client.query(
      `
        UPDATE assets
        SET
          status = 'OUT',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          asset_tag,
          name,
          current_holder_id,
          status,
          condition,
          updated_at
      `,
      [assetId]
    );

    const updatedAsset = updatedAssetResult.rows[0];

    // --------------------------------------------------
    // Create audit log
    // --------------------------------------------------

    await createAuditLog({
      userId: securityOfficerId,
      action: "CHECKOUT",
      entityType: "ASSET",
      entityId: asset.id,

      oldData: {
        status: asset.status,
        current_holder_id: asset.current_holder_id,
        exit_record_id: exitRecord.id,
      },

      newData: {
        status: updatedAsset.status,
        current_holder_id: updatedAsset.current_holder_id,
        exit_record_id: exitRecord.id,
        destination: exitRecord.destination,
        taken_by_user_id: exitRecord.taken_by_user_id,
        reason: exitRecord.reason,
        expected_return_date:
          exitRecord.expected_return_date,
        date_out:
          updatedExitResult.rows[0].date_out,
      },

      description:
        `Asset ${asset.asset_tag} was checked out by Security`,

      client,
    });

    // --------------------------------------------------
    // Commit transaction
    // --------------------------------------------------

    await client.query("COMMIT");


    return {
      exit: updatedExitResult.rows[0],
      asset: updatedAssetResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  checkoutAsset,
};