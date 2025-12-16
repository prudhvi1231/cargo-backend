require("dotenv").config({ path: "../.env" });

const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());

// app.use(
//   cors({
//     origin: [
//       "http://localhost:50693",
//       "http://localhost:4200",
//       "https://cargo-analytics-2e37b.web.app",
//       "https://cargo-analytics-2e37b.firebaseapp.com"
//     ],
//     credentials: true
//   })
// );
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:50693",
  "https://cargo-analytics-2e37b.web.app",
  "https://cargo-analytics-2e37b.firebaseapp.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow Postman / server-side calls
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ✅ FIXED PATH + NAME
const predictionProxy = require("../routes/predictionProxy");
app.use("/api/cargo-prediction", predictionProxy);

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
