require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Maximum connections per Node.js process
  max: Number(process.env.DB_POOL_MAX) || 5,

  // Wait up to 15 seconds to establish a connection
  connectionTimeoutMillis: 15000,

  // Close idle connections after 10 seconds
  idleTimeoutMillis: 10000,

  // Enable TCP keepalive
  keepAlive: true,
});

pool.on("connect", () => {
  console.log("New PostgreSQL pool connection established");
});

pool.on("error", (error) => {
  console.error("Unexpected idle PostgreSQL client error:", error);
});

module.exports = pool;