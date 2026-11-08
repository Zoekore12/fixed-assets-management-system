exports.up = (pgm) => {
  // date_out should only be populated when Security physically
  // checks the asset out.
  pgm.alterColumn("asset_exit_records", "date_out", {
    type: "timestamp",
    notNull: false,
    default: null,
  });

  // Allow PENDING while the request is waiting for Administrator approval.
  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check"
  );

  pgm.addConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check",
    {
      check: `
        status IN (
          'PENDING',
          'AUTHORIZED',
          'OUT',
          'RETURNED',
          'OVERDUE',
          'CANCELLED'
        )
      `,
    }
  );

  // New requests should start as PENDING.
  pgm.alterColumn("asset_exit_records", "status", {
    type: "varchar(20)",
    notNull: true,
    default: "PENDING",
  });
};

exports.down = (pgm) => {
  pgm.alterColumn("asset_exit_records", "status", {
    type: "varchar(20)",
    notNull: true,
    default: "OUT",
  });

  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check"
  );

  pgm.addConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check",
    {
      check: `
        status IN (
          'AUTHORIZED',
          'OUT',
          'RETURNED',
          'OVERDUE',
          'CANCELLED'
        )
      `,
    }
  );

  pgm.alterColumn("asset_exit_records", "date_out", {
    type: "timestamp",
    notNull: true,
    default: pgm.func("CURRENT_TIMESTAMP"),
  });
};
