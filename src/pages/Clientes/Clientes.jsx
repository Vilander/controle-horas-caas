import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { getContractStatusAlert } from '../../utils/contractAlerts';
import './Clientes.css';

export function Clientes({ 
  onSelectClient, 
  onOpenNewClientModal, 
  onOpenEditClientModal, 
  onOpenNewUserModal,
  onOpenProrrogarModal
}) {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const [metrics, setMetrics] = useState({
    activeCount: 0,
    activeTimer: null,
  });

  async function loadDashboardData() {
    setLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;

      // Busca cronômetro ativo global
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          started_at,
          ended_at,
          activities (
            clients (
              name
            )
          )
        `)
        .is('ended_at', null)
        .limit(1)
        .maybeSingle();

      if (entriesError) throw entriesError;

      let runningTimer = null;
      if (entriesData) {
        runningTimer = {
          clientName: entriesData.activities?.clients?.name || 'Cliente',
          startedAt: entriesData.started_at,
        };
      }

      setClients(clientsData || []);
      setMetrics({
        activeCount: (clientsData || []).filter((c) => c.is_active).length,
        activeTimer: runningTimer,
      });
    } catch (err) {
      console.error('Erro ao carregar carteira de clientes:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleActive = async (e, client) => {
    e.stopPropagation();
    const newStatus = !client.is_active;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: newStatus })
        .eq('id', client.id);

      if (error) throw error;
      loadDashboardData();
    } catch (err) {
      alert('Erro ao alterar status do cliente: ' + err.message);
    }
  };

  const handleDeleteClient = async (e, client) => {
    e.stopPropagation();
    if (!confirm(`Deseja realmente excluir ${client.name}? Todas as atividades e apontamentos serão removidos.`)) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;
      loadDashboardData();
    } catch (err) {
      alert('Erro ao excluir cliente: ' + err.message);
    }
  };

  // Identifica clientes com avisos contratuais pendentes
  const contractAlerts = clients
    .map((c) => ({ client: c, alert: getContractStatusAlert(c.contract_end_date) }))
    .filter((item) => item.alert !== null);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.contact_name && client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && client.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !client.is_active;
    return matchesSearch;
  });

  return (
    <div className="clientes-page">
      {/* Topo / Cabeçalho */}
      <header className="clientes-header">
        <div>
          <span className="clientes-breadcrumb">Gestão de horas / Clientes</span>
          <h1 className="clientes-title">Clientes</h1>
          <p className="clientes-subtitle">
            Cadastre seus clientes, controle vigências contratuais e acompanhe as operações.
          </p>
        </div>
        <div className="clientes-actions">
          {isAdmin && (
            <>
              <button className="btn-secondary" onClick={onOpenNewUserModal}>
                + Novo usuário
              </button>
              <button className="btn-primary" onClick={onOpenNewClientModal}>
                + Cadastrar cliente
              </button>
            </>
          )}
        </div>
      </header>

      {/* Alertas de Vencimento de Contrato (30, 15, 7, 1 dia) */}
      {contractAlerts.length > 0 && (
        <div className="contract-alerts-box">
          {contractAlerts.map(({ client, alert: itemAlert }) => (
            <div key={client.id} className={`contract-alert-item alert-${itemAlert.severity}`}>
              <div>
                <strong>{client.name}:</strong> {itemAlert.message}
              </div>
              <button
                type="button"
                className="btn-alert-action"
                onClick={() => onOpenProrrogarModal(client)}
              >
                Prorrogar / Encerrar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cards de Métricas (2 cards: Clientes ativos e Cronômetro em andamento) */}
      <div className="clientes-metrics-grid two-cards">
        <div className="metric-card">
          <span className="metric-label">Clientes ativos</span>
          <div className="metric-value">{metrics.activeCount}</div>
          <span className="metric-footer">Consultoria e operação comercial ativa</span>
        </div>

        <div className="metric-card metric-timer">
          <span className="metric-label">Cronômetro em andamento</span>
          <div className="metric-value metric-timer-value">
            {metrics.activeTimer ? 'Ativo' : '00:00:00'}
          </div>
          <span className="metric-footer">
            {metrics.activeTimer
              ? `${metrics.activeTimer.clientName} - sessão ativa em curso`
              : 'Nenhum cronômetro ativo no momento'}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="clientes-filter-bar">
        <div className="clientes-search-box">
          <input
            type="text"
            placeholder="Q Buscar por cliente ou contato"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="clientes-status-select">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Situação: ativos</option>
            <option value="inactive">Situação: inativos</option>
            <option value="all">Situação: todos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Clientes com Ações */}
      <div className="clientes-table-card">
        {loading ? (
          <div className="table-loading">Carregando dados da carteira...</div>
        ) : filteredClients.length === 0 ? (
          <div className="table-empty">Nenhum cliente encontrado com os filtros atuais.</div>
        ) : (
          <table className="clientes-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>VIGÊNCIA</th>
                <th>SERVIÇO</th>
                <th>CONTATO</th>
                <th>VALOR/HORA</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const badgeLetters = client.name.slice(0, 2).toUpperCase();
                const endFormatted = client.contract_end_date
                  ? new Date(client.contract_end_date + 'T00:00:00').toLocaleDateString('pt-BR')
                  : 'Indeterminado';

                return (
                  <tr
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="tr-clickable"
                  >
                    <td>
                      <div className="client-identity">
                        <div className="client-badge">{badgeLetters}</div>
                        <div>
                          <div className="client-name">{client.name}</div>
                          <div className={`client-tag ${client.is_active ? 'tag-active' : 'tag-inactive'}`}>
                            {client.is_active ? '• Ativo' : '• Inativo'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        Término: <strong>{endFormatted}</strong>
                      </div>
                    </td>
                    <td>{client.service}</td>
                    <td>{client.contact_name || '—'}</td>
                    <td className="td-rate">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(client.hourly_rate)}
                    </td>
                    <td className="td-action" onClick={(e) => e.stopPropagation()}>
                      <div className="client-table-actions">
                        <button
                          type="button"
                          className="btn-action-pill"
                          title={client.is_active ? 'Inativar cliente' : 'Ativar cliente'}
                          onClick={(e) => handleToggleActive(e, client)}
                        >
                          {client.is_active ? 'Inativar' : 'Ativar'}
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="btn-action-icon"
                              title="Editar dados do cliente"
                              onClick={() => onOpenEditClientModal(client)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-action-icon btn-action-delete"
                              title="Excluir cliente"
                              onClick={(e) => handleDeleteClient(e, client)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        <span className="arrow-access" onClick={() => onSelectClient(client)}>→</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <footer className="table-footer-info">
          <span>{filteredClients.length} cliente(s) listado(s)</span>
          <span className="info-note">
            Selecione uma linha para acessar a planilha de atividades e cronômetros do cliente.
          </span>
        </footer>
      </div>
    </div>
  );
}