exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.maintenance_requests
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  `);
};

exports.down = (pgm) => {
  // Intentionally empty: preserve the existing column and its data.
};