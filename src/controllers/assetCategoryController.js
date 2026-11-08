const {createCategory,getAllCategories,getCategoryById,updateCategory,deleteCategory,} = require("../models/assetCategoryModel");

const { validate: isUuid } = require("uuid");

const create = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await createCategory({
      name: name.trim(),
      description:
        typeof description === "string"
          ? description.trim() || null
          : null,
    });

    return res.status(201).json({
      success: true,
      message: "Asset category created successfully",
      category,
    });
  } catch (error) {
    console.error(
      "Create asset category error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Asset category already exists",
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
    const categories = await getAllCategories();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error(
      "Get asset categories error:",
      error
    );

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
        message: "Invalid category ID",
      });
    }

    const category = await getCategoryById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Asset category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(
      "Get asset category error:",
      error
    );

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
        message: "Invalid category ID",
      });
    }

    const { name, description } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await updateCategory(id, {
      name: name.trim(),
      description:
        typeof description === "string"
          ? description.trim() || null
          : null,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Asset category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Asset category updated successfully",
      category,
    });
  } catch (error) {
    console.error(
      "Update asset category error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Asset category already exists",
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
        message: "Invalid category ID",
      });
    }

    const category = await deleteCategory(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Asset category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Asset category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete asset category error:",
      error
    );

    // Category is referenced by an asset
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "Category cannot be deleted because assets are using it",
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