
const express = require("express");

const {
  getObservations,
  reviewObservation,
} = require("../controllers/priceObservationController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("Administrator"));
/**
 * @swagger
 * /observations:
 *   get:
 *     summary: Get market price observations
 *     description: >
 *       Retrieves market price observations with optional filtering by valuation ID
 *       and observation status. Results are paginated using limit and offset.
 *       The default status is PENDING, the default limit is 50, and the maximum
 *       limit is 100.
 *     tags: [Market Price Observations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: valuationId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the valuation to filter observations by
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           default: PENDING
 *         description: Observation status filter. Defaults to PENDING.
 *         example: PENDING
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of observations to return
 *         example: 50
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of observations to skip
 *         example: 0
 *     responses:
 *       200:
 *         description: Market price observations retrieved successfully
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
 *                   description: Number of observations returned in this response
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "660e8400-e29b-41d4-a716-446655440000"
 *                       valuation_id:
 *                         type: string
 *                         format: uuid
 *                         example: "770e8400-e29b-41d4-a716-446655440000"
 *                       source_name:
 *                         type: string
 *                         example: "jumia.com.ng"
 *                       product_title:
 *                         type: string
 *                         example: "Dell Latitude 5420 Laptop"
 *                       product_url:
 *                         type: string
 *                         format: uri
 *                         example: "https://www.jumia.com.ng/"
 *                       listed_price:
 *                         type: number
 *                         example: 450000
 *                       currency:
 *                         type: string
 *                         example: NGN
 *                       availability_status:
 *                         type: string
 *                         enum: [AVAILABLE, UNAVAILABLE, UNKNOWN]
 *                         example: AVAILABLE
 *                       is_comparable:
 *                         type: boolean
 *                         example: false
 *                       observed_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-10-21T09:30:00.000Z"
 *       500:
 *         description: Failed to retrieve market price observations
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
 *                   example: Failed to retrieve market price observations
 */


router.get("/", getObservations);
/**
 * @swagger
 * /observations/{id}/review:
 *   patch:
 *     summary: Review a market price observation
 *     description: >
 *       Approves or rejects a collected market price observation.
 *       Approving marks the listing as comparable for valuation purposes.
 *       Rejecting marks it as non-comparable and requires a rejection reason.
 *     tags: [Market Price Observations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the market price observation to review
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *                 description: Decision to approve or reject the observation
 *                 example: APPROVE
 *               reason:
 *                 type: string
 *                 description: Required when decision is REJECT
 *                 example: Product specifications do not match the asset
 *           examples:
 *             approveObservation:
 *               summary: Approve a comparable listing
 *               value:
 *                 decision: APPROVE
 *             rejectObservation:
 *               summary: Reject a non-comparable listing
 *               value:
 *                 decision: REJECT
 *                 reason: Product specifications do not match the asset
 *     responses:
 *       200:
 *         description: Market price observation reviewed successfully
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
 *                   example: Market price observation approved
 *                 data:
 *                   type: object
 *                   description: Updated market price observation returned by the model
 *                   example:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     is_comparable: true
 *                     exclusion_reason: null
 *       400:
 *         description: Invalid decision or missing rejection reason
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
 *                   example: decision must be APPROVE or REJECT
 *       401:
 *         description: Authentication required, if enforced by the route middleware
 *       403:
 *         description: User does not have permission to review market price observations, if enforced by middleware
 *       404:
 *         description: Market price observation not found, if handled by the model or error handler
 *       500:
 *         description: Failed to review market price observation
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
 *                   example: Failed to review market price observation
*/
router.patch("/:id/review", reviewObservation);

module.exports = router;
