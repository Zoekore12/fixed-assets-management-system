exports.up = (pgm) => {
  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check"
  );

  pgm.addConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check",
    {
      check:
        "status IN ('AUTHORIZED', 'OUT', 'RETURNED', 'OVERDUE', 'CANCELLED')",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check"
  );

  pgm.addConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check",
    {
      check:
        "status IN ('OUT', 'RETURNED', 'OVERDUE', 'CANCELLED')",
    }
  );
};
