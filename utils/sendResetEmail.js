require("dotenv").config();
const nodemailer = require("nodemailer");

const sendResetEmail = async (userEmail, resetToken) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,  // ✅ IONOS SMTP host
      port: process.env.EMAIL_PORT,  // ✅ IONOS SMTP port (587)
      secure: false, // ✅ Keep false for TLS (port 587)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetURL = `https://slxxk.vercel.app/reset-password/${resetToken}`; // ✅ Update to your live domain

    const mailOptions = {
      from: process.env.EMAIL_FROM, // ✅ Use the sender email from .env
      to: userEmail, // ✅ Now, send emails to real users
      subject: "Reset Your Password - SLXXK Blog",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent successfully.");
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
  }
};

module.exports = sendResetEmail;
