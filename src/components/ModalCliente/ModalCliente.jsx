import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalCliente.css';

export function ModalCliente({ isOpen, onClose, onClientSaved, clientToEdit = null }) {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    tax_id: '',
    contact_name: '',
    contact_email: '',
    service: 'Consultoria + CaaS',
    hourly_rate: '150.00',
    contract_start_date: '',
    contract_end_date: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (clientToEdit && isOpen) {
      setFormData({
        name: clientToEdit.name || '',
        company_name: clientToEdit.company_name || '',
        tax_id: clientToEdit.tax_id || '',
        contact_name: clientToEdit.contact_name || '',
        contact_email: clientToEdit.contact_email || '',
        service: clientToEdit.service || 'Consultoria + CaaS',
        hourly_rate: String(clientToEdit.hourly_rate || '150.00'),
        contract_start_date: clientToEdit.contract_start_date || '',
        contract_end_date: clientToEdit.contract_end_date || '',
        is_active: clientToEdit.is_active ?? true,
      });
    } else if (!clientToEdit && isOpen) {
      setFormData({
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
      });
    }
    setErrorMsg('');
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedRate = parseFloat(String(formData.hourly_rate).replace(',', '.'));
    if (isNaN(parsedRate) || parsedRate < 0) {
      setErrorMsg('Informe um valor por hora válido.');
      return;
    }

    if (formData.contract_start_date && formData.contract_end_date) {
      if (formData.contract_end_date < formData.contract_start_date) {
        setErrorMsg('A data de fim do contrato não pode ser anterior à data de início.');
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

      if (clientToEdit) {
        // Atualização
        const { data, error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientToEdit.id)
          .select()
          .single();

        if (error) throw error;
        onClientSaved(data);
      } else {
        // Criação
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
      setErrorMsg('Erro ao salvar cliente: ' + err.message);
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
              Configure as informações operacionais e datas do contrato.
            </p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <section className="form-section">
            <span className="section-title">DADOS DO CLIENTE</span>

            <div className="form-field full-width">
              <label htmlFor="name">Nome do cliente *</label>
              <input
                id="name"
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
                <label htmlFor="company_name">Razão social</label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  placeholder="Ex: Aurora Alimentos Ltda."
                  value={formData.company_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="tax_id">CNPJ</label>
                <input
                  id="tax_id"
                  name="tax_id"
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={formData.tax_id}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="contact_name">Responsável</label>
                <input
                  id="contact_name"
                  name="contact_name"
                  type="text"
                  placeholder="Ex: Marina Costa"
                  value={formData.contact_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="contact_email">E-mail</label>
                <input
                  id="contact_email"
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
                <label htmlFor="contract_start_date">Início do contrato</label>
                <input
                  id="contract_start_date"
                  name="contract_start_date"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="contract_end_date">Término do contrato</label>
                <input
                  id="contract_end_date"
                  name="contract_end_date"
                  type="date"
                  value={formData.contract_end_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="service">Serviço *</label>
                <select
                  id="service"
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
                <label htmlFor="hourly_rate">Valor por hora (R$) *</label>
                <input
                  id="hourly_rate"
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
                <span>Cliente ativo na operação</span>
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
                {loading ? 'Salvando...' : clientToEdit ? 'Atualizar cliente' : 'Salvar cliente'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}