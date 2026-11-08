const express = require("express");

const {getPendingRequests,approveRequest,rejectRequest,getApprovedRequests,getRejectedRequests,getSingleRequest,} = require("../controllers/exitApprovalController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ExitApproval
 *   description: Approving and managing asset checkout exit requests
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ExitApprovalRequest:
 *       type: object
 *       description: Asset checkout or exit request details
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "660e8400-e29b-41d4-a716-446655440000"
 *         asset_id:
 *           type: string
 *           format: uuid
 *           example: "770e8400-e29b-41d4-a716-446655440000"
 *         taken_by_user_id:
 *           type: string
 *           format: uuid
 *           example: "880e8400-e29b-41d4-a716-446655440000"
 *         authorized_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID of the administrator who authorized the request
 *           example: "990e8400-e29b-41d4-a716-446655440000"
 *         destination:
 *           type: string
 *           example: Client Office, Abuja
 *         reason:
 *           type: string
 *           example: Official field assignment
 *         date_out:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-10-21T09:00:00.000Z"
 *         expected_return_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-10-25T17:00:00.000Z"
 *         actual_return_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         status:
 *           type: string
 *           description: Current checkout request status
 *           enum:
 *             - PENDING
 *             - APPROVED
 *             - REJECTED
 *           example: PENDING
 *         authorization_status:
 *           type: string
 *           nullable: true
 *           description: Authorization status, if returned by the model
 *           enum:
 *             - PENDING
 *             - APPROVED
 *             - REJECTED
 *           example: APPROVED
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *           example: Insufficient authorization for the requested trip
 *         authorized_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-10-21T08:30:00.000Z"
 *
 *     ExitApprovalListResponse:
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
 *             $ref: '#/components/schemas/ExitApprovalRequest'
 *
 *     ExitApprovalSingleResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/ExitApprovalRequest'
 *
 *     ExitApprovalActionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Checkout request approved successfully
 *         data:
 *           $ref: '#/components/schemas/ExitApprovalRequest'
 *
 *     RejectExitRequestInput:
 *       type: object
 *       required:
 *         - rejection_reason
 *       properties:
 *         rejection_reason:
 *           type: string
 *           minLength: 1
 *           description: Reason the checkout request is being rejected
 *           example: Insufficient authorization for the requested trip
 *
 *     ExitApprovalError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Invalid checkout request ID
*/


router.use(authenticate);
router.use(authorizeRoles("Administrator"));
/**
 * @swagger
 * /exit-approvals/exit-requests/pending:
 *   get:
 *     summary: Get pending exit requests
 *     description: >
 *       Retrieves all asset checkout requests awaiting approval.
 *       Only authenticated Administrators can access this endpoint.
 *     tags: [ExitApproval]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Pending exit requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalListResponse'
 *             example:
 *               success: true
 *               count: 1
 *               data:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                   taken_by_user_id: "880e8400-e29b-41d4-a716-446655440000"
 *                   destination: Client Office, Abuja
 *                   reason: Official field assignment
 *                   status: PENDING
 *       401:
 *         description: Authentication required or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       403:
 *         description: Administrator role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 */
router.get("/exit-requests/pending", getPendingRequests);
/** 
*@swagger 
* /exit-approvals/exit-requests/approved:
 *   get:
 *     summary: Get approved exit requests
 *     description: Retrieves all approved asset checkout requests.
 *     tags: [ExitApproval]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Approved exit requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalListResponse'
 *             example:
 *               success: true
 *               count: 1
 *               data:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                   destination: Client Office, Abuja
 *                   reason: Official field assignment
 *                   status: APPROVED
 *       401:
 *         description: Authentication required or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       403:
 *         description: Administrator role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
*/
router.get("/exit-requests/approved", getApprovedRequests);
/**
 * @swagger
 * /exit-approvals/exit-requests/rejected:
 *   get:
 *     summary: Get rejected exit requests
 *     description: Retrieves all rejected asset checkout requests.
 *     tags: [ExitApproval]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Rejected exit requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalListResponse'
 *             example:
 *               success: true
 *               count: 1
 *               data:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                   destination: Client Office, Abuja
 *                   reason: Official field assignment
 *                   status: REJECTED
 *                   rejection_reason: Insufficient authorization for the requested trip
 *       401:
 *         description: Authentication required or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       403:
 *         description: Administrator role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
*/

router.get("/exit-requests/rejected",getRejectedRequests);
 /** 
 *@swagger
 * /exit-approvals/exit-requests/{requestId}:
 *   get:
 *     summary: Get a single exit request
 *     description: Retrieves the details of a specific checkout request by UUID.
 *     tags: [ExitApproval]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the checkout request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Checkout request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalSingleResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                 destination: Client Office, Abuja
 *                 reason: Official field assignment
 *                 status: PENDING
 *       400:
 *         description: Invalid request ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *             example:
 *               success: false
 *               message: Invalid request ID
 *       401:
 *         description: Authentication required or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       403:
 *         description: Administrator role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *       404:
 *         description: Checkout request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *             example:
 *               success: false
 *               message: Checkout request not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
*/
router.get("/exit-requests/:requestId",getSingleRequest);
/**
 * @swagger
 * /exit-approvals/exit-requests/{requestId}/approve:
 *   post:
 *     summary: Approve an exit request
 *     description: Approves a pending asset checkout request. Only Administrators can perform this action.
 *     tags: [ExitApproval]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the exit request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Checkout request approved successfully
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
 *                   example: Checkout request approved successfully
 *                 data:
 *                   type: object
 *                   description: Approved exit request details
 *       400:
 *         description: Invalid checkout request ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *             example:
 *               success: false
 *               message: Invalid checkout request ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Checkout request not found
 *       500:
 *         description: Internal server error
 */
router.post("/exit-requests/:requestId/approve",approveRequest);
/**
 * @swagger
 * /exit-approvals/exit-requests/{requestId}/reject:
 *   post:
 *     summary: Reject an exit request
 *     description: Rejects an asset checkout request. A rejection reason is required. Only Administrators can perform this action.
 *     tags: [ExitApproval]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the exit request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 minLength: 1
 *                 description: Reason for rejecting the exit request
 *                 example: Insufficient authorization for the requested trip
 *           example:
 *             rejection_reason: Insufficient authorization for the requested trip
 *     responses:
 *       200:
 *         description: Checkout request rejected successfully
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
 *                   example: Checkout request rejected successfully
 *                 data:
 *                   type: object
 *                   description: Rejected exit request details
 *       400:
 *         description: Invalid checkout request ID or missing rejection reason
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExitApprovalError'
 *             examples:
 *               invalidRequestId:
 *                 value:
 *                   success: false
 *                   message: Invalid checkout request ID
 *               missingReason:
 *                 value:
 *                   success: false
 *                   message: A rejection reason is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Checkout request not found
 *       500:
 *         description: Internal server error
*/
router.post("/exit-requests/:requestId/reject",rejectRequest);

module.exports = router;