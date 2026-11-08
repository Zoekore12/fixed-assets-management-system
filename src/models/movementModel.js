const pool = require("../config/database");

/**
 * Create a transfer/movement record
 */
const createAssetMovement = async (
  {
    assetId,
    fromBuildingId,
    fromDepartmentId,
    fromUnitId,
    toBuildingId,
    toDepartmentId,
    toUnitId,
    requestedBy,
    movedBy = null,
    authorizedBy = null,
    movementType = "TRANSFER",
    reason = null,
    notes = null,
    movementStatus = "PENDING",
  },
  client = pool
) => {
  const result = await client.query(
    `
      INSERT INTO asset_movements (
        asset_id,
        from_building_id,
        from_department_id,
        from_unit_id,
        to_building_id,
        to_department_id,
        to_unit_id,
        requested_by,
        moved_by,
        authorized_by,
        movement_type,
        reason,
        notes,
        movement_status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14
        )
      RETURNING *
    `,
    [
      assetId,             
      fromBuildingId,      
      fromDepartmentId,    
      fromUnitId,          
      toBuildingId,        
      toDepartmentId,      
      toUnitId,             
      requestedBy,          
      movedBy,             
      authorizedBy,         
      movementType,         
      reason,               
      notes,               
      movementStatus,      
    ]
  );

  return result.rows[0];
};

/**
 * Get a movement by ID
 */
const getAssetMovementById = async (movementId, client = pool) => {
  const result = await client.query(
    `
      SELECT
        am.*,

        -- Asset
        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,

        -- Users
        requester.name AS requested_by_name,
        mover.name AS moved_by_name,
        approver.name AS authorized_by_name,
        security_user.name AS security_verified_by_name,
        checkin_user.name AS building_checkin_by_name,
        receiver.name AS received_by_name,

        -- Origin
        fb.name AS from_building_name,
        fd.name AS from_department_name,
        fu.name AS from_unit_name,

        -- Destination
        tb.name AS to_building_name,
        td.name AS to_department_name,
        tu.name AS to_unit_name

      FROM asset_movements am

      -- Asset
      JOIN assets a
        ON a.id = am.asset_id

      -- Requester
      LEFT JOIN users requester
        ON requester.id = am.requested_by

      -- Assigned mover
      LEFT JOIN users mover
        ON mover.id = am.moved_by

      -- Approver
      LEFT JOIN users approver
        ON approver.id = am.authorized_by

      -- Origin Security officer
      LEFT JOIN users security_user
        ON security_user.id = am.security_verified_by

      -- Destination Security officer
      LEFT JOIN users checkin_user
        ON checkin_user.id = am.building_checkin_by

      -- Receiver
      LEFT JOIN users receiver
        ON receiver.id = am.received_by

      -- Origin location
      LEFT JOIN buildings fb
        ON fb.id = am.from_building_id

      LEFT JOIN departments fd
        ON fd.id = am.from_department_id

      LEFT JOIN units fu
        ON fu.id = am.from_unit_id

      -- Destination location
      LEFT JOIN buildings tb
        ON tb.id = am.to_building_id

      LEFT JOIN departments td
        ON td.id = am.to_department_id

      LEFT JOIN units tu
        ON tu.id = am.to_unit_id

      WHERE am.id = $1
      LIMIT 1
    `,
    [movementId]
  );

  return result.rows[0] || null;
};

/**
 * Get pending transfers
 */
const getPendingMovements = async (client = pool) => {
  const result = await client.query(
    `
      SELECT
        am.*,

        a.asset_tag,
        a.name AS asset_name,

        requester.name AS requested_by_name,
        mover.name AS moved_by_name,

        fb.name AS from_building_name,
        fd.name AS from_department_name,
        fu.name AS from_unit_name,

        tb.name AS to_building_name,
        td.name AS to_department_name,
        tu.name AS to_unit_name

      FROM asset_movements am

      JOIN assets a
        ON a.id = am.asset_id

      LEFT JOIN users mover 
      ON mover.id = am.moved_by

      LEFT JOIN users requester 
      ON requester.id = am.requested_by

      LEFT JOIN buildings fb
        ON fb.id = am.from_building_id

      LEFT JOIN departments fd
        ON fd.id = am.from_department_id

      LEFT JOIN units fu
        ON fu.id = am.from_unit_id

      LEFT JOIN buildings tb
        ON tb.id = am.to_building_id

      LEFT JOIN departments td
        ON td.id = am.to_department_id

      LEFT JOIN units tu
        ON tu.id = am.to_unit_id

      WHERE am.movement_status = 'PENDING'

      ORDER BY am.created_at DESC
    `
  );

  return result.rows;
};

/**
 * Update movement status
 */
const updateMovementStatus = async (
  movementId,
  status,
  client = pool
) => {
  const result = await client.query(
    `
      UPDATE asset_movements
      SET
        movement_status = $1
      WHERE id = $2
      RETURNING *
    `,
    [status, movementId]
  );

  return result.rows[0] || null;
};


/**
 * Get all asset movements
 */
const getAllAssetMovements = async (client = pool) => {
  const result = await client.query(
    `
      SELECT
        am.*,
        a.asset_tag,
        a.name AS asset_name,
        requester.name AS requested_by_name,
        mover.name AS moved_by_name,
        approver.name AS authorized_by_name,
        fb.name AS from_building_name,
        fd.name AS from_department_name,
        fu.name AS from_unit_name,
        tb.name AS to_building_name,
        td.name AS to_department_name,
        tu.name AS to_unit_name
      FROM asset_movements am
      JOIN assets a
        ON a.id = am.asset_id
      LEFT JOIN users requester
        ON requester.id = am.requested_by
      LEFT JOIN users mover
        ON mover.id = am.moved_by
      LEFT JOIN users approver
        ON approver.id = am.authorized_by
      LEFT JOIN buildings fb
        ON fb.id = am.from_building_id
      LEFT JOIN departments fd
        ON fd.id = am.from_department_id
      LEFT JOIN units fu
        ON fu.id = am.from_unit_id
      LEFT JOIN buildings tb
        ON tb.id = am.to_building_id
      LEFT JOIN departments td
        ON td.id = am.to_department_id
      LEFT JOIN units tu
        ON tu.id = am.to_unit_id
      ORDER BY am.created_at DESC
    `
  );

  return result.rows;
};


/**
 * Get asset movements visible to the authenticated user.
 *
 * Administrator: all movements.
 * HOD: movements involving their department.
 * HOU: movements involving their unit.
 * SECURITY: movements relevant to their security station/building.
 * GENERAL Staff: movements they requested, moved, or received.
 */
const getMovementsForUser = async (user) => {
  const {
    id: userId,
    role,
    staffType,
    buildingId,
    departmentId,
    unitId,
    stationId,
  } = user;
  

  let whereClause;
  const values = [];

  // Administrator: can view all movement records.
  if (role === "Administrator") {
    whereClause = "TRUE";
  }

  // HOD: movements involving their department.
  else if (role === "HOD") {
    let hodDepartmentId = departmentId;

    if (!hodDepartmentId) {
      const result = await pool.query(
        `
          SELECT department_id
          FROM users
          WHERE id = $1
            AND role = 'HOD'
            AND is_active = TRUE
        `,
        [userId]
      );

      hodDepartmentId = result.rows[0]?.department_id;
    }

    if (!hodDepartmentId) {
      throw new Error(
        "No department is assigned to this HOD account."
      );
    }

    values.push(hodDepartmentId);

    whereClause = `
      (
        am.from_department_id = $1
        OR am.to_department_id = $1
      )
    `;
  }

  // HOU: movements involving their unit.
  else if (role === "HOU") {
    let houUnitId = unitId;


    if (!houUnitId) {
      const result = await pool.query(
        `
          SELECT unit_id
          FROM users
          WHERE id = $1
            AND role = 'HOU'
            AND is_active = TRUE
        `,
        [userId]
      );
      houUnitId = result.rows[0]?.unit_id;
    }

     if (!houUnitId) {
      throw new Error(
        "No unit is assigned to this HOU account."
      );
    }


    values.push(houUnitId);

    whereClause = `
      (
        am.from_unit_id = $1
        OR am.to_unit_id = $1
      )
    `;
  }

  // Security staff: movements involving their station/building.
  else if (staffType === "SECURITY") {
    if (!stationId && !buildingId) {
      throw new Error(
        "Security station or building scope is missing."
      );
    }

    if (stationId) {
      values.push(stationId);

      whereClause = `
        EXISTS (
          SELECT 1
          FROM security_stations s
          WHERE s.id = $1
            AND (
              s.building_id = am.from_building_id
              OR s.building_id = am.to_building_id
            )
        )
      `;
    } else {
      values.push(buildingId);

      whereClause = `
        (
          am.from_building_id = $1
          OR am.to_building_id = $1
        )
      `;
    }
  }
  // General Staff: view movements they requested or are assigned to move.
    else if (role === "Staff" && staffType === "GENERAL") {
    values.push(userId);

    whereClause = `
      (
        am.requested_by = $1
        OR am.moved_by = $1
      )
    `;
  }

  // Reject unsupported roles.
  else {
    throw new Error(
      "You are not authorized to view these movement records."
    );
  }

  const result = await pool.query(
    `
      SELECT
        am.*,
        a.asset_tag,
        a.name AS asset_name,
        a.status AS asset_status,

        requester.name AS requested_by_name,
        mover.name AS moved_by_name,
        approver.name AS authorized_by_name,
        receiver.name AS received_by_name,

        fb.name AS from_building_name,
        fd.name AS from_department_name,
        fu.name AS from_unit_name,

        tb.name AS to_building_name,
        td.name AS to_department_name,
        tu.name AS to_unit_name

      FROM asset_movements am

      JOIN assets a
        ON a.id = am.asset_id

      LEFT JOIN users requester
        ON requester.id = am.requested_by

      LEFT JOIN users mover
        ON mover.id = am.moved_by

      LEFT JOIN users approver
        ON approver.id = am.authorized_by

      LEFT JOIN users receiver
        ON receiver.id = am.received_by

      LEFT JOIN buildings fb
        ON fb.id = am.from_building_id

      LEFT JOIN departments fd
        ON fd.id = am.from_department_id

      LEFT JOIN units fu
        ON fu.id = am.from_unit_id

      LEFT JOIN buildings tb
        ON tb.id = am.to_building_id

      LEFT JOIN departments td
        ON td.id = am.to_department_id

      LEFT JOIN units tu
        ON tu.id = am.to_unit_id

      WHERE ${whereClause}

      ORDER BY am.created_at DESC
    `,
    values
  );

  return result.rows;
};
/**
 * Get a single movement, only if the user is allowed to see it.
 */
const getMovementForUser = async (movementId, user) => {
  const movements = await getMovementsForUser(user);

  return (
    movements.find(
      (movement) => movement.id === movementId
    ) || null
  );
};






module.exports = {
  createAssetMovement,
  getAssetMovementById,
  getPendingMovements,
  updateMovementStatus,
  getAllAssetMovements,
  getMovementsForUser,
  getMovementForUser,
};