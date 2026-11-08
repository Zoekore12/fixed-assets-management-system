const pool = require("../config/database");

// Create an exit authorization
const createExitAuthorization = async ({
  assetId,
  takenByUserId,
  authorizedBy,
  destination,
  reason,
  expectedReturnDate = null,
  notes = null,
}) => {
  const result = await pool.query(
    `
      INSERT INTO asset_exit_records (
        asset_id,
        taken_by_user_id,
        authorized_by,
        destination,
        reason,
        expected_return_date,
        status,
        authorization_status,
        authorized_at,
        notes
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'OUT',
        'AUTHORIZED',
        CURRENT_TIMESTAMP,
        $7
      )
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
        notes,
        created_at,
        updated_at
    `,
    [
      assetId,
      takenByUserId,
      authorizedBy,
      destination,
      reason,
      expectedReturnDate,
      notes,
    ]
  );

  return result.rows[0];
};

// Get active exit record
const getActiveExit = async (assetId) => {
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.asset_id,
        e.taken_by_user_id,
        e.authorized_by,
        e.destination,
        e.reason,
        e.date_out,
        e.expected_return_date,
        e.actual_return_date,
        e.status,
        e.authorization_status,
        e.authorized_at,
        e.notes,

        taker.name AS taken_by_name,
        taker.email AS taken_by_email,

        authorizer.name AS authorized_by_name

      FROM asset_exit_records e

      JOIN users taker
        ON taker.id = e.taken_by_user_id

      JOIN users authorizer
        ON authorizer.id = e.authorized_by

      WHERE e.asset_id = $1
        AND e.status = 'OUT'

      LIMIT 1
    `,
    [assetId]
  );

  return result.rows[0];
};

// Get exit history
const getExitHistory = async (assetId) => {
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.asset_id,
        e.taken_by_user_id,
        e.authorized_by,
        e.destination,
        e.reason,
        e.date_out,
        e.expected_return_date,
        e.actual_return_date,
        e.status,
        e.authorization_status,
        e.authorized_at,
        e.notes,

        taker.name AS taken_by_name,
        authorizer.name AS authorized_by_name

      FROM asset_exit_records e

      JOIN users taker
        ON taker.id = e.taken_by_user_id

      JOIN users authorizer
        ON authorizer.id = e.authorized_by

      WHERE e.asset_id = $1

      ORDER BY e.created_at DESC
    `,
    [assetId]
  );

  return result.rows;
};

module.exports = {
  createExitAuthorization,
  getActiveExit,
  getExitHistory,
};