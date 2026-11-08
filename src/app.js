const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const { generalLimiter } = require("./middleware/rateLimiter");

// Routes
const authRoute = require("./routes/authRoute");
const buildingRoute = require("./routes/buildingRoute");
const departmentRoute = require("./routes/departmentRoute");
const unitRoute = require("./routes/unitRoute");
const assetCategoryRoute = require("./routes/assetCategoryRoute");
const userRoute = require("./routes/userRoute");
const assetRoute = require("./routes/assetRoute");
const assignmentRoute = require("./routes/assignmentRoute");
const exitRoute = require("./routes/exitRoute");
const checkoutRoute = require("./routes/checkoutRoute");
const checkinRoute = require("./routes/checkinRoute");
const exitApprovalRoute = require("./routes/exitApprovalRoute");
const transferRoute = require("./routes/transferRoute");
const scanAssetRoute = require("./routes/scanAssetRoute");
const maintenanceRoute = require("./routes/maintenanceRoute");
const auditRoute = require("./routes/auditRoute");
const summaryRoute = require("./routes/dashboardRoute");
const reportRoute = require("./routes/reportRoute");
const securityStationRoute = require("./routes/securityStationRoute");
const priceCollectorRoute = require("./routes/priceCollectorRoute");
const valuationRoute = require("./routes/valuationRoute");
const priceObservationRoute = require("./routes/priceObservationRoute");
const verificationRoute = require("./routes/verificationRoute");
const notificationRoute = require("./routes/notificationRoute");

const app = express();

app.set("trust proxy", 1);

// --------------------------------------------------
// CORS CONFIGURATION
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server
      // requests and certain development tools.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------------------------------------
// SECURITY AND BODY PARSING
// --------------------------------------------------

app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// --------------------------------------------------
// SWAGGER API DOCUMENTATION
// --------------------------------------------------

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

// --------------------------------------------------
// API STATUS
// --------------------------------------------------

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - System
 *     summary: Check API status
 *     responses:
 *       200:
 *         description: API is running successfully.
 */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Fixed Asset Management API is running",
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use("/auth", authRoute);
app.use("/buildings", buildingRoute);
app.use("/departments", departmentRoute);
app.use("/units", unitRoute);
app.use("/asset-categories", assetCategoryRoute);
app.use("/users", userRoute);
app.use("/assets", assetRoute);
app.use("/assignments", assignmentRoute);
app.use("/exits", exitRoute);
app.use("/checkout", checkoutRoute);
app.use("/checkin", checkinRoute);
app.use("/exit-approvals", exitApprovalRoute);
app.use("/transfers", transferRoute);
app.use("/scan", scanAssetRoute);
app.use("/maintenances", maintenanceRoute);
app.use("/audit-logs", auditRoute);
app.use("/dashboard", summaryRoute);
app.use("/reports", reportRoute);
app.use("/station", securityStationRoute);
app.use("/price-collector", priceCollectorRoute);
app.use("/valuation", valuationRoute);
app.use("/observation", priceObservationRoute);
app.use("/email-verification", verificationRoute);
app.use("/notification", notificationRoute);

// --------------------------------------------------
// EXPORT APP
// --------------------------------------------------

module.exports = app;
