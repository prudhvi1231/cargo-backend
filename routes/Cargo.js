
const express = require("express");
const router = express.Router();
const CargoRecord = require("../models/CargoRecord");


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_INDEX = MONTHS.reduce((m,i,idx)=> (m[i]=idx, m), {});
const QUARTER_OF_MONTH = (mIndex) => Math.floor(mIndex/3)+1;


router.get("/summary", async (req, res) => {
  try {
    const data = await CargoRecord.find().lean();

    let importTotal = 0;
    let exportTotal = 0;
    let transitTotal = 0;

    data.forEach(r => {
      const w = Number(r["Weight KG"] || 0);
      const t = (r["TYPE"] || "").toUpperCase();

      if (t === "IMPORT") importTotal += w;
      else if (t === "EXPORT") exportTotal += w;
      else if (t.includes("TRN")) transitTotal += w;
    });

    res.json({
      revenue: importTotal + exportTotal,
      import: importTotal,
      export: exportTotal,
      transit: transitTotal
    });

  } catch (err) {
    console.error("Summary Error:", err);
    res.status(500).json({ error: err.message });
  }
});



router.get("/all", async (req, res) => {
  try {
    const totals = await CargoRecord.aggregate([
      {
        $addFields: {
          cargoType: {
            $ifNull: ["$TYPE", "$Tonnages Product Final"]
          }
        }
      },
      {
        $group: {
          _id: "$cargoType",
          total: { $sum: "$Weight KG" }
        }
      }
    ]);

    res.json(totals);
  } catch (err) {
    console.error("ALL Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/quarterly", async (req, res) => {
  try {
    const latest = await CargoRecord.aggregate([
      { $group: { _id: "$Year Text" } },
      { $sort: { _id: -1 } },
      { $limit: 1 }
    ]);

    if (!latest.length) {
      return res.json({ year: null, quarterly: [0, 0, 0, 0] });
    }

    const year = latest[0]._id;
    const records = await CargoRecord.find({ "Year Text": year }).lean();

    let Q = [0, 0, 0, 0];

    records.forEach(r => {
      const m = r["Month Short Text"];
      const w = r["Weight KG"] || 0;

      if (["Jan", "Feb", "Mar"].includes(m)) Q[0] += w;
      if (["Apr", "May", "Jun"].includes(m)) Q[1] += w;
      if (["Jul", "Aug", "Sep"].includes(m)) Q[2] += w;
      if (["Oct", "Nov", "Dec"].includes(m)) Q[3] += w;
    });

    res.set("Cache-Control", "no-store");

    return res.json({ year, quarterly: Q });

  } catch (err) {
    console.error("Quarterly Error:", err);
    return res.status(500).json({ error: err.message });
  }
});


router.post("/quarterly/filtered", async (req, res) => {
  try {
    const { year, granularity } = req.body;

    if (!year) {
      return res.status(400).json({ error: "Year is required" });
    }

    const records = await CargoRecord.find({ "Year Text": year });

    if (!records.length) {
      return res.json({ year, quarterly: [0, 0, 0, 0], monthly: [] });
    }

    const Q = [0, 0, 0, 0];

    const months = {
      Jan: 0, Feb: 0, Mar: 0,
      Apr: 0, May: 0, Jun: 0,
      Jul: 0, Aug: 0, Sep: 0,
      Oct: 0, Nov: 0, Dec: 0
    };

    records.forEach(r => {
      const m = r["Month Short Text"];
      const w = r["Weight KG"] || 0;

      if (months[m] !== undefined) months[m] += w;

      if (["Jan", "Feb", "Mar"].includes(m)) Q[0] += w;
      else if (["Apr", "May", "Jun"].includes(m)) Q[1] += w;
      else if (["Jul", "Aug", "Sep"].includes(m)) Q[2] += w;
      else if (["Oct", "Nov", "Dec"].includes(m)) Q[3] += w;
    });

    res.json({
      year,
      quarterly: Q,
      monthly: Object.values(months)
    });

  } catch (err) {
    console.error("Quarter Filter Error:", err);
    res.status(500).json({ error: err.message });
  }
});



router.get("/top-stations", async (req, res) => {
  try {
    const data = await CargoRecord.aggregate([
      { $group: { _id: "$Station", total: { $sum: "$Weight KG" } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    res.json(data);
  } catch (err) {
    console.error("TopStations Error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/yearly", async (req, res) => {
  try {
    const data = await CargoRecord.aggregate([
      { $group: { _id: "$Year Text", totalWeight: { $sum: "$Weight KG" } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Yearly Error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, station, year, type } = req.query;

    const filter = {};
    if (station) filter.Station = station;
    if (year) filter["Year Text"] = Number(year);
    if (type) filter.TYPE = type;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      CargoRecord.find(filter).skip(skip).limit(Number(limit)).lean(),
      CargoRecord.countDocuments(filter)
    ]);

    res.json({ page: Number(page), limit: Number(limit), total, items });

  } catch (err) {
    console.error("List Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



router.get("/heatmap", async (req, res) => {
  try {
    const pipeline = [
      {
        $addFields: {
          parsedDate: {
            $dateFromString: {
              dateString: "$Accept Flight Date",
              onError: null,
              onNull: null
            }
          }
        }
      },

      {
        $addFields: {
          year: { $year: "$parsedDate" },
          month: { $month: "$parsedDate" }
        }
      },

      {
        $addFields: {
          weightNum: {
            $cond: {
              if: { $eq: ["$Weight KG", null] },
              then: 0,
              else: {
                $toDouble: {
                  $replaceAll: {
                    input: { $toString: "$Weight KG" },
                    find: ",",
                    replacement: ""
                  }
                }
              }
            }
          }
        }
      },

      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalWeight: { $sum: "$weightNum" }
        }
      },

      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];

    const raw = await CargoRecord.aggregate(pipeline);

    const YEARS = [...new Set(raw.map(r => r._id.year))];
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const matrix = YEARS.map(year => {
      const row = Array(12).fill(0);
      raw.forEach(r => {
        if (r._id.year === year) {
          row[r._id.month - 1] = r.totalWeight;
        }
      });
      return row;
    });

    const max = Math.max(...matrix.flat());

    res.json({ years: YEARS, months: MONTHS, matrix, max });

  } catch (err) {
    console.error(" Heatmap Error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/daily-pattern", async (req, res) => {
  try {
    const pipeline = [
      { $addFields: { parsedDate: { $dateFromString: { dateString: "$Accept Flight Date" } } } },
      { $addFields: { dayOfWeek: { $dayOfWeek: "$parsedDate" } } },
      { $group: { _id: "$dayOfWeek", totalWeight: { $sum: "$Weight KG" } } },
      { $sort: { _id: 1 } }
    ];

    const result = await CargoRecord.aggregate(pipeline);

    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const values = Array(7).fill(0);

    result.forEach(r => {
      values[(r._id || 1) - 1] = r.totalWeight;
    });

    res.json({ labels, values });

  } catch (err) {
    console.error("DailyPattern Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/yoy-full', async (req, res) => {
  try {
    const years =
      req.query.years && req.query.years.length > 0
        ? req.query.years.split(',').map(Number)
        : [];

    const cargoTypes =
      req.query.cargoTypes && req.query.cargoTypes.length > 0
        ? req.query.cargoTypes.split(',')
        : [];

    const seasonalAvg = Number(req.query.seasonalAvg || 3);

    const match = {};

    if (years.length > 0) {
      match["Year Text"] = { $in: years };
    }

    if (cargoTypes.length > 0) {
      match["TYPE"] = { $in: cargoTypes };
    }

    const monthlyRaw = await CargoRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: "$Year Text", month: "$Month Short Text" },
          total: { $sum: "$Weight KG" }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    const yearList =
      years.length > 0
        ? years
        : [...new Set(monthlyRaw.map((r) => r._id.year))];

    const monthly = {
      years: yearList.map((y) => ({
        year: y,
        values: MONTHS.map((m) => {
          const rec = monthlyRaw.find(
            (r) => r._id.year === y && r._id.month === m
          );
          return rec ? rec.total : 0;
        }),
      })),
    };

    const seasonal = {
      months: MONTHS,
      values: MONTHS.map((m, idx) => {
        const vals = monthly.years
          .slice(-seasonalAvg)
          .map((y) => y.values[idx] || 0);

        return vals.length
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          : 0;
      }),
    };

    const cargoRaw = await CargoRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$TYPE",
          total: { $sum: "$Weight KG" },
        },
      },
    ]);

    const cargoMix = {
      labels: cargoRaw.map((r) => r._id),
      values: cargoRaw.map((r) => r.total),
    };

    const routeRaw = await CargoRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: { station: "$Station", year: "$Year Text" },
          total: { $sum: "$Weight KG" },
        },
      },
    ]);

    const routeMap = {};

    routeRaw.forEach((r) => {
      const st = r._id.station;
      const y = r._id.year;

      if (!routeMap[st]) routeMap[st] = {};
      routeMap[st][y] = r.total;
    });

    const changes = [];

    Object.keys(routeMap).forEach((st) => {
      const totals = yearList.map((y) => Number(routeMap[st][y] || 0));
      const diff = totals[totals.length - 1] - totals[0];

      changes.push({
        route: st,
        value: Math.abs(diff),
        type: diff >= 0 ? "UP" : "DOWN",
      });
    });

    const routes = {
      up: changes
        .filter((c) => c.type === "UP")
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),

      down: changes
        .filter((c) => c.type === "DOWN")
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    };

    return res.json({ monthly, seasonal, cargoMix, routes });

  } catch (err) {
    console.error("YOY-FULL ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/cargo-mix", async (req, res) => {
  try {
    const { year, quarter } = req.body;
    if (!year) return res.status(400).json({ error: "year required" });

    const QMAP = {
      Q1: ["Jan","Feb","Mar"],
      Q2: ["Apr","May","Jun"],
      Q3: ["Jul","Aug","Sep"],
      Q4: ["Oct","Nov","Dec"]
    };

    const match = { "Year Text": Number(year) };

    if (quarter && quarter !== "ALL" && QMAP[quarter]) {
      match["Month Short Text"] = { $in: QMAP[quarter] };
    }

    const cargoRaw = await CargoRecord.aggregate([
      { $match: match },
      {
        $addFields: {
          weightNum: {
            $toDouble: {
              $replaceAll: {
                input: { $toString: "$Weight KG" },
                find: ",",
                replacement: ""
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$TYPE",
          total: { $sum: "$weightNum" }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const labels = cargoRaw.map(r => r._id || "UNKNOWN");
    const values = cargoRaw.map(r => Math.round(r.total || 0));

    return res.json({
      year,
      quarter: quarter || "ALL",
      labels,
      values
    });

  } catch (err) {
    console.error("CARGO MIX ERROR", err);
    return res.status(500).json({ error: err.message });
  }
});



router.post('/marketShare/filtered', async (req, res) => {
  try {
    const { year, station, cargoType } = req.body;

    const matchStage = { "Year Text": year };

    if (station && station !== 'ALL') matchStage.Station = station;
    if (cargoType && cargoType !== 'ALL') matchStage["Tonnages Product Final"] = cargoType;

    const data = await Cargo.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$Month Short Text",
          total: { $sum: "$Weight KG" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const labels = data.map(d => d._id);
    const values = data.map(d => d.total);

    res.json({ labels, values });

  } catch (err) {
    console.error("MARKET SHARE ERROR", err);
    res.status(500).json({ error: "Failed to load Market Share" });
  }
});




router.post("/marketShare/cargoType", async (req, res) => {
  try {
    let { year, station } = req.body;

    year = year ? Number(year) : 2025; 

    const matchStage = { "Year Text": year };

    if (station && station !== "ALL") {
      matchStage.Station = station;
    }

    const data = await CargoRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$Tonnages Product Final",
          total: { $sum: "$Weight KG" }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      labels: data.map(d => d._id),
      values: data.map(d => +(d.total / 1000).toFixed(2)) 
    });

  } catch (err) {
    console.error("CARGO API ERROR:", err);
    res.status(500).json({ error: "Cargo API Failed" });
  }
});


router.post("/marketShare/station", async (req, res) => {
  try {
    let { year } = req.body;
    year = year ? Number(year) : 2025;

    const data = await CargoRecord.aggregate([
      { $match: { "Year Text": year } },
      {
        $group: {
          _id: "$Station",
          total: { $sum: "$Weight KG" }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      labels: data.map(d => d._id),
      values: data.map(d => +(d.total / 1000).toFixed(2))
    });

  } catch (err) {
    console.error("STATION API ERROR:", err);
    res.status(500).json({ error: "Station API Failed" });
  }
});



router.post("/predict", async (req, res) => {
  try {
    const payload = req.body;

    const predicted_weight_kg = Math.random() * 200;

    const savedData = await CargoPrediction.create({
      ...payload,
      "Predicted Weight KG": predicted_weight_kg,
    });

    res.json({
      predicted_weight_kg,
      status: "success",
      saved: savedData,
    });

  } catch (err) {
    console.error("PREDICTION SAVE ERROR:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.get("/getAll", async (req, res) => {
  try {
    const data = await CargoPrediction.find().sort({ createdAt: -1 });
    res.json({ status: "success", data });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
