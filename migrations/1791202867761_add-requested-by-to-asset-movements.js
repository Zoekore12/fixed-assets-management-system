exports.up = (pgm) => {
  pgm.addColumn("asset_movements", {
    requested_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "RESTRICT",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("asset_movements", "requested_by");
};