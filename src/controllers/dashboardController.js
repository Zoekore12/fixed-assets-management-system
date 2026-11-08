const {getDashboardSummary,getDepartmentDashboard,getUnitDashboard,getSecurityDashboard,getStaffDashboard,getUserDashboardScope,} = require("../models/dashboardModel");


const dashboardSummary = async (req, res) => {
  try {
    const user = await getUserDashboardScope(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    let summary;

    // ---------------------------------------------
    // ADMINISTRATOR
    // ---------------------------------------------
    if (user.role === "Administrator") {
      summary = await getDashboardSummary();
    }

    // ---------------------------------------------
    // HOD
    // ---------------------------------------------
    else if (user.role === "HOD") {
      if (!user.department_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a department",
        });
      }

      summary = await getDepartmentDashboard(
        user.department_id
      );
    }

    // ---------------------------------------------
    // HOU
    // ---------------------------------------------
    else if (user.role === "HOU") {
      if (!user.unit_id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to a unit",
        });
      }

      summary = await getUnitDashboard(
        user.unit_id
      );
    }

    // ---------------------------------------------
    // SECURITY
    // ---------------------------------------------
    else if (
      user.staff_type === "SECURITY" ||
      user.role === "Security"
    ) {
      summary = await getSecurityDashboard();
    }

    // ---------------------------------------------
    // STAFF
    // ---------------------------------------------
    else if (user.role === "Staff") {
      summary = await getStaffDashboard(
        user.id
      );
    }

    // ---------------------------------------------
    // UNKNOWN ROLE
    // ---------------------------------------------
    else {
      return res.status(403).json({
        success: false,
        message: "Dashboard access is not available for this role",
      });
    }

    return res.status(200).json({
      success: true,
      data: summary,
      role: user.role,
      staffType: user.staff_type,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
    });
  }
};

module.exports = {
  dashboardSummary,
};