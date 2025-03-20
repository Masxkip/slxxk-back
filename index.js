require("dotenv").config();
const User = require("./models/user");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const verifyToken = require("./middleware/authMiddleware");
const Post = require("./models/Post");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const commentRoutes = require("./routes/commentRoutes");



const app = express();
    

app.use(express.json());

app.use(
    cors({
      origin: "http://localhost:5173", // Allow frontend requests
      methods: "GET,POST,PUT,DELETE",
      credentials: true,
    })
  );

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

   
})
.catch((err) => console.error("❌ MongoDB Connection Error:", err));



app.get("/api/protected", verifyToken, (req, res) => {
    res.json({ message: "You are authorized!", user: req.user });
});


const corsOptions = {
    origin: ["http://localhost:3000"], // Allow only frontend requests
    methods: "GET,POST,PUT,DELETE",
    credentials: true
};


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
