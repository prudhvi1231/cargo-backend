


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

app.use(cors({
  origin: [
    "https://cargo-analytics-2e37b.web.app",
    "https://cargo-analytics-2e37b.firebaseapp.com",
    "http://localhost:4200"
  ],
  credentials: true
}));

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (!process.env.MONGO_URL) {
      throw new Error("❌ MONGO_URL not found in environment variables");
    }

    cached.promise = mongoose
      .connect(process.env.MONGO_URL, {
        bufferCommands: false
      })
      .then((mongoose) => {
        console.log("✅ MongoDB Connected");
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

const cargoRoutes = require("../routes/Cargo");

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(" MongoDB connection failed:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/api/dashboard", cargoRoutes);
app.use("/api/analytics", cargoRoutes);
app.use("/api/cargo-prediction", cargoRoutes);

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

module.exports = app;
