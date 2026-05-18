// Entry point. Pornește cu: npm run dev
//
// Lanțul de middleware:
//   request → cors → json parser → routes → errorHandler → response
// Ordinea contează! errorHandler TREBUIE să fie ultimul.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import notesRoutes from './routes/notes.routes.js';
import adminRoutes from './routes/admin.routes.js';
import requestsRoutes from './routes/requests.routes.js';
import { getLeaderboard } from './controllers/leaderboard.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sweepBannedAccounts, sweepScheduledNoteDeletions } from './services/ban.service.js';

dotenv.config(); // încarcă .env în process.env

const app = express();

// Trust primul proxy (load balancer / Nginx). Necesar ca express-rate-limit să
// citească corect IP-ul real din X-Forwarded-For în loc de IP-ul proxy-ului.
// În dev fără proxy, e benign — req.ip rămâne 127.0.0.1.
app.set('trust proxy', 1);

// Helmet — adaugă headerele standard de securitate (X-Frame-Options,
// Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy etc.).
// `crossOriginResourcePolicy` setat pe `cross-origin` ca să nu blocăm
// fișierele din /uploads pentru frontend-ul de pe alt origin în dev.
//
// CSP: serverul e API JSON, deci nu randează HTML cu scripturi. Setăm o
// politică minimă — default-src 'none' și permitem doar imagini/media (pentru
// /uploads servit static) + connect/font/style 'self'. Frontend-ul Vite are
// propriul index.html și își poate seta CSP-ul prin <meta http-equiv> dacă e
// nevoie; aici ne uităm doar la răspunsurile API.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: { maxAge: 15552000, includeSubDomains: true },
}));

// CORS — permite requests de la frontend. În prod, restrictioneaza la
// domeniul concret (ex: FRONTEND_URL din .env).
const corsOrigin = process.env.FRONTEND_URL || true;
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Parser JSON pentru req.body
app.use(express.json({ limit: '10mb' })); // 10mb pentru notițe cu imagini base64

// Servește fișierele încărcate (PDF/imagini) ca statice
app.use('/uploads', express.static('uploads'));

// Health check — util pentru a verifica că serverul răspunde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestsRoutes);
app.get('/api/leaderboard', getLeaderboard);

// 404 pentru orice rută API negăsită
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint inexistent' });
});

// Error handler — ULTIMUL!
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server pornit pe http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);

  // Ștergere conturi banate cu termen expirat. Rulează la pornire + zilnic.
  // Conturile cu apel activ (PENDING/OPEN) sunt sărite de sweeper.
  const runSweepers = async () => {
    try {
      const a = await sweepBannedAccounts();
      const b = await sweepScheduledNoteDeletions();
      if (a.deleted > 0) console.log(`[Sweeper] deleted ${a.deleted} banned accounts`);
      if (b.deleted > 0) console.log(`[Sweeper] deleted ${b.deleted} scheduled notes`);
    } catch (err) {
      console.error('[Sweeper] failed:', err.message);
    }
  };
  runSweepers();
  setInterval(runSweepers, 60 * 60 * 1000); // o dată pe oră
});
