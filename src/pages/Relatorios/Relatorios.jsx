import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './Relatorios.css';

export function Relatorios({ initialClientId = null }) {
  const { profile, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '');
  
  // Intervalo padrão: primeiro e último dia do mês corrente
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carrega a lista de clientes para a seleção
  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, hourly_rate, service')
        .order('name');
      
      if (!error && data) {
        setClients(data);
        if (!selectedClientId && data.length > 0) {
          setSelectedClientId(data[0].id);
        }
      }
    }
    loadClients();
  }, []);

  // Executa a busca e cálculo dos apontamentos encerrados com feedback visual perceptível
  const handleGenerateReport = async () => {
    if (!selectedClientId) return;
    setLoading(true);

    try {
      const selectedClient = clients.find((c) => c.id === selectedClientId);

      // Início às 00:00:00 e fim às 23:59:59 em formato ISO UTC
      const startIso = new Date(`${startDate}T00:00:00`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59`).toISOString();

      // Temporizador artificial de 600ms para garantir feedback visual no botão
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 600));

      const queryPromise = supabase
        .from('time_entries')
        .select(`
          id,
          duration_seconds,
          started_at,
          ended_at,
          activity_id,
          activities!inner (
            id,
            name,
            description,
            client_id
          )
        `)
        .eq('activities.client_id', selectedClientId)
        .gte('started_at', startIso)
        .lte('started_at', endIso)
        .not('ended_at', 'is', null);

      // Aguarda ambos simultaneamente (a consulta do banco e o tempo mínimo de tela)
      const [_, { data: entries, error }] = await Promise.all([delayPromise, queryPromise]);

      if (error) throw error;

      // Agrupa os apontamentos por atividade
      const activitiesMap = {};
      let totalSeconds = 0;
      let totalEntriesCount = 0;

      (entries || []).forEach((entry) => {
        const act = entry.activities;
        if (!activitiesMap[act.id]) {
          activitiesMap[act.id] = {
            id: act.id,
            name: act.name,
            description: act.description,
            entriesCount: 0,
            seconds: 0,
          };
        }
        const secs = entry.duration_seconds || 0;
        activitiesMap[act.id].entriesCount += 1;
        activitiesMap[act.id].seconds += secs;
        totalSeconds += secs;
        totalEntriesCount += 1;
      });

      const hourlyRate = Number(selectedClient?.hourly_rate || 0);
      const rows = Object.values(activitiesMap).map((item) => {
        const decimalHours = item.seconds / 3600;
        return {
          ...item,
          decimalHours,
          subtotal: decimalHours * hourlyRate,
        };
      });

      const totalDecimalHours = totalSeconds / 3600;
      const totalFinancial = totalDecimalHours * hourlyRate;

      setReportData({
        client: selectedClient,
        rows,
        totalSeconds,
        totalDecimalHours,
        totalEntriesCount,
        totalFinancial,
        activitiesCount: rows.length,
        generatedAt: new Date(),
      });
    } catch (err) {
      alert('Erro ao gerar relatório: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dispara automaticamente a primeira consulta após carregar os clientes
  useEffect(() => {
    if (selectedClientId && clients.length > 0 && !reportData) {
      handleGenerateReport();
    }
  }, [selectedClientId, clients]);

  const formatHoursMinutes = (secs) => {
    if (!secs) return '0h 00min';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${String(m).padStart(2, '0')}min`;
  };

  // Exportação em CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.rows.length === 0) return;

    const headers = ['Atividade', 'Descricao', 'Registros', 'Horas', 'Horas Decimais', 'Valor/Hora (R$)', 'Subtotal (R$)'];
    const lines = reportData.rows.map((r) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.entriesCount,
      `"${formatHoursMinutes(r.seconds)}"`,
      r.decimalHours.toFixed(2).replace('.', ','),
      reportData.client.hourly_rate.toFixed(2).replace('.', ','),
      r.subtotal.toFixed(2).replace('.', ','),
    ]);

    // Linha de total
    lines.push([
      '"Total do periodo"',
      '""',
      reportData.totalEntriesCount,
      `"${formatHoursMinutes(reportData.totalSeconds)}"`,
      reportData.totalDecimalHours.toFixed(2).replace('.', ','),
      '""',
      reportData.totalFinancial.toFixed(2).replace('.', ','),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...lines.map((l) => l.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_${reportData.client.name.toLowerCase().replace(/\s+/g, '_')}_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="relatorios-page">
      <header className="relatorios-header">
        <div>
          <span className="relatorios-breadcrumb">Relatórios / Horas trabalhadas</span>
          <h1 className="relatorios-title">Relatório de horas</h1>
          <p className="relatorios-subtitle">
            Consulte as horas encerradas e o valor dos serviços prestados por atividade.
          </p>
        </div>
        {reportData && (
          <div className="relatorios-actions no-print">
            <button className="btn-secondary" onClick={handleExportCSV}>
              Exportar planilha
            </button>
            <button className="btn-primary" onClick={handlePrintPDF}>
              Exportar PDF
            </button>
          </div>
        )}
      </header>

      {/* Caixa de Filtros */}
      <div className="relatorios-filter-card no-print">
        <div className="filter-group">
          <label>Cliente</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Data inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Data final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={`btn-primary btn-generate ${loading ? 'btn-loading' : ''}`}
          onClick={handleGenerateReport}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-icon" aria-hidden="true" />
              <span>Processando relatório...</span>
            </>
          ) : (
            <span>Gerar relatório</span>
          )}
        </button>
      </div>

      {reportData && (
        <div className="report-printable-area">
          {/* Cartões de Indicadores */}
          <div className="relatorios-metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Horas trabalhadas</span>
              <div className="metric-value">{formatHoursMinutes(reportData.totalSeconds)}</div>
              <span className="metric-footer">{reportData.totalDecimalHours.toFixed(2)} horas decimais</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Atividades no período</span>
              <div className="metric-value">{reportData.activitiesCount}</div>
              <span className="metric-footer">{reportData.totalEntriesCount} apontamentos encerrados</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Total dos serviços</span>
              <div className="metric-value" style={{ color: 'var(--color-primary)' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  reportData.totalFinancial
                )}
              </div>
              <span className="metric-footer">
                {reportData.totalDecimalHours.toFixed(2)}h &times; R$ {reportData.client.hourly_rate.toFixed(2)}/h
              </span>
            </div>
          </div>

          {/* Tabela Consolidada */}
          <div className="relatorios-table-card">
            <div className="report-table-header">
              <h3>{reportData.client.name}</h3>
              <span>
                {reportData.client.service} &bull; {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            <table className="relatorios-table">
              <thead>
                <tr>
                  <th>ATIVIDADE / DESCRIÇÃO</th>
                  <th style={{ textAlign: 'center' }}>REGISTROS</th>
                  <th>HORAS</th>
                  <th>VALOR/HORA</th>
                  <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {reportData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                      Nenhum apontamento concluído no período selecionado.
                    </td>
                  </tr>
                ) : (
                  reportData.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="row-act-title">{row.name}</div>
                        <div className="row-act-desc">{row.description || 'Sem descrição.'}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.entriesCount}</td>
                      <td>{formatHoursMinutes(row.seconds)}</td>
                      <td>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          reportData.client.hourly_rate
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          row.subtotal
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportData.rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Total do período</td>
                    <td style={{ textAlign: 'center' }}>{reportData.totalEntriesCount}</td>
                    <td>{formatHoursMinutes(reportData.totalSeconds)}</td>
                    <td>{reportData.totalDecimalHours.toFixed(2)} h</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        reportData.totalFinancial
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            <footer className="report-notice">
              <p>
                As horas em andamento não integram este relatório. Fechamento calculado estritamente sobre apontamentos encerrados.
              </p>
              <span className="report-timestamp">
                Gerado em {reportData.generatedAt.toLocaleDateString('pt-BR')} às {reportData.generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por {profile?.full_name || user?.email}
              </span>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}