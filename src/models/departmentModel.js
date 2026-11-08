
const pool = require("../config/database");

const createDepartment = async ({
  building_id,
  name,
  code,
  description = null,
}) => {
  const result = await pool.query(
    `
      INSERT INTO departments (
        building_id,
        name,
        code,
        description
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        building_id,
        name,
        code,
        description,
        created_at,
        updated_at
    `,
    [building_id, name, code, description]
  );

  return result.rows[0];
};

const getAllDepartments = async (buildingId = null) => {
  const result = await pool.query(
    `
      SELECT
        d.id,
        d.building_id,
        d.name,
        d.code,
        d.description,
        d.created_at,
        d.updated_at,
        b.name AS building_name,
        b.code AS building_code
      FROM departments d
      JOIN buildings b ON b.id = d.building_id
      WHERE ($1::uuid IS NULL OR d.building_id = $1)
      ORDER BY b.name ASC, d.name ASC
    `,
    [buildingId]
  );

  return result.rows;
};

const getDepartmentById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        d.id,
        d.building_id,
        d.name,
        d.code,
        d.description,
        d.created_at,
        d.updated_at,
        b.name AS building_name,
        b.code AS building_code
      FROM departments d
      JOIN buildings b ON b.id = d.building_id
      WHERE d.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const updateDepartment = async (
  id,
  { building_id, name, code, description }
) => {
  const result = await pool.query(
    `
      UPDATE departments
      SET
        building_id = $1,
        name = $2,
        code = $3,
        description = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING
        id,
        building_id,
        name,
        code,
        description,
        created_at,
        updated_at
    `,
    [building_id, name, code, description, id]
  );

  return result.rows[0];
};

const deleteDepartment = async (id) => {
  const result = await pool.query(
    `
      DELETE FROM departments
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};