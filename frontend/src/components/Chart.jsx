import React from 'react';
import '../styles/dashboard.css';

export default function Chart({ data, capacity }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
        Sem dados de ocupação registrados.
      </div>
    );
  }

  // Encontra o valor máximo para normalizar a altura das barras (escala 0-100)
  const maxVal = Math.max(...data.map(d => d.avgOccupancy), 1);
  const capVal = capacity || 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <div className="chart-container" style={{ overflowX: 'auto', paddingBottom: '12px' }}>
        {data.map((item, index) => {
          const heightPercent = (item.avgOccupancy / maxVal) * 90 + 10; // Mínimo de 10% de altura para barra visível
          const occupancyRatio = item.avgOccupancy / capVal;

          let barColor = 'linear-gradient(180deg, var(--accent) 0%, rgba(139, 92, 246, 0.1) 100%)';
          let dotColor = 'var(--accent)';
          if (occupancyRatio >= 0.8) {
            barColor = 'linear-gradient(180deg, var(--status-red) 0%, rgba(239, 68, 68, 0.1) 100%)';
            dotColor = 'var(--status-red)';
          } else if (occupancyRatio >= 0.5) {
            barColor = 'linear-gradient(180deg, var(--status-yellow) 0%, rgba(245, 158, 11, 0.1) 100%)';
            dotColor = 'var(--status-yellow)';
          }

          return (
            <div key={index} className="chart-bar-col" style={{ minWidth: '36px' }}>
              <div className="chart-tooltip" style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '0.8rem', marginBottom: '2px' }}>{item.hour}</div>
                <div style={{ color: dotColor, fontWeight: '800' }}>{item.avgOccupancy} pessoas</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Média do horário</div>
              </div>
              
              <div className="chart-bar-container">
                <div 
                  className="chart-bar" 
                  style={{ 
                    height: `${heightPercent}%`, 
                    background: barColor 
                  }}
                ></div>
              </div>
              
              <div className="chart-label">{item.hour.split(':')[0]}h</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }}></span> Tranquilo (&lt;50%)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-yellow)' }}></span> Moderado (50%-80%)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-red)' }}></span> Lotado (&gt;80%)
        </span>
      </div>
    </div>
  );
}
