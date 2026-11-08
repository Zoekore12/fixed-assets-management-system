const express = require("express");

const {submitRequest,} = require("../controllers/exitController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);
/**
 * @swagger
 * tags:
 *   name: AssetExitRequests
 *   description: Submit and manage asset checkout requests
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubmitExitRequestInput:
 *       type: object
 *       required:
 *         - destination
 *         - reason
 *       properties:
 *         taken_by_user_id:
 *           type: string
 *           format: uuid
 *           description: >
 *             UUID of the staff member taking the asset.
 *             Administrators may submit a request on behalf of another staff member.
 *             For non-administrators, the backend determines the requesting user.
 *           example: "880e8400-e29b-41d4-a716-446655440000"
 *         destination:
 *           type: string
 *           description: Destination where the asset will be taken
 *           example: Client Office, Abuja
 *         reason:
 *           type: string
 *           description: Reason for taking the asset outside the office
 *           example: Official field assignment
 *         expected_return_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expected date and time the asset will be returned
 *           example: "2026-10-25T17:00:00.000Z"
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes about the checkout request
 *           example: Asset required for an official field visit
 *
 *     SubmitExitRequestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Checkout request submitted successfully
 *         data:
 *           type: object
 *           description: Created checkout request details
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "660e8400-e29b-41d4-a716-446655440000"
 *             asset_id:
 *               type: string
 *               format: uuid
 *               example: "770e8400-e29b-41d4-a716-446655440000"
 *             taken_by_user_id:
 *               type: string
 *               format: uuid
 *               example: "880e8400-e29b-41d4-a716-446655440000"
 *             destination:
 *               type: string
 *               example: Client Office, Abuja
 *             reason:
 *               type: string
 *               example: Official field assignment
 *             status:
 *               type: string
 *               example: PENDING
 *
 *     SubmitExitRequestError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Invalid request
 */

/**
 * @swagger
 * /exits/assets/{id}/exit/request:
 *   post:
 *     summary: Submit an asset exit request
 *     description: >
 *       Submits a request to take an assigned asset outside the office.
 *       Staff submit requests for themselves, while Administrators may submit
 *       requests on behalf of another staff member. Administrator requests
 *       are automatically approved.
 *     tags: [AssetExitRequests]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the asset for which the exit request is submitted
 *         example: "770e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitExitRequestInput'
 *           example:
 *             taken_by_user_id: "880e8400-e29b-41d4-a716-446655440000"
 *             destination: Client Office, Abuja
 *             reason: Official field assignment
 *             expected_return_date: "2026-10-25T17:00:00.000Z"
 *             notes: Asset required for an official field visit
 *     responses:
 *       201:
 *         description: Exit request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestResponse'
 *             examples:
 *               staffRequest:
 *                 summary: Staff request submitted
 *                 value:
 *                   success: true
 *                   message: Checkout request submitted successfully
 *                   data:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                     taken_by_user_id: "880e8400-e29b-41d4-a716-446655440000"
 *                     destination: Client Office, Abuja
 *                     reason: Official field assignment
 *                     status: PENDING
 *               administratorRequest:
 *                 summary: Administrator request automatically approved
 *                 value:
 *                   success: true
 *                   message: Administrator checkout request created and automatically approved
 *                   data:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     asset_id: "770e8400-e29b-41d4-a716-446655440000"
 *                     taken_by_user_id: "880e8400-e29b-41d4-a716-446655440000"
 *                     destination: Client Office, Abuja
 *                     reason: Official field assignment
 *                     status: APPROVED
 *       400:
 *         description: Invalid input or asset cannot be checked out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestError'
 *       401:
 *         description: Authentication required or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestError'
 *       403:
 *         description: User is not authorized to request checkout of this asset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestError'
 *       404:
 *         description: Asset or requested staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestError'
 *       409:
 *         description: Asset is not available for checkout or a conflicting request exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitExitRequestError'
*/

//user requests to exit an asset
router.post( "/assets/:id/exit/request",submitRequest);

module.exports = router;