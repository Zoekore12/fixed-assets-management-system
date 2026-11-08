const pool = require("../config/database");
const crypto = require("crypto");

const CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

// Hash the code before storing it in PostgreSQL.
const hashCode = (code) => {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
};

// Generate a cryptographically secure six-digit code.
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Create a new verification code.
const createVerificationCode = async (userId) => {
  const code = generateVerificationCode();
  const codeHash = hashCode(code);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Invalidate any previous unused codes for this user.
    await client.query(
      `
        UPDATE email_verification_codes
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND used_at IS NULL
      `,
      [userId]
    );

    // Save the new hashed code with its expiry.
    await client.query(
      `
        INSERT INTO email_verification_codes (
          user_id,
          code_hash,
          expires_at,
          attempts
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'),
          0
        )
      `,
      [userId, codeHash, CODE_EXPIRY_MINUTES]
    );

    await client.query("COMMIT");

    // Return the plain code only so the caller can email it.
    return code;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Verify the submitted code.
const verifyEmailCode = async (userId, submittedCode) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT id, code_hash, expires_at, attempts
        FROM email_verification_codes
        WHERE user_id = $1
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "No active verification code. Request a new one." };
    }

    const verification = result.rows[0];

    if (new Date(verification.expires_at) <= new Date()) {
      await client.query(
        `
          UPDATE email_verification_codes
          SET used_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [verification.id]
      );

      await client.query("COMMIT");

      return { success: false, message: "Verification code has expired. Request a new one." };
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await client.query("COMMIT");

      return { success: false, message: "Too many attempts. Request a new code." };
    }

    const submittedHash = hashCode(submittedCode);

    const hashesMatch = crypto.timingSafeEqual(
      Buffer.from(verification.code_hash, "hex"),
      Buffer.from(submittedHash, "hex")
    );

    if (!hashesMatch) {
      const attempts = verification.attempts + 1;

      await client.query(
        `
          UPDATE email_verification_codes
          SET attempts = $1,
              used_at = CASE
                WHEN $1 >= $2 THEN CURRENT_TIMESTAMP
                ELSE used_at
              END
          WHERE id = $3
        `,
        [attempts, MAX_ATTEMPTS, verification.id]
      );

      await client.query("COMMIT");

      return {
        success: false,
        message: attempts >= MAX_ATTEMPTS
          ? "Too many attempts. Request a new code."
          : "Invalid verification code.",
      };
    }

    // Mark the code as used.
    await client.query(
      `
        UPDATE email_verification_codes
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [verification.id]
    );

    // Mark the user's email as verified.
    await client.query(
      `
        UPDATE users
        SET is_email_verified = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [userId]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Email verified successfully.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createVerificationCode,
  verifyEmailCode,
};
