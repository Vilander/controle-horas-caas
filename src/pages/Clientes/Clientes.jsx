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
    totalAllTimeSeconds: 0,
    activeTimer: null,
  });

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Busca carteira de clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;

      // 2. Busca apontamentos de tempo para acumular histórico geral
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          started_at,
          ended_at,
          duration_seconds,
          activity_id,
          activities (
            client_id,
            clients (
              name
            )
          )
        `);

      if (entriesError) throw entriesError;

      const totalDurationByClient = {};
      let totalAllTimeSeconds = 0;
      let runningTimer = null;

      (entriesData || []).forEach((entry) => {
        const clientId = entry.activities?.client_id;

        if (entry.ended_at) {
          const secs = entry.duration_seconds || 0;
          if (clientId) {
            totalDurationByClient[clientId] = (totalDurationByClient[clientId] || 0) + secs;
          }
          totalAllTimeSeconds += secs;
        } else if (!runningTimer) {
          runningTimer = {
            clientName: entry.activities?.clients?.name || 'Cliente',
            startedAt: entry.started_at,
          };
        }
      });

      const decoratedClients = (clientsData || []).map((c) => ({
        ...c,
        totalSecondsGeneral: totalDurationByClient[c.id] || 0,
      }));

      setClients(decoratedClients);
      setMetrics({
        activeCount: decoratedClients.filter((c) => c.is_active).length,
        totalAllTimeSeconds,
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
    if (!isAdmin) return;

    const newStatus = !client.is_active;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: newStatus })
        .eq('id', client.id);

      if (error) throw error;
      loadDashboardData();
    } catch (err) {
      alert('Erro ao alterar situação do cliente: ' + err.message);
    }
  };

  const handleDeleteClient = async (e, client) => {
    e.stopPropagation();
    if (!isAdmin) return;

    if (!confirm(`Deseja realmente excluir ${client.name}? Todas as atividades e registros de tempo vinculados serão removidos permanentemente.`)) {
      return;
    }

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

  function formatHoursMinutes(totalSeconds) {
    if (!totalSeconds) return '0h 00min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }

  // Notificações de vigência (30, 15, 7, 1 dia)
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
      <header className="clientes-header">
        <div>
          <span className="clientes-breadcrumb">Gestão de horas / Clientes</span>
          <h1 className="clientes-title">Clientes</h1>
          <p className="clientes-subtitle">
            Cadastre seus clientes, acompanhe as vigências contratuais e monitore as horas dedicadas a cada operação.
          </p>
        </div>
        
        {/* Ações de criação exclusivas para Administradores */}
        {isAdmin && (
          <div className="clientes-actions">
            <button className="btn-secondary" onClick={onOpenNewUserModal}>
              + Novo usuário
            </button>
            <button className="btn-primary" onClick={onOpenNewClientModal}>
              + Cadastrar cliente
            </button>
          </div>
        )}
      </header>

      {/* Alertas de Vencimento de Contrato (Apenas visíveis com ação se for Admin) */}
      {isAdmin && contractAlerts.length > 0 && (
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

      {/* Cartões de Indicadores Gerais */}
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

      {/* Filtros e Busca */}
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

      {/* Tabela de Clientes */}
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
                <th>HORAS TOTAIS</th>
                {isAdmin && <th>VALOR/HORA</th>}
                <th style={{ textAlign: 'right' }}>ACESSO</th>
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
                    <td className="td-hours">
                      {formatHoursMinutes(client.totalSecondsGeneral)}
                    </td>
                    
                    {/* Tarifa/hora visível apenas para Administradores */}
                    {isAdmin && (
                      <td className="td-rate">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(client.hourly_rate)}
                      </td>
                    )}

                    <td className="td-action" onClick={(e) => e.stopPropagation()}>
                      <div className="client-table-actions">
                        {/* Botões restritos para Administradores */}
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="btn-action-pill"
                              title={client.is_active ? 'Inativar cliente' : 'Ativar cliente'}
                              onClick={(e) => handleToggleActive(e, client)}
                            >
                              {client.is_active ? 'Inativar' : 'Ativar'}
                            </button>
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
                        <span 
                          className="arrow-access" 
                          onClick={() => onSelectClient(client)}
                          title="Abrir atividades do cliente"
                        >
                          →
                        </span>
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