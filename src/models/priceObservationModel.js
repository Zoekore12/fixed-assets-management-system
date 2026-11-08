
const pool = require("../config/database");

const getObservations = async ({
  valuationId = null,
  status = "PENDING",
  limit = 50,
  offset = 0,
}) => {
  const conditions = [];
  const values = [];

  if (valuationId) {
    values.push(valuationId);
    conditions.push(`o.valuation_id = $${values.length}`);
  }

  if (status === "PENDING") {
    conditions.push("o.is_comparable = FALSE");
    conditions.push("o.exclusion_reason LIKE 'Awaiting Administrator%'");
  } else if (status === "APPROVED") {
    conditions.push("o.is_comparable = TRUE");
    conditions.push("o.availability_status = 'AVAILABLE'");
  } else if (status === "REJECTED") {
    conditions.push("o.is_comparable = FALSE");
    conditions.push(
      "(o.exclusion_reason IS NULL OR o.exclusion_reason NOT LIKE 'Awaiting Administrator%')"
    );
  } else if (status !== "ALL") {
    const error = new Error(
      "status must be PENDING, APPROVED, REJECTED, or ALL"
    );
    error.statusCode = 400;
    throw error;
  }

  values.push(limit);
  const limitParameter = `$${values.length}`;

  values.push(offset);
  const offsetParameter = `$${values.length}`;

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const query = `
    SELECT
      o.*,
      a.asset_tag,
      a.name AS asset_name
    FROM asset_market_price_observations o
    JOIN asset_valuations v ON v.id = o.valuation_id
    JOIN assets a ON a.id = v.asset_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ${limitParameter}
    OFFSET ${offsetParameter}
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

const getObservationById = async (id) => {
  const result = await pool.query(
    `SELECT
       o.*,
       a.asset_tag,
       a.name AS asset_name
     FROM asset_market_price_observations o
     JOIN asset_valuations v ON v.id = o.valuation_id
     JOIN assets a ON a.id = v.asset_id
     WHERE o.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

const reviewObservation = async ({
  observationId,
  isComparable,
  exclusionReason,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT *
       FROM asset_market_price_observations
       WHERE id = $1
       FOR UPDATE`,
      [observationId]
    );

    if (existing.rows.length === 0) {
      const error = new Error("Market price observation not found");
      error.statusCode = 404;
      throw error;
    }

    const observation = existing.rows[0];

    if (isComparable && observation.availability_status !== "AVAILABLE") {
      const error = new Error(
        "Only available listings can be approved as comparable"
      );
      error.statusCode = 400;
      throw error;
    }

    const result = await client.query(
      `UPDATE asset_market_price_observations
       SET is_comparable = $1,
           exclusion_reason = $2
       WHERE id = $3
       RETURNING *`,
      [
        isComparable,
        isComparable ? null : exclusionReason,
        observationId,
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getObservations,
  getObservationById,
  reviewObservation,
};
