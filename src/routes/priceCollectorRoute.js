
const express = require("express");

const {
  collectPrices,
} = require("../controllers/priceCollectorController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes require authentication.
router.use(authenticate);
/**
 * @swagger
 * /valuations/collect:
 *   post:
 *     summary: Collect market prices from Apify
 *     description: >
 *       Collects product prices from online marketplaces using Apify and saves
 *       the collected market-price observations against an existing asset valuation.
 *       Only Administrators are authorized to access this endpoint.
 *     tags: [Valuations]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - valuationId
 *               - searchTerm
 *             properties:
 *               valuationId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the valuation for which prices will be collected
 *                 example: "660e8400-e29b-41d4-a716-446655440000"
 *               searchTerm:
 *                 type: string
 *                 description: Product name or model to search for
 *                 example: "Dell Latitude 5420 laptop 16GB RAM 256GB SSD"
 *     responses:
 *       201:
 *         description: Apify collection completed successfully
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
 *                   example: Apify collection completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     savedCount:
 *                       type: integer
 *                       example: 3
 *                     failedCount:
 *                       type: integer
 *                       example: 0
 *       207:
 *         description: Collection completed with failures or no observations were saved
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
 *                   example: No product observations were saved
 *                 data:
 *                   type: object
 *                   properties:
 *                     savedCount:
 *                       type: integer
 *                       example: 0
 *                     failedCount:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Required fields are missing or invalid
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
 *                   example: valuationId and searchTerm are required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not have Administrator permission
 *       500:
 *         description: Failed to collect market prices from Apify
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
 *                   example: Failed to collect market prices from Apify
*/
// Only Administrators can trigger price collection.
router.post("/collect",authorizeRoles("Administrator"),collectPrices);

module.exports = router;
