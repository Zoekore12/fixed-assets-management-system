const express = require("express");
const router = express.Router();

const {dashboardSummary,} = require("../controllers/dashboardController");

const authenticate = require("../middleware/authMiddleware");
/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Role-based dashboard summary and statistics
 */

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Get dashboard summary
 *     description: >
 *       Returns dashboard statistics based on the authenticated user's role
 *       and organizational scope. Administrators receive the overall dashboard,
 *       HODs receive department statistics, HOUs receive unit statistics,
 *       Security staff receive security statistics, and Staff receive
 *       their personal dashboard.
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Dashboard statistics determined by the user's role
 *                   additionalProperties: true
 *             examples:
 *               administrator:
 *                 summary: Administrator dashboard
 *                 value:
 *                   success: true
 *                   data:
 *                     totalAssets: 250
 *                     availableAssets: 100
 *                     assignedAssets: 120
 *                     assetsInTransit: 10
 *                     assetsUnderMaintenance: 5
 *                     assetsOut: 15
 *               staff:
 *                 summary: Staff dashboard
 *                 value:
 *                   success: true
 *                   data:
 *                     assignedAssets: 2
 *                     assetsCurrentlyOut: 1
 *       400:
 *         description: User has no required department or unit assignment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardError'
 *             examples:
 *               missingDepartment:
 *                 summary: HOD has no department
 *                 value:
 *                   success: false
 *                   message: User is not assigned to a department
 *               missingUnit:
 *                 summary: HOU has no unit
 *                 value:
 *                   success: false
 *                   message: User is not assigned to a unit
 *       401:
 *         description: User account not found or inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardError'
 *             example:
 *               success: false
 *               message: User account not found or inactive
 *       403:
 *         description: Dashboard access is unavailable for the user's role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardError'
 *             example:
 *               success: false
 *               message: Dashboard access is not available for this role
 *       500:
 *         description: Failed to load dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardError'
 *             example:
 *               success: false
 *               message: Failed to load dashboard summary
*/

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Failed to load dashboard summary
*/

router.get("/summary",authenticate,dashboardSummary);

module.exports = router;