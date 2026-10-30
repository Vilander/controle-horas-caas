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
import { ModalExcluirCliente } from './components/ModalExcluir/ModalExcluirCliente';
import { ModalProrrogar } from './components/ModalProrrogar/ModalProrrogar';
import { ModalUsuario } from './components/ModalUsuario/ModalUsuario';
import { ModalHistoricoLogs } from './components/ModalHistoricoLogs/ModalHistoricoLogs';

import './App.css';

function MainApp() {
  const { user, profile, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('clientes');
  const [selectedClient, setSelectedClient] = useState(null);

  // Estados dos Modais de Clientes e Contratos
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [clientToProrrogar, setClientToProrrogar] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);

  // Estado do Modal de Usuários (Admin)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Estado do Modal de Histórico e Auditoria de Logs (Admin)
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);

  // Estados dos Modais de Atividades e Apontamentos
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(null);

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
        onNavigate={(view) => {
          setSelectedClient(null);
          setCurrentView(view);
        }}
        userProfile={profile}
        user={user}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
      />

      <main className="app-main-content">
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
            onOpenDeleteClientModal={(client) => setDeletingClient(client)}
            onOpenNewUserModal={() => setIsUserModalOpen(true)}
            onOpenProrrogarModal={(client) => setClientToProrrogar(client)}
          />
        )}

        {currentView === 'clientes' && selectedClient && (
          <DetalheCliente
            key={`${selectedClient.id}-${refreshTrigger}`}
            client={selectedClient}
            onBack={handleBackToClients}
            onOpenNewActivity={() => setIsActivityModalOpen(true)}
            onOpenManualEntry={() => setIsManualModalOpen(true)}
            onActivitiesLoaded={(acts) => setClientActivities(acts)}
            onEditActivity={(act) => setEditingActivity(act)}
            onDeleteActivity={(act) => setDeletingActivity(act)}
            onOpenEditClientModal={(client) => {
              setClientToEdit(client);
              setIsClientModalOpen(true);
            }}
          />
        )}

        {currentView === 'relatorios' && (
          <Relatorios initialClientId={selectedClient?.id} />
        )}
      </main>

      {/* Modais Globais */}
      <ModalCliente
        isOpen={isClientModalOpen}
        clientToEdit={clientToEdit}
        onClose={() => {
          setIsClientModalOpen(false);
          setClientToEdit(null);
        }}
        onClientSaved={triggerRefresh}
      />

      <ModalProrrogar
        isOpen={!!clientToProrrogar}
        client={clientToProrrogar}
        onClose={() => setClientToProrrogar(null)}
        onUpdated={triggerRefresh}
      />

      <ModalUsuario
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onUserCreated={triggerRefresh}
      />

      <ModalAtividade
        isOpen={isActivityModalOpen}
        client={selectedClient}
        onClose={() => setIsActivityModalOpen(false)}
        onActivityCreated={triggerRefresh}
      />

      <ModalLancamento
        isOpen={isManualModalOpen}
        client={selectedClient}
        activities={clientActivities}
        onClose={() => setIsManualModalOpen(false)}
        onEntryCreated={triggerRefresh}
      />

      <ModalEditarAtividade
        isOpen={!!editingActivity}
        activity={editingActivity}
        client={selectedClient}
        onClose={() => setEditingActivity(null)}
        onUpdated={triggerRefresh}
      />

      <ModalExcluirAtividade
        isOpen={!!deletingActivity}
        activity={deletingActivity}
        client={selectedClient}
        onClose={() => setDeletingActivity(null)}
        onDeleted={triggerRefresh}
      />

      {/* Modal de Exclusão de Cliente com Motivo e Auditoria */}
      <ModalExcluirCliente
        isOpen={!!deletingClient}
        client={deletingClient}
        onClose={() => setDeletingClient(null)}
        onDeleted={triggerRefresh}
      />

      {isAdmin && (
        <ModalHistoricoLogs
          isOpen={isAuditLogsOpen}
          onClose={() => setIsAuditLogsOpen(false)}
        />
      )}
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