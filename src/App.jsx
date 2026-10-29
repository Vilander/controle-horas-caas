import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login/Login';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Clientes } from './pages/Clientes/Clientes';
import { ModalCliente } from './components/ModalCliente/ModalCliente';
import './App.css';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('clientes');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!user) {
    return <Login />;
  }

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    // Redirecionamento para a Página 3 (Detalhes/Atividades)
    console.log('Cliente selecionado:', client);
  };

  const handleClientCreated = (newClient) => {
    // Força a atualização da listagem
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="app-main-content">
        {currentView === 'clientes' && (
          <Clientes
            key={refreshTrigger}
            onSelectClient={handleSelectClient}
            onOpenNewClientModal={() => setIsClientModalOpen(true)}
          />
        )}
        {currentView === 'relatorios' && (
          <div style={{ padding: '40px' }}>
            <h2>Área de Relatórios</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Módulo em desenvolvimento.</p>
          </div>
        )}
      </main>

      <ModalCliente
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={handleClientCreated}
      />
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