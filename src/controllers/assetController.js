const { validate: isUuid } = require("uuid");

const {generateAssetTag,createAsset,getAllAssets,getAssetById,getAssetByTag,updateAsset,deleteAsset,updateAssetStatus,allocateAssetLocation,getAssetsByHodDepartment,getAssetsByHouUnit,getMyAssetsByUserId} = require("../models/assetModel");

const pool = require("../config/database");


//Validation Helpers
const isValidDate = (value) => {
  if (!value) return true;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};
const isValidNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  return !Number.isNaN(Number(value));
};

//Check Asset Location Hierarchy    ↓
const validateAssetLocation = async ({
  buildingId,
  departmentId = null,
  unitId = null,
}) => {
  // 1. Building is always required
  const buildingResult = await pool.query(
    `
      SELECT id
      FROM buildings
      WHERE id = $1
      LIMIT 1
    `,
    [buildingId]
  );

  if (buildingResult.rowCount === 0) {
    return {
      valid: false,
      status: 404,
      message: "Building not found",
    };
  }

  // 2. A unit cannot exist without a department
  if (unitId && !departmentId) {
    return {
      valid: false,
      status: 400,
      message:
        "A department is required when selecting a unit",
    };
  }

  // 3. Validate department only when one is provided
  if (departmentId) {
    const departmentResult = await pool.query(
      `
        SELECT id
        FROM departments
        WHERE id = $1
          AND building_id = $2
        LIMIT 1
      `,
      [departmentId, buildingId]
    );

    if (departmentResult.rowCount === 0) {
      return {
        valid: false,
        status: 400,
        message:
          "Department does not belong to the selected building",
      };
    }
  }

  // 4. Validate unit only when one is provided
  if (unitId) {
    const unitResult = await pool.query(
      `
        SELECT id
        FROM units
        WHERE id = $1
          AND department_id = $2
        LIMIT 1
      `,
      [unitId, departmentId]
    );

    if (unitResult.rowCount === 0) {
      return {
        valid: false,
        status: 400,
        message:
          "Unit does not belong to the selected department",
      };
    }
  }

  return {
    valid: true,
  };
};
//Check Category
const validateCategory = async (categoryId) => {
  const result = await pool.query(
    `
      SELECT id
      FROM asset_categories
      WHERE id = $1
      LIMIT 1
    `,
    [categoryId]
  );

  return result.rowCount > 0;
};


//CREATE ASSET
const create = async (req, res) => {
  try {
    const {
      name,
      category_id,
      serial_number,
      brand,
      model,
      description,
      purchase_date,
      purchase_cost,
      supplier,
      building_id,
      department_id,
      unit_id,
    } = req.body;

    // Required fields
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Asset name is required",
      });
    }

    if (
      typeof category_id !== "string" ||
      !isUuid(category_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid category_id is required",
      });
    }

    if (
      typeof building_id !== "string" ||
      !isUuid(building_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid building_id is required",
      });
    }

    // Department and unit are optional
    if (
      department_id !== undefined &&
      department_id !== null &&
      department_id !== "" &&
      (typeof department_id !== "string" ||
        !isUuid(department_id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid department_id",
      });
    }

    if (
      unit_id !== undefined &&
      unit_id !== null &&
      unit_id !== "" &&
      (typeof unit_id !== "string" ||
        !isUuid(unit_id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit_id",
      });
    }

    // Normalize optional location IDs
    const departmentId =
      department_id || null;

    const unitId = unit_id || null;

    // A unit cannot be selected without a department
    if (unitId && !departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "A department_id is required when assigning an asset to a unit",
      });
    }


    // Optional validation
    if (!isValidDate(purchase_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase_date",
      });
    }

    if (!isValidNumber(purchase_cost)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase_cost",
      });
    }

    // Check category
    const categoryExists =
      await validateCategory(category_id);

    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Asset category not found",
      });
    }

    // Check Building → Department → Unit
    const locationValidation =
      await validateAssetLocation({
        buildingId: building_id,
        departmentId,
        unitId,
      });

    if (!locationValidation.valid) {
      return res.status(
        locationValidation.status
      ).json({
        success: false,
        message: locationValidation.message,
      });
    }

    // Generate permanent asset tag
    const assetTag = await generateAssetTag();

   const asset = await createAsset({
      assetTag,
      name: name.trim(),
      categoryId: category_id,
      serialNumber:
        typeof serial_number === "string" &&
        serial_number.trim()
          ? serial_number.trim()
          : null,
      brand:
        typeof brand === "string" &&
        brand.trim()
          ? brand.trim()
          : null,
      model:
        typeof model === "string" &&
        model.trim()
          ? model.trim()
          : null,
      description:
        typeof description === "string" &&
        description.trim()
          ? description.trim()
          : null,
      purchaseDate:
        purchase_date || null,
      purchaseCost:
        purchase_cost !== undefined &&
        purchase_cost !== ""
          ? Number(purchase_cost)
          : null,
      supplier:
        typeof supplier === "string" &&
        supplier.trim()
          ? supplier.trim()
          : null,
      buildingId: building_id,
      departmentId,
      unitId,

      // Audit information
      createdBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    console.error("Create asset error:", error);

    if (error.code === "23505") {
      if (
        error.constraint ===
        "assets_serial_number_key"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An asset with this serial number already exists",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "An asset with this information already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
//GET ALL ASSETS
const getAll = async (req, res) => {
  try {
    const assets = await getAllAssets();

    return res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error("Get all assets error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const allocateLocation = async (req, res) => {
  try {
    if (req.user?.role !== "Administrator") {
      return res.status(403).json({
        success: false,
        message: "Only an Administrator can allocate assets",
      });
    }

    const { id: assetId } = req.params;
    const { department_id, unit_id } = req.body;

    if (!isUuid(assetId) || !isUuid(department_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid asset ID and department_id are required",
      });
    }

    if (unit_id != null && !isUuid(unit_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit_id",
      });
    }

    const asset = await allocateAssetLocation({
      assetId,
      departmentId: department_id,
      unitId: unit_id || null,
      allocatedBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Asset location allocated successfully",
      asset,
    });
  } catch (error) {
    console.error("Asset allocation error:", error);

    return res.status(
      error.status || error.statusCode || 500
    ).json({
      success: false,
      message:
        error.status || error.statusCode
          ? error.message
          : "Internal server error",
    });
  }
};

//GET ASSET BY ID


const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const asset = await getAssetById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    return res.status(200).json({
      success: true,
      asset,
    });
  } catch (error) {
    console.error("Get asset error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// GET ASSET BY TAG

const getByTag = async (req, res) => {
  try {
    const { assetTag } = req.params;

    if (
      typeof assetTag !== "string" ||
      !assetTag.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Asset tag is required",
      });
    }

    const normalizedTag =
      assetTag.trim().toUpperCase();

    const asset =
      await getAssetByTag(normalizedTag);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    return res.status(200).json({
      success: true,
      asset,
    });
  } catch (error) {
    console.error(
      "Get asset by tag error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// UPDATE ASSET
const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const existingAsset =
      await getAssetById(id);

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const {
      name,
      category_id,
      serial_number,
      brand,
      model,
      description,
      purchase_date,
      purchase_cost,
      supplier,
      building_id,
      department_id,
      unit_id,
      condition,
      status,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Asset name is required",
      });
    }

    if (
      typeof category_id !== "string" ||
      !isUuid(category_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid category_id is required",
      });
    }

    if (
      typeof building_id !== "string" ||
      !isUuid(building_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid building_id is required",
      });
    }

    
    if (
      department_id !== undefined &&
      department_id !== null &&
      department_id !== "" &&
      (typeof department_id !== "string" ||
        !isUuid(department_id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid department_id",
      });
    }

    if (
      unit_id !== undefined &&
      unit_id !== null &&
      unit_id !== "" &&
      (typeof unit_id !== "string" ||
        !isUuid(unit_id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit_id",
      });
    }

    const departmentId = department_id || null;
    const unitId = unit_id || null;

    if (unitId && !departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "A department is required when selecting a unit",
      });
    }


    if (!isValidDate(purchase_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase_date",
      });
    }

    if (!isValidNumber(purchase_cost)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase_cost",
      });
    }

    const validConditions = [
      "EXCELLENT",
      "GOOD",
      "FAIR",
      "DAMAGED",
      "OBSOLETE",
    ];

    const validStatuses = [
      "AVAILABLE",
      "ASSIGNED",
      "IN_TRANSIT",
      "OUT",
      "MAINTENANCE",
      "LOST",
      "DAMAGED",
      "OBSOLETE",
      "RETIRED",
      "DISPOSED",
    ];

    if (
      condition &&
      !validConditions.includes(condition)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset condition",
      });
    }

    if (
      status &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset status",
      });
    }

    const categoryExists =
      await validateCategory(category_id);

    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Asset category not found",
      });
    }

    const locationValidation =
      await validateAssetLocation({
        buildingId: building_id,
        departmentId,
        unitId,
      });

    if (!locationValidation.valid) {
      return res.status(
        locationValidation.status
      ).json({
        success: false,
        message: locationValidation.message,
      });
    }

    const asset = await updateAsset(
      id,
      {
        name: name.trim(),
        categoryId: category_id,
        serialNumber:
          typeof serial_number === "string" &&
          serial_number.trim()
            ? serial_number.trim()
            : null,
        brand:
          typeof brand === "string" &&
          brand.trim()
            ? brand.trim()
            : null,
        model:
          typeof model === "string" &&
          model.trim()
            ? model.trim()
            : null,
        description:
          typeof description === "string" &&
          description.trim()
            ? description.trim()
            : null,
        purchaseDate:
          purchase_date || null,
        purchaseCost:
          purchase_cost !== undefined &&
          purchase_cost !== ""
            ? Number(purchase_cost)
            : null,
        supplier:
          typeof supplier === "string" &&
          supplier.trim()
            ? supplier.trim()
            : null,
        buildingId: building_id,
        departmentId: department_id,
        unitId: unit_id,
        condition:
          condition || existingAsset.condition,
        status:
          status || existingAsset.status,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    console.error("Update asset error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "An asset with this serial number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
//UPDATE ASSET STATUS
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const validStatuses = [
      "AVAILABLE",
      "ASSIGNED",
      "IN_TRANSIT",
      "OUT",
      "MAINTENANCE",
      "LOST",
      "DAMAGED",
      "OBSOLETE",
      "RETIRED",
      "DISPOSED",
    ];

    if (
      typeof status !== "string" ||
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset status",
      });
    }

    const existingAsset =
      await getAssetById(id);

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const asset = await updateAssetStatus(
      id,
      status
    );

    return res.status(200).json({
      success: true,
      message: `Asset status changed to ${status}`,
      asset,
    });
  } catch (error) {
    console.error(
      "Update asset status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// DELETE ASSET
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    // Check that the asset exists
    const asset = await getAssetById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }


     const historyResult = await pool.query(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM asset_assignments
            WHERE asset_id = $1
          ) AS has_assignments,

          EXISTS (
            SELECT 1
            FROM asset_movements
            WHERE asset_id = $1
          ) AS has_movements,

          EXISTS (
            SELECT 1
            FROM asset_exit_records
            WHERE asset_id = $1
          ) AS has_exit_records,

          EXISTS (
            SELECT 1
            FROM asset_maintenance
            WHERE asset_id = $1
          ) AS has_maintenance
      `,
      [id]
    );

    const history = historyResult.rows[0];

    const hasHistory =
      history.has_assignments ||
      history.has_movements ||
      history.has_exit_records ||
      history.has_maintenance;

    if (hasHistory) {
      return res.status(409).json({
        success: false,
        message:
          "This asset cannot be permanently deleted because it has transaction history. Mark it as RETIRED or DISPOSED instead.",
      });
    }

    //Delete Asset
    

    const deletedAsset = await deleteAsset(id);

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully",
      asset: deletedAsset,
    });
  } catch (error) {
    console.error("Delete asset error:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This asset cannot be deleted because it has related records",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get assets assigned to the authenticated staff member
const getMyAssets = async (req, res) => {
  try {
    const userId = req.user.id;

    const assets = await getMyAssetsByUserId(userId);

    return res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error("Get my assets error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Get assets within the authenticated HOD's department
const getDepartmentAssets = async (req, res) => {
  try {
    const userId = req.user.id;

    const assets = await getAssetsByHodDepartment(userId);

    return res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error("Get department assets error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Get assets within the authenticated HOU's unit
const getUnitAssets = async (req, res) => {
  try {
    const userId = req.user.id;

    const assets = await getAssetsByHouUnit(userId);

    return res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error("Get unit assets error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
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
  getByTag,
  update,
  remove,
  updateStatus,
  allocateLocation,
  getDepartmentAssets,
  getUnitAssets,
  getMyAssets,
};