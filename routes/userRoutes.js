// routes/userRoutes.js

import express from 'express';
import multer from 'multer';
import User from '../models/user.js';
import Post from '../models/Post.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ Configure storage for profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + "_" + Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ Get user profile and activity
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

// ✅ Update user profile
router.put("/:id", verifyToken, upload.single("profilePic"), async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ message: "Unauthorized: You can only update your own profile" });
  }

  try {
    const { username, bio, location, website } = req.body;

    let updateData = { username, bio, location, website };

    if (req.file) {
      updateData.profilePicture = `/uploads/${req.file.filename}`;
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

// ✅ Export router
export default router;
