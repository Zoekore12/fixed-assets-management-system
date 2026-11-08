exports.up = (pgm) => {
  pgm.dropConstraint(
    "asset_movements",
    "asset_movements_status_check"
  );

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
          'ARRIVED',
          'COMPLETED',
          'CANCELLED'
        )
      `,
    }
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    "asset_movements",
    "asset_movements_status_check"
  );

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
};
