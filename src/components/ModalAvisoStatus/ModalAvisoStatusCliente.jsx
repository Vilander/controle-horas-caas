import React from 'react';
import './ModalAvisoStatusCliente.css';

export function ModalAvisoStatusCliente({ isOpen, client, onClose, onReactivate }) {
  if (!isOpen || !client) return null;

  const isFinalizado = client.status === 'finalizado' || (client.contract_end_date && new Date(client.contract_end_date) < new Date());

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-aviso-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2 className="modal-title">
            {isFinalizado ? 'Contrato Finalizado' : 'Cliente Inativo'}
          </h2>
          <button className="modal-btn-close" onClick={onClose} type="button">
            &times;
          </button>
        </header>

        <div className="modal-aviso-content">
          <div className="modal-aviso-icon">
            {isFinalizado ? '📁' : '⏸'}
          </div>

          <p className="modal-aviso-text">
            {isFinalizado ? (
              <>
                O contrato de <strong>{client.name}</strong> está <strong>finalizado/expirado</strong>.
                Para manter a integridade dos dados históricos e financeiros deste ciclo, não é permitido incluir novas atividades. 
                <br /><br />
                <strong>Orientação:</strong> Caso o cliente tenha renovado a parceria, crie um novo cadastro com a vigência e condições comerciais atualizadas.
              </>
            ) : (
              <>
                O cliente <strong>{client.name}</strong> encontra-se <strong>inativo</strong> no momento.
                Não é permitido lançar novas atividades ou registrar horas enquanto o cliente estiver pausado.
                <br /><br />
                Para continuar trabalhando nesta conta, é necessário reativar o cadastro.
              </>
            )}
          </p>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Entendido
          </button>
          {!isFinalizado && onReactivate && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onReactivate();
                onClose();
              }}
            >
              Reativar cliente agora
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
