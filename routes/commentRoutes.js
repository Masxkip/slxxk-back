// routes/commentRoutes.js

import express from 'express';
import Post from '../models/Post.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ Add a new comment
router.post("/:postId", verifyToken, async (req, res) => {
  const { text } = req.body;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const newComment = {
      text,
      author: req.user.id,
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
      .populate("comments.author", "username");

    const addedComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({ message: "Comment added successfully!", comment: addedComment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Add a reply to a comment
router.post("/:postId/comments/:commentId/reply", verifyToken, async (req, res) => {
  const { text } = req.body;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const newReply = {
      text,
      author: req.user.id,
      createdAt: new Date()
    };

    comment.replies.push(newReply);
    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
      .populate("comments.replies.author", "username");

    const updatedComment = updatedPost.comments.id(req.params.commentId);
    const addedReply = updatedComment.replies[updatedComment.replies.length - 1];

    res.status(201).json({ message: "Reply added successfully!", reply: addedReply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Edit a comment
router.put("/:postId/comments/:commentId", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own comments" });
    }

    comment.text = text;
    await post.save();

    res.status(200).json({ message: "Comment updated successfully!", comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all comments for a post
router.get("/:postId/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate("comments.author", "username")
      .populate("comments.replies.author", "username");

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.status(200).json(post.comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete a comment
router.delete("/:postId/comments/:commentId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const commentIndex = post.comments.findIndex(
      (c) => c._id.toString() === req.params.commentId && c.author.toString() === req.user.id
    );

    if (commentIndex === -1) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own comments" });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    res.status(200).json({ message: "Comment deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete a reply
router.delete("/:postId/comments/:commentId/replies/:replyId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const replyIndex = comment.replies.findIndex(
      (r) => r._id.toString() === req.params.replyId && r.author.toString() === req.user.id
    );

    if (replyIndex === -1) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own replies" });
    }

    comment.replies.splice(replyIndex, 1);
    await post.save();

    res.status(200).json({ message: "Reply deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Export router
export default router;
