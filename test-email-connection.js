
require("dotenv").config();

const { sendEmail } = require("../backend/src/services/emailService");

const testEmail = async () => {
  try {
    const result = await sendEmail({
      to: process.env.GMAIL_USER,
      subject: "Ministry Fixed Assets - Email Test",
      text: "Your Gmail SMTP email service is working.",
      html: `
        <h2>Ministry Fixed Assets Management System</h2>
        <p>Your Gmail SMTP email service is working successfully.</p>
      `,
    });

    console.log("Test email sent:", result.messageId);
  } catch (error) {
    console.error("Email test failed:", error.message);
  }
};

testEmail();
