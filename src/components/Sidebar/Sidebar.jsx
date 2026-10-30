import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export function Sidebar({ currentView, setCurrentView, onNavigate, onSignOut, onOpenAuditLogs }) {
  const auth = useAuth() || {};
  const profile = auth.profile;
  const user = auth.user;
  const signOut = onSignOut || auth.signOut;
  const navigate = setCurrentView || onNavigate;

  const displayName = 
    profile?.full_name || 
    user?.user_metadata?.full_name || 
    user?.user_metadata?.name || 
    user?.email?.split('@')[0] || 
    'Usuário';

  const roleLabel = profile?.role === 'admin' ? 'Administrador(a)' : 'Consultor(a)';
  const isAdmin = profile?.role === 'admin';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0].toUpperCase())
    .join('');

  return (
    <aside className="sidebar-container">
      <div className="sidebar-top-section">
        <div className="sidebar-brand-wrapper">
          <span className="sidebar-brand-badge">SISTEMA DE CONTROLE DE HORAS (SCH)</span>
          <div className="sidebar-logo-container">
            <img
              src="/Logo-Original.webp"
              alt="AS&V Growth Partner"
              className="sidebar-logo-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>

        <div className="sidebar-nav-section">
          <span className="sidebar-section-title">ÁREA DE TRABALHO</span>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-nav-item ${currentView === 'clientes' ? 'active' : ''}`}
              onClick={() => navigate && navigate('clientes')}
            >
              Clientes
            </button>
            <button
              type="button"
              className={`sidebar-nav-item ${currentView === 'relatorios' ? 'active' : ''}`}
              onClick={() => navigate && navigate('relatorios')}
            >
              Relatórios
            </button>

            {/* Botão de Histórico / Logs visível apenas para Admin */}
            {isAdmin && onOpenAuditLogs && (
              <button
                type="button"
                className="sidebar-nav-item sidebar-nav-audit"
                onClick={onOpenAuditLogs}
                title="Visualizar histórico e exportar registros em TXT"
              >
                Auditoria & Logs
              </button>
            )}
          </nav>
        </div>
      </div>

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