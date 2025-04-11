import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.js';
import nodemailer from 'nodemailer';
import sendResetEmail from '../utils/sendResetEmail.js';
import sendConfirmationEmail from '../utils/sendConfirmationEmail.js';

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      confirmationCode: code,
      confirmationCodeExpires: codeExpiry,
    });

    await newUser.save();
    await sendConfirmationEmail(email, code);

    res.status(201).json({ message: "User registered! Confirmation code sent to email." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm Email
router.post("/verify-email", async (req, res) => {
  const { code } = req.body;

  try {

    if (
      user.confirmationCode !== code ||
      Date.now() > user.confirmationCodeExpires
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    user.confirmationCode = null;
    user.confirmationCodeExpires = null;
    await user.save();

    res.status(200).json({ message: "Email confirmed successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resend Confirmation Code
router.post("/resend-code", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.confirmationCode = newCode;
    await user.save();

    await sendConfirmationEmail(user.email, newCode);

    res.status(200).json({ message: "New verification code sent to email." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Something went wrong." });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Refresh JWT After Profile Update
router.post("/refresh-token", async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();
    await sendResetEmail(user.email, resetToken);

    res.json({ message: "Password reset email sent!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
      }
    );

    res.json({ message: "Password reset successful!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
