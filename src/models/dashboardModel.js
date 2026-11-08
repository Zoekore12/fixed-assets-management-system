const pool = require("../config/database");

const getDashboardSummary = async () => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM assets) AS total_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'AVAILABLE') AS available_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'ASSIGNED') AS assigned_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'OUT') AS assets_out,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'IN_TRANSIT') AS assets_in_transit,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'MAINTENANCE') AS assets_in_maintenance,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'LOST') AS lost_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'DAMAGED') AS damaged_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'OBSOLETE') AS obsolete_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'RETIRED') AS retired_assets,

      (SELECT COUNT(*) FROM assets
       WHERE status = 'DISPOSED') AS disposed_assets,

      (SELECT COUNT(*) FROM buildings) AS total_buildings,

      (SELECT COUNT(*) FROM departments) AS total_departments,

      (SELECT COUNT(*) FROM units) AS total_units,

      (SELECT COUNT(*) FROM users
       WHERE is_active = true) AS active_users
  `);

  return result.rows[0];
};

const getDepartmentDashboard = async (departmentId) => {
  const result = await pool.query(
    `
      SELECT
        -- Asset statistics
        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1) AS total_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'AVAILABLE') AS available_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'ASSIGNED') AS assigned_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'OUT') AS assets_out,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'IN_TRANSIT') AS assets_in_transit,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'MAINTENANCE') AS assets_in_maintenance,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'LOST') AS lost_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'DAMAGED') AS damaged_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'OBSOLETE') AS obsolete_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'RETIRED') AS retired_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE department_id = $1
         AND status = 'DISPOSED') AS disposed_assets,

        -- Department users
        (SELECT COUNT(*)
         FROM users
         WHERE department_id = $1
         AND is_active = true) AS active_users,

        -- Transfers waiting for authorization
        (SELECT COUNT(*)
         FROM asset_movements
         WHERE to_department_id = $1
         AND requested_by IS NOT NULL
         AND authorized_by IS NULL
         AND movement_status NOT IN ('COMPLETED')) AS pending_transfers,

        -- Transfers currently arriving at the department
        (SELECT COUNT(*)
         FROM asset_movements
         WHERE to_department_id = $1
         AND movement_status = 'ARRIVED') AS arrived_transfers,

        -- Completed transfers involving the department
        (SELECT COUNT(*)
         FROM asset_movements
         WHERE (
           from_department_id = $1
           OR to_department_id = $1
         )
         AND movement_status = 'COMPLETED') AS completed_transfers
    `,
    [departmentId]
  );

  return result.rows[0];
};

const getUserDashboardScope = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        role,
        staff_type,
        department_id,
        unit_id
      FROM users
      WHERE id = $1
      AND is_active = true
    `,
    [userId]
  );

  return result.rows[0];
};

const getUnitDashboard = async (unitId) => {
  const result = await pool.query(
    `
      SELECT
        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1) AS total_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'AVAILABLE') AS available_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'ASSIGNED') AS assigned_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'OUT') AS assets_out,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'IN_TRANSIT') AS assets_in_transit,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'MAINTENANCE') AS assets_in_maintenance,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'LOST') AS lost_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'DAMAGED') AS damaged_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'OBSOLETE') AS obsolete_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'RETIRED') AS retired_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE unit_id = $1
         AND status = 'DISPOSED') AS disposed_assets,

        (SELECT COUNT(*)
         FROM users
         WHERE unit_id = $1
         AND is_active = true) AS active_users,

        (SELECT COUNT(*)
         FROM asset_movements
         WHERE to_unit_id = $1
         AND requested_by IS NOT NULL
         AND authorized_by IS NULL
         AND movement_status NOT IN ('COMPLETED')) AS pending_transfers,

        (SELECT COUNT(*)
         FROM asset_movements
         WHERE to_unit_id = $1
         AND movement_status = 'ARRIVED') AS arrived_transfers,

        (SELECT COUNT(*)
         FROM asset_movements
         WHERE (
           from_unit_id = $1
           OR to_unit_id = $1
         )
         AND movement_status = 'COMPLETED') AS completed_transfers
    `,
    [unitId]
  );

  return result.rows[0];
};

const getSecurityDashboard = async () => {
  const result = await pool.query(`
    SELECT
      (
        SELECT COUNT(*)
        FROM assets
        WHERE status = 'OUT'
      ) AS assets_out,

      (
        SELECT COUNT(*)
        FROM assets
        WHERE status = 'IN_TRANSIT'
      ) AS assets_in_transit,

      (
        SELECT COUNT(*)
        FROM assets
        WHERE status = 'ASSIGNED'
      ) AS assigned_assets,

      (
        SELECT COUNT(*)
        FROM asset_exit_records
        WHERE date_out IS NOT NULL
        AND actual_return_date IS NULL
      ) AS pending_returns,

      (
        SELECT COUNT(*)
        FROM asset_movements
        WHERE security_verified_by IS NULL
        AND movement_status NOT IN ('COMPLETED')
      ) AS pending_security_verification,

      (
        SELECT COUNT(*)
        FROM asset_movements
        WHERE security_verified_by IS NOT NULL
        AND movement_status = 'ARRIVED'
      ) AS verified_transfers
  `);

  return result.rows[0];
};

const getStaffDashboard = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        (SELECT COUNT(*)
         FROM assets
         WHERE current_holder_id = $1
         AND is_active = true) AS assigned_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE current_holder_id = $1
         AND status = 'OUT'
         AND is_active = true) AS assets_out,

        (SELECT COUNT(*)
         FROM assets
         WHERE current_holder_id = $1
         AND status = 'MAINTENANCE'
         AND is_active = true) AS assets_in_maintenance,

        (SELECT COUNT(*)
         FROM assets
         WHERE current_holder_id = $1
         AND status = 'DAMAGED'
         AND is_active = true) AS damaged_assets,

        (SELECT COUNT(*)
         FROM assets
         WHERE current_holder_id = $1
         AND status = 'LOST'
         AND is_active = true) AS lost_assets
    `,
    [userId]
  );

  return result.rows[0];
};

module.exports = {
  getDashboardSummary,
  getDepartmentDashboard,
  getUserDashboardScope,
  getUnitDashboard,
  getSecurityDashboard,
  getStaffDashboard,
};