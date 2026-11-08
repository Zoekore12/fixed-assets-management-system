const {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  completeMaintenance,
  getAllMaintenanceRequest,
  rejectMaintenanceRequest,
} = require("../models/assetMaintenanceModel");



//create maintenance request record
const createMaintenanceRequestRecord = async (req, res) => {
  try {
    const {
      assetId,
      maintenanceType,
      description,
      serviceProvider,
      estimatedCost,
      notes,
    } = req.body;

    if (!assetId || !maintenanceType || !description) {
      return res.status(400).json({
        success: false,
        message:
          "assetId, maintenanceType and description are required",
      });
    }

    // Always use the authenticated user, not an ID supplied in the body.
    const requestedBy = req.user.id;

    const request = await createMaintenanceRequest({
      assetId,
      requestedBy,
      maintenanceType,
      description,
      serviceProvider,
      estimatedCost,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Maintenance request submitted successfully",
      data: request,
    });
  } catch (error) {
    console.error("Create maintenance request error:", error);

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message || "Failed to submit maintenance request",
    });
  }
};
// Create maintenance record
const createMaintenanceRecord = async (req, res) => {
  try {
    const {
      assetId,
      maintenanceType,
      description,
      serviceProvider,
      cost,
      notes,
    } = req.body;

    // Validate required fields
    if (!assetId || !maintenanceType || !description) {
      return res.status(400).json({
        success: false,
        message: "assetId, maintenanceType and description are required",
      });
    }

    // User creating the maintenance record
    const createdBy = req.user.id;

    const maintenance = await createMaintenance({
      assetId,
      maintenanceType,
      description,
      serviceProvider,
      cost,
      createdBy,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Maintenance record created successfully",
      data: maintenance,
    });
  } catch (error) {
    console.error("Create maintenance error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
//approve maintenance record
const approveMaintenanceRequestRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Maintenance request ID is required",
      });
    }

    const result = await approveMaintenanceRequest({
      requestId: id,
      adminId,
    });

    return res.status(200).json({
      success: true,
      message: "Maintenance request approved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Approve maintenance request error:", error);

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to approve maintenance request",
    });
  }
};
// Reject a maintenance request
const rejectMaintenanceRequestRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // Validate the rejection reason
    if (
      typeof rejectionReason !== "string" ||
      !rejectionReason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required",
      });
    }

    const rejectedRequest = await rejectMaintenanceRequest({
      requestId: id,
      adminId: req.user.id,
      rejectionReason: rejectionReason.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Maintenance request rejected successfully",
      data: rejectedRequest,
    });
  } catch (error) {
    console.error("Reject maintenance request error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reject maintenance request",
    });
  }
};
// Get all maintenance records
const getMaintenanceRecords = async (req, res) => {
  try {
    const maintenance = await getAllMaintenance();

    return res.status(200).json({
      success: true,
      count: maintenance.length,
      data: maintenance,
    });
  } catch (error) {
    console.error("Get maintenance records error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance records",
    });
  }
};
// Get one maintenance record
const getMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await getMaintenanceById(id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: maintenance,
    });
  } catch (error) {
    console.error("Get maintenance record error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance record",
    });
  }
};
// Complete maintenance
const completeMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await completeMaintenance(id);

    return res.status(200).json({
      success: true,
      message: "Maintenance completed successfully",
      data: maintenance,
    });
  } catch (error) {
    console.error("Complete maintenance error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// Get maintenance requests
const getMaintenanceRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const allowedStatuses = [
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];

    if (
      status &&
      !allowedStatuses.includes(status.toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance request status",
      });
    }

    const requests = await getAllMaintenanceRequest(
      status ? status.toUpperCase() : null
    );

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get maintenance requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve maintenance requests",
    });
  }
};

module.exports = {
  createMaintenanceRequestRecord,
  createMaintenanceRecord,
  getMaintenanceRecords,
  getMaintenanceRecord,
  completeMaintenanceRecord,
  approveMaintenanceRequestRecord,
  getMaintenanceRequests,
  rejectMaintenanceRequestRecord,
};