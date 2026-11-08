const pool = require("../config/database");
const { createAuditLog } = require("./auditModel");

const createUser = async ({
  name,
  email,
  password,
  phone = null,
  role = "Staff",
  staffType = "GENERAL",
  departmentId = null,
  unitId = null,
  createdBy = null,
  ipAddress = null,
  userAgent = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password,
          phone,
          role,
          staff_type,
          department_id,
          unit_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          name,
          email,
          phone,
          role,
          staff_type,
          department_id,
          unit_id,
          is_active,
          created_at
      `,
      [
        name,
        email,
        password,
        phone,
        role,
        staffType,
        departmentId,
        unitId,
      ]
    );

    const user = result.rows[0];

    await createAuditLog({
      userId: createdBy,
      action: "CREATE_USER",
      entityType: "USER",
      entityId: user.id,

      oldData: null,

      newData: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        staff_type: user.staff_type,
        department_id: user.department_id,
        unit_id: user.unit_id,
        is_active: user.is_active,
      },

      description: `User ${user.name} was created`,

      ipAddress,
      userAgent,
      client,
    });

    await client.query("COMMIT");

    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findUserByEmail = async (email) => {
  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0];
};

const findUserById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        staff_type,
        department_id,
        unit_id,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const getAllUsers = async () => {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.staff_type,
        u.department_id,
        d.name AS department_name,
        u.unit_id,
        un.name AS unit_name,
        u.is_active,
        u.created_at,
        u.updated_at

      FROM users u

      LEFT JOIN departments d
        ON d.id = u.department_id

      LEFT JOIN units un
        ON un.id = u.unit_id

      ORDER BY u.created_at DESC
    `
  );

  return result.rows;
};

const updateUserPassword = async (
  id,
  hashedPassword,
  updatedBy = null,
  ipAddress = null,
  userAgent = null
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check that the user exists
    const existingResult = await client.query(
      `
        SELECT
          id,
          name,
          email
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rowCount === 0) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const user = existingResult.rows[0];

    // 2. Update password
    const result = await client.query(
      `
        UPDATE users
        SET
          password = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          name,
          email,
          staff_type,
          role,
          updated_at
      `,
      [hashedPassword, id]
    );

    const updatedUser = result.rows[0];

    // 3. Create audit record
    await createAuditLog({
      userId: updatedBy,
      action: "UPDATE_USER_PASSWORD",
      entityType: "USER",
      entityId: updatedUser.id,

      oldData: null,

      newData: {
        password_changed: true,
      },

      description: `Password was changed for user ${user.name}`,

      ipAddress,
      userAgent,
      client,
    });

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getMyProfileModel = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        staff_type,
        department_id,
        unit_id,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("User not found or inactive.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

// Change the authenticated user's password.
const changeOwnPassword = async (
  userId,
  hashedPassword,
  ipAddress = null,
  userAgent = null
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Retrieve and lock the authenticated user's record.
    const existingResult = await client.query(
      `
        SELECT
          id,
          name,
          email,
          password
        FROM users
        WHERE id = $1
          AND is_active = TRUE
        FOR UPDATE
      `,
      [userId]
    );

    if (existingResult.rowCount === 0) {
      const error = new Error("User not found or inactive.");
      error.statusCode = 404;
      throw error;
    }

    const user = existingResult.rows[0];

    // 2. Update only this user's password.
    const result = await client.query(
      `
        UPDATE users
        SET
          password = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND is_active = TRUE
        RETURNING
          id,
          name,
          email,
          staff_type,
          role,
          updated_at
      `,
      [hashedPassword, userId]
    );

    if (result.rowCount === 0) {
      const error = new Error("Unable to update password.");
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = result.rows[0];

    // 3. Record the password change in the audit log.
    await createAuditLog({
      userId: userId,
      action: "CHANGE_OWN_PASSWORD",
      entityType: "USER",
      entityId: updatedUser.id,

      oldData: null,

      newData: {
        password_changed: true,
      },

      description: `User ${user.name} changed their own password.`,

      ipAddress,
      userAgent,
      client,
    });

    // 4. Commit the password update and audit log together.
    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateOwnProfile = async (
  userId,
  name,
  phone,
  ipAddress = null,
  userAgent = null
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock and retrieve the authenticated user's profile.
    const existingResult = await client.query(
      `
        SELECT id, name, phone
        FROM users
        WHERE id = $1
          AND is_active = TRUE
        FOR UPDATE
      `,
      [userId]
    );

    if (existingResult.rowCount === 0) {
      const error = new Error("User not found or inactive.");
      error.statusCode = 404;
      throw error;
    }

    const existingUser = existingResult.rows[0];

    // 2. Update only the name and phone number.
    const result = await client.query(
      `
        UPDATE users
        SET
          name = $1,
          phone = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND is_active = TRUE
        RETURNING
          id,
          name,
          phone,
          email,
          role,
          staff_type,
          updated_at
      `,
      [name, phone, userId]
    );

    const updatedUser = result.rows[0];

    // 3. Audit the profile change without recording unrelated data.
    await createAuditLog({
      userId,
      action: "UPDATE_OWN_PROFILE",
      entityType: "USER",
      entityId: updatedUser.id,

      oldData: {
        name: existingUser.name,
        phone: existingUser.phone,
      },

      newData: {
        name: updatedUser.name,
        phone: updatedUser.phone,
      },

      description: "User updated their own profile.",

      ipAddress,
      userAgent,
      client,
    });

    // 4. Commit the profile update and audit record together.
    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


const updateUser = async (
  id,
  {
    name,
    email,
    phone,
    role,
    staffType,
    departmentId,
    unitId,
  },
  updatedBy = null,
  ipAddress = null,
  userAgent = null
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get the current user before updating
    const existingResult = await client.query(
      `
        SELECT
          id,
          name,
          email,
          phone,
          role,
          staff_type,
          department_id,
          unit_id,
          is_active,
          created_at,
          updated_at
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rowCount === 0) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const oldUser = existingResult.rows[0];

    // 2. Update the user
    const result = await client.query(
      `
        UPDATE users
        SET
          name = $1,
          email = $2,
          phone = $3,
          role = $4,
          staff_type = $5,
          department_id = $6,
          unit_id = $7,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = $8

        RETURNING
          id,
          name,
          email,
          phone,
          role,
          staff_type,
          department_id,
          unit_id,
          is_active,
          created_at,
          updated_at
      `,
      [
        name,
        email,
        phone,
        role,
        staffType,
        departmentId,
        unitId,
        id,
      ]
    );

    const updatedUser = result.rows[0];

    // 3. Create audit record
    await createAuditLog({
      userId: updatedBy,
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: updatedUser.id,

      oldData: {
        name: oldUser.name,
        email: oldUser.email,
        phone: oldUser.phone,
        role: oldUser.role,
        staff_type: oldUser.staff_type,
        department_id: oldUser.department_id,
        unit_id: oldUser.unit_id,
        is_active: oldUser.is_active,
      },

      newData: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        staff_type: updatedUser.staff_type,
        department_id: updatedUser.department_id,
        unit_id: updatedUser.unit_id,
        is_active: updatedUser.is_active,
      },

      description: `User ${updatedUser.name} was updated`,

      ipAddress,
      userAgent,
      client,
    });

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const setUserActiveStatus = async (
  id,
  isActive,
  updatedBy = null,
  ipAddress = null,
  userAgent = null
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get current user status
    const existingResult = await client.query(
      `
        SELECT
          id,
          name,
          email,
          role,
          staff_type,
          is_active,
          last_activated_at
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rowCount === 0) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const oldUser = existingResult.rows[0];

    // 2. Update active status
    const result = await client.query(
      `
        UPDATE users
        SET
          is_active = $1,
          last_activated_at = CASE
            WHEN $1 = TRUE AND is_active = FALSE
              THEN CURRENT_TIMESTAMP
            ELSE last_activated_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          name,
          email,
          role,
          staff_type,
          is_active,
          last_activated_at,
          updated_at
      `,
      [isActive, id]
    );

    const updatedUser = result.rows[0];

    // 3. Create audit
    await createAuditLog({
      userId: updatedBy,
      action: isActive
        ? "ACTIVATE_USER"
        : "DEACTIVATE_USER",
      entityType: "USER",
      entityId: updatedUser.id,

      oldData: {
        is_active: oldUser.is_active,
        last_activated_at: oldUser.last_activated_at,
      },

      newData: {
        is_active: updatedUser.is_active,
        last_activated_at: updatedUser.last_activated_at,
      },

      description: isActive
        ? `User ${updatedUser.name} was activated`
        : `User ${updatedUser.name} was deactivated`,

      ipAddress,
      userAgent,
      client,
    });

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};




module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUserPassword,
  updateUser,
  setUserActiveStatus,
  changeOwnPassword,
  updateOwnProfile,
  getMyProfileModel,
};