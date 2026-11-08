const {approveExitRequest,rejectExitRequest,} = require("../services/exitApprovalService");

const {getPendingExitRequests,getApprovedExitRequests,getRejectedExitRequests,getExitRequestById,} = require("../models/requestExitModel");

const { validate: isUuid } = require("uuid");

const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await getPendingExitRequests();

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

const approveRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!isUuid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid checkout request ID",
      });
    }

    const request = await approveExitRequest(
      requestId,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Checkout request approved successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { rejection_reason } = req.body;

    if (!isUuid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid checkout request ID",
      });
    }

    if (
      typeof rejection_reason !== "string" ||
      !rejection_reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required",
      });
    }

    const request = await rejectExitRequest(
      requestId,
      req.user.id,
      rejection_reason.trim()
    );

    return res.status(200).json({
      success: true,
      message: "Checkout request rejected successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

const getApprovedRequests = async (req, res, next) => {
  try {
    const requests = await getApprovedExitRequests();

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};


const getRejectedRequests = async (req, res, next) => {
  try {
    const requests = await getRejectedExitRequests();

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};


const getSingleRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!isUuid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await getExitRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Checkout request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getApprovedRequests,
  getRejectedRequests,
  getSingleRequest,
};