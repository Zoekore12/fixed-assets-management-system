
const pool = require("../config/database");
const { revokeAllUserRefreshTokens } = require("../models/refreshTokenModel");

const deactivateInactiveAccounts = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find active, non-administrator accounts
    // that have not logged in for at least five years.
    const result = await client.query(`
      SELECT id, name, email
      FROM users
      WHERE is_active = true
        AND role <> 'Administrator'
        AND GREATEST(
        COALESCE(last_login_at, created_at),
        COALESCE(last_activated_at, created_at)
      ) <= CURRENT_TIMESTAMP - INTERVAL '5 years'
      FOR UPDATE
    `);

    const deactivatedUsers = [];

    for (const user of result.rows) {
      const updateResult = await client.query(
        `UPDATE users
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND is_active = true
         RETURNING id, name, email`,
        [user.id]
      );

      if (updateResult.rowCount === 0) continue;

      // Record the automatic deactivation.
      await client.query(
        `INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          null,
          "AUTO_DEACTIVATE_USER",
          "USER",
          user.id,
          `Account automatically deactivated after five years without a successful login: ${user.email}`,
        ]
      );

      deactivatedUsers.push(user);
    }

    await client.query("COMMIT");

    // Revoke refresh tokens after the account updates commit.
    for (const user of deactivatedUsers) {
      await revokeAllUserRefreshTokens(user.id);
    }

    console.log(
      `Account deactivation job completed. Deactivated ${deactivatedUsers.length} account(s).`
    );

    return deactivatedUsers.length;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Account deactivation job failed:", error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { deactivateInactiveAccounts };
