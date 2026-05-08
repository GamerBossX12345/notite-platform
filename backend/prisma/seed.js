import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const demoUsers = [
  {
    email: 'maria.ion@example.com',
    username: 'maria_ion',
    name: 'Maria Ion',
    school: 'Colegiul "Mihai Viteazu"',
    grade: 12,
    bio: 'Pasionată de matematică și știință. Iubesc să stud și să ajut colegii.',
  },
  {
    email: 'alex.petrescu@example.com',
    username: 'alex_petrescu',
    name: 'Alexandru Petrescu',
    school: 'Liceul "Nicolae Bălcescu"',
    grade: 11,
    bio: 'Informatician în devenire. Interesat de programare și algoritmi.',
  },
  {
    email: 'elena.stefan@example.com',
    username: 'elena_stefan',
    name: 'Elena Ștefan',
    school: 'Colegiul Național "Gheorghe Lazăr"',
    grade: 10,
    bio: 'Iubesc chimia și biologia. Expert în rezumate și fișe!',
  },
  {
    email: 'andrei.grigore@example.com',
    username: 'andrei_grigore',
    name: 'Andrei Grigore',
    school: 'Liceul "Matei Voievod"',
    grade: 9,
    bio: 'Istoric pasionat. Colecționez hărți conceptuale și timeline-uri.',
  },
  {
    email: 'sofia.radulescu@example.com',
    username: 'sofia_radulescu',
    name: 'Sofia Rădulescu',
    school: 'Colegiul Tehnic "Constantin Brâncuși"',
    grade: 12,
    bio: 'Fizician, matematician, și om de știință în general.',
  },
];

const notesData = [
  // Matematică - Rezumate
  {
    title: 'Funcții - Definire și Proprietăți',
    subject: 'Matematică',
    gradeLevel: 9,
    chapter: 'Funcții',
    type: 'REZUMAT',
    content: `## Funcții: Definiție și Proprietăți

### Definiție
O funcție f: A → B este o corespondenţă care asociază fiecărui element x ∈ A un unic element y ∈ B.

### Terminologie
- **Domeniu**: Mulţimea A
- **Codomeniu**: Mulţimea B
- **Imagine**: Submulţimea lui B formată din valorile funcţiei

### Proprietăți Importante
1. **Funcție injectivă**: f(x₁) = f(x₂) ⟹ x₁ = x₂
2. **Funcție surjectivă**: Pentru orice y ∈ B, ∃ x ∈ A, f(x) = y
3. **Funcție bijectivă**: Atât injectivă cât și surjectivă

### Exemple
- f: ℝ → ℝ, f(x) = 2x + 1 (liniară, bijectivă)
- f: ℝ → ℝ, f(x) = x² (nu e injectivă pe ℝ)`,
  },
  {
    title: 'Ecuații de Gradul II - Formule și Soluții',
    subject: 'Matematică',
    gradeLevel: 10,
    chapter: 'Polinoame',
    type: 'REZUMAT',
    content: `## Ecuații de Gradul II

### Forma Generală
ax² + bx + c = 0, a ≠ 0

### Discriminantul
Δ = b² - 4ac

### Cazuri:
1. Δ > 0: Două soluții reale distincte
   - x₁,₂ = (-b ± √Δ) / 2a
2. Δ = 0: O soluție reală dublă
   - x = -b / 2a
3. Δ < 0: Nicio soluție reală

### Relații între Rădăcini
- Suma: x₁ + x₂ = -b/a
- Produs: x₁ · x₂ = c/a`,
  },
  {
    title: 'Limitele și Continuitate',
    subject: 'Matematică',
    gradeLevel: 11,
    chapter: 'Analiză',
    type: 'REZUMAT',
    content: `## Limite și Continuitate

### Definiția Limitei
lim(x→a) f(x) = L dacă pentru orice ε > 0, ∃ δ > 0 a.î. 0 < |x - a| < δ ⟹ |f(x) - L| < ε

### Limite Remarcabile
1. lim(x→0) sin(x)/x = 1
2. lim(x→∞) (1 + 1/x)^x = e
3. lim(x→∞) ln(x)/x = 0

### Continuitate
O funcție f este continuă în punctul a dacă:
- f(a) este definit
- lim(x→a) f(x) = f(a)`,
  },
  {
    title: 'Integrale - Calcul și Aplicații',
    subject: 'Matematică',
    gradeLevel: 12,
    chapter: 'Calcul integral',
    type: 'REZUMAT',
    content: `## Integrale Definite și Nedefinite

### Integrala Nedefinită
∫ f(x)dx = F(x) + C, unde F'(x) = f(x)

### Integrale Elementare
- ∫ x^n dx = x^(n+1)/(n+1) + C (n ≠ -1)
- ∫ e^x dx = e^x + C
- ∫ 1/x dx = ln|x| + C

### Integrala Definită (Formula Leibniz-Newton)
∫[a,b] f(x)dx = F(b) - F(a)

### Proprietăți
1. Linearitate: ∫(f + g) = ∫f + ∫g
2. Inversare limite: ∫[a,b] = -∫[b,a]`,
  },

  // Fizică - Fișe
  {
    title: 'Fișă: Mișcare Rectilinie Uniformă',
    subject: 'Fizică',
    gradeLevel: 9,
    chapter: 'Mecanică',
    type: 'FISA',
    content: `# Mișcare Rectilinie Uniformă (MRU)

| Element | Formula | Unitate |
|---------|---------|---------|
| Viteză | v = Δx/Δt | m/s |
| Deplasare | x = x₀ + vt | m |
| Viteză medie | v̄ = Σxi/Σti | m/s |

## Caracteristici
- Traiectorie dreaptă
- Viteză constantă
- Accelerație = 0

## Exemple din realitate
- Mașină pe autostradă la viteză constantă
- Avion în croazieră`,
  },
  {
    title: 'Fișă: Forța și Accelerația',
    subject: 'Fizică',
    gradeLevel: 10,
    chapter: 'Dinamică',
    type: 'FISA',
    content: `# Forța și Accelerația

## Legile lui Newton
**Legea I**: O stare de mișcare se menține în absența forțelor
**Legea II**: F = ma (Forța = masă × accelerație)
**Legea III**: Acțiune - Reacțiune

## Forțe Frecvente
| Forță | Formula | Direcție |
|-------|---------|----------|
| Greutate | G = mg | Verticală jos |
| Normală | N | Perpendiculară pe suprafață |
| Frecare | f = μN | Opusă mișcării |
| Tensiune | T | De-a lungul cablului |

## Unități
- Forță: Newton (N) = kg·m/s²
- Accelerație: m/s²`,
  },
  {
    title: 'Fișă: Lucru și Energie',
    subject: 'Fizică',
    gradeLevel: 11,
    chapter: 'Mecanică',
    type: 'FISA',
    content: `# Lucru și Energie

## Definiții
- **Lucrul mecanic**: L = F·d·cos(θ)
- **Putere**: P = L/t = W [Watt]
- **Energie cinetică**: Ec = ½mv²

## Teorema Muncii-Energiei
L = ΔEc = Ec_final - Ec_initial

## Energie Potențială
- Gravitațională: Ep = mgh
- Elastică: Ep = ½kx²

## Conservarea Energiei
Em_total = Ec + Ep = constant (în absența fricțiunii)`,
  },

  // Chimie - Exerciții
  {
    title: 'Exerciții: Mole și Reacții Chimice',
    subject: 'Chimie',
    gradeLevel: 10,
    chapter: 'Stoechiometrie',
    type: 'EXERCITII',
    content: `# Exerciții de Stoechiometrie

## Problema 1
Se dau: 24g de carbon
Cerințe: Calculează numărul de moli și atomi

**Soluție:**
- M(C) = 12 g/mol
- n = m/M = 24/12 = 2 moli
- N = n·Na = 2 × 6.022×10²³ = 1.2044×10²⁴ atomi

## Problema 2
Reacția: 2H₂ + O₂ → 2H₂O
Date: 10g H₂
Cerințe: Masa de apă formată?

**Soluție:**
- n(H₂) = 10/2 = 5 moli
- Din raport stoechiometric: n(H₂O) = 5 moli
- m(H₂O) = 5 × 18 = 90g`,
  },
  {
    title: 'Exerciții: Titrări și Concentrații',
    subject: 'Chimie',
    gradeLevel: 11,
    chapter: 'Soluții',
    type: 'EXERCITII',
    content: `# Exerciții: Titrări Acido-Bazice

## Concentrații
- Molară: c(mol/L) = n/V
- Procentuală: w% = (msubstanță/msoluție)×100
- Normalitate: N = c × z

## Problema 1
Se diluează 100mL soluție 2M la 500mL
Concentrația finală?

**Rezolvare:**
- n = c×V = 2×0.1 = 0.2 mol
- c' = 0.2/0.5 = 0.4 M

## Problema 2
Titru: HCl 0.1M vs NaOH
Volum HCl folosit: 25mL
Volum NaOH: ?

**Rezolvare:**
- c₁V₁ = c₂V₂
- 0.1 × 25 = 0.1 × V₂
- V₂ = 25 mL`,
  },

  // Biologie - Hărți Conceptuale
  {
    title: 'Hartă Conceptuală: Fotosinteză',
    subject: 'Biologie',
    gradeLevel: 9,
    chapter: 'Procese biologice',
    type: 'HARTA_CONCEPTUALA',
    content: `# Fotosinteză

## Definiție
Proces prin care plantele transformă lumina solară în energie chimică

## Etape
### Reacția Luminoasă (în tilacoid)
- Absorbție lumină
- Spargere apă (H₂O)
- Producție ATP și NADPH

### Reacția Întunericului (Ciclul Calvin, în stroma)
- Fixare CO₂
- Formare glicozei
- Folosire ATP și NADPH

## Ecuație Globală
6CO₂ + 6H₂O + lumină → C₆H₁₂O₆ + 6O₂

## Factori care influențează
- Intensitate luminoasă
- Concentrație CO₂
- Temperatură
- Concentrație clorofilă`,
  },
  {
    title: 'Hartă Conceptuală: Respirație Celulară',
    subject: 'Biologie',
    gradeLevel: 10,
    chapter: 'Metabolismul',
    type: 'HARTA_CONCEPTUALA',
    content: `# Respirație Celulară

## Componentă: Glicoliză (Citoplasma)
- 1 Glucoză → 2 Piruvat
- Producție: 2 ATP + 2 NADH

## Componentă: Ciclu Krebs (Mitocondrie)
- 2 Acetil-CoA → CO₂
- Producție: 2 ATP + 8 NADH + 2 FADH₂

## Componentă: Lanț Transport Electroni
- Oxidare NADH și FADH₂
- Producție: ~32 ATP

## Total ATP
- Aerobi: ~36-38 ATP/glucoză
- Anaerob: 2 ATP/glucoză

## Scop
Producție energie (ATP) din substanțe organice`,
  },

  // Informatică - Rezumate
  {
    title: 'Rezumat: Structuri de Date - Array și Linked List',
    subject: 'Informatică',
    gradeLevel: 11,
    chapter: 'Structuri de date',
    type: 'REZUMAT',
    content: `# Structuri de Date Fundamentale

## Array
- Colecție de elemente de același tip
- Acces O(1) prin index
- Memorie: continuă
- Inserare/Ștergere: O(n)
- Ideal pentru acces rapid

## Linked List
- Nod = date + referință la următoarele
- Acces O(n)
- Memorie: dispersă
- Inserare/Ștergere: O(1) dacă știm poziția
- Ideal pentru modificări frecvente

## Stack (LIFO)
- Last In First Out
- Operații: push(), pop(), peek()
- Aplicații: parsare, undo/redo

## Queue (FIFO)
- First In First Out
- Operații: enqueue(), dequeue()
- Aplicații: scheduling, print queue`,
  },
  {
    title: 'Rezumat: Algoritmi de Sortare',
    subject: 'Informatică',
    gradeLevel: 12,
    chapter: 'Algoritmi',
    type: 'REZUMAT',
    content: `# Algoritmi de Sortare - Comparație

| Algoritm | Timp Mediu | Timp Cel Rău | Spațiu | Stabil |
|----------|-----------|-------------|--------|--------|
| Bubble Sort | O(n²) | O(n²) | O(1) | Da |
| Quick Sort | O(n log n) | O(n²) | O(log n) | Nu |
| Merge Sort | O(n log n) | O(n log n) | O(n) | Da |
| Heap Sort | O(n log n) | O(n log n) | O(1) | Nu |
| Insertion | O(n²) | O(n²) | O(1) | Da |

## Quick Sort
- Divide and Conquer
- Pivot strategie importantă
- Media: O(n log n)

## Merge Sort
- Always O(n log n)
- Nevoie de spațiu extra
- Ideal pentru linked lists`,
  },

  // Istorie - Rezumate
  {
    title: 'Rezumat: Evul Mediu - Caracteristici și Perioade',
    subject: 'Istorie',
    gradeLevel: 9,
    chapter: 'Evul Mediu',
    type: 'REZUMAT',
    content: `# Evul Mediu (500-1500 d.Hr.)

## Perioade
### Evul Mediu Timpuriu (500-1000)
- Căderea Imperiului Roman
- Migrațiile barbare
- Regatul Francilor

### Evul Mediu Central (1000-1300)
- Formarea statelor europene
- Sistemul feudal
- Crucinade

### Evul Mediu Târziu (1300-1500)
- Renașterea italiană
- Descoperiri geografice
- Reforma în biserică

## Caracteristici
- Societate feudală cu 3 stări
- Putere bisericii
- Arta și arhitectura: Gothic
- Economie agrară`,
  },
  {
    title: 'Rezumat: Renașterea - Umanism și Știință',
    subject: 'Istorie',
    gradeLevel: 10,
    chapter: 'Epoca Modernă',
    type: 'REZUMAT',
    content: `# Renașterea (sec. XIV-XVI)

## Origini
- Italiană, se răspândește în Europa
- Revenirea la valori greco-romane
- Umanism

## Caracteristici
### Cultură și Știință
- Gutenberg și tiparatura (1450)
- Heliocentrism: Copernic, Galilei
- Anatomie: Vesalius

### Arte
- Picturi monumentale
- Sculpturi: Michelangelo
- Arhitectură: Brunelleschi

## Oameni Importanți
- Leonardo da Vinci
- Michelangelo
- Raphael
- Shakespeare`,
  },

  // Geografie - Exerciții
  {
    title: 'Exerciții: Climatul și Bioclimuri',
    subject: 'Geografie',
    gradeLevel: 10,
    chapter: 'Climatologie',
    type: 'EXERCITII',
    content: `# Exerciții de Geografie Climatică

## Clima Ecuatorială
- T mediu: 20-25°C
- Precipitații: >2000mm/an
- Vegetație: Pădure tropicală deasă

## Clima Tropicală
- Uscată și umedă
- Anotimpuri secetă și ploaie
- Savane și păduri tropicale

## Clima Temperată
- Patru anotimpuri
- România: clima temperat-continentală
- T: -2°C (iarnă) la 21°C (vară)
- Precipitații: 600-800mm

## Clima Polară
- T: sub 0°C
- Tundră și gheață
- Vânt puternic`,
  },
  {
    title: 'Exerciții: Formele de Relief',
    subject: 'Geografie',
    gradeLevel: 9,
    chapter: 'Geomorfologie',
    type: 'EXERCITII',
    content: `# Formele de Relief - Identificare și Clasificare

## Munți
- Altitudine > 1000m
- Relief accidentat
- România: Carpați, Apuseni

## Dealuri
- Altitudine 300-1000m
- Versanți mai puțin abrupți

## Câmpii
- Altitudine < 300m
- Relief plat
- România: Câmpia Panonică, Dunării

## Structura Dealurilor
- Versant (de ridicare/de cădere)
- Bază, vârf
- Vale

## Factori de Eroziune
- Apă (fluvii)
- Vânt
- Temperatură
- Activitate biologică`,
  },

  // Română - Fișe și Rezumate
  {
    title: 'Fișă: Figuri de Stil',
    subject: 'Română',
    gradeLevel: 9,
    chapter: 'Stilistică',
    type: 'FISA',
    content: `# Figuri de Stil în Literatura Română

## Comparația
- Formă: asemănare între doi termeni
- Marker: "ca", "asemenea", "parcă"
- Ex: "Ochi albastri ca cerul"

## Metafora
- Comparație fără marker
- Identificare doi termeni
- Ex: "Plouă gânduri asupra mea"

## Personificarea
- Atribuire calități umane lucrurilor insuflate
- Ex: "Pădurea șoapte taine"

## Aliteraţie
- Repetare sunete
- Ex: "Silvii sunt sus și știu ce stiu"

## Onomatopeea
- Imitare sunete
- Ex: "Tic-tac", "Cioc-cioc"

## Antiteza
- Contrast între idei
- Ex: "Ați fii șocat de cât de mic sunt de fapt mare"`,
  },
  {
    title: 'Rezumat: Eminescu - Viață și Opere Principale',
    subject: 'Română',
    gradeLevel: 10,
    chapter: 'Literatura',
    type: 'REZUMAT',
    content: `# Mihai Eminescu (1850-1889)

## Biografie
- Născut în Botoșani
- Copilărie în Cișmigiu
- Studii la București și Paris
- Redactor-șef la Timpul
- Boală psihică de la 35 de ani

## Opere Principale
### Poezii
- "Luceafărul" (1884)
- "Mică Fierăstră"
- "Floare Albastră"

### Proza
- "Sarmisegetuza"
- "Lăcrămioară"

## Teme Constante
- Iubire nemuritor
- Suferință și melancolie
- Natură și istorie românească
- Religie și filozofie

## Stil
- Romantism târziu
- Versuri sonore și muzicale
- Imagini poetice bogate`,
  },
  {
    title: 'Rezumat: Nuvela - Caractere Structurale',
    subject: 'Română',
    gradeLevel: 11,
    chapter: 'Literatura',
    type: 'REZUMAT',
    content: `# Nuvela - Genul Literar

## Caracteristici
- Text narrativ de dimensiuni mici-mijlocii
- O singură acțiune
- Număr redus de personaje
- Finală cu efect puternic

## Diferențe de Povestire
| Element | Nuvela | Roman | Scurtă Poveste |
|---------|--------|-------|---|
| Volum | 20-40 pag | >100 pag | <10 pag |
| Acțiune | 1 | Multiplă | 1 |
| Personaje | 2-4 principale | Mulți | 1-2 |
| Timp | Scurt | Lung | Zilnic |

## Tipuri de Nuvelistă
- **Psihologică**: Analiză sufletească
- **Realistă**: Viață cotidiană
- **Fantastică**: Element supernatural

## Eminescu și Creangă - Maestri ai nuvelei`,
  },

  // Mai multe note pentru diversitate
  {
    title: 'Frații Jderi - Rezumat',
    subject: 'Română',
    gradeLevel: 12,
    chapter: 'Literatura',
    type: 'REZUMAT',
    content: `# Frații Jderi - Creangă

## Conținut
Nuvela povestea trei frați care-și vând copacii preț de o mâncare.

## Tema
- Risipă și risipitori
- Familia
- Consecințe risipei

## Personaje
- Frații Jderi: risipitori
- Tatăl (încă în viață)
- Familia care cumpără

## Stil
- Limba populară
- Umor și sarcasm
- Lucrul etic al risipei`,
  },
  {
    title: 'Plouă - Exerciții de Interpretare',
    subject: 'Română',
    gradeLevel: 11,
    chapter: 'Analiză Textelor',
    type: 'EXERCITII',
    content: `# Exerciții: "Plouă" de Eminescu

## Semnificații Ploii
1. Literal: Căderea apei din nori
2. Figurat: Suferință, tăcere, melancolie

## Imagini Poetice
- "Plouă peste codri"
- "Plouă ca-n săptămânile"
- "Sunet de picături"

## Întrebări
1. Ce sentimente evocă ploaia?
2. Cum se reflectă natura în starea emoțională?
3. Care figuri de stil găsești?

## Răspunsuri
1. Tăcere, melancolie, izolare
2. Paralelă între natural și emoțional
3. Personificarea, aliterație`,
  },

  // Fizică - Exerciții
  {
    title: 'Exerciții: Optica - Refracție și Reflexie',
    subject: 'Fizică',
    gradeLevel: 11,
    chapter: 'Optica',
    type: 'EXERCITII',
    content: `# Exerciții de Optica

## Legea Reflexiei
θᵢ = θᵣ (unghiul de incident = unghiul de reflexie)

## Legea Refracției (Snell)
n₁ sin(θ₁) = n₂ sin(θ₂)

### Problema 1
Lumina trece din aer (n₁=1) în apă (n₂=1.33)
Unghi incident: 45°
Unghi refracție: ?

Rezolvare:
1 × sin(45°) = 1.33 × sin(θ₂)
sin(θ₂) = 0.707/1.33 = 0.531
θ₂ = 32.1°

## Unghi Critic
Cand sin(θc) = n₂/n₁ (pentru n₂ < n₁)`,
  },
  {
    title: 'Rezumat: Electricitate - Curent și Circuit',
    subject: 'Fizică',
    gradeLevel: 9,
    chapter: 'Electricitate',
    type: 'REZUMAT',
    content: `# Electricitate de Bază

## Sarcina Electrică
- Unitate: Coulomb (C)
- Cuantă minimă: e = 1.6×10⁻¹⁹ C

## Curent Electric
- I = Q/t (Amperi)
- Direcție: de la + la -

## Tensiune
- U = W/Q (Volți)
- Diferența de potențial

## Rezistență
- R = ρl/A (Ohmi)
- Legea Ohm: U = IR

## Circuit Electric
- Serie: R_total = R₁ + R₂
- Paralel: 1/R_total = 1/R₁ + 1/R₂`,
  },

  // Chimie - Rezumate
  {
    title: 'Rezumat: Structura Atomului',
    subject: 'Chimie',
    gradeLevel: 9,
    chapter: 'Chimie Generală',
    type: 'REZUMAT',
    content: `# Structura Atomului

## Componente
1. **Nucleu** (densiitate mare)
   - Protoni (pozitivi)
   - Neutroni (neutri)

2. **Înveliș Electronic**
   - Electroni (negativi)
   - În orbitali

## Modele Atomice
- Dalton: Sferă indivizibilă
- Thomson: "Pudding cu stafide"
- Rutherford: Nucleu + orbite
- Bohr: Niveluri de energie discrete
- Orbital: Probabilitate densitate

## Notație
- ᴬX: A = număr de masă, Z = nr atomic
- ¹⁶O: 8 protoni, 8 neutroni

## Regula Aufbau
Orbitali se umplu în ordinea creșterii energiei`,
  },
  {
    title: 'Hartă Conceptuală: Legile Gazelor',
    subject: 'Chimie',
    gradeLevel: 10,
    chapter: 'Stări de Agregare',
    type: 'HARTA_CONCEPTUALA',
    content: `# Legile Gazelor

## Legea Boyle (T constant)
P₁V₁ = P₂V₂
Presiune ↑ → Volum ↓

## Legea Charles (P constant)
V/T = const
Temperatură ↑ → Volum ↑

## Legea Gay-Lussac (V constant)
P/T = const
Temperatură ↑ → Presiune ↑

## Legea Gazelor Ideale
PV = nRT
- P: Presiune (Pa)
- V: Volum (m³)
- n: Moli
- R: 8.314 J/(mol·K)
- T: Temperatură (K)

## Condiții Standard
STP: 0°C (273K), 1 atm (101325 Pa)
Volum molar: 22.4 L/mol`,
  },

  // Matematică - Exerciții
  {
    title: 'Exerciții: Geometrie în Spațiu',
    subject: 'Matematică',
    gradeLevel: 11,
    chapter: 'Geometrie',
    type: 'EXERCITII',
    content: `# Exerciții: Corpuri Geometrice

## Piramida Regulată
V = (1/3) × A_bază × h
A_laterală = (1/2) × P_bază × a (a = apotemă)

### Problema 1
Piramidă patrulatera regulată: latura bază=4cm, h=3cm
Volum = ?
- A_bază = 4² = 16 cm²
- V = (1/3) × 16 × 3 = 16 cm³

## Cilindru
V = πr²h
A_laterală = 2πrh

## Con
V = (1/3)πr²h
A_laterală = πrl (l = generatoare)

## Sferă
V = (4/3)πr³
A = 4πr²`,
  },
  {
    title: 'Exerciții: Trigonometrie Avansată',
    subject: 'Matematică',
    gradeLevel: 12,
    chapter: 'Trigonometrie',
    type: 'EXERCITII',
    content: `# Exerciții: Ecuații Trigonometrice

## Formule Fundamentale
- sin²x + cos²x = 1
- tan x = sin x / cos x
- sin(a±b) = sin a cos b ± cos a sin b
- cos(a±b) = cos a cos b ∓ sin a sin b

## Ecuații Simple
sin x = a ⟹ x = arcsin(a) + 2kπ sau π - arcsin(a) + 2kπ

### Problema
sin(2x) = √2/2
- 2x = π/4 + 2kπ ⟹ x = π/8 + kπ
- 2x = 3π/4 + 2kπ ⟹ x = 3π/8 + kπ

## Substituție
Folosind t = tan(x/2) pentru ecuații complexe`,
  },

  // Biologie - Exerciții
  {
    title: 'Exerciții: Genetica Mendeliană',
    subject: 'Biologie',
    gradeLevel: 11,
    chapter: 'Genetică',
    type: 'EXERCITII',
    content: `# Exerciții: Moștenire Genetică

## Monohibrizi
Bb × Bb:
- Genotip F₁: 1 BB : 2 Bb : 1 bb
- Fenotip (B dominant): 3 B_ : 1 bb

## Dihibrizi
AaBb × AaBb:
- Raport fenotipic: 9:3:3:1

### Problema
Păr brunette (B - dominant) × păr blond (bb)
Descendenți toți brunettes (Bb)
Bb × Bb → 1/4 blonzi

## Legile lui Mendel
1. Segregare: Alele se separă
2. Asortare independentă
3. Dominanță

## Arbori Genealogici
Utilizare pentru a urmări boale ereditare`,
  },

  // Informatică - Exerciții
  {
    title: 'Exerciții: Programare în Python',
    subject: 'Informatică',
    gradeLevel: 10,
    chapter: 'Programare',
    type: 'EXERCITII',
    content: `# Exerciții Python - Nivel Mediu

## Problema 1: List Comprehension
Genereaza pătratele numerelor de la 1 la 10

\`\`\`python
squares = [x**2 for x in range(1, 11)]
# Rezultat: [1, 4, 9, 16, ...]
\`\`\`

## Problema 2: Funcții
Scrieți funcție care calculează fibonacci

\`\`\`python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
\`\`\`

## Problema 3: Dicționare
Inversează cheie-valoare

\`\`\`python
d = {'a': 1, 'b': 2}
d_inv = {v: k for k, v in d.items()}
\`\`\``,
  },
  {
    title: 'Hartă Conceptuală: Obiecte și Clase',
    subject: 'Informatică',
    gradeLevel: 11,
    chapter: 'Programare OOP',
    type: 'HARTA_CONCEPTUALA',
    content: `# Programare Orientată pe Obiecte

## Concepte Fundamentale
- **Clasă**: Template pentru obiecte
- **Obiect**: Instanță a unei clase
- **Atribut**: Date ale obiectului
- **Metodă**: Funcție a clasei

## Pilarii OOP
1. **Încapsulare**: Ascunderea implementării
2. **Moștenire**: Clase copil din clase părinte
3. **Polimorfism**: Aceeași interfață, diferite implementări
4. **Abstracție**: Ascunderea complexității

## Exemple
\`\`\`
Clasă: Animal
  ├─ Atribute: nume, vârstă
  ├─ Metode: mănâncă(), doarme()
  └─ Subclase: Câine, Pisică
\`\`\`

## Avantaje
- Cod reusabil
- Organizare mai bună
- Flexibilitate`,
  },
];

async function main() {
  try {
    console.log('🌱 Seeding database...\n');

    // Create demo users
    console.log('👥 Creating demo users...');
    const users = [];
    for (const userData of demoUsers) {
      const hashedPassword = await bcrypt.hash('DemoPass123!', 10);
      const user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: hashedPassword,
        },
      });
      users.push(user);
      console.log(`   ✓ ${user.name} (@${user.username})`);
    }

    console.log(`\n📝 Creating ${notesData.length} notes...\n`);

    // Create notes with diverse authors
    const notesCreated = [];
    for (let i = 0; i < notesData.length; i++) {
      const noteData = notesData[i];
      const authorIndex = i % users.length; // Rotate authors
      
      const note = await prisma.note.create({
        data: {
          ...noteData,
          authorId: users[authorIndex].id,
        },
      });
      
      notesCreated.push(note);
      
      // Add random ratings to ~70% of notes
      if (Math.random() < 0.7) {
        const ratingCount = Math.floor(Math.random() * 5) + 1; // 1-5 ratings per note
        let totalRating = 0;

        for (let j = 0; j < ratingCount; j++) {
          const raterIndex = (authorIndex + j + 1) % users.length;
          const ratingValue = Math.floor(Math.random() * 3) + 3; // 3-5 stars (realistic)
          
          await prisma.rating.create({
            data: {
              userId: users[raterIndex].id,
              noteId: note.id,
              value: ratingValue,
            },
          });
          
          totalRating += ratingValue;
        }

        // Update denormalized avgRating
        const avgRating = totalRating / ratingCount;
        await prisma.note.update({
          where: { id: note.id },
          data: {
            avgRating: Math.round(avgRating * 100) / 100,
            ratingCount,
          },
        });
      }
      
      console.log(
        `   ✓ "${note.title}" (${note.subject}, class ${note.gradeLevel}, ${note.type})`
      );
    }

    console.log('\n📊 Seed Summary:');
    console.log(`   ✓ ${users.length} demo users created`);
    console.log(`   ✓ ${notesCreated.length} notes created`);
    
    // Count by subject
    const bySubject = {};
    notesCreated.forEach(note => {
      bySubject[note.subject] = (bySubject[note.subject] || 0) + 1;
    });
    
    console.log('\n📚 Notes by Subject:');
    Object.entries(bySubject).forEach(([subject, count]) => {
      console.log(`   • ${subject}: ${count} notes`);
    });

    // Count by type
    const byType = {};
    notesCreated.forEach(note => {
      byType[note.type] = (byType[note.type] || 0) + 1;
    });
    
    console.log('\n📋 Notes by Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} notes`);
    });

    // Count by grade level
    const byGrade = {};
    notesCreated.forEach(note => {
      byGrade[note.gradeLevel] = (byGrade[note.gradeLevel] || 0) + 1;
    });
    
    console.log('\n🎓 Notes by Grade:');
    Object.entries(byGrade).sort().forEach(([grade, count]) => {
      console.log(`   • Grade ${grade}: ${count} notes`);
    });

    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
