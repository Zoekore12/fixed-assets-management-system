const express = require("express");

const {create,getAll,getOne,getByTag,update,updateStatus,remove,allocateLocation,getDepartmentAssets,getMyAssets,getUnitAssets} = require("../controllers/assetController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Assets
 *   description: Fixed asset registration, retrieval, and management
 *
 * components:
 *   schemas:
 *     AssetInput:
 *       type: object
 *       required:
 *         - name
 *         - category_id
 *         - building_id
 *       properties:
 *         name:
 *           type: string
 *           example: Office Laptop
 *         category_id:
 *           type: string
 *           format: uuid
 *         serial_number:
 *           type: string
 *           nullable: true
 *           example: SN-LAP-1001
 *         brand:
 *           type: string
 *           nullable: true
 *           example: Dell
 *         model:
 *           type: string
 *           nullable: true
 *           example: Latitude 5440
 *         description:
 *           type: string
 *           nullable: true
 *         purchase_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-01-15"
 *         purchase_cost:
 *           type: number
 *           format: double
 *           nullable: true
 *           example: 1250000
 *         supplier:
 *           type: string
 *           nullable: true
 *         building_id:
 *           type: string
 *           format: uuid
 *         department_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         unit_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         condition:
 *           type: string
 *           enum:
 *             - EXCELLENT
 *             - GOOD
 *             - FAIR
 *             - DAMAGED
 *             - OBSOLETE
 *         status:
 *           type: string
 *           enum:
 *             - AVAILABLE
 *             - ASSIGNED
 *             - IN_TRANSIT
 *             - OUT
 *             - MAINTENANCE
 *             - LOST
 *             - DAMAGED
 *             - OBSOLETE
 *             - RETIRED
 *             - DISPOSED
 *
 *     AssetStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - AVAILABLE
 *             - ASSIGNED
 *             - IN_TRANSIT
 *             - OUT
 *             - MAINTENANCE
 *             - LOST
 *             - DAMAGED
 *             - OBSOLETE
 *             - RETIRED
 *             - DISPOSED
 *           example: AVAILABLE
 *
 *     AssetLocationUpdate:
 *       type: object
 *       required:
 *         - department_id
 *       properties:
 *         department_id:
 *           type: string
 *           format: uuid
 *           description: Destination department UUID
 *         unit_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional destination unit UUID
 *
 *     AssetResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         asset:
 *           type: object
 *           additionalProperties: true
 *
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: accessToken
*/
const router = express.Router();

router.use(authenticate);


/**
 * @swagger
 * /assets:
 *   get:
 *     summary: Get all assets
 *     description: Retrieve the registered assets.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Assets retrieved successfully
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
 *                 assets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get("/", getAll);
/**
 * @swagger
 * /assets/tag/{assetTag}:
 *   get:
 *     summary: Find an asset by its tag
 *     description: Retrieve an asset using its permanent asset tag or barcode.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: assetTag
 *         required: true
 *         schema:
 *           type: string
 *         example: MIST-000002
 *     responses:
 *       200:
 *         description: Asset retrieved successfully
 *       400:
 *         description: Asset tag is required
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Internal server error
*/
router.get("/tag/:assetTag",getByTag);
/**
 * @swagger
 * /assets/my-assets:
 *   get:
 *     summary: Get assets assigned to the authenticated staff member
 *     description: >
 *       Retrieves the active assets assigned to the currently authenticated
 *       user. The user ID is obtained from the authenticated session and
 *       cannot be specified through query parameters.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Personal assets retrieved successfully
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
 *                 assets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetInput'
 *       401:
 *         description: Authentication required or session invalid
 *       500:
 *         description: Internal server error
 */
router.get("/my-assets", authenticate, getMyAssets);
/**
* @swagger
 * /assets/department-assets:
 *   get:
 *     summary: Get assets belonging to the authenticated HOD's department
 *     description: >
 *       Retrieves assets belonging to the department associated with the
 *       authenticated Head of Department (HOD). Access is restricted to
 *       users authorized with the HOD role.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Department assets retrieved successfully
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
 *                   example: 10
 *                 assets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetInput'
 *       401:
 *         description: Authentication required or session invalid
 *       403:
 *         description: User is not authorized to access department assets
 *       500:
 *         description: Internal server error
 */
router.get("/department-assets",authenticate,authorizeRoles("HOD"),getDepartmentAssets);
/**
 * @swagger
 * /assets/unit-assets:
 *   get:
 *     summary: Get assets belonging to the authenticated HOU's unit
 *     description: >
 *       Retrieves assets belonging to the unit associated with the
 *       authenticated Head of Unit (HOU). Access is restricted to
 *       users authorized with the HOU role.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unit assets retrieved successfully
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
 *                   example: 5
 *                 assets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssetInput'
 *       401:
 *         description: Authentication required or session invalid
 *       403:
 *         description: User is not authorized to access unit assets
 *       500:
 *         description: Internal server error
*/
router.get("/unit-assets",authenticate,authorizeRoles("HOU"),getUnitAssets);
/**
 * @swagger
 * /assets/{id}:
 *   get:
 *     summary: Get an asset by UUID
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset UUID
 *     responses:
 *       200:
 *         description: Asset retrieved successfully
 *       400:
 *         description: Invalid asset ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id",getOne);
/**
 * @swagger
 * /assets:
 *   post:
 *     summary: Register a new asset
 *     description: Administrator-only asset registration. The backend generates the permanent asset tag.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *           example:
 *             name: Office Laptop
 *             category_id: 11111111-1111-4111-8111-111111111111
 *             serial_number: SN-LAP-1001
 *             brand: Dell
 *             model: Latitude 5440
 *             description: Laptop for official duties
 *             purchase_date: "2026-01-15"
 *             purchase_cost: 1250000
 *             supplier: Example Supplier
 *             building_id: 22222222-2222-4222-8222-222222222222
 *             department_id: 33333333-3333-4333-8333-333333333333
 *             unit_id: 44444444-4444-4444-8444-444444444444
 *     responses:
 *       201:
 *         description: Asset created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssetResponse'
 *       400:
 *         description: Required field or validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator access required
 *       404:
 *         description: Asset category or location not found
 *       409:
 *         description: Duplicate serial number or conflicting asset data
 *       500:
 *         description: Internal server error
*/
// Administrator asset management
router.post("/",authorizeRoles("Administrator"),create);
/**
 * @swagger
 * /assets/{id}:
 *   put:
 *     summary: Update an existing asset
 *     description: Administrator-only update of asset details and location.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *       400:
 *         description: Invalid asset ID, fields, condition, or status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator access required
 *       404:
 *         description: Asset, category, or location not found
 *       409:
 *         description: Duplicate serial number
 *       500:
 *         description: Internal server error
*/
router.put("/:id",authorizeRoles("Administrator"),update);
/**
 * @swagger
 * /assets/{id}/status:
 *   patch:
 *     summary: Update an asset's lifecycle status
 *     description: Administrator-only status update.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetStatusUpdate'
 *     responses:
 *       200:
 *         description: Asset status updated successfully
 *       400:
 *         description: Invalid asset ID or status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator access required
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Internal server error
*/
// Change lifecycle status
router.patch("/:id/status",authorizeRoles("Administrator"),updateStatus);
/**
 * @swagger
 * /assets/{id}:
 *   delete:
 *     summary: Delete an asset without transaction history
 *     description: Administrator-only. Assets with assignments, movements, exit records, or maintenance history must be retired or disposed instead.
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset UUID
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *       400:
 *         description: Invalid asset ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator access required
 *       404:
 *         description: Asset not found
 *       409:
 *         description: Asset has transaction history or related records
 *       500:
 *         description: Internal server error
*/
// Delete only when asset has NO history
router.delete("/:id",authorizeRoles("Administrator"),remove);
/**
 * @swagger
 * /assets/{id}/location:
 *   patch:
 *     summary: Allocate an asset to a department or unit
 *     tags: [Assets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the asset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department_id
 *             properties:
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the destination department
 *               unit_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Optional UUID of the destination unit
 *     responses:
 *       200:
 *         description: Asset location allocated successfully
 *       400:
 *         description: Invalid asset, department, or unit UUID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator access required
 *       404:
 *         description: Asset, department, or unit not found
 *       500:
 *         description: Internal server error
*/
router.patch("/:id/location",authorizeRoles("Administrator"),allocateLocation);


module.exports = router;