exports.up = (pgm) => {
  pgm.addColumn("asset_movements", {
    building_checkout_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "RESTRICT",
    },

    building_checkout_at: {
      type: "timestamp",
    },

    building_checkin_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "RESTRICT",
    },

    building_checkin_at: {
      type: "timestamp",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("asset_movements", [
    "building_checkout_by",
    "building_checkout_at",
    "building_checkin_by",
    "building_checkin_at",
  ]);
};
