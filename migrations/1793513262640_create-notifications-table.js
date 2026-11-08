
/**
 * Create notifications table
 */

exports.up = (pgm) => { 
  // 1. Create notifications table
 
  pgm.createTable("notifications", {
    id: {
      type: "UUID",
      primaryKey: true,
      notNull: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "UUID",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },

    title: {
      type: "VARCHAR(150)",
      notNull: true,
    },

    message: {
      type: "TEXT",
      notNull: true,
    },

    type: {
      type: "VARCHAR(50)",
      notNull: true,
    },

    category: {
      type: "VARCHAR(50)",
      notNull: true,
    },

    related_entity_id: {
      type: "UUID",
      notNull: false,
    },

    related_entity_type: {
      type: "VARCHAR(50)",
      notNull: false,
    },

    link: {
      type: "VARCHAR(255)",
      notNull: false,
    },

    metadata: {
      type: "JSONB",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },

    is_read: {
      type: "BOOLEAN",
      notNull: true,
      default: false,
    },

    read_at: {
      type: "TIMESTAMPTZ",
      notNull: false,
    },

    created_at: {
      type: "TIMESTAMPTZ",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });
  // 2. Create indexes

  // Retrieve a user's notifications by date
  pgm.createIndex(
    "notifications",
    ["user_id", { name: "created_at", sort: "DESC" }],
    {
      name: "idx_notifications_user_created",
    }
  );

  // Retrieve unread notifications for a user
  pgm.createIndex(
    "notifications",
    "user_id",
    {
      name: "idx_notifications_user_unread",
      where: "is_read = FALSE",
    }
  );
  
  // 3. Add read status constraint

  pgm.addConstraint("notifications", "notifications_read_status_check", {
    check: `
      (is_read = FALSE AND read_at IS NULL)
      OR
      (is_read = TRUE AND read_at IS NOT NULL)
    `,
  });
};

exports.down = (pgm) => {
  pgm.dropTable("notifications", { cascade: true });
};

