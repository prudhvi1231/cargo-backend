require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log(" MongoDB Connected"))
  .catch(err => console.error(" MongoDB Connection Error:", err));

const dashboardRoutes = require("./routes/Cargo");
app.use("/api/dashboard", dashboardRoutes);


app.get("/", (req, res) => {
  res.send("Cargo Analytics Backend Running...");
});
app.use('/api/analytics', require('./routes/Cargo'));


app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/cargo-prediction", require("./routes/Cargo"));


const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(` Server running on port ${PORT}`);
// });

app.listen(PORT, "0.0.0.0", () => {
  console.log(` Server running on port ${PORT}`);
});

