const express = require("express");

const {
  checkout,
} = require("../controllers/checkoutController");

const authenticate = require("../middleware/authMiddleware");

const authorizeStaffTypes = require(
  "../middleware/staffTypeMiddleware"
);

const router = express.Router();

router.use(authenticate);


/**
 * @swagger
 * tags:
 *   name: Checkout
 *   description: Asset checkout and exit operations
 */

/**
 * @swagger
 * /checkout/assets/{id}/exit/checkout:
 *   post:
 *     summary: Check out an asset from the office
 *     description: >
 *       Records the checkout of an asset that is leaving the office.
 *       Accessible to Staff members with the SECURITY subtype.
 *       The authenticated user's ID is recorded as the security officer.
 *     tags: [Checkout]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the asset being checked out
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Asset checked out successfully
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
 *                   example: Asset checked out successfully
 *                 exit:
 *                   type: object
 *                   description: Created or updated asset exit record
 *                   additionalProperties: true
 *                 asset:
 *                   type: object
 *                   description: Asset details after checkout
 *                   additionalProperties: true
 *             example:
 *               success: true
 *               message: Asset checked out successfully
 *               exit:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 status: OUT
 *               asset:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 asset_tag: "MIST-000002"
 *                 status: OUT
 *       400:
 *         description: Invalid asset ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutError'
 *             example:
 *               success: false
 *               message: Invalid asset ID
 *       401:
 *         description: Authentication required or invalid
 *       403:
 *         description: User is not authorized to check out assets
 *       404:
 *         description: Asset or eligible exit record not found
 *       409:
 *         description: Asset cannot be checked out in its current state
 *       500:
 *         description: Internal server error
*/

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckoutError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Internal server error
*/
router.post(
  "/assets/:id/exit/checkout",
    (req, res, next) => {
    if (req.user.role === "Administrator") {
      return next();
    }

    return authorizeStaffTypes("SECURITY")(req, res, next);
  },
  checkout
);

module.exports = router;