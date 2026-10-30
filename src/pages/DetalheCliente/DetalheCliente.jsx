import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ActiveTimerBanner } from '../../components/ActiveTimerBanner/ActiveTimerBanner';
import './DetalheCliente.css';

export function DetalheCliente({ 
  client, 
  onBack, 
  onOpenNewActivity, 
  onOpenManualEntry, 
  onActivitiesLoaded,
  onEditActivity,
  onDeleteActivity,
  onOpenEditClientModal
}) {
  const { user, isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [activeTimerEntry, setActiveTimerEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  async function loadClientActivities() {
    setLoading(true);
    try {
      // 1. Carrega as atividades do cliente
      const { data: actsData, error: actsError } = await supabase
        .from('activities')
        .select('*, activity_assignees(profiles(id, full_name))')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true });

      if (actsError) throw actsError;

      // 2. Carrega todos os apontamentos vinculados a este cliente
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('*, activities!inner(client_id, name)')
        .eq('activities.client_id', client.id);

      if (entriesError) throw entriesError;

      let runningEntry = null;
      const metricsByActivity = {};

      (entriesData || []).forEach((entry) => {
        if (!entry.ended_at) {
          runningEntry = entry;
        } else {
          const actId = entry.activity_id;
          if (!metricsByActivity[actId]) {
            metricsByActivity[actId] = { totalSeconds: 0, count: 0 };
          }
          metricsByActivity[actId].totalSeconds += entry.duration_seconds || 0;
          metricsByActivity[actId].count += 1;
        }
      });

      const decorated = (actsData || []).map((act) => ({
        ...act,
        assignees: (act.activity_assignees || []).map((aa) => aa.profiles).filter(Boolean),
        totalSeconds: metricsByActivity[act.id]?.totalSeconds || 0,
        entryCount: metricsByActivity[act.id]?.count || 0,
        isRunning: runningEntry ? runningEntry.activity_id === act.id : false,
      }));

      setActivities(decorated);
      setActiveTimerEntry(runningEntry);

      if (typeof onActivitiesLoaded === 'function') {
        onActivitiesLoaded(decorated);
      }
    } catch (err) {
      console.error('Erro ao carregar atividades do cliente:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (client?.id) {
      loadClientActivities();
    }
  }, [client?.id]);

  const handleStartTimer = async (activityId) => {
    try {
      if (activeTimerEntry?.id) {
        await supabase
          .from('time_entries')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', activeTimerEntry.id);
      }

      const { error } = await supabase
        .from('time_entries')
        .insert([
          {
            activity_id: activityId,
            user_id: user.id,
            started_at: new Date().toISOString(),
            ended_at: null,
            origin: 'timer',
          },
        ]);

      if (error) throw error;
      await loadClientActivities();
    } catch (err) {
      alert('Erro ao iniciar cronômetro: ' + err.message);
    }
  };

  const handlePauseTimer = async (specificEntryId) => {
    try {
      let targetId = specificEntryId || activeTimerEntry?.id;

      if (!targetId) {
        const { data: openEntry } = await supabase
          .from('time_entries')
          .select('id, activities!inner(client_id)')
          .eq('activities.client_id', client.id)
          .is('ended_at', null)
          .limit(1)
          .maybeSingle();

        if (openEntry) targetId = openEntry.id;
      }

      if (!targetId) {
        await loadClientActivities();
        return;
      }

      const { error } = await supabase
        .from('time_entries')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', targetId);

      if (error) throw error;
      await loadClientActivities();
    } catch (err) {
      alert('Erro ao pausar cronômetro: ' + err.message);
    }
  };

  function formatHoursMinutes(totalSeconds) {
    if (!totalSeconds) return '0h 00min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }

  const totalClientSeconds = activities.reduce((acc, act) => acc + act.totalSeconds, 0);
  const totalClientDecimalHours = totalClientSeconds / 3600;
  const totalFinancialValue = totalClientDecimalHours * Number(client?.hourly_rate || 0);

  const filteredActivities = activities.filter(
    (act) =>
      act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="detalhe-page">
      <header className="detalhe-header">
        <div>
          <button className="btn-breadcrumb-back" onClick={onBack}>
            ← Clientes
          </button>
          <div className="detalhe-title-row">
            <h1 className="detalhe-client-name">{client.name}</h1>
            {/* Botão de editar cliente exibido apenas para Administradores */}
            {isAdmin && onOpenEditClientModal && (
              <button 
                type="button" 
                className="btn-edit-client-header"
                onClick={() => onOpenEditClientModal(client)}
              >
                ✏️ Editar cliente
              </button>
            )}
          </div>
          <p className="detalhe-client-meta">
            {client.service} &bull; Contato: {client.contact_name || 'Não informado'}
            {/* Valor/hora ocultado para consultores */}
            {isAdmin && (
              <>
                {' '}&bull;{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  client.hourly_rate
                )}
                /h
              </>
            )}
          </p>
        </div>
      </header>

      {/* Cards de Métricas: 3 cards para Admin (com Financeiro) e 2 para Consultor */}
      <div className={`detalhe-metrics-grid ${isAdmin ? 'three-cards' : 'two-cards'}`}>
        <div className="detalhe-metric-card">
          <span className="metric-label">Horas encerradas (total geral)</span>
          <div className="metric-value">{formatHoursMinutes(totalClientSeconds)}</div>
          <span className="metric-footer">Total acumulado desde o início do contrato</span>
        </div>

        {isAdmin && (
          <div className="detalhe-metric-card">
            <span className="metric-label">Valor total das horas encerradas</span>
            <div className="metric-value" style={{ color: 'var(--color-primary, #000080)' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalFinancialValue
              )}
            </div>
            <span className="metric-footer">
              {totalClientDecimalHours.toFixed(2)}h &times; R$ {Number(client?.hourly_rate || 0).toFixed(2)}/h
            </span>
          </div>
        )}

        <div className="detalhe-metric-card">
          <span className="metric-label">Em andamento - hoje</span>
          <div className="metric-value" style={{ color: 'var(--color-accent, #71226B)' }}>
            {activeTimerEntry ? 'Ativo' : '00:00:00'}
          </div>
          <span className="metric-footer">
            {activeTimerEntry ? 'Sessão em curso' : 'Ainda não contabilizado'}
          </span>
        </div>
      </div>

      {/* Faixa de Destaque com Cronômetro em Execução */}
      {activeTimerEntry && (
        <ActiveTimerBanner
          activeEntry={activeTimerEntry}
          onPause={() => handlePauseTimer(activeTimerEntry.id)}
        />
      )}

      {/* Barra de Ações Operacionais */}
      <div className="detalhe-toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Q Buscar atividade ou descrição"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-buttons">
          <button className="btn-secondary" onClick={() => onOpenManualEntry(client)}>
            Lançamento manual
          </button>
          <button className="btn-primary" onClick={() => onOpenNewActivity(client)}>
            + Nova atividade
          </button>
        </div>
      </div>

      {/* Tabela de Atividades do Cliente */}
      <div className="detalhe-table-card">
        {loading ? (
          <div className="table-status">Carregando atividades...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="table-status">Nenhuma atividade cadastrada para este cliente.</div>
        ) : (
          <table className="detalhe-table">
            <thead>
              <tr>
                <th>ATIVIDADE / DESCRIÇÃO</th>
                <th>HORAS ENCERRADAS</th>
                <th>SITUAÇÃO</th>
                <th>CRONÔMETRO</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((act) => (
                <tr key={act.id}>
                  <td>
                    <div className="act-title">{act.name}</div>
                    <div className="act-desc">{act.description || 'Sem descrição.'}</div>
                    {act.assignees && act.assignees.length > 0 && (
                      <div className="act-assignees-badge">
                        👤 {act.assignees.map((a) => a.full_name).join(', ')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="act-hours">{formatHoursMinutes(act.totalSeconds)}</div>
                    <div className="act-count">{act.entryCount} apontamentos</div>
                  </td>
                  <td>
                    <span className={`badge-status ${act.isRunning ? 'status-running' : ''}`}>
                      {act.isRunning ? 'Em andamento' : 'Pausada'}
                    </span>
                  </td>
                  <td>
                    {act.isRunning ? (
                      <button
                        className="btn-timer-action btn-timer-pause"
                        onClick={() => handlePauseTimer(activeTimerEntry?.id)}
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        className="btn-timer-action btn-timer-play"
                        onClick={() => handleStartTimer(act.id)}
                      >
                        Iniciar
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-cell">
                      <button
                        className="btn-action-icon"
                        title="Editar atividade e apontamentos"
                        onClick={() => onEditActivity(act)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-action-icon btn-action-delete"
                        title="Excluir atividade"
                        onClick={() => onDeleteActivity(act)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}