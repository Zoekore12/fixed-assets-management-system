exports.up = (pgm) => {
  // Enable UUID generation
  pgm.createExtension("pgcrypto", {
    ifNotExists: true,
  });

  // USERS 
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    name: {
      type: "varchar(150)",
      notNull: true,
    },

    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },

    password: {
      type: "text",
      notNull: true,
    },

    role: {
      type: "varchar(50)",
      notNull: true,
      default: "Staff",
    },

    phone: {
      type: "varchar(30)",
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

  // BUILDINGS

  pgm.createTable("buildings", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    name: {
      type: "varchar(150)",
      notNull: true,
    },

    code: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
    },

    address: {
      type: "text",
    },

    description: {
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

  // DEPARTMENTS
  pgm.createTable("departments", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    building_id: {
      type: "uuid",
      notNull: true,
      references: "buildings(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    name: {
      type: "varchar(150)",
      notNull: true,
    },

    code: {
      type: "varchar(50)",
      notNull: true,
    },

    description: {
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

  // Department code should be unique within a building
  pgm.addConstraint("departments", "unique_department_code_per_building", {
    unique: ["building_id", "code"],
  });

  // UNITS
  pgm.createTable("units", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    department_id: {
      type: "uuid",
      notNull: true,
      references: "departments(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    name: {
      type: "varchar(150)",
      notNull: true,
    },

    code: {
      type: "varchar(50)",
      notNull: true,
    },

    description: {
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

  // Unit code should be unique within a department
  pgm.addConstraint("units", "unique_unit_code_per_department", {
    unique: ["department_id", "code"],
  });

  // ASSET CATEGORIES
  pgm.createTable("asset_categories", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    name: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },

    description: {
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

    pgm.addColumn("users", {
    department_id: {
      type: "uuid",
      references: "departments(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    unit_id: {
      type: "uuid",
      references: "units(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  });

  // INDEXES

  pgm.createIndex("departments", "building_id");

  pgm.createIndex("units", "department_id");

  pgm.createIndex("users", "department_id");

  pgm.createIndex("users", "unit_id");
};

exports.down = (pgm) => {
  // Drop in reverse dependency order
  pgm.dropTable("asset_categories");
  pgm.dropTable("units");
  pgm.dropTable("departments");
  pgm.dropTable("buildings");
  pgm.dropTable("users");
};