
const { validate: isUuid } = require("uuid");

const {securityStation,getAllSecurityStation} = require("../models/securityStationModel");

const createSecurityStation = async (req, res) => {
  try {
    const {
      station_code,
      name,
      building_id,
      is_active = true,
    } = req.body;

    // Validate station code.
    if (
      typeof station_code !== "string" ||
      !station_code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Station code is required",
      });
    }

    // Validate station name.
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Station name is required",
      });
    }

    // Validate building UUID.
    if (
      typeof building_id !== "string" ||
      !isUuid(building_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid building_id UUID is required",
      });
    }

    // Validate active status.
    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false",
      });
    }

    // Create station and associate it with the building.
    const station = await securityStation({
      stationCode: station_code.trim().toUpperCase(),
      name: name.trim(),
      buildingId: building_id,
      isActive: is_active,
    });

    return res.status(201).json({
      success: true,
      message:
        "Security station created and assigned to building",
      station,
    });
  } catch (error) {
    console.error("Create security station error:", error);

    // PostgreSQL unique constraint violation.
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This station code already exists",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getAllSecurityStations = async (req, res) => {
  try {
    const stations = await getAllSecurityStation();

    return res.status(200).json({
      success: true,
      message: "Security stations retrieved successfully",
      count: stations.length,
      stations,
    });
  } catch (error) {
    console.error("Get security stations error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createSecurityStation,
  getAllSecurityStations,
};
