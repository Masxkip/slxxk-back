// index.js
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import { adminJs, adminRouter } from './admin.js';
import verifyToken from './middleware/authMiddleware.js';

// ⬇️ add this import
import Post from './models/Post.js';

const app = express();

app.use(express.json());
app.use(cors({
  origin: ['https://slxxk.com', 'https://www.slxxk.com', 'https://slxxk.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/uploads", express.static("uploads"));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log("✅ MongoDB Connected Successfully");

  // 🔹 Sync indexes (optional: gate with an env flag in prod)
  try {
    await Post.syncIndexes();
    console.log("✅ Post indexes synced");
  } catch (e) {
    console.error("❌ Post index sync failed", e);
  }

  app.use(adminJs.options.rootPath, adminRouter);
  console.log("✅ AdminJS mounted at", adminJs.options.rootPath);
})
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.get("/api/protected", verifyToken, (req, res) => {
  res.json({ message: "You are authorized!", user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
