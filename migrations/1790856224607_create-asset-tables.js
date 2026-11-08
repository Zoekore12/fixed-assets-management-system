exports.up = (pgm) => {
  // ASSETS
  pgm.createTable("assets", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    asset_tag: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },

    name: {
      type: "varchar(200)",
      notNull: true,
    },

    category_id: {
      type: "uuid",
      notNull: true,
      references: "asset_categories(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    serial_number: {
      type: "varchar(150)",
      unique: true,
    },

    brand: {
      type: "varchar(100)",
    },

    model: {
      type: "varchar(150)",
    },

    description: {
      type: "text",
    },

    purchase_date: {
      type: "date",
    },

    purchase_cost: {
      type: "numeric(15, 2)",
    },

    supplier: {
      type: "varchar(200)",
    },

    // Current organizational location

    building_id: {
      type: "uuid",
      references: "buildings(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    department_id: {
      type: "uuid",
      references: "departments(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    unit_id: {
      type: "uuid",
      references: "units(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    // Current holder

    current_holder_id: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    // Asset status

    status: {
      type: "varchar(50)",
      notNull: true,
      default: "AVAILABLE",
    },

    condition: {
      type: "varchar(50)",
      notNull: true,
      default: "GOOD",
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
  // ASSET ASSIGNMENTS
  pgm.createTable("asset_assignments", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    asset_id: {
      type: "uuid",
      notNull: true,
      references: "assets(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    assigned_by: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    assigned_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    returned_at: {
      type: "timestamp",
    },

    status: {
      type: "varchar(50)",
      notNull: true,
      default: "ACTIVE",
    },

    notes: {
      type: "text",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // ASSET MOVEMENTS
  pgm.createTable("asset_movements", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    asset_id: {
      type: "uuid",
      notNull: true,
      references: "assets(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    // Previous location

    from_building_id: {
      type: "uuid",
      references: "buildings(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    from_department_id: {
      type: "uuid",
      references: "departments(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    from_unit_id: {
      type: "uuid",
      references: "units(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    // New location

    to_building_id: {
      type: "uuid",
      references: "buildings(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    to_department_id: {
      type: "uuid",
      references: "departments(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    to_unit_id: {
      type: "uuid",
      references: "units(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    moved_by: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    authorized_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    movement_type: {
      type: "varchar(50)",
      notNull: true,
      default: "TRANSFER",
    },

    reason: {
      type: "text",
    },

    notes: {
      type: "text",
    },

    movement_date: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });
  // ASSET EXIT RECORDS
  pgm.createTable("asset_exit_records", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    asset_id: {
      type: "uuid",
      notNull: true,
      references: "assets(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    taken_by_user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    authorized_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    destination: {
      type: "varchar(255)",
      notNull: true,
    },

    reason: {
      type: "text",
    },

    date_out: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    expected_return_date: {
      type: "date",
    },

    actual_return_date: {
      type: "timestamp",
    },

    status: {
      type: "varchar(50)",
      notNull: true,
      default: "OUT",
    },

    notes: {
      type: "text",
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
  // INDEXES

  pgm.createIndex("assets", "asset_tag");
  pgm.createIndex("assets", "serial_number");
  pgm.createIndex("assets", "category_id");
  pgm.createIndex("assets", "building_id");
  pgm.createIndex("assets", "department_id");
  pgm.createIndex("assets", "unit_id");
  pgm.createIndex("assets", "current_holder_id");
  pgm.createIndex("assets", "status");

  pgm.createIndex("asset_assignments", "asset_id");
  pgm.createIndex("asset_assignments", "user_id");

  pgm.createIndex("asset_movements", "asset_id");
  pgm.createIndex("asset_movements", "moved_by");
  pgm.createIndex("asset_movements", "movement_date");

  pgm.createIndex("asset_exit_records", "asset_id");
  pgm.createIndex("asset_exit_records", "taken_by_user_id");
  pgm.createIndex("asset_exit_records", "status");
};

exports.down = (pgm) => {
  pgm.dropTable("asset_exit_records");
  pgm.dropTable("asset_movements");
  pgm.dropTable("asset_assignments");
  pgm.dropTable("assets");
};