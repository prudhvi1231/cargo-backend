const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected (Vercel)"))
  .catch((err) => console.log("MongoDB Error:", err));

const app = express();
app.use(cors());
app.use(express.json());

const routes = require("../routes"); // adjust if needed
app.use("/api", routes);

// Test Route
app.get("/", (req, res) => {
  res.send("Backend is running on Vercel!");
});

// Export as serverless function
module.exports = serverless(app);
