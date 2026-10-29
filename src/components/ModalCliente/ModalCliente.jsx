import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { maskCNPJ, validateCNPJ } from '../../utils/cnpjValidator';
import './ModalCliente.css';

export function ModalCliente({ isOpen, onClose, onClientSaved, clientToEdit = null }) {
  const initialFormState = {
    name: '',
    company_name: '',
    tax_id: '',
    contact_name: '',
    contact_email: '',
    service: 'Consultoria + CaaS',
    hourly_rate: '150.00',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincroniza o estado do formulário ao abrir ou alterar o cliente selecionado
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (clientToEdit) {
        setFormData({
          name: clientToEdit.name || '',
          company_name: clientToEdit.company_name || '',
          tax_id: clientToEdit.tax_id ? maskCNPJ(clientToEdit.tax_id) : '',
          contact_name: clientToEdit.contact_name || '',
          contact_email: clientToEdit.contact_email || '',
          service: clientToEdit.service || 'Consultoria + CaaS',
          hourly_rate: String(clientToEdit.hourly_rate ?? '150.00'),
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

  const handleTaxIdChange = (e) => {
    const formatted = maskCNPJ(e.target.value);
    setFormData((prev) => ({
      ...prev,
      tax_id: formatted,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validação de valor/hora
    const parsedRate = parseFloat(String(formData.hourly_rate).replace(',', '.'));
    if (isNaN(parsedRate) || parsedRate < 0) {
      setErrorMsg('Indique um valor por hora válido.');
      return;
    }

    // Validação do formato e dígitos do CNPJ (quando informado)
    if (formData.tax_id.trim()) {
      if (!validateCNPJ(formData.tax_id)) {
        setErrorMsg('CNPJ inválido. Certifique-se de que os dígitos e o formato cumprem a norma.');
        return;
      }
    }

    // Validação de consistência do período contratual
    if (formData.contract_start_date && formData.contract_end_date) {
      if (formData.contract_end_date < formData.contract_start_date) {
        setErrorMsg('A data de término do contrato não pode ser anterior à data de início.');
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
        hourly_rate: parsedRate,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        is_active: formData.is_active,
      };

      if (clientToEdit?.id) {
        // Atualização de cliente existente
        const { data, error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientToEdit.id)
          .select()
          .single();

        if (error) throw error;
        onClientSaved(data);
      } else {
        // Inserção de novo cliente
        const { data, error } = await supabase
          .from('clients')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        onClientSaved(data);
      }

      onClose();
    } catch (err) {
      setErrorMsg(`Erro ao guardar cliente: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">
              {clientToEdit ? 'Editar cliente' : 'Cadastrar cliente'}
            </h2>
            <p className="modal-subtitle">
              Organize a operação e defina o valor das horas de trabalho.
            </p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <section className="form-section">
            <span className="section-title">DADOS DO CLIENTE</span>

            <div className="form-field full-width">
              <label htmlFor="client-name">Nome do cliente *</label>
              <input
                id="client-name"
                name="name"
                type="text"
                required
                placeholder="Ex: Aurora Alimentos"
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
                  placeholder="Ex: Aurora Alimentos Ltda."
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
                  placeholder="Ex: Marina Costa"
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
                  placeholder="marina@aurora.com.br"
                  value={formData.contact_email}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <span className="section-title">CONTRATAÇÃO E VIGÊNCIA</span>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="contract-start">Início do contrato</label>
                <input
                  id="contract-start"
                  name="contract_start_date"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="contract-end">Término do contrato</label>
                <input
                  id="contract-end"
                  name="contract_end_date"
                  type="date"
                  value={formData.contract_end_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="service-select">Serviço *</label>
                <select
                  id="service-select"
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                >
                  <option value="Consultoria + CaaS">Consultoria + CaaS</option>
                  <option value="Consultoria">Consultoria</option>
                  <option value="CaaS">CaaS</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="hourly-rate">Valor por hora (R$) *</label>
                <input
                  id="hourly-rate"
                  name="hourly_rate"
                  type="text"
                  required
                  placeholder="150.00"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-field-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                <span>Situação inicial: • Ativo na operação</span>
              </label>
            </div>

            <div className="form-info-box">
              <p>
                ⓘ O valor por hora será usado no cálculo dos relatórios. O cliente será criado sem atividades e sem horas registradas.
              </p>
            </div>
          </section>

          <footer className="modal-footer">
            <span className="required-legend">* Campos obrigatórios</span>
            <div className="modal-actions">
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
                {loading 
                  ? 'A guardar...' 
                  : clientToEdit 
                    ? 'Salvar alterações' 
                    : 'Salvar cliente'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}