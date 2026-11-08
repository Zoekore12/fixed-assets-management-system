
const pool = require("../config/database");

// --------------------------------------------------
// 1. CREATE A VALUATION
// --------------------------------------------------
const createValuation = async (assetId) => {
  const assetResult = await pool.query(
    `SELECT id, purchase_cost
     FROM assets
     WHERE id = $1
       AND is_active = TRUE`,
    [assetId]
  );

  if (assetResult.rowCount === 0) {
    const error = new Error("Active asset not found");
    error.statusCode = 404;
    throw error;
  }

  const purchaseCost = Number(
    assetResult.rows[0].purchase_cost
  );

  if (
    assetResult.rows[0].purchase_cost == null ||
    !Number.isFinite(purchaseCost) ||
    purchaseCost <= 0
  ) {
    const error = new Error(
      "Asset must have a purchase cost greater than zero"
    );
    error.statusCode = 422;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO asset_valuations (
       asset_id,
       original_purchase_cost,
       currency,
       valuation_status
     )
     VALUES ($1, $2, 'NGN', 'PENDING')
     RETURNING *`,
    [assetId, purchaseCost]
  );

  return result.rows[0];
};

// --------------------------------------------------
// 2. ADD A MARKET-PRICE OBSERVATION
// --------------------------------------------------
const addMarketObservation = async (valuationId, data) => {
  const valuationResult = await pool.query(
    `SELECT id, currency, valuation_status
     FROM asset_valuations
     WHERE id = $1`,
    [valuationId]
  );

  if (valuationResult.rowCount === 0) {
    const error = new Error("Valuation not found");
    error.statusCode = 404;
    throw error;
  }

  const valuation = valuationResult.rows[0];

  if (valuation.valuation_status === "FAILED") {
    const error = new Error(
      "Cannot add observations to a failed valuation"
    );
    error.statusCode = 409;
    throw error;
  }

  const listedPrice = Number(data.listedPrice);

  if (
    data.listedPrice == null ||
    String(data.listedPrice).trim() === "" ||
    !Number.isFinite(listedPrice) ||
    listedPrice <= 0
  ) {
    const error = new Error(
      "listedPrice must be greater than zero"
    );
    error.statusCode = 400;
    throw error;
  }

  const sourceName = String(data.sourceName || "").trim();
  const productTitle = String(data.productTitle || "").trim();
  const productUrl = String(data.productUrl || "").trim();

  if (!sourceName || !productTitle || !productUrl) {
    const error = new Error(
      "sourceName, productTitle and productUrl are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const currency = String(
    data.currency || valuation.currency
  ).trim().toUpperCase();

  if (currency !== valuation.currency) {
    const error = new Error(
      `Currency must match the valuation currency (${valuation.currency})`
    );
    error.statusCode = 400;
    throw error;
  }

  const availabilityStatus = String(
    data.availabilityStatus || "UNKNOWN"
  ).toUpperCase();

  if (
    !["AVAILABLE", "UNAVAILABLE", "UNKNOWN"].includes(
      availabilityStatus
    )
  ) {
    const error = new Error(
      "Invalid availabilityStatus"
    );
    error.statusCode = 400;
    throw error;
  }

  const isComparable = data.isComparable === true;

  const exclusionReason =
    typeof data.exclusionReason === "string" &&
    data.exclusionReason.trim()
      ? data.exclusionReason.trim()
      : null;

  if (isComparable && availabilityStatus !== "AVAILABLE") {
    const error = new Error(
      "Only available listings can be marked comparable"
    );
    error.statusCode = 400;
    throw error;
  }

  if (!isComparable && !exclusionReason) {
    const error = new Error(
      "Provide an exclusionReason for a non-comparable listing"
    );
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO asset_market_price_observations (
       valuation_id,
       source_name,
       product_title,
       product_url,
       brand,
       model,
       listed_price,
       currency,
       availability_status,
       is_comparable,
       exclusion_reason
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      valuationId,
      sourceName,
      productTitle,
      productUrl,
      data.brand || null,
      data.model || null,
      listedPrice,
      currency,
      availabilityStatus,
      isComparable,
      exclusionReason,
    ]
  );

  return result.rows[0];
};

// --------------------------------------------------
// 3. GET VALUATION AND COMPARABLE PRICES
// The service performs the calculations.
// --------------------------------------------------

const getValuationForCalculation = async (valuationId) => {
  // 1. Retrieve the valuation being recalculated.
  const valuationResult = await pool.query(
    `SELECT
       id,
       asset_id,
       original_purchase_cost,
       average_market_price,
       market_value_change,
       market_value_change_percent,
       currency,
       comparable_prices_count,
       valuation_status
     FROM asset_valuations
     WHERE id = $1`,
    [valuationId]
  );

  if (valuationResult.rows.length === 0) {
    const error = new Error("Valuation not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Retrieve the approved observations linked to this valuation.
  const observationsResult = await pool.query(
    `SELECT
       id,
       valuation_id,
       product_title,
       listed_price AS price,
       currency,
       availability_status,
       is_comparable
     FROM asset_market_price_observations
     WHERE valuation_id = $1
       AND is_comparable = TRUE
       AND availability_status = 'AVAILABLE'
     ORDER BY observed_at DESC`,
    [valuationId]
  );

  // 3. Return the valuation and its eligible market prices.
  return {
    valuation: valuationResult.rows[0],
    observations: observationsResult.rows,
  };
};


// --------------------------------------------------
// 4. SAVE CALCULATED VALUATION
// Receives results from the valuation service.
// --------------------------------------------------
const saveValuationCalculation = async ({
  valuationId,
  averageMarketPrice,
  marketValueChange,
  marketValueChangePercent,
  comparablePricesCount,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE asset_valuations
       SET average_market_price = $2,
           market_value_change = $3,
           market_value_change_percent = $4,
           comparable_prices_count = $5,
           valuation_status = 'COMPLETED',
           collected_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND valuation_status <> 'FAILED'
       RETURNING *`,
      [
        valuationId,
        averageMarketPrice,
        marketValueChange,
        marketValueChangePercent,
        comparablePricesCount,
      ]
    );

    if (result.rowCount === 0) {
      const error = new Error(
        "Valuation not found or has failed"
      );
      error.statusCode = 409;
      throw error;
    }

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// --------------------------------------------------
// 5. GET ALL VALUATIONS
// --------------------------------------------------
const getAllValuations = async () => {
  const result = await pool.query(
    `SELECT
       v.*,
       a.asset_tag,
       a.name AS asset_name
     FROM asset_valuations v
     JOIN assets a ON a.id = v.asset_id
     ORDER BY v.created_at DESC`
  );

  return result.rows;
};

// --------------------------------------------------
// 6. GET ONE VALUATION WITH OBSERVATIONS
// --------------------------------------------------
const getValuationById = async (valuationId) => {
  const valuationResult = await pool.query(
    `SELECT
       v.*,
       a.asset_tag,
       a.name AS asset_name
     FROM asset_valuations v
     JOIN assets a ON a.id = v.asset_id
     WHERE v.id = $1`,
    [valuationId]
  );

  if (valuationResult.rowCount === 0) {
    const error = new Error("Valuation not found");
    error.statusCode = 404;
    throw error;
  }

  const observationsResult = await pool.query(
    `SELECT *
     FROM asset_market_price_observations
     WHERE valuation_id = $1
     ORDER BY observed_at DESC`,
    [valuationId]
  );

  return {
    ...valuationResult.rows[0],
    observations: observationsResult.rows,
  };
};

const getValuationsByUser = async (userId, role) => {
  let scopeCondition;

  switch (role) {
    case "HOD":
      scopeCondition = "a.department_id = u.department_id";
      break;

    case "HOU":
      scopeCondition = "a.unit_id = u.unit_id";
      break;

    case "Staff":
      scopeCondition = "a.current_holder_id = u.id";
      break;

    default: {
      const error = new Error(
        "You are not authorized to view valuations"
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const result = await pool.query(
    `SELECT
       v.*,
       a.asset_tag,
       a.name AS asset_name,
       a.building_id,
       a.department_id,
       a.unit_id,
       COALESCE(
         json_agg(
           json_build_object(
             'id', o.id,
             'source_name', o.source_name,
             'product_title', o.product_title,
             'product_url', o.product_url,
             'brand', o.brand,
             'model', o.model,
             'listed_price', o.listed_price,
             'currency', o.currency,
             'availability_status', o.availability_status,
             'is_comparable', o.is_comparable,
             'observed_at', o.observed_at
           )
           ORDER BY o.observed_at DESC
         ) FILTER (WHERE o.id IS NOT NULL),
         '[]'::json
       ) AS observations

     FROM asset_valuations v

     JOIN assets a
       ON a.id = v.asset_id

     JOIN users u
       ON u.id = $1

     LEFT JOIN asset_market_price_observations o
       ON o.valuation_id = v.id

     WHERE ${scopeCondition}

     GROUP BY v.id, a.id

     ORDER BY v.created_at DESC`,
    [userId]
  );

  return result.rows;
};

module.exports = {
  createValuation,
  addMarketObservation,
  getValuationForCalculation,
  saveValuationCalculation,
  getAllValuations,
  getValuationById,
  getValuationsByUser,
};
