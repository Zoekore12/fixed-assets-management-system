const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeStaffTypes = require("../middleware/staffTypeMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {scanTransferAssetRequest,verifyTransferExitRequest,scanTransferCheckinRequest,} = require("../controllers/transferController");
/**
 * @swagger
 * /scan/scan/{assetTag}:
 *   get:
 *     summary: Scan an asset for an authorized transfer
 *     description: >
 *       Scans an asset tag and checks whether an authorized transfer exists
 *       for the asset at the authenticated security officer's station.
 *       Access is restricted to Staff users with the SECURITY staff type.
 *     tags: [Security Transfer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: assetTag
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique tag assigned to the asset being scanned
 *         example: MIST-000002
 *     responses:
 *       200:
 *         description: Active authorized transfer found
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
 *                   example: Active transfer found
 *                 authorized:
 *                   type: boolean
 *                   example: true
 *                 movement:
 *                   type: object
 *                   description: Transfer movement details returned by the service
 *                   example:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     movement_type: TRANSFER
 *                     movement_status: PENDING
 *       400:
 *         description: Asset tag is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 authorized:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Asset tag is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized or no security station is associated with the session
 *       404:
 *         description: No eligible transfer found for the scanned asset, if returned by the service
 *       500:
 *         description: Failed to scan asset transfer
*/
router.get("/scan/:assetTag",authenticate,authorizeRoles("Staff"),authorizeStaffTypes("SECURITY"),scanTransferAssetRequest);
/**
 * @swagger
 * /scan/scan/{id}/verify-exit:
 *   patch:
 *     summary: Verify asset transfer exit
 *     description: >
 *       Verifies the exit of an asset involved in a transfer.
 *       Only authenticated Staff users with the SECURITY staff type can
 *       perform this operation. The security officer's identity and station
 *       are obtained from the authenticated session.
 *     tags: [Security Transfer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transfer movement to verify for exit
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Transfer exit verified successfully
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
 *                   example: Transfer exit verified successfully
 *                 movement:
 *                   type: object
 *                   description: Updated transfer movement details
 *       400:
 *         description: Transfer exit verification failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized to verify transfer exits
 *       404:
 *         description: Transfer movement not found, if handled by the controller or service
 *       500:
 *         description: Server error while verifying transfer exit
*/
router.patch("/scan/:id/verify-exit",authenticate,authorizeRoles("Staff"),authorizeStaffTypes("SECURITY"),verifyTransferExitRequest);
/**
 * @swagger
 * /scan/scan-in/{assetTag}:
 *   patch:
 *     summary: Check in a transferred asset at the destination building
 *     description: >
 *       Scans an asset tag and records its arrival at the destination building
 *       using the authenticated security officer's assigned station.
 *       The response includes the updated movement, asset, and destination station.
 *       Access is restricted to Staff users with the SECURITY staff type.
 *     tags: [Security Transfer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: assetTag
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique tag assigned to the transferred asset
 *         example: MIST-000002
 *     responses:
 *       200:
 *         description: Asset checked in at the destination building successfully
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
 *                   example: Asset checked in at destination building
 *                 movement:
 *                   type: object
 *                   description: Updated transfer movement details
 *                 asset:
 *                   type: object
 *                   description: Asset details after check-in
 *                 station:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "770e8400-e29b-41d4-a716-446655440000"
 *                     station_code:
 *                       type: string
 *                       example: SEC-001
 *                     name:
 *                       type: string
 *                       example: Main Building Security
 *                     building_id:
 *                       type: string
 *                       format: uuid
 *                       example: "880e8400-e29b-41d4-a716-446655440000"
 *                     building_name:
 *                       type: string
 *                       example: Ministry Headquarters
 *       400:
 *         description: Asset tag is missing or check-in failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Asset tag is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized or no security station is associated with the session
 *       404:
 *         description: Asset or eligible transfer not found, if returned by the service
 *       500:
 *         description: Server error during destination building check-in
*/
router.patch("/scan-in/:assetTag",authenticate,authorizeRoles("Staff"),authorizeStaffTypes("SECURITY"),scanTransferCheckinRequest);




module.exports = router;