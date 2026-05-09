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
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      applyTheme(true);
      return;
    }
    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        setDarkMode(res.data.darkMode ?? true);
        applyTheme(res.data.darkMode ?? true);
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

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

  async function updateDarkMode(isDark) {
    setDarkMode(isDark);
    applyTheme(isDark);
    if (user) {
      try {
        await api.patch('/auth/settings', { darkMode: isDark });
        setUser(prev => ({ ...prev, darkMode: isDark }));
      } catch (err) {
        console.error('Failed to save theme preference:', err);
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, darkMode, updateDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
}
