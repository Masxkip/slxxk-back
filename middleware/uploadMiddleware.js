// middleware/uploadMiddleware.js

import fs from 'fs';
import multer from 'multer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// ✅ Emulate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Ensure uploads/music/ directory exists
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/music/");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

// ✅ File filter: Only allow MP3 files
const fileFilter = (req, file, cb) => {
  console.log("🔍 File MIME Type Detected:", file.mimetype);

  if (
    file.mimetype === "audio/mpeg" ||
    file.mimetype === "audio/mp3" ||
    file.mimetype === "application/octet-stream"
  ) {
    cb(null, true);
  } else {
    cb(new Error(`Only MP3 files are allowed! Received: ${file.mimetype}`), false);
  }
};

const uploadMusic = multer({ storage, fileFilter });

export default uploadMusic;
