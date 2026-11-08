const express = require("express");

const {
  sendVerificationCode,
  verifyEmail,
} = require("../controllers/verificationController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// Both endpoints require the user to be logged in.
router.use(authenticate);
/**
 * @swagger
 * /email-verification/send-code:
 *   post:
 *     summary: Send an email verification code
 *     description: >
 *       Sends a six-digit verification code to the authenticated user's
 *       registered email address. The code expires after 10 minutes.
 *       Email verification is optional. The user must have an active
 *       account and an email address that has not already been verified.
 *     tags: [Email Verification]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification code sent to your registered email address.
 *       400:
 *         description: Email address is already verified
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Your email is already verified.
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User account is inactive
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Your account is inactive.
 *       404:
 *         description: Authenticated user not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: User not found.
 *       502:
 *         description: Verification email could not be sent
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Could not send the verification email. Please request a new code later.
 *       500:
 *         description: Unexpected server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: An unexpected error occurred.
*/
// Send a verification code to the authenticated user's email.
router.post("/send-code", sendVerificationCode);
/**
 * @swagger
 * /email-verification/verify-email:
 *   post:
 *     summary: Verify the authenticated user's email address
 *     description: >
 *       Verifies the authenticated user's email address using the
 *       six-digit code sent to their registered email. The code must
 *       be a string containing exactly six digits and must be valid
 *       according to the email verification service.
 *     tags: [Email Verification]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: Six-digit verification code received by email
 *                 example: "483921"
 *           example:
 *             code: "483921"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Email verified successfully.
 *       400:
 *         description: Invalid, expired, or incorrect verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Enter a valid six-digit verification code.
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Unexpected server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: An unexpected error occurred.
*/
// Verify the six-digit code.
router.post("/verify-email", verifyEmail);

module.exports = router;