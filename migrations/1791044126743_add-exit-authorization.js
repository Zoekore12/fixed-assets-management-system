exports.up = (pgm) => {
  pgm.addColumn("asset_exit_records", {
    authorization_status: {
      type: "varchar(20)",
      notNull: true,
      default: "PENDING",
    },

    authorized_at: {
      type: "timestamp",
      notNull: false,
    },
  });

  pgm.addConstraint(
    "asset_exit_records",
    "asset_exit_records_authorization_status_check",
    {
      check:
        "authorization_status IN ('PENDING', 'AUTHORIZED', 'REJECTED')",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    "asset_exit_records",
    "asset_exit_records_authorization_status_check"
  );

  pgm.dropColumn(
    "asset_exit_records",
    "authorized_at"
  );

  pgm.dropColumn(
    "asset_exit_records",
    "authorization_status"
  );
};
