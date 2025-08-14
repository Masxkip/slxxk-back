import mongoose from 'mongoose';

// Define Reply Schema
const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Define Comment Schema (includes replies)
const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  replies: [ReplySchema],
  createdAt: { type: Date, default: Date.now },
});

// Define Post Schema
const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    image: { type: String },
    music: { type: String },
    isPremium: { type: Boolean, default: false },
    category: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
    views: { type: Number, default: 0 },
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

// 🔹 Indexes (put these BEFORE model compilation)
PostSchema.index({ createdAt: -1 });                 // list/trending sorts
PostSchema.index({ category: 1, createdAt: -1 });    // category blocks
PostSchema.index({ isPremium: 1, createdAt: -1 });   // premium filters
// Optional text search later:
// PostSchema.index({ title: "text", content: "text" });

// Export Post model
const Post = mongoose.model("Post", PostSchema);
export default Post;
