import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { maskCNPJ, validateCNPJ } from '../../utils/cnpjValidator';
import { ModalServicos } from '../ModalServicos/ModalServicos';
import { useAuth } from '../../context/AuthContext';
import './ModalCliente.css';

export function ModalCliente({ 
  isOpen, 
  onClose, 
  onClientSaved, 
  clientToEdit = null 
}) {
  const { isAdmin } = useAuth();

  const initialFormState = {
    name: '',
    company_name: '',
    tax_id: '',
    contact_name: '',
    contact_email: '',
    service: 'Consultoria + CaaS',
    billing_model: 'hourly_package', // 'fixed_total' | 'hourly_package' | 'postpaid'
    contract_value: '',
    contract_hours: '',
    hourly_rate: '150.00',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [availableServices, setAvailableServices] = useState([
    'Consultoria + CaaS',
    'Consultoria',
    'CaaS',
  ]);
  const [isManageServicesOpen, setIsManageServicesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadServices() {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setAvailableServices(data.map((s) => s.name));
      }
    } catch (err) {
      console.error('Erro ao carregar serviços:', err.message);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      loadServices();

      if (clientToEdit) {
        setFormData({
          name: clientToEdit.name || '',
          company_name: clientToEdit.company_name || '',
          tax_id: clientToEdit.tax_id ? maskCNPJ(clientToEdit.tax_id) : '',
          contact_name: clientToEdit.contact_name || '',
          contact_email: clientToEdit.contact_email || '',
          service: clientToEdit.service || 'Consultoria + CaaS',
          billing_model: clientToEdit.billing_model || 'postpaid',
          contract_value: clientToEdit.contract_value ? String(clientToEdit.contract_value) : '',
          contract_hours: clientToEdit.contract_hours ? String(clientToEdit.contract_hours) : '',
          hourly_rate: clientToEdit.hourly_rate ? String(clientToEdit.hourly_rate) : '150.00',
          contract_start_date: clientToEdit.contract_start_date || '',
          contract_end_date: clientToEdit.contract_end_date || '',
          is_active: clientToEdit.is_active ?? true,
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Cálculos automáticos baseados na modalidade selecionada
  const handleBillingCalculation = (field, value) => {
    const updated = { ...formData, [field]: value };
    const numValue = parseFloat(String(value).replace(',', '.')) || 0;

    if (updated.billing_model === 'fixed_total') {
      // Modalidade 1: Informa Valor Total e Horas -> Calcula Valor/Hora
      const total = field === 'contract_value' ? numValue : parseFloat(String(updated.contract_value).replace(',', '.')) || 0;
      const hours = field === 'contract_hours' ? numValue : parseFloat(String(updated.contract_hours).replace(',', '.')) || 0;

      if (hours > 0) {
        updated.hourly_rate = (total / hours).toFixed(2);
      }
    } else if (updated.billing_model === 'hourly_package') {
      // Modalidade 2: Informa Horas e Valor/Hora -> Calcula Valor Total
      const hours = field === 'contract_hours' ? numValue : parseFloat(String(updated.contract_hours).replace(',', '.')) || 0;
      const rate = field === 'hourly_rate' ? numValue : parseFloat(String(updated.hourly_rate).replace(',', '.')) || 0;

      updated.contract_value = (hours * rate).toFixed(2);
    }

    setFormData(updated);
  };

  const handleTaxIdChange = (e) => {
    const formatted = maskCNPJ(e.target.value);
    setFormData((prev) => ({ ...prev, tax_id: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedRate = parseFloat(String(formData.hourly_rate).replace(',', '.'));
    if (isNaN(parsedRate) || parsedRate < 0) {
      setErrorMsg('Indique um valor por hora válido.');
      return;
    }

    if (formData.billing_model !== 'postpaid') {
      const parsedHours = parseFloat(String(formData.contract_hours).replace(',', '.'));
      if (isNaN(parsedHours) || parsedHours <= 0) {
        setErrorMsg('Informe a quantidade de horas contratadas para esta modalidade.');
        return;
      }
    }

    if (formData.tax_id.trim() && !validateCNPJ(formData.tax_id)) {
      setErrorMsg('CNPJ inválido. Verifique a digitação.');
      return;
    }

    if (formData.contract_start_date && formData.contract_end_date) {
      if (formData.contract_end_date < formData.contract_start_date) {
        setErrorMsg('A data de término não pode ser anterior à data de início.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        company_name: formData.company_name.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        contact_name: formData.contact_name.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        service: formData.service,
        billing_model: formData.billing_model,
        contract_value: formData.contract_value ? parseFloat(String(formData.contract_value).replace(',', '.')) : null,
        contract_hours: formData.contract_hours ? parseFloat(String(formData.contract_hours).replace(',', '.')) : null,
        hourly_rate: parsedRate,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        is_active: formData.is_active,
      };

      if (clientToEdit?.id) {
        const { data, error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientToEdit.id)
          .select()
          .single();

        if (error) throw error;
        if (onClientSaved) onClientSaved(data);
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (onClientSaved) onClientSaved(data);
      }

      onClose();
    } catch (err) {
      setErrorMsg(`Erro ao salvar cliente: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal-dialog modal-cliente-dialog" role="dialog" aria-modal="true">
          <header className="modal-header">
            <div>
              <h2 className="modal-title">{clientToEdit ? 'Editar cliente' : 'Cadastrar cliente'}</h2>
              <p className="modal-subtitle">Organize a operação e defina o modelo comercial do contrato.</p>
            </div>
            <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
              &times;
            </button>
          </header>

          {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="modal-form">
            {/* Bloco 1: Dados do Cliente */}
            <section className="form-section">
              <span className="section-title">DADOS DO CLIENTE</span>

              <div className="form-field full-width">
                <label htmlFor="client-name">Nome do cliente *</label>
                <input
                  id="client-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Ex: Orbe Tecnologia"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="company-name">Razão social</label>
                  <input
                    id="company-name"
                    name="company_name"
                    type="text"
                    placeholder="Ex: Orbe Tecnologia Ltda."
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="tax-id">CNPJ</label>
                  <input
                    id="tax-id"
                    name="tax_id"
                    type="text"
                    placeholder="00.000.000/0001-00 ou alfanumérico"
                    value={formData.tax_id}
                    onChange={handleTaxIdChange}
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="contact-name">Responsável</label>
                  <input
                    id="contact-name"
                    name="contact_name"
                    type="text"
                    placeholder="Ex: Camila Oliveira"
                    value={formData.contact_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="contact-email">E-mail</label>
                  <input
                    id="contact-email"
                    name="contact_email"
                    type="email"
                    placeholder="camila@orbe.com.br"
                    value={formData.contact_email}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>

            {/* Bloco 2: Modalidade Comercial e Contratação */}
            <section className="form-section">
              <span className="section-title">CONTRATAÇÃO & MODELO DE COBRANÇA</span>

              <div className="form-row">
                <div className="form-field">
                  <div className="field-label-wrapper">
                    <label htmlFor="service-select">Serviço *</label>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => setIsManageServicesOpen(true)}
                      >
                        Gerir tipos
                      </button>
                    )}
                  </div>
                  <select
                    id="service-select"
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    required
                  >
                    {availableServices.map((srv) => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="billing-model">Modelo comercial *</label>
                  <select
                    id="billing-model"
                    name="billing_model"
                    value={formData.billing_model}
                    onChange={(e) => {
                      const model = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        billing_model: model,
                        contract_value: model === 'postpaid' ? '' : prev.contract_value,
                        contract_hours: model === 'postpaid' ? '' : prev.contract_hours,
                      }));
                    }}
                  >
                    <option value="fixed_total">Modalidade 1: Valor Fechado + Horas (Calcula Valor/Hora)</option>
                    <option value="hourly_package">Modalidade 2: Horas Vendidas + Valor/Hora (Calcula Contrato)</option>
                    <option value="postpaid">Modalidade 3: Pós-pago (Apenas Valor/Hora)</option>
                  </select>
                </div>
              </div>

              {/* Campos dinâmicos conforme modalidade */}
              <div className="form-row">
                {formData.billing_model !== 'postpaid' && (
                  <div className="form-field">
                    <label htmlFor="contract-hours">Horas vendidas (Pacote) *</label>
                    <input
                      id="contract-hours"
                      name="contract_hours"
                      type="number"
                      step="0.5"
                      placeholder="Ex: 280"
                      value={formData.contract_hours}
                      onChange={(e) => handleBillingCalculation('contract_hours', e.target.value)}
                      required
                    />
                  </div>
                )}

                {formData.billing_model === 'fixed_total' && (
                  <div className="form-field">
                    <label htmlFor="contract-value">Valor do contrato (R$) *</label>
                    <div className="input-currency-wrapper">
                      <span className="currency-symbol">R$</span>
                      <input
                        id="contract-value"
                        name="contract_value"
                        type="text"
                        placeholder="30000.00"
                        value={formData.contract_value}
                        onChange={(e) => handleBillingCalculation('contract_value', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="hourly-rate">
                    {formData.billing_model === 'fixed_total' ? 'Valor por hora (Calculado)' : 'Valor por hora *'}
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-symbol">R$</span>
                    <input
                      id="hourly-rate"
                      name="hourly_rate"
                      type="text"
                      placeholder="150.00"
                      value={formData.hourly_rate}
                      onChange={(e) => handleBillingCalculation('hourly_rate', e.target.value)}
                      readOnly={formData.billing_model === 'fixed_total'}
                      className={formData.billing_model === 'fixed_total' ? 'input-calculated' : ''}
                      required
                    />
                  </div>
                </div>

                {formData.billing_model === 'hourly_package' && (
                  <div className="form-field">
                    <label htmlFor="contract-value">Total do contrato (Calculado)</label>
                    <div className="input-currency-wrapper">
                      <span className="currency-symbol">R$</span>
                      <input
                        id="contract-value"
                        name="contract_value"
                        type="text"
                        value={formData.contract_value}
                        readOnly
                        className="input-calculated"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="contract-start">Início da vigência</label>
                  <input
                    id="contract-start"
                    name="contract_start_date"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="contract-end">Término da vigência</label>
                  <input
                    id="contract-end"
                    name="contract_end_date"
                    type="date"
                    value={formData.contract_end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-field-checkbox">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <span className="checkbox-text">
                    Situação: <strong>• {formData.is_active ? 'Ativo' : 'Inativo'}</strong>
                  </span>
                </label>
              </div>
            </section>

            <footer className="modal-footer">
              <span className="required-legend">* Campos obrigatórios</span>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : clientToEdit ? 'Salvar alterações' : 'Salvar cliente'}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>

      <ModalServicos
        isOpen={isManageServicesOpen}
        onClose={() => setIsManageServicesOpen(false)}
        onServicesUpdated={loadServices}
      />
    </>
  );
}