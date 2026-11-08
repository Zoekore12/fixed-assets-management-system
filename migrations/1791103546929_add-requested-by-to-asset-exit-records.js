exports.up = (pgm) => {
  pgm.addColumn("asset_exit_records", {
    requested_by_user_id: {
      type: "uuid",
      notNull: false,
      references: "users",
      onDelete: "RESTRICT",
    },
  });

  pgm.createIndex("asset_exit_records", ["requested_by_user_id"], {
    name: "idx_asset_exit_requested_by",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex(
    "asset_exit_records",
    ["requested_by_user_id"],
    {
      name: "idx_asset_exit_requested_by",
    }
  );

  pgm.dropColumn("asset_exit_records", "requested_by_user_id");
};
