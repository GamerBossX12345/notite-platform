import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateEmbedding, noteToText } from '../src/services/embedding.service.js';

const prisma = new PrismaClient();

const HASH = await bcrypt.hash('parola123', 10);
const ADMIN_HASH = await bcrypt.hash('admin123', 10);

async function main() {
  console.log('Seeding...');

  // ── Admin (nu head admin) ───────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@notite.ro' },
    update: { username: 'admin1', name: 'Administrator', role: 'ADMIN' },
    create: {
      email: 'admin@notite.ro',
      username: 'admin1',
      passwordHash: ADMIN_HASH,
      name: 'Administrator',
      role: 'ADMIN',
      reputation: 999,
    },
  });

  // ── Utilizatori obișnuiți ──────────────────────────────────────────────────
  const userSeeds = [
    { email: 'alice@notite.ro',    username: 'alice',    name: 'Alice Ionescu',     school: 'Colegiul Național "Emil Racoviță"', grade: 11, bio: 'Pasionată de fizică și matematică.',          reputation: 215 },
    { email: 'bob@notite.ro',      username: 'bob',      name: 'Bob Popescu',       school: 'Liceul Teoretic "Mihai Eminescu"',  grade: 12, bio: 'Viitor informatician.',                       reputation: 180 },
    { email: 'cara@notite.ro',     username: 'cara',     name: 'Cara Dumitrescu',   school: 'Colegiul "Cantemir Vodă"',          grade: 10, bio: 'Iubesc literatura și istoria.',               reputation: 142 },
    { email: 'dan@notite.ro',      username: 'dan',      name: 'Dan Marin',         school: 'Colegiul "Sfântul Sava"',           grade: 12, bio: 'Olimpic la informatică.',                     reputation: 320 },
    { email: 'elena@notite.ro',    username: 'elena',    name: 'Elena Vasilescu',   school: 'Colegiul Național "Gheorghe Lazăr"', grade: 11, bio: 'Pregătire BAC la chimie și biologie.',       reputation: 198 },
    { email: 'florin@notite.ro',   username: 'florin',   name: 'Florin Tudor',      school: 'Liceul Teoretic "Tudor Vianu"',     grade: 9,  bio: 'Începător, dar entuziast.',                   reputation: 65 },
    { email: 'gabi@notite.ro',     username: 'gabi',     name: 'Gabriela Stoica',   school: 'Colegiul "Spiru Haret"',            grade: 10, bio: 'Geografie și engleză.',                       reputation: 110 },
    { email: 'horia@notite.ro',    username: 'horia',    name: 'Horia Mihai',       school: 'Liceul Teoretic "Grigore Moisil"',  grade: 11, bio: 'Mate-info, focus pe algoritmi.',             reputation: 245 },
    { email: 'ioana@notite.ro',    username: 'ioana',    name: 'Ioana Pop',         school: 'Colegiul Național "Andrei Șaguna"', grade: 12, bio: 'Filo-istorie. Pregătire admitere.',           reputation: 175 },
    { email: 'jana@notite.ro',     username: 'jana',     name: 'Jana Ardelean',     school: 'Liceul "Costache Negruzzi"',        grade: 9,  bio: 'Începutul liceului — învăț să iau notițe!',  reputation: 40 },
    { email: 'kris@notite.ro',     username: 'kris',     name: 'Kristian Dobre',    school: 'Liceul "Decebal"',                  grade: 11, bio: 'Engleză și franceză.',                        reputation: 95 },
    { email: 'liana@notite.ro',    username: 'liana',    name: 'Liana Crișan',      school: 'Colegiul Național "Octav Onicescu"',grade: 12, bio: 'Bac la bio-chimie.',                          reputation: 158 },
    { email: 'mihai@notite.ro',    username: 'mihai',    name: 'Mihai Stănescu',    school: 'Colegiul "Mihai Viteazul"',         grade: 12, bio: 'Olimpic la mate. Pasionat de teoria numerelor.', reputation: 285 },
    { email: 'nadia@notite.ro',    username: 'nadia',    name: 'Nadia Cristea',     school: 'Liceul "Ion Neculce"',              grade: 11, bio: 'Olimpiada de filosofie.',                     reputation: 132 },
    { email: 'octav@notite.ro',    username: 'octav',    name: 'Octavian Rusu',     school: 'Colegiul Național "Sava"',          grade: 10, bio: 'Mă pregătesc pentru OII.',                    reputation: 167 },
    { email: 'paula@notite.ro',    username: 'paula',    name: 'Paula Munteanu',    school: 'Liceul "Mircea cel Bătrân"',        grade: 11, bio: 'Bio-chimie pentru medicină.',                 reputation: 205 },
    { email: 'radu@notite.ro',     username: 'radu',     name: 'Radu Constantin',   school: 'Colegiul "Nicolae Bălcescu"',       grade: 9,  bio: 'Tocmai am intrat în liceu!',                  reputation: 22 },
    // utilizatori fără notițe încă — doar își fac cont
    { email: 'sara@notite.ro',     username: 'sara',     name: 'Sara Iliescu',      school: 'Liceul "Ion Luca Caragiale"',       grade: 11, bio: 'Caut notițe bune la română.',                 reputation: 8 },
    { email: 'tudor@notite.ro',    username: 'tudor',    name: 'Tudor Antonescu',   school: 'Colegiul "Carol I"',                grade: 12, bio: 'Recapitulare pentru BAC.',                    reputation: 15 },
    { email: 'vio@notite.ro',      username: 'vio',      name: 'Violeta Albu',      school: 'Liceul "Alexandru Ioan Cuza"',      grade: 10, bio: 'Începătoare în platformă.',                  reputation: 4 },
    { email: 'zara@notite.ro',     username: 'zara',     name: 'Zara Petrescu',     school: 'Colegiul "George Coșbuc"',          grade: 9,  bio: '',                                            reputation: 0 },
  ];

  const users = {};
  for (const u of userSeeds) {
    users[u.username] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: HASH },
    });
  }

  // ── Helpers conținut TipTap ───────────────────────────────────────────────
  const doc = (...paragraphs) => ({
    type: 'doc',
    content: paragraphs.map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  });

  const withHeadings = (...sections) => ({
    type: 'doc',
    content: sections.flatMap(([heading, ...paras]) => [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
      ...paras.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
    ]),
  });

  // ── Notițe ────────────────────────────────────────────────────────────────
  const notes = [
    // alice — fizică/biologie/chimie
    {
      title: 'Legile lui Newton', subject: 'Fizică', gradeLevel: 9, type: 'REZUMAT', chapter: 'Mecanică',
      authorId: users.alice.id, avgRating: 4.5, ratingCount: 12, viewCount: 287,
      content: withHeadings(
        ['Prima lege — Legea inerției', 'Un corp rămâne în repaus sau în mișcare rectilinie uniformă atunci când suma forțelor care acționează asupra lui este zero.'],
        ['A doua lege — Legea fundamentală', 'Accelerația este direct proporțională cu forța rezultantă: F = m·a.'],
        ['A treia lege — Acțiunea și reacțiunea', 'Oricărei acțiuni îi corespunde o reacțiune egală în modul și de sens contrar.'],
      ),
    },
    {
      title: 'Fotosinteza — sinteză completă', subject: 'Biologie', gradeLevel: 10, type: 'REZUMAT', chapter: 'Metabolismul plantelor',
      authorId: users.alice.id, avgRating: 4.0, ratingCount: 8, viewCount: 212,
      content: withHeadings(
        ['Ce este fotosinteza?', 'Procesul prin care plantele convertesc energia luminoasă în energie chimică.'],
        ['Ecuația globală', '6 CO₂ + 6 H₂O + lumină → C₆H₁₂O₆ + 6 O₂'],
        ['Faza luminoasă', 'În tilacoide. Produce ATP + NADPH.'],
        ['Ciclul Calvin', 'În stroma cloroplastului. Fixează CO₂.'],
      ),
    },
    {
      title: 'Tabla periodică — grupe și perioade', subject: 'Chimie', gradeLevel: 9, type: 'FISA', chapter: 'Structura atomului',
      authorId: users.alice.id, avgRating: 4.2, ratingCount: 5, viewCount: 178,
      content: withHeadings(
        ['Structura tabelului', '7 perioade și 18 grupe. Elementele sunt ordonate după Z.'],
        ['Grupe importante', 'Grupa 1 (alcaline): Li, Na, K. Grupa 17 (halogeni): F, Cl, Br. Grupa 18 (gaze nobile): He, Ne, Ar.'],
        ['Proprietăți periodice', 'Raza atomică scade pe perioadă. Electronegativitatea crește spre dreapta.'],
      ),
    },
    {
      title: 'Curentul electric și legea lui Ohm', subject: 'Fizică', gradeLevel: 10, type: 'REZUMAT', chapter: 'Electrostatică și curent electric',
      authorId: users.alice.id, avgRating: 4.3, ratingCount: 7, viewCount: 195,
      content: withHeadings(
        ['Curentul electric', 'I = ΔQ/Δt [A = C/s].'],
        ['Legea lui Ohm', 'U = R·I.'],
        ['Circuite', 'Serie: Rₜ = R₁ + R₂. Paralel: 1/Rₜ = 1/R₁ + 1/R₂.'],
      ),
    },

    // bob — informatică/matematică
    {
      title: 'Funcții de gradul I și II', subject: 'Matematică', gradeLevel: 9, type: 'FISA', chapter: 'Funcții',
      authorId: users.bob.id, avgRating: 4.8, ratingCount: 11, viewCount: 303,
      content: withHeadings(
        ['Funcția de gradul I', 'f(x) = ax + b. Grafic: dreaptă. Zerou: x₀ = -b/a.'],
        ['Funcția de gradul II', 'f(x) = ax² + bx + c. Vârful V(-b/2a, -Δ/4a).'],
        ['Discriminantul', 'Δ = b² - 4ac. Δ > 0: 2 rădăcini. Δ = 0: una dublă. Δ < 0: complexe.'],
      ),
    },
    {
      title: 'Algoritmi de sortare — comparație', subject: 'Informatică', gradeLevel: 11, type: 'FISA', chapter: 'Algoritmi și structuri de date',
      authorId: users.bob.id, avgRating: 4.9, ratingCount: 14, viewCount: 441,
      content: withHeadings(
        ['Bubble Sort', 'O(n²). Simplu, ineficient. Stabil.'],
        ['Merge Sort', 'O(n log n). Divide et impera. Stabil.'],
        ['Quick Sort', 'O(n log n) avg. În practică cel mai rapid. Nestabil.'],
        ['Insertion Sort', 'O(n²) worst, O(n) best. Eficient pe seturi aproape sortate.'],
      ),
    },
    {
      title: 'Exerciții — ecuații și inecuații', subject: 'Matematică', gradeLevel: 10, type: 'EXERCITII', chapter: 'Ecuații',
      authorId: users.bob.id, avgRating: 4.6, ratingCount: 9, viewCount: 226,
      content: doc(
        'Ex. 1: 2x² - 5x + 3 = 0 → x₁ = 3/2, x₂ = 1.',
        'Ex. 2: x² - 4 > 0 → x ∈ (-∞, -2) ∪ (2, +∞).',
        'Ex. 3: |2x - 1| ≤ 3 → x ∈ [-1, 2].',
      ),
    },
    {
      title: 'Formule trigonometrie — bac', subject: 'Matematică', gradeLevel: 12, type: 'FORMULE', chapter: 'Trigonometrie',
      authorId: users.bob.id, avgRating: 5.0, ratingCount: 18, viewCount: 612,
      content: doc(
        'sin²x + cos²x = 1',
        'sin(a±b) = sin a·cos b ± cos a·sin b',
        'cos(a±b) = cos a·cos b ∓ sin a·sin b',
        'sin 2a = 2·sin a·cos a',
      ),
    },

    // cara — română/istorie
    {
      title: 'Revoluția Franceză — cauze și consecințe', subject: 'Istorie', gradeLevel: 11, type: 'REZUMAT', chapter: 'Epoca modernă',
      authorId: users.cara.id, avgRating: 3.7, ratingCount: 6, viewCount: 124,
      content: withHeadings(
        ['Cauze', 'Criza financiară, inegalitățile sociale, influența iluminismului.'],
        ['Evenimente cheie', '1789: Bastilia (14 iulie). 1791: Constituția. 1793–1794: Teroarea.'],
        ['Consecințe', 'Abolirea privilegiilor, Declarația Drepturilor Omului, Napoleon.'],
      ),
    },
    {
      title: 'Romantismul în literatura română', subject: 'Română', gradeLevel: 10, type: 'REZUMAT', chapter: 'Curente literare',
      authorId: users.cara.id, avgRating: 3.5, ratingCount: 5, viewCount: 98,
      content: withHeadings(
        ['Caracteristici', 'Sentimente, imaginație, individualitate.'],
        ['Reprezentanți', 'Mihai Eminescu, Vasile Alecsandri, Grigore Alexandrescu.'],
        ['Teme la Eminescu', 'Natura, iubirea, nostalgia, meditația.'],
        ['Opere', '"Luceafărul", "Floare albastră", "Scrisoarea I".'],
      ),
    },
    {
      title: 'Comentariu literar — Luceafărul', subject: 'Română', gradeLevel: 11, type: 'REZUMAT', chapter: 'Eminescu',
      authorId: users.cara.id, avgRating: 4.1, ratingCount: 4, viewCount: 87,
      content: withHeadings(
        ['Tema', 'Geniul nefericit, drama omului superior care nu poate avea o iubire pământească.'],
        ['Structură', '4 tablouri: idila Cătălinei, călătoria spre Demiurg, Cătălin și Cătălina, refuzul lui Hyperion.'],
      ),
    },

    // dan — informatică (cei mai mulți)
    {
      title: 'Programare dinamică — knapsack 0/1', subject: 'Informatică', gradeLevel: 12, type: 'EXERCITII', chapter: 'PD',
      authorId: users.dan.id, avgRating: 4.95, ratingCount: 22, viewCount: 698,
      content: withHeadings(
        ['Definirea subproblemei', 'dp[i][w] = profit maxim folosind primele i obiecte și capacitate w.'],
        ['Recurența', 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-greutate[i]] + valoare[i])'],
        ['Complexitate', 'O(n·W).'],
      ),
    },
    {
      title: 'Grafuri — DFS și BFS', subject: 'Informatică', gradeLevel: 11, type: 'FISA', chapter: 'Grafuri',
      authorId: users.dan.id, avgRating: 4.85, ratingCount: 17, viewCount: 521,
      content: withHeadings(
        ['DFS', 'Stivă (recursiv sau iterativ). Bun pentru componente, ciclu, sortare topologică.'],
        ['BFS', 'Coadă. Distanța minimă în număr de muchii.'],
        ['Complexitate', 'O(V + E).'],
      ),
    },
    {
      title: 'Backtracking — generare combinări', subject: 'Informatică', gradeLevel: 11, type: 'EXERCITII', chapter: 'Backtracking',
      authorId: users.dan.id, avgRating: 4.7, ratingCount: 13, viewCount: 384,
      content: doc(
        'void back(int k) { if (k == n+1) afiseaza(); else for (int i = ...) { sol[k] = i; back(k+1); } }',
        'Pentru combinări: pornește de la sol[k-1]+1.',
        'Pentru permutări: marcaj used[i].',
      ),
    },
    {
      title: 'Structuri de date — heap și priority queue', subject: 'Informatică', gradeLevel: 12, type: 'FISA', chapter: 'Structuri de date',
      authorId: users.dan.id, avgRating: 4.8, ratingCount: 10, viewCount: 312,
      content: withHeadings(
        ['Heap binar', 'Arbore complet. Părinte ≤ copii (min-heap).'],
        ['Operații', 'push: O(log n). pop: O(log n). top: O(1).'],
        ['Aplicații', 'Dijkstra, top-K, mediană streaming.'],
      ),
    },

    // elena — chimie/biologie
    {
      title: 'Genetica mendeliană — legile lui Mendel', subject: 'Biologie', gradeLevel: 11, type: 'REZUMAT', chapter: 'Genetică',
      authorId: users.elena.id, avgRating: 4.4, ratingCount: 9, viewCount: 234,
      content: withHeadings(
        ['Legea I', 'Uniformitatea hibrizilor F1.'],
        ['Legea II', 'Segregarea: 3:1 fenotipic, 1:2:1 genotipic.'],
        ['Legea III', 'Asortarea independentă: 9:3:3:1 în dihibridare.'],
      ),
    },
    {
      title: 'Reacții acid-bază — pH și pOH', subject: 'Chimie', gradeLevel: 11, type: 'FISA', chapter: 'Echilibru chimic',
      authorId: users.elena.id, avgRating: 4.3, ratingCount: 7, viewCount: 168,
      content: withHeadings(
        ['Definiții', 'Acid: cedează H⁺. Bază: acceptă H⁺ (Brønsted-Lowry).'],
        ['pH', 'pH = -log[H⁺]. Apa: [H⁺] = 10⁻⁷ → pH = 7.'],
        ['Relația', 'pH + pOH = 14 (la 25°C).'],
      ),
    },
    {
      title: 'Sistemul circulator', subject: 'Biologie', gradeLevel: 10, type: 'REZUMAT', chapter: 'Anatomie',
      authorId: users.elena.id, avgRating: 4.0, ratingCount: 6, viewCount: 142,
      content: withHeadings(
        ['Inima', 'Mușchi cu 4 camere: 2 atrii + 2 ventricule.'],
        ['Circulația mare', 'Ventricul stâng → aortă → corp → vene cave → atriu drept.'],
        ['Circulația mică', 'Ventricul drept → artere pulmonare → plămâni → vene pulmonare → atriu stâng.'],
      ),
    },

    // florin — începător, fizică
    {
      title: 'Mișcarea rectilinie uniformă', subject: 'Fizică', gradeLevel: 9, type: 'REZUMAT', chapter: 'Mecanică',
      authorId: users.florin.id, avgRating: 3.8, ratingCount: 4, viewCount: 78,
      content: doc(
        'v = constant.',
        's = v · t.',
        'Graficul s(t) este o dreaptă, graficul v(t) este orizontal.',
      ),
    },
    {
      title: 'Vectori în plan', subject: 'Matematică', gradeLevel: 9, type: 'FISA', chapter: 'Geometrie',
      authorId: users.florin.id, avgRating: 3.6, ratingCount: 3, viewCount: 56,
      content: withHeadings(
        ['Definiție', 'Mărime cu modul, direcție și sens.'],
        ['Operații', 'Adunare (regula paralelogramului), înmulțire cu scalar.'],
      ),
    },

    // gabi — geografie/engleză
    {
      title: 'Relieful României', subject: 'Geografie', gradeLevel: 10, type: 'REZUMAT', chapter: 'Geografia României',
      authorId: users.gabi.id, avgRating: 4.1, ratingCount: 5, viewCount: 119,
      content: withHeadings(
        ['Carpații', 'Carpații Orientali, Meridionali (cei mai înalți), Occidentali.'],
        ['Subcarpați și dealuri', 'Subcarpații Moldovei, Curburii, Getici. Podișurile: Transilvaniei, Moldovei, Dobrogei.'],
        ['Câmpii', 'Câmpia Română, Câmpia de Vest. Delta Dunării.'],
      ),
    },
    {
      title: 'Tenses — Present Perfect vs Past Simple', subject: 'Engleză', gradeLevel: 10, type: 'FISA', chapter: 'Grammar',
      authorId: users.gabi.id, avgRating: 4.5, ratingCount: 8, viewCount: 198,
      content: withHeadings(
        ['Past Simple', 'Acțiune terminată, moment specific. "I went to Paris last year."'],
        ['Present Perfect', 'Acțiune cu legătură cu prezentul. "I have been to Paris."'],
        ['Cuvinte-cheie', 'PS: yesterday, ago, last. PP: ever, never, just, already, yet, since, for.'],
      ),
    },

    // horia — algoritmi avansați
    {
      title: 'DP pe stări — interval, bitmask', subject: 'Informatică', gradeLevel: 12, type: 'FISA', chapter: 'PD avansată',
      authorId: users.horia.id, avgRating: 4.9, ratingCount: 11, viewCount: 326,
      content: withHeadings(
        ['DP interval', 'dp[i][j] = soluția pentru subintervalul [i, j]. Iterezi după lungime.'],
        ['DP bitmask', 'Stare = submulțime (mask). 2^n stări. Ex: TSP în O(n²·2ⁿ).'],
      ),
    },
    {
      title: 'Arbori — LCA, Euler tour', subject: 'Informatică', gradeLevel: 12, type: 'FISA', chapter: 'Arbori',
      authorId: users.horia.id, avgRating: 4.6, ratingCount: 7, viewCount: 201,
      content: withHeadings(
        ['LCA prin sparse table', 'Preprocesare O(n log n), interogare O(1).'],
        ['Euler tour', 'Linearizezi arborele pentru subtree queries cu BIT/segment tree.'],
      ),
    },

    // ioana — istorie/română
    {
      title: 'Primul Război Mondial — sinteză', subject: 'Istorie', gradeLevel: 12, type: 'REZUMAT', chapter: 'Sec. XX',
      authorId: users.ioana.id, avgRating: 4.2, ratingCount: 6, viewCount: 145,
      content: withHeadings(
        ['Cauze', 'Criza balcanică, alianțele opuse, asasinatul de la Sarajevo (28 iunie 1914).'],
        ['Etape', '1914-1918. Frontul de Vest, frontul de Est. Intrarea SUA (1917).'],
        ['Tratate', 'Versailles (1919), Trianon (1920) — completarea României Mari.'],
      ),
    },
    {
      title: 'Marin Preda — Moromeții', subject: 'Română', gradeLevel: 12, type: 'REZUMAT', chapter: 'Roman postbelic',
      authorId: users.ioana.id, avgRating: 4.3, ratingCount: 5, viewCount: 132,
      content: withHeadings(
        ['Tema', 'Destrămarea familiei țărănești, criza satului interbelic.'],
        ['Personajul Ilie Moromete', 'Țăran filosof, conservator, atașat de pământ.'],
      ),
    },

    // jana — începător
    {
      title: 'Operații cu fracții', subject: 'Matematică', gradeLevel: 9, type: 'EXERCITII', chapter: 'Algebră',
      authorId: users.jana.id, avgRating: 3.9, ratingCount: 3, viewCount: 67,
      content: doc(
        'Adunare/scădere: aduci la același numitor.',
        'Înmulțire: a/b · c/d = ac/bd.',
        'Împărțire: înmulțești cu inversul.',
      ),
    },

    // kris — limbi străine
    {
      title: 'French verbs — passé composé vs imparfait', subject: 'Franceză', gradeLevel: 11, type: 'FISA', chapter: 'Conjugaison',
      authorId: users.kris.id, avgRating: 4.2, ratingCount: 5, viewCount: 108,
      content: withHeadings(
        ['Passé composé', 'Acțiune punctuală încheiată: "J\'ai mangé."'],
        ['Imparfait', 'Acțiune continuă/repetată în trecut: "Je mangeais."'],
      ),
    },

    // liana — chimie/biologie BAC
    {
      title: 'Hidrocarburi — alcani, alchene, alchine', subject: 'Chimie', gradeLevel: 11, type: 'REZUMAT', chapter: 'Chimie organică',
      authorId: users.liana.id, avgRating: 4.4, ratingCount: 8, viewCount: 187,
      content: withHeadings(
        ['Alcani', 'Saturate. Formula CₙH₂ₙ₊₂. Reacții de substituție.'],
        ['Alchene', 'O legătură dublă. CₙH₂ₙ. Reacții de adiție.'],
        ['Alchine', 'O legătură triplă. CₙH₂ₙ₋₂. Foarte reactive.'],
      ),
    },
    {
      title: 'Compuși organici cu oxigen — alcooli', subject: 'Chimie', gradeLevel: 11, type: 'REZUMAT', chapter: 'Chimie organică',
      authorId: users.liana.id, avgRating: 4.1, ratingCount: 6, viewCount: 132,
      content: withHeadings(
        ['Alcooli', 'Grupa funcțională -OH. Etanol: CH₃-CH₂-OH.'],
        ['Reacții', 'Oxidare la aldehidă/cetonă, esterificare.'],
      ),
    },
    {
      title: 'Sinteza proteinelor', subject: 'Biologie', gradeLevel: 12, type: 'REZUMAT', chapter: 'Genetică moleculară',
      authorId: users.liana.id, avgRating: 4.6, ratingCount: 9, viewCount: 218,
      content: withHeadings(
        ['Transcripția', 'ADN → ARNm. Are loc în nucleu, catalizată de ARN-polimerază.'],
        ['Translația', 'ARNm → proteină. La ribozomi. ARNt aduce aminoacizi.'],
        ['Codul genetic', '64 codoni → 20 aminoacizi. Degenerat, universal.'],
      ),
    },

    // dan — încă două notițe foarte populare
    {
      title: 'Algoritmi pe șiruri — KMP, Z-function', subject: 'Informatică', gradeLevel: 12, type: 'FISA', chapter: 'String matching',
      authorId: users.dan.id, avgRating: 4.9, ratingCount: 19, viewCount: 587,
      content: withHeadings(
        ['KMP', 'Caută model într-un text în O(n+m). Preprocesare prefix function.'],
        ['Z-function', 'z[i] = lungimea celui mai lung prefix comun cu sufixul de la i. O(n).'],
        ['Aplicații', 'Căutare exactă, periodă minimă, palindromuri.'],
      ),
    },
    {
      title: 'Algoritmi geometrici — convex hull', subject: 'Informatică', gradeLevel: 12, type: 'FISA', chapter: 'Geometrie computațională',
      authorId: users.dan.id, avgRating: 4.85, ratingCount: 15, viewCount: 412,
      content: withHeadings(
        ['Graham scan', 'Sortezi după unghi polar, apoi stivă. O(n log n).'],
        ['Andrew\'s monotone chain', 'Sortare după x, două sweep-uri. Implementare mai curată.'],
        ['Aplicații', 'Diameter, smallest enclosing rectangle.'],
      ),
    },
    {
      title: 'Tehnici de implementare — binary lifting', subject: 'Informatică', gradeLevel: 12, type: 'FORMULE', chapter: 'Tehnici avansate',
      authorId: users.dan.id, avgRating: 4.7, ratingCount: 12, viewCount: 298,
      content: doc(
        'up[i][v] = strămoșul lui v la distanța 2^i.',
        'up[0][v] = parinte[v]. up[i][v] = up[i-1][up[i-1][v]].',
        'k-th ancestor: descompui k în baza 2, sari progresiv.',
        'Aplicație: LCA în O(log n) per query.',
      ),
    },

    // alice — încă două notițe
    {
      title: 'Lentile și oglinzi — optică geometrică', subject: 'Fizică', gradeLevel: 10, type: 'FISA', chapter: 'Optică',
      authorId: users.alice.id, avgRating: 4.2, ratingCount: 6, viewCount: 156,
      content: withHeadings(
        ['Formula lentilelor', '1/f = 1/p + 1/p\'. f > 0 convergentă, f < 0 divergentă.'],
        ['Mărirea liniară', 'β = -p\'/p = y\'/y.'],
        ['Oglinzi', 'Concavă (f > 0), convexă (f < 0). Aceeași formulă, semn diferit.'],
      ),
    },
    {
      title: 'Echilibrul corpurilor — momentul forței', subject: 'Fizică', gradeLevel: 9, type: 'FISA', chapter: 'Mecanică',
      authorId: users.alice.id, avgRating: 4.0, ratingCount: 5, viewCount: 118,
      content: withHeadings(
        ['Momentul forței', 'M = F · d, unde d e brațul forței.'],
        ['Condiții de echilibru', 'ΣF = 0 și ΣM = 0.'],
        ['Pârghii', 'Gradul I: punct sprijin între F și R. Gradul II/III: variații.'],
      ),
    },

    // bob — încă două notițe
    {
      title: 'Programare orientată pe obiect — C++', subject: 'Informatică', gradeLevel: 11, type: 'REZUMAT', chapter: 'POO',
      authorId: users.bob.id, avgRating: 4.7, ratingCount: 10, viewCount: 264,
      content: withHeadings(
        ['Clase și obiecte', 'class Punct { int x, y; public: void afiseaza(); };'],
        ['Moștenire', 'class B : public A { ... }. Acces la membrii lui A.'],
        ['Polimorfism', 'virtual void f(); — permite override din clasele derivate.'],
      ),
    },
    {
      title: 'Combinări, permutări, aranjamente', subject: 'Matematică', gradeLevel: 10, type: 'FORMULE', chapter: 'Combinatorică',
      authorId: users.bob.id, avgRating: 4.5, ratingCount: 8, viewCount: 192,
      content: doc(
        'Permutări: P(n) = n!.',
        'Aranjamente: A(n, k) = n! / (n-k)!.',
        'Combinări: C(n, k) = n! / (k! · (n-k)!).',
        'Triunghiul lui Pascal: C(n, k) = C(n-1, k-1) + C(n-1, k).',
      ),
    },

    // elena — încă o notiță
    {
      title: 'Sistemul nervos — neuronul și sinapsa', subject: 'Biologie', gradeLevel: 11, type: 'REZUMAT', chapter: 'Anatomie și fiziologie',
      authorId: users.elena.id, avgRating: 4.4, ratingCount: 7, viewCount: 178,
      content: withHeadings(
        ['Neuronul', 'Dendrite (primesc), corp celular, axon (transmite). Mielinizat sau nu.'],
        ['Potențialul de acțiune', 'Depolarizare (Na⁺), repolarizare (K⁺). Tot-sau-nimic.'],
        ['Sinapsa', 'Transmitere prin neurotransmițători (acetilcolină, dopamină, serotonină).'],
      ),
    },

    // horia — încă o notiță avansată
    {
      title: 'Segment tree cu lazy propagation', subject: 'Informatică', gradeLevel: 12, type: 'FISA', chapter: 'Structuri avansate',
      authorId: users.horia.id, avgRating: 4.8, ratingCount: 9, viewCount: 256,
      content: withHeadings(
        ['Idee', 'Amâni actualizările pe interval până când chiar îți trebuie.'],
        ['lazy[node]', 'Reține o actualizare nepropagată. Push down când vizitezi copiii.'],
        ['Complexitate', 'O(log n) per update/query, chiar și pentru update pe interval.'],
      ),
    },

    // mihai — utilizator nou, mate
    {
      title: 'Numere prime — ciurul lui Eratostene', subject: 'Matematică', gradeLevel: 11, type: 'EXERCITII', chapter: 'Teoria numerelor',
      authorId: users.mihai.id, avgRating: 4.6, ratingCount: 8, viewCount: 184,
      content: withHeadings(
        ['Ciurul clasic', 'Bifezi multiplii fiecărui prim până la √N. Complexitate O(N log log N).'],
        ['Ciurul liniar', 'Fiecare compus marcat o singură dată — prin cel mai mic factor prim.'],
      ),
    },
    {
      title: 'Inducția matematică', subject: 'Matematică', gradeLevel: 10, type: 'FISA', chapter: 'Logică',
      authorId: users.mihai.id, avgRating: 4.3, ratingCount: 6, viewCount: 142,
      content: withHeadings(
        ['Pasul inițial', 'Demonstrezi P(1) (sau P(n₀)).'],
        ['Pasul inductiv', 'Presupui P(k) și demonstrezi P(k+1).'],
        ['Variante', 'Inducție tare, inducție pe două variabile, inducție „forte".'],
      ),
    },
    {
      title: 'Aritmetică modulară — congruențe', subject: 'Matematică', gradeLevel: 11, type: 'FORMULE', chapter: 'Teoria numerelor',
      authorId: users.mihai.id, avgRating: 4.7, ratingCount: 9, viewCount: 211,
      content: doc(
        'a ≡ b (mod n) ⟺ n | (a - b).',
        '(a + b) mod n = ((a mod n) + (b mod n)) mod n.',
        'Teorema mică a lui Fermat: a^(p-1) ≡ 1 (mod p), pentru p prim, gcd(a, p) = 1.',
        'Teorema lui Euler: a^φ(n) ≡ 1 (mod n).',
      ),
    },

    // nadia — filosofie/română
    {
      title: 'Imanuel Kant — imperativul categoric', subject: 'Filosofie', gradeLevel: 12, type: 'REZUMAT', chapter: 'Etică',
      authorId: users.nadia.id, avgRating: 4.2, ratingCount: 5, viewCount: 109,
      content: withHeadings(
        ['Ideea de bază', 'Acționează astfel încât maxima acțiunii tale să poată deveni lege universală.'],
        ['Formulări', '(1) Universalitate. (2) Umanitatea ca scop. (3) Autonomia voinței.'],
      ),
    },
    {
      title: 'Existențialismul — Sartre', subject: 'Filosofie', gradeLevel: 12, type: 'REZUMAT', chapter: 'Filosofia secolului XX',
      authorId: users.nadia.id, avgRating: 4.0, ratingCount: 4, viewCount: 91,
      content: withHeadings(
        ['Existența precede esența', 'Omul nu se naște cu o esență dată — el o construiește prin alegeri.'],
        ['Libertatea și responsabilitatea', '"Suntem condamnați să fim liberi."'],
      ),
    },

    // octav — informatică începător-mediu
    {
      title: 'Recursivitate — primii pași', subject: 'Informatică', gradeLevel: 10, type: 'EXERCITII', chapter: 'Bazele programării',
      authorId: users.octav.id, avgRating: 4.3, ratingCount: 7, viewCount: 165,
      content: withHeadings(
        ['Idee', 'O funcție care se cheamă pe sine, cu o condiție de oprire.'],
        ['Exemple', 'factorial(n), fibonacci(n), suma cifrelor.'],
        ['Atenție', 'Stack overflow dacă nu există cazul de bază!'],
      ),
    },
    {
      title: 'Vector și matrice în C++', subject: 'Informatică', gradeLevel: 10, type: 'FISA', chapter: 'Bazele programării',
      authorId: users.octav.id, avgRating: 4.1, ratingCount: 5, viewCount: 122,
      content: withHeadings(
        ['Vector', 'int v[100]; sau std::vector<int> v(n).'],
        ['Matrice', 'int a[100][100]; — parcurgere cu două for-uri.'],
        ['Algoritmi clasici', 'Maxim, minim, sortare prin selecție, căutare binară.'],
      ),
    },

    // paula — bio/chimie pentru medicină
    {
      title: 'Aparatul respirator — ventilația pulmonară', subject: 'Biologie', gradeLevel: 11, type: 'REZUMAT', chapter: 'Anatomie',
      authorId: users.paula.id, avgRating: 4.5, ratingCount: 8, viewCount: 197,
      content: withHeadings(
        ['Inspirația', 'Mușchii intercostali și diafragma se contractă → volum toracic crește → aer intră.'],
        ['Expirația', 'Pasivă în repaus. Mușchii se relaxează.'],
        ['Schimburile gazoase', 'La nivel alveolar prin difuziune. O₂ intră în sânge, CO₂ iese.'],
      ),
    },
    {
      title: 'Aminoacizi și proteine', subject: 'Chimie', gradeLevel: 12, type: 'REZUMAT', chapter: 'Biochimie',
      authorId: users.paula.id, avgRating: 4.4, ratingCount: 6, viewCount: 153,
      content: withHeadings(
        ['Structura aminoacizilor', '-NH₂, -COOH, atom central de C, lanț lateral R.'],
        ['Legătura peptidică', '-CO-NH-. Formare prin eliminare de apă.'],
        ['Structurile proteinelor', 'Primară, secundară (α-helix, β-strand), terțiară, cuaternară.'],
      ),
    },
    {
      title: 'Reproducerea umană', subject: 'Biologie', gradeLevel: 12, type: 'REZUMAT', chapter: 'Anatomie',
      authorId: users.paula.id, avgRating: 4.3, ratingCount: 5, viewCount: 134,
      content: withHeadings(
        ['Gametogeneza', 'Spermatogeneza la bărbat (în testicule), ovogeneza la femeie (în ovare).'],
        ['Ciclul menstrual', '~28 zile. Faza foliculară, ovulația, faza luteală.'],
      ),
    },

    // radu — începător, clasa a 9-a
    {
      title: 'Mulțimi de numere — N, Z, Q, R', subject: 'Matematică', gradeLevel: 9, type: 'REZUMAT', chapter: 'Algebră',
      authorId: users.radu.id, avgRating: 3.5, ratingCount: 3, viewCount: 48,
      content: withHeadings(
        ['Numere naturale (N)', '{0, 1, 2, 3, ...}.'],
        ['Numere întregi (Z)', 'Includ și negativele.'],
        ['Numere raționale (Q)', 'Fracții a/b cu b ≠ 0.'],
        ['Numere reale (R)', 'Include și iraționalele (√2, π, e).'],
      ),
    },
    {
      title: 'Verbe regulate vs. neregulate (engleză)', subject: 'Engleză', gradeLevel: 9, type: 'EXERCITII', chapter: 'Verbe',
      authorId: users.radu.id, avgRating: 3.8, ratingCount: 4, viewCount: 71,
      content: doc(
        'Regulate: -ed. walk → walked. play → played.',
        'Neregulate de bază: go → went → gone. see → saw → seen. take → took → taken.',
        'Modal verbs: can, could, must, should, may.',
      ),
    },

    // florin — încă una
    {
      title: 'Densitatea și presiunea', subject: 'Fizică', gradeLevel: 9, type: 'FISA', chapter: 'Fluidele',
      authorId: users.florin.id, avgRating: 3.9, ratingCount: 4, viewCount: 88,
      content: withHeadings(
        ['Densitatea', 'ρ = m/V. Unitate: kg/m³ sau g/cm³.'],
        ['Presiunea', 'p = F/S. Unitate: Pa = N/m².'],
        ['Presiunea hidrostatică', 'p = ρ·g·h.'],
      ),
    },

    // jana — încă una, pentru a nu fi pe ultimul loc
    {
      title: 'Geometrie plană — triunghiul', subject: 'Matematică', gradeLevel: 9, type: 'FISA', chapter: 'Geometrie',
      authorId: users.jana.id, avgRating: 3.7, ratingCount: 3, viewCount: 62,
      content: withHeadings(
        ['Tipuri', 'După laturi: echilateral, isoscel, oarecare. După unghi: ascuțit, dreptunghic, obtuz.'],
        ['Linii importante', 'Mediana, înălțimea, bisectoarea, mediatoarea.'],
        ['Teorema lui Pitagora', 'În triunghi dreptunghic: c₁² + c₂² = h².'],
      ),
    },

    // kris — încă o notiță
    {
      title: 'Concordanța timpurilor (sequence of tenses)', subject: 'Engleză', gradeLevel: 11, type: 'FISA', chapter: 'Gramatică avansată',
      authorId: users.kris.id, avgRating: 4.4, ratingCount: 6, viewCount: 143,
      content: withHeadings(
        ['Reported speech', 'present simple → past simple, present perfect → past perfect.'],
        ['Backshift', '"I work" → He said he worked.'],
        ['Excepții', 'Adevăruri generale rămân la present.'],
      ),
    },
  ];

  let created = 0;
  for (const noteData of notes) {
    const existing = await prisma.note.findFirst({
      where: { title: noteData.title, authorId: noteData.authorId },
    });
    if (!existing) {
      await prisma.note.create({ data: noteData });
      created++;
      process.stdout.write('.');
    } else {
      process.stdout.write('s');
    }
  }
  console.log(`\nCreated ${created} new notes (skipped ${notes.length - created} existing).`);

  // ── Comentarii eșantion ───────────────────────────────────────────────────
  const newton = await prisma.note.findFirst({ where: { title: 'Legile lui Newton' } });
  if (newton) {
    const exists = await prisma.comment.findFirst({ where: { noteId: newton.id, userId: users.bob.id } });
    if (!exists) {
      await prisma.comment.create({
        data: { noteId: newton.id, userId: users.bob.id, content: 'Super rezumat, m-a ajutat mult la teză!' },
      });
      await prisma.comment.create({
        data: { noteId: newton.id, userId: users.cara.id, content: 'Ai putea adăuga și exemple cu calcule?' },
      });
    }
  }

  // ── Backfill embeddings pentru notițele fără embedding ────────────────────
  // Necesar pentru ca /api/notes/search/semantic să returneze rezultate.
  console.log('\nGenerez embeddings (poate dura ~1 min la prima rulare, modelul se descarcă)...');
  const notesNeedingEmbedding = await prisma.note.findMany({
    where: { hidden: false, embedding: { equals: null } },
    select: { id: true, title: true, subject: true, chapter: true, content: true },
  });
  let embedded = 0;
  let failed = 0;
  for (const n of notesNeedingEmbedding) {
    try {
      const vec = await generateEmbedding(noteToText(n));
      await prisma.note.update({ where: { id: n.id }, data: { embedding: vec } });
      embedded++;
      process.stdout.write('.');
    } catch (err) {
      failed++;
      console.error(`\n  Embedding failed for ${n.title}: ${err.message}`);
    }
  }
  console.log(`\n  Embedded ${embedded} notițe (${failed} eșuate, ${notesNeedingEmbedding.length} total fără embedding).`);

  console.log('\nUtilizatori creați:');
  console.log('  admin@notite.ro  / admin123  (ADMIN, username: admin1)');
  for (const u of userSeeds) {
    console.log(`  ${u.email.padEnd(22)} / parola123`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
