const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const sendResetEmail = require("../utils/sendResetEmail");
const sendConfirmationEmail = require("../utils/sendConfirmationEmail");

const router = express.Router();

// ✅ Register with 
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Generate 6-digit code
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

    // ✅ Send email
    await sendConfirmationEmail(email, code);

    res.status(201).json({ message: "User registered! Confirmation code sent to email." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Confirm Email with Code
router.post("/confirm-email", async (req, res) => {
    const { email, code } = req.body;
  
    try {
      const user = await User.findOne({ email });
  
      if (!user) return res.status(404).json({ message: "User not found" });
  
      if (user.isVerified) {
        return res.status(400).json({ message: "User already verified" });
      }
  
      if (
        user.confirmationCode !== code ||
        Date.now() > user.confirmationCodeExpires
      ) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }
  
      user.isVerified = true;
      user.confirmationCode = null;
      user.confirmationCodeExpires = null;
      await user.save();
  
      res.status(200).json({ message: "Email confirmed successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });



  // ✅ Resend Confirmation Code
router.post("/resend-code", async (req, res) => {
    const { email } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.isVerified) return res.status(400).json({ message: "User already verified" });
  
      // Generate a new 6-digit code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.confirmationCode = newCode;
      await user.save();
  
      // Send new confirmation code via email
      await sendEmailConfirmation(user.email, newCode);
  
      res.status(200).json({ message: "New verification code sent to email." });
    } catch (err) {
      res.status(500).json({ message: err.message || "Something went wrong." });
    }
  });
  
  


// ✅ Updated Login Route - Block unverified users
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
  


// Refresh JWT Token After Profile Update
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



// Forgot Password - Send Reset Email
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

        await user.save();

        // Use sendResetEmail.js
        await sendResetEmail(user.email, resetToken);

        res.json({ message: "Password reset email sent!" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




//  Reset Password - Update Password
router.post("/reset-password/:token", async (req, res) => {
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } // Ensure token is not expired
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        //  Hash new password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //  Use MongoDB `$set` to correctly update the password
        await User.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword }, // Update password
                $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } // Remove reset token fields
            }
        );

        res.json({ message: "Password reset successful!" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




module.exports = router;
