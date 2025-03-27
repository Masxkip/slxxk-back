const mongoose = require("mongoose");

// ✅ Define Reply Schema
const ReplySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  }
);

// ✅ Define Comment Schema (Now includes replies)
const CommentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    replies: [ReplySchema], // Replies array inside each comment
    createdAt: { type: Date, default: Date.now },
  }
);

// ✅ Define Post Schema
const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    image: { type: String },
    music: { type: String }, // ✅ New field to store music file URL
    category: { type: String, required: true }, // 🔹 Ensure category is saved
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema], // Add comments array
    views: {
      type: Number,
      default: 0
    },    
    ratings: [
      {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Stores who rated
          rating: { type: Number, required: true } // ✅ Stores the rating (1-5)
      }
  ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
