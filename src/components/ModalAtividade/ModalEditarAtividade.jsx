import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalAtividade.css';

export function ModalEditarAtividade({ isOpen, activity, client, onClose, onUpdated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de edição de um apontamento específico
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryDate, setEntryDate] = useState('');
  const [entryStartTime, setEntryStartTime] = useState('');
  const [entryEndTime, setEntryEndTime] = useState('');
  const [entryReason, setEntryReason] = useState('');

  useEffect(() => {
    if (activity && isOpen) {
      setName(activity.name || '');
      setDescription(activity.description || '');
      setEditingEntry(null);
      loadProfilesAndAssignees();
      loadEntries();
    }
  }, [activity?.id, isOpen]);

  const loadProfilesAndAssignees = async () => {
    if (!activity?.id) return;
    try {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      setProfiles(profs || []);

      const { data: assignees } = await supabase
        .from('activity_assignees')
        .select('user_id')
        .eq('activity_id', activity.id);

      setSelectedUserIds((assignees || []).map((a) => a.user_id));
    } catch (err) {
      console.error('Erro ao carregar responsáveis:', err);
    }
  };

  const loadEntries = async () => {
    if (!activity?.id) return;
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('activity_id', activity.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Erro ao carregar apontamentos:', err);
    }
  };

  if (!isOpen || !activity) return null;

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectEntryToEdit = (entry) => {
    setEditingEntry(entry);
    const startDate = new Date(entry.started_at);
    const endDate = entry.ended_at ? new Date(entry.ended_at) : new Date();

    const localYear = startDate.getFullYear();
    const localMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const localDay = String(startDate.getDate()).padStart(2, '0');
    const startH = String(startDate.getHours()).padStart(2, '0');
    const startM = String(startDate.getMinutes()).padStart(2, '0');
    const endH = String(endDate.getHours()).padStart(2, '0');
    const endM = String(endDate.getMinutes()).padStart(2, '0');

    setEntryDate(`${localYear}-${localMonth}-${localDay}`);
    setEntryStartTime(`${startH}:${startM}`);
    setEntryEndTime(`${endH}:${endM}`);
    setEntryReason(entry.correction_reason || '');
  };

  const calculateDurationText = () => {
    if (!entryStartTime || !entryEndTime) return '0h 00min';
    const [sH, sM] = entryStartTime.split(':').map(Number);
    const [eH, eM] = entryEndTime.split(':').map(Number);

    const diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMinutes <= 0) return '0h 00min (intervalo inválido)';

    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}min`;
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Deseja realmente excluir permanentemente este apontamento?')) return;
    try {
      const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
      if (error) throw error;
      
      if (editingEntry?.id === entryId) {
        setEditingEntry(null);
      }
      loadEntries();
    } catch (err) {
      alert('Erro ao excluir registro: ' + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Atualiza dados da atividade
      const { error: actError } = await supabase
        .from('activities')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', activity.id);

      if (actError) throw actError;

      // 2. Atualiza responsáveis
      await supabase.from('activity_assignees').delete().eq('activity_id', activity.id);

      if (selectedUserIds.length > 0) {
        const rows = selectedUserIds.map((uid) => ({
          activity_id: activity.id,
          user_id: uid,
        }));
        await supabase.from('activity_assignees').insert(rows);
      }

      // 3. Atualiza apontamento em edição (se houver)
      if (editingEntry) {
        const [sH, sM] = entryStartTime.split(':').map(Number);
        const [eH, eM] = entryEndTime.split(':').map(Number);

        if ((eH * 60 + eM) <= (sH * 60 + sM)) {
          throw new Error('A hora final do apontamento deve ser maior que a hora inicial.');
        }

        const [year, month, day] = entryDate.split('-').map(Number);
        const startObj = new Date(year, month - 1, day, sH, sM, 0);
        const endObj = new Date(year, month - 1, day, eH, eM, 0);

        // Envia apenas os timestamps e a justificativa
        // duration_seconds é calculado pelo PostgreSQL (GENERATED ALWAYS)
        const { error: entryError } = await supabase
          .from('time_entries')
          .update({
            started_at: startObj.toISOString(),
            ended_at: endObj.toISOString(),
            correction_reason: entryReason.trim() || null,
          })
          .eq('id', editingEntry.id);

        if (entryError) throw entryError;
      }

      onUpdated();
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Editar atividade e apontamentos</h2>
            <p className="modal-subtitle">
              {client?.name ? `${client.name} • ` : ''}Altere detalhes, responsáveis e registros da atividade.
            </p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSave} className="modal-form">
          <div className="form-field full-width">
            <label htmlFor="edit-act-name">Nome da atividade *</label>
            <input
              id="edit-act-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="edit-act-desc">Descrição</label>
            <textarea
              id="edit-act-desc"
              rows={2}
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

          <div className="form-field full-width">
            <label>Registros de tempo ({entries.length})</label>
            {entries.length === 0 ? (
              <p className="empty-entries-text">Nenhum apontamento registrado nesta atividade.</p>
            ) : (
              <div className="entries-mini-list">
                {entries.map((entry) => {
                  const startDate = new Date(entry.started_at);
                  const dateStr = startDate.toLocaleDateString('pt-BR');
                  const startHours = String(startDate.getHours()).padStart(2, '0') + ':' + String(startDate.getMinutes()).padStart(2, '0');
                  const endHours = entry.ended_at 
                    ? String(new Date(entry.ended_at).getHours()).padStart(2, '0') + ':' + String(new Date(entry.ended_at).getMinutes()).padStart(2, '0')
                    : 'Em aberto';

                  const durationMinutes = entry.duration_seconds
                    ? Math.round(entry.duration_seconds / 60)
                    : 0;
                  const durHours = Math.floor(durationMinutes / 60);
                  const durMins = durationMinutes % 60;
                  const durationFormatted = `${durHours > 0 ? durHours + 'h ' : ''}${durMins}min`;

                  const isBeingEdited = editingEntry?.id === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className={`entry-mini-item ${isBeingEdited ? 'editing-active' : ''}`}
                    >
                      <div className="entry-info-text">
                        <span className="entry-date">{dateStr}</span>
                        <span className="entry-times">{startHours} às {endHours}</span>
                        <span className="entry-dur">• {durationFormatted}</span>
                        <span className="entry-origin-tag">({entry.origin})</span>
                      </div>
                      <div className="entry-item-actions">
                        <button
                          type="button"
                          className="btn-entry-action"
                          onClick={() => handleSelectEntryToEdit(entry)}
                          title="Editar este apontamento"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-entry-action btn-entry-delete"
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Excluir este apontamento"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {editingEntry && (
            <div className="correct-entry-box">
              <div className="correct-entry-header">
                <span className="correct-entry-title">
                  Corrigir apontamento de {new Date(editingEntry.started_at).toLocaleDateString('pt-BR')}
                </span>
                <button
                  type="button"
                  className="btn-cancel-entry-edit"
                  onClick={() => setEditingEntry(null)}
                >
                  Cancelar ajuste
                </button>
              </div>

              <div className="correct-entry-grid">
                <div className="form-field">
                  <label>Data</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Hora inicial</label>
                  <input
                    type="time"
                    required
                    value={entryStartTime}
                    onChange={(e) => setEntryStartTime(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Hora final</label>
                  <input
                    type="time"
                    required
                    value={entryEndTime}
                    onChange={(e) => setEntryEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="correct-entry-duration">
                <span>Duração recalculada:</span>
                <strong>{calculateDurationText()}</strong>
              </div>

              <div className="form-field full-width" style={{ marginTop: '10px' }}>
                <label>Motivo da correção</label>
                <input
                  type="text"
                  placeholder="Ex: Ajuste de horário: cronômetro esquecido ligado."
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <footer className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}