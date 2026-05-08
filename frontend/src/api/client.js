// Client HTTP centralizat pentru toate request-urile către backend.
// Avantaj față de fetch direct: interceptors care adaugă tokenul automat
// și gestionează 401-uri global.

import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Înainte de fiecare request: dacă avem token în localStorage, îl atașăm.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dacă serverul răspunde 401 (token expirat/invalid), îl ștergem.
// TODO: declanșează un eveniment / setează un state global pentru a face
// redirect la /login automat. Acum doar șterge tokenul.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);
