const pool = require("../config/database");

const authorizeTransferScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transfer ID is required",
      });
    }

    /*
     * Administrator has organization-wide authority.
     */
    if (req.user.role === "Administrator") {
      return next();
    }

    /*
     * Get the current user's organizational scope
     * and the transfer's source/destination.
     */
    const result = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.role,
        u.department_id AS user_department_id,
        u.unit_id AS user_unit_id,

        am.id AS movement_id,
        am.from_building_id,
        am.from_department_id,
        am.from_unit_id,
        am.to_building_id,
        am.to_department_id,
        am.to_unit_id,
        am.movement_status

      FROM users u

      CROSS JOIN asset_movements am

      WHERE u.id = $1
        AND am.id = $2
      LIMIT 1
      `,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transfer request not found",
      });
    }

    const transfer = result.rows[0];

    /*
     * Only HOD and Unit Head can continue.
     */
    if (!["HOD", "HOU"].includes(transfer.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve transfers",
      });
    }

    /*
     * A Unit Head can only authorize a transfer
     * within their own unit.
     */
    if (transfer.role === "HOU") {
      if (!transfer.user_unit_id) {
        return res.status(403).json({
          success: false,
          message: "Unit Head is not assigned to a unit",
        });
      }

      const sameSourceUnit =
        transfer.user_unit_id === transfer.from_unit_id;

      const sameDestinationUnit =
        transfer.user_unit_id === transfer.to_unit_id;

      if (!sameSourceUnit && !sameDestinationUnit) {
        return res.status(403).json({
          success: false,
          message:
            "You can only authorize transfers involving your unit",
        });
      }

      /*
       * Same unit does not require HOD approval.
       */
      if (
        transfer.from_unit_id === transfer.to_unit_id &&
        transfer.from_unit_id === transfer.user_unit_id
      ) {
        return next();
      }

      /*
       * A transfer between different units in the same
       * department requires HOD authorization.
       */
      return res.status(403).json({
        success: false,
        message:
          "Transfers between units require HOD authorization",
      });
    }

    /*
     * HOD authorization.
     */
    if (transfer.role === "HOD") {
      if (!transfer.user_department_id) {
        return res.status(403).json({
          success: false,
          message: "HOD is not assigned to a department",
        });
      }

      const sameDepartment =
        transfer.from_department_id ===
          transfer.user_department_id &&
        transfer.to_department_id ===
          transfer.user_department_id;

      if (!sameDepartment) {
        return res.status(403).json({
          success: false,
          message:
            "Transfers between departments require Administrator authorization",
        });
      }

      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You are not authorized to approve this transfer",
    });
  } catch (error) {
    console.error("Transfer authorization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify transfer authorization",
    });
  }
};

module.exports = authorizeTransferScope;