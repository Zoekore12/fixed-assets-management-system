const express = require("express");

const {createSecurityStation,getAllSecurityStations} = require("../controllers/securityStationController");


const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


const router = express.Router();
/**
 * @swagger
 * /station:
 *   post:
 *     summary: Create a security station
 *     description: >
 *       Creates a security station and associates it with a building.
 *       Only Administrators are authorized to create security stations.
 *       The station code is automatically converted to uppercase.
 *     tags: [Security Stations]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - station_code
 *               - name
 *               - building_id
 *             properties:
 *               station_code:
 *                 type: string
 *                 description: Unique code identifying the security station
 *                 example: SEC-001
 *               name:
 *                 type: string
 *                 description: Name of the security station
 *                 example: Main Entrance Security Station
 *               building_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the building associated with the station
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the security station is active
 *                 example: true
 *     responses:
 *       201:
 *         description: Security station created successfully
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
 *                   example: Security station created and assigned to building
 *                 station:
 *                   type: object
 *                   description: Created security station details
 *                   example:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     station_code: SEC-001
 *                     name: Main Entrance Security Station
 *                     building_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     is_active: true
 *       400:
 *         description: Invalid or missing station code, name, building UUID, or active status
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
 *                   example: Station code is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can create security stations
 *       409:
 *         description: A security station with this code already exists
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
 *                   example: This station code already exists
 *       500:
 *         description: Internal server error
*/
router.post("/station",authenticate,authorizeRoles("Administrator"),createSecurityStation);
/**
 * @swagger
 * /station:
 *   get:
 *     summary: Get all security stations
 *     description: >
 *       Retrieves all security stations, including their associated
 *       building information, active status, and creation details.
 *       Only Administrators can access this endpoint.
 *     tags: [Security Stations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Security stations retrieved successfully
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
 *                   example: Security stations retrieved successfully
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 stations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "a1b2c3d4-e5f6-4789-a012-b3456789cdef"
 *                       station_code:
 *                         type: string
 *                         example: "SEC-001"
 *                       name:
 *                         type: string
 *                         example: "Main Entrance"
 *                       building_id:
 *                         type: string
 *                         format: uuid
 *                         example: "b1c2d3e4-f5a6-4789-b012-c3456789def0"
 *                       building_name:
 *                         type: string
 *                         example: "Head Office"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-10-24T10:00:00.000Z"
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-10-24T10:00:00.000Z"
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - Administrator role required
 *       500:
 *         description: Internal server error
*/
router.get("/station",authenticate,authorizeRoles("Administrator"), getAllSecurityStations);

module.exports = router;