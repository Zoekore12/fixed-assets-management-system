
const { createValuationService } = require("../services/valuationService")

const valuationService = createValuationService();


// SHARED ERROR HANDLER

const handleError = (res, error, label) => {
  console.error(`${label}:`, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.statusCode && error.statusCode < 500
        ? error.message
        : "Internal server error",
  });
};

//  CREATE A VALUATION
const create = async (req, res) => {
  try {
    const { assetId } = req.body;

    if (
      typeof assetId !== "string" ||
      !assetId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "assetId is required",
      });
    }

    const valuation =
      await valuationService.createValuation(
        assetId.trim()
      );

    return res.status(201).json({
      success: true,
      message: "Valuation created successfully",
      valuation,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Create valuation error"
    );
  }
};

//  ADD A MARKET-PRICE OBSERVATION
const addObservation = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      sourceName,
      productTitle,
      productUrl,
      listingUrl,
      listedPrice,
      price,
      currency,
      brand,
      model,
      availabilityStatus,
      isComparable,
      exclusionReason,
    } = req.body;

    const observation =
      await valuationService.addMarketPrice({
        valuationId: id,
        data: {
          sourceName,
          productTitle,
          productUrl,
          listingUrl,
          listedPrice,
          price,
          currency,
          brand,
          model,
          availabilityStatus,
          isComparable,
          exclusionReason,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Market-price observation recorded successfully",
      observation,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Add market observation error"
    );
  }
};

// 3. RECALCULATE MARKET VALUE
const recalculate = async (req, res) => {
  try {
    const { thresholdPercent = 30 } = req.body || {};

    const result = await valuationService.recalculate({
      valuationId: req.params.id,
      thresholdPercent,
    });

    return res.status(200).json({
      success: true,
      message: "Valuation calculation completed",
      ...result,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Recalculate valuation error"
    );
  }
};

// GET ALL VALUATIONS

const getAll = async (req, res) => {
  try {
    const valuations =
      await valuationService.getAllValuations();

    return res.status(200).json({
      success: true,
      count: valuations.length,
      valuations,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Get valuations error"
    );
  }
};
// GET ONE VALUATION
const getOne = async (req, res) => {
  try {
    const valuation =
      await valuationService.getValuationById(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      valuation,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Get valuation error"
    );
  }
};

const getMyValuations = async (req, res) => {

  try {

    const valuations = await valuationService.getValuationsByUser(
      req.user.id,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      count: valuations.length,
      valuations,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  create,
  addObservation,
  recalculate,
  getMyValuations,
  getAll,
  getOne,
};
