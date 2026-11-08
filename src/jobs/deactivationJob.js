const cron = require("node-cron");

const {deactivateInactiveAccounts} = require("../services/deactivationService");

const startAccountDeactivationJob = () => {
  // Run daily at 2:00 AM server time.
  cron.schedule("0 2 * * *", async () => {
    try {
      await deactivateInactiveAccounts();
    } catch (error) {
      console.error("Scheduled deactivation failed:", error);
    }
  });

  console.log("Account deactivation job scheduled.");
};

module.exports = { startAccountDeactivationJob };
