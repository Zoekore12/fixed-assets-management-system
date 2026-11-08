
require("dotenv").config();

const { ApifyClient } = require("apify-client");

const inspectRun = async () => {
  const token = process.env.APIFY_API_TOKEN;
  const runId = process.env.APIFY_RUN_ID;

  if (!token || !runId) {
    throw new Error(
      "APIFY_API_TOKEN or APIFY_RUN_ID is missing from .env"
    );
  }

  const client = new ApifyClient({ token });

  // Retrieve the existing Actor run.
  const run = await client.run(runId).get();

  if (!run) {
    throw new Error("Apify run was not found");
  }

  console.log("Run status:", run.status);
  console.log("Actor ID:", run.actId);
  console.log("Dataset ID:", run.defaultDatasetId);

  if (!run.defaultDatasetId) {
    throw new Error("This run has no default dataset");
  }

  // Retrieve the actual Actor output.
  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 10 });

  console.log("Number of records retrieved:", items.length);
  console.dir(items, { depth: null });
};

inspectRun().catch((error) => {
  console.error("Unable to inspect Apify run:", error.message);
  process.exitCode = 1;
});
