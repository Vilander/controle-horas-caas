import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalHistoricoLogs.css';

export function ModalHistoricoLogs({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar histórico de auditoria:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Tradução e identificação visual de cada ação
  const getActionBadge = (action) => {
    switch (action) {
      case 'CLIENT_CREATE':
        return { label: 'Cliente Criado', className: 'badge-create' };
      case 'CLIENT_DEACTIVATE':
        return { label: 'Cliente Inativado', className: 'badge-warn' };
      case 'CLIENT_ACTIVATE':
        return { label: 'Cliente Ativado', className: 'badge-create' };
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

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSearch =
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.client_name && log.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  // Função para gerar e baixar o arquivo .txt
  const handleExportTXT = () => {
    if (filteredLogs.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    let content = `================================================================================\n`;
    content += `AS&V GROWTH PARTNER — RELATÓRIO DE AUDITORIA E LOGS DO SISTEMA (SCH)\n`;
    content += `Emitido em: ${nowStr}\n`;
    content += `Total de registros exportados: ${filteredLogs.length}\n`;
    content += `================================================================================\n\n`;

    filteredLogs.forEach((log, index) => {
      const dataHora = new Date(log.created_at).toLocaleString('pt-BR');
      const badge = getActionBadge(log.action);
      const detalhes = log.details && Object.keys(log.details).length > 0 
        ? JSON.stringify(log.details, null, 2).replace(/\n/g, ' ') 
        : 'Nenhum detalhe adicional';

      content += `[#${String(index + 1).padStart(4, '0')}] ${dataHora}\n`;
      content += `  Operador: ${log.user_name}\n`;
      content += `  Ação:     ${badge.label} (${log.action})\n`;
      content += `  Entidade: ${log.entity_type} | Cliente: ${log.client_name || 'N/A'}\n`;
      content += `  Detalhes: ${detalhes}\n`;
      content += `--------------------------------------------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDate = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `auditoria_sch_${safeDate}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

        {/* Barra de Filtros e Busca */}
        <div className="logs-filter-bar">
          <div className="logs-search">
            <input
              type="text"
              placeholder="Q Buscar por operador, cliente ou detalhes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="logs-filter-select">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="ALL">Todas as ações</option>
              <option value="TIMER_START">Cronômetro Iniciado</option>
              <option value="TIMER_PAUSE">Cronômetro Pausado</option>
              <option value="TIME_MANUAL_ENTRY">Lançamentos Manuais</option>
              <option value="ACTIVITY_CREATE">Criação de Atividades</option>
              <option value="CLIENT_DEACTIVATE">Inativação de Clientes</option>
              <option value="CLIENT_DELETE">Exclusão de Clientes</option>
              <option value="TIME_ENTRY_DELETE">Exclusão de Horas</option>
            </select>
          </div>
        </div>

        {/* Tabela de Histórico */}
        <div className="logs-table-container">
          {loading ? (
            <div className="logs-loading">Carregando registros de auditoria...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="logs-empty">Nenhum evento registrado com os filtros informados.</div>
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
                            {log.details.duration_formatted && (
                              <span>Duração: <strong>{log.details.duration_formatted}</strong></span>
                            )}
                            {log.details.reason && (
                              <span>Motivo: <em>{log.details.reason}</em></span>
                            )}
                            {log.details.description && (
                              <span>Desc: {log.details.description}</span>
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
            {filteredLogs.length} registro(s) exibido(s)
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