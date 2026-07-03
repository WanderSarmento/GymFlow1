import React from 'react';
import { useAuth } from '../App';
import '../styles/global.css';
import '../styles/dashboard.css';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        ⚡ GymFlow <span>Local</span>
      </div>

      <div className="nav-user">
        <div className="nav-user-info">
          <div className="nav-user-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            {user.name}
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>GESTOR</span>
          </div>
          <div className="nav-user-role">
            {user.gym ? user.gym.name : 'Academia Única'}
          </div>
        </div>

        <button className="btn-logout" onClick={logout}>
          Sair
        </button>
      </div>
    </nav>
  );
}
