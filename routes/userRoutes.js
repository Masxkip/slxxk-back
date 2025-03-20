const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const verifyToken = require("../middleware/authMiddleware");
const multer = require("multer");

const router = express.Router();

// Configure storage for profile pictures
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // Save files in uploads/
    },
    filename: function (req, file, cb) {
        cb(null, req.user.id + "_" + Date.now() + "_" + file.originalname);
    }
});

const upload = multer({ storage });

// ✅ Fetch user profile along with posts, comments, replies, and ratings
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Fetch posts authored by the user
        const posts = await Post.find({ author: req.params.id });

        // Fetch all posts to check where the user has commented or replied
        const allPosts = await Post.find({});

        // Extract comments made by the user
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

                // Extract replies made by the user
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

            // Extract ratings given by the user
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
            updateData.profilePicture = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).select("-password");

        res.status(200).json({ message: "Profile updated successfully!", user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;
