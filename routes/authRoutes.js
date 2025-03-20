const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const sendResetEmail = require("../utils/sendResetEmail");

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new user({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login User
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ token, user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


// ✅ Refresh JWT Token After Profile Update
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



// ✅ 1️⃣ Forgot Password - Send Reset Email
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // ✅ Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

        await user.save();

        // ✅ Use sendResetEmail.js
        await sendResetEmail(user.email, resetToken);

        res.json({ message: "Password reset email sent!" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




// ✅ 2️⃣ Reset Password - Update Password
router.post("/reset-password/:token", async (req, res) => {
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } // Ensure token is not expired
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        // ✅ Hash new password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ Use MongoDB `$set` to correctly update the password
        await User.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword }, // ✅ Update password
                $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } // ✅ Remove reset token fields
            }
        );

        res.json({ message: "Password reset successful! You can now log in with your new password." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




module.exports = router;
