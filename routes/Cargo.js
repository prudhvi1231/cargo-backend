

// const express = require("express");
// const router = express.Router();
// const CargoRecord = require("../models/CargoRecord");

// /* =========================
//    CONSTANTS
// ========================= */
// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// /* =========================
//    SAFE WEIGHT (Mongo-safe)
// ========================= */
// const safeWeight = {
//   $convert: {
//     input: "$Weight KG",
//     to: "double",
//     onError: 0,
//     onNull: 0
//   }
// };

// /* =========================================================
//    SUMMARY
// ========================================================= */
// router.get("/summary", async (req, res) => {
//   try {
//     const data = await CargoRecord.find().lean();

//     let importTotal = 0, exportTotal = 0, transitTotal = 0;

//     data.forEach(r => {
//       const w = Number(r["Weight KG"] || 0);
//       const t = (r.TYPE || "").toUpperCase();
//       if (t === "IMPORT") importTotal += w;
//       else if (t === "EXPORT") exportTotal += w;
//       else if (t.includes("TRN")) transitTotal += w;
//     });

//     res.json({
//       revenue: importTotal + exportTotal,
//       import: importTotal,
//       export: exportTotal,
//       transit: transitTotal
//     });
//   } catch (e) {
//     res.status(500).json({ error: "Summary failed" });
//   }
// });

// /* =========================================================
//    ALL DATA
// ========================================================= */
// router.get("/all", async (req, res) => {
//   try {
//     const data = await CargoRecord.aggregate([
//       {
//         $group: {
//           _id: "$TYPE",
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "All data failed" });
//   }
// });

// /* =========================================================
//    TOP STATIONS
// ========================================================= */
// router.get("/top-stations", async (req, res) => {
//   try {
//     const data = await CargoRecord.aggregate([
//       { $group: { _id: "$Station", total: { $sum: safeWeight } } },
//       { $sort: { total: -1 } },
//       { $limit: 10 }
//     ]);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "Top stations failed" });
//   }
// });

// /* =========================================================
//    YEARLY
// ========================================================= */
// router.get("/yearly", async (req, res) => {
//   try {
//     const data = await CargoRecord.aggregate([
//       { $group: { _id: "$Year Text", totalWeight: { $sum: safeWeight } } },
//       { $sort: { _id: 1 } }
//     ]);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "Yearly failed" });
//   }
// });

// /* =========================================================
//    QUARTERLY
// ========================================================= */
// router.get("/quarterly", async (req, res) => {
//   try {
//     const latest = await CargoRecord.aggregate([
//       { $group: { _id: "$Year Text" } },
//       { $sort: { _id: -1 } },
//       { $limit: 1 }
//     ]);

//     if (!latest.length) return res.json({ year: null, quarterly: [0,0,0,0] });

//     const year = latest[0]._id;

//     const data = await CargoRecord.aggregate([
//       { $match: { "Year Text": year } },
//       {
//         $group: {
//           _id: "$Month Short Text",
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);

//     const Q = [0,0,0,0];
//     data.forEach(d => {
//       if (["Jan","Feb","Mar"].includes(d._id)) Q[0] += d.total;
//       else if (["Apr","May","Jun"].includes(d._id)) Q[1] += d.total;
//       else if (["Jul","Aug","Sep"].includes(d._id)) Q[2] += d.total;
//       else if (["Oct","Nov","Dec"].includes(d._id)) Q[3] += d.total;
//     });

//     res.json({ year, quarterly: Q });
//   } catch {
//     res.status(500).json({ error: "Quarterly failed" });
//   }
// });

// /* =========================================================
//    HEATMAP
// ========================================================= */
// router.get("/heatmap", async (req, res) => {
//   try {
//     const raw = await CargoRecord.aggregate([
//       {
//         $group: {
//           _id: { year: "$Year Text", month: "$Month Short Text" },
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);

//     const years = [...new Set(raw.map(r => r._id.year))].sort();
//     const matrix = years.map(y =>
//       MONTHS.map(m => {
//         const r = raw.find(x => x._id.year === y && x._id.month === m);
//         return r ? r.total : 0;
//       })
//     );

//     res.json({
//       years,
//       months: MONTHS,
//       matrix,
//       max: Math.max(...matrix.flat(), 0)
//     });
//   } catch {
//     res.status(500).json({ error: "Heatmap failed" });
//   }
// });

// /* =========================================================
//    DAILY PATTERN
// ========================================================= */
// router.get("/daily-pattern", async (req, res) => {
//   try {
//     const raw = await CargoRecord.aggregate([
//       {
//         $addFields: {
//           day: {
//             $dayOfWeek: {
//               $dateFromString: {
//                 dateString: "$Accept Flight Date",
//                 onError: null,
//                 onNull: null
//               }
//             }
//           }
//         }
//       },
//       {
//         $group: {
//           _id: "$day",
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);

//     const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
//     const values = Array(7).fill(0);

//     raw.forEach(r => {
//       if (r._id) values[r._id - 1] = r.total;
//     });

//     res.json({ labels, values });
//   } catch {
//     res.status(500).json({ error: "Daily pattern failed" });
//   }
// });

// /* =========================================================
//    YOY FULL
// ========================================================= */
// router.get("/yoy-full", async (req, res) => {
//   try {
//     const startYear = Number(req.query.startYear);
//     const endYear = Number(req.query.endYear);
//     const cargoType = req.query.cargoType;

//     const match = { "Year Text": { $gte: startYear, $lte: endYear } };
//     if (cargoType && cargoType !== "ALL") match.TYPE = cargoType;

//     const raw = await CargoRecord.aggregate([
//       { $match: match },
//       {
//         $group: {
//           _id: { year: "$Year Text", month: "$Month Short Text" },
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);

//     const years = [];
//     for (let y = startYear; y <= endYear; y++) years.push(y);

//     const monthly = {
//       years: years.map(y => ({
//         year: y,
//         values: MONTHS.map(m => {
//           const r = raw.find(x => x._id.year === y && x._id.month === m);
//           return r ? r.total : 0;
//         })
//       }))
//     };

//     res.json({ monthly });
//   } catch {
//     res.status(500).json({ error: "YOY failed" });
//   }
// });

// /* =========================================================
//    MARKET SHARE – STATION
// ========================================================= */
// router.post("/marketShare/station", async (req, res) => {
//   try {
//     const year = Number(req.body.year || 2025);

//     const data = await CargoRecord.aggregate([
//       { $match: { "Year Text": year } },
//       {
//         $group: {
//           _id: "$Station",
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);

//     res.json({
//       labels: data.map(d => d._id),
//       values: data.map(d => +(d.total / 1000).toFixed(2))
//     });
//   } catch {
//     res.status(500).json({ error: "Market station failed" });
//   }
// });

// /* =========================================================
//    MARKET SHARE – CARGO TYPE
// ========================================================= */
// router.post("/marketShare/cargoType", async (req, res) => {
//   try {
//     const year = Number(req.body.year || 2025);
//     const station = req.body.station;

//     const match = { "Year Text": year };
//     if (station && station !== "ALL") match.Station = station;

//     const data = await CargoRecord.aggregate([
//       { $match: match },
//       {
//         $group: {
//           _id: "$Tonnages Product Final",
//           total: { $sum: safeWeight }
//         }
//       }
//     ]);

//     res.json({
//       labels: data.map(d => d._id || "UNKNOWN"),
//       values: data.map(d => +(d.total / 1000).toFixed(2))
//     });
//   } catch {
//     res.status(500).json({ error: "Market cargo failed" });
//   }
// });
// router.post("/cargo-mix", async (req, res) => {
//   try {
//     const { year, quarter } = req.body;

//     if (!year) {
//       return res.status(400).json({ error: "year is required" });
//     }

//     const QMAP = {
//       Q1: ["Jan","Feb","Mar"],
//       Q2: ["Apr","May","Jun"],
//       Q3: ["Jul","Aug","Sep"],
//       Q4: ["Oct","Nov","Dec"]
//     };

//     const match = { "Year Text": Number(year) };

//     if (quarter && quarter !== "ALL" && QMAP[quarter]) {
//       match["Month Short Text"] = { $in: QMAP[quarter] };
//     }

//     const data = await CargoRecord.aggregate([
//       { $match: match },
//       {
//         $group: {
//           _id: "$TYPE",
//           total: {
//             $convert: {
//               input: "$Weight KG",
//               to: "double",
//               onError: 0,
//               onNull: 0
//             }
//           }
//         }
//       }
//     ]);

//     res.json({
//       labels: data.map(d => d._id || "UNKNOWN"),
//       values: data.map(d => d.total)
//     });

//   } catch (err) {
//     console.error("CARGO MIX ERROR:", err);
//     res.status(500).json({ error: "Cargo mix failed" });
//   }
// });

// /* ========================================================= */
// module.exports = router;


// const express = require("express");
// const router = express.Router();
// const CargoRecord = require("../models/CargoRecord");

// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// /* ================= SAFE WEIGHT ================= */
// const safeWeight = {
//   $convert: {
//     input: "$Weight KG",
//     to: "double",
//     onError: 0,
//     onNull: 0
//   }
// };

// /* ================= SUMMARY ================= */
// router.get("/summary", async (req, res) => {
//   try {
//     const data = await CargoRecord.find().lean();
//     let importTotal = 0, exportTotal = 0, transitTotal = 0;

//     data.forEach(r => {
//       const w = Number(r["Weight KG"] || 0);
//       const t = (r.TYPE || "").toUpperCase();
//       if (t === "IMPORT") importTotal += w;
//       else if (t === "EXPORT") exportTotal += w;
//       else if (t.includes("TRN")) transitTotal += w;
//     });

//     res.json({
//       revenue: importTotal + exportTotal,
//       import: importTotal,
//       export: exportTotal,
//       transit: transitTotal
//     });
//   } catch {
//     res.status(500).json({ error: "Summary failed" });
//   }
// });

// /* ================= ALL ================= */
// router.get("/all", async (req, res) => {
//   try {
//     const data = await CargoRecord.aggregate([
//       { $group: { _id: "$TYPE", total: { $sum: safeWeight } } }
//     ]);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "All data failed" });
//   }
// });

// /* ================= TOP STATIONS ================= */
// router.get("/top-stations", async (req, res) => {
//   try {
//     const data = await CargoRecord.aggregate([
//       { $group: { _id: "$Station", total: { $sum: safeWeight } } },
//       { $sort: { total: -1 } },
//       { $limit: 10 }
//     ]);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "Top stations failed" });
//   }
// });

// /* ================= YEARLY ================= */
// router.get("/yearly", async (req, res) => {
//   try {
//     const data = await CargoRecord.aggregate([
//       { $group: { _id: "$Year Text", totalWeight: { $sum: safeWeight } } },
//       { $sort: { _id: 1 } }
//     ]);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "Yearly failed" });
//   }
// });

// /* ================= QUARTERLY ================= */
// router.get("/quarterly", async (req, res) => {
//   try {
//     const latest = await CargoRecord.aggregate([
//       { $group: { _id: "$Year Text" } },
//       { $sort: { _id: -1 } },
//       { $limit: 1 }
//     ]);

//     if (!latest.length)
//       return res.json({ year: null, quarterly: [0,0,0,0] });

//     const year = latest[0]._id;

//     const raw = await CargoRecord.aggregate([
//       { $match: { "Year Text": year } },
//       { $group: { _id: "$Month Short Text", total: { $sum: safeWeight } } }
//     ]);

//     const Q = [0,0,0,0];
//     raw.forEach(d => {
//       if (["Jan","Feb","Mar"].includes(d._id)) Q[0] += d.total;
//       else if (["Apr","May","Jun"].includes(d._id)) Q[1] += d.total;
//       else if (["Jul","Aug","Sep"].includes(d._id)) Q[2] += d.total;
//       else if (["Oct","Nov","Dec"].includes(d._id)) Q[3] += d.total;
//     });

//     res.json({ year, quarterly: Q });
//   } catch {
//     res.status(500).json({ error: "Quarterly failed" });
//   }
// });

// /* ================= HEATMAP ================= */
// router.get("/heatmap", async (req, res) => {
//   try {
//     const raw = await CargoRecord.aggregate([
//       { $group: { _id: { year: "$Year Text", month: "$Month Short Text" }, total: { $sum: safeWeight } } }
//     ]);

//     const years = [...new Set(raw.map(r => r._id.year))].sort();

//     const matrix = years.map(y =>
//       MONTHS.map(m => {
//         const r = raw.find(x => x._id.year === y && x._id.month === m);
//         return r ? r.total : 0;
//       })
//     );

//     res.json({ years, months: MONTHS, matrix, max: Math.max(...matrix.flat(), 0) });
//   } catch {
//     res.status(500).json({ error: "Heatmap failed" });
//   }
// });

// /* ================= DAILY PATTERN ================= */
// router.get("/daily-pattern", async (req, res) => {
//   try {
//     const raw = await CargoRecord.aggregate([
//       {
//         $addFields: {
//           day: {
//             $dayOfWeek: {
//               $dateFromString: {
//                 dateString: "$Accept Flight Date",
//                 onError: null,
//                 onNull: null
//               }
//             }
//           }
//         }
//       },
//       { $group: { _id: "$day", total: { $sum: safeWeight } } }
//     ]);

//     const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
//     const values = Array(7).fill(0);
//     raw.forEach(r => { if (r._id) values[r._id - 1] = r.total; });

//     res.json({ labels, values });
//   } catch {
//     res.status(500).json({ error: "Daily pattern failed" });
//   }
// });

// /* ================= YOY FULL (FIXED) ================= */
// router.get("/yoy-full", async (req, res) => {
//   try {
//     const startYear = Number(req.query.startYear);
//     const endYear = Number(req.query.endYear);
//     const cargoType = req.query.cargoType;

//     const match = { "Year Text": { $gte: startYear, $lte: endYear } };
//     if (cargoType && cargoType !== "ALL") match.TYPE = cargoType;

//     const raw = await CargoRecord.aggregate([
//       { $match: match },
//       { $group: { _id: { year: "$Year Text", month: "$Month Short Text" }, total: { $sum: safeWeight } } }
//     ]);

//     const years = [];
//     for (let y = startYear; y <= endYear; y++) years.push(y);

//     const monthly = {
//       years: years.map(y => ({
//         year: y,
//         values: MONTHS.map(m =>
//           raw.filter(r => r._id.year === y && r._id.month === m)
//              .reduce((a,b) => a + b.total, 0)
//         )
//       }))
//     };

//     /* Cargo Mix for YOY */
//     const cargoRaw = await CargoRecord.aggregate([
//       { $match: match },
//       { $group: { _id: "$TYPE", total: { $sum: safeWeight } } }
//     ]);

//     const cargoMix = {
//       labels: cargoRaw.map(r => r._id || "UNKNOWN"),
//       values: cargoRaw.map(r => r.total)
//     };

//     res.json({ monthly, cargoMix });
//   } catch (err) {
//     console.error("YOY ERROR:", err);
//     res.status(500).json({ error: "YOY failed" });
//   }
// });

// /* ================= MARKET SHARE ================= */
// router.post("/marketShare/station", async (req, res) => {
//   try {
//     const year = Number(req.body.year || 2025);
//     const data = await CargoRecord.aggregate([
//       { $match: { "Year Text": year } },
//       { $group: { _id: "$Station", total: { $sum: safeWeight } } }
//     ]);

//     res.json({
//       labels: data.map(d => d._id),
//       values: data.map(d => +(d.total / 1000).toFixed(2))
//     });
//   } catch {
//     res.status(500).json({ error: "Market station failed" });
//   }
// });

// router.post("/marketShare/cargoType", async (req, res) => {
//   try {
//     const year = Number(req.body.year || 2025);
//     const station = req.body.station;

//     const match = { "Year Text": year };
//     if (station && station !== "ALL") match.Station = station;

//     const data = await CargoRecord.aggregate([
//       { $match: match },
//       { $group: { _id: "$Tonnages Product Final", total: { $sum: safeWeight } } }
//     ]);

//     res.json({
//       labels: data.map(d => d._id || "UNKNOWN"),
//       values: data.map(d => +(d.total / 1000).toFixed(2))
//     });
//   } catch {
//     res.status(500).json({ error: "Market cargo failed" });
//   }
// });

// /* ================= CARGO MIX ================= */
// router.post("/cargo-mix", async (req, res) => {
//   try {
//     const { year, quarter } = req.body;
//     if (!year) return res.json({ labels: [], values: [] });

//     const QMAP = {
//       Q1: ["Jan","Feb","Mar"],
//       Q2: ["Apr","May","Jun"],
//       Q3: ["Jul","Aug","Sep"],
//       Q4: ["Oct","Nov","Dec"]
//     };

//     const match = { "Year Text": Number(year) };
//     if (quarter && quarter !== "ALL" && QMAP[quarter]) {
//       match["Month Short Text"] = { $in: QMAP[quarter] };
//     }

//     const data = await CargoRecord.aggregate([
//       { $match: match },
//       { $group: { _id: "$TYPE", total: { $sum: safeWeight } } }
//     ]);

//     res.json({
//       labels: data.map(d => d._id || "UNKNOWN"),
//       values: data.map(d => d.total)
//     });
//   } catch {
//     res.json({ labels: [], values: [] });
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const CargoRecord = require("../models/CargoRecord");

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ================= SAFE WEIGHT ================= */
const SAFE_WEIGHT = {
  $sum: {
    $convert: {
      input: {
        $replaceAll: {
          input: { $toString: "$Weight KG" },
          find: ",",
          replacement: ""
        }
      },
      to: "double",
      onError: 0,
      onNull: 0
    }
  }
};

/* ================= SAFE DATE ================= */
const SAFE_DATE = {
  $dateFromString: {
    dateString: "$Accept Flight Date",
    format: "%d-%b-%y",
    onError: null,
    onNull: null
  }
};

/* ================= SUMMARY ================= */
router.get("/summary", async (_, res) => {
  try {
    const data = await CargoRecord.aggregate([
      {
        $group: {
          _id: "$TYPE",
          total: SAFE_WEIGHT
        }
      }
    ]);

    const map = {};
    data.forEach(d => map[d._id] = d.total);

    res.json({
      import: map.IMPORT || 0,
      export: map.EXPORT || 0,
      transit: (map["TRN IN"] || 0) + (map["TRN OUT"] || 0),
      revenue: (map.IMPORT || 0) + (map.EXPORT || 0)
    });
  } catch (e) {
    console.error("SUMMARY ERROR", e);
    res.status(500).json({ error: "summary failed" });
  }
});

/* ================= TOP STATIONS ================= */
router.get("/top-stations", async (_, res) => {
  try {
    const data = await CargoRecord.aggregate([
      { $group: { _id: "$Station", total: SAFE_WEIGHT } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    res.json(data);
  } catch (e) {
    console.error("TOP STATIONS ERROR", e);
    res.status(500).json({ error: "top-stations failed" });
  }
});

/* ================= YEARLY ================= */
router.get("/yearly", async (_, res) => {
  try {
    const data = await CargoRecord.aggregate([
      { $group: { _id: "$Year Text", total: SAFE_WEIGHT } },
      { $sort: { _id: 1 } }
    ]);
    res.json(data);
  } catch (e) {
    console.error("YEARLY ERROR", e);
    res.status(500).json({ error: "yearly failed" });
  }
});

/* ================= HEATMAP ================= */
router.get("/heatmap", async (_, res) => {
  try {
    const raw = await CargoRecord.aggregate([
      { $group: { _id: { year: "$Year Text", month: "$Month Short Text" }, total: SAFE_WEIGHT } }
    ]);

    const years = [...new Set(raw.map(r => r._id.year))].sort();

    const matrix = years.map(y =>
      MONTHS.map(m => {
        const r = raw.find(x => x._id.year === y && x._id.month === m);
        return r ? r.total : 0;
      })
    );

    res.json({ years, months: MONTHS, matrix, max: Math.max(...matrix.flat(), 0) });
  } catch (e) {
    console.error("HEATMAP ERROR", e);
    res.status(500).json({ error: "heatmap failed" });
  }
});

/* ================= DAILY PATTERN ================= */
router.get("/daily-pattern", async (_, res) => {
  try {
    const raw = await CargoRecord.aggregate([
      { $addFields: { parsedDate: SAFE_DATE } },
      { $addFields: { day: { $dayOfWeek: "$parsedDate" } } },
      { $group: { _id: "$day", total: SAFE_WEIGHT } }
    ]);

    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const values = Array(7).fill(0);

    raw.forEach(r => {
      if (r._id) values[r._id - 1] = r.total;
    });

    res.json({ labels, values });
  } catch (e) {
    console.error("DAILY ERROR", e);
    res.status(500).json({ error: "daily-pattern failed" });
  }
});

/* ================= YOY FULL ================= */
router.get("/yoy-full", async (req, res) => {
  try {
    const startYear = Number(req.query.startYear);
    const endYear = Number(req.query.endYear);

    const raw = await CargoRecord.aggregate([
      { $match: { "Year Text": { $gte: startYear, $lte: endYear } } },
      { $group: { _id: { year: "$Year Text", month: "$Month Short Text" }, total: SAFE_WEIGHT } }
    ]);

    const years = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);

    const monthly = {
      years: years.map(y => ({
        year: y,
        values: MONTHS.map(m =>
          raw
            .filter(r => r._id.year === y && r._id.month === m)
            .reduce((a, b) => a + b.total, 0)
        )
      }))
    };

    res.json({ monthly });
  } catch (e) {
    console.error("YOY ERROR", e);
    res.status(500).json({ error: "yoy failed" });
  }
});

/* ================= MARKET SHARE ================= */
router.post("/marketShare/station", async (req, res) => {
  try {
    const year = Number(req.body.year || 2025);
    const data = await CargoRecord.aggregate([
      { $match: { "Year Text": year } },
      { $group: { _id: "$Station", total: SAFE_WEIGHT } }
    ]);

    res.json({
      labels: data.map(d => d._id),
      values: data.map(d => +(d.total / 1000).toFixed(2))
    });
  } catch (e) {
    console.error("STATION SHARE ERROR", e);
    res.status(500).json({ error: "station share failed" });
  }
});

router.post("/marketShare/cargoType", async (req, res) => {
  try {
    const year = Number(req.body.year || 2025);
    const data = await CargoRecord.aggregate([
      { $match: { "Year Text": year } },
      { $group: { _id: "$Tonnages Product Final", total: SAFE_WEIGHT } }
    ]);

    res.json({
      labels: data.map(d => d._id || "UNKNOWN"),
      values: data.map(d => +(d.total / 1000).toFixed(2))
    });
  } catch (e) {
    console.error("CARGO SHARE ERROR", e);
    res.status(500).json({ error: "cargo share failed" });
  }
});

module.exports = router;
