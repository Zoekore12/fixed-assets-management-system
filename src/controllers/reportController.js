const {getAssetReport,getMovementReport,getCheckoutReport,getMaintenanceReport,getAuditReport,} = require("../models/reportModel");

const {getUserDashboardScope,} = require("../models/dashboardModel");


const assetReport = async (req, res) => {
  try {
    const user = await getUserDashboardScope(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    const {
      buildingId,
      departmentId,
      unitId,
      categoryId,
      status,
      condition,
      isActive,
    } = req.query;

    let activeFilter = null;

    if (isActive !== undefined) {
      activeFilter = isActive === "true";
    }

    let reportScope = {
      buildingId,
      departmentId,
      unitId,
      categoryId,
      status,
      condition,
      isActive: activeFilter,
    };

    // Administrator can use all filters
    if (user.role === "Administrator") {
      // Keep requested filters
    }

    // HOD can only see assets in their department
    else if (user.role === "HOD") {
      if (!user.department_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a department",
        });
      }

      reportScope.departmentId = user.department_id;
      reportScope.unitId = null;
    }

    // HOU can only see assets in their unit
    else if (user.role === "HOU") {
      if (!user.unit_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a unit",
        });
      }

      reportScope.unitId = user.unit_id;
      reportScope.departmentId = null;
    }

    // Security can access asset information needed for security operations
    else if (
      user.staff_type === "SECURITY" ||
      user.role === "Security"
    ) {
      // No additional scope for now
    }

    // Normal staff can only see their own assigned assets
    else if (user.role === "Staff") {
      reportScope.userId = user.id;
      reportScope.buildingId = null;
      reportScope.departmentId = null;
      reportScope.unitId = null;
    }

    else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view asset reports",
      });
    }

    const assets = await getAssetReport(reportScope);

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    console.error("Asset report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate asset report",
    });
  }
};
const movementReport = async (req, res) => {
  try {
    const user = await getUserDashboardScope(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    const {
      buildingId,
      departmentId,
      unitId,
      movementStatus,
      movementType,
      fromDate,
      toDate,
    } = req.query;

    let reportScope = {
      buildingId,
      departmentId,
      unitId,
      movementStatus,
      movementType,
      fromDate,
      toDate,
    };

    // Administrator
    if (user.role === "Administrator") {
      // Keep requested filters
    }

    // HOD
    else if (user.role === "HOD") {
      if (!user.department_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a department",
        });
      }

      reportScope.departmentId = user.department_id;
      reportScope.unitId = null;
    }

    // HOU
    else if (user.role === "HOU") {
      if (!user.unit_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a unit",
        });
      }

      reportScope.unitId = user.unit_id;
      reportScope.departmentId = null;
    }

    // Security
    else if (
      user.staff_type === "SECURITY" ||
      user.role === "Security"
    ) {
      // Security movement visibility for now
    }

    // Staff
    else if (user.role === "Staff") {
      reportScope.userId = user.id;
      reportScope.buildingId = null;
      reportScope.departmentId = null;
      reportScope.unitId = null;
    }

    else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view movement reports",
      });
    }

    const movements = await getMovementReport(reportScope);

    return res.status(200).json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    console.error("Movement report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate movement report",
    });
  }
};

const checkoutReport = async (req, res) => {
  try {
    const user = await getUserDashboardScope(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    const {
      buildingId,
      status,
      fromDate,
      toDate,
    } = req.query;

    let reportScope = {
      buildingId,
      status,
      fromDate,
      toDate,
    };

    // Administrator
    if (user.role === "Administrator") {
      // Keep requested filters
    }

    // HOD
    else if (user.role === "HOD") {
      if (!user.department_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a department",
        });
      }

      reportScope.departmentId = user.department_id;
      reportScope.userId = null;
    }

    // HOU
    else if (user.role === "HOU") {
      if (!user.unit_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a unit",
        });
      }

      reportScope.unitId = user.unit_id;
      reportScope.userId = null;
    }

    // Security
    else if (
      user.staff_type === "SECURITY" ||
      user.role === "Security"
    ) {
      // Security can see checkout activity for now
    }

    // Staff
    else if (user.role === "Staff") {
      reportScope.userId = user.id;
      reportScope.buildingId = null;
    }

    else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view checkout reports",
      });
    }

    const checkouts = await getCheckoutReport(reportScope);

    return res.status(200).json({
      success: true,
      count: checkouts.length,
      data: checkouts,
    });
  } catch (error) {
    console.error("Checkout report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate checkout report",
    });
  }
};
const maintenanceReport = async (req, res) => {
  try {
    const user = await getUserDashboardScope(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    const {
      buildingId,
      departmentId,
      unitId,
      maintenanceStatus,
      maintenanceType,
      fromDate,
      toDate,
    } = req.query;

    let reportScope = {
      buildingId,
      departmentId,
      unitId,
      maintenanceStatus,
      maintenanceType,
      fromDate,
      toDate,
    };

    // Administrator
    if (user.role === "Administrator") {
      // Keep requested filters
    }

    // HOD
    else if (user.role === "HOD") {
      if (!user.department_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a department",
        });
      }

      reportScope.departmentId = user.department_id;
      reportScope.unitId = null;
    }

    // HOU
    else if (user.role === "HOU") {
      if (!user.unit_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a unit",
        });
      }

      reportScope.unitId = user.unit_id;
      reportScope.departmentId = null;
    }

    // Security should not access maintenance reports
    else if (
      user.staff_type === "SECURITY" ||
      user.role === "Security"
    ) {
      return res.status(403).json({
        success: false,
        message: "Security personnel cannot access maintenance reports",
      });
    }

    // Staff
    else if (user.role === "Staff") {
      reportScope.userId = user.id;
      reportScope.buildingId = null;
      reportScope.departmentId = null;
      reportScope.unitId = null;
    }

    else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view maintenance reports",
      });
    }

    const maintenance = await getMaintenanceReport(reportScope);

    return res.status(200).json({
      success: true,
      count: maintenance.length,
      data: maintenance,
    });
  } catch (error) {
    console.error("Maintenance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate maintenance report",
    });
  }
};
const auditReport = async (req, res) => {
  try {
    // Extra protection in case this controller is called
    // without the Administrator route middleware.
    if (req.user.role !== "Administrator") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can access audit reports",
      });
    }

    const {
      userId,
      action,
      entityType,
      entityId,
      fromDate,
      toDate,
    } = req.query;

    const audits = await getAuditReport({
      userId,
      action,
      entityType,
      entityId,
      fromDate,
      toDate,
    });

    return res.status(200).json({
      success: true,
      count: audits.length,
      data: audits,
    });
  } catch (error) {
    console.error("Audit report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate audit report",
    });
  }
};


module.exports = {assetReport,movementReport,checkoutReport,maintenanceReport,auditReport,};