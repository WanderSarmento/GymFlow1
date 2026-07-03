import React, { useState, useEffect } from 'react';

export default function DashboardVisualSettings({ gym, onUpdateGym }) {
  const [primaryColor, setPrimaryColor] = useState(gym?.primaryColor || '#7C3AED');
  const [backgroundColor, setBackgroundColor] = useState(gym?.backgroundColor || '#09090b');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(gym?.logoUrl || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [removeLogoPending, setRemoveLogoPending] = useState(false);

  // Sincroniza estados com os dados carregados da academia
  useEffect(() => {
    if (gym) {
      setPrimaryColor(gym.primaryColor || '#7C3AED');
      setBackgroundColor(gym.backgroundColor || '#09090b');
      setLogoPreviewUrl(gym.logoUrl || '');
      setRemoveLogoPending(false);
    }
  }, [gym]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validação de formato
    const allowedExtensions = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedExtensions.includes(file.type)) {
      setErrorMessage('Formato inválido. Apenas PNG, JPG ou JPEG são permitidos.');
      return;
    }

    // Validação de tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('O arquivo excede o limite máximo de 2MB.');
      return;
    }

    setErrorMessage(null);
    setLogoFile(file);
    setRemoveLogoPending(false);
    
    // Gera URL de preview local temporário
    const objectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(objectUrl);

    // Revoga a URL antiga para liberar memória se já existisse uma local
    return () => URL.revokeObjectURL(objectUrl);
  };

  const handleResetColors = () => {
    setPrimaryColor('#7C3AED');
    setBackgroundColor('#09090b');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('primaryColor', primaryColor);
    formData.append('backgroundColor', backgroundColor);
    if (removeLogoPending) {
      formData.append('removeLogo', 'true');
    } else if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      const res = await fetch('/api/v1/gyms/visuals', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gf_token')}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar configurações visuais.');
      }

      const updatedGym = await res.json();
      onUpdateGym(updatedGym);
      setSuccess(true);
      setLogoFile(null); // Reseta arquivo pendente
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '32px',
      width: '100%',
      marginTop: '24px'
    }}>
      
      {/* Formulário de Configuração */}
      <div className="glass-card" style={{ 
        background: 'var(--bg-secondary)', 
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Identidade Visual da Página
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
            Personalize a página pública que seus alunos acessam para ver a lotação em tempo real.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Upload de Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Logotipo da Academia
              </label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-color)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {logoPreviewUrl ? (
                    <img src={logoPreviewUrl} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '1.8rem', opacity: '0.4' }}>🏢</span>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    id="logo-upload"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label 
                      htmlFor="logo-upload"
                      className="btn-secondary"
                      style={{
                        cursor: 'pointer',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        display: 'inline-flex'
                      }}
                    >
                      Escolher Imagem
                    </label>
                    {logoPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreviewUrl('');
                          setRemoveLogoPending(true);
                        }}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 16px',
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          background: 'rgba(239, 68, 68, 0.06)',
                          color: 'var(--status-red)',
                          borderRadius: '12px',
                          fontWeight: '600',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.15)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.06)'}
                      >
                        Remover Imagem
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', margin: '8px 0 0 0' }}>
                    Apenas PNG, JPG ou JPEG. Tamanho máximo de 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Seleção de Cores */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Cor Primária
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'transparent',
                      padding: '0'
                    }}
                  />
                  <input 
                    type="text" 
                    value={primaryColor.toUpperCase()} 
                    onChange={(e) => {
                      if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                        setPrimaryColor(e.target.value);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                      width: '100%',
                      marginLeft: '4px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Cor de Fundo
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <input 
                    type="color" 
                    value={backgroundColor} 
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'transparent',
                      padding: '0'
                    }}
                  />
                  <input 
                    type="text" 
                    value={backgroundColor.toUpperCase()} 
                    onChange={(e) => {
                      if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                        setBackgroundColor(e.target.value);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                      width: '100%',
                      marginLeft: '4px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Alertas */}
            {errorMessage && (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                color: 'var(--status-red)',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {success && (
              <div style={{
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                color: 'var(--status-green)',
                fontSize: '0.8rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                ✓ Alterações visuais salvas com sucesso!
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={saving}
                style={{ flex: 1, padding: '12px' }}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button 
                type="button" 
                onClick={handleResetColors}
                className="btn-secondary"
                style={{ padding: '12px 18px' }}
                title="Restaurar padrão"
              >
                Restaurar Padrão
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Widget de Preview em Tempo Real */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.01)',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        padding: '32px 20px',
        minHeight: '480px'
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '1px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: '20px'
        }}>
          Visualização em Tempo Real (Preview do Aluno)
        </span>
        
        {/* Frame da Tela do Aluno com as cores customizadas injetadas */}
        <div style={{
          width: '100%',
          maxWidth: '280px',
          aspectRatio: '9/16',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px',
          backgroundColor: backgroundColor
        }}>
          {/* Topo / Header do Preview */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '1.5rem', opacity: '0.3' }}>🏢</span>
              )}
            </div>
            <h3 style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.95rem', margin: '0' }}>
              {gym?.name || 'Sua Academia'}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', marginTop: '2px', margin: '0' }}>
              Lotação em Tempo Real
            </p>
          </div>

          {/* Card Central */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '16px',
            margin: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}>Treinando Agora</span>
              <span style={{
                fontSize: '8px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 8px',
                borderRadius: '9999px',
                color: primaryColor,
                borderColor: `${primaryColor}40`,
                backgroundColor: `${primaryColor}10`,
                border: '1px solid'
              }}>
                Tranquilo
              </span>
            </div>

            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', lineHeight: '1', marginBottom: '4px' }}>32</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '8px', marginBottom: '12px' }}>
              Capacidade Limite: {gym?.capacity || 100} alunos
            </div>

            {/* Barra de Progresso Customizada */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: '9999px',
                width: '32%',
                backgroundColor: primaryColor,
                boxShadow: `0 0 8px ${primaryColor}80`,
                transition: 'all 0.3s ease'
              }} />
            </div>
          </div>

          {/* Rodapé do Preview */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '8px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'inline-block',
              margin: '0 auto',
              color: 'rgba(255, 255, 255, 0.6)',
              backgroundColor: 'rgba(255, 255, 255, 0.01)'
            }}>
              🕒 {gym?.businessHours || 'Seg a Sex: 06h às 22h | Sáb: 08h às 14h'}
            </div>
            {gym?.address && (
              <div style={{
                fontSize: '8px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'inline-block',
                margin: '0 auto',
                color: 'rgba(255, 255, 255, 0.6)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '220px'
              }} title={gym.address}>
                📍 {gym.address}
              </div>
            )}
            <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '7px' }}>Desenvolvido por GymFlow</span>
          </div>
        </div>
      </div>

    </div>
  );
}
