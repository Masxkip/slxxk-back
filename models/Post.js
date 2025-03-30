// models/Post.js

import mongoose from 'mongoose';

// ✅ Define Reply Schema
const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// ✅ Define Comment Schema (includes replies)
const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  replies: [ReplySchema],
  createdAt: { type: Date, default: Date.now },
});

// ✅ Define Post Schema
const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    image: { type: String },
    music: { type: String },
    category: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
    views: {
      type: Number,
      default: 0
    },
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

// ✅ Export Post model
const Post = mongoose.model("Post", PostSchema);
export default Post;
