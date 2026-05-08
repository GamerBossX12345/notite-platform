# Platformă de schimb de notițe — InfoEducație

Schelet de start pentru lucrarea la secțiunea Aplicații Web.
**Scopul scheletului**: structura proiectului + cod minim funcțional pentru auth și un endpoint de notițe. De aici încolo construiești singur features-urile importante.

## Stack
- Backend: Node.js, Express, Prisma, PostgreSQL, JWT
- Frontend: React (Vite), React Router, Axios
- AI (în pasul 11): Claude API pentru generator de quiz

## Setup pas cu pas

### 1. PostgreSQL
Instalează PostgreSQL. La instalare, reține parola pentru user-ul `postgres`.

Creează baza de date:
```bash
# Pe Windows: deschide pgAdmin sau folosește SQL Shell (psql)
# Pe Linux/Mac:
psql -U postgres -c "CREATE DATABASE notite_platform;"
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# editează .env și pune parola ta de PostgreSQL în DATABASE_URL
# generează și un JWT_SECRET random (64+ caractere)

npm run prisma:migrate     # creează tabelele
npm run dev                # pornește serverul pe :3000
```

Verifică: deschide `http://localhost:3000/api/health` în browser.

### 3. Frontend
Într-un alt terminal:
```bash
cd frontend
npm install
npm run dev                # pornește pe :5173
```

### 4. Test rapid
- Deschide `http://localhost:5173`
- Click pe "Înregistrare" → creează cont
- Ar trebui să fii logat și să vezi pagina principală goală
- Cu Prisma Studio (`npm run prisma:studio` în backend) verifici că user-ul e în DB

## Ce e gata în skeleton ✓
- Structura proiectului, separare Routes/Controllers/Services
- Schema Prisma completă (User, Note, Rating, Comment, Report)
- Auth: register, login cu bcrypt + JWT
- Middleware: requireAuth, errorHandler
- Endpoint GET /api/notes (listare) și GET /api/notes/:id (detaliu)
- Frontend: routing, AuthContext, pagini Login/Register/Home/Note (basic)

## Ce trebuie să construiești tu (TODO-uri în cod)

### Backend
- [ ] Endpoint `GET /api/auth/me` (user-ul curent pe baza tokenului)
- [ ] Validare strictă în auth.service (regex email, complexitate parolă) — recomand `zod`
- [ ] Filtre + paginare + search în notes list
- [ ] Implementare update/delete notițe (cu verificare authorId)
- [ ] Upload de fișiere PDF/imagine cu `multer`
- [ ] Endpoint-uri pentru rating cu actualizare tranzacțională a avgRating/ratingCount
- [ ] Endpoint-uri pentru comments
- [ ] Endpoint-uri pentru report + dashboard de moderare
- [ ] **Detector de duplicate** — algoritmul shingling + MinHash (cere-mi explicația)
- [ ] **AI quiz generator** — endpoint care primește noteId și returnează 5 întrebări

### Frontend
- [ ] Pagina UploadPage cu formularul de creare notiță
- [ ] **Editor TipTap** integrat în UploadPage cu suport pentru formule (KaTeX)
- [ ] Render conținut TipTap în NotePage (acum e doar JSON dump)
- [ ] Componenta RatingStars
- [ ] Secțiunea de comentarii cu threading
- [ ] Filtre + search bar în HomePage
- [ ] Paginare
- [ ] Pagina de profil utilizator
- [ ] PrivateRoute pentru rute protejate (redirect la /login dacă nu e logat)
- [ ] Stilizare reală — mută inline styles într-un sistem coerent
- [ ] Componenta de quiz în NotePage (apelează AI endpoint)

### Polish pentru juriu
- [ ] Seed cu 30-50 de notițe reale ca platforma să nu fie goală la demo
- [ ] Completează README-ul oficial (cerut de regulament) — ce librării ai folosit, ce e al tău
- [ ] Documentație tehnică
- [ ] Testează în Chrome, Firefox (regulamentul cere "compatibilitate între browsere")

## Întrebări de pus când te blochezi
1. „Am scris controller-ul X, poți să-l review-ezi?"
2. „Cum implementez featur-ea Y? Care e abordarea?"
3. „Primesc eroarea Z, ce înseamnă?"
4. „Vreau să refactorizez asta, ce sugerezi?"

Succes!
