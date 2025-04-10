import express from 'express';
import multer from 'multer';
import Post from '../models/Post.js';
import verifyToken from '../middleware/authMiddleware.js';
import uploadMusic from '../middleware/uploadMiddleware.js';
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");

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



// ✅ Create a new post (Now Includes Normalized Category)
router.post("/", verifyToken, upload.fields([{ name: "image" }, { name: "music" }]), async (req, res) => {
  let { title, content, category } = req.body;

  try {
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
      fs.unlinkSync(req.files["image"][0].path); // Clean up
    }

    // ✅ Upload music to Cloudinary
    if (req.files["music"]) {
      const result = await cloudinary.uploader.upload(req.files["music"][0].path, {
        folder: "post_music",
        resource_type: "auto", // audio/mp3 handled
      });
      musicUrl = result.secure_url;
      fs.unlinkSync(req.files["music"][0].path); // Clean up
    }

    const newPost = new Post({
      title,
      content,
      category,
      author: req.user.id,
      image: imageUrl,
      music: musicUrl,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.get("/categories", async (req, res) => {
  try {
    const categories = await Post.distinct("category");
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: error.message });
  }
});



// Get all posts with optional filters
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
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single post by ID & increment views
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

// Update post (owner only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own posts" });
    }

    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content;
    await post.save();

    res.status(200).json({ message: "Post updated successfully!", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post (owner only)
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

// Rate a post
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

// Get average rating
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

// Get user's rating for post
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

//  Get trending posts (by views)
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


export default router;
