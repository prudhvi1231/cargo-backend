const express = require("express");
const cors = require("cors");

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());

const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:50693",
  "https://cargo-analytics-2e37b.web.app",
  "https://cargo-analytics-2e37b.firebaseapp.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked"));
    },
    credentials: true
  })
);

/* ---------- ROUTES ---------- */

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// DASHBOARD ROUTES (THIS WAS MISSING ❗)
app.post("/api/dashboard/marketShare/station", (req, res) => {
  res.json({ data: [] });
});

app.post("/api/dashboard/marketShare/cargoType", (req, res) => {
  res.json({ data: [] });
});

app.get("/api/dashboard/summary", (req, res) => {
  res.json({ summary: {} });
});

app.get("/api/dashboard/yoy-full", (req, res) => {
  const { startYear, endYear } = req.query;
  res.json({ startYear, endYear, data: [] });
});

/* ---------- EXPORT ONLY ---------- */
// 🚫 NO app.listen()
module.exports = app;
