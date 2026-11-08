exports.up = (pgm) => {
  pgm.addColumn("users", {
    staff_type: {
      type: "varchar(30)",
      notNull: true,
      default: "GENERAL",
    },
  });

  pgm.addConstraint("users", "users_staff_type_check", {
    check: "staff_type IN ('GENERAL', 'SECURITY')",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    "users",
    "users_staff_type_check"
  );

  pgm.dropColumn("users", "staff_type");
};