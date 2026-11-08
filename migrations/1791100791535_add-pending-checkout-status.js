exports.up = (pgm) => {
  // Remove the old status constraint
  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check"
  );

  // Add the new status constraint
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
};