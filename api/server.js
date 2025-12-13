

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");

// const app = express();

// const allowedOrigins = [
//   "https://cargo-analytics-2e37b.web.app",
//   "https://cargo-analytics-2e37b.firebaseapp.com",
//   "http://localhost:4200"
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true); // allow Postman / server calls
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
//     return callback(new Error("Not allowed by CORS"));
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"]
// }));

// app.use(express.json());

// // health check
// app.get("/health", (req, res) => {
//   res.json({ ok: true });
// });

// // Mongo
// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.error(err));

// // routes
// app.use("/api/dashboard", require("../routes/Cargo"));
// app.use("/api/analytics", require("../routes/Cargo"));
// app.use("/api/cargo-prediction", require("../routes/Cargo"));

// module.exports = app;


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

// health
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// db
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo Error", err));

// 🔥 ROUTES (MAKE SURE FILE NAME MATCHES)
const cargoRoutes = require("../routes/Cargo");

app.use("/api/dashboard", cargoRoutes);
app.use("/api/analytics", cargoRoutes);
app.use("/api/cargo-prediction", cargoRoutes);

module.exports = app;
