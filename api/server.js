

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");

// const app = express();

// app.use(express.json());

// app.use(cors({
//   origin: [
//     "https://cargo-analytics-2e37b.web.app",
//     "https://cargo-analytics-2e37b.firebaseapp.com",
//     "http://localhost:4200"
//   ],
//   credentials: true
// }));

// // health
// app.get("/health", (req, res) => {
//   res.json({ ok: true });
// });

// // db
// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.error("Mongo Error", err));

// // 🔥 ROUTES (MAKE SURE FILE NAME MATCHES)
// const cargoRoutes = require("../routes/Cargo");

// app.use("/api/dashboard", cargoRoutes);
// app.use("/api/analytics", cargoRoutes);
// app.use("/api/cargo-prediction", cargoRoutes);

// module.exports = app;


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());

app.use(cors({
  origin: [
    "https://cargo-analytics-2e37b.web.app",
    "https://cargo-analytics-2e37b.firebaseapp.com",
    "http://localhost:4200"
  ],
  credentials: true
}));

/* ---------- DB (IMPORTANT: cache connection) ---------- */
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URL);
  isConnected = true;
  console.log("MongoDB Connected");
}

/* ---------- ROUTES ---------- */
const cargoRoutes = require("../routes/Cargo");

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use("/api/dashboard", cargoRoutes);
app.use("/api/analytics", cargoRoutes);
app.use("/api/cargo-prediction", cargoRoutes);

/* ---------- EXPORT HANDLER ---------- */
module.exports = app;
