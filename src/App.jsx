import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login/Login';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Clientes } from './pages/Clientes/Clientes';
import { DetalheCliente } from './pages/DetalheCliente/DetalheCliente';
import { Relatorios } from './pages/Relatorios/Relatorios';

// Modais da Aplicação
import { ModalCliente } from './components/ModalCliente/ModalCliente';
import { ModalAtividade } from './components/ModalAtividade/ModalAtividade';
import { ModalLancamento } from './components/ModalLancamento/ModalLancamento';
import { ModalEditarAtividade } from './components/ModalAtividade/ModalEditarAtividade';
import { ModalExcluirAtividade } from './components/ModalExcluir/ModalExcluirAtividade';
import { ModalProrrogar } from './components/ModalProrrogar/ModalProrrogar';
import { ModalUsuario } from './components/ModalUsuario/ModalUsuario';

import './App.css';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('clientes');
  const [selectedClient, setSelectedClient] = useState(null);

  // Estados dos Modais de Clientes e Contratos
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [clientToProrrogar, setClientToProrrogar] = useState(null);

  // Estado do Modal de Usuários (Admin)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Estados dos Modais de Atividades e Apontamentos
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(null);

  // Lista de atividades do cliente selecionado para seleção no apontamento manual
  const [clientActivities, setClientActivities] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const triggerRefresh = () => {
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
        {/* Rota 1: Lista de Clientes */}
        {currentView === 'clientes' && !selectedClient && (
          <Clientes
            key={refreshTrigger}
            onSelectClient={handleSelectClient}
            onOpenNewClientModal={() => {
              setClientToEdit(null);
              setIsClientModalOpen(true);
            }}
            onOpenEditClientModal={(client) => {
              setClientToEdit(client);
              setIsClientModalOpen(true);
            }}
            onOpenNewUserModal={() => setIsUserModalOpen(true)}
            onOpenProrrogarModal={(client) => setClientToProrrogar(client)}
          />
        )}

        {/* Rota 2: Detalhes e Planilha de Atividades do Cliente */}
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

        {/* Rota 3: Relatório de Horas e Fechamento */}
        {currentView === 'relatorios' && (
          <Relatorios initialClientId={selectedClient?.id} />
        )}
      </main>

      {/* --- DIÁLOGOS E MODAIS --- */}

      {/* 1. Cadastro e Edição de Clientes (com Vigência de Contrato) */}
      <ModalCliente
        isOpen={isClientModalOpen}
        clientToEdit={clientToEdit}
        onClose={() => {
          setIsClientModalOpen(false);
          setClientToEdit(null);
        }}
        onClientSaved={triggerRefresh}
      />

      {/* 2. Prorrogação ou Encerramento de Contrato */}
      <ModalProrrogar
        isOpen={!!clientToProrrogar}
        client={clientToProrrogar}
        onClose={() => setClientToProrrogar(null)}
        onUpdated={triggerRefresh}
      />

      {/* 3. Cadastro de Novo Usuário (Privilégios Admin / Consultant) */}
      <ModalUsuario
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onUserCreated={triggerRefresh}
      />

      {/* 4. Nova Atividade */}
      <ModalAtividade
        isOpen={isActivityModalOpen}
        client={selectedClient}
        onClose={() => setIsActivityModalOpen(false)}
        onActivityCreated={triggerRefresh}
      />

      {/* 5. Lançamento Manual de Horas */}
      <ModalLancamento
        isOpen={isManualModalOpen}
        client={selectedClient}
        activities={clientActivities}
        onClose={() => setIsManualModalOpen(false)}
        onEntryCreated={triggerRefresh}
      />

      {/* 6. Edição de Atividade, Responsáveis e Correção de Apontamentos */}
      <ModalEditarAtividade
        isOpen={!!editingActivity}
        activity={editingActivity}
        client={selectedClient}
        onClose={() => setEditingActivity(null)}
        onUpdated={triggerRefresh}
      />

      {/* 7. Exclusão de Atividade */}
      <ModalExcluirAtividade
        isOpen={!!deletingActivity}
        activity={deletingActivity}
        client={selectedClient}
        onClose={() => setDeletingActivity(null)}
        onDeleted={triggerRefresh}
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