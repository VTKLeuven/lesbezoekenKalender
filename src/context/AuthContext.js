import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, validate any token stored for this tab's session only
  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => sessionStorage.removeItem('authToken'))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const { token, user } = await res.json();
    sessionStorage.setItem('authToken', token);
    setUser(user);
    return user;
  }

  function logout() {
    sessionStorage.removeItem('authToken');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
