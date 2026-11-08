
const pool = require("../config/database");

// 1. CREATE NOTIFICATION

const createNotification = async ({
  userId,
  title,
  message,
  type,
  category,
  relatedEntityId = null,
  relatedEntityType = null,
  link = null,
  metadata = {},
}) => {
  const result = await pool.query(
    `
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      category,
      related_entity_id,
      related_entity_type,
      link,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      userId,
      title,
      message,
      type,
      category,
      relatedEntityId,
      relatedEntityType,
      link,
      JSON.stringify(metadata),
    ]
  );

  return result.rows[0];
};
// 2. GET NOTIFICATIONS BY USER

const getNotificationsByUser = async ({
  userId,
  limit = 20,
  offset = 0,
  isRead,
}) => {
  const values = [userId];

  let query = `
    SELECT *
    FROM notifications
    WHERE user_id = $1
  `;

  if (typeof isRead === "boolean") {
    values.push(isRead);
    query += ` AND is_read = $${values.length}`;
  }

  values.push(limit);
  query += ` ORDER BY created_at DESC
             LIMIT $${values.length}`;

  values.push(offset);
  query += ` OFFSET $${values.length}`;

  const result = await pool.query(query, values);

  return result.rows;
};

// 3. GET UNREAD NOTIFICATION COUNT

const getUnreadCount = async (userId) => {
  const result = await pool.query(
    `
    SELECT COUNT(*)::INTEGER AS unread_count
    FROM notifications
    WHERE user_id = $1
      AND is_read = FALSE
    `,
    [userId]
  );

  return result.rows[0].unread_count;
};

// 4. MARK ONE NOTIFICATION AS READ

const markAsRead = async (notificationId, userId) => {
  const result = await pool.query(
    `
    UPDATE notifications
    SET
      is_read = TRUE,
      read_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND user_id = $2
      AND is_read = FALSE
    RETURNING *
    `,
    [notificationId, userId]
  );

  return result.rows[0] || null;
};

// 5. MARK ALL NOTIFICATIONS AS READ

const markAllAsRead = async (userId) => {
  const result = await pool.query(
    `
    UPDATE notifications
    SET
      is_read = TRUE,
      read_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
      AND is_read = FALSE
    RETURNING id
    `,
    [userId]
  );

  return result.rowCount;
};

// 6. DELETE NOTIFICATION

const deleteNotification = async (notificationId, userId) => {
  const result = await pool.query(
    `
    DELETE FROM notifications
    WHERE id = $1
      AND user_id = $2
    RETURNING id
    `,
    [notificationId, userId]
  );

  return result.rowCount > 0;
};
// EXPORTS
module.exports = {
  createNotification,
  getNotificationsByUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
