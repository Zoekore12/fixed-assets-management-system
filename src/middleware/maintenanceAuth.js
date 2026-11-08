const requireMaintenanceAccess = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Administrator has full maintenance access
  if (user.role === "Administrator") {
    return next();
  }

  // Security staff can access maintenance operations
  if (
    user.role === "Staff" &&
    user.staffType === "SECURITY"
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You do not have permission to perform maintenance operations",
  });
};


const requireMaintenanceView = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (
    user.role === "Administrator" ||
    user.role === "Staff"
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You do not have permission to view maintenance records",
  });
};


const requireMaintenanceCompletion = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (user.role === "Administrator") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Only an Administrator can complete maintenance",
  });
};


module.exports = {
  requireMaintenanceAccess,
  requireMaintenanceView,
  requireMaintenanceCompletion,
};