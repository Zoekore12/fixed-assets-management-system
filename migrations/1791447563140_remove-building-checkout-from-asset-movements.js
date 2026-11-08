exports.up = (pgm) => {
  pgm.dropColumn("asset_movements", "building_checkout_by");
  pgm.dropColumn("asset_movements", "building_checkout_at");
};

exports.down = (pgm) => {
  pgm.addColumn("asset_movements", {
    building_checkout_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    building_checkout_at: {
      type: "timestamp",
    },
  });
};
