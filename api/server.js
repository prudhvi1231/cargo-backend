const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:50693",
  "https://cargo-analytics-2e37b.web.app",
  "https://cargo-analytics-2e37b.firebaseapp.com"
];

// ✅ CORS MIDDLEWARE
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS NOT ALLOWED"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ SAFE OPTIONS HANDLER (FIXES YOUR ERROR)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204);
  }
  next();
});

// ✅ BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTES
const dashboardRoutes = require("../routes/Cargo");
app.use("/api/dashboard", dashboardRoutes);

// ✅ HEALTH CHECK
app.get("/", (_, res) => {
  res.send("Cargo Backend Running");
});

module.exports = app;
