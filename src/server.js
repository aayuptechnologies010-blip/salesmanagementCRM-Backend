require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const leadRoutes     = require('./routes/leads');
const followUpRoutes = require('./routes/followups');
const activityRoutes = require('./routes/activities');
const invoiceRoutes  = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes  = require('./routes/settings');
const uploadRoutes      = require('./routes/upload');
const recordingRoutes   = require('./routes/recordings');
const callRoutes        = require('./routes/calls');
const leadImportRoutes  = require('./routes/leadImport');

const app = express();

// ── CORS (must be before helmet) ──
const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight for all routes

// ── Security & Performance ──
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body Parser ──
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── Static Assets (Uploaded Images) ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/recordings', express.static(path.join(__dirname, '../uploads/recordings')));

// ── Routes ──
app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/leads/import', leadImportRoutes); // ⚠️ Must be BEFORE /api/leads
app.use('/api/leads',        leadRoutes);
app.use('/api/followups',    followUpRoutes);
app.use('/api/activities',   activityRoutes);
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/settings',     settingsRoutes);
app.use('/api/upload',       uploadRoutes);
app.use('/api/recordings',   recordingRoutes);
app.use('/api/calls',        callRoutes);

// ── Health Check ──
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ──
app.use((_, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ── DB + Server ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
