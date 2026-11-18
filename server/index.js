require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const auctionRoutes = require("./routes/auctions");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Routes ke andar Socket.io use karne ke liye
app.set("io", io);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/auctions", auctionRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Live Auction Server is running!" });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinAuction", (auctionId) => {
    socket.join(auctionId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });