import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export function Sidebar({ currentView, setCurrentView }) {
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const roleLabel = profile?.role === 'admin' ? 'Administrador(a)' : 'Consultor(a)';

  // Extrai as duas primeiras iniciais para exibição no avatar do rodapé
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0].toUpperCase())
    .join('');

  return (
    <aside className="sidebar-container">
      <div className="sidebar-top-section">
        {/* Cabeçalho da Marca / Logotipo */}
        <div className="sidebar-brand-wrapper">
          <span className="sidebar-brand-badge">SISTEMA DE CONTROLE DE HORAS (SCH)</span>
          <div className="sidebar-logo-container">
            <img
              src="/Logo-Original.webp"
              alt="AS&V Growth Partner"
              className="sidebar-logo-img"
            />
          </div>
        </div>

        {/* Navegação Principal */}
        <div className="sidebar-nav-section">
          <span className="sidebar-section-title">ÁREA DE TRABALHO</span>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-nav-item ${currentView === 'clientes' ? 'active' : ''}`}
              onClick={() => setCurrentView('clientes')}
            >
              Clientes
            </button>
            <button
              type="button"
              className={`sidebar-nav-item ${currentView === 'relatorios' ? 'active' : ''}`}
              onClick={() => setCurrentView('relatorios')}
            >
              Relatórios
            </button>
          </nav>
        </div>
      </div>

      {/* Rodapé: Informações da Conta e Ação de Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">{initials || 'US'}</div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name" title={displayName}>
              {displayName}
            </span>
            <span className="sidebar-user-role">{roleLabel}</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-btn-logout"
          onClick={signOut}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}