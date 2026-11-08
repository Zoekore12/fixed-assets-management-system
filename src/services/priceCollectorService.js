
const { ApifyClient } = require("apify-client");
const { createValuationService } = require("./valuationService");

const valuationService = createValuationService();

const collectAndSavePrices = async ({ valuationId, searchTerm }) => {
  if (typeof valuationId !== "string" || !valuationId.trim()) {
    const error = new Error("A valid valuationId is required");
    error.statusCode = 400;
    throw error;
  }

  if (typeof searchTerm !== "string" || !searchTerm.trim()) {
    const error = new Error("A product search term is required");
    error.statusCode = 400;
    throw error;
  }

  const token = process.env.APIFY_API_TOKEN;
  const actorId = process.env.APIFY_PRODUCT_ACTOR_ID;

  if (!token || !actorId) {
    const error = new Error(
      "Apify configuration is missing from the backend .env file"
    );
    error.statusCode = 500;
    throw error;
  }

  const client = new ApifyClient({ token });

  // Use the input fields confirmed from your Apify actor.
  const actorInput = {
    country: "ng",
    enrichDetails: false,
    maxPagesPerQuery: 3,
    maxResults: 1,
    proxyProvider: "auto",
    searchQueries: [searchTerm.trim()],
  };

  // Start the actor and wait for it to finish.
  const run = await client.actor(actorId).call(actorInput);

  if (!run || run.status !== "SUCCEEDED") {
    const error = new Error(
      `Apify actor did not succeed. Status: ${run?.status || "UNKNOWN"}`
    );
    error.statusCode = 502;
    throw error;
  }

  if (!run.defaultDatasetId) {
    const error = new Error("Apify run did not return a dataset");
    error.statusCode = 502;
    throw error;
  }

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 100 });

  if (!items || items.length === 0) {
    const error = new Error(
      "Apify completed successfully but returned no product listings"
    );
    error.statusCode = 422;
    throw error;
  }

  const savedObservations = [];
  const errors = [];
  const seenUrls = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const product = items[index];

    try {
      const productTitle = product?.name?.trim();
      const productUrl = product?.url?.trim();
      const sourceName = productUrl
        ? new URL(productUrl).hostname.replace(/^www\./, "")
        : "";

      const price = Number(product?.price);

      if (!productTitle || !productUrl || !sourceName) {
        throw new Error("Product name and valid product URL are required");
      }

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Product must have a valid positive price");
      }

      if (seenUrls.has(productUrl)) {
        continue;
      }
      seenUrls.add(productUrl);

      const observation = await valuationService.addMarketPrice({
        valuationId: valuationId.trim(),
        data: {
          sourceName,
          productTitle,
          productUrl,
          listedPrice: price,
          currency: product.currency || "NGN",
          brand: product.brand || null,
          model: null,
          availabilityStatus:
            product.inStock === true
              ? "AVAILABLE"
              : product.inStock === false
                ? "UNAVAILABLE"
                : "UNKNOWN",
          isComparable: false,
          exclusionReason:
            "Awaiting Administrator verification of asset comparability",
        },
      });

      savedObservations.push(observation);
    } catch (error) {
      errors.push({
        index,
        productTitle: product?.name || null,
        message: error.message,
      });
    }
  }

  return {
    valuationId,
    searchTerm: searchTerm.trim(),
    apifyRunId: run.id,
    totalReceived: items.length,
    savedCount: savedObservations.length,
    failedCount: errors.length,
    observations: savedObservations,
    errors,
  };
};

module.exports = { collectAndSavePrices };
