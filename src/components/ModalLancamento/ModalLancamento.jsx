import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './ModalLancamento.css';

export function ModalLancamento({ isOpen, client, activities, onClose, onEntryCreated }) {
  const { user } = useAuth();
  
  // Data de hoje em YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  const [activityId, setActivityId] = useState('');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Define a atividade inicial caso nenhuma esteja selecionada
  React.useEffect(() => {
    if (activities && activities.length > 0 && !activityId) {
      setActivityId(activities[0].id);
    }
  }, [activities, activityId]);

  // Cálculo da duração e valor financeiro em tempo real
  const { durationFormatted, decimalHours, subtotal, isValidInterval } = useMemo(() => {
    if (!startTime || !endTime) {
      return { durationFormatted: '0h 00min', decimalHours: 0, subtotal: 0, isValidInterval: false };
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;

    if (diffMinutes <= 0) {
      return { durationFormatted: '0h 00min', decimalHours: 0, subtotal: 0, isValidInterval: false };
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const decHours = diffMinutes / 60;
    const totalCalc = decHours * Number(client?.hourly_rate || 0);

    return {
      durationFormatted: `${hours}h ${mins.toString().padStart(2, '0')}min`,
      decimalHours: decHours,
      subtotal: totalCalc,
      isValidInterval: true,
    };
  }, [startTime, endTime, client?.hourly_rate]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!activityId) {
      setErrorMsg('Selecione uma atividade para vincular o lançamento.');
      return;
    }

    if (!isValidInterval) {
      setErrorMsg('A hora final deve ser posterior à hora inicial.');
      return;
    }

    setLoading(true);
    try {
      // Criação das datas completas em ISO UTC
      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

      const { data, error } = await supabase
        .from('time_entries')
        .insert([
          {
            activity_id: activityId,
            user_id: user.id,
            started_at: startDateTime,
            ended_at: endDateTime,
            origin: 'manual',
            correction_reason: description.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setDescription('');
      onEntryCreated(data);
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao salvar lançamento manual: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Lançamento manual</h2>
            <p className="modal-subtitle">Registre um período de trabalho já concluído.</p>
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
            <label htmlFor="activity-select">Atividade *</label>
            <select
              id="activity-select"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              required
            >
              {activities.length === 0 ? (
                <option value="">Nenhuma atividade cadastrada</option>
              ) : (
                activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-row-three">
            <div className="form-field">
              <label htmlFor="entry-date">Data *</label>
              <input
                id="entry-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="start-time">Hora inicial *</label>
              <input
                id="start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="end-time">Hora final *</label>
              <input
                id="end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Card de Cálculo de Duração e Subtotal */}
          <div className="manual-calc-card">
            <div>
              <span className="calc-label">DURAÇÃO CALCULADA</span>
              <div className="calc-duration">🕒 {durationFormatted}</div>
            </div>
            <div className="calc-subtotal-area">
              <span className="calc-formula">
                {decimalHours.toFixed(2)}h &times; R${' '}
                {Number(client.hourly_rate).toFixed(2).replace('.', ',')}
              </span>
              <span className="calc-total">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  subtotal
                )}
              </span>
            </div>
          </div>

          <div className="form-field full-width">
            <label htmlFor="work-desc">Descrição do trabalho</label>
            <textarea
              id="work-desc"
              rows={2}
              placeholder="Ex: Finalização dos textos e ajustes nas peças da campanha..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-info-box">
            <p>
              ⓘ Este lançamento ainda não está nos totais. Ao salvar, será adicionado como período
              encerrado. O cronômetro em andamento continuará rodando normalmente.
            </p>
          </div>

          <footer className="modal-footer">
            <span className="required-legend">* Campos obrigatórios</span>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !isValidInterval || activities.length === 0}
              >
                {loading ? 'Salvando...' : 'Salvar lançamento'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}