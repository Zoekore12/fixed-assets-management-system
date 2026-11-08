const express = require("express");

const {create,getAll,getOne,update,remove,} = require("../controllers/buildingController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Manage ministry buildings and their details
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BuildingInput:
 *       type: object
 *       required:
 *         - name
 *         - code
 *       properties:
 *         name:
 *           type: string
 *           example: Headquarters Building
 *         code:
 *           type: string
 *           description: Unique building code. The API converts it to uppercase.
 *           example: HQ-001
 *         address:
 *           type: string
 *           nullable: true
 *           example: Central Business District, Abuja
 *         description:
 *           type: string
 *           nullable: true
 *           example: Main ministry administrative building
 *
 *     Building:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         name:
 *           type: string
 *           example: Headquarters Building
 *         code:
 *           type: string
 *           example: HQ-001
 *         address:
 *           type: string
 *           nullable: true
 *           example: Central Business District, Abuja
 *         description:
 *           type: string
 *           nullable: true
 *           example: Main ministry administrative building
*/

/**
 * @swagger
 * /buildings:
 *   get:
 *     summary: Get all buildings
 *     description: Retrieves all buildings. Any authenticated user can access this endpoint.
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Buildings retrieved successfully
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
 *                 buildings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Building'
 *       401:
 *         description: Authentication required or invalid credentials
 *       500:
 *         description: Internal server error
*/

// Anyone authenticated can view buildings
router.get("/", authenticate, getAll);
/**
 * @swagger
 * /buildings/{id}:
 *   get:
 *     summary: Get a building by ID
 *     description: Retrieves the details of a specific building. Any authenticated user can access this endpoint.
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Building UUID
 *     responses:
 *       200:
 *         description: Building retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 building:
 *                   $ref: '#/components/schemas/Building'
 *       401:
 *         description: Authentication required or invalid credentials
 *       404:
 *         description: Building not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, getOne);
/**
 * @swagger
 * /buildings:
 *   post:
 *     summary: Create a building
 *     description: Creates a new ministry building. Administrator access is required.
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingInput'
 *           example:
 *             name: Headquarters Building
 *             code: HQ-001
 *             address: Central Business District, Abuja
 *             description: Main ministry administrative building
 *     responses:
 *       201:
 *         description: Building created successfully
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
 *                   example: Building created successfully
 *                 building:
 *                   $ref: '#/components/schemas/Building'
 *       400:
 *         description: Building name and code are required
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       409:
 *         description: Building code already exists
 *       500:
 *         description: Internal server error
*/
// Only administrators can create/update/delete buildings
router.post("/",authenticate,authorizeRoles("Administrator"),create);
/**
 * @swagger
 * /buildings/{id}:
 *   put:
 *     summary: Update a building
 *     description: Updates an existing building. Administrator access is required.
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Building UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingInput'
 *           example:
 *             name: Updated Headquarters Building
 *             code: HQ-001
 *             address: Central Business District, Abuja
 *             description: Updated administrative building details
 *     responses:
 *       200:
 *         description: Building updated successfully
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
 *                   example: Building updated successfully
 *                 building:
 *                   $ref: '#/components/schemas/Building'
 *       400:
 *         description: Building name and code are required
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Building not found
 *       409:
 *         description: Building code already exists
 *       500:
 *         description: Internal server error
*/
router.put("/:id",authenticate,authorizeRoles("Administrator"),update);
/**
 * @swagger
 * /buildings/{id}:
 *   delete:
 *     summary: Delete a building
 *     description: Deletes a building if no other database record references it. Administrator access is required.
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Building UUID
 *     responses:
 *       200:
 *         description: Building deleted successfully
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
 *                   example: Building deleted successfully
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Building not found
 *       409:
 *         description: Building cannot be deleted because it is referenced by another record
 *       500:
 *         description: Internal server error
*/
router.delete("/:id",authenticate,authorizeRoles("Administrator"),remove);

module.exports = router;