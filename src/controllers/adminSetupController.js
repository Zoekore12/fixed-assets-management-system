
const pool = require("../config/database");
const { hashPassword } = require("../utils/auth");
const crypto = require("node:crypto");

const bootstrapAdmin = async (req, res) => {
  const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const suppliedSecret = req.get("x-bootstrap-secret");

  if (!configuredSecret) {
    return res.status(503).json({
      success: false,
      message: "Administrator setup is not configured",
    });
  }

  if (
    typeof suppliedSecret !== "string" ||
    Buffer.byteLength(suppliedSecret) !==
    Buffer.byteLength(configuredSecret) ||
    !crypto.timingSafeEqual(
    Buffer.from(suppliedSecret),
    Buffer.from(configuredSecret)
    )
  ) {
    return res.status(403).json({
      success: false,
      message: "Invalid setup secret",
    });
  }

  const { name, email, password, phone } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 12
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Name, email, and a password of at least 12 characters are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  let client;

  try {
    const hashedPassword = await hashPassword(password);

    client = await pool.connect();
    await client.query("BEGIN");

    // Serialize bootstrap attempts.
    await client.query(
      "SELECT pg_advisory_xact_lock($1::bigint)",
      ["7261042026"]
    );

    const existingAdmin = await client.query(
      `SELECT id FROM users WHERE role = 'Administrator' LIMIT 1`
    );

    if (existingAdmin.rowCount > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "An Administrator already exists",
      });
    }

    const result = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password,
          phone,
          role
        )
        VALUES ($1, $2, $3, $4, 'Administrator')
        RETURNING
          id,
          name,
          email,
          phone,
          role,
          department_id,
          unit_id,
          is_active,
          created_at
      `,
      [
        name.trim(),
        normalizedEmail,
        hashedPassword,
        typeof phone === "string" && phone.trim()
          ? phone.trim()
          : null,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Initial Administrator created successfully. Please log in.",
      user: result.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Administrator setup error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    client?.release();
  }
};

module.exports = { bootstrapAdmin };