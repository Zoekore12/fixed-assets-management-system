const express = require("express");

const {
  create,
  addObservation,
  recalculate,
  getAll,
  getOne,
  getMyValuations,
} = require("../controllers/valuationController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /valuation:
 *   get:
 *     summary: Get all asset valuations
 *     description: Retrieves all asset valuations recorded in the system.
 *     tags: [Asset Valuations]
 *     responses:
 *       200:
 *         description: Valuations retrieved successfully
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
 *                 valuations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Asset valuation record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "7b2f8b91-3d12-4a87-a0f1-123456789abc"
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                         example: "8c3f9c12-4e23-5b98-b1a2-234567890bcd"
 *                       original_purchase_cost:
 *                         type: number
 *                         example: 850000
 *                       currency:
 *                         type: string
 *                         example: "NGN"
 *                       valuation_status:
 *                         type: string
 *                         enum: [PENDING, COMPLETED, REVIEW_REQUIRED, FAILED]
 *                         example: "PENDING"
 *       500:
 *         description: Internal server error
*/
// View valuations
router.get("/", getAll);
/**
 * @swagger
 * /valuation/my-valuations:
 *   get:
 *     summary: Get my asset valuations
 *     description: Retrieves all asset valuations created by the authenticated user.
 *     tags: [Asset Valuations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Valuations retrieved successfully
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
 *                 valuations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Asset valuation record
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "7b2f8b91-3d12-4a87-a0f1-123456789abc"
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                         example: "8c3f9c12-4e23-5b98-b1a2-234567890bcd"
 *                       original_purchase_cost:
 *                         type: number
 *                         example: 850000
 *                       currency:
 *                         type: string
 *                         example: "NGN"
 *                       valuation_status:
 *                         type: string
 *                         enum: [PENDING, COMPLETED, REVIEW_REQUIRED, FAILED]
 *                         example: "PENDING"
 *       500:
*         description: Internal server error
*/
router.get("/my-valuations", authenticate, authorizeRoles("HOD", "HOU", "Staff"), getMyValuations);
/**
 * @swagger
 * /valuation/{id}:
 *   get:
 *     summary: Get a valuation by ID
 *     description: Retrieves a specific asset valuation using its valuation ID.
 *     tags: [Asset Valuations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the valuation
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "7b2f8b91-3d12-4a87-a0f1-123456789abc"
 *     responses:
 *       200:
 *         description: Valuation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 valuation:
 *                   type: object
 *                   description: Retrieved valuation record and any related data returned by the service
 *       400:
 *         description: Invalid valuation ID, if validated by the service
 *       404:
 *         description: Valuation not found
 *       500:
 *         description: Internal server error
*/
router.get("/:id", getOne);
/**
 * @swagger
 * /valuation:
 *   post:
 *     summary: Create an asset valuation
 *     description: >
 *       Creates a valuation record for an asset. The asset ID must be provided
 *       in the request body. Only Administrators are authorized to create valuations.
 *     tags: [Asset Valuations]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *             properties:
 *               assetId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the asset to value
 *                 example: "8c3f9c12-4e23-5b98-b1a2-234567890bcd"
 *     responses:
 *       201:
 *         description: Valuation created successfully
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
 *                   example: Valuation created successfully
 *                 valuation:
 *                   type: object
 *                   description: Newly created valuation record
 *       400:
 *         description: Asset ID is missing or invalid
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: assetId is required
 *       401:
 *         description: Authentication required, if enforced by the application
 *       403:
 *         description: Only Administrators can create valuations
 *       404:
 *         description: Asset not found
 *       409:
 *         description: Valuation cannot be created because of a conflict
 *       500:
 *         description: Internal server error
*/
// Administrator valuation management
router.post( "/",authorizeRoles("Administrator"),create);
/**
 * @swagger
 * /valuation/{id}/observations:
 *   post:
 *     summary: Add a market-price observation
 *     description: >
 *       Records a market listing as an observation for an existing valuation.
 *       Only Administrators are authorized to add market-price observations.
 *     tags: [Asset Valuations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the valuation
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "7b2f8b91-3d12-4a87-a0f1-123456789abc"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceName:
 *                 type: string
 *                 description: Name of the website or market source
 *                 example: "Jumia Nigeria"
 *               productTitle:
 *                 type: string
 *                 description: Title of the listed product
 *                 example: "Dell Latitude 5420 Laptop"
 *               productUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of the product listing
 *                 example: "https://www.jumia.com.ng/"
 *               listingUrl:
 *                 type: string
 *                 format: uri
 *                 description: Alternative field for the product listing URL
 *                 example: "https://www.jumia.com.ng/"
 *               listedPrice:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 description: Listed market price
 *                 example: 450000
 *               price:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 description: Alternative field for the listed price
 *                 example: 450000
 *               currency:
 *                 type: string
 *                 example: "NGN"
 *               brand:
 *                 type: string
 *                 example: "Dell"
 *               model:
 *                 type: string
 *                 example: "Latitude 5420"
 *               availabilityStatus:
 *                 type: string
 *                 enum: [AVAILABLE, UNAVAILABLE, UNKNOWN]
 *                 example: "AVAILABLE"
 *               isComparable:
 *                 type: boolean
 *                 description: Indicates whether the listing is comparable to the asset being valued
 *                 example: true
 *               exclusionReason:
 *                 type: string
 *                 description: Reason for excluding a listing from valuation calculations
 *                 example: "Different processor specification"
 *     responses:
 *       201:
 *         description: Market-price observation recorded successfully
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
 *                   example: Market-price observation recorded successfully
 *                 observation:
 *                   type: object
 *                   description: Newly recorded market-price observation
 *       400:
 *         description: Invalid observation data
 *       401:
 *         description: Authentication required, if enforced by the application
 *       403:
 *         description: Only Administrators can add market-price observations
 *       404:
 *         description: Valuation not found
 *       500:
 *         description: Internal server error
*/
router.post("/:id/observations",authorizeRoles("Administrator"),addObservation);
/**
 * @swagger
 * /valuation/{id}/recalculate:
 *   post:
 *     summary: Recalculate an asset's market value
 *     description: >
 *       Recalculates a valuation using the market-price observations associated
 *       with it. The thresholdPercent field is optional and defaults to 30.
 *       Only Administrators are authorized to recalculate valuations.
 *     tags: [Asset Valuations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the valuation to recalculate
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "7b2f8b91-3d12-4a87-a0f1-123456789abc"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               thresholdPercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 30
 *                 description: Percentage threshold used by the valuation calculation
 *                 example: 30
 *     responses:
 *       200:
 *         description: Valuation calculation completed
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
 *                   example: Valuation calculation completed
 *                 valuation:
 *                   type: object
 *                   description: Updated valuation details, depending on the service response
 *                 valueChange:
 *                   type: number
 *                   example: -100000
 *                 percentageChange:
 *                   type: number
 *                   example: -11.76
 *                 valuationType:
 *                   type: string
 *                   enum: [DEPRECIATED, APPRECIATED, UNCHANGED]
 *                   example: DEPRECIATED
 *       400:
 *         description: Invalid threshold or insufficient valid market-price observations
 *       401:
 *         description: Authentication required, if enforced by the application
 *       403:
 *         description: Only Administrators can recalculate valuations
 *       404:
 *         description: Valuation not found
 *       500:
 *         description: Internal server error
*/
router.post("/:id/recalculate",authorizeRoles("Administrator"),recalculate);

module.exports = router;
