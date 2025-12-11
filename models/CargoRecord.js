const mongoose = require("mongoose");

const CargoRecordSchema = new mongoose.Schema(
  {
    "Year Text": Number,
    "Month Short Text": String,
    "Accept Flight Date": String,
    "Station": String,
    "TYPE": String,
    "Tonnages Product Final": String,
    "Main or DOM": String,
    "Weight KG": Number
  },
  { collection: "CargoRecords" }
);

module.exports = mongoose.model("CargoRecord", CargoRecordSchema);
