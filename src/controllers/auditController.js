const { getAllAuditLogs,getAuditLogById,getAuditLogsByEntity,} = require("../models/auditModel");

// Get all audit logs
const getAuditHistory = async (req, res) => {
  try {
    const logs = await getAllAuditLogs();

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Get audit history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit history",
    });
  }
};


// Get one audit log
const getAuditRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await getAuditLogById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Get audit record error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit record",
    });
  }
};


// Get audit history for a specific entity
const getEntityAuditHistory = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await getAuditLogsByEntity(
      entityType,
      entityId
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Get entity audit history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve entity audit history",
    });
  }
};


module.exports = {
  getAuditHistory,
  getAuditRecord,
  getEntityAuditHistory,
};