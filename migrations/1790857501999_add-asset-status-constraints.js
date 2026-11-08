exports.up = (pgm) => {
  // ASSET STATUS

  pgm.addConstraint("assets", "assets_status_check", {
    check: `
      status IN (
        'AVAILABLE',
        'ASSIGNED',
        'IN_TRANSIT',
        'OUT',
        'MAINTENANCE',
        'LOST',
        'DAMAGED',
        'OBSOLETE',
        'RETIRED',
        'DISPOSED'
      )
    `,
  });

  // ASSET CONDITION

  pgm.addConstraint("assets", "assets_condition_check", {
    check: `
      condition IN (
        'EXCELLENT',
        'GOOD',
        'FAIR',
        'DAMAGED',
        'OBSOLETE'
      )
    `,
  });

  // ASSIGNMENT STATUS

  pgm.addConstraint(
    "asset_assignments",
    "asset_assignments_status_check",
    {
      check: `
        status IN (
          'ACTIVE',
          'RETURNED',
          'CANCELLED'
        )
      `,
    }
  );

  // ==========================================
  // MOVEMENT TYPE
  // ==========================================

  pgm.addConstraint(
    "asset_movements",
    "asset_movements_type_check",
    {
      check: `
        movement_type IN (
          'TRANSFER',
          'RELOCATION',
          'RETURN'
        )
      `,
    }
  );

  // EXIT STATUS

  pgm.addConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check",
    {
      check: `
        status IN (
          'OUT',
          'RETURNED',
          'OVERDUE',
          'CANCELLED'
        )
      `,
    }
  );

  // MAINTENANCE STATUS

  pgm.addConstraint(
    "asset_maintenance",
    "asset_maintenance_status_check",
    {
      check: `
        status IN (
          'OPEN',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELLED'
        )
      `,
    }
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    "asset_maintenance",
    "asset_maintenance_status_check"
  );

  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_status_check"
  );

  pgm.dropConstraint(
    "asset_movements",
    "asset_movements_type_check"
  );

  pgm.dropConstraint(
    "asset_assignments",
    "asset_assignments_status_check"
  );

  pgm.dropConstraint(
    "assets",
    "assets_condition_check"
  );

  pgm.dropConstraint(
    "assets",
    "assets_status_check"
  );
};