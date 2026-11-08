const pool = require("../config/database");

// Create an audit log
const createAuditLog = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
  description = null,
  ipAddress = null,
  userAgent = null,
  client = null,
}) => {
  const db = client || pool;

  const result = await db.query(
    `
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data,
        description,
        ip_address,
        user_agent,
        created_at
    `,
    [
      userId,
      action,
      entityType,
      entityId,
      oldData,
      newData,
      description,
      ipAddress,
      userAgent,
    ]
  );

  return result.rows[0];
};
//Get all audit logs
const getAllAuditLogs = async () => {
  const result = await pool.query(
    `
      SELECT
        al.*,
        u.name AS user_name,
        u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u
        ON al.user_id = u.id
      ORDER BY al.created_at DESC
    `
  );

  return result.rows;
};


//Get audit log by ID
const getAuditLogById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        al.*,
        u.name AS user_name,
        u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u
        ON al.user_id = u.id
      WHERE al.id = $1
    `,
    [id]
  );

  return result.rows[0];
};

//Get audit logs for a specific entity
const getAuditLogsByEntity = async (entityType, entityId) => {
  const result = await pool.query(
    `
      SELECT
        al.*,
        u.name AS user_name,
        u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u
        ON al.user_id = u.id
      WHERE al.entity_type = $1
        AND al.entity_id = $2
      ORDER BY al.created_at DESC
    `,
    [entityType, entityId]
  );

  return result.rows;
};


module.exports = {
  createAuditLog,
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByEntity,
};