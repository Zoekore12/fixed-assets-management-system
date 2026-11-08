exports.up = (pgm) => {
  // ASSET MAINTENANCE

  pgm.createTable("asset_maintenance", {
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

    maintenance_type: {
      type: "varchar(50)",
      notNull: true,
    },

    description: {
      type: "text",
      notNull: true,
    },

    service_provider: {
      type: "varchar(200)",
    },

    cost: {
      type: "numeric(15, 2)",
    },

    started_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    completed_at: {
      type: "timestamp",
    },

    status: {
      type: "varchar(50)",
      notNull: true,
      default: "OPEN",
    },

    notes: {
      type: "text",
    },

    created_by: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
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

  // AUDIT LOGS
  
  pgm.createTable("audit_logs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    action: {
      type: "varchar(100)",
      notNull: true,
    },

    entity_type: {
      type: "varchar(100)",
      notNull: true,
    },

    entity_id: {
      type: "uuid",
    },

    old_data: {
      type: "jsonb",
    },

    new_data: {
      type: "jsonb",
    },

    description: {
      type: "text",
    },

    ip_address: {
      type: "inet",
    },

    user_agent: {
      type: "text",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // REFRESH TOKENS

  pgm.createTable("refresh_tokens", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    token_hash: {
      type: "text",
      notNull: true,
      unique: true,
    },

    expires_at: {
      type: "timestamp",
      notNull: true,
    },

    revoked_at: {
      type: "timestamp",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    user_agent: {
      type: "text",
    },

    ip_address: {
      type: "inet",
    },
  });
  // INDEXES

  pgm.createIndex(
    "asset_maintenance",
    "asset_id"
  );

  pgm.createIndex(
    "asset_maintenance",
    "status"
  );

  pgm.createIndex(
    "asset_maintenance",
    "created_by"
  );

  pgm.createIndex(
    "audit_logs",
    "user_id"
  );

  pgm.createIndex(
    "audit_logs",
    "entity_type"
  );

  pgm.createIndex(
    "audit_logs",
    "entity_id"
  );

  pgm.createIndex(
    "audit_logs",
    "created_at"
  );

  pgm.createIndex(
    "refresh_tokens",
    "user_id"
  );

  pgm.createIndex(
    "refresh_tokens",
    "expires_at"
  );
};

exports.down = (pgm) => {
  pgm.dropTable("refresh_tokens");
  pgm.dropTable("audit_logs");
  pgm.dropTable("asset_maintenance");
};