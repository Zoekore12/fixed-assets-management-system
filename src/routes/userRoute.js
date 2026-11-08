const express = require("express");

const {create,createPrivilegedUser,getAll,getOne,update,activate,deactivate,updatePassword,changeMyOwnPassword,updateOwnProfileController, getMyProfile} = require("../controllers/userController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authenticate);
/**
 * @swagger
 * /users/view:
 *   get:
 *     summary: View my own profile
 *     description: >
 *       Retrieves the profile information of the currently authenticated user.
 *       The user ID is obtained from the authenticated session, so users cannot
 *       use this endpoint to view another user's profile. Sensitive information,
 *       such as the user's password hash, is never returned.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Your profile was retrieved successfully.
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: John Doe
 *                 email: john.doe@example.com
 *                 phone: "+2348012345678"
 *                 role: Staff
 *                 staff_type: GENERAL
 *                 is_active: true
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Authentication required.
 *       404:
 *         description: User not found or inactive
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: User not found.
 *       500:
 *         description: Failed to retrieve profile
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Failed to retrieve profile.
*/
router.get("/view", getMyProfile);
/**
 * @swagger
 * /users/password:
 *   patch:
 *     summary: Change my own password
 *     description: >
 *       Allows an authenticated user to change their own password.
 *       The user must provide their current password, a new password,
 *       and confirmation of the new password. The current password
 *       is verified before the new password is hashed and saved.
 *       The password change is recorded in the audit log.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's current password
 *                 example: CurrentPassword123!
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 format: password
 *                 description: New password, at least 8 characters long
 *                 example: NewSecurePassword456!
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Must match the new password
 *                 example: NewSecurePassword456!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Your password has been changed successfully.
 *       400:
 *         description: Missing fields, invalid current password, password mismatch, or invalid new password
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Your current password is incorrect.
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found or inactive
 *       500:
 *         description: Failed to change password
*/
router.patch("/password", changeMyOwnPassword);
/**
 * @swagger
 * /users/edit:
 *   patch:
 *     summary: Edit my own profile
 *     description: >
 *       Allows an authenticated user to edit their own name and phone number.
 *       The authenticated user's ID determines which profile is updated.
 *       Email, role, staff type, and other account fields cannot be changed
 *       through this endpoint. The change is recorded in the audit log.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Updated full name
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 description: Updated phone number
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: Profile edited successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Your profile has been updated successfully.
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: John Doe
 *                 email: john.doe@example.com
 *                 phone: "+2348012345678"
 *                 role: Staff
 *                 staff_type: GENERAL
 *       400:
 *         description: Name or phone number is missing or invalid
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found or inactive
 *       500:
 *         description: Failed to update profile
*/
router.patch("/edit", updateOwnProfileController);
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves all registered users.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 1
 *               users:
 *                 - id: "660e8400-e29b-41d4-a716-446655440000"
 *                   name: John Doe
 *                   email: john.doe@example.com
 *                   role: Staff
 *                   staff_type: GENERAL
 *                   is_active: true
 *       500:
 *         description: Internal server error
*/
router.get("/",authorizeRoles("Administrator"), getAll);
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieves a specific user using their UUID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: John Doe
 *                 email: john.doe@example.com
 *                 role: Staff
 *                 staff_type: GENERAL
 *                 is_active: true
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
*/
router.get("/:id",authorizeRoles("Administrator"), getOne);
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a staff user
 *     description: >
 *       Creates a new Staff account. The role is automatically set to Staff.
 *       Passwords must contain at least 12 characters. Email addresses are
 *       normalized to lowercase, and staff_type must be GENERAL or SECURITY.
 *       If both department_id and unit_id are supplied, the unit must belong
 *       to the selected department.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 12
 *                 format: password
 *                 example: SecurePassword123!
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "+2348012345678"
 *               staff_type:
 *                 type: string
 *                 enum: [GENERAL, SECURITY]
 *                 default: GENERAL
 *                 example: GENERAL
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the user's department
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               unit_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID of the user's unit
 *                 example: "770e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: Staff user created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Staff user created successfully
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: John Doe
 *                 email: john.doe@example.com
 *                 role: Staff
 *                 staff_type: GENERAL
 *                 is_active: true
 *       400:
 *         description: Invalid input, email, password, staff type, department, or unit assignment
 *       409:
 *         description: A user with this email already exists
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: A user with this email already exists
 *       500:
 *         description: Internal server error
*/
router.post("/",authorizeRoles("Administrator"), create);
/**
 * @swagger
 * /users/privileged:
 *   post:
 *     summary: Create a privileged user
 *     description: >
 *       Creates a user with the HOD, HOU, or Staff role.
 *       HOD users must have a department and cannot be assigned to a specific
 *       unit. HOU users must have both a department and a unit. If both
 *       department_id and unit_id are supplied, the unit must belong to
 *       the selected department.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 12
 *                 format: password
 *                 example: SecurePassword123!
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "+2348012345678"
 *               role:
 *                 type: string
 *                 enum: [HOD, HOU, Staff]
 *                 example: HOD
 *               staff_type:
 *                 type: string
 *                 enum: [GENERAL, SECURITY]
 *                 default: GENERAL
 *                 example: GENERAL
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Required for HOD and HOU users
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               unit_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Required for HOU users; must not be assigned to HOD users
 *                 example: "770e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: Privileged user created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: HOD user created successfully
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: Jane Doe
 *                 email: jane.doe@example.com
 *                 role: HOD
 *                 staff_type: GENERAL
 *                 department_id: "550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Invalid role, input, password, staff type, or department/unit assignment
 *       409:
 *         description: A user with this email already exists
 *       500:
 *         description: Internal server error
*/
router.post("/privileged",authorizeRoles("Administrator"), createPrivilegedUser);
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user details
 *     description: >
 *       Updates a user's name, email, phone number, staff type, department,
 *       and unit. The existing role is preserved. If staff_type, department_id,
 *       or unit_id is omitted, the existing value is retained.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user to update
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "+2348012345678"
 *               staff_type:
 *                 type: string
 *                 enum: [GENERAL, SECURITY]
 *                 example: GENERAL
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               unit_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "770e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User updated successfully
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: John Doe
 *                 email: john.doe@example.com
 *                 role: Staff
 *                 staff_type: GENERAL
 *       400:
 *         description: Invalid user ID, name, email, staff type, department ID, or unit ID
 *       404:
 *         description: User not found
 *       409:
 *         description: A user with this email already exists
 *       500:
 *         description: Internal server error
*/
router.put("/:id",authorizeRoles("Administrator"), update);
/**
 * @swagger
 * /users/{id}/activate:
 *   patch:
 *     summary: Activate a user account
 *     description: Activates a user account and records the account status change.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user to activate
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User activated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User activated successfully
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 is_active: true
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
*/
router.patch("/:id/activate",authorizeRoles("Administrator"), activate);
/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user account
 *     description: Deactivates a user account and records the account status change.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user to deactivate
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User deactivated successfully
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 is_active: false
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
*/
router.patch("/:id/deactivate",authorizeRoles("Administrator"), deactivate);
/**
 * @swagger
 * /users/{id}/password:
 *   patch:
 *     summary: Update a user's password
 *     description: >
 *       Sets a new password for an existing user. The password must contain
 *       at least 8 characters. The new password is hashed before being saved,
 *       and the change is audited.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user whose password will be updated
 *         example: "660e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 format: password
 *                 description: New password, at least 8 characters long
 *                 example: NewSecurePass123!
 *     responses:
 *       200:
 *         description: User password updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User password updated successfully
 *               user:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 name: John Doe
 *                 email: john.doe@example.com
 *       400:
 *         description: Password is missing or shorter than 8 characters
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update user password
*/
router.patch("/:id/password",authorizeRoles("Administrator"), updatePassword);



module.exports = router;