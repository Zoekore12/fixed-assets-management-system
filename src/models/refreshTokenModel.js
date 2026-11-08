const pool = require("../config/database");

const createRefreshToken = async ({
  userId,
  tokenHash,
  expiresAt,
  userAgent = null,
  ipAddress = null,
  }) => {
  const result = await pool.query(
    `
      INSERT INTO refresh_tokens (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id,
        expires_at,
        created_at
    `,
    [
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    ]
  );

  return result.rows[0];
};

const findRefreshToken = async (tokenHash) => {
  const result = await pool.query(
    `
      SELECT *
      FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0];
};

const revokeRefreshToken = async (tokenHash) => {
  const result = await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
        AND revoked_at IS NULL
      RETURNING id, revoked_at
    `,
    [tokenHash]
  );

  return result.rows[0];
};
const revokeAllUserRefreshTokens = async (userId) => {
  const result = await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND revoked_at IS NULL
      RETURNING id
    `,
    [userId]
  );

  return result.rows;
};

module.exports = {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};