
const {
  collectAndSavePrices,
} = require("../services/priceCollectorService");

const collectPrices = async (req, res) => {
  try {
    const { valuationId, searchTerm } = req.body || {};

    if (
      typeof valuationId !== "string" ||
      !valuationId.trim() ||
      typeof searchTerm !== "string" ||
      !searchTerm.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "valuationId and searchTerm are required",
      });
    }

    const result = await collectAndSavePrices({
      valuationId,
      searchTerm,
    });

    return res.status(result.failedCount === 0 ? 201 : 207).json({
      success: result.savedCount > 0,
      message:
        result.savedCount > 0
          ? "Apify collection completed"
          : "No product observations were saved",
      data: result,
    });
  } catch (error) {
    console.error("Collect prices error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Failed to collect market prices from Apify",
    });
  }
};

module.exports = { collectPrices };
