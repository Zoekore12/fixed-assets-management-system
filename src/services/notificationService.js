const notificationModel = require("../models/notificationModel");

// 1. CREATE NOTIFICATION

const createNotification = async (data) => {
  const {
    userId,
    title,
    message,
    type,
    category,
    relatedEntityId = null,
    relatedEntityType = null,
    link = null,
    metadata = {},
  } = data;

  // Validate required fields
  if (!userId || !title || !message || !type || !category) {
    const error = new Error(
      "User ID, title, message, type, and category are required"
    );
    error.statusCode = 400;
    throw error;
  }

  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    const error = new Error("Metadata must be a valid object");
    error.statusCode = 400;
    throw error;
  }

  return await notificationModel.createNotification({
    userId,
    title: title.trim(),
    message: message.trim(),
    type,
    category,
    relatedEntityId,
    relatedEntityType,
    link,
    metadata,
  });
};

// 2. GET USER NOTIFICATIONS

const getNotificationsByUser = async ({
  userId,
  limit = 20,
  offset = 0,
  isRead,
}) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    throw error;
  }

  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 100
  ) {
    const error = new Error("Limit must be between 1 and 100");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    const error = new Error("Offset must be a non-negative integer");
    error.statusCode = 400;
    throw error;
  }

  return await notificationModel.getNotificationsByUser({
    userId,
    limit: parsedLimit,
    offset: parsedOffset,
    isRead,
  });
};

// 3. GET UNREAD NOTIFICATION COUNT

const getUnreadCount = async (userId) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    throw error;
  }

  return await notificationModel.getUnreadCount(userId);
};

// 4. MARK NOTIFICATION AS READ

const markAsRead = async (notificationId, userId) => {
  if (!notificationId || !userId) {
    const error = new Error(
      "Notification ID and user ID are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const notification = await notificationModel.markAsRead(
    notificationId,
    userId
  );

  if (!notification) {
    const error = new Error(
      "Notification not found or already marked as read"
    );
    error.statusCode = 404;
    throw error;
  }

  return notification;
};

// 5. MARK ALL NOTIFICATIONS AS READ

const markAllAsRead = async (userId) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    throw error;
  }

  return await notificationModel.markAllAsRead(userId);
};

// 6. DELETE NOTIFICATION

const deleteNotification = async (notificationId, userId) => {
  if (!notificationId || !userId) {
    const error = new Error(
      "Notification ID and user ID are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const deleted = await notificationModel.deleteNotification(
    notificationId,
    userId
  );

  if (!deleted) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  return true;
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
