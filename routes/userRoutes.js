import express from 'express';
import multer from 'multer';
import User from '../models/user.js';
import Post from '../models/Post.js';
import verifyToken from '../middleware/authMiddleware.js';
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import axios from "axios";
import crypto from "crypto";


const router = express.Router();


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + "_" + Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

// Get user profile and activity
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const posts = await Post.find({ author: req.params.id });
    const allPosts = await Post.find({});

    const comments = [];
    const replies = [];
    const ratings = [];

    allPosts.forEach(post => {
      post.comments.forEach(comment => {
        if (comment.author.toString() === req.params.id) {
          comments.push({
            postId: post._id,
            postTitle: post.title,
            commentText: comment.text,
            createdAt: comment.createdAt
          });
        }

        comment.replies.forEach(reply => {
          if (reply.author.toString() === req.params.id) {
            replies.push({
              postId: post._id,
              postTitle: post.title,
              commentText: comment.text,
              replyText: reply.text,
              createdAt: reply.createdAt
            });
          }
        });
      });

      post.ratings.forEach(rating => {
        if (rating.user.toString() === req.params.id) {
          ratings.push({
            postId: post._id,
            postTitle: post.title,
            ratingValue: rating.rating
          });
        }
      });
    });

    res.status(200).json({
      ...user.toObject(),
      posts,
      comments,
      replies,
      ratings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//  Update user profile
router.put("/:id", verifyToken, upload.single("profilePic"), async (req, res) => {
  if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized: You can only update your own profile" });
  }

  try {
      const { username, bio, location, website } = req.body;
      let updateData = { username, bio, location, website };

      //  Upload profile picture to Cloudinary
      if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path, {
              folder: "profile_pics",
              resource_type: "image",
          });
          updateData.profilePicture = result.secure_url;
          fs.unlinkSync(req.file.path); // delete the file after upload
      }

      const updatedUser = await User.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { new: true }
      ).select("-password");

      res.status(200).json({ message: "Profile updated successfully!", user: updatedUser });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


// POST /api/users/verify-subscription
router.post("/verify-subscription", verifyToken, async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ message: "Transaction reference missing" });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = response.data.data;

    if (paystackData.status !== "success") {
      return res.status(400).json({ message: "Payment not successful" });
    }

    // Find user and update subscription fields
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isSubscriber = true;
    user.subscriptionStart = new Date();
    user.subscriptionRenewalReminderSent = false;
    user.paystackCustomerCode = paystackData.customer?.customer_code || null;
    user.paystackSubscriptionCode = paystackData.subscription || null;

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      message: "Subscription verified",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Verification error:", error.message);
    res.status(500).json({ message: "Verification failed", error: error.message });
  }
});



// POST /api/users/paystack/webhook
router.post("/paystack/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret)
      .update(req.body)
      .digest('hex');

    const signature = req.headers['x-paystack-signature'];
    if (hash !== signature) {
      return res.status(401).send('Unauthorized');
    }

    const event = JSON.parse(req.body.toString());
    console.log("🔥 Webhook event received:", event.event);

    if (event.event === "charge.success") {
      const email = event.data?.customer?.email;
      if (!email) return res.status(400).send("No email found in webhook");

      const user = await User.findOne({ email });
      if (!user) return res.status(404).send("User not found");

      user.isSubscriber = true;
      user.subscriptionStart = new Date();
      user.paystackCustomerCode = event.data.customer.customer_code;
      user.paystackSubscriptionCode = event.data.subscription;

      await user.save();
      console.log("✅ Webhook user updated:", email);
    }

    // ❌ INVOICE FAILED
if (event.event === "invoice.failed") {
  const email = event.data?.customer?.email;
  const user = await User.findOne({ email });
  if (user) {
    user.isSubscriber = false;
    await user.save();
    console.log("❌ Subscription payment failed:", email);
  }
}

// ⌛ SUBSCRIPTION EXPIRED
if (event.event === "subscription.expired") {
  const email = event.data?.customer?.email;
  const user = await User.findOne({ email });
  if (user) {
    user.isSubscriber = false;
    await user.save();
    console.log("⚠️ Subscription expired for:", email);
  }
}


    // You can handle other events like "subscription.disable" or "invoice.failed" later

    return res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).send("Webhook error");
  }
});




// Get current logged-in 
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


export default router;
