import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';
import './ModalExcluirAtividade.css'; // Reutiliza a mesma identidade visual do modal de exclusão

export function ModalExcluirCliente({ isOpen, client, onClose, onDeleted }) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState('');
  const [metrics, setMetrics] = useState({
    activitiesCount: 0,
    entriesCount: 0,
    totalSeconds: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calcula o impacto geral (atividades e apontamentos) que serão removidos
  useEffect(() => {
    if (!isOpen || !client?.id) {
      setReason('');
      setErrorMsg('');
      setIsDeleting(false);
      return;
    }

    let isMounted = true;

    async function loadClientImpact() {
      setLoadingMetrics(true);
      try {
        // Busca atividades vinculadas
        const { data: acts, error: actsError } = await supabase
          .from('activities')
          .select('id')
          .eq('client_id', client.id);

        if (actsError) throw actsError;

        const actIds = (acts || []).map((a) => a.id);
        let entriesCount = 0;
        let totalSeconds = 0;

        if (actIds.length > 0) {
          const { data: entries, error: entriesError } = await supabase
            .from('time_entries')
            .select('duration_seconds')
            .in('activity_id', actIds);

          if (entriesError) throw entriesError;

          entriesCount = entries?.length || 0;
          totalSeconds = (entries || []).reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
        }

        if (isMounted) {
          setMetrics({
            activitiesCount: acts?.length || 0,
            entriesCount,
            totalSeconds,
          });
        }
      } catch (err) {
        console.error('Erro ao calcular impacto da exclusão do cliente:', err);
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    }

    loadClientImpact();

    return () => {
      isMounted = false;
    };
  }, [isOpen, client?.id]);

  if (!isOpen || !client) return null;

  const formatHoursMinutes = (secs) => {
    if (!secs || secs <= 0) return '0h 00min';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!reason.trim()) {
      setErrorMsg('Informe o motivo da exclusão para prosseguir.');
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Remove o cliente (em cascata no banco ou via constraints configuradas)
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (deleteError) throw deleteError;

      // 2. Registro no log de auditoria
      const operatorName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        'Usuário';

      await logAuditEvent({
        userId: user?.id,
        userName: operatorName,
        action: 'CLIENT_DELETE',
        entityType: 'client',
        entityId: client.id,
        clientName: client.name,
        details: {
          servico: client.service,
          valor_hora: client.hourly_rate,
          atividades_removidas: metrics.activitiesCount,
          apontamentos_removidos: metrics.entriesCount,
          total_horas_descartadas: formatHoursMinutes(metrics.totalSeconds),
          motivo: reason.trim(),
        },
      });

      if (typeof onDeleted === 'function') {
        onDeleted();
      }
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao excluir cliente: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-excluir-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Excluir cliente?</h2>
            <p className="modal-subtitle">Confira o impacto antes de confirmar a exclusão definitiva.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleConfirmDelete} className="modal-form">
          <div className="modal-warning-box">
            <span className="warning-icon">⚠</span>
            <p>
              O cliente <strong>"{client.name}"</strong>, suas{' '}
              <strong>{loadingMetrics ? '...' : metrics.activitiesCount} atividades</strong> e todos os{' '}
              <strong>{loadingMetrics ? '...' : metrics.entriesCount} apontamentos</strong> serão excluídos permanentemente.
            </p>
          </div>

          <div className="impact-summary-card">
            <div className="impact-client-tag">RESUMO DE DADOS VINCULADOS</div>
            <div className="impact-row">
              <span className="impact-label">Serviço contratado:</span>
              <strong className="impact-value">{client.service}</strong>
            </div>
            <div className="impact-row">
              <span className="impact-label">Horas registradas descartadas:</span>
              <strong className="impact-value">
                {loadingMetrics ? 'Calculando...' : formatHoursMinutes(metrics.totalSeconds)}
              </strong>
            </div>
          </div>

          <div className="form-field full-width">
            <label htmlFor="delete-client-reason">
              Motivo da remoção *
            </label>
            <input
              id="delete-client-reason"
              type="text"
              required
              placeholder="Ex: Cancelamento de contrato, cliente duplicado..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isDeleting}
              autoFocus
            />
          </div>

          <footer className="modal-footer">
            <span className="footer-irreversible-note">Esta ação é irreversível.</span>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-danger-action"
                disabled={isDeleting || !reason.trim() || loadingMetrics}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir cliente'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}