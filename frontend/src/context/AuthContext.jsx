// Context global pentru auth.
// Orice componentă poate să afle dacă există user logat și să facă login/logout
// fără să paseze props prin 10 nivele.
//
// Folosire:
//   const { user, login, logout } = useAuth();

import { createContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // La montare, dacă există token, încercăm să obținem user-ul.
  // TODO: pe backend creează endpoint GET /auth/me care întoarce user-ul
  // pe baza tokenului din header. Apoi aici:
  //   api.get('/auth/me').then(res => setUser(res.data)).catch(() => {})
  //                      .finally(() => setLoading(false));
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, []);

  async function login(identifier, password) {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(email, username, password, name, school, grade) {
    const { data } = await api.post('/auth/register', {
      email,
      username,
      password,
      name: name || undefined,
      school: school || undefined,
      grade: grade || undefined,
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
