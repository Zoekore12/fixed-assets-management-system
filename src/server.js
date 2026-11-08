require("dotenv").config();

const app = require("./app");
const pool = require("./config/database");
const {
  startAccountDeactivationJob,
} = require("./jobs/deactivationJob");

const PORT = process.env.PORT || 7000;

const startServer = async () => {
  try {
    // Verify database connection
    await pool.query("SELECT NOW()");
    console.log("Database connection established successfully");

    // Start the 5-year inactive-account deactivation job
    startAccountDeactivationJob();
    console.log("Account deactivation job started successfully");

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          await pool.end();
          console.log("Database connections closed");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
};

startServer();
