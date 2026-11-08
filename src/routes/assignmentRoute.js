const express = require("express");

const {assign,getCurrentAssignment,getHistory,reassign,getAssignments,getMyAssignments,getDepartmentAssignments,getUnitAssignments,} = require("../controllers/assignmentController");


const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authenticate);
/**
 * @swagger
 * tags:
 *   name: Asset Assignments
 *   description: Assign assets to staff and manage assignment records
*/

/**
 * @swagger
 * components:
 *   schemas:
 *     AssignAssetInput:
 *       type: object
 *       required:
 *         - user_id
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the staff member receiving the asset
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         movement_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional completed movement ID for a transferred asset
 *           example: 660e8400-e29b-41d4-a716-446655440000
 *         reason:
 *           type: string
 *           description: Required when a transfer request must be created because the target location differs
 *           example: Asset needed by the receiving department
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Assigned for official duties
 *
 *     ReassignAssetInput:
 *       type: object
 *       required:
 *         - user_id
 *         - reason
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the new staff member
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         reason:
 *           type: string
 *           description: Reason for reassignment
 *           example: Previous holder transferred to another unit
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Reassigned for operational requirements
 *
 *     AssignmentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         assignment:
 *           type: object
 *           description: Assignment record returned by the API
 *           additionalProperties: true
 *
 *     AssignmentError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Invalid asset ID
*/

/**
 * @swagger
 * /assignments/assets/{id}:
 *   get:
 *     summary: Get the current assignment of an asset
 *     description: Returns the active assignment for an asset. This route does not explicitly apply authentication middleware in the supplied route definitions.
 *     tags: [Asset Assignments]
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
 *         description: Current assignment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 assignment:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Invalid asset ID
 *       404:
 *         description: Asset is not currently assigned
 *       500:
 *         description: Internal server error
*/
// Current assignment
router.get("/assets/:id",getCurrentAssignment);
/**
 * @swagger
 * /assignments/assets/{id}/history:
 *   get:
 *     summary: Get the assignment history of an asset
 *     description: Returns the assignment history for a specified asset. This route does not explicitly apply authentication middleware in the supplied route definitions.
 *     tags: [Asset Assignments]
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
 *         description: Assignment history retrieved successfully
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
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: Invalid asset ID
 *       500:
 *         description: Internal server error
*/
// Assignment history
router.get("/assets/:id/history",getHistory);
/**
 * @swagger
 * /assignments/assets/{id}/assign:
 *   post:
 *     summary: Assign an asset to a staff member
 *     description: Assigns an asset directly when its location matches the target user's location. If a transfer is required, a transfer request may be created instead. The controller permits Administrator, HOD, and HOU roles.
 *     tags: [Asset Assignments]
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
 *             $ref: '#/components/schemas/AssignAssetInput'
 *           example:
 *             user_id: 550e8400-e29b-41d4-a716-446655440000
 *             movement_id: null
 *             reason: Asset required by the receiving department
 *             notes: Assigned for official duties
 *     responses:
 *       201:
 *         description: Asset assigned successfully, or a transfer request was created
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
 *                   example: Asset assigned successfully
 *                 code:
 *                   type: string
 *                   nullable: true
 *                   example: TRANSFER_REQUEST_CREATED
 *                 assignment:
 *                   type: object
 *                   nullable: true
 *                   additionalProperties: true
 *                 asset:
 *                   type: object
 *                   nullable: true
 *                   additionalProperties: true
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   additionalProperties: true
 *                 transfer:
 *                   type: object
 *                   nullable: true
 *                   additionalProperties: true
 *       400:
 *         description: Invalid asset ID, invalid user ID, invalid movement ID, invalid notes, inactive target user, or missing transfer reason
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: User does not have permission to assign this asset
 *       404:
 *         description: Asset or target user not found
 *       409:
 *         description: Asset requires location allocation before assignment
 *       500:
 *         description: Internal server error
*/
// Assign asset
router.post("/assets/:id/assign",authenticate,assign);
/**
 * @swagger
 * /assignments/assets/{id}/reassign:
 *   post:
 *     summary: Reassign an asset to another staff member
 *     description: Reassigns an already-assigned asset to a different staff member. Requires a reason. The target staff member must satisfy the reassignment service's location requirements. The controller permits Administrator, HOD, and HOU roles.
 *     tags: [Asset Assignments]
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
 *             $ref: '#/components/schemas/ReassignAssetInput'
 *           example:
 *             user_id: 550e8400-e29b-41d4-a716-446655440000
 *             reason: Previous holder moved to another unit
 *             notes: Reassigned for operational requirements
 *     responses:
 *       200:
 *         description: Asset reassigned successfully
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
 *                   example: Asset reassigned successfully
 *                 previousAssignment:
 *                   type: object
 *                   additionalProperties: true
 *                 assignment:
 *                   type: object
 *                   additionalProperties: true
 *                 asset:
 *                   type: object
 *                   additionalProperties: true
 *                 user:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Invalid asset ID, invalid user ID, missing reason, or invalid notes
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: User does not have permission to reassign this asset
 *       404:
 *         description: Asset or target staff member not found
 *       409:
 *         description: Asset is not eligible for reassignment or a transfer is required
 *       500:
 *         description: Internal server error
*/
//re assign asset
router.post("/assets/:id/reassign",authenticate,reassign);
/**
 * @swagger
 * /assignments/assets:
 *   get:
 *     summary: Get all asset assignments
 *     description: Returns all assignment records. Administrator access is required.
 *     tags: [Asset Assignments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
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
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       401:
 *         description: Authentication required or invalid credentials
 *       403:
 *         description: Administrator role required
 *       500:
 *         description: Failed to retrieve assignments
*/
//get all assignments
router.get("/assets",authenticate,authorizeRoles("Administrator"),getAssignments);
/**
 * @swagger
 * /assignments/my-assignments:
 *   get:
 *     summary: Get the authenticated Staff member's active assignments
 *     description: >
 *       Retrieves all active asset assignments belonging to the
 *       authenticated Staff member, including asset details, assignment
 *       information, and organizational location.
 *       Access is restricted to users with the Staff role.
 *     tags: [Assignments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active assignments retrieved successfully
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
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assignment_id:
 *                         type: string
 *                         format: uuid
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       assigned_by:
 *                         type: string
 *                         format: uuid
 *                       assigned_at:
 *                         type: string
 *                         format: date-time
 *                       returned_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       assignment_status:
 *                         type: string
 *                         example: ACTIVE
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                       movement_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       asset_tag:
 *                         type: string
 *                         example: MIST-000001
 *                       asset_name:
 *                         type: string
 *                         example: Dell Latitude Laptop
 *                       asset_status:
 *                         type: string
 *                         example: ASSIGNED
 *                       asset_condition:
 *                         type: string
 *                         example: GOOD
 *                       serial_number:
 *                         type: string
 *                         nullable: true
 *                       brand:
 *                         type: string
 *                         nullable: true
 *                       model:
 *                         type: string
 *                         nullable: true
 *                       assigned_to_name:
 *                         type: string
 *                         example: John Doe
 *                       assigned_to_email:
 *                         type: string
 *                         format: email
 *                       assigned_by_name:
 *                         type: string
 *                         nullable: true
 *                       building_name:
 *                         type: string
 *                         nullable: true
 *                       department_name:
 *                         type: string
 *                         nullable: true
 *                       unit_name:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Authentication required or session invalid
 *       403:
 *         description: User is not authorized to access this resource
 *       500:
 *         description: Internal server error
*/
// Staff: View their own active assignments
router.get("/my-assignments",authenticate,authorizeRoles("Staff"),getMyAssignments);
/**
 * @swagger
 * /assignments/department-assignments:
 *   get:
 *     summary: Get active assignments in the authenticated HOD's department
 *     description: >
 *       Retrieves active asset assignments for staff whose department
 *       matches the authenticated Head of Department (HOD).
 *       Results include asset details, assigned staff information,
 *       assignment details, and organizational location.
 *       Access is restricted to users with the HOD role.
 *     tags: [Assignments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Department assignments retrieved successfully
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
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assignment_id:
 *                         type: string
 *                         format: uuid
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       assigned_by:
 *                         type: string
 *                         format: uuid
 *                       assigned_at:
 *                         type: string
 *                         format: date-time
 *                       returned_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       assignment_status:
 *                         type: string
 *                         example: ACTIVE
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                       movement_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       asset_tag:
 *                         type: string
 *                         example: MIST-000001
 *                       asset_name:
 *                         type: string
 *                         example: Dell Latitude Laptop
 *                       asset_status:
 *                         type: string
 *                         example: ASSIGNED
 *                       asset_condition:
 *                         type: string
 *                         example: GOOD
 *                       serial_number:
 *                         type: string
 *                         nullable: true
 *                       brand:
 *                         type: string
 *                         nullable: true
 *                       model:
 *                         type: string
 *                         nullable: true
 *                       assigned_to_name:
 *                         type: string
 *                         example: John Doe
 *                       assigned_to_email:
 *                         type: string
 *                         format: email
 *                       assigned_by_name:
 *                         type: string
 *                         nullable: true
 *                       building_name:
 *                         type: string
 *                         nullable: true
 *                       department_name:
 *                         type: string
 *                         nullable: true
 *                       unit_name:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Authentication required or session invalid
 *       403:
 *         description: User is not authorized to access department assignments
 *       500:
 *         description: Internal server error
*/
// HOD: View active assignments within their department
router.get("/department-assignments",authenticate,authorizeRoles("HOD"),getDepartmentAssignments);
/**
 * @swagger
 * /assignments/unit-assignments:
 *   get:
 *     summary: Get active assignments in the authenticated HOU's unit
 *     description: >
 *       Retrieves active asset assignments for staff whose unit matches
 *       the authenticated Head of Unit (HOU).
 *       Results include asset details, assigned staff information,
 *       assignment details, and organizational location.
 *       Access is restricted to users with the HOU role.
 *     tags: [Assignments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unit assignments retrieved successfully
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
 *                   example: 3
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assignment_id:
 *                         type: string
 *                         format: uuid
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       assigned_by:
 *                         type: string
 *                         format: uuid
 *                       assigned_at:
 *                         type: string
 *                         format: date-time
 *                       returned_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       assignment_status:
 *                         type: string
 *                         example: ACTIVE
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                       movement_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       asset_tag:
 *                         type: string
 *                         example: MIST-000003
 *                       asset_name:
 *                         type: string
 *                         example: HP ProBook Laptop
 *                       asset_status:
 *                         type: string
 *                         example: ASSIGNED
 *                       asset_condition:
 *                         type: string
 *                         example: GOOD
 *                       serial_number:
 *                         type: string
 *                         nullable: true
 *                       brand:
 *                         type: string
 *                         nullable: true
 *                       model:
 *                         type: string
 *                         nullable: true
 *                       assigned_to_name:
 *                         type: string
 *                         example: Jane Doe
 *                       assigned_to_email:
 *                         type: string
 *                         format: email
 *                       assigned_by_name:
 *                         type: string
 *                         nullable: true
 *                       building_name:
 *                         type: string
 *                         nullable: true
 *                       department_name:
 *                         type: string
 *                         nullable: true
 *                       unit_name:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Authentication required or session invalid
 *       403:
 *         description: User is not authorized to access unit assignments
 *       500:
 *         description: Internal server error
*/
// HOU: View active assignments within their unit
router.get("/unit-assignments",authenticate,authorizeRoles("HOU"),getUnitAssignments);

module.exports = router;