import express from 'express';
import multer from 'multer';
import Post from '../models/Post.js';
import verifyToken from '../middleware/authMiddleware.js';
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const router = express.Router();

// Configure Storage for Post Images & Music
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, "uploads/music/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ Create a new post (includes premium + music validation)
router.post("/", verifyToken, upload.fields([{ name: "image" }, { name: "music" }]), async (req, res) => {
  let { title, content, category, isPremium } = req.body;
  isPremium = isPremium === "true" || isPremium === true;

  try {
    // ✅ Block non-subscribers from creating premium posts
    if (isPremium && !req.user.isSubscriber) {
      return res.status(403).json({ message: "Only subscribers can publish premium posts." });
    }

    // ✅ Block non-subscribers from uploading music
    if (!req.user.isSubscriber && req.files["music"]) {
      return res.status(403).json({ message: "Only subscribers can upload music." });
    }

    // ✅ Normalize category
    if (category) {
      category = category.trim().toLowerCase().replace(/\s+/g, " ");
      category = category.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    let imageUrl = null;
    let musicUrl = null;

    // ✅ Upload image to Cloudinary
    if (req.files["image"]) {
      const result = await cloudinary.uploader.upload(req.files["image"][0].path, {
        folder: "post_images",
        resource_type: "image",
      });
      imageUrl = result.secure_url;
      fs.unlinkSync(req.files["image"][0].path);
    }

    // ✅ Upload music to Cloudinary
    if (req.files["music"]) {
      const result = await cloudinary.uploader.upload(req.files["music"][0].path, {
        folder: "post_music",
        resource_type: "auto",
      });
      musicUrl = result.secure_url;
      fs.unlinkSync(req.files["music"][0].path);
    }

    const newPost = new Post({
      title,
      content,
      category,
      author: req.user.id,
      image: imageUrl,
      music: musicUrl,
      isPremium, // ✅ Save premium flag
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Post.distinct("category");
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all posts with optional filters
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const posts = await Post.find(query).populate("author", "username email");

    if (!Array.isArray(posts)) {
      return res.status(500).json({ error: "Unexpected response format" });
    }

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get single post by ID + increment views
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("author", "username");

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update post (owner only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own posts" });
    }

    if (req.body.isPremium && !req.user.isSubscriber) {
      return res.status(403).json({ message: "Only subscribers can mark a post as premium." });
    }

    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content;
    post.isPremium = req.body.isPremium ?? post.isPremium;

    await post.save();
    res.status(200).json({ message: "Post updated successfully!", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete post (owner only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own posts" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Post deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Rate a post
router.post("/:id/rate", verifyToken, async (req, res) => {
  try {
    const { rating } = req.body;
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const existingRating = post.ratings.find((r) => r.user.toString() === req.user.id);
    if (existingRating) {
      return res.status(400).json({ message: "You have already rated this post." });
    }

    post.ratings.push({ user: req.user.id, rating });
    await post.save();

    res.status(200).json({ message: "Rating submitted successfully!", ratings: post.ratings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get average rating
router.get("/:id/ratings", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const totalRatings = post.ratings.length;
    const avgRating = totalRatings > 0
      ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : 0;

    res.status(200).json({ averageRating: avgRating, totalRatings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get my rating
router.get("/:id/my-rating", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const userRating = post.ratings.find((r) => r.user.toString() === req.user.id);
    res.status(200).json({ rating: userRating ? userRating.rating : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get trending posts (by views)
router.get("/trending/posts", async (req, res) => {
  try {
    const trendingPosts = await Post.find()
      .sort({ views: -1 })
      .limit(5)
      .populate("author", "username");

    res.status(200).json(trendingPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ✅ Protected route: Only subscribers can download music
router.get("/download-music/:postId", verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || !post.music) {
      return res.status(404).json({ message: "Music not found for this post." });
    }

    // 🚫 Restrict access to subscribers only
    if (!req.user.isSubscriber) {
      return res.status(403).json({ message: "Access denied. Subscription required." });
    }

    // ✅ If using Cloudinary, redirect to the secure music URL
    return res.redirect(post.music);

    // 🔁 Alternative (if music stored locally on disk):
    // const filePath = path.resolve(post.music); // Ensure full path
    // return res.sendFile(filePath);

  } catch (err) {
    console.error("Error in music download:", err);
    res.status(500).json({ message: "Server error while accessing music." });
  }
});


// Route: /api/posts/premium
router.get("/premium", async (req, res) => {
  try {
    const premiumPosts = await Post.find({ isPremium: true })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("author", "username");
    res.status(200).json(premiumPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



export default router;
