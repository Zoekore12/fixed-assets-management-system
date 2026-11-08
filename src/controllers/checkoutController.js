const { validate: isUuid } = require("uuid");


const {checkoutAsset,} = require("../services/checkoutService");

const checkout = async (req, res) => {
  try {
    const { id: assetId } = req.params;

    if (!isUuid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const result = await checkoutAsset({
      assetId,
      securityOfficerId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Asset checked out successfully",
      exit: result.exit,
      asset: result.asset,
    });
  } catch (error) {
    console.error("Asset checkout error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : "Internal server error",
    });
  }
};

module.exports = { checkout };