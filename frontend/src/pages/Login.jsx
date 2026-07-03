import React, { useState } from 'react';
import { useAuth } from '../App';
import '../styles/global.css';
import '../styles/public.css'; // Reutiliza efeitos de fundo

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      // Redirecionamento é feito automaticamente pelo roteador AppRoutes baseado no estado
    } catch (err) {
      setError(err.message || 'Falha ao autenticar.');
      setSubmitting(false);
    }
  };

  return (
    <div className="public-container">
      <div className="glow-bg" />
      
      <div className="public-card glass-panel" style={{ maxWidth: '400px', padding: '40px 32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="gym-title" style={{ fontSize: '2.5rem', marginBottom: '4px' }}>
            GymFlow <span style={{ fontSize: '1.2rem', padding: '2px 8px', background: 'var(--accent)', borderRadius: '6px', color: '#fff', verticalAlign: 'middle' }}>Local</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Painel de Lotação em Tempo Real
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--status-red)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>E-mail</label>
            <input
              type="email"
              placeholder="exemplo@gymflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              disabled={submitting}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '8px', height: '48px' }}
          >
            {submitting ? <div className="loading-spinner"></div> : 'Entrar no painel'}
          </button>
        </form>
        
        <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>Gestor: owner@gymflow.com / ownerpassword123</p>
          <p style={{ marginTop: '4px' }}>Admin: admin@gymflow.com / adminpassword123</p>
        </div>
      </div>
    </div>
  );
}
