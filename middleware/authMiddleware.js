import jwt from 'jsonwebtoken';
import User from '../models/user.js'; // 

const verifyToken = async (req, res, next) => {
  let token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access Denied: No Token Provided" });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7); // Remove "Bearer " prefix
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user document to get latest subscription state
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // Set the latest user in request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};

export default verifyToken;
