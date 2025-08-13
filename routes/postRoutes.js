import express from "express";
import multer from "multer";
import Post from "../models/Post.js";
import verifyToken from "../middleware/authMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import mongoose from "mongoose";

const router = express.Router();

// ---------- Multer storage ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith("audio/")) cb(null, "uploads/music/");
    else cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage });

// ---------- Create posts ----------
router.post(
  "/",
  verifyToken,
  upload.fields([{ name: "image" }, { name: "music" }]),
  async (req, res) => {
    let { title, content, category, isPremium } = req.body;
    isPremium = isPremium === "true" || isPremium === true;

    try {
      // Block non-subscribers from premium or music upload
      if (isPremium && !req.user.isSubscriber) {
        return res
          .status(403)
          .json({ message: "Only subscribers can publish premium posts." });
      }
      if (!req.user.isSubscriber && req.files["music"]) {
        return res
          .status(403)
          .json({ message: "Only subscribers can upload music." });
      }

      // Normalize category to Title Case with single spaces
      if (category) {
        category = category
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }

      let imageUrl = null;
      let musicUrl = null;

      if (req.files["image"]) {
        const result = await cloudinary.uploader.upload(
          req.files["image"][0].path,
          { folder: "post_images", resource_type: "image" }
        );
        imageUrl = result.secure_url;
        fs.unlinkSync(req.files["image"][0].path);
      }

      if (req.files["music"]) {
        const result = await cloudinary.uploader.upload(
          req.files["music"][0].path,
          { folder: "post_music", resource_type: "auto" }
        );
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
        isPremium,
      });

      await newPost.save();
      res
        .status(201)
        .json({ message: "Post created successfully!", post: newPost });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ---------- Categories ----------
router.get("/categories", async (req, res) => {
  try {
    const categories = await Post.distinct("category");
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ---------- get all posts Paginated list ----------
// ---------- get all posts Paginated list ----------
router.get("/", async (req, res) => {
  try {
    let { search, category, isPremium, page = 1, limit = 7 } = req.query;

    const MAX_LIMIT = 50;
    page = parseInt(page, 10) || 1;
    limit = Math.min(MAX_LIMIT, parseInt(limit, 10) || 7);

    const query = {};

    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      const normalized = category
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      query.category = normalized;
    }

    // NEW: optional premium filter ("true"/"false")
    if (typeof isPremium !== "undefined") {
      query.isPremium = String(isPremium) === "true";
    }

    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username email isSubscriber"),
      Post.countDocuments(query),
    ]);

    res.status(200).json({
      posts,
      hasMore: skip + posts.length < totalPosts,
      total: totalPosts,      // <-- used by frontend for full index
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ---------- Trending posts ----------
router.get("/trending/posts", async (req, res) => {
  try {
    const trendingPosts = await Post.find()
      .sort({ views: -1 })
      .limit(5)
      .populate("author", "username isSubscriber");
    res.status(200).json(trendingPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Premium post ----------
router.get("/premium/posts", async (req, res) => {
  try {
    const premiumPosts = await Post.find({ isPremium: true })
      .sort({ createdAt: -1 })
      .populate("author", "username isSubscriber");
    res.status(200).json(premiumPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Protected music download  ----------
router.get("/download-music/:postId", verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post || !post.music) {
      return res.status(404).json({ message: "Music not found for this post." });
    }
    if (!req.user.isSubscriber) {
      return res
        .status(403)
        .json({ message: "Access denied. Subscription required." });
    }

    return res.redirect(post.music);
  } catch (err) {
    console.error("Error in music download:", err);
    res.status(500).json({ message: "Server error while accessing music." });
  }
});

// ---------- Get single by id post ----------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Post not found" });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("author", "username isSubscriber");

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- create post update ----------
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized: You can only edit your own posts" });
    }

    if (req.body.isPremium && !req.user.isSubscriber) {
      return res
        .status(403)
        .json({ message: "Only subscribers can mark a post as premium." });
    }

    post.title = req.body.title ?? post.title;
    post.content = req.body.content ?? post.content;
    post.isPremium = req.body.isPremium ?? post.isPremium;

    await post.save();
    res.status(200).json({ message: "Post updated successfully!", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Delete post ----------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized: You can only delete your own posts" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Post deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Rate post----------
router.post("/:id/rate", verifyToken, async (req, res) => {
  try {
    const { rating } = req.body;
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const existingRating = post.ratings.find(
      (r) => r.user.toString() === req.user.id
    );
    if (existingRating) {
      return res.status(400).json({ message: "You have already rated this post." });
    }

    post.ratings.push({ user: req.user.id, rating });
    await post.save();

    res
      .status(200)
      .json({ message: "Rating submitted successfully!", ratings: post.ratings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Ratings summary ----------
router.get("/:id/ratings", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const totalRatings = post.ratings.length;
    const avgRating =
      totalRatings > 0
        ? (
            post.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
          ).toFixed(1)
        : 0;

    res.status(200).json({ averageRating: avgRating, totalRatings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- My rating ----------
router.get("/:id/my-rating", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const userRating = post.ratings.find(
      (r) => r.user.toString() === req.user.id
    );
    res.status(200).json({ rating: userRating ? userRating.rating : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
