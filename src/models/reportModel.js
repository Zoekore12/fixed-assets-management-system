const pool = require("../config/database");

const getAssetReport = async ({
  buildingId = null,
  departmentId = null,
  unitId = null,
  categoryId = null,
  status = null,
  condition = null,
  isActive = null,
  userId = null,
}) => {
  const values = [];
  const conditions = [];

  if (buildingId) {
    values.push(buildingId);
    conditions.push(`a.building_id = $${values.length}`);
  }

  if (departmentId) {
    values.push(departmentId);
    conditions.push(`a.department_id = $${values.length}`);
  }

  if (unitId) {
    values.push(unitId);
    conditions.push(`a.unit_id = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`a.category_id = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (condition) {
    values.push(condition);
    conditions.push(`a.condition = $${values.length}`);
  }

  if (isActive !== null) {
    values.push(isActive);
    conditions.push(`a.is_active = $${values.length}`);
  }
  if (isActive !== null) {
  values.push(isActive);
  conditions.push(`a.is_active = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.asset_tag,
        a.name,
        a.serial_number,
        a.brand,
        a.model,
        a.status,
        a.condition,
        a.purchase_date,
        a.purchase_cost,
        a.supplier,
        a.is_active,
        a.created_at,
        a.updated_at,

        b.id AS building_id,
        b.name AS building_name,

        d.id AS department_id,
        d.name AS department_name,

        u.id AS unit_id,
        u.name AS unit_name,

        ac.id AS category_id,
        ac.name AS category_name

      FROM assets a

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units u
        ON u.id = a.unit_id

      LEFT JOIN asset_categories ac
        ON ac.id = a.category_id

      ${whereClause}

      ORDER BY a.created_at DESC
    `,
    values
  );

  return result.rows;
};

const getMovementReport = async ({
  buildingId = null,
  departmentId = null,
  unitId = null,
  movementStatus = null,
  movementType = null,
  fromDate = null,
  toDate = null,
  userId = null,
}) => {
  const values = [];
  const conditions = [];

  if (buildingId) {
    values.push(buildingId);
    conditions.push(`
      (
        am.from_building_id = $${values.length}
        OR
        am.to_building_id = $${values.length}
      )
    `);
  }

  if (departmentId) {
    values.push(departmentId);
    conditions.push(`
      (
        am.from_department_id = $${values.length}
        OR
        am.to_department_id = $${values.length}
      )
    `);
  }

  if (unitId) {
    values.push(unitId);
    conditions.push(`
      (
        am.from_unit_id = $${values.length}
        OR
        am.to_unit_id = $${values.length}
      )
    `);
  }

  if (movementStatus) {
    values.push(movementStatus);
    conditions.push(`am.movement_status = $${values.length}`);
  }

  if (movementType) {
    values.push(movementType);
    conditions.push(`am.movement_type = $${values.length}`);
  }

  if (fromDate) {
    values.push(fromDate);
    conditions.push(`am.created_at >= $${values.length}`);
  }

  if (toDate) {
    values.push(toDate);
    conditions.push(`
      am.created_at < ($${values.length}::date + INTERVAL '1 day')
    `);
  }
  if (userId) {
    values.push(userId);
    conditions.push(`
        (
        am.requested_by = $${values.length}
            OR am.moved_by = $${values.length}
        OR am.received_by = $${values.length}
        )
    `);
    }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await pool.query(
    `
      SELECT
        am.id,
        am.asset_id,
        am.movement_type,
        am.movement_status,
        am.reason,
        am.notes,

        am.requested_by,
        requester.name AS requested_by_name,

        am.moved_by,
        mover.name AS moved_by_name,

        am.authorized_by,
        authorizer.name AS authorized_by_name,

        am.mover_confirmed_at,
        am.security_verified_by,
        security.name AS security_verified_by_name,
        am.security_verified_at,

        am.building_checkin_by,
        checkin_user.name AS building_checkin_by_name,
        am.building_checkin_at,

        am.received_by,
        receiver.name AS received_by_name,
        am.received_at,

        am.from_building_id,
        from_building.name AS from_building_name,

        am.from_department_id,
        from_department.name AS from_department_name,

        am.from_unit_id,
        from_unit.name AS from_unit_name,

        am.to_building_id,
        to_building.name AS to_building_name,

        am.to_department_id,
        to_department.name AS to_department_name,

        am.to_unit_id,
        to_unit.name AS to_unit_name,

        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,

        am.created_at

      FROM asset_movements am

      INNER JOIN assets a
        ON a.id = am.asset_id

      LEFT JOIN users requester
        ON requester.id = am.requested_by

      LEFT JOIN users mover
        ON mover.id = am.moved_by

      LEFT JOIN users authorizer
        ON authorizer.id = am.authorized_by

      LEFT JOIN users security
        ON security.id = am.security_verified_by

      LEFT JOIN users checkin_user
        ON checkin_user.id = am.building_checkin_by

      LEFT JOIN users receiver
        ON receiver.id = am.received_by

      LEFT JOIN buildings from_building
        ON from_building.id = am.from_building_id

      LEFT JOIN departments from_department
        ON from_department.id = am.from_department_id

      LEFT JOIN units from_unit
        ON from_unit.id = am.from_unit_id

      LEFT JOIN buildings to_building
        ON to_building.id = am.to_building_id

      LEFT JOIN departments to_department
        ON to_department.id = am.to_department_id

      LEFT JOIN units to_unit
        ON to_unit.id = am.to_unit_id

      ${whereClause}

      ORDER BY am.created_at DESC
    `,
    values
  );

  return result.rows;
};

const getCheckoutReport = async ({
  buildingId = null,
  status = null,
  fromDate = null,
  toDate = null,
  userId = null,
}) => {
  const values = [];
  const conditions = [];

  if (buildingId) {
    values.push(buildingId);
    conditions.push(`a.building_id = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (fromDate) {
    values.push(fromDate);
    conditions.push(`eer.date_out >= $${values.length}`);
  }

  if (toDate) {
    values.push(toDate);
    conditions.push(`
      eer.date_out < ($${values.length}::date + INTERVAL '1 day')
    `);
  }
  if (userId) {
    values.push(userId);
    conditions.push(`eer.taken_by_user_id = $${values.length}`);
    }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await pool.query(
    `
      SELECT
        eer.id AS exit_record_id,

        a.id AS asset_id,
        a.asset_tag,
        a.name AS asset_name,
        a.serial_number,
        a.status AS asset_status,

        eer.taken_by_user_id,
        taken_by.name AS taken_by_name,
        taken_by.email AS taken_by_email,

        eer.destination,
        eer.reason,
        eer.expected_return_date,
        eer.date_out,
        eer.actual_return_date,
        eer.status AS exit_status,

        security.id AS security_officer_id,
        security.name AS security_officer_name,

        a.building_id,
        b.name AS building_name,

        a.department_id,
        d.name AS department_name,

        a.unit_id,
        u.name AS unit_name,

        eer.created_at,
        eer.updated_at

      FROM asset_exit_records eer

      INNER JOIN assets a
        ON a.id = eer.asset_id

      LEFT JOIN users taken_by
        ON taken_by.id = eer.taken_by_user_id

      LEFT JOIN users security
        ON security.id = eer.security_officer_id

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units u
        ON u.id = a.unit_id

      ${whereClause}

      ORDER BY eer.date_out DESC
    `,
    values
  );

  return result.rows;
};

const getMaintenanceReport = async ({
  buildingId = null,
  departmentId = null,
  unitId = null,
  maintenanceStatus = null,
  maintenanceType = null,
  fromDate = null,
  toDate = null,
  userId = null,
}) => {
  const values = [];
  const conditions = [];

  if (buildingId) {
    values.push(buildingId);
    conditions.push(`a.building_id = $${values.length}`);
  }

  if (departmentId) {
    values.push(departmentId);
    conditions.push(`a.department_id = $${values.length}`);
  }

  if (unitId) {
    values.push(unitId);
    conditions.push(`a.unit_id = $${values.length}`);
  }

  if (maintenanceStatus) {
    values.push(maintenanceStatus);
    conditions.push(`mr.status = $${values.length}`);
  }

  if (maintenanceType) {
    values.push(maintenanceType);
    conditions.push(`mr.maintenance_type = $${values.length}`);
  }

  if (fromDate) {
    values.push(fromDate);
    conditions.push(`mr.created_at >= $${values.length}`);
  }

  if (toDate) {
    values.push(toDate);
    conditions.push(`
      mr.created_at < ($${values.length}::date + INTERVAL '1 day')
    `);
  }
  if (userId) {
    values.push(userId);
    conditions.push(`a.current_holder_id = $${values.length}`);
    }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await pool.query(
    `
      SELECT
        mr.id AS maintenance_id,

        a.id AS asset_id,
        a.asset_tag,
        a.name AS asset_name,
        a.serial_number,
        a.status AS asset_status,

        mr.maintenance_type,
        mr.description,
        mr.service_provider,
        mr.cost,
        mr.status AS maintenance_status,
        mr.notes,

        mr.created_by,
        creator.name AS created_by_name,
        creator.email AS created_by_email,

        mr.created_at,
        mr.completed_at,
        mr.updated_at,

        a.building_id,
        b.name AS building_name,

        a.department_id,
        d.name AS department_name,

        a.unit_id,
        u.name AS unit_name

      FROM asset_maintenance mr

      INNER JOIN assets a
        ON a.id = mr.asset_id

      LEFT JOIN users creator
        ON creator.id = mr.created_by

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units u
        ON u.id = a.unit_id

      ${whereClause}

      ORDER BY mr.created_at DESC
    `,
    values
  );

  return result.rows;
};

const getAuditReport = async ({
  userId = null,
  action = null,
  entityType = null,
  entityId = null,
  fromDate = null,
  toDate = null,
}) => {
  const values = [];
  const conditions = [];

  if (userId) {
    values.push(userId);
    conditions.push(`al.user_id = $${values.length}`);
  }

  if (action) {
    values.push(action);
    conditions.push(`al.action = $${values.length}`);
  }

  if (entityType) {
    values.push(entityType);
    conditions.push(`al.entity_type = $${values.length}`);
  }

  if (entityId) {
    values.push(entityId);
    conditions.push(`al.entity_id = $${values.length}`);
  }

  if (fromDate) {
    values.push(fromDate);
    conditions.push(`al.created_at >= $${values.length}`);
  }

  if (toDate) {
    values.push(toDate);
    conditions.push(`
      al.created_at < ($${values.length}::date + INTERVAL '1 day')
    `);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await pool.query(
    `
      SELECT
        al.id,
        al.user_id,

        u.name AS user_name,
        u.email AS user_email,

        al.action,
        al.entity_type,
        al.entity_id,

        al.old_data,
        al.new_data,

        al.description,
        al.ip_address,
        al.user_agent,
        al.created_at

      FROM audit_logs al

      LEFT JOIN users u
        ON u.id = al.user_id

      ${whereClause}

      ORDER BY al.created_at DESC
    `,
    values
  );

  return result.rows;
};

module.exports = {
  getAssetReport,
  getMovementReport,
  getCheckoutReport,
  getMaintenanceReport,
  getAuditReport,
};