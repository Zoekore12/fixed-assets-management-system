
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Fixed Assets Management API",
      version: "1.0.0",
      description:
        "API documentation for the Fixed Assets Management System.",
    },

    servers: [
      {
        url: "http://localhost:7000",
        description: "Local development server",
      },
    ],

    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description:
            "Authentication using the accessToken HTTP-only cookie.",
        },
      },
    },
  },

  // Run npm commands from the backend directory.
  apis: [
    "./src/routes/*.js",
    "./src/app.js",
  ],

  failOnErrors: true,
};

const swaggerSpec = swaggerJsdoc(options);

console.log(
  "Swagger discovered paths:",
  Object.keys(swaggerSpec.paths || {})
);

module.exports = swaggerSpec;
