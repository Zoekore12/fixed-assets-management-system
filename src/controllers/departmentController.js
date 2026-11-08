
const {createDepartment,getAllDepartments,getDepartmentById,updateDepartment,deleteDepartment,} = require("../models/departmentModel");

const pool = require("../config/database");
const { validate: isUuid } = require("uuid");

const validateDepartment = (body) => {
  const { building_id, name, code } = body;

  if (
    !building_id ||
    !isUuid(building_id) ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof code !== "string" ||
    !code.trim()
  ) {
    return "A valid building_id, department name, and department code are required";
  }

  return null;
};

const create = async (req, res) => {
  try {
    const validationError = validateDepartment(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { building_id, name, code, description } = req.body;

    const building = await pool.query(
      "SELECT id FROM buildings WHERE id = $1",
      [building_id]
    );

    if (building.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    const department = await createDepartment({
      building_id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description:
        typeof description === "string"
          ? description.trim() || null
          : null,
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This department code already exists in that building",
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
    const { building_id } = req.query;

    if (building_id && !isUuid(building_id)) {
      return res.status(400).json({
        success: false,
        message: "building_id must be a valid UUID",
      });
    }

    const departments = await getAllDepartments(building_id || null);

    return res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await getDepartmentById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("Get department error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const validationError = validateDepartment(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { building_id, name, code, description } = req.body;

    const building = await pool.query(
      "SELECT id FROM buildings WHERE id = $1",
      [building_id]
    );

    if (building.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    const department = await updateDepartment(id, {
      building_id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description:
        typeof description === "string"
          ? description.trim() || null
          : null,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Update department error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This department code already exists in that building",
      });
    }

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Building or department is referenced by another record",
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

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await deleteDepartment(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "Department cannot be deleted because it is referenced by units, assets, users, or historical records",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
};