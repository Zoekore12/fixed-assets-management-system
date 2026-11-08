const {
  createUnit,
  getAllUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
} = require("../models/unitModel");

const pool = require("../config/database");
const { validate: isUuid } = require("uuid");

const validateUnit = (body) => {
  const {
    department_id,
    name,
    code,
  } = body;

  if (
    !department_id ||
    !isUuid(department_id) ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof code !== "string" ||
    !code.trim()
  ) {
    return "A valid department_id, unit name, and unit code are required";
  }

  return null;
};
const create = async (req, res) => {
  try {
    const validationError = validateUnit(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      department_id,
      name,
      code,
      description,
    } = req.body;

    // Make sure the department exists
    const department = await pool.query(
      `
        SELECT id
        FROM departments
        WHERE id = $1
      `,
      [department_id]
    );

    if (department.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const unit = await createUnit({
      department_id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description:
        typeof description === "string"
          ? description.trim() || null
          : null,
    });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully",
      unit,
    });
  } catch (error) {
    console.error("Create unit error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "This unit code already exists in that department",
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
    const { department_id } = req.query;

    if (
      department_id &&
      !isUuid(department_id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "department_id must be a valid UUID",
      });
    }

    const units = await getAllUnits(
      department_id || null
    );

    return res.status(200).json({
      success: true,
      count: units.length,
      units,
    });
  } catch (error) {
    console.error("Get units error:", error);

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
        message: "Invalid unit ID",
      });
    }

    const unit = await getUnitById(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      unit,
    });
  } catch (error) {
    console.error("Get unit error:", error);

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
        message: "Invalid unit ID",
      });
    }

    const validationError = validateUnit(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      department_id,
      name,
      code,
      description,
    } = req.body;

    // Make sure new department exists
    const department = await pool.query(
      `
        SELECT id
        FROM departments
        WHERE id = $1
      `,
      [department_id]
    );

    if (department.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const unit = await updateUnit(id, {
      department_id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description:
        typeof description === "string"
          ? description.trim() || null
          : null,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      unit,
    });
  } catch (error) {
    console.error("Update unit error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "This unit code already exists in that department",
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
        message: "Invalid unit ID",
      });
    }

    const unit = await deleteUnit(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error) {
    console.error("Delete unit error:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "Unit cannot be deleted because it is referenced by another record",
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