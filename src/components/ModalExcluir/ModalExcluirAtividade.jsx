import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalExcluir.css';

export function ModalExcluirAtividade({ isOpen, activity, client, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !activity) return null;

  const totalHoursDec = (activity.totalSeconds || 0) / 3600;
  const financialImpact = totalHoursDec * Number(client?.hourly_rate || 0);

  const formatHoursMinutes = (totalSec) => {
    if (!totalSec) return '0h 00min';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}min`;
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activity.id);

      if (error) throw error;

      onDeleted(activity.id);
      onClose();
    } catch (err) {
      alert('Erro ao excluir atividade: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Excluir atividade?</h2>
            <p className="modal-subtitle">Confira o impacto antes de confirmar a exclusão.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button">
            &times;
          </button>
        </header>

        <div className="modal-form">
          <div className="modal-alert-danger-box">
            ⚠ A atividade <strong>"{activity.name}"</strong> e todos os seus{' '}
            <strong>{activity.entryCount || 0} apontamentos</strong> serão removidos
            permanentemente.
          </div>

          <div className="impact-box">
            <span className="impact-label">CLIENTE: {client?.name}</span>
            <div className="impact-detail">
              <span>Tempo a remover:</span>
              <strong>{formatHoursMinutes(activity.totalSeconds)}</strong>
            </div>
            {financialImpact > 0 && (
              <div className="impact-detail impact-financial">
                <span>Redução no faturamento:</span>
                <strong>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    financialImpact
                  )}
                </strong>
              </div>
            )}
          </div>

          <footer className="modal-footer">
            <span className="required-legend">Esta ação é irreversível.</span>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Excluindo...' : 'Excluir atividade'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}