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

// app.use((req, res, next) => {
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//   }

//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.setHeader("Access-Control-Allow-Credentials", "true");

//   if (req.method === "OPTIONS") return res.status(200).end();
//   next();
// });

// app.use(express.json());


// // app.use(cors({
// //   origin: "*",
// //   methods: "GET,POST,PUT,PATCH,DELETE",
// //   allowedHeaders: "Content-Type, Authorization"
// // }));

// app.use(cors({
//   origin: allowedOrigins,
//   methods: "GET,POST,PUT,DELETE,OPTIONS",
//   allowedHeaders: "Content-Type, Authorization",
//   credentials: true
// }));


// // TEST ROUTE
// app.get("/health", (req, res) => {
//   res.json({ ok: true, message: "Backend working ✔" });
// });

// // DB
// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.log("MongoDB Error:", err));


// app.use("/api/dashboard", require("../routes/Cargo"));
// app.use("/api/analytics", require("../routes/Cargo"));
// app.use("/api/cargo-prediction", require("../routes/Cargo"));

// module.exports = app;


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

const allowedOrigins = [
  "https://cargo-analytics-2e37b.web.app",
  "https://cargo-analytics-2e37b.firebaseapp.com",
  "http://localhost:4200"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / server calls
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Mongo
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// routes
app.use("/api/dashboard", require("../routes/Cargo"));
app.use("/api/analytics", require("../routes/Cargo"));
app.use("/api/cargo-prediction", require("../routes/Cargo"));

module.exports = app;
