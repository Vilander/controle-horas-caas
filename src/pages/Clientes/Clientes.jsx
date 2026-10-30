import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';
import './Clientes.css';

export function Clientes({ 
  onSelectClient, 
  onOpenNewClientModal, 
  onOpenEditClientModal,
  onOpenNewUserModal,
  onOpenDeleteClientModal 
}) {
  const { user, profile, isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativo');

  const [metrics, setMetrics] = useState({
    activeCount: 0,
    totalMonthSeconds: 0,
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

      const now = new Date();
      const firstDayIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayIso = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          started_at,
          ended_at,
          duration_seconds,
          activity_id,
          activities!inner (
            client_id,
            clients ( name )
          )
        `)
        .gte('started_at', firstDayIso)
        .lte('started_at', lastDayIso);

      if (entriesError) throw entriesError;

      const durationByClient = {};
      let totalMonthSeconds = 0;
      let runningTimer = null;

      (entriesData || []).forEach((entry) => {
        const cId = entry.activities?.client_id;
        if (entry.ended_at) {
          const s = entry.duration_seconds || 0;
          if (cId) durationByClient[cId] = (durationByClient[cId] || 0) + s;
          totalMonthSeconds += s;
        } else if (!runningTimer) {
          runningTimer = {
            clientName: entry.activities?.clients?.name || 'Cliente',
            startedAt: entry.started_at,
          };
        }
      });

      if (!runningTimer) {
        const { data: globalActive } = await supabase
          .from('time_entries')
          .select(`started_at, activities!inner(clients(name))`)
          .is('ended_at', null)
          .limit(1)
          .maybeSingle();

        if (globalActive) {
          runningTimer = {
            clientName: globalActive.activities?.clients?.name || 'Cliente',
            startedAt: globalActive.started_at,
          };
        }
      }

      const decorated = (clientsData || []).map((c) => {
        let computedStatus = c.status || (c.is_active ? 'ativo' : 'inativo');
        const isExpired = c.contract_end_date && new Date(`${c.contract_end_date}T23:59:59`) < new Date();
        
        if (isExpired) {
          computedStatus = 'finalizado';
        }

        return {
          ...c,
          status: computedStatus,
          totalMonthSeconds: durationByClient[c.id] || 0,
        };
      });

      setClients(decorated);
      setMetrics({
        activeCount: decorated.filter((c) => c.status === 'ativo').length,
        totalMonthSeconds,
        activeTimer: runningTimer,
      });
    } catch (err) {
      console.error('Erro ao listar clientes:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleStatus = async (e, client) => {
    e.stopPropagation();
    if (!isAdmin) return;

    if (client.status === 'finalizado') {
      alert('Contratos finalizados não podem ser alterados diretamente.');
      return;
    }

    const newStatus = client.status === 'ativo' ? 'inativo' : 'ativo';
    const newIsActive = newStatus === 'ativo';

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus, is_active: newIsActive })
        .eq('id', client.id);

      if (error) throw error;

      const operatorName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

      await logAuditEvent({
        userId: user?.id,
        userName: operatorName,
        action: newStatus === 'ativo' ? 'CLIENT_ACTIVATE' : 'CLIENT_DEACTIVATE',
        entityType: 'client',
        entityId: client.id,
        clientName: client.name,
        details: {
          status_anterior: client.status,
          novo_status: newStatus,
          motivo: newStatus === 'ativo' ? 'Reativação manual pelo administrador' : 'Pausa operacional temporária'
        }
      });

      loadDashboardData();
    } catch (err) {
      alert('Erro ao alterar situação: ' + err.message);
    }
  };

  const formatHoursMinutes = (secs) => {
    if (!secs || secs <= 0) return '0h 00min';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.contact_name && client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && client.status === statusFilter;
  });

  return (
    <div className="clientes-page">
      <header className="clientes-header">
        <div>
          <span className="clientes-breadcrumb">Gestão de horas / Clientes</span>
          <h1 className="clientes-title">Clientes</h1>
          <p className="clientes-subtitle">
            Cadastre seus clientes e acompanhe as horas dedicadas a cada operação.
          </p>
        </div>

        {isAdmin && (
          <div className="clientes-actions">
            {onOpenNewUserModal && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onOpenNewUserModal}
              >
                + Novo usuário
              </button>
            )}
            <button 
              type="button" 
              className="btn-primary" 
              onClick={onOpenNewClientModal}
            >
              + Cadastrar cliente
            </button>
          </div>
        )}
      </header>

      {/* Indicadores */}
      <div className="clientes-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Clientes ativos</span>
          <div className="metric-value">{metrics.activeCount}</div>
          <span className="metric-footer">Consultoria e operação comercial</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Horas encerradas no mês</span>
          <div className="metric-value">{formatHoursMinutes(metrics.totalMonthSeconds)}</div>
          <span className="metric-footer">Soma dos apontamentos finalizados</span>
        </div>

        <div className="metric-card metric-timer">
          <span className="metric-label">Cronômetro em andamento</span>
          <div className="metric-value metric-timer-value">
            {metrics.activeTimer ? 'Ativo' : '00:00:00'}
          </div>
          <span className="metric-footer">
            {metrics.activeTimer
              ? `${metrics.activeTimer.clientName} - não incluído no total`
              : 'Nenhum cronômetro ativo no momento'}
          </span>
        </div>
      </div>

      {/* Barra de Filtro e Busca com os 3 status */}
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
            <option value="ativo">Situação: ativos</option>
            <option value="inativo">Situação: inativos</option>
            <option value="finalizado">Situação: finalizados</option>
            <option value="all">Situação: todos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="clientes-table-card">
        {loading ? (
          <div className="table-status-msg">Carregando carteira de clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="table-status-msg">Nenhum cliente localizado nesta situação.</div>
        ) : (
          <table className="clientes-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>SERVIÇO</th>
                <th>CONTATO</th>
                <th>HORAS NO MÊS</th>
                {isAdmin && <th>VALOR/HORA</th>}
                <th style={{ textAlign: 'right' }}>ACESSO</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const badgeLetters = client.name.slice(0, 2).toUpperCase();
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
                          <div className={`client-status status-${client.status}`}>
                            • {client.status === 'ativo' ? 'Ativo' : client.status === 'inativo' ? 'Inativo' : 'Finalizado'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{client.service}</td>
                    <td>{client.contact_name || '—'}</td>
                    <td className="td-hours">
                      {formatHoursMinutes(client.totalMonthSeconds)}
                    </td>
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
                        {isAdmin && (
                          <>
                            {client.status !== 'finalizado' ? (
                              <button
                                type="button"
                                className={`btn-action-pill ${client.status === 'ativo' ? 'action-deactivate' : 'action-activate'}`}
                                title={client.status === 'ativo' ? 'Inativar cliente' : 'Ativar cliente'}
                                onClick={(e) => handleToggleStatus(e, client)}
                              >
                                {client.status === 'ativo' ? 'Inativar' : 'Ativar'}
                              </button>
                            ) : (
                              <span className="badge-pill-finalizado" title="Contrato encerrado">
                                Finalizado
                              </span>
                            )}

                            {onOpenEditClientModal && (
                              <button
                                type="button"
                                className="btn-action-icon"
                                title="Editar cliente"
                                onClick={() => onOpenEditClientModal(client)}
                              >
                                ✏️
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-action-icon btn-action-delete"
                              title="Excluir cliente"
                              onClick={() => onOpenDeleteClientModal(client)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        <span 
                          className="arrow-access" 
                          onClick={() => onSelectClient(client)}
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
            As horas da carteira consideram apenas apontamentos encerrados. Cronômetros ativos ficam separados.
          </span>
        </footer>
      </div>
    </div>
  );
}