exports.up = (pgm) => {
  pgm.addColumn("asset_movements", {
    security_verified_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "RESTRICT",
    },

    security_verified_at: {
      type: "timestamp",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("asset_movements", [
    "security_verified_by",
    "security_verified_at",
  ]);
};
