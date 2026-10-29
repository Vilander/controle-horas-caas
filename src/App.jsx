import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login/Login';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Clientes } from './pages/Clientes/Clientes';
import './App.css';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('clientes');

  if (!user) {
    return <Login />;
  }

  const handleSelectClient = (client) => {
    // Será conectado na próxima etapa (Página 3 - Detalhes do Cliente)
    alert(`Cliente selecionado: ${client.name}. Na próxima etapa abriremos a tela de atividades.`);
  };

  const handleOpenNewClientModal = () => {
    // Será conectado com o ModalCliente (Página 2 do wireframe)
    alert('Abrir modal de cadastro de novo cliente.');
  };

  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="app-main-content">
        {currentView === 'clientes' && (
          <Clientes
            onSelectClient={handleSelectClient}
            onOpenNewClientModal={handleOpenNewClientModal}
          />
        )}
        {currentView === 'relatorios' && (
          <div style={{ padding: '40px' }}>
            <h2>Área de Relatórios</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Módulo em desenvolvimento.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}