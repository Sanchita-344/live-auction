const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 10000, // Har naye user ko bidding ke liye ₹10,000 milenge
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);