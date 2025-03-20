const fs = require("fs"); // ✅ Import file system module
const multer = require("multer");
const path = require("path");

// ✅ Ensure uploads/music/ directory exists before saving files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/music/");
        
        // ✅ Check if directory exists, if not, create it
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

// ✅ File Filter to Allow Only MP3 Files
const fileFilter = (req, file, cb) => {
    console.log("🔍 File MIME Type Detected:", file.mimetype);

    if (file.mimetype === "audio/mpeg" || file.mimetype === "audio/mp3" || file.mimetype === "application/octet-stream") {
        cb(null, true);
    } else {
        cb(new Error(`Only MP3 files are allowed! Received: ${file.mimetype}`), false);
    }
};

const uploadMusic = multer({ storage, fileFilter });

module.exports = uploadMusic;
