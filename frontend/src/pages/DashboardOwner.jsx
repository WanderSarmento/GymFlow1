import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';
import Chart from '../components/Chart';
import DashboardVisualSettings from '../components/DashboardVisualSettings';
import { useAuth } from '../App';
import '../styles/global.css';
import '../styles/dashboard.css';

export default function DashboardOwner() {
  const { user, updateUserGym } = useAuth();
  const [gym, setGym] = useState(user?.gym || null);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Estados para o formulário de configurações
  const [gymName, setGymName] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [isOpen, setIsOpen] = useState(true);
  const [businessHours, setBusinessHours] = useState('');
  const [address, setAddress] = useState('');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Estados para o simulador ESP32
  const [simLog, setSimLog] = useState('WiFi: CONECTADO\nIP: 192.168.1.105\nModo: Single-Tenant (sem API Key)\nAguardando sinal...');
  const [simSending, setSimSending] = useState(false);

  const fetchGymData = async () => {
    try {
      const res = await fetch('/api/v1/gyms/owner', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        }
      });
      if (!res.ok) throw new Error('Não foi possível carregar as informações da academia.');
      const data = await res.json();
      setGym(data);
      setGymName(data.name);
      setCapacity(data.capacity);
      setIsOpen(data.isOpen);
      setBusinessHours(data.businessHours || '');
      setAddress(data.address || '');
      updateUserGym(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchPeakData = async () => {
    try {
      const res = await fetch('/api/v1/gyms/peak-hours', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPeakHours(data);
      }
    } catch (err) {
      console.error('Erro ao buscar dados históricos:', err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([fetchGymData(), fetchPeakData()]);
      setLoading(false);
    };

    initialize();
  }, []);

  // Socket.io para atualizações em tempo real
  useEffect(() => {
    if (!gym?.id) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const socket = io(backendUrl);
    socket.emit('join_gym', gym.id);

    socket.on('occupancy_update', (data) => {
      setGym(prev => prev ? { 
        ...prev, 
        currentOccupancy: data.currentOccupancy,
        capacity: data.capacity,
        isOpen: data.isOpen,
        businessHours: data.businessHours || prev.businessHours,
        address: data.address !== undefined ? data.address : prev.address
      } : null);
      if (data.businessHours !== undefined) {
        setBusinessHours(data.businessHours);
      }
      if (data.address !== undefined) {
        setAddress(data.address || '');
      }
      // Atualiza os dados de horários de pico silenciosamente em novas atualizações
      fetchPeakData();
    });

    return () => {
      socket.disconnect();
    };
  }, [gym?.id]);

  // Salva configurações da academia
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setUpdatingSettings(true);
    setSettingsSuccess(false);

    try {
      const res = await fetch('/api/v1/gyms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        },
        body: JSON.stringify({ name: gymName, capacity, isOpen, businessHours, address })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar configurações.');
      }

      const data = await res.json();
      setGym(data);
      updateUserGym(data);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Simula clique de hardware (envia chamada REST simulando o ESP32 — sem API Key)
  const simulateHardwareClick = async (action) => {
    setSimSending(true);
    
    const displayAction = action === 'in' ? 'ENTRADA' : 'SAÍDA';
    setSimLog(prev => `[Wi-Fi] Botão ${displayAction} pressionado...\nEnviando POST /api/v1/iot/update...\nPayload: {"action": "${action}"}\n` + prev);

    try {
      const res = await fetch('/api/v1/iot/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await res.json();

      if (res.ok) {
        setSimLog(prev => `[Sucesso] HTTP 200 OK\nOcupação atualizada: ${data.currentOccupancy}/${data.capacity}\n\n` + prev);
      } else {
        setSimLog(prev => `[Erro] HTTP ${res.status}\nResposta: ${data.error || 'Desconhecido'}\n\n` + prev);
      }
    } catch (err) {
      setSimLog(prev => `[Falha] Erro de rede: ${err.message}\n\n` + prev);
    } finally {
      setSimSending(false);
    }
  };


  if (loading) {
    return (
      <div className="loading flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p>Carregando painel administrativo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-view flex-center" style={{ minHeight: '100vh' }}>
        <h2>Erro: {error}</h2>
      </div>
    );
  }

  const occupancyRatio = gym ? gym.currentOccupancy / gym.capacity : 0;
  let statusText = 'Tranquilo';
  let statusClass = 'badge-green';

  if (!gym?.isOpen) {
    statusText = 'Fechada';
    statusClass = 'badge-yellow'; // Muted
  } else if (occupancyRatio >= 0.8) {
    statusText = 'Lotado';
    statusClass = 'badge-red';
  } else if (occupancyRatio >= 0.5) {
    statusText = 'Moderado';
    statusClass = 'badge-yellow';
  }

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Painel de Monitoramento</h1>
            <p className="dashboard-subtitle">Gerenciamento em tempo real da unidade {gym?.name}</p>
          </div>
          <a 
            href={`/gym/${gym?.slug}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span>Ver Tela Pública</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
        </div>

        {/* Navegação por Abas */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          paddingBottom: '1px'
        }}>
          <button 
            style={{
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '12px 12px 0 0',
              background: activeTab === 'general' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
              color: activeTab === 'general' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('general')}
          >
            📊 Monitoramento Geral
          </button>
          <button 
            style={{
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '12px 12px 0 0',
              background: activeTab === 'visual' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
              color: activeTab === 'visual' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === 'visual' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('visual')}
          >
            🎨 Customização Visual (Tela do Aluno)
          </button>
        </div>

        {activeTab === 'general' ? (
          <div className="dashboard-grid">
          
          {/* Coluna da Esquerda (Lotação e Histórico) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Lotação em Tempo Real */}
            <div className="occupancy-card glass-card">
              <div className="occupancy-status-row">
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Treinando Agora</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Atualização instantânea via WebSocket</p>
                </div>
                <span className={`badge ${statusClass}`}>
                  {statusText}
                </span>
              </div>

              <div className="occupancy-numbers">
                <div className="occupancy-current">
                  {gym?.currentOccupancy}
                </div>
                <div className="occupancy-limit">
                  Capacidade Limite: <strong>{gym?.capacity} alunos</strong>
                </div>
              </div>

              <div className="capacity-bar-wrapper" style={{ marginBottom: '16px' }}>
                <div 
                  className="capacity-bar-fill"
                  style={{ 
                    width: `${gym?.isOpen ? Math.min(100, occupancyRatio * 100) : 0}%`,
                    backgroundColor: gym?.isOpen 
                      ? (occupancyRatio >= 0.8 ? 'var(--status-red)' : occupancyRatio >= 0.5 ? 'var(--status-yellow)' : 'var(--status-green)') 
                      : 'var(--text-muted)'
                  }}
                ></div>
              </div>

              {/* Botões de controle local (para staff operar se necessário) */}
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Controle Manual Auxiliar (Simula entrada/saída física de alunos)
                </p>
                <div className="manual-controls">
                  <button 
                    className="btn-control btn-in" 
                    onClick={() => simulateHardwareClick('in')} 
                  >
                    + Registrar Entrada
                  </button>
                  <button 
                    className="btn-control btn-out" 
                    onClick={() => simulateHardwareClick('out')}
                    disabled={gym?.currentOccupancy === 0}
                  >
                    - Registrar Saída
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard de Horários de Pico */}
            <div className="table-card glass-card">
              <div className="card-title-row">
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Análise de Horários de Pico</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Média histórica de alunos por hora do dia</p>
                </div>
                <button 
                  className="btn-secondary" 
                  onClick={fetchPeakData}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  Atualizar Relatório
                </button>
              </div>
              
              <Chart data={peakHours} capacity={gym?.capacity} />
            </div>

          </div>

          {/* Coluna da Direita (Configurações e Simulador IoT) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Configurações da Academia */}
            <div className="settings-card glass-card">
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Configurações da Unidade</h2>
              
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Nome da Unidade</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={gymName} 
                    onChange={(e) => setGymName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Horário de Funcionamento</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={businessHours} 
                    onChange={(e) => setBusinessHours(e.target.value)} 
                    placeholder="Ex: Seg a Sex: 06h às 22h | Sáb: 08h às 14h"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Endereço da Unidade</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label>Capacidade Máxima</label>
                    <span style={{ fontWeight: '700', color: 'var(--accent-light)' }}>{capacity} pessoas</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    step="5"
                    value={capacity} 
                    onChange={(e) => setCapacity(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>

                <div className="toggle-switch-wrapper">
                  <span className="switch-label">Status de Funcionamento</span>
                  <div 
                    className={`switch-btn ${isOpen ? 'active' : ''}`} 
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <div className="switch-handle" />
                  </div>
                </div>
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-8px' }}>
                  {isOpen ? '● A academia está atualmente ABERTA a novos alunos.' : '○ FECHADA. A contagem pública será zerada automaticamente.'}
                </p>

                <button type="submit" className="btn-primary" disabled={updatingSettings}>
                  {updatingSettings ? 'Salvando...' : 'Salvar Configurações'}
                </button>

                {settingsSuccess && (
                  <p style={{ color: 'var(--status-green)', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600' }}>
                    ✓ Configurações salvas com sucesso!
                  </p>
                )}
              </form>
            </div>

            {/* Informações de Conexão IoT */}
            <div className="settings-card glass-card" style={{ gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Conexão com Hardware (IoT)</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  O ESP32 transmite dados diretamente via Wi-Fi para o endpoint local:
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-light)' }}>📶 Endpoint:</strong> <code>POST /api/v1/iot/update</code>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent-light)' }}>📦 Payload:</strong> <code>{`{"action": "in"}`}</code> ou <code>{`{"action": "out"}`}</code>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent-light)' }}>🔓 Autenticação:</strong> Nenhuma (comunicação direta na rede local)
                  </div>
                </div>
              </div>
            </div>

            {/* Simulador Físico ESP32 */}
            <div className="glass-card" style={{ padding: '24px', background: '#0e0e15' }}>
              <div className="esp32-simulator">
                <div className="esp32-header">
                  <div className={`esp32-led ${simSending ? 'sending' : ''}`} />
                  <span className="esp32-title">ESP32_DEV_KIT_V1</span>
                </div>
                
                <div className="esp32-screen">
                  {simLog}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
                  Aperte os botões para simular os sensores da catraca emitindo dados via HTTP POST por Wi-Fi (sem API Key).
                </div>

                <div className="esp32-buttons">
                  <button 
                    className="btn-esp32" 
                    onClick={() => simulateHardwareClick('in')}
                    disabled={simSending}
                  >
                    Entrada (PIN_12)
                  </button>
                  <button 
                    className="btn-esp32" 
                    onClick={() => simulateHardwareClick('out')}
                    disabled={simSending || gym?.currentOccupancy === 0}
                  >
                    Saída (PIN_14)
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
        ) : (
          <DashboardVisualSettings 
            gym={gym} 
            onUpdateGym={(updated) => {
              setGym(updated);
              updateUserGym(updated);
            }} 
          />
        )}
      </main>
    </div>
  );
}
