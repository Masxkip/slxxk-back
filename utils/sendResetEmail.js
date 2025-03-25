require("dotenv").config();
const nodemailer = require("nodemailer");

const sendResetEmail = async (userEmail, resetToken) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetURL = `https://slxxk.com/reset-password/${resetToken}`;


    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: "Reset Your Password - SLXXK Blog",
      text: `Click the link to reset your password: ${resetURL}`,
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(" Password reset email sent successfully.");
  } catch (error) {
    console.error(" Error sending password reset email:", error.message);
  }
};

module.exports = sendResetEmail;
