exports.up = (pgm) => {
  pgm.addColumn("asset_movements", {
    mover_confirmed_at: {
      type: "timestamp",
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("asset_movements", "mover_confirmed_at");
};