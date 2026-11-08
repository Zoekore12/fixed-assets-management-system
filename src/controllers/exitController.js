const {submitExitRequest} = require("../services/requestService");


const submitRequest = async (req, res, next) => {
  try {
    const { id: assetId } = req.params;

    const {
      taken_by_user_id,
      destination,
      reason,
      expected_return_date,
      notes,
    } = req.body;

    const request = await submitExitRequest({
      assetId,
      userId: req.user.id,
      userRole: req.user.role,
      takenByUserId: taken_by_user_id,
      destination,
      reason,
      expectedReturnDate: expected_return_date,
      notes,
    });

    return res.status(201).json({
      success: true,
      message:
        req.user.role === "Administrator"
          ? "Administrator checkout request created and automatically approved"
          : "Checkout request submitted successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {submitRequest,};