const { ApifyClient } = require("apify-client");

const token = process.env.APIFY_API_TOKEN;
const defaultActorId = process.env.APIFY_PRODUCT_ACTOR_ID;

if (!token) {
  throw new Error("APIFY_API_TOKEN is missing from backend .env");
}

const client = new ApifyClient({ token });

const runProductActor = async ({
  actorId = defaultActorId,
  input,
}) => {
  if (!actorId) {
    const error = new Error("Apify Actor ID is required");
    error.statusCode = 500;
    throw error;
  }

  if (!input || typeof input !== "object") {
    const error = new Error("Valid Actor input is required");
    error.statusCode = 400;
    throw error;
  }

  try {
    // Run the Actor and wait for completion.
    const run = await client.actor(actorId).call(input);

    if (run.status !== "SUCCEEDED") {
      const error = new Error(
        `Apify Actor finished with status: ${run.status}`
      );
      error.statusCode = 502;
      throw error;
    }

    // Retrieve the Actor's output dataset.
    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems();

    return {
      runId: run.id,
      actorId,
      itemCount: items.length,
      items,
    };
  } catch (error) {
    console.error("Apify product collection failed:", error.message);

    if (error.statusCode) {
      throw error;
    }

    const apiError = new Error("Unable to collect products from Apify");
    apiError.statusCode = 502;
    throw apiError;
  }
};

module.exports = { runProductActor };
