exports.up = (pgm) => {
  pgm.createIndex(
    "asset_assignments",
    ["asset_id"],
    {
      name: "unique_active_asset_assignment",
      unique: true,
      where: "status = 'ACTIVE'",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropIndex(
    "asset_assignments",
    ["asset_id"],
    {
      name: "unique_active_asset_assignment",
    }
  );
};
