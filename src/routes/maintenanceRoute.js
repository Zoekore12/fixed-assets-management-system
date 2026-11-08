const express = require("express");

const {
  createMaintenanceRecord,
  getMaintenanceRecords,
  getMaintenanceRecord,
  completeMaintenanceRecord,
  approveMaintenanceRequestRecord,
  createMaintenanceRequestRecord,
  getMaintenanceRequests,
  rejectMaintenanceRequestRecord,
} = require("../controllers/maintenanceController");


const {
  requireMaintenanceView,
  requireMaintenanceCompletion,
} = require("../middleware/maintenanceAuth");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Maintenance requests, approvals, records, and completion
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceRequestInput:
 *       type: object
 *       required:
 *         - assetId
 *         - maintenanceType
 *         - description
 *       properties:
 *         assetId:
 *           type: string
 *           format: uuid
 *           description: UUID of the asset requiring maintenance
 *           example: "770e8400-e29b-41d4-a716-446655440000"
 *         maintenanceType:
 *           type: string
 *           description: Type of maintenance required
 *           example: Repair
 *         description:
 *           type: string
 *           description: Details of the maintenance problem or requirement
 *           example: Laptop screen is damaged and needs replacement
 *         serviceProvider:
 *           type: string
 *           nullable: true
 *           description: Proposed service provider
 *           example: ABC Computer Services
 *         estimatedCost:
 *           type: number
 *           format: double
 *           nullable: true
 *           description: Estimated cost of the maintenance
 *           example: 75000
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes about the request
 *           example: Required urgently for official duties
 *
 *     MaintenanceRecordInput:
 *       type: object
 *       required:
 *         - assetId
 *         - maintenanceType
 *         - description
 *       properties:
 *         assetId:
 *           type: string
 *           format: uuid
 *           description: UUID of the asset requiring maintenance
 *           example: "770e8400-e29b-41d4-a716-446655440000"
 *         maintenanceType:
 *           type: string
 *           description: Type of maintenance performed or required
 *           example: Repair
 *         description:
 *           type: string
 *           description: Description of the maintenance work
 *           example: Replacement of damaged laptop screen
 *         serviceProvider:
 *           type: string
 *           nullable: true
 *           description: Name of the maintenance service provider
 *           example: ABC Computer Services
 *         cost:
 *           type: number
 *           format: double
 *           nullable: true
 *           description: Maintenance cost
 *           example: 75000
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional maintenance notes
 *           example: Replacement completed and tested
 *
 *     MaintenanceRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "660e8400-e29b-41d4-a716-446655440000"
 *         asset_id:
 *           type: string
 *           format: uuid
 *           example: "770e8400-e29b-41d4-a716-446655440000"
 *         maintenance_type:
 *           type: string
 *           example: Repair
 *         description:
 *           type: string
 *           example: Replacement of damaged laptop screen
 *         service_provider:
 *           type: string
 *           nullable: true
 *           example: ABC Computer Services
 *         cost:
 *           type: number
 *           nullable: true
 *           example: 75000
 *         status:
 *           type: string
 *           example: OPEN
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Awaiting final inspection
 *
 *     MaintenanceRequestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Maintenance request submitted successfully
 *         data:
 *           type: object
 *           description: Created maintenance request details
 *
 *     MaintenanceRecordResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Maintenance record created successfully
 *         data:
 *           $ref: '#/components/schemas/MaintenanceRecord'
 *
 *     MaintenanceListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 2
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MaintenanceRecord'
 *
 *     MaintenanceSingleResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/MaintenanceRecord'
 *
 *     MaintenanceMessageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Maintenance completed successfully
 *         data:
 *           $ref: '#/components/schemas/MaintenanceRecord'
 *
 *     MaintenanceError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Failed to retrieve maintenance records
*/


/**
 * @swagger
 * /maintenances/requests:
 *   post:
 *     summary: Submit a maintenance request
 *     description: >
 *       Allows an authenticated user to submit a maintenance request for an asset.
 *       The requesting user's ID is obtained from the authenticated session,
 *       not from the request body.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceRequestInput'
 *           example:
 *             assetId: "770e8400-e29b-41d4-a716-446655440000"
 *             maintenanceType: Repair
 *             description: Laptop screen is damaged and needs replacement
 *             serviceProvider: ABC Computer Services
 *             estimatedCost: 75000
 *             notes: Required urgently for official duties
 *     responses:
 *       201:
 *         description: Maintenance request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequestResponse'
 *             example:
 *               success: true
 *               message: Maintenance request submitted successfully
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Required fields missing or maintenance request invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
 *             example:
 *               success: false
 *               message: assetId, maintenanceType and description are required
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error, if returned by the error handler
*/
//create maintenance request
router.post("/requests",authenticate,createMaintenanceRequestRecord);
/** 
 * @swagger
 * /maintenances:
 *   post:
 *     summary: Create a maintenance record
 *     description: >
 *       Creates a maintenance record directly for an asset.
 *       Only authenticated Administrators are authorized to perform this action.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceRecordInput'
 *           example:
 *             assetId: "770e8400-e29b-41d4-a716-446655440000"
 *             maintenanceType: Repair
 *             description: Replacement of damaged laptop screen
 *             serviceProvider: ABC Computer Services
 *             cost: 75000
 *             notes: Screen replacement scheduled
 *     responses:
 *       201:
 *         description: Maintenance record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRecordResponse'
 *             example:
 *               success: true
 *               message: Maintenance record created successfully
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                 maintenance_type: Repair
 *                 description: Replacement of damaged laptop screen
 *                 cost: 75000
 *                 status: OPEN
 *       400:
 *         description: Required fields missing or maintenance creation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
 *             example:
 *               success: false
 *               message: assetId, maintenanceType and description are required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
*/
// Create maintenance record
router.post("/maintenances", authenticate,authorizeRoles("Administrator"), createMaintenanceRecord);

/**
 * @swagger
 * /requests/{id}/approve:
 *   patch:
 *     summary: Approve a maintenance request
 *     description: >
 *       Approves a submitted maintenance request.
 *       Only authenticated Administrators can approve requests.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the maintenance request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Maintenance request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequestResponse'
 *             example:
 *               success: true
 *               message: Maintenance request approved successfully
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Invalid request or approval failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Maintenance request not found, if returned by the service
 *       500:
 *         description: Server error, if returned by the error handler
*/
//approve maintenance request 
router.patch("/requests/:id/approve",authenticate,authorizeRoles("Administrator"),approveMaintenanceRequestRecord);
/** 
 * @swagger
 * /maintenances:
 *   get:
 *     summary: Get all maintenance records
 *     description: >
 *       Retrieves all maintenance records. Access is controlled by the
 *       requireMaintenanceView middleware.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Maintenance records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceListResponse'
 *             example:
 *               success: true
 *               count: 1
 *               data:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                   maintenance_type: Repair
 *                   description: Replacement of damaged laptop screen
 *                   service_provider: ABC Computer Services
 *                   cost: 75000
 *                   status: OPEN
 *                   notes: Awaiting final inspection
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not have maintenance viewing permission
 *       500:
 *         description: Failed to retrieve maintenance records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
*/
// Get all maintenance records
router.get("/maintenances", authenticate, requireMaintenanceView, getMaintenanceRecords);
/**
 * @swagger
 * /maintenances/{id}:
 *   get:
 *     summary: Get a maintenance record by ID
 *     description: >
 *       Retrieves the details of a specific maintenance record.
 *       Access is controlled by the requireMaintenanceView middleware.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the maintenance record
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Maintenance record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceSingleResponse'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not have maintenance viewing permission
 *       404:
 *         description: Maintenance record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
 *             example:
 *               success: false
 *               message: Maintenance record not found
 *       500:
 *         description: Failed to retrieve maintenance record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
 */
// Get one maintenance record
router.get("/maintenances/:id", authenticate, requireMaintenanceView, getMaintenanceRecord);

/** 
 * @swagger
 * /maintenances/{id}/complete:
 *   post:
 *     summary: Complete a maintenance record
 *     description: >
 *       Marks a maintenance record as completed.
 *       Authorization is controlled by the requireMaintenanceCompletion middleware.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the maintenance record to complete
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Maintenance completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceMessageResponse'
 *             example:
 *               success: true
 *               message: Maintenance completed successfully
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 status: COMPLETED
 *       400:
 *         description: Maintenance completion failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceError'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not have maintenance completion permission
 *       404:
 *         description: Maintenance record not found, if handled by the service
 *       500:
 *         description: Server error, if returned by the error handler
*/

// Complete maintenance
router.post("/maintenances/:id/complete", authenticate, requireMaintenanceCompletion, completeMaintenanceRecord);
/**
 * @swagger
 * /maintenances/requests:
 *   get:
 *     summary: Get all maintenance requests
 *     description: >
 *       Retrieves maintenance requests with asset details, requester details,
 *       and reviewer details. Administrators can optionally filter requests
 *       by status.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         description: Filter maintenance requests by their status
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - APPROVED
 *             - REJECTED
 *         example: PENDING
 *     responses:
 *       200:
 *         description: Maintenance requests retrieved successfully
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
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                       asset_tag:
 *                         type: string
 *                         example: MIST-000002
 *                       asset_name:
 *                         type: string
 *                         example: Dell Latitude 5420
 *                       requested_by:
 *                         type: string
 *                         format: uuid
 *                       requester_first_name:
 *                         type: string
 *                         nullable: true
 *                         example: John
 *                       requester_last_name:
 *                         type: string
 *                         nullable: true
 *                         example: Doe
 *                       maintenance_type:
 *                         type: string
 *                         example: REPAIR
 *                       description:
 *                         type: string
 *                         example: Laptop battery is faulty
 *                       service_provider:
 *                         type: string
 *                         nullable: true
 *                       estimated_cost:
 *                         type: number
 *                         nullable: true
 *                         example: 45000
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum:
 *                           - PENDING
 *                           - APPROVED
 *                           - REJECTED
 *                         example: PENDING
 *                       reviewed_by:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       reviewer_first_name:
 *                         type: string
 *                         nullable: true
 *                         example: Admin
 *                       reviewer_last_name:
 *                         type: string
 *                         nullable: true
 *                         example: Smith
 *                       reviewed_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       rejection_reason:
 *                         type: string
 *                         nullable: true
 *                         example: Repair is not currently justified
 *                       maintenance_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid maintenance request status
 *       401:
 *         description: Authentication is required
 *       403:
 *         description: Access denied. Administrator role required
 *       500:
 *         description: Failed to retrieve maintenance requests
*/
// Get maintenance requests
router.get("/requests",authenticate,authorizeRoles("Administrator"),getMaintenanceRequests);
/**
 * @swagger
 * /maintenances/requests/{id}/reject:
 *   patch:
 *     summary: Reject a maintenance request
 *     description: >
 *       Allows an Administrator to reject a pending maintenance request.
 *       A rejection reason is required. The request is updated to REJECTED,
 *       and the reviewing Administrator, review timestamp, and rejection
 *       reason are saved. The action is recorded in the audit log.
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the maintenance request to reject
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 minLength: 1
 *                 description: Reason the maintenance request is being rejected
 *                 example: "The requested maintenance is not justified."
 *     responses:
 *       200:
 *         description: Maintenance request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Maintenance request rejected successfully
 *                 data:
 *                   type: object
 *                   description: Updated maintenance request
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: REJECTED
 *                     rejection_reason:
 *                       type: string
 *                       example: "The requested maintenance is not justified."
 *                     reviewed_by:
 *                       type: string
 *                       format: uuid
 *                     reviewed_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: A rejection reason is missing or invalid
 *       401:
 *         description: Authentication is required
 *       403:
 *         description: Only Administrators can reject maintenance requests
 *       404:
 *         description: Maintenance request not found
 *       409:
 *         description: The request is not in PENDING status
 *       500:
 *         description: Internal server error
*/
// Administrator rejects a maintenance request
router.patch("/requests/:id/reject",authenticate,authorizeRoles("Administrator"),rejectMaintenanceRequestRecord);

module.exports = router;