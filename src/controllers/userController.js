const {createUser,findUserById,getAllUsers,updateUser,updateUserPassword,setUserActiveStatus,updateOwnProfile,changeOwnPassword,getMyProfileModel} = require("../models/userModel");

const { hashPassword } = require("../utils/auth");
const { validate: isUuid } = require("uuid");

const create = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      staff_type = "GENERAL",
      department_id = null,
      unit_id = null,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 12
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 12 characters",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email",
      });
    }

    const allowedStaffTypes = [
      "GENERAL",
      "SECURITY",
    ];

    if (!allowedStaffTypes.includes(staff_type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid staff_type. Use GENERAL or SECURITY",
      });
    }

    if (
      department_id !== null &&
      !isUuid(department_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid department_id",
      });
    }

    if (
      unit_id !== null &&
      !isUuid(unit_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit_id",
      });
    }

    // A unit must belong to the selected department
    if (unit_id && department_id) 
      {
      const pool = require("../config/database");

      const result = await pool.query(
        `
          SELECT id
          FROM units
          WHERE id = $1
            AND department_id = $2
        `,
        [unit_id, department_id]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message:
            "The selected unit does not belong to the selected department",
        });
      }
    }

    const hashedPassword =
      await hashPassword(password);

    const user = await createUser({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone:
        typeof phone === "string"
          ? phone.trim() || null
          : null,
      role: "Staff",
      staffType: staff_type,
      departmentId: department_id,
      unitId: unit_id,

      createdBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(201).json({
      success: true,
      message: "Staff user created successfully",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createPrivilegedUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      department_id: requestedDepartmentId = null,
      unit_id: requestedUnitId = null,
      staff_type = "GENERAL",
    } = req.body;

    const allowedRoles = [
      "HOD",
      "HOU",
      "Staff",
      "Administrator",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Role must be Administrator, HOD, HOU or Staff",
      });
    }

    // Administrators do not require a department or unit.
    const departmentId =
      role === "Administrator"
        ? null
        : requestedDepartmentId;

    const unitId =
      role === "Administrator" || role === "HOD"
        ? null
        : requestedUnitId;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email",
      });
    }

    const allowedStaffTypes = ["GENERAL", "SECURITY"];

    if (!allowedStaffTypes.includes(staff_type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid staff_type. Use GENERAL or SECURITY",
      });
    }

    if (
      departmentId !== null &&
      !isUuid(departmentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid department_id",
      });
    }

    if (unitId !== null && !isUuid(unitId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit_id",
      });
    }

    // HOD must have a department.
    if (role === "HOD" && !departmentId) {
      return res.status(400).json({
        success: false,
        message: "HOD must be assigned to a department",
      });
    }

    // HOU must have both department and unit.
    if (
      role === "HOU" &&
      (!departmentId || !unitId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "HOU must be assigned to a department and unit",
      });
    }

    // A unit must belong to the selected department.
    if (unitId && departmentId) {
      const pool = require("../config/database");

      const result = await pool.query(
        `
          SELECT id
          FROM units
          WHERE id = $1
            AND department_id = $2
        `,
        [unitId, departmentId]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message:
            "The selected unit does not belong to the selected department",
        });
      }
    }

    const hashedPassword = await hashPassword(password);

    const user = await createUser({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone:
        typeof phone === "string"
          ? phone.trim() || null
          : null,
      role,
      staffType: staff_type,
      departmentId,
      unitId,
    });

    return res.status(201).json({
      success: true,
      message: `${role} user created successfully`,
      user,
    });
  } catch (error) {
    console.error(
      "Create privileged user error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const getMyProfile = async (req, res) => {
  try {
    // The authenticated user's ID comes from the auth middleware.
    const userId = req.user.id;

    const user = await getMyProfileModel(userId);

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      user,
    });
  } catch (error) {
    console.error("Get my profile error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to retrieve your profile.",
    });
  }
};
const getAll = async (req, res) => {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const existingUser = await findUserById(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      name,
      email,
      phone,
      staff_type = existingUser.staff_type,
      department_id = existingUser.department_id,
      unit_id = existingUser.unit_id,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (
      !["GENERAL", "SECURITY"].includes(
        staff_type
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff_type",
      });
    }

    if (
      department_id !== null &&
      !isUuid(department_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid department_id",
      });
    }

    if (
      unit_id !== null &&
      !isUuid(unit_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit_id",
      });
    }

    const user = await updateUser(id, {
      name: name.trim(),
      email: normalizedEmail,
      phone:
        typeof phone === "string"
          ? phone.trim() || null
          : null,
      role: existingUser.role,
      staffType: staff_type,
      departmentId: department_id,
      unitId: unit_id,
    },
    req.user.id,
    req.ip,
    req.get("user-agent")
    
  );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const deactivate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await setUserActiveStatus(
      id,
      false,
      req.user.id,
      req.ip,
      req.get("user-agent")
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      user,
    });
  } catch (error) {
    console.error(
      "Deactivate user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // ---------------------------------------------
    // 1. Validate password
    // ---------------------------------------------
    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // ---------------------------------------------
    // 2. Check that the target user exists
    // ---------------------------------------------
    const existingUser = await findUserById(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ---------------------------------------------
    // 3. Hash the new password
    // ---------------------------------------------
    const hashedPassword = await hashPassword(password);

    // ---------------------------------------------
    // 4. Update password + create audit
    // ---------------------------------------------
    const user = await updateUserPassword(
      id,
      hashedPassword,
      req.user.id,
      req.ip,
      req.get("user-agent")
    );

    // ---------------------------------------------
    // 5. Response
    // ---------------------------------------------
    return res.status(200).json({
      success: true,
      message: "User password updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user password error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to update user password",
    });
  }
};
const activate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await setUserActiveStatus(
      id,
      true,
      req.user.id,
      req.ip,
      req.get("user-agent")
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User activated successfully",
      user,
    });
  } catch (error) {
    console.error(
      "Activate user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const changeMyOwnPassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // 1. Validate required fields.
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password, and confirmation are required.",
      });
    }

    // 2. Validate new password length.
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long.",
      });
    }

    // bcrypt supports a maximum of 72 bytes.
    if (Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "New password exceeds the maximum supported length.",
      });
    }

    // 3. Check password confirmation.
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match.",
      });
    }

    // 4. Retrieve the authenticated user's current password hash.
    const userResult = await getUserPasswordById(userId);

    if (!userResult) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive.",
      });
    }

    // 5. Verify the current password.
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      userResult.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Your current password is incorrect.",
      });
    }

    // 6. Prevent reusing the current password.
    const isSamePassword = await comparePassword(
      newPassword,
      userResult.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "Your new password must be different from your current password.",
      });
    }

    // 7. Hash the new password.
    const hashedPassword = await hashPassword(newPassword);

    // 8. Update only the authenticated user's password.
    await changeOwnPassword(
      userId,
      hashedPassword,
      req.ip,
      req.get("user-agent")
    );

    return res.status(200).json({
      success: true,
      message: "Your password has been changed successfully.",
    });
  } catch (error) {
    console.error("Change own password error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to change your password.",
    });
  }
};

const updateOwnProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    // 1. Ensure at least one field is provided.
    if (name === undefined && phone === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update: name or phone.",
      });
    }

    // 2. Validate name only when provided.
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 100 characters.",
        });
      }
    }

    // 3. Validate phone only when provided.
    let normalizedPhone;

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone number cannot be empty.",
        });
      }

      normalizedPhone = phone.trim();

      // Optional + followed by 7–20 allowed characters.
      if (!/^\+?[0-9\s()-]{7,20}$/.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid phone number.",
        });
      }
    }

    // 4. Update only the fields provided.
    const user = await updateOwnProfile(
      userId,
      name !== undefined ? name.trim() : undefined,
      normalizedPhone,
      req.ip,
      req.get("user-agent")
    );

    return res.status(200).json({
      success: true,
      message: "Your profile has been updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update own profile error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update your profile.",
    });
  }
};


module.exports = {
  create,
  getAll,
  getOne,
  update,
  activate,
  deactivate,
 createPrivilegedUser,
  updatePassword,
  changeMyOwnPassword,
  updateOwnProfileController,
  getMyProfile,
};