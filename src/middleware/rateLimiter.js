const { rateLimit } = require("express-rate-limit");

const createRateLimiter = ({
  windowMs,
  limit,
  message,
}) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
};

// General API protection
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: "Too many requests. Please try again later.",
});

// Login protection
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

// Registration protection
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many registration attempts. Please try again later.",
});

// Email verification protection
const verificationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many verification attempts. Please try again later.",
});

// Token refresh protection
const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many refresh requests. Please try again later.",
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  verificationLimiter,
  refreshLimiter,
};
