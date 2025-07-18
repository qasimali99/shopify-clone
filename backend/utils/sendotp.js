const nodemailer = require('nodemailer');
require('dotenv').config();

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // Using TLS (STARTTLS)
    secure: false, // Must be false for port 587
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: `"Shopify Clone" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: '🔐 Your OTP Code for Verification',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #222;">🛡️ Email Verification Code</h2>
        <p style="font-size: 18px; color: #333;">
          Please use the following one-time password (OTP) to complete your verification:
        </p>
        <p style="font-size: 28px; font-weight: bold; color: #007bff; letter-spacing: 4px;">
          ${otp}
        </p>
        <p style="color: #666;">This code will expire in 10 minutes.</p>
        <hr />
        <p style="font-size: 12px; color: #999;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendOTP;
