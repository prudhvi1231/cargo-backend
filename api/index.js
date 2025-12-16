const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "http://localhost:50693",
      "https://cargo-analytics-2e37b.web.app",
      "https://cargo-analytics-2e37b.firebaseapp.com"
    ],
    credentials: true
  })
);

// Routes
app.use("/api/dashboard", require("./dashboard"));
app.use("/api/cargo-prediction", require("./prediction"));

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

module.exports = app;
