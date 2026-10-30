import React, { useState } from 'react';
import './ModalInativarUsuario.css';

export function ModalInativarUsuario({ isOpen, user, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const isAtivo = (user.status || 'ativo') === 'ativo';
  const actionLabel = isAtivo ? 'Inativar operador' : 'Reativar operador';

  const handleAction = async () => {
    setLoading(true);
    try {
      await onConfirm(user, isAtivo ? 'inativo' : 'ativo');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-inativar-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">
              {isAtivo ? 'Inativar operador?' : 'Reativar operador?'}
            </h2>
            <p className="modal-subtitle">
              Gerencie a disponibilidade do colaborador na equipe.
            </p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        <div className="modal-body-content">
          <div className="modal-warning-box">
            <span className="warning-icon">⚠</span>
            <p>
              {isAtivo ? (
                <>
                  O operador <strong>"{user.full_name}"</strong> deixará de aparecer nos seletores de novas atividades, mas todo o seu histórico em apontamentos e logs anteriores será preservado.
                </>
              ) : (
                <>
                  O operador <strong>"{user.full_name}"</strong> voltará a ficar ativo e poderá ser vinculado a novas tarefas e atividades.
                </>
              )}
            </p>
          </div>
        </div>

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
            type="button"
            className={`btn-primary ${isAtivo ? 'btn-danger-action' : 'btn-success-action'}`}
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? 'Processando...' : actionLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}