import React from 'react';
import { useActiveTimer } from '../../hooks/useActiveTimer';
import './ActiveTimerBanner.css';

export function ActiveTimerBanner({ activeEntry, onPause }) {
  const { formatted } = useActiveTimer(activeEntry?.started_at);

  if (!activeEntry) return null;

  return (
    <div className="active-timer-banner">
      <div className="banner-left">
        <span className="banner-pulse" />
        <div>
          <h4 className="banner-activity-name">
            {activeEntry.activities?.name || 'Atividade em andamento'}
          </h4>
          <p className="banner-desc">
            Cronômetro ativo. Prima pausar para encerrar o apontamento.
          </p>
        </div>
      </div>

      <div className="banner-right">
        <span className="banner-clock">{formatted}</span>
        <button className="btn-pause-timer" onClick={() => onPause(activeEntry.id)}>
          Pausar
        </button>
      </div>
    </div>
  );
}