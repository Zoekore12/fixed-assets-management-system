exports.up = (pgm) => {
  pgm.addColumn("asset_assignments", {
    movement_id: {
      type: "uuid",
      references: "asset_movements(id)",
      onDelete: "SET NULL",
      notNull: false,
    },
  });

  pgm.createIndex(
    "asset_assignments",
    "movement_id",
    {
      name: "idx_asset_assignments_movement_id",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropIndex(
    "asset_assignments",
    "idx_asset_assignments_movement_id"
  );

  pgm.dropColumn(
    "asset_assignments",
    "movement_id"
  );
};
