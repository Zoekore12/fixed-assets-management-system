const pool = require("../config/database");

const { createAuditLog } = require("../models/auditModel");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const checkinAsset = async ({
  assetId,
  securityOfficerId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // Lock the asset to prevent simultaneous returns
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
    // Validate asset status
    // --------------------------------------------------

    if (asset.status !== "OUT") {
      throw createError(
        `Asset cannot be returned while its status is ${asset.status}`,
        400
      );
    }

    // --------------------------------------------------
    // Find active physical exit record
    // --------------------------------------------------

    const exitResult = await client.query(
      `
        SELECT
          id,
          asset_id,
          taken_by_user_id,
          status,
          date_out,
          destination,
          expected_return_date
        FROM asset_exit_records
        WHERE asset_id = $1
          AND status = 'OUT'
        ORDER BY
          date_out DESC NULLS LAST,
          created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [assetId]
    );

    if (exitResult.rowCount === 0) {
      throw createError(
        "No active checkout record found",
        409
      );
    }

    const exitRecord = exitResult.rows[0];

    // --------------------------------------------------
    // Record the physical return
    // No administrator approval required
    // --------------------------------------------------

    const updatedExitResult = await client.query(
      `
        UPDATE asset_exit_records
        SET
          status = 'RETURNED',
          actual_return_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          notes = CASE
            WHEN notes IS NULL OR notes = ''
              THEN $1
            ELSE notes || E'\\n' || $1
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
        `Physical return confirmed by officer ${securityOfficerId}`,
        exitRecord.id,
      ]
    );

      // Return asset to ASSIGNED status
      // Keep the existing holder
      // --------------------------------------------------

      const updatedAssetResult = await client.query(
        `
          UPDATE assets
          SET
            status = 'ASSIGNED',
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
        action: "CHECKIN",
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
          actual_return_date:
            updatedExitResult.rows[0].actual_return_date,
          returned_by: securityOfficerId,
        },

        description:
          `Asset ${asset.asset_tag} was checked in by Security`,

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
  checkinAsset,
};