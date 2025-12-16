const mongoose = require("mongoose");

const CargoPredictionSchema = new mongoose.Schema(
  {
    "Year Text": Number,
    "Month Short Text": String,
    "Accept Flight Date": String,
    "Station": String,
    "TYPE": String,
    "Tonnages Product Final": String,
    "Main or DOM": String,
    "Weight KG": Number,
    "Predicted Weight KG": Number
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CargoPrediction ||
  mongoose.model("CargoPrediction", CargoPredictionSchema);
