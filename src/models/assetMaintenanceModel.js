const pool = require("../config/database");
const { createAuditLog } = require("./auditModel");



//create maintenance request
const createMaintenanceRequest = async ({
  assetId,
  requestedBy,
  maintenanceType,
  description,
  serviceProvider = null,
  estimatedCost = null,
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the asset while validating the request.
    const assetResult = await client.query(
      `SELECT id, asset_tag, status, is_active
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active) {
      const error = new Error("This asset is inactive.");
      error.statusCode = 400;
      throw error;
    }

    if (asset.status !== "ASSIGNED") {
      const error = new Error(
        "Only currently assigned assets can be requested for maintenance."
      );
      error.statusCode = 400;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO maintenance_requests (
         asset_id,
         requested_by,
         maintenance_type,
         description,
         service_provider,
         estimated_cost,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        assetId,
        requestedBy,
        maintenanceType,
        description,
        serviceProvider,
        estimatedCost,
        notes,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
//approve maintenance request
const approveMaintenanceRequest = async ({
  requestId,
  adminId,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock the request.
    const requestResult = await client.query(
      `SELECT *
       FROM maintenance_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      const error = new Error("Maintenance request not found");
      error.statusCode = 404;
      throw error;
    }

    const request = requestResult.rows[0];

    if (request.status !== "PENDING") {
      const error = new Error(
        "Only pending maintenance requests can be approved"
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Lock the asset and validate its current state.
    const assetResult = await client.query(
      `SELECT
          id,
          asset_tag,
          name,
          status,
          is_active,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [request.asset_id]
    );

    if (assetResult.rows.length === 0) {
      const error = new Error("Asset not found");
      error.statusCode = 404;
      throw error;
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active || asset.status !== "ASSIGNED") {
      const error = new Error(
        "The asset must be active and assigned before maintenance can be approved"
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Create the actual maintenance record.
    const maintenanceResult = await client.query(
      `INSERT INTO asset_maintenance (
          asset_id,
          maintenance_type,
          description,
          service_provider,
          cost,
          created_by,
          notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        request.asset_id,
        request.maintenance_type,
        request.description,
        request.service_provider,
        request.estimated_cost,
        adminId,
        request.notes,
      ]
    );

    const maintenance = maintenanceResult.rows[0];

    // 4. Change the asset status.
    const updatedAssetResult = await client.query(
      `UPDATE assets
       SET status = 'MAINTENANCE',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, asset_tag, status`,
      [request.asset_id]
    );

    const updatedAsset = updatedAssetResult.rows[0];

    // 5. Mark the request as approved and link the record.
    const approvedRequestResult = await client.query(
      `UPDATE maintenance_requests
       SET status = 'APPROVED',
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           maintenance_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId, adminId, maintenance.id]
    );

    // 6. Record the change in the audit log.
    await createAuditLog({
      userId: adminId,
      action: "APPROVE_MAINTENANCE_REQUEST",
      entityType: "ASSET",
      entityId: asset.id,
      oldData: {
        asset_status: asset.status,
        request_status: request.status,
      },
      newData: {
        asset_status: updatedAsset.status,
        request_status: "APPROVED",
        maintenance_id: maintenance.id,
        reviewed_by: adminId,
      },
      description:
        `Administrator approved maintenance request for asset ${asset.asset_tag}`,
      client,
    });

    await client.query("COMMIT");

    return {
      request: approvedRequestResult.rows[0],
      maintenance,
      asset: updatedAsset,
      checkoutAuthorizationRequired: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
// Create maintenance record
const createMaintenance = async ({
  assetId,
  maintenanceType,
  description,
  serviceProvider = null,
  cost = null,
  createdBy,
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock and retrieve the asset.
    const assetResult = await client.query(
      `SELECT
          id,
          asset_tag,
          name,
          status,
          is_active,
          building_id,
          department_id,
          unit_id,
          current_holder_id,
          current_security_station_id
       FROM assets
       WHERE id = $1
       FOR UPDATE`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      const error = new Error("Asset not found");
      error.statusCode = 404;
      throw error;
    }

    const asset = assetResult.rows[0];

    if (!asset.is_active) {
      const error = new Error("Cannot create maintenance for an inactive asset");
      error.statusCode = 400;
      throw error;
    }

    if (asset.status !== "ASSIGNED") {
      const error = new Error(
        "Only assigned assets can be sent for maintenance"
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Create the maintenance record.
    const maintenanceResult = await client.query(
      `INSERT INTO asset_maintenance (
          asset_id,
          maintenance_type,
          description,
          service_provider,
          cost,
          created_by,
          notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        assetId,
        maintenanceType,
        description,
        serviceProvider,
        cost,
        createdBy,
        notes,
      ]
    );

    const maintenance = maintenanceResult.rows[0];

    // 3. Set the asset to MAINTENANCE.
    const updatedAssetResult = await client.query(
      `UPDATE assets
       SET status = 'MAINTENANCE',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING
           id,
           asset_tag,
           name,
           status,
           building_id,
           department_id,
           unit_id,
           current_holder_id,
           current_security_station_id,
           updated_at`,
      [assetId]
    );

    const updatedAsset = updatedAssetResult.rows[0];

    // 4. Audit the maintenance creation and status change.
    await createAuditLog({
      userId: createdBy,
      action: "CREATE_MAINTENANCE",
      entityType: "ASSET",
      entityId: asset.id,

      oldData: {
        status: asset.status,
        building_id: asset.building_id,
        department_id: asset.department_id,
        unit_id: asset.unit_id,
        current_holder_id: asset.current_holder_id,
        current_security_station_id:
          asset.current_security_station_id,
      },

      newData: {
        status: updatedAsset.status,
        building_id: updatedAsset.building_id,
        department_id: updatedAsset.department_id,
        unit_id: updatedAsset.unit_id,
        current_holder_id: updatedAsset.current_holder_id,
        current_security_station_id:
          updatedAsset.current_security_station_id,
        maintenance_id: maintenance.id,
        maintenance_type: maintenance.maintenance_type,
        description: maintenance.description,
        service_provider: maintenance.service_provider,
        cost: maintenance.cost,
        checkout_authorization_required: true,
      },

      description:
        `Maintenance record created for asset ${asset.asset_tag}. ` +
        "Administrator-created maintenance requires authorized checkout.",

      client,
    });

    await client.query("COMMIT");

    return {
      ...maintenance,
      asset: updatedAsset,
      checkoutAuthorizationRequired: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Get all maintenance records
const getAllMaintenance = async () => {
  const result = await pool.query(
    `SELECT
       mr.*,
       a.asset_tag,
       a.name AS asset_name
     FROM asset_maintenance mr
     JOIN assets a ON mr.asset_id = a.id
     ORDER BY mr.created_at DESC`
  );

  return result.rows;
};
// Get maintenance record by ID
const getMaintenanceById = async (id) => {
  const result = await pool.query(
    `SELECT
       mr.*,
       a.asset_tag,
       a.name AS asset_name
     FROM asset_maintenance mr
     JOIN assets a ON mr.asset_id = a.id
     WHERE mr.id = $1`,
    [id]
  );

  return result.rows[0];
};

// Complete maintenance
const completeMaintenance = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find and lock maintenance record
    const maintenanceResult = await client.query(
      `SELECT *
       FROM asset_maintenance
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (maintenanceResult.rows.length === 0) {
      throw new Error("Maintenance record not found");
    }

    const maintenance = maintenanceResult.rows[0];

    if (maintenance.status === "COMPLETED") {
      throw new Error("Maintenance is already completed");
    }

    // 2. Complete maintenance
    const result = await client.query(
      `UPDATE asset_maintenance
       SET status = 'COMPLETED',
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // 3. Return asset to AVAILABLE
    const updatedAssetResult = await client.query(
        `UPDATE assets
        SET status = 'AVAILABLE',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            asset_tag,
            name,
            status,
            building_id,
            department_id,
            unit_id,
            current_holder_id,
            current_security_station_id,
            updated_at`,
        [maintenance.asset_id]
    );

    const updatedAsset = updatedAssetResult.rows[0];

    await createAuditLog({
            userId: maintenance.created_by,
            action: "COMPLETE_MAINTENANCE",
            entityType: "ASSET",
            entityId: updatedAsset.id,

            oldData: {
                status: "MAINTENANCE",
                maintenance_id: maintenance.id,
                maintenance_status: maintenance.status,
            },

            newData: {
                status: updatedAsset.status,
                maintenance_id: maintenance.id,
                maintenance_status: result.rows[0].status,
                completed_at: result.rows[0].completed_at,

                asset_tag: updatedAsset.asset_tag,
                building_id: updatedAsset.building_id,
                department_id: updatedAsset.department_id,
                unit_id: updatedAsset.unit_id,
                current_holder_id: updatedAsset.current_holder_id,
                current_security_station_id:
                updatedAsset.current_security_station_id,
            },

            description: `Maintenance completed for asset ${updatedAsset.asset_tag}`,

            client,
        });

         await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
// Get all maintenance requests
const getAllMaintenanceRequest = async (status = null) => {
  const result = await pool.query(
    `SELECT
       mr.*,
       a.asset_tag,
       a.name AS asset_name,
       requester.name AS requester_name,
       reviewer.name AS reviewer_name
     FROM maintenance_requests mr
     JOIN assets a ON mr.asset_id = a.id
     LEFT JOIN users requester ON mr.requested_by = requester.id
     LEFT JOIN users reviewer ON mr.reviewed_by = reviewer.id
     WHERE ($1::text IS NULL OR mr.status = $1)
     ORDER BY mr.created_at DESC`,
    [status]
  );

  return result.rows;
};

// Reject a maintenance request
const rejectMaintenanceRequest = async ({
  requestId,
  adminId,
  rejectionReason,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock the maintenance request
    const requestResult = await client.query(
      `SELECT *
       FROM maintenance_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      const error = new Error("Maintenance request not found");
      error.statusCode = 404;
      throw error;
    }

    const request = requestResult.rows[0];

    // 2. Only pending requests can be rejected
    if (request.status !== "PENDING") {
      const error = new Error(
        `Cannot reject a maintenance request with status ${request.status}`
      );
      error.statusCode = 409;
      throw error;
    }

    // 3. Update the request
    const rejectionResult = await client.query(
      `UPDATE maintenance_requests
       SET status = 'REJECTED',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [adminId, rejectionReason, requestId]
    );

    const rejectedRequest = rejectionResult.rows[0];

    // 4. Record the action in the audit log
    await createAuditLog({
      userId: adminId,
      action: "REJECT_MAINTENANCE_REQUEST",
      entityType: "MAINTENANCE_REQUEST",
      entityId: request.id,
      oldData: {
        status: request.status,
      },
      newData: {
        status: rejectedRequest.status,
        rejection_reason: rejectedRequest.rejection_reason,
        reviewed_by: rejectedRequest.reviewed_by,
      },
      description:
        `Maintenance request ${requestId} rejected. Reason: ${rejectionReason}`,
      client,
    });

    await client.query("COMMIT");

    return rejectedRequest;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};



module.exports = {
  createMaintenanceRequest,
  approveMaintenanceRequest,
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  completeMaintenance,
  getAllMaintenanceRequest,
  rejectMaintenanceRequest,
};