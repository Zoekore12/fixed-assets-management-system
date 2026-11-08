exports.up = (pgm) => {
  pgm.createTable("security_stations", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    station_code: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
    },

    name: {
      type: "varchar(150)",
      notNull: true,
    },

    building_id: {
      type: "uuid",
      notNull: true,
      references: "buildings(id)",
      onDelete: "RESTRICT",
    },

    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.createIndex("security_stations", "building_id");
};

exports.down = (pgm) => {
  pgm.dropTable("security_stations");
};
