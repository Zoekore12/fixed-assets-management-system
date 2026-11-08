const {createBuilding,getAllBuildings,getBuildingById,updateBuilding,deleteBuilding,} = require("../models/buildingModel");

const create = async (req, res) => {
  try {
    const { name, code, address, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Building name and code are required",
      });
    }

    const building = await createBuilding({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address?.trim() || null,
      description: description?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: "Building created successfully",
      building,
    });
  } catch (error) {
    console.error("Create building error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Building code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAll = async (req, res) => {
  try {
    const buildings = await getAllBuildings();

    return res.status(200).json({
      success: true,
      count: buildings.length,
      buildings,
    });
  } catch (error) {
    console.error("Get buildings error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const building = await getBuildingById(id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    return res.status(200).json({
      success: true,
      building,
    });
  } catch (error) {
    console.error("Get building error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Building name and code are required",
      });
    }

    const building = await updateBuilding(id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address?.trim() || null,
      description: description?.trim() || null,
    });

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Building updated successfully",
      building,
    });
  } catch (error) {
    console.error("Update building error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Building code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const building = await deleteBuilding(id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Building deleted successfully",
    });
  } catch (error) {
    console.error("Delete building error:", error);

    // PostgreSQL foreign-key violation
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "Building cannot be deleted because it is being used by another record",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {create,getAll,getOne,update,remove,};