// models/user.js

import mongoose from 'mongoose';
import Post from './Post.js';

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

// ✅ Attach cascade deletion hook BEFORE exporting the model
UserSchema.pre('remove', async function (next) {
  try {
    await Post.deleteMany({ author: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Now define the model
const User = mongoose.model("User", UserSchema);

export default User;
