const express = require("express");

const {create,getAll,getOne,update,remove,} = require("../controllers/departmentController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management within buildings
*/

/**
 * @swagger
 * components:
 *   schemas:
 *     DepartmentInput:
 *       type: object
 *       required:
 *         - building_id
 *         - name
 *         - code
 *       properties:
 *         building_id:
 *           type: string
 *           format: uuid
 *           description: UUID of the building to which the department belongs
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         name:
 *           type: string
 *           description: Department name
 *           example: Information Technology
 *         code:
 *           type: string
 *           description: Unique department code within the building
 *           example: IT
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional department description
 *           example: Manages IT infrastructure and systems
 *
 *     Department:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "660e8400-e29b-41d4-a716-446655440000"
 *         building_id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         name:
 *           type: string
 *           example: Information Technology
 *         code:
 *           type: string
 *           example: IT
 *         description:
 *           type: string
 *           nullable: true
 *           example: Manages IT infrastructure and systems
 *
 *     DepartmentError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Internal server error
*/

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Get all departments
 *     description: Retrieves departments, optionally filtered by building.
 *     tags: [Departments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: building_id
 *         required: false
 *         description: Filter departments by building UUID
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
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
 *                 departments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid building UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentError'
 *             example:
 *               success: false
 *               message: building_id must be a valid UUID
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
*/
// Authenticated users can view departments
router.get("/", authenticate, getAll);
/** 
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get a department by ID
 *     description: Retrieves a department using its UUID.
 *     tags: [Departments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Department UUID
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Department retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 department:
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid department ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Department not found
 *       500:
 *         description: Internal server error
*/
router.get("/:id", authenticate, getOne);
/** 
 * @swagger
 * /departments:
 *   post:
 *     summary: Create a department
 *     description: Creates a department inside an existing building. Administrators only.
 *     tags: [Departments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepartmentInput'
 *           example:
 *             building_id: "550e8400-e29b-41d4-a716-446655440000"
 *             name: Information Technology
 *             code: IT
 *             description: Manages IT infrastructure and systems
 *     responses:
 *       201:
 *         description: Department created successfully
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
 *                   example: Department created successfully
 *                 department:
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         description: Department input validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentError'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Building not found
 *       409:
 *         description: Department code already exists in that building
 *       500:
 *         description: Internal server error
*/
// Only Administrators can manage departments
router.post("/",authenticate,authorizeRoles("Administrator"),create);
/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update a department
 *     description: Updates a department's building, name, code, or description. Administrators only.
 *     tags: [Departments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Department UUID
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepartmentInput'
 *           example:
 *             building_id: "550e8400-e29b-41d4-a716-446655440000"
 *             name: Information Technology
 *             code: IT
 *             description: Updated IT department description
 *     responses:
 *       200:
 *         description: Department updated successfully
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
 *                   example: Department updated successfully
 *                 department:
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid department ID or validation failure
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Department or building not found
 *       409:
 *         description: Duplicate department code or database reference conflict
 *       500:
 *         description: Internal server error
*/
router.put("/:id",authenticate,authorizeRoles("Administrator"),update);
/** 
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete a department
 *     description: Deletes a department if no related records prevent deletion. Administrators only.
 *     tags: [Departments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Department UUID
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Department deleted successfully
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
 *                   example: Department deleted successfully
 *       400:
 *         description: Invalid department ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Department not found
 *       409:
 *         description: Department is referenced by units, assets, users, or historical records
 *       500:
 *         description: Internal server error
*/
router.delete("/:id",authenticate,authorizeRoles("Administrator"),remove);

module.exports = router;