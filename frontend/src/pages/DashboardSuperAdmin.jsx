import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import '../styles/global.css';
import '../styles/dashboard.css';

export default function DashboardSuperAdmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados do Modal de Criação de Academia
  const [showModal, setShowModal] = useState(false);
  const [gymName, setGymName] = useState('');
  const [slug, setSlug] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        }
      });
      if (!res.ok) throw new Error('Falha ao carregar dados do administrador.');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Controla ativação/suspensão de contas
  const handleToggleStatus = async (gymId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionText = nextStatus === 'ACTIVE' ? 'reativar' : 'suspender';
    
    if (!window.confirm(`Tem certeza de que deseja ${actionText} esta academia?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/gyms/${gymId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error('Não foi possível alterar o status da academia.');
      
      // Atualiza estado local
      setData(prev => {
        const updatedGyms = prev.gyms.map(g => 
          g.id === gymId ? { ...g, status: nextStatus } : g
        );
        
        // Recalcula métricas rápidas
        const activeGyms = updatedGyms.filter(g => g.status === 'ACTIVE').length;
        const suspendedGyms = updatedGyms.filter(g => g.status === 'SUSPENDED').length;
        
        return {
          ...prev,
          gyms: updatedGyms,
          metrics: {
            ...prev.metrics,
            activeGyms,
            suspendedGyms,
            monthlyBilling: activeGyms * 149.90
          }
        };
      });

    } catch (err) {
      alert(err.message);
    }
  };

  // Cadastra nova academia
  const handleCreateGym = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/v1/admin/gyms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        },
        body: JSON.stringify({
          gymName,
          slug,
          capacity,
          ownerName,
          ownerEmail,
          ownerPassword
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao criar academia.');
      }

      // Sucesso
      setShowModal(false);
      // Limpa formulário
      setGymName('');
      setSlug('');
      setCapacity(100);
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      
      // Recarrega dados completos
      fetchDashboardData();
      alert('Academia e Dono cadastrados com sucesso!');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Gera slug automaticamente ao digitar nome da academia
  const handleNameChange = (name) => {
    setGymName(name);
    const generatedSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '')     // remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-');            // substitui espaços por hifens
    setSlug(generatedSlug);
  };

  if (loading) {
    return (
      <div className="loading flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p>Carregando painel de controle SaaS...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-view flex-center" style={{ minHeight: '100vh' }}>
        <h2>Erro ao carregar dados: {error}</h2>
      </div>
    );
  }

  const { metrics, gyms } = data;

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Painel de Controle SaaS (Super Admin)</h1>
            <p className="dashboard-subtitle">Visão unificada das instâncias e faturamento global da plataforma</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Cadastrar Nova Academia
          </button>
        </div>

        {/* Grade de KPIs Financeiros e Operacionais */}
        <div className="metrics-grid">
          
          <div className="metric-card glass-card">
            <span className="metric-label">Faturamento Mensal (MRR)</span>
            <div className="metric-value">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.monthlyBilling)}
            </div>
            <div className="metric-footer">
              <span style={{ color: 'var(--status-green)' }}>●</span> R$ 149,90 por academia ativa
            </div>
          </div>

          <div className="metric-card glass-card">
            <span className="metric-label">Academias Ativas</span>
            <div className="metric-value">{metrics.activeGyms} / {metrics.totalGyms}</div>
            <div className="metric-footer">
              {metrics.suspendedGyms} contas suspensas
            </div>
          </div>

          <div className="metric-card glass-card">
            <span className="metric-label">Hardwares Conectados</span>
            <div className="metric-value">
              {metrics.activeDevices} / {metrics.totalDevices}
            </div>
            <div className="metric-footer" style={{ color: metrics.activeDevices > 0 ? 'var(--status-green)' : 'var(--text-muted)' }}>
              {metrics.activeDevices > 0 ? '● Sensores online' : '○ Nenhum dispositivo ativo'}
            </div>
          </div>

          <div className="metric-card glass-card">
            <span className="metric-label">Usuários Cadastrados</span>
            <div className="metric-value">{metrics.totalUsers}</div>
            <div className="metric-footer">
              Gestores e staff
            </div>
          </div>

        </div>

        {/* Tabela de Controle de Tenants (Academias) */}
        <div className="table-card glass-card">
          <div className="card-title-row">
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Controle e Isolamento Multi-tenant (Tenants)</h2>
            <button className="btn-secondary" onClick={fetchDashboardData} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              Atualizar Tabela
            </button>
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Academia</th>
                  <th>Slug de Acesso</th>
                  <th>Lotação Atual</th>
                  <th>Responsável</th>
                  <th>Dispositivos IoT</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => {
                  const owner = gym.users.find(u => u.role === 'OWNER') || gym.users[0];
                  const hasOnlineDevice = gym.devices.some(d => d.status === 'ONLINE');
                  
                  return (
                    <tr key={gym.id}>
                      <td style={{ fontWeight: '600' }}>{gym.name}</td>
                      <td>
                        <a 
                          href={`/gym/${gym.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'var(--accent-light)', textDecoration: 'none' }}
                        >
                          /{gym.slug} ↗
                        </a>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700' }}>{gym.currentOccupancy}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / {gym.capacity}</span>
                      </td>
                      <td>
                        {owner ? (
                          <div>
                            <div>{owner.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{owner.email}</div>
                          </div>
                        ) : 'Sem gestor'}
                      </td>
                      <td>
                        {gym.devices.length > 0 ? (
                          <div>
                            <span className={`status-dot ${hasOnlineDevice ? 'online' : 'offline'}`} />
                            {gym.devices[0].name}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum sensor</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${gym.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                          {gym.status === 'ACTIVE' ? 'ATIVO' : 'SUSPENSO'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-secondary"
                          onClick={() => handleToggleStatus(gym.id, gym.status)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            color: gym.status === 'ACTIVE' ? 'var(--status-red)' : 'var(--status-green)',
                            borderColor: gym.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            background: 'rgba(255, 255, 255, 0.01)'
                          }}
                        >
                          {gym.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal para Adicionar Academia */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2 className="modal-title">Cadastrar Academia Tenant</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)} style={{ fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {createError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--status-red)',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}>
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateGym} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-light)', marginBottom: '8px' }}>1. Informações da Academia</h3>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Nome Comercial</label>
                  <input 
                    type="text" 
                    placeholder="Academia Centro" 
                    value={gymName}
                    onChange={(e) => handleNameChange(e.target.value)} 
                    className="input-field" 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Slug (URL Pública)</label>
                    <input 
                      type="text" 
                      placeholder="academia-centro" 
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)} 
                      className="input-field" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Capacidade Alunos</label>
                    <input 
                      type="number" 
                      min="10"
                      max="1000"
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value))} 
                      className="input-field" 
                      required 
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-light)', marginBottom: '8px' }}>2. Conta do Dono da Academia</h3>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Nome do Gestor</label>
                  <input 
                    type="text" 
                    placeholder="João Silva" 
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)} 
                    className="input-field" 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>E-mail Gestor</label>
                    <input 
                      type="email" 
                      placeholder="joao@centro.com" 
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)} 
                      className="input-field" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Senha de Acesso</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)} 
                      className="input-field" 
                      required 
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '8px', height: '44px' }}>
                {creating ? <div className="loading-spinner"></div> : 'Finalizar Cadastro'}
              </button>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
