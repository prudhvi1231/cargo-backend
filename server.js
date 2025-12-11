// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");

// const app = express();

// app.use(cors());
// app.use(express.json());

// mongoose
//   .connect(process.env.MONGO_URL)
//   .then(() => console.log(" MongoDB Connected"))
//   .catch(err => console.error(" MongoDB Connection Error:", err));

// const dashboardRoutes = require("./routes/Cargo");
// app.use("/api/dashboard", dashboardRoutes);


// app.get("/", (req, res) => {
//   res.send("Cargo Analytics Backend Running...");
// });
// app.use('/api/analytics', require('./routes/Cargo'));


// app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// app.use("/api/cargo-prediction", require("./routes/Cargo"));


// // const PORT = process.env.PORT || 4000;
// // app.listen(PORT, () => {
// //   console.log(` Server running on port ${PORT}`);
// // });

// // app.listen(PORT, "0.0.0.0", () => {
// //   console.log(` Server running on port ${PORT}`);
// // });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });







// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");

// const app = express();

// app.use(cors());
// app.use(express.json());

// // MongoDB connection
// mongoose
//   .connect(process.env.MONGO_URL)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.error("MongoDB Connection Error:", err));

// // Routes
// app.use("/api/dashboard", require("./routes/Cargo"));
// app.use("/api/analytics", require("./routes/Cargo"));
// app.use("/api/cargo-prediction", require("./routes/Cargo"));

// app.get("/", (req, res) => {
//   res.send("Cargo Analytics Backend Running...");
// });

// app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// // ❌ REMOVE app.listen()
// // Vercel does NOT allow manually listening on a port.

// // ✔ Instead export your Express app

// module.exports = app;

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// Routes
app.use("/api/dashboard", require("./routes/Cargo"));
app.use("/api/analytics", require("./routes/Cargo"));
app.use("/api/cargo-prediction", require("./routes/Cargo"));

// Test route
app.get("/", (req, res) => {
  res.send("Cargo Analytics Backend Running on Vercel!");
});

// Health route
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// IMPORTANT — do NOT use app.listen() on Vercel
module.exports = app;
