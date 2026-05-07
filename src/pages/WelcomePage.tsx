import React from 'react';
import './WelcomePage.css';

export default function WelcomePage() {
  return (
    <div className="welcome-wrapper">
      <div className="ambient"></div>
      
      <div className="welcome-container">
        <div className="grape-icon">
          <img src="/logobranca.png" alt="Grape Mídia" style={{ width: '88px', height: 'auto' }} />
        </div>

        <h1 className="greeting">Bem-vindo ao GrapeHub</h1>
        <p className="subtitle">
          Sua central de operações da <span>Grape Mídia</span>.<br />
          Selecione um módulo no menu lateral para começar.
        </p>

        <div className="modules-grid">
          <div className="module-card">
            <div className="module-icon operacional">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09c-.658.003-1.25.396-1.51 1z"/>
              </svg>
            </div>
            <div>
              <div className="module-name">Operacional</div>
              <div className="module-desc">Processos e gestão interna</div>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon comercial">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/>
              </svg>
            </div>
            <div>
              <div className="module-name">Comercial</div>
              <div className="module-desc">Funil de vendas e propostas</div>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon colaboradores">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div className="module-name">Colaboradores</div>
              <div className="module-desc">Equipe e acessos</div>
            </div>
          </div>
        </div>

        <div className="footer-line">
          <span>Grape Mídia</span>
          <span className="dot"></span>
          <span>Marketing Jurídico</span>
        </div>
      </div>
    </div>
  );
}
