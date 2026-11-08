const pool = require("../config/database");

const {createUser,findUserByEmail,findUserById,} = require("../models/userModel");
const {createRefreshToken,findRefreshToken,revokeRefreshToken,revokeAllUserRefreshTokens,} = require("../models/refreshTokenModel");

const {hashPassword,comparePassword,generateAccessToken,generateRefreshToken,hashRefreshToken,verifyRefreshToken,} = require("../utils/auth");

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    //  Basic input cleanup
    
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim() : null;

    if (!cleanName || !cleanEmail || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password cannot be empty",
      });
    }

    // Check if email already exists

    const existingUser = await findUserByEmail(cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // 5. Create user
    const user = await createUser({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
      role: "Staff",
      staffType:"GENERAL",
    });

    // Send response

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Login function
const login = async (req, res) => {
  try {
    const { email, password, station_code } = req.body;

    // Validate basic login fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Clean email
    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = await findUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // Check password
    const passwordMatches = await comparePassword(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ---------------------------------------
    // SECURITY STATION
    // Only Security Staff need a station
    // ---------------------------------------

    let station = null;

    if (
      user.role === "Staff" &&
      user.staff_type === "SECURITY"
    ) {
      if (
        typeof station_code !== "string" ||
        !station_code.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Security station code is required",
        });
      }

      const cleanStationCode = station_code.trim().toUpperCase();

      const stationResult = await pool.query(
        `
          SELECT
            ss.id,
            ss.station_code,
            ss.name,
            ss.building_id,
            ss.is_active,
            b.name AS building_name
          FROM security_stations ss
          INNER JOIN buildings b
            ON b.id = ss.building_id
          WHERE UPPER(TRIM(ss.station_code)) = $1
          LIMIT 1
        `,
        [cleanStationCode]
      );

      if (stationResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Security station not found",
          station_code_received: cleanStationCode,
        });
      }

      station = stationResult.rows[0];

      if (!station.is_active) {
        return res.status(403).json({
          success: false,
          message: "Security station is inactive",
        });
      }

      // Attach station to the user before generating the JWT.
      user.stationId = station.id;
    }

  // UPDATE LAST SUCCESSFUL LOGIN

    await pool.query(
      `UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [user.id]
    );

    // ---------------------------------------
    // GENERATE TOKENS
    // ---------------------------------------

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const tokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const isProduction = process.env.NODE_ENV === "production";

    await createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip,
    });

    // ---------------------------------------
    // ACCESS TOKEN COOKIE
    // ---------------------------------------

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
    });

    // ---------------------------------------
    // REFRESH TOKEN COOKIE
    // ---------------------------------------

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ---------------------------------------
    // RESPONSE
    // ---------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        staff_type: user.staff_type,
        department_id: user.department_id,
        unit_id: user.unit_id,

        // Email verification status
        is_email_verified: user.is_email_verified,

        station: station
          ? {
              id: station.id,
              station_code: station.station_code,
              name: station.name,
              building_id: station.building_id,
              building_name: station.building_name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// GET CURRENT USER
const getMe = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// REFRESH ACCESS TOKEN
const refresh = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    // Check if refresh token exists
    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    // Verify refresh token JWT
    const decoded = verifyRefreshToken(oldRefreshToken);

    // Hash token so we can compare it with the database
    const oldTokenHash = hashRefreshToken(oldRefreshToken);

    // Find token in database
    const storedToken = await findRefreshToken(oldTokenHash);

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Detect reuse of an already revoked refresh token
    if (storedToken.revoked_at) {
      console.warn(
        `Refresh token reuse detected for user ${storedToken.user_id}`
      );

      // Revoke every active refresh token belonging to this user
      await revokeAllUserRefreshTokens(storedToken.user_id);

      // Clear authentication cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return res.status(401).json({
        success: false,
        message: "Refresh token reuse detected. Please log in again.",
      });
    }

    // Check database expiration
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    // Get the actual user from the database
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    // Make sure the account is still active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    // Revoke the old refresh token
    await revokeRefreshToken(oldTokenHash);

    //Generate a new refresh token
    const newRefreshToken = generateRefreshToken(user);

    // Hash the new refresh token
    const newTokenHash = hashRefreshToken(newRefreshToken);

    // Set new refresh token expiration
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    // Save new refresh token in database
    await createRefreshToken({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip,
    });

    // 14. Generate new access token
    const newAccessToken = generateAccessToken(user);

    // 15. Set new access token cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    // 16. Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 17. Send response
    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

// LOGOUT
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);

      await revokeRefreshToken(tokenHash);
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



module.exports = {
  register,
  login,
  getMe,
  refresh,
  logout
};