const pool = require("../config/database");

const createUnit = async ({
  department_id,
  name,
  code,
  description = null,
}) => {
  const result = await pool.query(
    `
      INSERT INTO units (
        department_id,
        name,
        code,
        description
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        department_id,
        name,
        code,
        description,
        created_at,
        updated_at
    `,
    [department_id, name, code, description]
  );

  return result.rows[0];
};

const getAllUnits = async (departmentId = null) => {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.department_id,
        u.name,
        u.code,
        u.description,
        u.created_at,
        u.updated_at,

        d.name AS department_name,
        d.code AS department_code,

        b.id AS building_id,
        b.name AS building_name,
        b.code AS building_code

      FROM units u

      JOIN departments d
        ON d.id = u.department_id

      JOIN buildings b
        ON b.id = d.building_id

      WHERE (
        $1::uuid IS NULL
        OR u.department_id = $1
      )

      ORDER BY
        b.name ASC,
        d.name ASC,
        u.name ASC
    `,
    [departmentId]
  );

  return result.rows;
};

const getUnitById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.department_id,
        u.name,
        u.code,
        u.description,
        u.created_at,
        u.updated_at,

        d.name AS department_name,
        d.code AS department_code,

        b.id AS building_id,
        b.name AS building_name,
        b.code AS building_code

      FROM units u

      JOIN departments d
        ON d.id = u.department_id

      JOIN buildings b
        ON b.id = d.building_id

      WHERE u.id = $1

      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const updateUnit = async (
  id,
  {
    department_id,
    name,
    code,
    description,
  }
) => {
  const result = await pool.query(
    `
      UPDATE units
      SET
        department_id = $1,
        name = $2,
        code = $3,
        description = $4,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $5

      RETURNING
        id,
        department_id,
        name,
        code,
        description,
        created_at,
        updated_at
    `,
    [
      department_id,
      name,
      code,
      description,
      id,
    ]
  );

  return result.rows[0];
};

const deleteUnit = async (id) => {
  const result = await pool.query(
    `
      DELETE FROM units
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  createUnit,
  getAllUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
};