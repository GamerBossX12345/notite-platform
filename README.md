# Notițe Platform

Platformă colaborativă de notițe școlare pentru elevi de gimnaziu și liceu din România.

## Stack
<<<<<<< Updated upstream
- Backend: Node.js, Express, Prisma, PostgreSQL, JWT
- Frontend: React (Vite), React Router, Axios
- AI (în pasul 11): Claude API pentru generator de quiz
=======
<<<<<<< HEAD
=======
- Backend: Node.js, Express, Prisma, PostgreSQL, JWT
- Frontend: React (Vite), React Router, Axios
- AI (în pasul 11): API pentru generator de quiz
<<<<<<< HEAD
>>>>>>> 5fac4b3bb1cebd7bb9ecc506d39c508252f0d42b
=======
>>>>>>> 5fac4b3bb1cebd7bb9ecc506d39c508252f0d42b
>>>>>>> Stashed changes

## Setup pas cu pas

### 1. PostgreSQL
Instalează PostgreSQL. La instalare, reține parola pentru user-ul `postgres`.

Creează baza de date:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Variabile de mediu

Creează `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/notite_platform"
JWT_SECRET="un_string_random_lung"
CHATBOT_API_KEY="gsk_..."      # Groq API key (quiz + AI chat)
MODERATION_API_KEY="gsk_..."   # Groq API key (moderare rapoarte)
PORT=3000
```

### 3. Baza de date

```bash
# Activează pgvector și adaugă coloana de embeddings (o singură dată)
psql $DATABASE_URL -f backend/prisma/add_embeddings.sql

# Sincronizează schema
cd backend && npx prisma db push

# Populează cu date demo (opțional)
npm run seed
```

### 4. Pornește

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Funcționalități

### Notițe
- Editor rich-text cu suport bold, italic, liste, tabele, formule LaTeX (KaTeX)
- Upload fișiere atașate: PDF, imagini, Word, PowerPoint
- Filtrare după materie, clasă, tip; sortare după dată / popularitate / rating
- Detectare automată de duplicate (MinHash + Jaccard similarity)

### Căutare
- **Clasică** — keyword search pe titlu și materie
- **Semantică** — embeddings locale cu `multilingual-e5-small` (română inclusă); afișează scor de potrivire procentual

### AI
- **Quiz automat** — generează întrebări grilă din conținutul notiței
- **Chat cu notița** — pune întrebări despre conținut
- **Moderare rapoarte** — verdict AI automat la raportările utilizatorilor

### Utilizatori & comunitate
- Înregistrare, login, profil public cu bio și statistici
- Rating stele (1–5) și comentarii cu threading
- Sistem de reputație și leaderboard top contributori
- Temă dark / light modă (persistată în cont)

### Admin
- Panou cu gestionare utilizatori, notițe, rapoarte
- Suspendare utilizatori (48h), editare / ștergere orice notiță

## Comenzi

```bash
# Backend
npm run dev             # hot-reload
npm run seed            # date demo în DB
npm run prisma:studio   # UI vizual pentru DB
npm run prisma:migrate  # aplică migrații

# Frontend
npm run dev             # Vite dev server
npm run build           # build producție
```

## Conturi demo (după `npm run seed`)

| Email | Parolă | Rol |
|---|---|---|
| admin@notite.ro | admin123 | ADMIN |
| alice@notite.ro | parola123 | USER |
| bob@notite.ro | parola123 | USER |
| cara@notite.ro | parola123 | USER |

## Căutare semantică — note

La primul start, modelul `multilingual-e5-small` (~120 MB) se descarcă automat în `backend/.model-cache/`. Embeddings se generează async la crearea/editarea fiecărei notițe și nu blochează răspunsul API.
