const express = require("express");

const {
  create,
  getAll,
  getOne,
  update,
  remove,
} = require("../controllers/assetCategoryController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Asset Categories
 *   description: Manage asset categories
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AssetCategoryInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: Computers
 *         description:
 *           type: string
 *           nullable: true
 *           example: Desktop computers and laptops
 *
 *     AssetCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         name:
 *           type: string
 *           example: Computers
 *         description:
 *           type: string
 *           nullable: true
 *           example: Desktop computers and laptops
*/


/**
 * @swagger
 * /asset-categories:
 *   get:
 *     summary: Get all asset categories
 *     description: Returns all asset categories. Authentication is required.
 *     tags: [Asset Categories]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Asset categories retrieved successfully
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
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetCategory'
 *       401:
 *         description: Authentication required or invalid credentials
 *       500:
 *         description: Internal server error
*/
// Authenticated users can view categories
router.get("/", authenticate, getAll);
/**
 * @swagger
 * /asset-categories/{id}:
 *   get:
 *     summary: Get an asset category by ID
 *     tags: [Asset Categories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset category UUID
 *     responses:
 *       200:
 *         description: Asset category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: '#/components/schemas/AssetCategory'
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Authentication required or invalid credentials
 *       404:
 *         description: Asset category not found
 *       500:
 *         description: Internal server error
*/
router.get("/:id", authenticate, getOne);

/**
 * @swagger
 * /asset-categories:
 *   post:
 *     summary: Create an asset category
 *     description: Administrators only.
 *     tags: [Asset Categories]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetCategoryInput'
 *           example:
 *             name: Computers
 *             description: Desktop computers and laptops
 *     responses:
 *       201:
 *         description: Asset category created successfully
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
 *                   example: Asset category created successfully
 *                 category:
 *                   $ref: '#/components/schemas/AssetCategory'
 *       400:
 *         description: Category name is required
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       409:
 *         description: Asset category already exists
 *       500:
 *         description: Internal server error
*/
// Administrators manage categories
router.post("/",authenticate,authorizeRoles("Administrator"),create);
/**
 * @swagger
 * /asset-categories/{id}:
 *   put:
 *     summary: Update an asset category
 *     description: Administrators only. The category name is required.
 *     tags: [Asset Categories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset category UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetCategoryInput'
 *           example:
 *             name: Office Equipment
 *             description: Equipment used in offices
 *     responses:
 *       200:
 *         description: Asset category updated successfully
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
 *                   example: Asset category updated successfully
 *                 category:
 *                   $ref: '#/components/schemas/AssetCategory'
 *       400:
 *         description: Invalid category ID or category name is required
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Asset category not found
 *       409:
 *         description: Asset category already exists
 *       500:
 *         description: Internal server error
*/
router.put("/:id",authenticate,authorizeRoles("Administrator"),update);
/**
 * @swagger
 * /asset-categories/{id}:
 *   delete:
 *     summary: Delete an asset category
 *     description: Administrators only. A category referenced by assets cannot be deleted.
 *     tags: [Asset Categories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset category UUID
 *     responses:
 *       200:
 *         description: Asset category deleted successfully
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
 *                   example: Asset category deleted successfully
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: Asset category not found
 *       409:
 *         description: Category cannot be deleted because assets are using it
 *       500:
 *         description: Internal server error
*/
router.delete("/:id",authenticate,authorizeRoles("Administrator"),remove);

module.exports = router;