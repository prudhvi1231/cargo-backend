const express = require("express");
const axios = require("axios");

const router = express.Router();

const PROD_API =
  "https://prod.smartoperation.in/api/cargo-prediction/predict";

router.post("/predict", async (req, res) => {
  try {
    const body = req.body;

    const response = await axios.post(PROD_API, body, {
      headers: { "Content-Type": "application/json" }
    });

    return res.json({
      status: "success",
      request: body,
      prediction: response.data
    });
  } catch (err) {
    console.error("Prediction Proxy Error:", err.response?.data || err.message);

    return res.status(500).json({
      status: "error",
      message: "Prediction service failed",
      details: err.response?.data || err.message
    });
  }
});

module.exports = router;
