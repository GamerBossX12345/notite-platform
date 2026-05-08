// Shingling + MinHash para detectare duplicate cu Jaccard similarity.
// Implementare reală de algoritm pentru găsirea documentelor similare rapid.
// Time complexity: O(n*k) pentru fingerprinting, O(1) pentru comparare
// Space complexity: O(k) unde k = numărul de hash functions

import crypto from 'crypto';

// Parametri Shingling
const SHINGLE_SIZE = 4;
const NUM_HASHES = 100; // fingerprint cu 100 hash functions

// Generator de shingles (substrings de lungime SHINGLE_SIZE)
export function generateShingles(text, k = SHINGLE_SIZE) {
  // Preprocess: lowercase, remove extra whitespace
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // doar litere, cifre, spații
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length < k) {
    return new Set([clean]);
  }

  const shingles = new Set();
  for (let i = 0; i <= clean.length - k; i++) {
    shingles.add(clean.substring(i, i + k));
  }
  return shingles;
}

// Hash function universal: datînd un seed + string, returnează 0-999999
// Folosim MurmurHash-style pentru distribuție bună
function hashFunction(seed, data) {
  const combined = `${seed}:${data}`;
  const hash = crypto.createHash('sha256').update(combined).digest();
  // Convertim primii 4 bytes la număr
  return Math.abs(
    (hash[0] << 24) | (hash[1] << 16) | (hash[2] << 8) | hash[3]
  ) % 1000000;
}

// MinHash signature: pentru fiecare din NUM_HASHES hash functions,
// găsim min(hash(shingle)) din toate shingle-urile.
// Rezultatul: vector de NUM_HASHES numere care representa documentul.
export function minHashSignature(text, numHashes = NUM_HASHES) {
  const shingles = generateShingles(text);

  if (shingles.size === 0) {
    return new Array(numHashes).fill(0);
  }

  const signature = new Array(numHashes).fill(Number.MAX_SAFE_INTEGER);

  // Pentru fiecare hash function
  for (let i = 0; i < numHashes; i++) {
    // Pentru fiecare shingle
    for (const shingle of shingles) {
      const hash = hashFunction(i, shingle);
      // Ține min
      signature[i] = Math.min(signature[i], hash);
    }
  }

  return signature;
}

// Jaccard similarity între două seturi: |A ∩ B| / |A ∪ B|
// Estimat din MinHash: proporția de hash values care se potrivesc
function jaccardSimilarity(sig1, sig2) {
  if (sig1.length !== sig2.length) {
    return 0;
  }

  const matches = sig1.filter((val, idx) => val === sig2[idx]).length;
  return matches / sig1.length;
}

// Comparare între text1 și text2 — returnează similarity score (0-1)
export function compareTexts(text1, text2) {
  if (!text1 || !text2) return 0;

  const sig1 = minHashSignature(text1);
  const sig2 = minHashSignature(text2);

  return jaccardSimilarity(sig1, sig2);
}

// Alternativă: HashSet-based Jaccard (mai precisă, mai lentă)
// Pentru docs mici, e OK. Pentru milioane de docs, MinHash-ul e mai eficient.
export function exactJaccardSimilarity(text1, text2) {
  const set1 = generateShingles(text1);
  const set2 = generateShingles(text2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// Detector multi-doc: verifica similaritate vs. o listă de documente
export async function findSimilarDocuments(newText, documents, threshold = 0.7) {
  const newSig = minHashSignature(newText);

  return documents
    .map((doc) => {
      const docSig = minHashSignature(doc.content);
      const similarity = jaccardSimilarity(newSig, docSig);

      return {
        id: doc.id,
        title: doc.title,
        similarity,
        isSuspicious: similarity >= threshold,
      };
    })
    .filter(x => x.isSuspicious)
    .sort((a, b) => b.similarity - a.similarity);
}

// Utility: fingerprint string pentru storage în DB
// Salvează semnătura MinHash ca JSON pentru comparare rapidă mai târziu
export function fingerprintText(text) {
  const sig = minHashSignature(text);
  return JSON.stringify(sig); // Salvează în contentHash
}

// Reconstituire fingerprint din string storat
export function fingerprintFromString(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Comparare directă cu fingerprints stocate
export function compareFingerprints(fp1, fp2) {
  if (!fp1 || !fp2 || !Array.isArray(fp1) || !Array.isArray(fp2)) {
    return 0;
  }
  return jaccardSimilarity(fp1, fp2);
}
