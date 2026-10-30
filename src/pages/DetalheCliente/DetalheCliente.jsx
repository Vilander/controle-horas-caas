import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ModalDetalhesCliente } from '../../components/ModalDetalhesCliente/ModalDetalhesCliente';
import { ModalAvisoStatusCliente } from '../../components/ModalAvisoStatus/ModalAvisoStatusCliente';
import { logAuditEvent } from '../../services/auditService';
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
  const { user, profile, isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [activeTimerEntry, setActiveTimerEntry] = useState(null);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStatusWarningOpen, setIsStatusWarningOpen] = useState(false);

  const timerIntervalRef = useRef(null);

  const operatorName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuário';

  const isOperacaoBloqueada = client.status === 'inativo' || client.status === 'finalizado';

  const formatHMS = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatHoursMinutes = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return '0h 00min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  async function loadClientData() {
    setLoading(true);
    try {
      const { data: actsData, error: actsError } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true });

      if (actsError) throw actsError;

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
      loadClientData();
    }
  }, [client?.id]);

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (activeTimerEntry && !activeTimerEntry.ended_at) {
      const updateSeconds = () => {
        const startMs = new Date(activeTimerEntry.started_at).getTime();
        const nowMs = Date.now();
        const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        setActiveTimerSeconds(elapsed);
      };

      updateSeconds();
      timerIntervalRef.current = setInterval(updateSeconds, 1000);
    } else {
      setActiveTimerSeconds(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimerEntry]);

  const handleStartTimer = async (activityId) => {
    if (isOperacaoBloqueada) {
      setIsStatusWarningOpen(true);
      return;
    }

    try {
      const { data: openEntries } = await supabase
        .from('time_entries')
        .select('id, activity_id')
        .is('ended_at', null);

      if (openEntries && openEntries.length > 0) {
        for (const entry of openEntries) {
          await supabase
            .from('time_entries')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', entry.id);

          await logAuditEvent({
            userId: user?.id,
            userName: operatorName,
            action: 'TIMER_PAUSE',
            entityType: 'time_entry',
            entityId: entry.id,
            clientName: client.name,
            details: { motivo: 'Pausa automática por alternância de cronômetro' },
          });
        }
      }

      const { data: newEntry, error } = await supabase
        .from('time_entries')
        .insert([
          {
            activity_id: activityId,
            user_id: user?.id,
            started_at: new Date().toISOString(),
            ended_at: null,
            origin: 'timer',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const actRef = activities.find((a) => a.id === activityId);
      await logAuditEvent({
        userId: user?.id,
        userName: operatorName,
        action: 'TIMER_START',
        entityType: 'time_entry',
        entityId: newEntry?.id,
        clientName: client.name,
        details: {
          activity_id: activityId,
          activity_name: actRef?.name || 'Atividade',
          started_at: newEntry?.started_at,
        },
      });

      await loadClientData();
    } catch (err) {
      alert('Erro ao iniciar cronômetro: ' + err.message);
    }
  };

  const handlePauseTimer = async (specificEntryId) => {
    try {
      const targetId = specificEntryId || activeTimerEntry?.id;
      if (!targetId) return;

      const { error } = await supabase
        .from('time_entries')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      if (error) throw error;

      await logAuditEvent({
        userId: user?.id,
        userName: operatorName,
        action: 'TIMER_PAUSE',
        entityType: 'time_entry',
        entityId: targetId,
        clientName: client.name,
        details: {
          activity_id: activeTimerEntry?.activity_id,
          activity_name: activeTimerEntry?.activities?.name,
          ended_at: new Date().toISOString(),
        },
      });

      await loadClientData();
    } catch (err) {
      alert('Erro ao pausar cronômetro: ' + err.message);
    }
  };

  const handleInterceptNewActivity = () => {
    if (isOperacaoBloqueada) {
      setIsStatusWarningOpen(true);
      return;
    }
    onOpenNewActivity(client);
  };

  const handleInterceptManualEntry = () => {
    if (isOperacaoBloqueada) {
      setIsStatusWarningOpen(true);
      return;
    }
    onOpenManualEntry(client);
  };

  const totalClientSeconds = activities.reduce((acc, act) => acc + act.totalSeconds, 0);
  const totalClientDecimalHours = totalClientSeconds / 3600;
  const hourlyRate = Number(client?.hourly_rate || 0);
  const totalFinancialValue = totalClientDecimalHours * hourlyRate;

  const contractHours = client?.contract_hours ? Number(client.contract_hours) : null;
  const hasHourPackage = contractHours !== null && client?.billing_model !== 'postpaid';

  const contractSeconds = hasHourPackage ? contractHours * 3600 : 0;
  const balanceSeconds = hasHourPackage ? contractSeconds - totalClientSeconds : 0;
  const isOverLimit = balanceSeconds < 0;
  const remainingSeconds = !isOverLimit ? balanceSeconds : 0;
  const exceededSeconds = isOverLimit ? Math.abs(balanceSeconds) : 0;

  const filteredActivities = activities.filter(
    (act) =>
      act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="detalhe-page">
      {/* Cabeçalho da Página */}
      <header className="detalhe-header">
        <div>
          <button className="btn-breadcrumb-back" onClick={onBack}>
            ← Clientes
          </button>
          <div className="detalhe-title-row">
            <h1 className="detalhe-client-name">{client.name}</h1>
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
            {isAdmin && (
              <>
                {' '}&bull;{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hourlyRate)}/h
              </>
            )}
            {' '}&bull;{' '}
            <span className={`status-pill-header status-${client.status || 'ativo'}`}>
              • {client.status === 'ativo' ? 'Ativo' : client.status === 'inativo' ? 'Inativo' : 'Finalizado'}
            </span>
          </p>
        </div>

        {isAdmin && (
          <div className="detalhe-header-actions">
            <button 
              type="button" 
              className="btn-primary"
              onClick={() => setIsDetailsModalOpen(true)}
            >
              Detalhes do cliente
            </button>
          </div>
        )}
      </header>

      {/* Cards de Indicadores Superiores */}
      <div className={`detalhe-metrics-grid ${isAdmin ? 'three-cards' : 'two-cards'}`}>
        <div className="detalhe-metric-card">
          <span className="metric-label">Horas encerradas no mês</span>
          <div className="metric-value">{formatHoursMinutes(totalClientSeconds)}</div>
          <span className="metric-footer">{totalClientDecimalHours.toFixed(2)}h registradas</span>
        </div>

        {hasHourPackage ? (
          <div className={`detalhe-metric-card ${isOverLimit ? 'card-warning-exceeded' : ''}`}>
            <span className="metric-label">
              {isOverLimit ? 'Horas excedentes (adicionais)' : 'Horas restantes do contrato'}
            </span>
            <div 
              className="metric-value" 
              style={{ color: isOverLimit ? 'var(--color-danger, #D32F2F)' : 'var(--color-primary, #000080)' }}
            >
              {isOverLimit 
                ? `+${formatHoursMinutes(exceededSeconds)}` 
                : formatHoursMinutes(remainingSeconds)
              }
            </div>
            <span className="metric-footer">
              Pacote: {contractHours.toFixed(0)}h contratadas
              {isAdmin && isOverLimit && (
                ` • Adicional: R$ ${((exceededSeconds / 3600) * hourlyRate).toFixed(2)}`
              )}
            </span>
          </div>
        ) : (
          isAdmin && (
            <div className="detalhe-metric-card">
              <span className="metric-label">Valor das horas encerradas</span>
              <div className="metric-value" style={{ color: 'var(--color-primary, #000080)' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFinancialValue)}
              </div>
              <span className="metric-footer">
                {totalClientDecimalHours.toFixed(2)} horas &times; R$ {hourlyRate.toFixed(2)}/h
              </span>
            </div>
          )
        )}

        <div className="detalhe-metric-card">
          <span className="metric-label">Em andamento - hoje</span>
          <div className="metric-value" style={{ color: 'var(--color-accent, #71226B)' }}>
            {activeTimerEntry ? formatHMS(activeTimerSeconds) : '00:00:00'}
          </div>
          <span className="metric-footer">
            {activeTimerEntry 
              ? `Início às ${formatTimeOnly(activeTimerEntry.started_at)} • não contabilizado` 
              : 'Ainda não contabilizado'}
          </span>
        </div>
      </div>

      {/* Faixa de Sessão Ativa */}
      {activeTimerEntry && (
        <div className="active-timer-banner">
          <div className="timer-banner-info">
            <span className="timer-banner-dot" />
            <div>
              <strong>{activeTimerEntry.activities?.name || 'Atividade em execução'}</strong>
              <p>Cronômetro ativo desde {formatTimeOnly(activeTimerEntry.started_at)} de hoje. Pause para encerrar o apontamento.</p>
            </div>
          </div>
          <div className="timer-banner-actions">
            <span className="timer-banner-digital">{formatHMS(activeTimerSeconds)}</span>
            <button 
              type="button" 
              className="btn-timer-banner-pause" 
              onClick={() => handlePauseTimer(activeTimerEntry.id)}
            >
              ⏸ Pausar
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Operacional */}
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
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleInterceptManualEntry}
          >
            Lançamento manual
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleInterceptNewActivity}
          >
            + Nova atividade
          </button>
        </div>
      </div>

      {/* Planilha de Atividades */}
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
                  </td>
                  <td>
                    <div className="act-hours">{formatHoursMinutes(act.totalSeconds)}</div>
                    <div className="act-count">{act.entryCount} apontamentos</div>
                  </td>
                  <td>
                    <span className={`badge-status ${act.isRunning ? 'status-running' : 'status-paused'}`}>
                      {act.isRunning ? '• Em andamento' : '• Pausada'}
                    </span>
                  </td>
                  <td>
                    {act.isRunning ? (
                      <button
                        type="button"
                        className="btn-timer-action btn-timer-pause"
                        onClick={() => handlePauseTimer(activeTimerEntry?.id)}
                      >
                        ⏸ Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-timer-action btn-timer-play"
                        onClick={() => handleStartTimer(act.id)}
                      >
                        ▷ Iniciar
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-cell">
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="Editar atividade e apontamentos"
                        onClick={() => onEditActivity(act)}
                      >
                        ✏️
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-action-icon btn-action-delete"
                          title="Excluir atividade"
                          onClick={() => onDeleteActivity(act)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className="detalhe-table-footer">
          <span>{filteredActivities.length} atividade(s) &bull; {activities.reduce((acc, a) => acc + a.entryCount, 0)} apontamentos encerrados</span>
          <span className="total-encerrado-tag">
            Total encerrado: <strong>{formatHoursMinutes(totalClientSeconds)}</strong>
          </span>
        </footer>
      </div>

      {/* Modal de Detalhes Administrativos */}
      <ModalDetalhesCliente
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        client={client}
        activities={activities}
        totalSeconds={totalClientSeconds}
        isAdmin={isAdmin}
      />

      {/* Modal de Aviso de Bloqueio Operacional */}
      <ModalAvisoStatusCliente
        isOpen={isStatusWarningOpen}
        client={client}
        onClose={() => setIsStatusWarningOpen(false)}
        onReactivate={async () => {
          await supabase
            .from('clients')
            .update({ status: 'ativo', is_active: true })
            .eq('id', client.id);

          client.status = 'ativo';
          client.is_active = true;

          await logAuditEvent({
            userId: user?.id,
            userName: operatorName,
            action: 'CLIENT_ACTIVATE',
            entityType: 'client',
            entityId: client.id,
            clientName: client.name,
            details: { motivo: 'Reativação rápida realizada na folha de atividades' },
          });

          loadClientData();
        }}
      />
    </div>
  );
}