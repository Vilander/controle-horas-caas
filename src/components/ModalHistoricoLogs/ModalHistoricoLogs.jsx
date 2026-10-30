import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalHistoricoLogs.css';

export function ModalHistoricoLogs({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de auditoria:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  // Lista dinâmica de clientes para o seletor
  const uniqueClients = useMemo(() => {
    const clientsSet = new Set();
    logs.forEach((log) => {
      if (log.client_name && log.client_name.trim() !== '') {
        clientsSet.add(log.client_name.trim());
      }
    });
    return Array.from(clientsSet).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  // Identificação semântica e tags visuais de ações
  const getActionBadge = (action) => {
    switch (action) {
      case 'CLIENT_CREATE':
        return { label: 'Cliente Criado', className: 'badge-create' };
      case 'CLIENT_ACTIVATE':
        return { label: 'Cliente Ativado', className: 'badge-create' };
      case 'CLIENT_DEACTIVATE':
        return { label: 'Cliente Inativado', className: 'badge-warn' };
      case 'CLIENT_FINALIZE':
        return { label: 'Cliente Finalizado', className: 'badge-danger' };
      case 'CLIENT_UPDATE':
        return { label: 'Cliente Editado', className: 'badge-warn' };
      case 'CLIENT_DELETE':
        return { label: 'Cliente Excluído', className: 'badge-danger' };
      case 'ACTIVITY_CREATE':
        return { label: 'Atividade Criada', className: 'badge-create' };
      case 'ACTIVITY_DELETE':
        return { label: 'Atividade Excluída', className: 'badge-danger' };
      case 'TIMER_START':
        return { label: 'Cronômetro Iniciado', className: 'badge-timer-start' };
      case 'TIMER_PAUSE':
        return { label: 'Cronômetro Pausado', className: 'badge-timer-pause' };
      case 'TIME_MANUAL_ENTRY':
        return { label: 'Lançamento Manual', className: 'badge-manual' };
      case 'TIME_ENTRY_DELETE':
        return { label: 'Apontamento Excluído', className: 'badge-danger' };
      case 'TIME_ENTRY_UPDATE':
        return { label: 'Apontamento Editado', className: 'badge-warn' };
      default:
        return { label: action, className: 'badge-default' };
    }
  };

  // Filtragem composta em memória com normalização de objetos nulos/indefinidos
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchesClient = clientFilter === 'ALL' || log.client_name === clientFilter;

      if (!matchesAction || !matchesClient) return false;
      if (!term) return true;

      const userName = (log.user_name || '').toLowerCase();
      const clientName = (log.client_name || '').toLowerCase();
      const actionBadge = getActionBadge(log.action);
      const actionLabel = actionBadge.label.toLowerCase();

      let detailsString = '';
      if (log.details) {
        if (typeof log.details === 'string') {
          detailsString = log.details.toLowerCase();
        } else if (typeof log.details === 'object') {
          detailsString = Object.values(log.details)
            .map((val) => (typeof val === 'object' ? JSON.stringify(val) : String(val || '')))
            .join(' ')
            .toLowerCase();
        }
      }

      return (
        userName.includes(term) ||
        clientName.includes(term) ||
        actionLabel.includes(term) ||
        detailsString.includes(term)
      );
    });
  }, [logs, actionFilter, clientFilter, searchTerm]);

  // Exportação com os filtros da tela
  const handleExportTXT = () => {
    if (filteredLogs.length === 0) {
      alert('Nenhum registro corresponde aos filtros selecionados para exportação.');
      return;
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    let content = `================================================================================\n`;
    content += `AS&V GROWTH PARTNER — RELATÓRIO DE AUDITORIA E LOGS (SCH)\n`;
    content += `Emitido em: ${nowStr}\n`;
    content += `Filtros Aplicados: Ação [${actionFilter}] | Cliente [${clientFilter}] | Busca ["${searchTerm || 'Nenhuma'}"]\n`;
    content += `Total de registros exportados: ${filteredLogs.length}\n`;
    content += `================================================================================\n\n`;

    filteredLogs.forEach((log, index) => {
      const dataHora = new Date(log.created_at).toLocaleString('pt-BR');
      const badge = getActionBadge(log.action);
      
      let detalhesFormatados = 'Nenhum detalhe adicional';
      if (log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0) {
        detalhesFormatados = JSON.stringify(log.details, null, 2).replace(/\n/g, ' ');
      }

      content += `[#${String(index + 1).padStart(4, '0')}] ${dataHora}\n`;
      content += `  Operador: ${log.user_name}\n`;
      content += `  Ação:     ${badge.label} (${log.action})\n`;
      content += `  Cliente:  ${log.client_name || 'N/A'} (Entidade: ${log.entity_type})\n`;
      content += `  Detalhes: ${detalhesFormatados}\n`;
      content += `--------------------------------------------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDate = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `auditoria_sch_filtrada_${safeDate}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-logs-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Trilha de Auditoria & Histórico de Ações</h2>
            <p className="modal-subtitle">
              Registro administrativo de operações, cronômetros, apontamentos e alterações de status.
            </p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        {/* Barra de Filtros */}
        <div className="logs-filter-bar">
          <div className="logs-search">
            <input
              type="text"
              placeholder="Q Buscar por operador, cliente ou detalhes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="logs-select-group">
            <div className="logs-filter-select">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="ALL">Todos os clientes</option>
                {uniqueClients.map((clientName) => (
                  <option key={clientName} value={clientName}>
                    {clientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="logs-filter-select">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="ALL">Todas as ações</option>
                <option value="CLIENT_CREATE">Cliente Criado</option>
                <option value="CLIENT_ACTIVATE">Cliente Ativado</option>
                <option value="CLIENT_DEACTIVATE">Cliente Inativado</option>
                <option value="CLIENT_FINALIZE">Cliente Finalizado</option>
                <option value="CLIENT_UPDATE">Cliente Editado</option>
                <option value="CLIENT_DELETE">Cliente Excluído</option>
                <option value="ACTIVITY_CREATE">Criação de Atividades</option>
                <option value="ACTIVITY_DELETE">Exclusão de Atividades</option>
                <option value="TIMER_START">Cronômetro Iniciado</option>
                <option value="TIMER_PAUSE">Cronômetro Pausado</option>
                <option value="TIME_MANUAL_ENTRY">Lançamentos Manuais</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Histórico */}
        <div className="logs-table-container">
          {loading ? (
            <div className="logs-loading">Carregando registros de auditoria...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="logs-empty">Nenhum evento localizado com os filtros informados.</div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>DATA / HORA</th>
                  <th>OPERADOR</th>
                  <th>AÇÃO</th>
                  <th>CLIENTE</th>
                  <th>DETALHES DO EVENTO</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const dateObj = new Date(log.created_at);
                  const formattedDate = dateObj.toLocaleDateString('pt-BR');
                  const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id}>
                      <td className="log-td-time">
                        <strong>{formattedDate}</strong>
                        <span>{formattedTime}</span>
                      </td>
                      <td className="log-td-user">
                        <strong>{log.user_name}</strong>
                      </td>
                      <td>
                        <span className={`log-badge ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td>{log.client_name || '—'}</td>
                      <td className="log-td-details">
                        {log.details && (
                          <div className="details-tags">
                            {log.details.activity_name && (
                              <span>Atividade: <strong>{log.details.activity_name}</strong></span>
                            )}
                            {log.details.nome && (
                              <span>Nome: <strong>{log.details.nome}</strong></span>
                            )}
                            {log.details.duracao && (
                              <span>Duração: <strong>{log.details.duracao}</strong></span>
                            )}
                            {log.details.motivo && (
                              <span>Motivo: <em>{log.details.motivo}</em></span>
                            )}
                            {log.details.descricao && (
                              <span>Desc: {log.details.descricao}</span>
                            )}
                            {log.details.novo_status && (
                              <span>Novo status: <strong>{log.details.novo_status}</strong></span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <footer className="modal-footer">
          <span className="logs-count-info">
            {filteredLogs.length} de {logs.length} registro(s) exibido(s)
          </span>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Fechar
            </button>
            <button
              type="button"
              className="btn-primary btn-export-txt"
              onClick={handleExportTXT}
              disabled={loading || filteredLogs.length === 0}
            >
              📥 Baixar Arquivo .TXT
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}