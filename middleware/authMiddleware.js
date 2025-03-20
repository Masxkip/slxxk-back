const jwt = require("jsonwebtoken");


const verifyToken = (req, res, next) => {
    let token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length); // Remove "Bearer " prefix
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next(); // Proceed to next middleware
    } catch (error) {
        return res.status(401).json({ message: "Invalid Token" });
    }
};

module.exports = verifyToken;
