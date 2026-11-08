const pool = require("../config/database");

const  {createAuditLog} = require("../models/auditModel");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Generate the next permanent asset tag
const generateAssetTag = async () => {
  const result = await pool.query(
    `SELECT nextval('asset_tag_sequence') AS sequence_number`
  );

  const sequenceNumber = Number(result.rows[0].sequence_number);

  return `MIST-${String(sequenceNumber).padStart(6, "0")}`;
};

// Create asset
const createAsset = async ({
  assetTag,
  name,
  categoryId,
  serialNumber = null,
  brand = null,
  model = null,
  description = null,
  purchaseDate = null,
  purchaseCost = null,
  supplier = null,
  buildingId,
  departmentId= null,
  unitId = null,
  createdBy,
  ipAddress = null,
  userAgent = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create asset
    const result = await client.query(
      `
        INSERT INTO assets (
          asset_tag,
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
          unit_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13
        )
        RETURNING
          id,
          asset_tag,
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
          current_holder_id,
          status,
          condition,
          is_active,
          created_at,
          updated_at
      `,
      [
        assetTag,
        name,
        categoryId,
        serialNumber,
        brand,
        model,
        description,
        purchaseDate,
        purchaseCost,
        supplier,
        buildingId,
        departmentId,
        unitId,
      ]
    );

    const asset = result.rows[0];

    // Create audit log
    await createAuditLog({
      userId: createdBy,
      action: "CREATE",
      entityType: "ASSET",
      entityId: asset.id,
      oldData: null,
      newData: asset,
      description: `Asset ${asset.asset_tag} was created`,
      ipAddress,
      userAgent,
      client,
    });

    await client.query("COMMIT");

    return asset;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Get all assets
const getAllAssets = async () => {
  const result = await pool.query(
    `
      SELECT
        a.id,
        a.asset_tag,
        a.name,

        a.category_id,
        c.name AS category_name,

        a.serial_number,
        a.brand,
        a.model,
        a.description,

        a.purchase_date,
        a.purchase_cost,
        a.supplier,

        a.building_id,
        b.name AS building_name,
        b.code AS building_code,

        a.department_id,
        d.name AS department_name,
        d.code AS department_code,

        a.unit_id,
        u.name AS unit_name,
        u.code AS unit_code,

        a.current_holder_id,
        holder.name AS current_holder_name,
        holder.email AS current_holder_email,

        a.status,
        a.condition,
        a.is_active,

        a.created_at,
        a.updated_at

      FROM assets a

      LEFT JOIN asset_categories c
        ON c.id = a.category_id

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units u
        ON u.id = a.unit_id

      LEFT JOIN users holder
        ON holder.id = a.current_holder_id

      ORDER BY a.created_at DESC
    `
  );

  return result.rows;
};

// Get asset by ID
const getAssetById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        a.id,
        a.asset_tag,
        a.name,

        a.category_id,
        c.name AS category_name,

        a.serial_number,
        a.brand,
        a.model,
        a.description,

        a.purchase_date,
        a.purchase_cost,
        a.supplier,

        a.building_id,
        b.name AS building_name,
        b.code AS building_code,

        a.department_id,
        d.name AS department_name,
        d.code AS department_code,

        a.unit_id,
        u.name AS unit_name,
        u.code AS unit_code,

        a.current_holder_id,
        holder.name AS current_holder_name,
        holder.email AS current_holder_email,

        a.status,
        a.condition,
        a.is_active,

        a.created_at,
        a.updated_at

      FROM assets a

      LEFT JOIN asset_categories c
        ON c.id = a.category_id

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units u
        ON u.id = a.unit_id

      LEFT JOIN users holder
        ON holder.id = a.current_holder_id

      WHERE a.id = $1

      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

// Get asset by permanent asset tag
const getAssetByTag = async (assetTag) => {
  const result = await pool.query(
    `
      SELECT
        a.id,
        a.asset_tag,
        a.name,

        a.category_id,
        c.name AS category_name,

        a.serial_number,
        a.brand,
        a.model,
        a.description,

        a.purchase_date,
        a.purchase_cost,
        a.supplier,

        a.building_id,
        b.name AS building_name,
        b.code AS building_code,

        a.department_id,
        d.name AS department_name,
        d.code AS department_code,

        a.unit_id,
        u.name AS unit_name,
        u.code AS unit_code,

        a.current_holder_id,
        holder.name AS current_holder_name,
        holder.email AS current_holder_email,

        a.status,
        a.condition,
        a.is_active,

        a.created_at,
        a.updated_at

      FROM assets a

      LEFT JOIN asset_categories c
        ON c.id = a.category_id

      LEFT JOIN buildings b
        ON b.id = a.building_id

      LEFT JOIN departments d
        ON d.id = a.department_id

      LEFT JOIN units u
        ON u.id = a.unit_id

      LEFT JOIN users holder
        ON holder.id = a.current_holder_id

      WHERE a.asset_tag = $1

      LIMIT 1
    `,
    [assetTag]
  );

  return result.rows[0];
};

// Update asset
const updateAsset = async (
  id,
  {
    name,
    categoryId,
    serialNumber,
    brand,
    model,
    description,
    purchaseDate,
    purchaseCost,
    supplier,
    buildingId,
    departmentId,
    unitId,
    condition,
    status,
  },
  updatedBy
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get the current asset
    const existingAssetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
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
          current_holder_id,
          current_security_station_id,
          status,
          condition,
          is_active,
          created_at,
          updated_at
        FROM assets
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingAssetResult.rows.length === 0) {
      throw new Error("Asset not found");
    }

    const oldAsset = existingAssetResult.rows[0];

    // 2. Update asset
    const result = await client.query(
      `
        UPDATE assets
        SET
          name = $1,
          category_id = $2,
          serial_number = $3,
          brand = $4,
          model = $5,
          description = $6,
          purchase_date = $7,
          purchase_cost = $8,
          supplier = $9,
          condition = $10,
          status = $11,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = $12

        RETURNING
          id,
          asset_tag,
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
          current_holder_id,
          current_security_station_id,
          status,
          condition,
          is_active,
          created_at,
          updated_at
      `,
      [
        name,
        categoryId,
        serialNumber,
        brand,
        model,
        description,
        purchaseDate,
        purchaseCost,
        supplier,
        condition,
        status,
        id,
      ]
    );

    const updatedAsset = result.rows[0];

    const locationChanged =
      oldAsset.building_id !== buildingId ||
      (oldAsset.department_id ?? null) !==
        (departmentId ?? null) ||
      (oldAsset.unit_id ?? null) !==
        (unitId ?? null);

    if (locationChanged) {
      throw createError(
        "Asset location cannot be changed through the normal update endpoint. Submit a transfer request instead.",
        409
      );
    }

    // 3. Audit asset update
    await createAuditLog({
      userId: updatedBy,
      action: "UPDATE_ASSET",
      entityType: "ASSET",
      entityId: updatedAsset.id,

      oldData: oldAsset,

      newData: updatedAsset,

      description: `Asset ${updatedAsset.asset_tag} was updated`,

      client,
    });

    await client.query("COMMIT");

    return updatedAsset;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
//asset status
const updateAssetStatus = async (
  id,
  status,
  updatedBy
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get current asset status
    const existingAssetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
          name,
          status,
          condition,
          is_active
        FROM assets
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingAssetResult.rows.length === 0) {
      throw new Error("Asset not found");
    }

    const oldAsset = existingAssetResult.rows[0];

    // 2. Update status
    const result = await client.query(
      `
        UPDATE assets
        SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          asset_tag,
          name,
          status,
          condition,
          is_active,
          updated_at
      `,
      [status, id]
    );

    const updatedAsset = result.rows[0];

    // 3. Audit status change
    await createAuditLog({
      userId: updatedBy,
      action: "UPDATE_ASSET_STATUS",
      entityType: "ASSET",
      entityId: updatedAsset.id,

      oldData: {
        status: oldAsset.status,
        condition: oldAsset.condition,
        is_active: oldAsset.is_active,
      },

      newData: {
        status: updatedAsset.status,
        condition: updatedAsset.condition,
        is_active: updatedAsset.is_active,
      },

      description: `Asset ${updatedAsset.asset_tag} status changed from ${oldAsset.status} to ${updatedAsset.status}`,

      client,
    });

    await client.query("COMMIT");

    return updatedAsset;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const allocateAssetLocation = async ({
  assetId,
  departmentId,
  unitId = null,
  allocatedBy,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the asset so allocation cannot race with
    // assignment or transfer creation.
    const assetResult = await client.query(
      `SELECT
         id, asset_tag, building_id,
         department_id, unit_id,
         current_holder_id, current_security_station_id,
         status, is_active
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [assetId]
    );

    if (assetResult.rowCount === 0) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active) {
      throw createError("This asset is inactive", 400);
    }

    if (asset.status !== "AVAILABLE") {
      throw createError(
        `Only AVAILABLE assets can be allocated. Current status: ${asset.status}`,
        409
      );
    }

    if (asset.current_holder_id) {
      throw createError(
        "Return the asset from its current holder before allocation",
        409
      );
    }

    if (asset.current_security_station_id) {
      throw createError(
        "The asset must be released from security custody before allocation",
        409
      );
    }

    // This endpoint is only for building-level assets.
    // Changing an existing department/unit requires transfer.
    if (asset.department_id || asset.unit_id) {
      throw createError(
        "This asset is already allocated. Use the transfer workflow to change its location",
        409
      );
    }

    if (!departmentId) {
      throw createError(
        "A department is required for allocation",
        400
      );
    }

    if (unitId && !departmentId) {
      throw createError(
        "A department is required when specifying a unit",
        400
      );
    }

    // Validate department belongs to the asset's building.
    const departmentResult = await client.query(
      `SELECT id
       FROM departments
       WHERE id = $1
         AND building_id = $2`,
      [departmentId, asset.building_id]
    );

    if (departmentResult.rowCount === 0) {
      throw createError(
        "The selected department does not belong to the asset's building",
        400
      );
    }

    // Validate optional unit belongs to that department.
    if (unitId) {
      const unitResult = await client.query(
        `SELECT id
         FROM units
         WHERE id = $1
           AND department_id = $2`,
        [unitId, departmentId]
      );

      if (unitResult.rowCount === 0) {
        throw createError(
          "The selected unit does not belong to the selected department",
          400
        );
      }
    }

    // Do not allocate while a transfer is still moving
    // through approval or transit.
    const activeMovementResult = await client.query(
      `SELECT id
       FROM asset_movements
       WHERE asset_id = $1
         AND movement_status IN (
           'PENDING', 'APPROVED', 'IN_TRANSIT'
         )
       LIMIT 1`,
      [assetId]
    );

    if (activeMovementResult.rowCount > 0) {
      throw createError(
        "This asset has a transfer that has not arrived yet",
        409
      );
    }

    const updateResult = await client.query(
      `UPDATE assets
       SET department_id = $1,
           unit_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [departmentId, unitId, assetId]
    );

    const updatedAsset = updateResult.rows[0];

    await createAuditLog({
      userId: allocatedBy,
      action: "ALLOCATE_ASSET_LOCATION",
      entityType: "ASSET",
      entityId: assetId,
      oldData: {
        building_id: asset.building_id,
        department_id: asset.department_id,
        unit_id: asset.unit_id,
      },
      newData: {
        building_id: updatedAsset.building_id,
        department_id: updatedAsset.department_id,
        unit_id: updatedAsset.unit_id,
      },
      description:
        `Asset ${asset.asset_tag} allocated to a department`,
      client,
    });

    await client.query("COMMIT");

    return updatedAsset;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

//reassigning asset
const reassignAsset = async ({
  assetId,
  newUserId,
  reassignedBy,
  reason,
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock the asset so concurrent assignment changes cannot
    // modify it at the same time.
    const assetResult = await client.query(
      `SELECT
         id,
         asset_tag,
         name,
         status,
         building_id,
         department_id,
         unit_id,
         current_holder_id,
         is_active
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [assetId]
    );

    if (assetResult.rowCount !== 1) {
      throw createError("Asset not found", 404);
    }

    const asset = assetResult.rows[0];

    
    // Verify the person performing the reassignment.
    const assignerResult = await client.query(
      `SELECT id, role, department_id, unit_id, is_active
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [reassignedBy]
    );

    if (assignerResult.rowCount !== 1) {
      throw createError("Reassigning user not found", 404);
    }

    const assigner = assignerResult.rows[0];

    if (!assigner.is_active) {
      throw createError("Your account is inactive", 403);
    }

    if (
      !["Administrator", "HOD", "HOU"].includes(assigner.role)
    ) {
      throw createError(
        "You are not authorized to reassign assets",
        403
      );
    }


    if (!asset.is_active) {
      throw createError("This asset is inactive", 409);
    }

    if (
      asset.status !== "ASSIGNED" ||
      !asset.current_holder_id
    ) {
      throw createError(
        "Only an assigned asset can be reassigned",
        409
      );
    }

    if (asset.current_holder_id === newUserId) {
      throw createError(
        "The asset is already assigned to this staff member",
        400
      );
    }

    // 2. Require a reason for the reassignment.
    if (typeof reason !== "string" || !reason.trim()) {
      throw createError(
        "A reason is required for reassignment",
        400
      );
    }

    // 3. Check the new staff member and their location.
    const userResult = await client.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.department_id,
         u.unit_id,
         u.is_active,
         d.building_id
       FROM users u
       LEFT JOIN departments d
         ON d.id = u.department_id
       WHERE u.id = $1
       FOR UPDATE OF u`,
      [newUserId]
    );

    if (userResult.rowCount !== 1) {
      throw createError("Target staff member not found", 404);
    }

    const newUser = userResult.rows[0];

    if (!newUser.is_active) {
      throw createError(
        "The target staff member is inactive",
        409
      );
    }

    if (!newUser.department_id || !newUser.building_id) {
      throw createError(
        "The target staff member must belong to a department and building",
        409
      );
    }

    // 4. Reassignment is allowed only within the asset's
    // existing location. A different location requires transfer.
    if (asset.building_id !== newUser.building_id) {
      throw createError(
        "A transfer to the target building is required before reassignment",
        409
      );
    }

    if (asset.department_id !== newUser.department_id) {
      throw createError(
        "A transfer to the target department is required before reassignment",
        409
      );
    }

    // If the asset belongs to a specific unit, the new holder must belong to that unit
    if (
      asset.unit_id &&
      asset.unit_id !== newUser.unit_id
    ) {
      throw createError(
        "A transfer to the target unit is required before reassignment",
        409
      );
    }

    // 5. Lock and find the current active assignment.
    const oldAssignmentResult = await client.query(
      `SELECT id, user_id, notes
       FROM asset_assignments
       WHERE asset_id = $1
         AND status = 'ACTIVE'
       FOR UPDATE`,
      [assetId]
    );

    if (oldAssignmentResult.rowCount !== 1) {
      throw createError(
        "The asset must have exactly one active assignment",
        409
      );
    }

    const oldAssignment = oldAssignmentResult.rows[0];

    if (oldAssignment.user_id !== asset.current_holder_id) {
      throw createError(
        "The active assignment does not match the asset's current holder",
        409
      );
    }

    // 6. Cancel the previous assignment and preserve its history.
    const previousNotes = oldAssignment.notes
      ? `${oldAssignment.notes}\n`
      : "";

    await client.query(
      `UPDATE asset_assignments
       SET status = 'CANCELLED',
           returned_at = NULL,
           notes = $2
       WHERE id = $1
         AND status = 'ACTIVE'`,
      [
        oldAssignment.id,
        `${previousNotes}Reassigned by ${assigner.role}. Reason: ${reason.trim()}${
          notes?.trim() ? ` | Notes: ${notes.trim()}` : ""
        }`,
      ]
    );

    // 7. Create the new active assignment.
    const newAssignmentResult = await client.query(
      `INSERT INTO asset_assignments (
         asset_id,
         user_id,
         assigned_by,
         assigned_at,
         status,
         notes,
         movement_id
       )
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'ACTIVE', $4, NULL)
       RETURNING *`,
      [
        assetId,
        newUserId,
        reassignedBy,
        `Reassignment. Reason: ${reason.trim()}${
          notes?.trim() ? ` | Notes: ${notes.trim()}` : ""
        }`,
      ]
    );

    // 8. Update the asset's current holder.
    const updatedAssetResult = await client.query(
      `UPDATE assets
       SET current_holder_id = $2,
           status = 'ASSIGNED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [assetId, newUserId]
    );

    // 9. Add an audit log here using the same createAuditLog
    // signature and fields used by your existing assignAsset().
    // Record the previous holder, new holder, reassignedBy,
    // reason, and asset ID.
    await createAuditLog({
        userId: reassignedBy,
        action: "ASSET_REASSIGNED",
        entityType: "asset",
        entityId: assetId,
        oldData: {
          current_holder_id: oldAssignment.user_id,
          assignment_id: oldAssignment.id,
          status: asset.status,
        },
        newData: {
          current_holder_id: newUserId,
          assignment_id: newAssignmentResult.rows[0].id,
          status: updatedAssetResult.rows[0].status,
          reason: reason.trim(),
          notes: notes?.trim() || null,
        },
        description: `Asset ${asset.asset_tag} reassigned from user ${oldAssignment.user_id} to user ${newUserId}. Reason: ${reason.trim()}`,
      });
    // 10. Commit only after the audit log has succeeded.
    await client.query("COMMIT");

    return {
      assignment: newAssignmentResult.rows[0],
      asset: updatedAssetResult.rows[0],
      previousAssignment: oldAssignment,
      previousHolderId: oldAssignment.user_id,
      user: newUser,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Get assets assigned to a specific user
const getMyAssetsByUserId = async (userId) => {
  const query = `
    SELECT
      a.id,
      a.asset_tag,
      a.name,
      a.category_id,
      c.name AS category_name,
      a.serial_number,
      a.brand,
      a.model,
      a.building_id,
      a.department_id,
      a.unit_id,
      a.current_holder_id,
      a.status,
      a.condition,
      a.is_active,
      a.created_at,
      a.updated_at,
      aa.id AS assignment_id,
      aa.assigned_at,
      aa.notes AS assignment_notes
    FROM assets a
    INNER JOIN asset_assignments aa
      ON aa.asset_id = a.id
    LEFT JOIN asset_categories c
      ON c.id = a.category_id
    WHERE aa.user_id = $1
      AND aa.status = 'ACTIVE'
      AND a.current_holder_id = $1
      AND a.is_active = TRUE
    ORDER BY aa.assigned_at DESC;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows;
};


// Get assets belonging to the authenticated HOD's department
const getAssetsByHodDepartment = async (userId) => {
  const query = `
    SELECT a.*
    FROM assets a
    INNER JOIN users u
      ON u.id = $1
    WHERE u.is_active = TRUE
      AND u.role = 'HOD'
      AND u.department_id IS NOT NULL
      AND a.department_id = u.department_id
      AND a.is_active = TRUE
    ORDER BY a.created_at DESC;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows;
};


// Get assets belonging to the authenticated HOU's unit
const getAssetsByHouUnit = async (userId) => {
  const query = `
    SELECT a.*
    FROM assets a
    INNER JOIN users u
      ON u.id = $1
    WHERE u.is_active = TRUE
      AND u.role = 'HOU'
      AND u.department_id IS NOT NULL
      AND u.unit_id IS NOT NULL
      AND a.department_id = u.department_id
      AND a.unit_id = u.unit_id
      AND a.is_active = TRUE
    ORDER BY a.created_at DESC;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows;
};


// Delete asset
const deleteAsset = async (
  id,
  deletedBy
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get the asset before deleting it
    const assetResult = await client.query(
      `
        SELECT
          id,
          asset_tag,
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
          current_holder_id,
          current_security_station_id,
          status,
          condition,
          is_active,
          created_at,
          updated_at
        FROM assets
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (assetResult.rows.length === 0) {
      throw new Error("Asset not found");
    }

    const asset = assetResult.rows[0];

    // 2. Delete asset
    const result = await client.query(
      `
        DELETE FROM assets
        WHERE id = $1
        RETURNING
          id,
          asset_tag
      `,
      [id]
    );

    const deletedAsset = result.rows[0];

    // 3. Audit deletion
    await createAuditLog({
      userId: deletedBy,
      action: "DELETE_ASSET",
      entityType: "ASSET",
      entityId: asset.id,

      oldData: asset,

      newData: null,

      description: `Asset ${asset.asset_tag} was deleted`,

      client,
    });

    await client.query("COMMIT");

    return deletedAsset;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};;

module.exports = {
  generateAssetTag,
  createAsset,
  getAllAssets,
  getAssetById,
  getAssetByTag,
  updateAsset,
  deleteAsset,
  updateAssetStatus,
  allocateAssetLocation,
  reassignAsset,
  getMyAssetsByUserId,
  getAssetsByHodDepartment,
  getAssetsByHouUnit,
};