import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config(); // Loads CLOUDINARY_URL from .env

cloudinary.config(); // No need to pass anything if CLOUDINARY_URL exists

export default cloudinary;
