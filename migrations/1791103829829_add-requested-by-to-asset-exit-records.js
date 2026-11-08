exports.up = (pgm) => {
  pgm.addColumn("asset_exit_records", {
    requested_by_user_id: {
      type: "uuid",
      notNull: false,
      references: "users",
      onDelete: "RESTRICT",
    },
  });

  // Existing requests were submitted by the same person
  // who was listed as taking the asset.
  pgm.sql(`
    UPDATE asset_exit_records
    SET requested_by_user_id = taken_by_user_id
    WHERE requested_by_user_id IS NULL
  `);

  pgm.alterColumn("asset_exit_records", "requested_by_user_id", {
    notNull: true,
  });

  pgm.createIndex("asset_exit_records", ["requested_by_user_id"], {
    name: "idx_asset_exit_requested_by",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("asset_exit_records", ["requested_by_user_id"], {
    name: "idx_asset_exit_requested_by",
  });

  pgm.dropColumn("asset_exit_records", "requested_by_user_id");
};
