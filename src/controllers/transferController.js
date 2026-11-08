const {createTransferRequest,assignTransferMover,startTransfer,completeTransfer,scanTransferAsset,verifyTransferExit,checkinTransferAtBuilding,confirmMoverPossession,} = require("../services/movementService");

const {getAllAssetMovements,getMovementsForUser,getMovementForUser,}= require("../models/movementModel")

const { approveTransfer,} = require("../services/transferAuthorizationService");


const createTransfer = async (req, res) => {
  try {
    const {
      asset_id,
      to_building_id,
      to_department_id,
      to_unit_id,
      reason,
      notes = null,
    } = req.body;




    const movement = await createTransferRequest({
      assetId: asset_id,
      requestedBy: req.user.id,
      toBuildingId: to_building_id,
      toDepartmentId: to_department_id,
      toUnitId: to_unit_id,
      reason,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Transfer request created successfully",
      movement,
    });
  } catch (error) {
    console.error(
      "Create transfer error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
};
const approveTransferRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const approverId = req.user.id;

    const movement =
      await approveTransfer({
        movementId: id,
        approverId,
      });

    return res.status(200).json({
      success: true,
      message: "Transfer approved successfully",
      movement,
    });
  } catch (error) {
    console.error(
      "Approve transfer error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
};
const assignMover = async (req, res) => {
  try {
    const { id } = req.params;
    const { moved_by } = req.body;

    if (!moved_by) {
      return res.status(400).json({
        success: false,
        message: "moved_by is required",
      });
    }

    const movement = await assignTransferMover({
      movementId: id,
      movedBy: moved_by,
      assignedBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Mover assigned successfully",
      movement,
    });
  } catch (error) {
    console.error("Assign mover error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Internal server error",
    });
  }
};
const startTransferRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const movement = await startTransfer({
      movementId: id,
      moverId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Transfer is now in transit",
      movement,
    });
  } catch (error) {
    console.error(
      "Start transfer error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
};
const confirmMoverPossessionRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const movement = await confirmMoverPossession({
      movementId: id,
      moverId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Mover confirmed possession of the asset",
      movement,
    });
  } catch (error) {
    console.error(
      "Mover possession confirmation error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
const completeTransferRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await completeTransfer({
      movementId: id,
      receiverId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Transfer completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Complete transfer error:", error);

    return res.status(error.statusCode || error.status || 500).json({
      success: false,
      message: error.message || "Failed to complete transfer",
    });
  }
};
const scanTransferAssetRequest = async (req, res) => {
  try {
    const { assetTag } = req.params;

    if (
      typeof assetTag !== "string" ||
      !assetTag.trim()
    ) {
      return res.status(400).json({
        success: false,
        authorized: false,
        message: "Asset tag is required",
      });
    }

    // Get the authenticated security officer and station.
    const securityUserId = req.user.id;
    const stationId = req.user.stationId;

    if (!securityUserId || !stationId) {
      return res.status(403).json({
        success: false,
        authorized: false,
        message:
          "Authenticated security user and station are required",
      });
    }

    // Find the authorized transfer for this asset and station.
    const movement = await scanTransferAsset({
      assetTag: assetTag.trim(),
      securityUserId,
      stationId,
    });

    return res.status(200).json({
      success: true,
      message: "Active transfer found",
      authorized: true,
      movement,
    });
  } catch (error) {
    console.error("Security transfer scan error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      authorized: false,
      message: error.message || "Internal server error",
    });
  }
};
const verifyTransferExitRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const movement = await verifyTransferExit({
      movementId: id,
      securityUserId: req.user.id,
      stationId: req.user.stationId,
    });

    return res.status(200).json({
      success: true,
      message: "Security verified the asset for authorized exit",
      movement,
    });
  } catch (error) {
    console.error("Verify transfer exit error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
const scanTransferCheckinRequest = async (req, res) => {
  try {
    const { assetTag } = req.params;

    if (!assetTag) {
      return res.status(400).json({
        success: false,
        message: "Asset tag is required",
      });
    }

    // Both values come from the authenticated session/JWT.
    const securityUserId = req.user.id;
    const stationId = req.user.stationId;

    if (!stationId) {
      return res.status(403).json({
        success: false,
        message: "No security station is associated with this session",
      });
    }

    const result = await checkinTransferAtBuilding({
      assetTag: assetTag.trim(),
      securityUserId,
      stationId,
    });

    return res.status(200).json({
      success: true,
      message: "Asset checked in at destination building",
      movement: result.movement,
      asset: result.asset,
      station: {
        id: result.station.id,
        station_code: result.station.station_code,
        name: result.station.station_name,
        building_id: result.station.building_id,
        building_name: result.station.building_name,
      },
    });
  } catch (error) {
    console.error("Building check-in error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
const getAllTransfers = async (req, res) => {
  try {
    const transfers = await getAllAssetMovements();

    return res.status(200).json({
      success: true,
      count: transfers.length,
      transfers,
    });
  } catch (error) {
    console.error("Get transfers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transfers",
    });
  }
};
const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;

    const isValidUUID =
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    if (!isValidUUID) {
      return res.status(400).json({
        success: false,
        message: "A valid transfer UUID is required",
      });
    }

    const transfer = await getAssetMovementById(id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    return res.status(200).json({
      success: true,
      transfer,
    });
  } catch (error) {
    console.error("Get transfer by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transfer",
    });
  }
};
const getPendingTransfers = async (req, res) => {
  try {
    const transfers = await getPendingMovements();

    return res.status(200).json({
      success: true,
      count: transfers.length,
      transfers,
    });
  } catch (error) {
    console.error("Get pending transfers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending transfers",
    });
  }
};

const getMyMovements = async (req, res) => {
  try {
    console.log("Authenticated user:", req.user);
    const movements = await getMovementsForUser(req.user);

    return res.status(200).json({
      success: true,
      count: movements.length,
      movements,
    });
  } catch (error) {
    console.error("Get movements error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve movements.",
    });
  }
};

const getMyMovementById = async (req, res) => {
  try {
    const movement = await getMovementForUser(
      req.params.id,
      req.user
    );

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: "Movement not found.",
      });
    }

    return res.status(200).json({
      success: true,
      movement,
    });
  } catch (error) {
    console.error("Get movement error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve movement.",
    });
  }
};



module.exports = {
  createTransfer,
  approveTransferRequest,
  assignMover,
  startTransferRequest,
  completeTransferRequest,
  scanTransferAssetRequest,
  verifyTransferExitRequest,
  scanTransferCheckinRequest,
  confirmMoverPossessionRequest,
  getAllTransfers,
  getPendingTransfers,
  getTransferById,
  getMyMovements,
  getMyMovementById,
};