const { validate: isUuid } = require("uuid");

const pool = require("../config/database");

const {assignAsset,} = require("../services/assignmentService");

const {reassignAsset}=require("../models/assetModel");

const {createTransferRequest} =require("../services/movementService")

const {getActiveAssignment,getAssetAssignmentHistory,getAllAssignments,getMyActiveAssignments,getActiveAssignmentsByDepartment,getActiveAssignmentsByUnit} = require("../models/assignmentModel");

// ASSIGN ASSET
const assign = async (req, res) => {
  try {
    const { id: assetId } = req.params;
    const { user_id, movement_id, notes, reason } = req.body;

    // Only Administrators can assign assets.
    const allowedRoles = [
      "Administrator",
      "HOD",
      "HOU",
    ];

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only an Administrator, HOD, or HOU can assign assets",
      });
    }
    if (!isUuid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    if (!isUuid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "A valid user_id is required",
      });
    }

    if (
      movement_id != null &&
      !isUuid(movement_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid movement ID",
      });
    }

    if (
      notes != null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string",
      });
    }

    // Find the asset's current official location.
    const assetResult = await pool.query(
      `SELECT id, asset_tag, building_id,
              department_id, unit_id, status, is_active
       FROM assets
       WHERE id = $1`,
      [assetId]
    );

    if (assetResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const asset = assetResult.rows[0];

    // Find the destination staff member's location.
    const userResult = await pool.query(
      `SELECT u.id, u.is_active, u.department_id,
              u.unit_id, d.building_id
       FROM users u
       LEFT JOIN departments d
         ON d.id = u.department_id
       WHERE u.id = $1`,
      [user_id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const targetUser = userResult.rows[0];

    if (!targetUser.is_active) {
      return res.status(400).json({
        success: false,
        message: "The target user is inactive",
      });
    }

    if (!targetUser.building_id || !targetUser.department_id) {
      return res.status(400).json({
        success: false,
        message:
          "The target user must belong to a valid building and department before assignment",
      });
    }

    //fetch department and unit
    const assignerResult = await pool.query(
        `SELECT id, role, department_id, unit_id, is_active
        FROM users
        WHERE id = $1
        LIMIT 1`,
        [req.user.id]
      );

      const assigner = assignerResult.rows[0];

      if (!assigner || !assigner.is_active) {
        return res.status(403).json({
          success: false,
          message: "Your user account is inactive or does not exist",
        });
      }
      //let roles be able to transfer item under their department or unit
      const role = req.user.role;

      if (role === "HOD") {
        // HOD can assign department-level assets to staff in the same department.
        const canAssign =
          asset.department_id === assigner.department_id &&
          asset.unit_id == null &&
          targetUser.department_id === assigner.department_id;

        if (!canAssign) {
          return res.status(403).json({
            success: false,
            message:
              "HODs can only assign department-level assets to staff in their department",
          });
        }
      }

      if (role === "HOU") {
        // HOU can assign unit-level assets to staff in the same unit.
        const canAssign =
          Boolean(req.user.unit_id) &&
          asset.department_id === req.user.department_id &&
          asset.unit_id === req.user.unit_id &&
          targetUser.department_id === req.user.department_id &&
          targetUser.unit_id === req.user.unit_id;

        if (!canAssign) {
          return res.status(403).json({
            success: false,
            message:
              "HOUs can only assign unit-level assets to staff in their unit",
          });
        }
    }

    // If a movement is supplied, let assignAsset validate that the transfer has arrived and is ready for assignment.
    if (!movement_id) {
      const sameBuilding =
        asset.building_id === targetUser.building_id;

      const sameDepartment =
        asset.department_id === targetUser.department_id;

      const sameUnit =
        (asset.unit_id ?? null) ===
        (targetUser.unit_id ?? null);

      // An asset without a department needs allocation first.
      if (sameBuilding && !asset.department_id) {
        return res.status(409).json({
          success: false,
          code: "LOCATION_ALLOCATION_REQUIRED",
          message:
            "Allocate this asset to a department before assigning it",
        });
      }

      // A different building, department, or unit requires the transfer workflow.
      if (
        !sameBuilding ||
        !sameDepartment ||
        !sameUnit
      ) {
        if (
          typeof reason !== "string" ||
          !reason.trim()
        ) {
          return res.status(400).json({
            success: false,
            code: "TRANSFER_REASON_REQUIRED",
            message:
              "Provide a reason to create a transfer request",
          });
        }

      
        const movement = await createTransferRequest({
          assetId,
          requestedBy: req.user.id,
          toBuildingId: targetUser.building_id,
          toDepartmentId: targetUser.department_id,
          toUnitId: targetUser.unit_id ?? null,
          reason: reason.trim(),
          notes:
            typeof notes === "string"
              ? notes.trim() || null
              : null,
        });

        return res.status(201).json({
          success: true,
          code: "TRANSFER_REQUEST_CREATED",
          message:
            movement.movement_status === "APPROVED"
              ? "Transfer approved. Complete the required movement, security, and receiving steps before assigning the asset."
              : "Transfer request submitted for approval. The asset has not been assigned.",
          transfer: movement,
          assignment: null,
        });
      }
    }

    // No location mismatch: assign directly, or validate
    // the supplied completed movement in the service.
    const result = await assignAsset({
      assetId,
      userId: user_id,
      assignedBy: req.user.id,
      movementId: movement_id || null,
      notes:
        typeof notes === "string"
          ? notes.trim() || null
          : null,
    });

    return res.status(201).json({
      success: true,
      message: "Asset assigned successfully",
      assignment: result.assignment,
      asset: result.asset,
      user: result.user,
      transfer: result.transfer || null,
    });
  } catch (error) {
    console.error("Asset assignment error:", error);

    return res.status(
      error.status || error.statusCode || 500
    ).json({
      success: false,
      message:
        error.status || error.statusCode
          ? error.message
          : "Internal server error",
    });
  }
};
//RE-ASSIGN ASSET
const reassign = async (req, res) => {
  try {
    const { id: assetId } = req.params;
    const { user_id, reason, notes } = req.body;

    if (!isUuid(assetId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid asset ID",
    });
  }

  if (!isUuid(user_id)) {
    return res.status(400).json({
      success: false,
      message: "A valid user_id is required",
    });
  }

    
     const allowedRoles = ["Administrator", "HOD", "HOU"];

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
           "Only an Administrator, HOD, or HOU can reassign assets",
      });
    }


    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A reason for reassignment is required",
      });
    }

    if (notes != null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "notes must be a string",
      });
    }

    const result = await reassignAsset({
      assetId,
      newUserId: user_id,
      reassignedBy: req.user.id,
      reason: reason.trim(),
      notes: notes?.trim() || null,
    });

    return res.status(200).json({
      success: true,
      message: "Asset reassigned successfully",
      previousAssignment: result.previousAssignment,
      assignment: result.assignment,
      asset: result.asset,
      user: result.user,
    });
  } catch (error) {
    console.error("Asset reassignment error:", error);

    return res.status(error.statusCode || error.status || 500).json({
      success: false,
      message: error.message || "Failed to reassign asset",
    });
  }
};

// GET CURRENT ASSIGNMENT
const getCurrentAssignment = async (
  req,
  res
) => {
  try {
    const { id: assetId } = req.params;

    if (!isUuid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const assignment =
      await getActiveAssignment(assetId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "This asset is not currently assigned",
      });
    }

    return res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error(
      "Get current assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// GET ASSIGNMENT HISTORY
const getHistory = async (
  req,
  res
) => {
  try {
    const { id: assetId } = req.params;

    if (!isUuid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const history =
      await getAssetAssignmentHistory(
        assetId
      );

    return res.status(200).json({
      success: true,
      count: history.length,
      assignments: history,
    });
  } catch (error) {
    console.error(
      "Get assignment history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const getAssignments = async (req, res) => {
  try {
    const assignments = await getAllAssignments();

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignments",
    });
  }
};

// Staff: Get my active assignments
const getMyAssignments = async (req, res) => {
  try {
    const assignments = await getMyActiveAssignments(req.user.id);

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get my assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// HOD: Get active assignments in my department
const getDepartmentAssignments = async (req, res) => {
  try {
    const assignments = await getActiveAssignmentsByDepartment(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get department assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// HOU: Get active assignments in my unit
const getUnitAssignments = async (req, res) => {
  try {
    const assignments = await getActiveAssignmentsByUnit(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get unit assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = {
  assign,
  getCurrentAssignment,
  getHistory,
  reassign,
  getAssignments,
  getMyAssignments,
  getDepartmentAssignments,
  getUnitAssignments,
};