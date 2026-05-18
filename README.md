# Notițe — platformă colaborativă de notițe școlare

Platformă pentru elevi de gimnaziu și liceu unde poți publica notițe, le poți
evalua, salva, comenta, primi feedback de la profesori verificați și învăța
din ele cu ajutorul unor instrumente AI (quiz, chat per notiță, flashcards
spaced-repetition).

Proiect dezvoltat pentru **InfoEducație — secțiunea Web**.

---

## Cuprins

- [Demo flow](#demo-flow)
- [Funcționalități](#funcționalități)
- [Stack tehnic](#stack-tehnic)
- [Arhitectură](#arhitectură)
- [Setup local](#setup-local)
- [Structura proiectului](#structura-proiectului)
- [Decizii arhitecturale](#decizii-arhitecturale)
- [Securitate](#securitate)
- [Conturi demo](#conturi-demo)

---

## Demo flow

1. **Login** ca `alice@notite.ro` / `parola123`.
2. Pe Home: vezi notițele filtrate după clasa ta implicită; folosește bara „Filtre" pentru materii / clasă / tip / tag.
3. Caută semantic: scrie ce cauți, apasă „🔍 Caută semantic" — modelul găsește notițe similare conceptual chiar dacă nu conțin cuvintele exacte.
4. Intră pe o notiță → vezi conținut + atașamente; comentezi; votezi 1–5 stele.
5. Apasă „💬 Cere ajutorul AI" — chat persistat per notiță, vezi explicații despre subiect.
6. Apasă „🎴 Generează flashcards" → flashcards SM-2 cu repetiție spațiată în pagina `/flashcards/study`.
7. Apasă „📝 Generează quiz cu AI" → întrebări grilă scoase din conținutul notiței.
8. Ca **profesor verificat** poți marca notițe cu ✓ / ✗ (validare) sau le poți edita pentru corecturi.
9. Ca **admin** ai panou complet: utilizatori, notițe, rapoarte, apeluri, profesori, sistem.

---

## Funcționalități

### Notițe & conținut
- Editor TipTap rich-text (bold, italic, liste, citate, code blocks, headings, LaTeX via KaTeX).
- Atașamente: PDF, Word, PowerPoint, Excel, imagini, ODT — max 20MB.
- **Extragere automată de text** din PDF/Word/Excel/imagini (mammoth, pdf-parse, xlsx) — folosită de AI și de moderare.
- Capitole predefinite per (clasă, materie) cu fallback la text liber.
- Tag-uri hibride: oficiale (definite de admin) + free-form.
- **Detector de duplicate** la upload — MinHash + Jaccard similarity pe shingles de 5 cuvinte.

### Căutare
- **Clasică** — keyword pe titlu / materie cu filtre combinate.
- **Semantică** — embeddings locale `multilingual-e5-small` (384 dim), cosine similarity în Node. Suport bun pe limba română.
- **Trending** — algoritm Reddit-like (engagement + recență) pentru `weekly best`.
- **Similar notes** — pe pagina unei notițe, recomandări pe baza embeddings-ului ei.

### AI
- **Quiz generator** — 5 întrebări grilă cu explicații, max 3/oră/user (rate limit).
- **Chat per notiță** — conversație persistată în DB (model își amintește la redeschidere), max 5/oră/user.
- **Flashcards generator** — extrage automat 8–15 perechi întrebare/răspuns, intră în deck-ul user-ului cu algoritmul SM-2.
- **Moderare rapoarte** — AI evaluează plauzibilitatea unui raport (VALID / INVALID / UNCERTAIN) cu explicație, înainte să ajungă la admin. Notițele cu verdict VALID sunt ascunse automat.

### Profesori verificați
Trei căi de verificare:
1. **Auto** — email cu domeniu școlar (.edu / .edu.ro / .ac.uk / .gov.ro).
2. **Cod invitație** — head admin generează coduri unice (cu limite + expirare), profesorii le folosesc în Setări.
3. **Document** — userul depune cerere cu upload de diplomă/legitimație; head admin aprobă manual.

Capacități profesor: badge ✓ vizibil lângă nume, marcare notițe ca CORRECT / INCORRECT cu comentariu, editare orice notiță pentru corecturi. Nu pot șterge.

### Comunitate
- Rating 1–5 stele (denormalizat pe Note pentru sortare rapidă).
- Comentarii cu **threading** (un nivel de replies).
- Reputație pe utilizatori, leaderboard top 10 contributori.
- Profil public cu bio, statistici notițe.
- Cereri de notițe — useri cer materiale lipsă, alții le împlinesc.

### Moderare & justiție
- Sistem de raportări cu verdict AI preliminar.
- **Warning / Suspendare / Ban** — admin poate emite avertismente, suspendări timed sau ban-uri permanente.
- **Apeluri de ban** — utilizatorul banat poate depune un apel; head admin decide.
- **Apeluri de notiță** — autorul unei notițe programate pentru ștergere poate cere revizuire.
- **Apeluri publice** — anonimizate, vizibile public pentru transparență.
- **Audit log** — toate acțiunile admin sunt persistate.

### Drafts & UX
- **Auto-save draft** notițe în `localStorage` cu restaurare la refresh.
- **Istoric** de notițe vizitate (client-side, localStorage).
- **Dark / light mode** persistat per cont, cu fundal animat (stele + soare rotitor).
- **Verificare dispozitiv prin email** la login dintr-un browser nou (configurabil din admin).

---

## Stack tehnic

### Backend
- **Node.js + Express** — server REST API.
- **Prisma ORM** + **PostgreSQL** — schemă cu 20+ modele, relații complexe (notițe ↔ tags ↔ users ↔ ratings ↔ comments ↔ reports etc.).
- **Zod** — validare schema pentru request bodies.
- **JWT** — autentificare stateless.
- **bcrypt** — hashing parole (salt rounds = 10).
- **helmet** — headere de securitate.
- **sanitize-html** + sanitizer TipTap custom — XSS prevention.
- **multer** — upload fișiere cu validare tip/mărime.
- **@xenova/transformers** — model `multilingual-e5-small` rulează local (nu trimite la API extern).
- **Groq API** — LLM pentru quiz, chat, flashcards, moderare (Llama 3.3 70B).
- **mammoth / pdf-parse / xlsx** — extragere text din documente.
- **nodemailer** — emailuri verificare (Brevo/Gmail SMTP).

### Frontend
- **React 19 + Vite** — build rapid, HMR instant.
- **React Router 7** — routing client-side.
- **TipTap 3** — editor rich-text + KaTeX pentru formule matematice.
- **Axios** — HTTP client cu interceptor pentru JWT.
- Stiluri inline + CSS variabile per temă (dark / light).

---

## Arhitectură

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (frontend)                          │
│  React + Vite • Routing • TipTap editor • localStorage (drafts)      │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ Axios + JWT Bearer
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         EXPRESS (backend)                            │
│  helmet → cors → json → routes → controllers → services → Prisma     │
│                                                                      │
│  Middleware: requireAuth · requireAdmin · requireHeadAdmin           │
│              requireNotBanned · rate-limit (AI) · upload (multer)    │
│                                                                      │
│  Background:                                                         │
│   • Embedding generator (E5 local)  ← async la create/update note    │
│   • Document text extractor          ← async la upload fișier         │
│   • AI auto-moderation               ← async la create note          │
│   • Banned-account sweeper           ← oră, șterge conturi expirate  │
│   • Note-deletion sweeper            ← oră, șterge notițe programate │
└──┬────────────────────┬────────────────────────┬─────────────────────┘
   │                    │                        │
   ▼                    ▼                        ▼
┌─────────┐      ┌──────────────┐         ┌──────────────────┐
│  Postgres│      │ /uploads     │         │  Groq API        │
│ (Prisma) │      │ (filesystem) │         │ (quiz/chat/mod.) │
└─────────┘      └──────────────┘         └──────────────────┘
```

### Schema bază de date (selecție)

20+ modele Prisma, relațiile cheie:

- **User** (1) ⟶ (N) **Note** (autor), **Comment**, **Rating**, **Report**, **SavedNote**, **Flashcard**, **ChatMessage**.
- **User** (M) ⟷ (N) **Note** via **NoteValidation** (profesori validează notițe).
- **Note** (M) ⟷ (N) **Tag** via **NoteTag** (oficiale + free-form).
- **TeacherInviteCode** (1) ⟶ (N) **TeacherInviteCodeRedemption** (1) ⟶ (1) **User**.
- **User** (1) ⟶ (N) **BanAppeal**, **NoteAppeal**, **BanRecord** (istoric permanent).
- **AuditLog** — orice acțiune admin (target + actor + action + details).
- **DeviceLogin** — fingerprint dispozitiv pentru verificare la login.

Vezi [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) pentru schema completă.

---

## Setup local

### 1. Cerințe
- Node.js 20+
- PostgreSQL 15+
- (Opțional) un cont [Groq](https://console.groq.com/) pentru funcțiile AI

### 2. Instalează dependențele

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Variabile de mediu

Creează `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/notite_platform"
JWT_SECRET="un_string_random_lung_si_unic"
CHATBOT_API_KEY="gsk_..."        # Groq (quiz + chat + flashcards)
MODERATION_API_KEY="gsk_..."     # Groq (moderare rapoarte)
FRONTEND_URL="http://localhost:5173"  # pentru CORS + linkuri email
PORT=3000

# SMTP pentru emailuri verificare (opțional în dev — vezi `bypassEmailVerification` în admin)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."
```

### 4. Baza de date

```bash
cd backend
npx prisma migrate dev      # aplică toate migrațiile + generate client
npm run seed                # date demo (opțional)
npm run create:head-admin   # creează un cont HEAD_ADMIN interactiv
```

### 5. Pornește

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Prima pornire descarcă modelul `multilingual-e5-small` (~120 MB) în
`backend/.model-cache/`. Embeddings se generează asincron, nu blochează API-ul.

### 6. Teste

```bash
cd backend && npm test
```

---

## Structura proiectului

```
notite-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 20+ modele
│   │   ├── migrations/          # 23 migrații
│   │   ├── seed.js              # date demo
│   │   └── create_head_admin.js # script CLI
│   ├── src/
│   │   ├── server.js            # entry point, middleware chain
│   │   ├── controllers/         # subțire — citește req, cheamă service
│   │   ├── services/            # business logic
│   │   ├── routes/              # mounted sub /api
│   │   ├── middleware/          # auth, admin, errorHandler, rateLimit, upload
│   │   ├── db/                  # Prisma client singleton
│   │   └── __tests__/           # Vitest
│   └── uploads/                 # fișiere atașate (servite static)
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # router + AuthProvider
    │   ├── pages/               # 20+ pagini
    │   ├── components/          # NoteCard, CommentsSection, Leaderboard, ...
    │   ├── hooks/               # useAuth, useRecentNotes, useFlipAnimation
    │   ├── context/             # AuthContext (user, darkMode, sidebar state)
    │   ├── api/                 # axios client cu interceptor JWT
    │   └── data/                # SUBJECTS_BY_GRADE, chapter map
    └── index.html
```

---

## Decizii arhitecturale

### De ce embeddings stocate ca JSON și nu pgvector?
Embeddings sunt arrays de 384 floats. Le stochez ca `Json?` în Prisma (Postgres jsonb) și fac cosine similarity în Node. **Trade-off:** la 1000+ notițe interogarea devine O(N) și încetinește. Pentru scale-up real, migrarea la pgvector e un drop-in upgrade (Prisma 5.10+ are suport experimental). Acceptabil pentru un proiect școlar / hackathon; documentat ca next-step.

### De ce model E5 local și nu OpenAI/Cohere embeddings?
- Cost = 0 după descărcarea inițială.
- Fără dependență de quota / rate-limits.
- Suport bun pentru română (`multilingual-e5-small`).
- Privacy: conținutul notițelor nu părăsește serverul nostru.
- Trade-off: prima generare e ~500ms (în background); modelul ocupă ~120MB.

### De ce denormalizare pe Note (avgRating, ratingCount, viewCount)?
Listingul home page sortează după rating / popularitate. AVG/COUNT pe Rating la fiecare request = lent peste N rânduri. Update într-o tranzacție când se votează: O(1) la citire, complexitate +1 la scriere.

### De ce auto-moderation AI înainte de coada de rapoarte?
Reduce munca adminilor cu ~70% (rapoartele evident-spam sunt clasificate INVALID; cele evident-valide ascund notița imediat). Admin-ul vede doar UNCERTAIN și cele cu impact.

### De ce ban-uri cu „grace period" + apel?
Bannate au 14 zile (configurabil) ca să depună apel. Dacă apel deschis → ștergerea automată e suspendată. Evită cazuri în care un admin nou banează greșit și utilizatorul își pierde definitiv datele.

### De ce TeacherInviteCode separat?
Cod = un canal offline (admin trimite cod prin email/chat oficial). Permite verificare în masă fără ca fiecare profesor să trimită cerere cu document. Audit-able prin redemption table.

---

## Securitate

Implementate:
- **helmet** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` etc.
- **bcrypt** parole, JWT cu expirare, secret în env.
- **Zod** validation pe body-urile API.
- **Sanitizer TipTap** custom — verifică node types, marks, atribute, validează URL-uri pe image/youtube/link. Forțează `rel="noopener noreferrer"` pe linkuri externe.
- **sanitize-html** pe comentarii (scoate tot HTML-ul).
- **Rate limiting** pe endpoint-urile AI (3 quizuri/oră, 5 chats/oră, 2 flashcards/oră per user).
- **Multer** — whitelist mime-types, limită 20MB.
- **Device verification** pentru login din browsere noi (admins: configurabil).
- **Email verification** la registru (configurabil prin admin).
- **CORS** restrictiv la `FRONTEND_URL` (în prod).
- **Prisma parametrizat** — niciun raw SQL → fără SQL injection.
- **Audit log** persistent pentru toate acțiunile admin.

### Atenții de securitate (de evaluat înainte de prod)
- Tokenul JWT e în Authorization header — imun la CSRF, dar vulnerabil la XSS dacă atacatorul rulează JS în context-ul nostru. Sanitizarea TipTap + reactDOM (escape default) mitigă, dar `localStorage` nu e ideal pentru tokeni. Refresh tokens + httpOnly cookies = upgrade-ul next.
- `/uploads/*` e public — orice atașament e accesibil dacă cunoști URL-ul. Acceptabil pentru notițe școlare; pentru documentele de verificare profesori (sensibile!) ar trebui acces-controlled.

---

## Conturi demo

După `npm run seed`:

| Email | Parolă | Rol |
|---|---|---|
| admin@notite.ro | admin123 | ADMIN |
| alice@notite.ro | parola123 | USER |
| bob@notite.ro   | parola123 | USER |
| cara@notite.ro  | parola123 | USER |

Pentru un cont HEAD_ADMIN (acces complet inclusiv sistem + profesori):
```bash
cd backend && npm run create:head-admin
```

---

## Comenzi utile

```bash
# Backend
npm run dev               # hot-reload via nodemon
npm test                  # rulează testele Vitest
npm run seed              # populează DB cu demo
npm run prisma:studio     # UI vizual pentru DB
npm run prisma:migrate    # aplică/creează migrații
npm run create:head-admin # cont HEAD_ADMIN

# Frontend
npm run dev               # Vite dev server
npm run build             # build producție în dist/
npm run lint              # ESLint
```
