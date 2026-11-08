
const finiteNonNegative = (value, name) => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    throw new Error(`${name} is required`);
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(
      `${name} must be a non-negative number`
    );
  }

  return number;
};

// Calculate market appreciation or decline.
function calculateMarketChange({
  purchasePrice,
  currentMarketValue,
}) {
  const purchase = finiteNonNegative(
    purchasePrice,
    "purchasePrice"
  );
  const current = finiteNonNegative(
    currentMarketValue,
    "currentMarketValue"
  );

  if (purchase <= 0) {
    throw new Error(
      "purchasePrice must be greater than zero"
    );
  }

  const delta = current - purchase;

  return {
    purchasePrice: purchase,
    currentMarketValue: current,
    valueChange: delta,
    percentageChange: (delta / purchase) * 100,
    depreciationAmount: Math.max(0, -delta),
    appreciationAmount: Math.max(0, delta),
    valuationType:
      delta < 0
        ? "DEPRECIATED"
        : delta > 0
          ? "APPRECIATED"
          : "UNCHANGED",
  };
}

// Calculate the average of verified comparable prices.
function averagePrice(observations) {
  if (
    !Array.isArray(observations) ||
    observations.length === 0
  ) {
    throw new Error(
      "At least one comparable market price is required"
    );
  }

  const prices = observations.map((item) =>
    finiteNonNegative(item.price, "market price")
  );

  if (prices.some((price) => price <= 0)) {
    throw new Error(
      "Market prices must be greater than zero"
    );
  }

  return (
    prices.reduce((sum, price) => sum + price, 0) /
    prices.length
  );
}

module.exports = {
  calculateMarketChange,
  averagePrice,
};
