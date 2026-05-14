// Entry point. Pornește cu: npm run dev
//
// Lanțul de middleware:
//   request → cors → json parser → routes → errorHandler → response
// Ordinea contează! errorHandler TREBUIE să fie ultimul.

import express from 'express';
import cors from 'cors';
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

// CORS — permite requests de la frontend (alt origin: localhost:5173).
// În producție, configurează doar domeniile permise:
//   app.use(cors({ origin: 'https://site-ul-tau.ro' }));
app.use(cors());

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
