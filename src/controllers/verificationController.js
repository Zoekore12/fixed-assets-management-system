const pool = require("../config/database");
const path = require("path");

const {
  createVerificationCode,
  verifyEmailCode,
} = require("../models/verificationModel");
const { sendEmail } = require("../services/emailService");

const sendVerificationCode = async (req, res) => {
  try {
    // User must be authenticated, but email verification is optional.
    const userId = req.user.id;

    const userResult = await pool.query(
      `
        SELECT id, name, email, is_email_verified, is_active
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
    }

    if (user.is_email_verified) {
      return res.status(400).json({
        success: false,
        message: "Your email is already verified.",
      });
    }

    const code = await createVerificationCode(user.id);

    try {
      await sendEmail({
            to: user.email,
            subject: "Email Verification - Ministry Fixed Assets",
            text: `Hello ${user.name},

            Your email verification code is: ${code}

            This code expires in 10 minutes.

            If you did not request this code, you can ignore this email.`,
            html: `
                <div style="
                font-family: Arial, sans-serif;
                background: #f3f7fb;
                padding: 30px 12px;
                ">
                <div style="
                    max-width: 520px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #dbe5ef;
                ">
                    <div style="
                    text-align: center;
                    padding: 28px 20px 18px;
                    border-bottom: 1px solid #e5edf5;
                    ">
                    <img
                        src="cid:lasglogo"
                        alt="lagos logo"
                        width="90"
                        style="
                        display: block;
                        width: 90px;
                        max-width: 100%;
                        height: auto;
                        margin: 0 auto 16px;
                        "
                    />

                    <h2 style="
                        margin: 0;
                        color: #163b65;
                        font-size: 20px;
                    ">
                        Fixed Assets Management System
                    </h2>

                    <p style="color: #64748b; margin-bottom: 0;">
                        Email Verification
                    </p>
                    </div>

                    <div style="padding: 28px 24px; text-align: center;">
                    <p style="color: #334155; text-align: left;">
                        Hello ${user.name},
                    </p>

                    <p style="color: #334155; line-height: 1.6;">
                        Use the verification code below to confirm ownership
                        of your email address.
                    </p>

                    <div style="
                        background: #edf5ff;
                        border: 1px solid #c8ddf5;
                        border-radius: 10px;
                        padding: 20px 10px;
                        margin: 24px 0;
                    ">
                        <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        color: #174b80;
                        ">
                        ${code}
                        </div>
                    </div>

                    <p style="color: #b45309; font-size: 14px;">
                        This code expires in 10 minutes.
                    </p>

                    <p style="
                        color: #64748b;
                        font-size: 13px;
                        line-height: 1.6;
                    ">
                        Email verification is optional. You can continue using
                        the system without verifying your email.
                    </p>
                    </div>

                    <div style="
                    background: #f8fafc;
                    border-top: 1px solid #e5edf5;
                    text-align: center;
                    padding: 16px;
                    color: #64748b;
                    font-size: 12px;
                    ">
                    Fixed Assets Management System
                    </div>
                </div>
                </div>
            `,
            attachments: [
                {
                filename: "lasglogo.png",
                path: path.join(
                    __dirname,
                    "../assets/lasglogo.png"
                ),
                cid: "lasglogo",
                },
            ],
            });
    } catch (emailError) {
      console.error("Verification email failed:", emailError.message);

      return res.status(502).json({
        success: false,
        message: "Could not send the verification email. Please request a new code later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your registered email address.",
    });
  } catch (error) {
    console.error("Send verification code error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};
const verifyEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid six-digit verification code.",
      });
    }

    const result = await verifyEmailCode(userId, code);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

module.exports = {
  sendVerificationCode,
  verifyEmail,
};
