const express = require("express");
const Post = require("../models/Post");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// Add a new comment
router.post("/:postId", verifyToken, async (req, res) => {
    const { text } = req.body;
  
    try {
      const post = await Post.findById(req.params.postId);
      if (!post) return res.status(404).json({ message: "Post not found" });
  
      const newComment = {
        text,
        author: req.user.id,  // Store the author ID
        createdAt: new Date()  // Ensure createdAt is included
      };
  
      post.comments.push(newComment);
      await post.save();
  
      // Fetch the newly added comment with populated author details
      const updatedPost = await Post.findById(req.params.postId).populate("comments.author", "username");
  
      // Send back only the last added comment (the one just pushed)
      const addedComment = updatedPost.comments[updatedPost.comments.length - 1];
  
      res.status(201).json({ message: "Comment added successfully!", comment: addedComment });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// Add a reply to a comment
router.post("/:postId/comments/:commentId/reply", verifyToken, async (req, res) => {
    const { text } = req.body;
  
    try {
        const post = await Post.findById(req.params.postId)
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
  
      // Fetch updated post to include populated author
      const updatedPost = await Post.findById(req.params.postId).populate("comments.replies.author", "username");
  
      // Find the updated comment and reply
      const updatedComment = updatedPost.comments.id(req.params.commentId);
      const addedReply = updatedComment.replies[updatedComment.replies.length - 1];
  
      res.status(201).json({ message: "Reply added successfully!", reply: addedReply });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  
  // Edit a comment
  router.put("/:postId/comments/:commentId", verifyToken, async (req, res) => {
    try {
      const { text } = req.body;
  
      // Find the post
      const post = await Post.findById(req.params.postId);
      if (!post) return res.status(404).json({ message: "Post not found" });
  
      // Find the comment inside the post
      const comment = post.comments.id(req.params.commentId);
      if (!comment) return res.status(404).json({ message: "Comment not found" });
  
      // Ensure the user is the owner of the comment
      if (comment.author.toString() !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized: You can only edit your own comments" });
      }
  
      // Update the comment text
      comment.text = text;
      await post.save();
  
      res.status(200).json({ message: "Comment updated successfully!", comment });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  


// Get all comments for a post
router.get("/:postId/comments", async (req, res) => {
    try {
      const post = await Post.findById(req.params.postId)
        .populate("comments.author", "username")  // Populate comment authors
        .populate("comments.replies.author", "username"); // Populate reply authors
  
      if (!post) return res.status(404).json({ message: "Post not found" });
  
      res.status(200).json(post.comments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  
 // Delete a comment
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
  
      post.comments.splice(commentIndex, 1); // Remove comment
      await post.save();
  
      res.status(200).json({ message: "Comment deleted successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });



// Delete a reply
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
  
      comment.replies.splice(replyIndex, 1); // Remove the reply
      await post.save();
  
      res.status(200).json({ message: "Reply deleted successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  

module.exports = router;
