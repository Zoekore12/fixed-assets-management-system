const pool = require("../config/database");

const createCategory = async ({
  name,
  description = null,
}) => {
  const result = await pool.query(
    `
      INSERT INTO asset_categories (
        name,
        description
      )
      VALUES ($1, $2)
      RETURNING
        id,
        name,
        description,
        created_at,
        updated_at
    `,
    [name, description]
  );

  return result.rows[0];
};

const getAllCategories = async () => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        created_at,
        updated_at
      FROM asset_categories
      ORDER BY name ASC
    `
  );

  return result.rows;
};

const getCategoryById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        created_at,
        updated_at
      FROM asset_categories
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const updateCategory = async (
  id,
  {
    name,
    description,
  }
) => {
  const result = await pool.query(
    `
      UPDATE asset_categories
      SET
        name = $1,
        description = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        name,
        description,
        created_at,
        updated_at
    `,
    [name, description, id]
  );

  return result.rows[0];
};

const deleteCategory = async (id) => {
  const result = await pool.query(
    `
      DELETE FROM asset_categories
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};