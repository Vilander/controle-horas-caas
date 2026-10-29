import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login/Login';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Clientes } from './pages/Clientes/Clientes';
import { DetalheCliente } from './pages/DetalheCliente/DetalheCliente';
import { ModalCliente } from './components/ModalCliente/ModalCliente';
import { ModalAtividade } from './components/ModalAtividade/ModalAtividade';
import { ModalLancamento } from './components/ModalLancamento/ModalLancamento';
import { ModalEditarAtividade } from './components/ModalAtividade/ModalEditarAtividade';
import { ModalExcluirAtividade } from './components/ModalExcluir/ModalExcluirAtividade';
import { Relatorios } from './pages/Relatorios/Relatorios';

import './App.css';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('clientes');
  const [selectedClient, setSelectedClient] = useState(null);

  // Estados dos Modais
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Lista de atividades do cliente corrente para o select do lançamento manual
  const [clientActivities, setClientActivities] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [editingActivity, setEditingActivity] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(null); 

  if (!user) {
    return <Login />;
  }

  const handleSelectClient = (client) => {
    setSelectedClient(client);
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setSelectedClient(null);
          setCurrentView(view);
        }}
      />

      <main className="app-main-content">
        {currentView === 'clientes' && !selectedClient && (
          <Clientes
            key={refreshTrigger}
            onSelectClient={handleSelectClient}
            onOpenNewClientModal={() => setIsClientModalOpen(true)}
          />
        )}

        {currentView === 'clientes' && selectedClient && (
          <DetalheCliente
            key={refreshTrigger}
            client={selectedClient}
            onBack={handleBackToClients}
            onOpenNewActivity={() => setIsActivityModalOpen(true)}
            onOpenManualEntry={() => setIsManualModalOpen(true)}
            onActivitiesLoaded={(acts) => setClientActivities(acts)}
            onEditActivity={(act) => setEditingActivity(act)}
            onDeleteActivity={(act) => setDeletingActivity(act)}
          />
        )}

        {currentView === 'relatorios' && (
          <Relatorios initialClientId={selectedClient?.id} />
        )}
      </main>

      {/* 1. Modal de Cadastro de Cliente */}
      <ModalCliente
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* 2. Modal de Nova Atividade */}
      <ModalAtividade
        isOpen={isActivityModalOpen}
        client={selectedClient}
        onClose={() => setIsActivityModalOpen(false)}
        onActivityCreated={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* 3. Modal de Lançamento Manual */}
      <ModalLancamento
        isOpen={isManualModalOpen}
        client={selectedClient}
        activities={clientActivities}
        onClose={() => setIsManualModalOpen(false)}
        onEntryCreated={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* 4. Modal de Edição de Atividade */}
      <ModalEditarAtividade
        isOpen={!!editingActivity}
        activity={editingActivity}
        client={selectedClient}
        onClose={() => setEditingActivity(null)}
        onUpdated={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ModalExcluirAtividade
        isOpen={!!deletingActivity}
        activity={deletingActivity}
        client={selectedClient}
        onClose={() => setDeletingActivity(null)}
        onDeleted={() => setRefreshTrigger((prev) => prev + 1)}
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