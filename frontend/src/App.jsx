import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import PublicGym from './pages/PublicGym';
import DashboardOwner from './pages/DashboardOwner';
import { supabase } from './utils/supabaseClient';

// Contexto de Autenticação
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Provedor de Autenticação
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return userData;
      } else {
        localStorage.removeItem('gf_token');
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error('Erro ao recuperar perfil:', err);
      localStorage.removeItem('gf_token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('gf_token');
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || 'Erro ao fazer login.');
    }
    
    const token = data.session.access_token;
    localStorage.setItem('gf_token', token);
    
    // Busca o perfil do usuário no Express passando o token do Supabase
    return await fetchProfile(token);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gf_token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUserGym: (updatedGym) => {
      setUser(prev => prev ? { ...prev, gym: updatedGym } : null);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Protetor de rotas privadas
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p>Autenticando sessão...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Roteador com verificação
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p>Carregando GymFlow...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Rota raiz direciona conforme login */}
      <Route path="/" element={
        user ? <Navigate to="/owner" replace /> : <Navigate to="/login" replace />
      } />

      {/* Rota de Login */}
      <Route path="/login" element={
        user ? <Navigate to="/owner" replace /> : <Login />
      } />

      {/* Vista Pública da lotação */}
      <Route path="/gym/:slug" element={<PublicGym />} />

      {/* Painel do Gestor da Academia */}
      <Route path="/owner" element={
        <ProtectedRoute>
          <DashboardOwner />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
