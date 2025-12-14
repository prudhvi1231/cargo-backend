
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
// router.get("/daily-pattern", async (_, res) => {
//   try {
//     const raw = await CargoRecord.aggregate([
//       { $addFields: { parsedDate: SAFE_DATE } },
//       { $addFields: { day: { $dayOfWeek: "$parsedDate" } } },
//       { $group: { _id: "$day", total: SAFE_WEIGHT } }
//     ]);

//     const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
//     const values = Array(7).fill(0);

//     raw.forEach(r => {
//       if (r._id) values[r._id - 1] = r.total;
//     });

//     res.json({ labels, values });
//   } catch (e) {
//     console.error("DAILY ERROR", e);
//     res.status(500).json({ error: "daily-pattern failed" });
//   }
// });


// router.get("/daily-pattern", async (_, res) => {
//   try {
//     const raw = await CargoRecord.aggregate([
//       {
//         $addFields: {
//           parsedDate: {
//             $dateFromString: {
//               dateString: "$Accept Flight Date",
//               format: "%d-%b-%y",
//               onError: null,
//               onNull: null
//             }
//           }
//         }
//       },
//       { $match: { parsedDate: { $ne: null } } },   // ✅ IMPORTANT
//       {
//         $group: {
//           _id: { $dayOfWeek: "$parsedDate" },
//           total: SAFE_WEIGHT
//         }
//       }
//     ]);

//     const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
//     const values = Array(7).fill(0);

//     raw.forEach(r => {
//       if (r._id >= 1 && r._id <= 7) {
//         values[r._id - 1] = +(r.total / 1000).toFixed(2); // return tons
//       }
//     });

//     res.json({ labels, values });
//   } catch (e) {
//     console.error("DAILY ERROR", e);
//     res.status(200).json({ labels: [], values: [] }); // never crash UI
//   }
// });


router.get("/daily-pattern", async (req, res) => {
  try {
    const raw = await CargoRecord.aggregate([
      {
        $addFields: {
          parsedDate: {
            $cond: [
              { $and: [
                { $ne: ["$Accept Flight Date", null] },
                { $ne: ["$Accept Flight Date", ""] }
              ]},
              {
                $dateFromString: {
                  dateString: "$Accept Flight Date",
                  onError: null,
                  onNull: null
                }
              },
              null
            ]
          }
        }
      },
      { $match: { parsedDate: { $ne: null } } },
      {
        $group: {
          _id: { $dayOfWeek: "$parsedDate" },
          total: {
            $sum: {
              $convert: {
                input: { $toString: "$Weight KG" },
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);

    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const values = Array(7).fill(0);

    raw.forEach(r => {
      if (r._id) values[r._id - 1] = +(r.total / 1000).toFixed(2); // tons
    });

    res.json({ labels, values });
  } catch (e) {
    console.error("DAILY PATTERN ERROR", e);
    res.json({ labels: [], values: [] }); // ❗ never crash frontend
  }
});

/* ================= YOY FULL ================= */
// router.get("/yoy-full", async (req, res) => {
//   try {
//     const startYear = Number(req.query.startYear);
//     const endYear = Number(req.query.endYear);

//     const raw = await CargoRecord.aggregate([
//       { $match: { "Year Text": { $gte: startYear, $lte: endYear } } },
//       { $group: { _id: { year: "$Year Text", month: "$Month Short Text" }, total: SAFE_WEIGHT } }
//     ]);

//     const years = [];
//     for (let y = startYear; y <= endYear; y++) years.push(y);

//     const monthly = {
//       years: years.map(y => ({
//         year: y,
//         values: MONTHS.map(m =>
//           raw
//             .filter(r => r._id.year === y && r._id.month === m)
//             .reduce((a, b) => a + b.total, 0)
//         )
//       }))
//     };

//     res.json({ monthly });
//   } catch (e) {
//     console.error("YOY ERROR", e);
//     res.status(500).json({ error: "yoy failed" });
//   }
// });
router.get("/yoy-full", async (req, res) => {
  try {
    const startYear = Number(req.query.startYear);
    const endYear = Number(req.query.endYear);

    if (!startYear || !endYear) {
      return res.json({ years: [] });
    }

    const raw = await CargoRecord.aggregate([
      {
        $addFields: {
          yearNum: { $toInt: "$Year Text" }   // ✅ handles string years
        }
      },
      {
        $match: {
          yearNum: { $gte: startYear, $lte: endYear }
        }
      },
      {
        $group: {
          _id: {
            year: "$yearNum",
            month: { $trim: { input: "$Month Short Text" } }
          },
          total: SAFE_WEIGHT
        }
      }
    ]);

    const years = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);

    const result = years.map(y => ({
      year: y,
      values: MONTHS.map(m =>
        raw
          .filter(r => r._id.year === y && r._id.month === m)
          .reduce((a, b) => a + b.total, 0)
      )
    }));

    res.json({ years: result });
  } catch (e) {
    console.error("YOY ERROR", e);
    res.status(200).json({ years: [] });
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
router.get("/all", async (req, res) => {
  try {
    const data = await CargoRecord.aggregate([
      {
        $group: {
          _id: "$TYPE",
          total: {
            $sum: {
              $convert: {
                input: { $toString: "$Weight KG" },
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);
    res.json(data);
  } catch (e) {
    console.error("ALL ERROR", e);
    res.status(500).json([]);
  }
});
// router.get("/quarterly", async (req, res) => {
//   try {
//     const latest = await CargoRecord.findOne()
//       .sort({ "Year Text": -1 })
//       .select("Year Text")
//       .lean();

//     if (!latest) {
//       return res.json({ year: null, quarterly: [0, 0, 0, 0] });
//     }

//     const year = latest["Year Text"];

//     const raw = await CargoRecord.aggregate([
//       { $match: { "Year Text": year } },
//       {
//         $group: {
//           _id: "$Month Short Text",
//           total: {
//             $sum: {
//               $convert: {
//                 input: { $toString: "$Weight KG" },
//                 to: "double",
//                 onError: 0,
//                 onNull: 0
//               }
//             }
//           }
//         }
//       }
//     ]);

//     const Q = [0, 0, 0, 0];
//     raw.forEach(r => {
//       if (["Jan","Feb","Mar"].includes(r._id)) Q[0] += r.total;
//       else if (["Apr","May","Jun"].includes(r._id)) Q[1] += r.total;
//       else if (["Jul","Aug","Sep"].includes(r._id)) Q[2] += r.total;
//       else if (["Oct","Nov","Dec"].includes(r._id)) Q[3] += r.total;
//     });

//     res.json({ year, quarterly: Q });
//   } catch (e) {
//     console.error("QUARTERLY ERROR", e);
//     res.status(500).json({ year: null, quarterly: [0,0,0,0] });
//   }
// });
// router.get("/quarterly", async (req, res) => {
//   try {
//     const latest = await CargoRecord.findOne()
//       .sort({ "Year Text": -1 })
//       .select("Year Text")
//       .lean();

//     if (!latest) {
//       return res.json({ year: null, quarterly: [0, 0, 0, 0] });
//     }

//     const year = latest["Year Text"];

//     const raw = await CargoRecord.aggregate([
//       { $match: { "Year Text": year } },
//       {
//         $group: {
//           _id: { $toLower: "$Month Short Text" },
//           total: {
//             $sum: {
//               $convert: {
//                 input: { $toString: "$Weight KG" },
//                 to: "double",
//                 onError: 0,
//                 onNull: 0
//               }
//             }
//           }
//         }
//       }
//     ]);

//     const Q = [0, 0, 0, 0];

//     raw.forEach(r => {
//       if (["jan","feb","mar"].includes(r._id)) Q[0] += r.total;
//       else if (["apr","may","jun"].includes(r._id)) Q[1] += r.total;
//       else if (["jul","aug","sep"].includes(r._id)) Q[2] += r.total;
//       else if (["oct","nov","dec"].includes(r._id)) Q[3] += r.total;
//     });

//     res.json({ year, quarterly: Q });

//   } catch (e) {
//     console.error("QUARTERLY ERROR", e);
//     res.status(500).json({ year: null, quarterly: [0, 0, 0, 0] });
//   }
// });



router.get("/quarterly", async (req, res) => {
  try {
    const latest = await CargoRecord.findOne()
      .sort({ "Year Text": -1 })
      .select("Year Text")
      .lean();

    if (!latest) {
      return res.json({ year: null, quarterly: [0, 0, 0, 0] });
    }

    const year = latest["Year Text"];

    const raw = await CargoRecord.aggregate([
      {
        $addFields: {
          parsedDate: {
            $dateFromString: {
              dateString: "$Accept Flight Date",
              format: "%d-%b-%y",
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $match: {
          "Year Text": year,
          parsedDate: { $ne: null }
        }
      },
      {
        $group: {
          _id: { $month: "$parsedDate" },
          total: {
            $sum: {
              $convert: {
                input: { $toString: "$Weight KG" },
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);

    const Q = [0, 0, 0, 0];

    raw.forEach(r => {
      if ([1, 2, 3].includes(r._id)) Q[0] += r.total;
      else if ([4, 5, 6].includes(r._id)) Q[1] += r.total;
      else if ([7, 8, 9].includes(r._id)) Q[2] += r.total;
      else if ([10, 11, 12].includes(r._id)) Q[3] += r.total;
    });

    res.json({ year, quarterly: Q });

  } catch (e) {
    console.error("QUARTERLY ERROR", e);
    res.status(500).json({ year: null, quarterly: [0, 0, 0, 0] });
  }
});

router.post("/cargo-mix", async (req, res) => {
  try {
    const { year, quarter } = req.body;

    if (!year) return res.json({ labels: [], values: [] });

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

    const data = await CargoRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$TYPE",
          total: {
            $sum: {
              $convert: {
                input: { $toString: "$Weight KG" },
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);

    res.json({
      labels: data.map(d => d._id || "UNKNOWN"),
      values: data.map(d => d.total)
    });
  } catch (e) {
    console.error("CARGO MIX ERROR", e);
    res.json({ labels: [], values: [] });
  }
});
router.get("/daily-pattern", async (req, res) => {
  try {
    const raw = await CargoRecord.aggregate([
      {
        $addFields: {
          parsedDate: {
            $dateFromString: {
              dateString: "$Accept Flight Date",
              format: "%d-%b-%y",
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$parsedDate" },
          total: {
            $sum: {
              $convert: {
                input: { $toString: "$Weight KG" },
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);

    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const values = Array(7).fill(0);
    raw.forEach(r => {
      if (r._id) values[r._id - 1] = r.total;
    });

    res.json({ labels, values });
  } catch (e) {
    console.error("DAILY ERROR", e);
    res.status(500).json({ labels: [], values: [] });
  }
});
router.get("/growth-decline", async (req, res) => {
  try {
    const year = Number(req.query.year || 2025);

    const data = await CargoRecord.aggregate([
      { $addFields: { yearNum: { $toInt: "$Year Text" } } },
      { $match: { yearNum: year } },
      {
        $group: {
          _id: "$Station",
          total: SAFE_WEIGHT
        }
      },
      { $sort: { total: -1 } }
    ]);

    const up = data.slice(0, 5).map(d => ({
      route: d._id,
      value: d.total
    }));

    const down = data.slice(-5).map(d => ({
      route: d._id,
      value: -d.total
    }));

    res.json({ up, down });
  } catch (e) {
    console.error("GROWTH ERROR", e);
    res.json({ up: [], down: [] });
  }
});


module.exports = router;
