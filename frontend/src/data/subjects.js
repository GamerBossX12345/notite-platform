// Materii disponibile pe clasă. Folosit în UploadPage, RegisterPage, Settings
// (default subject) etc. Lista de gimnaziu (5-8) e mai scurtă; liceul (9-12)
// adaugă Filosofie / Economie / Psihologie.

export const SUBJECTS_BY_GRADE = {
  5:  ['Matematică', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  6:  ['Matematică', 'Fizică', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  7:  ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  8:  ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  9:  ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză'],
  10: ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Psihologie'],
  11: ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Filosofie', 'Economie', 'Psihologie'],
  12: ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Filosofie', 'Economie'],
};

// Lista completă a materiilor, utilă când nu cunoaștem clasa userului.
export const ALL_SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];

export function subjectsForGrade(grade) {
  const g = Number(grade);
  if (!g) return ALL_SUBJECTS;
  return SUBJECTS_BY_GRADE[g] || ALL_SUBJECTS;
}
