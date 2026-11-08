exports.up = (pgm) => {
  pgm.addColumn("assets", {
    current_security_station_id: {
      type: "uuid",
      references: "security_stations(id)",
      onDelete: "SET NULL",
      notNull: false,
    },
  });

  pgm.createIndex(
    "assets",
    "current_security_station_id",
    {
      name: "idx_assets_current_security_station_id",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropIndex(
    "assets",
    "idx_assets_current_security_station_id"
  );

  pgm.dropColumn(
    "assets",
    "current_security_station_id"
  );
};
