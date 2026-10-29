import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './Clientes.css';

export function Clientes({ onSelectClient, onOpenNewClientModal }) {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Métricas do topo
  const [metrics, setMetrics] = useState({
    activeCount: 0,
    monthlySeconds: 0,
    activeTimer: null,
  });

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Busca todos os clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;

      // 2. Busca apontamentos para calcular totais encerrados e cronômetro em execução
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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

      // Mapeamento de segundos por cliente no mês corrente
      const monthlyDurationByClient = {};
      let totalMonthSeconds = 0;
      let runningTimer = null;

      (entriesData || []).forEach((entry) => {
        const clientId = entry.activities?.client_id;
        const isCurrentMonth = entry.started_at >= firstDayOfMonth;

        if (entry.ended_at) {
          // Registro encerrado
          if (isCurrentMonth && clientId) {
            const secs = entry.duration_seconds || 0;
            monthlyDurationByClient[clientId] = (monthlyDurationByClient[clientId] || 0) + secs;
            totalMonthSeconds += secs;
          }
        } else {
          // Cronômetro em execução no momento
          if (!runningTimer) {
            runningTimer = {
              clientName: entry.activities?.clients?.name || 'Cliente',
              startedAt: entry.started_at,
            };
          }
        }
      });

      // Anexa as horas calculadas ao array de clientes
      const decoratedClients = (clientsData || []).map((c) => ({
        ...c,
        totalSecondsMonth: monthlyDurationByClient[c.id] || 0,
      }));

      setClients(decoratedClients);
      setMetrics({
        activeCount: decoratedClients.filter((c) => c.is_active).length,
        monthlySeconds: totalMonthSeconds,
        activeTimer: runningTimer,
      });
    } catch (err) {
      console.error('Erro ao carregar dados dos clientes:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Formatação de segundos em "Xh YYmin"
  function formatHoursMinutes(totalSeconds) {
    if (!totalSeconds) return '0h 00min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }

  // Filtragem da tabela
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
            Cadastre seus clientes e acompanhe as horas dedicadas a cada operação.
          </p>
        </div>
        <div className="clientes-actions">
          {isAdmin && (
            <button className="btn-primary" onClick={onOpenNewClientModal}>
              + Cadastrar cliente
            </button>
          )}
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="clientes-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Clientes ativos</span>
          <div className="metric-value">{metrics.activeCount}</div>
          <span className="metric-footer">Consultoria e operação comercial</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Horas encerradas no mês</span>
          <div className="metric-value">{formatHoursMinutes(metrics.monthlySeconds)}</div>
          <span className="metric-footer">Apenas registros finalizados</span>
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
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Contato</th>
                <th>Horas no mês</th>
                <th>Valor/hora</th>
                <th className="th-action">Acesso</th>
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
                          <div className="client-tag">
                            {client.is_active ? '• Ativo' : '• Inativo'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{client.service}</td>
                    <td>{client.contact_name || '—'}</td>
                    <td className="td-hours">{formatHoursMinutes(client.totalSecondsMonth)}</td>
                    <td className="td-rate">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(client.hourly_rate)}
                    </td>
                    <td className="td-action">
                      <span className="arrow-access">→</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <footer className="table-footer-info">
          <span>{filteredClients.length} clientes encontrados</span>
          <span className="info-note">
            As horas da carteira consideram apenas apontamentos encerrados. Cronômetros ativos ficam separados.
          </span>
        </footer>
      </div>
    </div>
  );
}