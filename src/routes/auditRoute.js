const express = require("express");

const {
  getAuditHistory,
  getAuditRecord,
  getEntityAuditHistory,
} = require("../controllers/auditController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: View and investigate system audit records
*/

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         user_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         action:
 *           type: string
 *           example: ASSET_REASSIGNED
 *         entity_type:
 *           type: string
 *           example: ASSET
 *         entity_id:
 *           type: string
 *           format: uuid
 *         old_data:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         new_data:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         description:
 *           type: string
 *           nullable: true
 *           example: Asset reassigned to another staff member
 *         ip_address:
 *           type: string
 *           nullable: true
 *           example: 192.168.1.10
 *         user_agent:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     AuditLogResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/AuditLog'
 *
 *     AuditLogsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 5
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AuditLog'
*/

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get complete audit history
 *     description: Retrieves all audit log records. Administrator access is required.
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Audit history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLogsResponse'
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       500:
 *         description: Failed to retrieve audit history
*/       
// Get complete audit history
// Administrator only
router.get("/",authenticate,authorizeRoles("Administrator"),getAuditHistory);
/**
 * @swagger
 * /audit-logs/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit history for a specific entity
 *     description: Retrieves audit events associated with a particular entity, such as an asset. Administrator access is required.
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity type recorded in the audit log. Must match the stored entity_type value.
 *         example: ASSET
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the entity
 *     responses:
 *       200:
 *         description: Entity audit history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLogsResponse'
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       500:
 *         description: Failed to retrieve entity audit history
*/

// Get one audit record
// Administrator only
router.get("/:id",authenticate,authorizeRoles("Administrator"),getAuditRecord);
/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Get one audit record by ID
 *     description: Retrieves a single audit log record. Administrator access is required.
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the audit log record
 *     responses:
 *       200:
 *         description: Audit record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLogResponse'
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Audit log not found
 *       500:
 *         description: Failed to retrieve audit record
*/
// Get audit history for an entity Example:/audit-logs/entity/ASSET/UUID
// Administrator only
router.get("/entity/:entityType/:entityId",authenticate,authorizeRoles("Administrator"),getEntityAuditHistory);


module.exports = router;