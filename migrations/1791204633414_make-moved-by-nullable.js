exports.up = (pgm) => {
  pgm.alterColumn("asset_movements", "moved_by", {
    notNull: false,
  });
};

exports.down = (pgm) => {
  pgm.alterColumn("asset_movements", "moved_by", {
    notNull: true,
  });
};
