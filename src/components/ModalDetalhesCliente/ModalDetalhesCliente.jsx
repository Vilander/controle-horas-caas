import React from 'react';
import './ModalDetalhesCliente.css';

export function ModalDetalhesCliente({
  isOpen,
  onClose,
  client,
  activities = [],
  totalSeconds = 0,
  isAdmin = false
}) {
  if (!isOpen || !client) return null;

  const formatHoursMinutes = (secs) => {
    if (!secs || secs <= 0) return '0h 00min';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(val) || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Não definida';
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
  };

  // Cálculos consolidados
  const totalDecimalHours = totalSeconds / 3600;
  const hourlyRate = Number(client.hourly_rate || 0);
  const totalFinancial = totalDecimalHours * hourlyRate;

  // Lógica de pacote contratual
  const contractHours = client.contract_hours ? Number(client.contract_hours) : null;
  const hasPackage = contractHours !== null && client.billing_model !== 'postpaid';
  const balanceHours = hasPackage ? contractHours - totalDecimalHours : 0;
  const isOverLimit = balanceHours < 0;
  const exceededHours = isOverLimit ? Math.abs(balanceHours) : 0;
  const remainingHours = !isOverLimit ? balanceHours : 0;

  const getBillingModelLabel = (model) => {
    switch (model) {
      case 'fixed_total':
        return 'Modalidade 1: Valor Fechado + Horas Fixas';
      case 'hourly_package':
        return 'Modalidade 2: Horas Vendidas + Valor/Hora';
      case 'postpaid':
        return 'Modalidade 3: Pós-pago (Por Demanda)';
      default:
        return 'Pós-pago';
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="modal-detalhes-backdrop">
      <div className="modal-dialog modal-detalhes-dialog" role="dialog" aria-modal="true">
        {/* Cabeçalho da Janela em Tela */}
        <header className="modal-header no-print">
          <div>
            <h2 className="modal-title">Ficha Detalhada do Cliente</h2>
            <p className="modal-subtitle">Auditoria de contrato, condições comerciais e execução de horas.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        <div className="detalhes-content-scroll">
          {/* Cabeçalho Oficial no PDF Impresso */}
          <div className="print-pdf-header print-only">
            <div className="print-pdf-brand">
              <img src="/Logo-Original.webp" alt="AS&V Growth Partner" className="print-pdf-logo" />
              <div>
                <span className="print-pdf-sysname">Sistema de Controle de Horas (SCH)</span>
                <h1 className="print-pdf-title">Ficha Cadastral e Contratual do Cliente</h1>
              </div>
            </div>
            <div className="print-pdf-meta">
              <span className="print-pdf-date">
                Emitido em: {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="print-pdf-auth">Confidencial • Uso Administrativo</span>
            </div>
          </div>

          {/* Seção 1: Dados Cadastrais */}
          <section className="detalhes-section">
            <h3 className="detalhes-section-title">Dados Gerais e Cadastrais</h3>
            <div className="detalhes-grid-fields">
              <div className="detalhe-item">
                <span className="detalhe-label">Nome Fantasia / Cliente</span>
                <strong className="detalhe-val">{client.name}</strong>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Situação Cadastral</span>
                <span className={`detalhe-pill ${client.is_active ? 'pill-active' : 'pill-inactive'}`}>
                  {client.is_active ? '• Ativo' : '• Inativo'}
                </span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Razão Social</span>
                <span className="detalhe-val">{client.company_name || 'Não informada'}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">CNPJ</span>
                <span className="detalhe-val">{client.tax_id || 'Não informado'}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Responsável</span>
                <span className="detalhe-val">{client.contact_name || 'Não informado'}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">E-mail de Contato</span>
                <span className="detalhe-val">{client.contact_email || 'Não informado'}</span>
              </div>
            </div>
          </section>

          {/* Seção 2: Contratação e Finanças */}
          <section className="detalhes-section">
            <h3 className="detalhes-section-title">Parâmetros Comerciais e Vigência</h3>
            <div className="detalhes-grid-fields">
              <div className="detalhe-item">
                <span className="detalhe-label">Tipo de Serviço</span>
                <strong className="detalhe-val">{client.service}</strong>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Modalidade de Cobrança</span>
                <span className="detalhe-val">{getBillingModelLabel(client.billing_model)}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Início da Vigência</span>
                <span className="detalhe-val">{formatDate(client.contract_start_date)}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Término da Vigência</span>
                <span className="detalhe-val">{formatDate(client.contract_end_date)}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Tarifa por Hora</span>
                <strong className="detalhe-val" style={{ color: 'var(--color-primary, #000080)' }}>
                  {formatCurrency(hourlyRate)}/h
                </strong>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Valor Global do Contrato</span>
                <span className="detalhe-val">
                  {client.contract_value ? formatCurrency(client.contract_value) : 'Sob demanda'}
                </span>
              </div>
            </div>
          </section>

          {/* Seção 3: Execução de Horas */}
          <section className="detalhes-section">
            <h3 className="detalhes-section-title">Execução de Horas e Saldos</h3>
            <div className="detalhes-cards-row">
              <div className="detalhe-stat-card">
                <span className="stat-label">Total de Horas Executadas</span>
                <div className="stat-val">{formatHoursMinutes(totalSeconds)}</div>
                <span className="stat-footer">{totalDecimalHours.toFixed(2)} horas decimais</span>
              </div>

              {hasPackage ? (
                <>
                  <div className="detalhe-stat-card">
                    <span className="stat-label">Horas Contratadas (Pacote)</span>
                    <div className="stat-val">{contractHours.toFixed(0)}h 00min</div>
                    <span className="stat-footer">{contractHours.toFixed(2)}h contratadas</span>
                  </div>

                  <div className={`detalhe-stat-card ${isOverLimit ? 'stat-card-danger' : ''}`}>
                    <span className="stat-label">
                      {isOverLimit ? 'Horas Excedentes (Extras)' : 'Saldo de Horas Restantes'}
                    </span>
                    <div className="stat-val" style={{ color: isOverLimit ? '#D32F2F' : 'var(--color-primary, #000080)' }}>
                      {isOverLimit
                        ? `+${formatHoursMinutes(exceededHours * 3600)}`
                        : formatHoursMinutes(remainingHours * 3600)}
                    </div>
                    <span className="stat-footer">
                      {isOverLimit
                        ? `Cobrança adicional: ${formatCurrency(exceededHours * hourlyRate)}`
                        : `${remainingHours.toFixed(2)}h disponíveis`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="detalhe-stat-card">
                  <span className="stat-label">Total a Faturar (Pós-pago)</span>
                  <div className="stat-val" style={{ color: 'var(--color-primary, #000080)' }}>
                    {formatCurrency(totalFinancial)}
                  </div>
                  <span className="stat-footer">
                    {totalDecimalHours.toFixed(2)}h &times; {formatCurrency(hourlyRate)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Seção 4: Atividades */}
          <section className="detalhes-section">
            <h3 className="detalhes-section-title">Atividades Vinculadas ({activities.length})</h3>
            <table className="detalhes-table">
              <thead>
                <tr>
                  <th>ATIVIDADE</th>
                  <th>APONTAMENTOS</th>
                  <th>HORAS ENCERRADAS</th>
                  <th style={{ textAlign: 'right' }}>VALOR ACUMULADO</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#6B7280' }}>
                      Nenhuma atividade cadastrada.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => {
                    const actHoursDec = (act.totalSeconds || 0) / 3600;
                    const actSubtotal = actHoursDec * hourlyRate;
                    return (
                      <tr key={act.id}>
                        <td>
                          <strong>{act.name}</strong>
                          {act.description && <div className="table-desc">{act.description}</div>}
                        </td>
                        <td>{act.entryCount || 0}</td>
                        <td>{formatHoursMinutes(act.totalSeconds || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(actSubtotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        </div>

        <footer className="modal-footer no-print">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="btn-primary btn-print-pdf" onClick={handlePrintPDF}>
            Gerar PDF dos Detalhes
          </button>
        </footer>
      </div>
    </div>
  );
}