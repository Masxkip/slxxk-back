// uploadMiddleware.js
import multer from 'multer';

// Use memoryStorage to avoid saving files locally
const storage = multer.memoryStorage();

// Optional filter: limit to only audio files
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "audio/mpeg" ||
    file.mimetype === "audio/mp3" ||
    file.mimetype === "application/octet-stream"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only MP3 files are allowed!"), false);
  }
};

const uploadMusic = multer({ storage, fileFilter });

export default uploadMusic;
