import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';
import './ModalExcluirAtividade.css';

export function ModalExcluirAtividade({ isOpen, activity, client, onClose, onDeleted }) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState('');
  const [metrics, setMetrics] = useState({
    entriesCount: 0,
    totalSeconds: 0,
    revenueImpact: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Carrega os apontamentos associados para exibir o impacto real antes da exclusão
  useEffect(() => {
    if (!isOpen || !activity?.id) {
      setReason('');
      setErrorMsg('');
      setIsDeleting(false);
      return;
    }

    let isMounted = true;

    async function loadActivityImpact() {
      setLoadingMetrics(true);
      try {
        const { data, error } = await supabase
          .from('time_entries')
          .select('duration_seconds')
          .eq('activity_id', activity.id);

        if (error) throw error;

        if (isMounted) {
          const count = data?.length || 0;
          const totalSecs = (data || []).reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
          const hourlyRate = Number(client?.hourly_rate || 0);
          const revenue = (totalSecs / 3600) * hourlyRate;

          setMetrics({
            entriesCount: count,
            totalSeconds: totalSecs,
            revenueImpact: revenue,
          });
        }
      } catch (err) {
        console.error('Erro ao calcular impacto da exclusão:', err);
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    }

    loadActivityImpact();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activity?.id, client?.hourly_rate]);

  if (!isOpen || !activity) return null;

  const formatHoursMinutes = (secs) => {
    if (!secs || secs <= 0) return '0h 00min';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(val) || 0);
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
      // 1. Remove a atividade (as foreign keys em time_entries e activity_assignees tratam em cascata ou são removidas)
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('id', activity.id);

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
        action: 'ACTIVITY_DELETE',
        entityType: 'activity',
        entityId: activity.id,
        clientName: client?.name,
        details: {
          activity_name: activity.name,
          apontamentos_removidos: metrics.entriesCount,
          tempo_removido: formatHoursMinutes(metrics.totalSeconds),
          reducao_faturamento: formatCurrency(metrics.revenueImpact),
          motivo: reason.trim(),
        },
      });

      if (typeof onDeleted === 'function') {
        onDeleted();
      }
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao excluir atividade: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-excluir-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Excluir atividade?</h2>
            <p className="modal-subtitle">Confira o impacto antes de confirmar a exclusão.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleConfirmDelete} className="modal-form">
          {/* Alerta de Impacto */}
          <div className="modal-warning-box">
            <span className="warning-icon">⚠</span>
            <p>
              A atividade <strong>"{activity.name}"</strong> e todos os seus{' '}
              <strong>{loadingMetrics ? '...' : metrics.entriesCount} apontamentos</strong> serão removidos permanentemente.
            </p>
          </div>

          {/* Card Resumo do Impacto */}
          <div className="impact-summary-card">
            <div className="impact-client-tag">CLIENTE: {client?.name || 'Não informado'}</div>
            <div className="impact-row">
              <span className="impact-label">Tempo a remover:</span>
              <strong className="impact-value">
                {loadingMetrics ? 'Calculando...' : formatHoursMinutes(metrics.totalSeconds)}
              </strong>
            </div>
            <div className="impact-row">
              <span className="impact-label danger-text">Redução no faturamento:</span>
              <strong className="impact-value danger-text">
                {loadingMetrics ? 'Calculando...' : formatCurrency(metrics.revenueImpact)}
              </strong>
            </div>
          </div>

          {/* Campo Obrigatório: Motivo da Remoção */}
          <div className="form-field full-width">
            <label htmlFor="delete-reason">
              Motivo da remoção *
            </label>
            <input
              id="delete-reason"
              type="text"
              required
              placeholder="Ex: Atividade duplicada, cancelada pelo cliente..."
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
                {isDeleting ? 'Excluindo...' : 'Excluir atividade'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}