import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  isSubscriber: { type: Boolean, default: false },
    subscriptionStart: { type: Date },
    subscriptionRenewalReminderSent: { type: Boolean, default: false },
    paystackCustomerCode: { type: String },
    paystackSubscriptionCode: { type: String },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  confirmationCode: { type: String, default: null },
  confirmationCodeExpires: { type: Date, default: null },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });


// Now define the model for admin.js
const User = mongoose.model("User", UserSchema);

export default User;
