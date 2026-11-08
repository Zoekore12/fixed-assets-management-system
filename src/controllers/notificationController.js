
const notificationService = require("../services/notificationService");

// ======================================================
// 1. GET ALL USER NOTIFICATIONS
// ======================================================

const getAll = async (req, res) => {
  try {
    const { limit = 20, offset = 0, isRead } = req.query;

    // Convert isRead query parameter to boolean
    let readFilter;

    if (isRead === "true") {
      readFilter = true;
    } else if (isRead === "false") {
      readFilter = false;
    }

    const notifications =
      await notificationService.getNotificationsByUser({
        userId: req.user.id,
        limit: Number(limit),
        offset: Number(offset),
        isRead: readFilter,
      });

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve notifications",
    });
  }
};

// ======================================================
// 2. GET UNREAD NOTIFICATION COUNT
// ======================================================

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount =
      await notificationService.getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Unread notification count retrieved successfully",
      unreadCount,
    });
  } catch (error) {
    console.error("Get unread notification count error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve unread count",
    });
  }
};

// ======================================================
// 3. MARK ONE NOTIFICATION AS READ
// ======================================================

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await notificationService.markAsRead(
      id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
};

// ======================================================
// 4. MARK ALL NOTIFICATIONS AS READ
// ======================================================

const markAllAsRead = async (req, res) => {
  try {
    const updatedCount =
      await notificationService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read successfully",
      updatedCount,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
};

// ======================================================
// 5. DELETE ONE NOTIFICATION
// ======================================================

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await notificationService.deleteNotification(
      id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete notification",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getAll,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  remove,
};
 