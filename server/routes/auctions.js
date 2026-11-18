const express = require("express");
const Auction = require("../models/Auction");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// 1. Get all auctions: GET /api/auctions
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find().sort({ createdAt: -1 });
    res.json(auctions);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 2. Get single auction details: GET /api/auctions/:id
router.get("/:id", async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: "Auction nahi mila" });
    }
    res.json(auction);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 3. Create new auction item: POST /api/auctions
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, startingPrice, durationMinutes } = req.body;

    if (!title || !startingPrice || !durationMinutes) {
      return res
        .status(400)
        .json({ message: "Title, startingPrice aur durationMinutes zaroori hain" });
    }

    const endTime = new Date(Date.now() + Number(durationMinutes) * 60 * 1000);

    const auction = await Auction.create({
      title,
      description,
      startingPrice: Number(startingPrice),
      currentBid: Number(startingPrice),
      endTime,
      createdBy: req.user.id,
    });

    // Sab connected clients ko naye auction ki khabar bhejo
    const io = req.app.get("io");
    if (io) {
      io.emit("auctionCreated", auction);
    }

    res.status(201).json(auction);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 4. Place an ATOMIC bid with Anti-Sniping: POST /api/auctions/:id/bid
router.post("/:id/bid", auth, async (req, res) => {
  try {
    const bidAmount = Number(req.body.amount);
    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({ message: "Valid bid amount daalo" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User nahi mila" });
    }

    if (user.balance < bidAmount) {
      return res.status(400).json({ message: "Tumhare wallet mein itna balance nahi hai" });
    }

    const existingAuction = await Auction.findById(req.params.id);
    if (!existingAuction) {
      return res.status(404).json({ message: "Auction nahi mila" });
    }

    const now = new Date();
    if (existingAuction.endTime <= now) {
      return res.status(400).json({ message: "Ye auction khatam ho chuka hai" });
    }

    if (existingAuction.createdBy.toString() === user._id.toString()) {
      return res.status(400).json({ message: "Apne hi item par bid nahi laga sakte" });
    }

    // Anti-sniping check: agar 15 second se kam bache hain to 15 second aur badha do
    const timeRemainingMs = existingAuction.endTime.getTime() - now.getTime();
    let updatedEndTime = existingAuction.endTime;
    let antiSnipeTriggered = false;

    if (timeRemainingMs < 15000) {
      updatedEndTime = new Date(now.getTime() + 15000);
      antiSnipeTriggered = true;
    }

    // ATOMIC UPDATE: MongoDB ek hi operation mein check aur update karega
    const updatedAuction = await Auction.findOneAndUpdate(
      {
        _id: req.params.id,
        currentBid: { $lt: bidAmount }, // Condition 1: nayi bid purani se badi honi chahiye
        endTime: { $gt: now },          // Condition 2: auction abhi bhi live hona chahiye
      },
      {
        $set: {
          currentBid: bidAmount,
          highestBidder: user._id,
          highestBidderName: user.name,
          endTime: updatedEndTime,
        },
        $push: {
          bids: {
            bidder: user._id,
            bidderName: user.name,
            amount: bidAmount,
            time: now,
          },
        },
      },
      { new: true }
    );

    if (!updatedAuction) {
      return res.status(409).json({
        message: "Bid fail! Kisi ne tumse pehle zyada bid laga di ya auction khatam ho gaya.",
      });
    }

    // Real-time update sabko bhejo (us auction room mein aur global list ke liye)
    const io = req.app.get("io");
    if (io) {
      io.emit("bidUpdated", {
        auction: updatedAuction,
        antiSnipeTriggered,
      });
    }

    res.json({
      message: antiSnipeTriggered
        ? "Bid lag gayi! Anti-sniping se timer +15s badh gaya."
        : "Bid successfully lag gayi!",
      antiSnipeTriggered,
      auction: updatedAuction,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;