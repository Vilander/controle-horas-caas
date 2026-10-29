import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalProrrogar.css';

export function ModalProrrogar({ isOpen, client, onClose, onUpdated }) {
  const [extensionDays, setExtensionDays] = useState(30);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !client) return null;

  const currentEndDate = client.contract_end_date 
    ? new Date(client.contract_end_date + 'T00:00:00') 
    : new Date();

  const handleExtend = async () => {
    setLoading(true);
    try {
      const newDate = new Date(currentEndDate);
      newDate.setDate(newDate.getDate() + Number(extensionDays));
      const formatted = newDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('clients')
        .update({ contract_end_date: formatted, is_active: true })
        .eq('id', client.id);

      if (error) throw error;
      onUpdated();
      onClose();
    } catch (err) {
      alert('Erro ao prorrogar contrato: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirm(`Deseja encerrar definitivamente o contrato de ${client.name}? O cliente será marcado como inativo.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', client.id);

      if (error) throw error;
      onUpdated();
      onClose();
    } catch (err) {
      alert('Erro ao encerrar contrato: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '480px' }}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Vigência de contrato</h2>
            <p className="modal-subtitle">{client.name}</p>
          </div>
          <button className="modal-btn-close" onClick={onClose}>&times;</button>
        </header>

        <div className="modal-form">
          <p style={{ fontSize: '13px', color: 'var(--color-base)' }}>
            O contrato encerra em: <strong>{client.contract_end_date ? new Date(client.contract_end_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não estipulada'}</strong>.
          </p>

          <div className="form-field full-width">
            <label>Prorrogar por mais:</label>
            <select
              value={extensionDays}
              onChange={(e) => setExtensionDays(e.target.value)}
            >
              <option value={15}>+ 15 dias</option>
              <option value={30}>+ 30 dias (1 mês)</option>
              <option value={60}>+ 60 dias (2 meses)</option>
              <option value={90}>+ 90 dias (3 meses)</option>
            </select>
          </div>

          <footer className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTerminate}
              disabled={loading}
              style={{ color: 'var(--color-danger)' }}
            >
              Encerrar contrato
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleExtend}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Confirmar prorrogação'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}