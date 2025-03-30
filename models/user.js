// models/user.js

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  confirmationCode: { type: String, default: null },
  confirmationCodeExpires: { type: Date, default: null },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ Export the User model (ESM style)
const User = mongoose.model("User", UserSchema);
export default User;
