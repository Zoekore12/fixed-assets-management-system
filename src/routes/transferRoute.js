const express = require("express");

const {createTransfer,approveTransferRequest,assignMover,startTransferRequest,completeTransferRequest,confirmMoverPossessionRequest,getAllTransfers,getPendingTransfers,getTransferById,getMyMovements,getMyMovementById,}= require("../controllers/transferController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


const router = express.Router();

/**
 * @swagger
 * /transfers/transfers:
 *   post:
 *     summary: Create an asset transfer request
 *     description: >
 *       Creates a request to transfer an asset to another building,
 *       department, or unit. The authenticated user is recorded as the requester.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - asset_id
 *               - reason
 *             properties:
 *               asset_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the asset to transfer
 *                 example: "660e8400-e29b-41d4-a716-446655440000"
 *               to_building_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the destination building
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               to_department_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the destination department
 *                 example: "770e8400-e29b-41d4-a716-446655440000"
 *               to_unit_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the destination unit
 *                 example: "880e8400-e29b-41d4-a716-446655440000"
 *               reason:
 *                 type: string
 *                 description: Reason for transferring the asset
 *                 example: Reassignment to another department
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 description: Additional transfer notes
 *                 example: Transfer requested for official duties
 *     responses:
 *       201:
 *         description: Transfer request created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Transfer request created successfully
 *               movement:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 movement_status: PENDING
 *       400:
 *         description: Invalid transfer request
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
*/
router.post("/transfers",authenticate,createTransfer);
/**
 * @swagger
 * /transfers/transfers:
 *   get:
 *     summary: Get asset movements accessible to the logged-in user
 *     description: >
 *       Retrieves asset movement records according to the authenticated
 *       user's role and organizational scope.
 *
 *       - Administrator: can view all movements.
 *       - HOD: can view movements involving their department.
 *       - HOU: can view movements involving their unit.
 *       - Security staff: can view movements relevant to their assigned
 *         security station or building.
 *       - General staff: can view movements associated with them.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Asset movements retrieved successfully
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
 *                 movements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetTransfers'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to retrieve movements
*/
router.get("/transfers", authenticate, getMyMovements);
/**
 * @swagger
 * /transfers/transfers/{id}:
 *   get:
 *     summary: Get an accessible asset movement by ID
 *     description: >
 *       Retrieves a single movement record only if it is visible
 *       to the authenticated user under their role and organizational scope.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the asset movement
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Movement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 movement:
 *                   $ref: '#/components/schemas/AssetTransfers'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Movement not found or not accessible to the user
 *       500:
 *         description: Failed to retrieve movement
*/
router.get("/transfers/:id", authenticate, getMyMovementById);
/**
 * @swagger
 * /transfers/transfers/{id}/approve:
 *   patch:
 *     summary: Approve a transfer request
 *     description: >
 *       Approves a pending asset transfer request.
 *       Only Administrators, HODs, and HOUs are authorized by the route middleware.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Transfer approved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Transfer approved successfully
 *               movement:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 movement_status: APPROVED
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized to approve transfers
 *       404:
 *         description: Transfer request not found
 *       500:
 *         description: Internal server error
*/
router.patch("/transfers/:id/approve",authenticate,authorizeRoles("Administrator", "HOD", "HOU"),approveTransferRequest);
/**
 * @swagger
 * /transfers/transfers/{id}/assign-mover:
 *   patch:
 *     summary: Assign a mover to a transfer
 *     description: >
 *       Assigns a user responsible for physically moving the asset.
 *       Only Administrators, HODs, and HOUs are authorized by the route middleware.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moved_by
 *             properties:
 *               moved_by:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the user assigned to move the asset
 *                 example: "770e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Mover assigned successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Mover assigned successfully
 *               movement:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: moved_by is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized to assign movers
 *       500:
 *         description: Internal server error
*/
router.patch("/transfers/:id/assign-mover",authenticate,authorizeRoles("Administrator","HOD", "HOU"),assignMover);
/**
 * @swagger
 * /transfers/transfers/{id}/in-transit:
 *   patch:
 *     summary: Start an asset transfer
 *     description: >
 *       Marks the transfer as in transit. The authenticated user is passed
 *       to the service as the mover.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Transfer is now in transit
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Transfer is now in transit
 *               movement:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 movement_status: IN_TRANSIT
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Transfer cannot be started in its current state
 *       403:
 *         description: User is not permitted to start this transfer
 *       404:
 *         description: Transfer request not found
 *       500:
 *         description: Internal server error
*/
router.patch("/transfers/:id/in-transit",authenticate,startTransferRequest);
/**
 * @swagger
 * /transfers/transfers/{id}/complete:
 *   patch:
 *     summary: Complete an asset transfer
 *     description: >
 *       Completes a transfer using the authenticated user as the receiver.
 *       The service determines whether the transfer meets the required
 *       completion conditions.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Transfer completed successfully
 *               data:
 *                 movement:
 *                   id: "660e8400-e29b-41d4-a716-446655440000"
 *                   movement_status: COMPLETED
 *       400:
 *         description: Transfer cannot be completed in its current state
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized to complete the transfer
 *       404:
 *         description: Transfer request not found
 *       500:
 *         description: Failed to complete transfer
*/
router.patch("/transfers/:id/complete",authenticate,completeTransferRequest);
/**
 * @swagger
 * /transfers/transfers/{id}/confirm-possession:
 *   patch:
 *     summary: Confirm possession of an asset
 *     description: >
 *       Records confirmation from the authenticated mover that they have
 *       possession of the asset for the transfer.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Mover confirmed possession of the asset
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Mover confirmed possession of the asset
 *               movement:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Possession cannot be confirmed for the current transfer state
 *       403:
 *         description: User is not authorized to confirm possession
 *       404:
 *         description: Transfer request not found
 *       500:
 *         description: Internal server error
*/
router.patch("/transfers/:id/confirm-possession",authenticate,confirmMoverPossessionRequest);
/**
 * @swagger
 * /transfers/transfers:
 *   get:
 *     summary: Get all asset transfers
 *     description: Retrieves all asset movement records. Only Administrators are authorized.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Transfers retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 1
 *               transfers:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   movement_type: TRANSFER
 *                   movement_status: PENDING
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can retrieve all transfers
 *       500:
 *         description: Failed to retrieve transfers
*/
router.get("/transfers",authenticate,authorizeRoles("Administrator"),getAllTransfers);
/**
 * @swagger
 * /transfers/transfers/pending:
 *   get:
 *     summary: Get pending transfer requests
 *     description: Retrieves transfer requests awaiting processing. Only Administrators are authorized.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Pending transfers retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 1
 *               transfers:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   movement_type: TRANSFER
 *                   movement_status: PENDING
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can retrieve pending transfers
 *       500:
 *         description: Failed to retrieve pending transfers
*/
router.get("/transfers/pending",authenticate,authorizeRoles("Administrator"),getPendingTransfers);
/**
 * @swagger
 * /transfers/transfers/{id}:
 *   get:
 *     summary: Get a transfer by ID
 *     description: Retrieves an individual asset transfer by its UUID. Only Administrators are authorized.
 *     tags: [Asset Transfers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer request
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Transfer retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               transfer:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 movement_type: TRANSFER
 *                 movement_status: PENDING
 *       400:
 *         description: Invalid transfer UUID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can retrieve a transfer by ID
 *       404:
 *         description: Transfer not found
 *       500:
 *         description: Failed to retrieve transfer
*/
router.get("/transfers/:id",authenticate,authorizeRoles("Administrator"),getTransferById);






module.exports = router;