const pool = require("../config/database");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const returnAsset = async ({
  assetId,
  returnedBy,
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------------------
    // Lock the asset
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
    // Validate asset assignment
    // --------------------------------------------------

    if (!asset.current_holder_id) {
      throw createError(
        "This asset is not currently assigned",
        400
      );
    }

    // --------------------------------------------------
    // Find active assignment
    // --------------------------------------------------

    const assignmentResult = await client.query(
      `
        SELECT
          id,
          asset_id,
          user_id,
          assigned_by,
          assigned_at,
          status,
          notes
        FROM asset_assignments
        WHERE asset_id = $1
          AND status = 'ACTIVE'
        LIMIT 1
        FOR UPDATE
      `,
      [assetId]
    );

    if (assignmentResult.rowCount === 0) {
      throw createError(
        "No active assignment was found for this asset",
        400
      );
    }

    const assignment = assignmentResult.rows[0];

    // --------------------------------------------------
    // Close assignment
    // --------------------------------------------------

    const updatedAssignmentResult =
      await client.query(
        `
          UPDATE asset_assignments
          SET
            status = 'RETURNED',
            returned_at = CURRENT_TIMESTAMP,
            notes = CASE
              WHEN $1::text IS NULL THEN notes
              WHEN notes IS NULL THEN $1
              ELSE notes || E'\\nReturn: ' || $1
            END
          WHERE id = $2
          RETURNING
            id,
            asset_id,
            user_id,
            assigned_by,
            assigned_at,
            returned_at,
            status,
            notes
        `,
        [notes, assignment.id]
      );

    // --------------------------------------------------
    // Clear current holder
    // --------------------------------------------------

    const updatedAssetResult =
      await client.query(
        `
          UPDATE assets
          SET
            current_holder_id = NULL,
            status = 'AVAILABLE',
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

    // --------------------------------------------------
    // Commit transaction
    // --------------------------------------------------

    await client.query("COMMIT");

    return {
      assignment: updatedAssignmentResult.rows[0],
      asset: updatedAssetResult.rows[0],
      returnedBy,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  returnAsset,
};