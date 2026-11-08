const pool = require("../config/database");

const createBuilding = async ({
  name,
  code,
  address = null,
  description = null,
}) => {
  const result = await pool.query(
    `
      INSERT INTO buildings (
        name,
        code,
        address,
        description
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        name,
        code,
        address,
        description,
        created_at,
        updated_at
    `,
    [name, code, address, description]
  );

  return result.rows[0];
};

const getAllBuildings = async () => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        code,
        address,
        description,
        created_at,
        updated_at
      FROM buildings
      ORDER BY name ASC
    `
  );

  return result.rows;
};

const getBuildingById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        code,
        address,
        description,
        created_at,
        updated_at
      FROM buildings
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const updateBuilding = async (
  id,
  { name, code, address, description }
) => {
  const result = await pool.query(
    `
      UPDATE buildings
      SET
        name = $1,
        code = $2,
        address = $3,
        description = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING
        id,
        name,
        code,
        address,
        description,
        created_at,
        updated_at
    `,
    [name, code, address, description, id]
  );

  return result.rows[0];
};

const deleteBuilding = async (id) => {
  const result = await pool.query(
    `
      DELETE FROM buildings
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  createBuilding,
  getAllBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
};