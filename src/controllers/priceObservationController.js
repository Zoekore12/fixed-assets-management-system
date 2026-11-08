const observationModel = require("../models/priceObservationModel");

const getObservations = async (req, res) => {
  try {
    const { valuationId, status = "PENDING" } = req.query;

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
      100
    );

    const offset = Math.max(
      Number.parseInt(req.query.offset, 10) || 0,
      0
    );

    const observations = await observationModel.getObservations({
      valuationId,
      status,
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      count: observations.length,
      data: observations,
    });
  } catch (error) {
    console.error("Get market price observations error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to retrieve market price observations",
    });
  }
};

const reviewObservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body || {};

    if (!["APPROVE", "REJECT"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "decision must be APPROVE or REJECT",
      });
    }

    if (
      decision === "REJECT" &&
      (typeof reason !== "string" || !reason.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "A reason is required when rejecting a listing",
      });
    }

    const observation = await observationModel.reviewObservation({
      observationId: id,
      isComparable: decision === "APPROVE",
      exclusionReason:
        decision === "REJECT" ? reason.trim() : null,
    });

    return res.status(200).json({
      success: true,
      message:
        decision === "APPROVE"
          ? "Market price observation approved"
          : "Market price observation rejected",
      data: observation,
    });
  } catch (error) {
    console.error("Review market price observation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to review market price observation",
    });
  }
};

module.exports = {
  getObservations,
  reviewObservation,
};
