import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Chart from '../components/Chart';
import '../styles/global.css';
import '../styles/public.css';

export default function PublicGym() {
  const { slug } = useParams();
  const [gym, setGym] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPeakHours = async () => {
    try {
      const res = await fetch(`/api/v1/gyms/public/${slug}/peak-hours`);
      if (res.ok) {
        const data = await res.json();
        setPeakHours(data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados históricos:', err);
    }
  };

  useEffect(() => {
    // 1. Busca os dados iniciais via REST
    const loadGym = async () => {
      try {
        const res = await fetch(`/api/v1/gyms/public/${slug}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao carregar dados da academia.');
        }
        const data = await res.json();
        setGym(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGym();
    loadPeakHours();

    // 2. Conecta ao WebSocket para atualizações em tempo real
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const socket = io(backendUrl);
    
    socket.emit('join_gym', slug);

    socket.on('occupancy_update', (data) => {
      if (data.slug === slug) {
        setGym(prev => prev ? { 
          ...prev, 
          currentOccupancy: data.currentOccupancy,
          capacity: data.capacity,
          isOpen: data.isOpen,
          status: data.status,
          address: data.address !== undefined ? data.address : prev.address,
          logoUrl: data.logoUrl !== undefined ? data.logoUrl : prev.logoUrl,
          primaryColor: data.primaryColor !== undefined ? data.primaryColor : prev.primaryColor,
          backgroundColor: data.backgroundColor !== undefined ? data.backgroundColor : prev.backgroundColor
        } : null);
        // Atualiza os picos históricos em segundo plano se houver novas atualizações
        loadPeakHours();
      }
    });

    socket.on('gym_status_changed', (data) => {
      if (data.slug === slug) {
        if (data.status === 'SUSPENDED') {
          setError('Esta academia está temporariamente suspensa.');
        } else {
          // Recarrega
          loadGym();
          loadPeakHours();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="loading flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p>Conectando ao painel real-time...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-view flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '3rem' }}>🔒</h2>
        <h2>{error}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Por favor, entre em contato com a administração.</p>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="error-view flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '3rem' }}>🔍</h2>
        <h2>Academia não encontrada</h2>
        <p style={{ color: 'var(--text-secondary)' }}>O link que você acessou pode estar incorreto.</p>
      </div>
    );
  }

  const occupancyRatio = gym.currentOccupancy / gym.capacity;
  
  let statusText = 'Tranquilo';
  let statusClass = 'status-green';

  if (!gym.isOpen) {
    statusText = 'Fechada';
    statusClass = 'status-closed';
  } else if (occupancyRatio >= 0.8) {
    statusText = 'Lotado';
    statusClass = 'status-red';
  } else if (occupancyRatio >= 0.5) {
    statusText = 'Moderado';
    statusClass = 'status-yellow';
  }

  const customStyles = {
    '--bg-primary': gym.backgroundColor || '#09090b',
    '--accent': gym.primaryColor || '#7C3AED',
    '--accent-light': gym.primaryColor || '#a78bfa',
    backgroundColor: 'var(--bg-primary)',
    transition: 'background-color 0.5s ease, border-color 0.5s ease'
  };

  return (
    <div className="public-container" style={customStyles}>
      <div className="glow-bg" />
      
      <div className="public-card glass-card">
        {gym.logoUrl && (
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden p-1 shadow-lg">
              <img src={gym.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        )}
        <h1 className="gym-title">{gym.name}</h1>
        
        <div className={`status-indicator-badge ${statusClass}`}>
          <span className="pulse-dot"></span>
          Status: {statusText}
        </div>

        <div className="occupancy-gauge-container">
          <div className="gauge-value">
            {gym.isOpen ? gym.currentOccupancy : 0}
          </div>
          <div className="gauge-label">Pessoas treinando agora</div>
        </div>

        <div className="capacity-bar-wrapper">
          <div 
            className="capacity-bar-fill" 
            style={{ 
              width: `${gym.isOpen ? Math.min(100, occupancyRatio * 100) : 0}%`, 
              backgroundColor: gym.isOpen ? `var(--status-${statusClass.split('-')[1]})` : 'var(--text-muted)' 
            }}
          ></div>
        </div>

        <div className="capacity-stats" style={{ marginBottom: '8px' }}>
          <span>Capacidade máxima: {gym.capacity}</span>
          <span className={`operational-hours ${gym.isOpen ? 'open' : 'closed'}`}>
            {gym.isOpen ? '● Aberta agora' : '○ Fechada'}
          </span>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          fontSize: '0.8rem', 
          color: 'var(--text-secondary)', 
          background: 'rgba(255, 255, 255, 0.03)', 
          padding: '10px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)', 
          marginTop: '16px',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
        }}>
          <span style={{ fontSize: '1rem', lineHeight: '1' }}>🕒</span>
          <span style={{ fontWeight: '500' }}>{gym.businessHours || 'Horário de funcionamento não cadastrado'}</span>
        </div>

        {gym.address && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            fontSize: '0.8rem', 
            color: 'var(--text-secondary)', 
            background: 'rgba(255, 255, 255, 0.03)', 
            padding: '10px 14px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)', 
            marginTop: '12px',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
          }}>
            <span style={{ fontSize: '1rem', lineHeight: '1' }}>📍</span>
            <span style={{ fontWeight: '500' }}>{gym.address}</span>
          </div>
        )}

        {/* Seção Pública de Horários de Pico */}
        {gym.isOpen && (
          <div style={{ marginTop: '36px', borderTop: '1px solid var(--border-color)', paddingTop: '28px', textAlign: 'left' }}>
            <h3 style={{ 
              fontSize: '1.05rem', 
              fontWeight: '700', 
              marginBottom: '4px',
              background: 'linear-gradient(135deg, #ffffff, var(--text-secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              📊 Horários de Pico Recomendados
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Consulte a média histórica para planejar e treinar com tranquilidade.
            </p>
            <Chart data={peakHours} capacity={gym.capacity} />
          </div>
        )}
      </div>

      <div className="public-footer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-light)' }}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span>Atualizado em tempo real por WebSockets (Socket.io)</span>
      </div>
    </div>
  );
}

