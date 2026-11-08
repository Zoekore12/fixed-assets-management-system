const nodemailer = require("nodemailer");

const requiredEnv = [
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "MAIL_FROM_NAME",
  "MAIL_FROM_ADDRESS",
];

const missingEnv = requiredEnv.filter(
  (key) => !process.env[key]
);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing email configuration: ${missingEnv.join(", ")}`
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});


const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments = [],
}) => {
  return transporter.sendMail({
    from: {
      name: process.env.MAIL_FROM_NAME,
      address: process.env.MAIL_FROM_ADDRESS,
    },
    to,
    subject,
    text,
    html,
    attachments,
  });
};


const verifyEmailConnection = async () => {
  return transporter.verify();
};

module.exports = {
  sendEmail,
  verifyEmailConnection,
};
