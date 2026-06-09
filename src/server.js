require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

/* =========================
   CORS
========================= */

const allowedOrigins = [
  "https://salesmanagementcrm-frontend.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

/* =========================
   Security
========================= */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(compression());

app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);

/* =========================
   Body Parser
========================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   Rate Limit
========================= */

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
  })
);

/* =========================
   Static
========================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

app.use(
  "/uploads/recordings",
  express.static(
    path.join(__dirname, "../uploads/recordings")
  )
);

/* =========================
   Routes
========================= */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));

app.use(
  "/api/leads/import",
  require("./routes/leadImport")
);

app.use("/api/leads", require("./routes/leads"));
app.use("/api/followups", require("./routes/followups"));
app.use("/api/activities", require("./routes/activities"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/recordings", require("./routes/recordings"));
app.use("/api/calls", require("./routes/calls"));

/* =========================
   Health
========================= */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date(),
  });
});

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================
   Error Handler
========================= */

app.use((err, req, res, next) => {
  console.error("ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });
});

/* =========================
   MongoDB
========================= */

const PORT = process.env.PORT || 5009;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo Error:", err);
    process.exit(1);
  });