// utils/sendConfirmationEmail.js

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @desc Send confirmation code to user's email
 * @param {string} email - Email address of the user
 * @param {string} code - 6-digit confirmation code
 */
const sendConfirmationEmail = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Confirm Your Email - SLXXK Blog",
    html: `
      <h2>Welcome to SLXXK Blog 🎉</h2>
      <p>Please confirm your email by entering this 6-digit code:</p>
      <h1 style="color: #6a1bbd;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <br />
      <small>If you didn’t create an account, you can ignore this email.</small>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default sendConfirmationEmail;
