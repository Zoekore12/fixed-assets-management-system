const express = require("express");
const { checkin } = require("../controllers/checkinController");
const authenticate = require("../middleware/authMiddleware");
const authorizeStaffTypes = require("../middleware/staffTypeMiddleware");

const router = express.Router();

router.use(authenticate);
/**
 * @swagger
 * tags:
 *   name: Check-in
 *   description: Asset return and check-in operations
 */

/**
 * @swagger
 * /checkin/assets/{id}/exit/return:
 *   post:
 *     summary: Check in a returned asset
 *     description: >
 *       Records the return of an asset that was previously checked out.
 *       Accessible to Staff members with the SECURITY subtype.
 *     tags: [Check-in]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the asset being returned
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Asset returned successfully
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
 *                   example: Asset returned successfully
 *                 exit:
 *                   type: object
 *                   description: Details of the asset exit record after check-in
 *                   additionalProperties: true
 *                 asset:
 *                   type: object
 *                   description: Asset details after the return has been recorded
 *                   additionalProperties: true
 *       400:
 *         description: Invalid asset UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinError'
 *             example:
 *               success: false
 *               message: Invalid asset ID
 *       401:
 *         description: Authentication required or invalid
 *       403:
 *         description: User is not authorized to check in assets
 *       404:
 *         description: Asset or exit record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinError'
 *       409:
 *         description: Asset cannot be checked in because of its current state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckinError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Internal server error
*/
// TEMPORARY: Allow Administrator and Security staff to confirm asset returns.
router.post("/assets/:id/exit/return",
  (req, res, next) => {
    if (req.user.role === "Administrator") {
      return next();
    }

    return authorizeStaffTypes("SECURITY")(req, res, next);
  },
  checkin
);

module.exports = router;