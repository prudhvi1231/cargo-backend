const express = require("express");
const cors = require("cors");
const app = express();

// ✅ ALLOWED ORIGINS
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:50693",
  "https://cargo-analytics-2e37b.web.app",
  "https://cargo-analytics-2e37b.firebaseapp.com"
];

// ✅ CORS CONFIG
app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server & Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS NOT ALLOWED"), false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// ✅ REQUIRED FOR PREFLIGHT
app.options("*", cors());

// ✅ BODY PARSERS (MUST BE AFTER CORS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTES
const dashboardRoutes = require("../routes/Cargo");
app.use("/api/dashboard", dashboardRoutes);

// ✅ HEALTH CHECK
app.get("/", (_, res) => {
  res.show = "Cargo Backend Running";
});

module.exports = app;
