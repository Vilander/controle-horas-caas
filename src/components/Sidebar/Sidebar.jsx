import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export function Sidebar({ currentView, setCurrentView }) {
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const roleLabel = profile?.role === 'admin' ? 'Administrador(a)' : 'Consultor(a)';
  
  // Iniciais para o avatar
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <aside className="sidebar-container">
      <div className="sidebar-header">
        <span className="sidebar-brand-badge">ÁREA DE TRABALHO</span>
        <h2 className="sidebar-brand-name">hora.</h2>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${currentView === 'clientes' ? 'active' : ''}`}
          onClick={() => setCurrentView('clientes')}
        >
          Clientes
        </button>
        <button
          className={`sidebar-nav-item ${currentView === 'relatorios' ? 'active' : ''}`}
          onClick={() => setCurrentView('relatorios')}
        >
          Relatórios
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">{initials || 'US'}</div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{displayName}</span>
            <span className="sidebar-user-role">{roleLabel}</span>
          </div>
        </div>
        <button className="sidebar-btn-logout" onClick={signOut}>
          Sair
        </button>
      </div>
    </aside>
  );
}