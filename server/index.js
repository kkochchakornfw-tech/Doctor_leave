import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initCronJobs } from './cron.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Hardening: Hide Server Fingerprint (Prevent Information Disclosure)
app.disable('x-powered-by');

// Security Headers Middleware
app.use((req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Cross-Site Scripting protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middlewares
app.use(cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api', apiRoutes);

// Direct webhook route fallback (in case Webhook URL is set to /line/webhook without /api)
app.use('/line/webhook', (req, res, next) => {
  req.url = '/line/webhook';
  apiRoutes(req, res, next);
});

// In production, serve the frontend dist folder
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing in Express 5
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Doctor Leave @ LINE API Server is running. Access Vite at http://localhost:5173');
    }
  });
});

import { initStore } from './db.js';
import { flushPostgres } from './pg_store.js';

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    try { await flushPostgres(); } finally { process.exit(0); }
  });
}

// Initialize Cron Jobs
initCronJobs();

// Initialize DB and start server
initStore().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🏥 Doctor Leave @ LINE Server`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
