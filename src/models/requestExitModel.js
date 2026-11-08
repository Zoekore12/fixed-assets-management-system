const pool = require("../config/database");

// Create a checkout request
const createExitRequest = async (
  {
    asset_id,
    requested_by_user_id,
    taken_by_user_id,
    destination,
    reason,
    expected_return_date,
    notes,
    status = "PENDING",
    authorization_status = "PENDING",
    authorized_by = null,
    authorized_at = null,
  },
  client = pool
) => {
  const result = await client.query(
    `INSERT INTO asset_exit_records (
      asset_id,
      requested_by_user_id,
      taken_by_user_id,
      destination,
      reason,
      expected_return_date,
      notes,
      status,
      authorization_status,
      authorized_by,
      authorized_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11
    )
    RETURNING *`,
    [
      asset_id,
      requested_by_user_id,
      taken_by_user_id,
      destination,
      reason || null,
      expected_return_date || null,
      notes || null,
      status,
      authorization_status,
      authorized_by,
      authorized_at,
    ]
  );

  return result.rows[0];
};


// Get a single exit request
const getExitRequestById = async (id) => {
  const result = await pool.query(
    `SELECT
       e.*,

       a.asset_tag,
       a.name AS asset_name,
       a.status AS asset_status,

       requester.name AS requester_name,
       requester.email AS requester_email,

       taker.name AS taker_name,
       taker.email AS taker_email,

       approver.name AS approver_name,
       approver.email AS approver_email

     FROM asset_exit_records e

     JOIN assets a
       ON a.id = e.asset_id

     JOIN users requester
       ON requester.id = e.requested_by_user_id

     JOIN users taker
       ON taker.id = e.taken_by_user_id

     LEFT JOIN users approver
       ON approver.id = e.authorized_by

     WHERE e.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};


// Get pending checkout requests
const getPendingExitRequests = async () => {
  const result = await pool.query(
    `SELECT
       e.*,

       a.asset_tag,
       a.name AS asset_name,
       a.status AS asset_status,

       requester.name AS requester_name,
       requester.email AS requester_email,

       taker.name AS taker_name,
       taker.email AS taker_email

     FROM asset_exit_records e

     JOIN assets a
       ON a.id = e.asset_id

     JOIN users requester
       ON requester.id = e.requested_by_user_id

     JOIN users taker
       ON taker.id = e.taken_by_user_id

     WHERE e.status = 'PENDING'
       AND e.authorization_status = 'PENDING'

     ORDER BY e.created_at ASC`
  );

  return result.rows;
};


// Get all requests made by a specific user
const getUserExitRequests = async (userId) => {
  const result = await pool.query(
    `SELECT
       e.*,

       a.asset_tag,
       a.name AS asset_name,
       a.status AS asset_status,

       requester.name AS requester_name,
       requester.email AS requester_email,

       taker.name AS taker_name,
       taker.email AS taker_email

     FROM asset_exit_records e

     JOIN assets a
       ON a.id = e.asset_id

     JOIN users requester
       ON requester.id = e.requested_by_user_id

     JOIN users taker
       ON taker.id = e.taken_by_user_id

     WHERE e.requested_by_user_id = $1

     ORDER BY e.created_at DESC`,
    [userId]
  );

  return result.rows;
};

// Get active authorized/out request for an asset
const getActiveExitRequestForAsset = async (
  assetId,
  client = pool
) => {
  const result = await client.query(
    `SELECT *
     FROM asset_exit_records
     WHERE asset_id = $1
       AND status IN ('AUTHORIZED', 'OUT')
     ORDER BY created_at DESC
     LIMIT 1`,
    [assetId]
  );

  return result.rows[0] || null;
};

const getApprovedExitRequests = async () => {
  const result = await pool.query(`
    SELECT
      e.*,

      requester.name AS requester_name,
      requester.email AS requester_email,

      taker.name AS taker_name,
      taker.email AS taker_email,

      approver.name AS approver_name,
      approver.email AS approver_email,

      a.asset_tag,
      a.name AS asset_name,
      a.status AS asset_status

    FROM asset_exit_records e

    JOIN users requester
      ON requester.id = e.requested_by_user_id

    JOIN users taker
      ON taker.id = e.taken_by_user_id

    LEFT JOIN users approver
      ON approver.id = e.authorized_by

    JOIN assets a
      ON a.id = e.asset_id

    WHERE e.authorization_status = 'AUTHORIZED'

    ORDER BY e.created_at DESC
  `);

  return result.rows;
};


const getRejectedExitRequests = async () => {
  const result = await pool.query(`
    SELECT
      e.*,

      requester.name AS requester_name,
      requester.email AS requester_email,

      taker.name AS taker_name,
      taker.email AS taker_email,

      approver.name AS approver_name,
      approver.email AS approver_email,

      a.asset_tag,
      a.name AS asset_name,
      a.status AS asset_status

    FROM asset_exit_records e

    JOIN users requester
      ON requester.id = e.requested_by_user_id

    JOIN users taker
      ON taker.id = e.taken_by_user_id

    LEFT JOIN users approver
      ON approver.id = e.authorized_by

    JOIN assets a
      ON a.id = e.asset_id

    WHERE e.authorization_status = 'REJECTED'

    ORDER BY e.created_at DESC
  `);

  return result.rows;
};




module.exports = {
  createExitRequest,
  getExitRequestById,
  getPendingExitRequests,
  getUserExitRequests,
  getActiveExitRequestForAsset,
  getApprovedExitRequests,
  getRejectedExitRequests,
};