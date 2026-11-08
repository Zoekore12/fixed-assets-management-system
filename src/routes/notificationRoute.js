const express = require("express");
const router = express.Router();

const {
  getAll,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  remove,
} = require("../controllers/notificationController");

const authenticate = require("../middleware/authMiddleware");

// ALL NOTIFICATION ROUTES REQUIRE AUTHENTICATION

router.use(authenticate);

// ======================================================
// GET NOTIFICATIONS
// ======================================================
/**
 * @swagger
 * /notification:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     description: >
 *       Retrieves notifications belonging to the authenticated user,
 *       ordered by creation date (most recent first).
 *       Supports pagination using limit and offset query parameters.
 *       Notifications can also be filtered by read status using isRead.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of notifications to retrieve.
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of notifications to skip.
 *       - in: query
 *         name: isRead
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter notifications by read status. Use true for read notifications or false for unread notifications.
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Notifications retrieved successfully
 *               count: 1
 *               notifications:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   user_id: "550e8400-e29b-41d4-a716-446655440001"
 *                   title: Exit Request Approved
 *                   message: Your exit request for asset MIST-000002 has been approved.
 *                   type: EXIT_REQUEST_APPROVED
 *                   category: ASSET
 *                   related_entity_id: "550e8400-e29b-41d4-a716-446655440002"
 *                   related_entity_type: EXIT_REQUEST
 *                   link: /exit-requests
 *                   metadata: {}
 *                   is_read: false
 *                   read_at: null
 *                   created_at: "2026-10-21T10:30:00.000Z"
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Failed to retrieve notifications.
*/
router.get("/", getAll);

// ======================================================
// GET UNREAD NOTIFICATION COUNT
// ======================================================
/**
 * @swagger
 * /notification/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: >
 *       Retrieves the total number of unread notifications
 *       belonging to the authenticated user.
 *       This endpoint can be used to display the unread
 *       notification badge on the user's dashboard.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Unread notification count retrieved successfully
 *               unreadCount: 5
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Failed to retrieve unread count.
*/
router.get("/unread-count", getUnreadCount);

// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// ======================================================
/**
 * @swagger
 * /notification/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: >
 *       Marks all unread notifications belonging to the authenticated
 *       user as read and records the read timestamp.
 *       Notifications belonging to other users are not affected.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: All notifications marked as read successfully
 *               updatedCount: 5
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Failed to mark all notifications as read.
*/
router.patch("/read-all", markAllAsRead);

// ======================================================
// MARK ONE NOTIFICATION AS READ
// ======================================================
/**
 * @swagger
 * /notification/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     description: >
 *       Marks a specific notification belonging to the authenticated
 *       user as read and records the date and time it was read.
 *       A user cannot mark another user's notification as read.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique ID of the notification.
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notification marked as read successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Notification marked as read successfully
 *               notification:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 title: Exit Request Approved
 *                 is_read: true
 *                 read_at: "2026-10-21T10:35:00.000Z"
 *       400:
 *         description: Invalid notification ID or missing required information.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Notification not found or already marked as read.
 *       500:
 *         description: Failed to mark notification as read.
*/
router.patch("/:id/read", markAsRead);

// ======================================================
// DELETE NOTIFICATION
// ======================================================
/**
 * @swagger
 * /notification/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: >
 *       Deletes a specific notification belonging to the authenticated
 *       user. A user cannot delete notifications belonging to another user.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique ID of the notification to delete.
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notification deleted successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Notification deleted successfully
 *       400:
 *         description: Invalid notification ID or missing required information.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Notification not found.
 *       500:
 *         description: Failed to delete notification.
*/
router.delete("/:id", remove);

module.exports = router;
