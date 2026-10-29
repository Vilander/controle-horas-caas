import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalAtividade.css';

export function ModalAtividade({ isOpen, client, onClose, onActivityCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      supabase
        .from('profiles')
        .select('id, full_name')
        .then(({ data }) => setProfiles(data || []));
    }
  }, [isOpen]);

  if (!isOpen || !client) return null;

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('O nome da atividade é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const { data: newAct, error } = await supabase
        .from('activities')
        .insert([
          {
            client_id: client.id,
            name: name.trim(),
            description: description.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (selectedUserIds.length > 0) {
        const rows = selectedUserIds.map((uid) => ({
          activity_id: newAct.id,
          user_id: uid,
        }));
        await supabase.from('activity_assignees').insert(rows);
      }

      setName('');
      setDescription('');
      setSelectedUserIds([]);
      onActivityCreated(newAct);
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao criar atividade: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Nova atividade</h2>
            <p className="modal-subtitle">Adicione uma atividade à planilha de {client.name}.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field full-width">
            <label>Cliente *</label>
            <input type="text" value={client.name} disabled className="input-disabled" />
          </div>

          <div className="form-field full-width">
            <label htmlFor="act-name">Nome da atividade *</label>
            <input
              id="act-name"
              type="text"
              required
              placeholder="Ex: Revisão de proposta comercial"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="act-desc">Descrição</label>
            <textarea
              id="act-desc"
              rows={2}
              placeholder="Descreva o escopo desta atividade..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-field full-width">
            <label>Responsáveis pela atividade (operação / relatório)</label>
            <div className="assignees-pill-container">
              {profiles.map((p) => {
                const isSelected = selectedUserIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`assignee-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleUser(p.id)}
                  >
                    {isSelected ? '✓ ' : '+ '} {p.full_name}
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="modal-footer">
            <span className="required-legend">* Campos obrigatórios</span>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Criando...' : 'Criar atividade'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}