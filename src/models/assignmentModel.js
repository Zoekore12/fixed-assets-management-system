const pool = require("../config/database");

// Get active assignment for an asset
const getActiveAssignment = async (assetId) => {
  const result = await pool.query(
    `
      SELECT
        aa.id,
        aa.asset_id,
        aa.user_id,
        aa.assigned_by,
        aa.assigned_at,
        aa.returned_at,
        aa.status,
        aa.notes,

        u.name AS user_name,
        u.email AS user_email,

        assigned_by_user.name AS assigned_by_name

      FROM asset_assignments aa

      JOIN users u
        ON u.id = aa.user_id

      JOIN users assigned_by_user
        ON assigned_by_user.id = aa.assigned_by

      WHERE aa.asset_id = $1
        AND aa.status = 'ACTIVE'

      LIMIT 1
    `,
    [assetId]
  );

  return result.rows[0];
};

// Get assignment history for an asset
const getAssetAssignmentHistory = async (assetId) => {
  const result = await pool.query(
    `
      SELECT
        aa.id,
        aa.asset_id,
        aa.user_id,
        aa.assigned_by,
        aa.assigned_at,
        aa.returned_at,
        aa.status,
        aa.notes,

        u.name AS user_name,
        u.email AS user_email,

        assigned_by_user.name AS assigned_by_name

      FROM asset_assignments aa

      JOIN users u
        ON u.id = aa.user_id

      JOIN users assigned_by_user
        ON assigned_by_user.id = aa.assigned_by

      WHERE aa.asset_id = $1

      ORDER BY aa.created_at DESC
    `,
    [assetId]
  );

  return result.rows;
};

//get all assignment

const getAllAssignments = async () => {
  const result = await pool.query(
    `
      SELECT
        aa.id AS assignment_id,
        aa.asset_id,
        aa.user_id,
        aa.assigned_by,
        aa.assigned_at,
        aa.returned_at,
        aa.status AS assignment_status,
        aa.notes,
        aa.movement_id,

        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,

        assigned_user.name AS assigned_to_name,
        assigned_user.email AS assigned_to_email,

        assigning_user.name AS assigned_by_name,

        b.name AS building_name,
        d.name AS department_name,
        un.name AS unit_name

      FROM asset_assignments aa

      JOIN assets a
        ON a.id = aa.asset_id

      JOIN users assigned_user
        ON assigned_user.id = aa.user_id

      LEFT JOIN users assigning_user
        ON assigning_user.id = aa.assigned_by

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units un
        ON un.id = a.unit_id

      ORDER BY aa.assigned_at DESC
    `
  );

  return result.rows;
};

// Get active asset assignments belonging to a Staff member
const getMyActiveAssignments = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        aa.id AS assignment_id,
        aa.asset_id,
        aa.user_id,
        aa.assigned_by,
        aa.assigned_at,
        aa.returned_at,
        aa.status AS assignment_status,
        aa.notes,
        aa.movement_id,

        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,
        a.condition AS asset_condition,
        a.serial_number,
        a.brand,
        a.model,

        assigned_user.name AS assigned_to_name,
        assigned_user.email AS assigned_to_email,

        assigning_user.name AS assigned_by_name,

        b.name AS building_name,
        d.name AS department_name,
        un.name AS unit_name

      FROM asset_assignments aa

      JOIN assets a
        ON a.id = aa.asset_id

      JOIN users assigned_user
        ON assigned_user.id = aa.user_id

      LEFT JOIN users assigning_user
        ON assigning_user.id = aa.assigned_by

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units un
        ON un.id = a.unit_id

      WHERE aa.user_id = $1
        AND aa.status = 'ACTIVE'

      ORDER BY aa.assigned_at DESC
    `,
    [userId]
  );

  return result.rows;
};


// Get active asset assignments for staff in an HOD's department
const getActiveAssignmentsByDepartment = async (hodUserId) => {
  const result = await pool.query(
    `
      SELECT
        aa.id AS assignment_id,
        aa.asset_id,
        aa.user_id,
        aa.assigned_by,
        aa.assigned_at,
        aa.returned_at,
        aa.status AS assignment_status,
        aa.notes,
        aa.movement_id,

        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,
        a.condition AS asset_condition,
        a.serial_number,
        a.brand,
        a.model,

        assigned_user.name AS assigned_to_name,
        assigned_user.email AS assigned_to_email,

        assigning_user.name AS assigned_by_name,

        b.name AS building_name,
        d.name AS department_name,
        un.name AS unit_name

      FROM asset_assignments aa

      JOIN assets a
        ON a.id = aa.asset_id

      JOIN users assigned_user
        ON assigned_user.id = aa.user_id

      LEFT JOIN users assigning_user
        ON assigning_user.id = aa.assigned_by

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units un
        ON un.id = a.unit_id

      WHERE aa.status = 'ACTIVE'
        AND assigned_user.department_id = (
          SELECT department_id
          FROM users
          WHERE id = $1
        )

      ORDER BY aa.assigned_at DESC
    `,
    [hodUserId]
  );

  return result.rows;
};


// Get active asset assignments for staff in an HOU's unit
const getActiveAssignmentsByUnit = async (houUserId) => {
  const result = await pool.query(
    `
      SELECT
        aa.id AS assignment_id,
        aa.asset_id,
        aa.user_id,
        aa.assigned_by,
        aa.assigned_at,
        aa.returned_at,
        aa.status AS assignment_status,
        aa.notes,
        aa.movement_id,

        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,
        a.condition AS asset_condition,
        a.serial_number,
        a.brand,
        a.model,

        assigned_user.name AS assigned_to_name,
        assigned_user.email AS assigned_to_email,

        assigning_user.name AS assigned_by_name,

        b.name AS building_name,
        d.name AS department_name,
        un.name AS unit_name

      FROM asset_assignments aa

      JOIN assets a
        ON a.id = aa.asset_id

      JOIN users assigned_user
        ON assigned_user.id = aa.user_id

      LEFT JOIN users assigning_user
        ON assigning_user.id = aa.assigned_by

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units un
        ON un.id = a.unit_id

      WHERE aa.status = 'ACTIVE'
        AND assigned_user.unit_id = (
          SELECT unit_id
          FROM users
          WHERE id = $1
        )

      ORDER BY aa.assigned_at DESC
    `,
    [houUserId]
  );

  return result.rows;
};



module.exports = {
  getActiveAssignment,
  getAssetAssignmentHistory,
  getAllAssignments,
  getMyActiveAssignments,
  getActiveAssignmentsByDepartment,
  getActiveAssignmentsByUnit
};