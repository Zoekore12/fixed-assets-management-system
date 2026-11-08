const express = require("express");
const router = express.Router();

const {assetReport,movementReport,checkoutReport,maintenanceReport,auditReport,} = require("../controllers/reportController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
/**
 * @swagger
 * /reports/assets:
 *   get:
 *     summary: Generate asset report
 *     description: >
 *       Retrieves asset records with optional filters for building, department,
 *       unit, category, status, condition, and active status.
 *       Report visibility is restricted according to the authenticated user's role
 *       and organizational scope. Administrators can use all filters.
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter assets by building UUID
 *       - in: query
 *         name: departmentId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter assets by department UUID
 *       - in: query
 *         name: unitId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter assets by unit UUID
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter assets by category UUID
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter assets by asset status
 *         example: ASSIGNED
 *       - in: query
 *         name: condition
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter assets by physical condition
 *         example: GOOD
 *       - in: query
 *         name: isActive
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter assets by active status
 *         example: true
 *     responses:
 *       200:
 *         description: Asset report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Asset report record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       asset_tag:
 *                         type: string
 *                         example: MIST-000002
 *                       name:
 *                         type: string
 *                         example: Dell Latitude Laptop
 *                       status:
 *                         type: string
 *                         example: ASSIGNED
 *       400:
 *         description: User is not assigned to a department or unit required for report access
 *       401:
 *         description: Authentication required or user account not found or inactive
 *       403:
 *         description: User does not have permission to view asset reports
 *       500:
 *         description: Failed to generate asset report
*/

router.get("/assets",authenticate,assetReport);
/**
 * @swagger
 * /reports/movements:
 *   get:
 *     summary: Generate asset movement report
 *     description: >
 *       Retrieves asset movement records with optional filters for building,
 *       department, unit, movement status, movement type, and date range.
 *       Results are restricted according to the authenticated user's role
 *       and organizational scope.
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter movements by building UUID
 *       - in: query
 *         name: departmentId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter movements by department UUID
 *       - in: query
 *         name: unitId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter movements by unit UUID
 *       - in: query
 *         name: movementStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by movement status
 *         example: PENDING
 *       - in: query
 *         name: movementType
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by movement type
 *         example: TRANSFER
 *       - in: query
 *         name: fromDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include movements from this date
 *         example: "2026-01-01"
 *       - in: query
 *         name: toDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include movements up to this date
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Movement report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Asset movement report record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       movement_type:
 *                         type: string
 *                         example: TRANSFER
 *                       movement_status:
 *                         type: string
 *                         example: PENDING
 *       400:
 *         description: User is not assigned to a department or unit required for report access
 *       401:
 *         description: Authentication required or user account not found or inactive
 *       403:
 *         description: User does not have permission to view movement reports
 *       500:
 *         description: Failed to generate movement report
*/

router.get("/movements",authenticate,movementReport);

/**
 * @swagger
 * /reports/checkouts:
 *   get:
 *     summary: Generate asset checkout report
 *     description: >
 *       Retrieves asset checkout and exit records with optional filters for
 *       building, checkout status, and date range. Results are restricted
 *       according to the authenticated user's role and organizational scope.
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter checkout records by building UUID
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by checkout or exit-record status
 *         example: APPROVED
 *       - in: query
 *         name: fromDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include checkout records from this date
 *         example: "2026-01-01"
 *       - in: query
 *         name: toDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include checkout records up to this date
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Checkout report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Checkout report record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         example: APPROVED
 *                       destination:
 *                         type: string
 *                         example: Client Office, Abuja
 *       400:
 *         description: User is not assigned to a department or unit required for report access
 *       401:
 *         description: Authentication required or user account not found or inactive
 *       403:
 *         description: User does not have permission to view checkout reports
 *       500:
 *         description: Failed to generate checkout report
*/
router.get("/checkouts",authenticate,checkoutReport);
/**
 * @swagger
 * /reports/maintenance:
 *   get:
 *     summary: Generate maintenance report
 *     description: >
 *       Retrieves maintenance records with optional filters for building,
 *       department, unit, maintenance status, maintenance type, and date range.
 *       Security personnel are not permitted to access maintenance reports.
 *       Other users are restricted according to their role and organizational scope.
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter maintenance records by building UUID
 *       - in: query
 *         name: departmentId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter maintenance records by department UUID
 *       - in: query
 *         name: unitId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter maintenance records by unit UUID
 *       - in: query
 *         name: maintenanceStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by maintenance status
 *         example: OPEN
 *       - in: query
 *         name: maintenanceType
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by maintenance type
 *         example: REPAIR
 *       - in: query
 *         name: fromDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include maintenance records from this date
 *         example: "2026-01-01"
 *       - in: query
 *         name: toDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include maintenance records up to this date
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Maintenance report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Maintenance report record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       maintenance_type:
 *                         type: string
 *                         example: REPAIR
 *                       status:
 *                         type: string
 *                         example: OPEN
 *       400:
 *         description: User is not assigned to a department or unit required for report access
 *       401:
 *         description: Authentication required or user account not found or inactive
 *       403:
 *         description: Security personnel or another unauthorized user attempted to access maintenance reports
 *       500:
 *         description: Failed to generate maintenance report
*/

router.get("/maintenance",authenticate,maintenanceReport);
/**
 * @swagger
 * /reports/audit:
 *   get:
 *     summary: Generate audit report
 *     description: >
 *       Retrieves audit log records with optional filters for user, action,
 *       entity type, entity ID, and date range. This endpoint is restricted
 *       to Administrators.
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter audit records by the user who performed the action
 *       - in: query
 *         name: action
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by audit action
 *         example: CREATE
 *       - in: query
 *         name: entityType
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by the type of entity affected
 *         example: ASSET
 *       - in: query
 *         name: entityId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by the ID of the affected entity
 *       - in: query
 *         name: fromDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include audit records from this date
 *         example: "2026-01-01"
 *       - in: query
 *         name: toDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Include audit records up to this date
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Audit report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Audit log record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       action:
 *                         type: string
 *                         example: CREATE
 *                       entity_type:
 *                         type: string
 *                         example: ASSET
 *                       entity_id:
 *                         type: string
 *                         format: uuid
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can access audit reports
 *       500:
 *         description: Failed to generate audit report
*/
router.get("/audit",authenticate,authorizeRoles("Administrator"),auditReport);


module.exports = router;