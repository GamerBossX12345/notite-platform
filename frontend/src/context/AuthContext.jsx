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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);

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

  async function register(email, username, password, name, school, grade, defaultSubject) {
    const { data } = await api.post('/auth/register', {
      email,
      username,
      password,
      name: name || undefined,
      school: school || undefined,
      grade: grade || undefined,
      defaultSubject: defaultSubject || undefined,
    });
    if (data.requiresVerification) {
      // Nu suntem logați — userul trebuie să verifice emailul mai întâi
      return { requiresVerification: true, user: data.user };
    }
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return { user: data.user };
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  async function refreshMe() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  }

  async function dismissWarning() {
    await api.delete('/auth/warning');
    setUser(prev => prev ? { ...prev, warning: null } : prev);
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe, darkMode, updateDarkMode, dismissWarning, sidebarOpen, setSidebarOpen, mainMenuOpen, setMainMenuOpen }}>
      {children}
    </AuthContext.Provider>
  );
}
