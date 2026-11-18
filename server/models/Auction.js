const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bidderName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    startingPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    currentBid: {
      type: Number,
      required: true,
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    highestBidderName: {
      type: String,
      default: "No bids yet",
    },
    endTime: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bids: [bidSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", auctionSchema);