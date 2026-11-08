const express = require("express");

const {
  register,
  login,
  getMe,
  refresh,
  logout,
} = require("../controllers/authController");

const authenticate  = require("../middleware/authMiddleware");
const {
  loginLimiter,
  registerLimiter,
  verificationLimiter,
  refreshLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();


/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new Staff account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: ChangeMe123!
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "08012345678"
 *     responses:
 *       "201":
 *         description: Staff account created successfully.
 *       "400":
 *         description: Required fields are missing or empty.
 *       "409":
 *         description: Email is already registered.
 *       "500":
 *         description: Internal server error.
*/
router.post("/register", registerLimiter, register);
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log in to the system
 *     description: Security Staff must provide their assigned security station code. Other users do not need it.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: ChangeMe123!
 *               station_code:
 *                 type: string
 *                 description: Required when logging in as Staff with staff_type SECURITY.
 *                 example: SEC-001
 *     responses:
 *       "200":
 *         description: Login successful. Sets accessToken and refreshToken HTTP-only cookies.
 *       "400":
 *         description: Missing credentials or required security station code.
 *       "401":
 *         description: Invalid email or password.
 *       "403":
 *         description: User account or security station is inactive.
 *       "404":
 *         description: Security station not found.
 *       "500":
 *         description: Internal server error.
 */
router.post("/login",loginLimiter, login);
/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get the current authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       "200":
 *         description: Current user returned successfully.
 *       "401":
 *         description: Authentication required or session invalid.
*/
router.get("/me", authenticate, getMe);
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh authentication tokens
 *     description: Refreshes authentication according to the existing refresh controller and token-cookie implementation.
 *     responses:
 *       "200":
 *         description: Tokens refreshed successfully.
 *       "401":
 *         description: Refresh credentials are invalid or expired.
*/
router.post("/refresh",refreshLimiter, refresh);
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log out
 *     description: Logs out according to the existing logout controller.
 *     responses:
 *       "200":
 *         description: Logout processed successfully.
 *       "401":
 *         description: Authentication or token validation failed.
*/
router.post("/logout", logout);
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log out
 *     description: Logs out according to the existing logout controller.
 *     responses:
 *       "200":
 *         description: Logout processed successfully.
 *       "401":
 *         description: Authentication or token validation failed.
 */
router.post("/logout", logout);



module.exports = router;