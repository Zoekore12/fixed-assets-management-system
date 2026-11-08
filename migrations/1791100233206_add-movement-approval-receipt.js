exports.up = (pgm) => {
  pgm.addColumn("asset_movements", {
    movement_status: {
      type: "varchar(20)",
      notNull: true,
      default: "PENDING",
    },

    received_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "RESTRICT",
    },

    received_at: {
      type: "timestamp",
    },
  });

  pgm.addConstraint(
    "asset_movements",
    "asset_movements_status_check",
    {
      check: `
        movement_status IN (
          'PENDING',
          'APPROVED',
          'REJECTED',
          'IN_TRANSIT',
          'COMPLETED',
          'CANCELLED'
        )
      `,
    }
  );

  pgm.createIndex(
    "asset_movements",
    "movement_status"
  );
};

exports.down = (pgm) => {
  pgm.dropIndex(
    "asset_movements",
    "movement_status"
  );

  pgm.dropConstraint(
    "asset_movements",
    "asset_movements_status_check"
  );

  pgm.dropColumn("asset_movements", [
    "movement_status",
    "received_by",
    "received_at",
  ]);
};
