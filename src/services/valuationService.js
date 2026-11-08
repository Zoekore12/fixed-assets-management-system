
const valuationModel = require("../models/valuationModel");

const {
  calculateMarketChange,
  averagePrice,
} = require("../utils/valuationCalculation");

function createValuationService() {
  // Create a valuation for an asset.
  async function createValuation(assetId) {
    return valuationModel.createValuation(assetId);
  }

  // Save a verified or unverified market listing.
  async function addMarketPrice({ valuationId, data }) {
    return valuationModel.addMarketObservation(valuationId, {
      sourceName: data.sourceName,
      productTitle: data.productTitle,
      productUrl: data.listingUrl || data.productUrl,
      listedPrice: data.price ?? data.listedPrice,
      currency: data.currency || "NGN",
      brand: data.brand,
      model: data.model,
      availabilityStatus: data.availabilityStatus || "UNKNOWN",
      isComparable: data.isComparable === true,
      exclusionReason: data.exclusionReason,
    });
  }

  // Calculate market appreciation or decline.
  async function recalculate({
    valuationId,
    thresholdPercent = 30,
  }) {
    const threshold = Number(thresholdPercent);

    if (
      !Number.isFinite(threshold) ||
      threshold < 0 ||
      threshold > 100
    ) {
      const error = new Error(
        "thresholdPercent must be between 0 and 100"
      );
      error.statusCode = 400;
      throw error;
    }

    // 1. Retrieve the valuation and approved market prices.
    const data =
      await valuationModel.getValuationForCalculation(valuationId);

    if (!data.observations || data.observations.length === 0) {
      const error = new Error(
        "No verified comparable market prices are available"
      );
      error.statusCode = 422;
      throw error;
    }

    // 2. Normalize prices for the averagePrice utility.
    const prices = data.observations.map((item) => ({
      price: Number(item.price ?? item.listed_price),
    }));

    // 3. Calculate the average market price.
    const currentMarketValue = averagePrice(prices);

    // 4. Calculate market-value appreciation or decline.
    const purchasePrice = Number(
      data.valuation.original_purchase_cost
    );

    const calculation = calculateMarketChange({
      purchasePrice,
      currentMarketValue,
    });

    // 5. Save the calculation in asset_valuations.
    const savedValuation =
      await valuationModel.saveValuationCalculation({
        valuationId,
        averageMarketPrice: calculation.currentMarketValue,
        marketValueChange: calculation.valueChange,
        marketValueChangePercent: calculation.percentageChange,
        comparablePricesCount: data.observations.length,
      });

    // 6. Determine whether Administrator review is recommended.
    const retainedPercent =
      purchasePrice > 0
        ? (calculation.currentMarketValue / purchasePrice) * 100
        : null;

    const reviewRequired =
      retainedPercent !== null &&
      retainedPercent <= threshold;

    return {
      ...calculation,
      retainedPercent,
      thresholdPercent: threshold,
      reviewRequired,
      reviewReason: reviewRequired
        ? `Market value is ${retainedPercent.toFixed(
            1
          )}% of the purchase price. Administrator review is recommended.`
        : null,
      valuation: savedValuation,
      sourceCount: data.observations.length,
    };
  }

  async function getAllValuations() {
    return valuationModel.getAllValuations();
  }

  async function getValuationById(valuationId) {
    return valuationModel.getValuationById(valuationId);
  }

  async function getValuationsByUser(userId, role) {
    return await valuationModel.getValuationsByUser(userId, role);
  }

  return {
    createValuation,
    addMarketPrice,
    recalculate,
    getAllValuations,
    getValuationById,
    getValuationsByUser,
  };
}

module.exports = { createValuationService };
