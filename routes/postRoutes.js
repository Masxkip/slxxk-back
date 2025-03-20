const express = require("express");
const Post = require("../models/Post");
const verifyToken = require("../middleware/authMiddleware");
const uploadMusic = require("../middleware/uploadMiddleware");
const multer = require("multer");

const router = express.Router();

// ✅ Configure Storage for Post Images & Music
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      if (file.mimetype.startsWith("audio/")) {
          cb(null, "uploads/music/"); // Store music files in uploads/music
      } else {
          cb(null, "uploads/"); // Store images in uploads/
      }
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ Create a new post (Now Includes Category)
router.post("/", verifyToken, upload.fields([{ name: "image" }, { name: "music" }]), async (req, res) => {
  const { title, content, category } = req.body;

  try {
    const newPost = new Post({
      title,
      content,
      category, // 🔹 Save category
      author: req.user.id,
      image: req.files["image"] ? `http://localhost:5000/uploads/${req.files["image"][0].filename}` : null,
      music: req.files["music"] ? `http://localhost:5000/uploads/music/${req.files["music"][0].filename}` : null
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ✅ Get all posts (Now Supports Category Filtering)
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    // 🔹 Search by keyword in title or content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    // 🔹 Filter by category
    if (category) {
      query.category = category;
    }

    const posts = await Post.find(query).populate("author", "username email");
    if (!posts.length) {
      return res.status(404).json({ message: "No posts found" });
    }
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ✅ Get a single post by ID
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate("author", "username");
        if (!post) return res.status(404).json({ message: "Post not found" });

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ✅ Update a post (Only the post owner can update)
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



// ✅ Delete a post (Only the post owner can delete)
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



// ✅ Allow users to rate a post
router.post("/:id/rate", verifyToken, async (req, res) => {
    try {
      const { rating } = req.body;
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5." });
      }
  
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: "Post not found." });
  
      // ✅ Check if the user has already rated
      const existingRating = post.ratings.find((r) => r.user.toString() === req.user.id);
      if (existingRating) {
        return res.status(400).json({ message: "You have already rated this post." });
      }
  
      // ✅ Add new rating
      post.ratings.push({ user: req.user.id, rating });
      await post.save();
  
      res.status(200).json({ message: "Rating submitted successfully!", ratings: post.ratings });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


// ✅ Route to Calculate Average Rating
  router.get("/:id/ratings", async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: "Post not found." });
  
      // ✅ Calculate Average Rating
      const totalRatings = post.ratings.length;
      const avgRating = totalRatings > 0 ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1) : 0;
  
      res.status(200).json({ averageRating: avgRating, totalRatings });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  


  // ✅ Check if user rated post
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

  
  
  



module.exports = router; // ✅ Ensure we export a Router, not an object
