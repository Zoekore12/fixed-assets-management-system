const express = require("express");

const {
  create,
  getAll,
  getOne,
  update,
  remove,
} = require("../controllers/unitController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();
/**
 * @swagger
 * /units:
 *   get:
 *     summary: Get all units
 *     description: Retrieves all units, optionally filtered by department.
 *     tags: [Units]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: department_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter units by department UUID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Units retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 1
 *               units:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   department_id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: Information Technology
 *                   code: IT-001
 *                   description: Information Technology Unit
 *       400:
 *         description: Invalid department UUID
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
*/
// Authenticated users can view units
router.get("/", authenticate, getAll);
/**
 * @swagger
 * /units/{id}:
 *   get:
 *     summary: Get a unit by ID
 *     description: Retrieves a single unit using its UUID.
 *     tags: [Units]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the unit
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Unit retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               unit:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 department_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 name: Information Technology
 *                 code: IT-001
 *                 description: Information Technology Unit
 *       400:
 *         description: Invalid unit ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Unit not found
 *       500:
 *         description: Internal server error
*/
router.get("/:id", authenticate, getOne);
/**
 * @swagger
 * /units:
 *   post:
 *     summary: Create a unit
 *     description: >
 *       Creates a unit under an existing department.
 *       Only Administrators are authorized to create units.
 *       The unit code is automatically converted to uppercase.
 *     tags: [Units]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department_id
 *               - name
 *               - code
 *             properties:
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the department to which the unit belongs
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               name:
 *                 type: string
 *                 description: Name of the unit
 *                 example: Information Technology
 *               code:
 *                 type: string
 *                 description: Unique unit code within the department
 *                 example: IT-001
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Optional description of the unit
 *                 example: Handles IT infrastructure and technical support
 *     responses:
 *       201:
 *         description: Unit created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Unit created successfully
 *               unit:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 department_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 name: Information Technology
 *                 code: IT-001
 *                 description: Handles IT infrastructure and technical support
 *       400:
 *         description: Invalid or missing department ID, unit name, or unit code
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: A valid department_id, unit name, and unit code are required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can create units
 *       404:
 *         description: Department not found
 *       409:
 *         description: Unit code already exists in the department
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: This unit code already exists in that department
 *       500:
 *         description: Internal server error
*/
// Only Administrators can manage units
router.post("/",authenticate,authorizeRoles("Administrator"),create);
/**
 * @swagger
 * /units/{id}:
 *   put:
 *     summary: Update a unit
 *     description: >
 *       Updates a unit's department, name, code, and description.
 *       Only Administrators are authorized to update units.
 *       The unit code is automatically converted to uppercase.
 *     tags: [Units]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the unit to update
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department_id
 *               - name
 *               - code
 *             properties:
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the department
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               name:
 *                 type: string
 *                 description: Updated unit name
 *                 example: Technical Support
 *               code:
 *                 type: string
 *                 description: Updated unit code
 *                 example: TS-001
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Updated unit description
 *                 example: Provides technical support to staff
 *     responses:
 *       200:
 *         description: Unit updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Unit updated successfully
 *               unit:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 department_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 name: Technical Support
 *                 code: TS-001
 *                 description: Provides technical support to staff
 *       400:
 *         description: Invalid unit ID or request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can update units
 *       404:
 *         description: Unit or department not found
 *       409:
 *         description: Unit code already exists in the department
 *       500:
 *         description: Internal server error
*/
router.put("/:id",authenticate,authorizeRoles("Administrator"),update);
/**
 * @swagger
 * /units/{id}:
 *   delete:
 *     summary: Delete a unit
 *     description: >
 *       Deletes a unit by its UUID.
 *       A unit cannot be deleted if another database record references it.
 *       Only Administrators are authorized to delete units.
 *     tags: [Units]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the unit to delete
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Unit deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Unit deleted successfully
 *       400:
 *         description: Invalid unit ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Administrators can delete units
 *       404:
 *         description: Unit not found
 *       409:
 *         description: Unit cannot be deleted because it is referenced by another record
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Unit cannot be deleted because it is referenced by another record
 *       500:
 *         description: Internal server error
*/
router.delete("/:id",authenticate,authorizeRoles("Administrator"),remove);

module.exports = router;