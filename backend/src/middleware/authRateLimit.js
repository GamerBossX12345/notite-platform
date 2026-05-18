// Rate-limiters globali pentru endpoint-urile de autentificare. Scopul e
// anti-brute-force pe login și anti-flood pe register / verificări. Cheia e
// IP-ul (X-Forwarded-For primul dacă există), iar fereastra e scurtă (15 min).
//
// În prod cu mai multe procese, mutăm store-ul în Redis (default e in-memory,
// per-proces — suficient pentru o singură instanță).

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// `ipKeyGenerator` din express-rate-limit normalizează IPv6 (taie /64 subnetul)
// ca să nu permită bypass prin rotirea ultimilor 64 de biți. Cu `trust proxy`
// setat pe app, req.ip e deja IP-ul real al clientului.
function clientIp(req, res) {
  return ipKeyGenerator(req, res);
}

// 5 încercări de login eșuate per IP în 15 minute. Răspunsurile reușite NU
// consumă cota (skipSuccessfulRequests) ca să nu blocăm useri valizi.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIp,
  skipSuccessfulRequests: true,
  message: {
    error: 'Prea multe încercări de login. Mai încearcă peste 15 minute.',
    code: 'AUTH_RATE_LIMIT',
  },
});

// Register / cereri verificare: limităm spam-ul de conturi noi.
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIp,
  message: {
    error: 'Prea multe înregistrări de pe acest IP. Mai încearcă peste o oră.',
    code: 'AUTH_RATE_LIMIT',
  },
});
