import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalCliente.css';

export function ModalCliente({ isOpen, onClose, onClientCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    tax_id: '',
    contact_name: '',
    contact_email: '',
    service: 'Consultoria + CaaS',
    hourly_rate: '150.00',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedRate = parseFloat(formData.hourly_rate.replace(',', '.'));
    if (isNaN(parsedRate) || parsedRate < 0) {
      setErrorMsg('Informe um valor por hora válido.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            name: formData.name.trim(),
            company_name: formData.company_name.trim() || null,
            tax_id: formData.tax_id.trim() || null,
            contact_name: formData.contact_name.trim() || null,
            contact_email: formData.contact_email.trim() || null,
            service: formData.service,
            hourly_rate: parsedRate,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      onClientCreated(data);
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao cadastrar cliente: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Cadastrar cliente</h2>
            <p className="modal-subtitle">Organize a operação e defina o valor das horas de trabalho.</p>
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
            <span className="section-title">CONTRATAÇÃO</span>

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
                <label htmlFor="hourly_rate">Valor por hora *</label>
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

            <div className="form-info-box">
              <p>
                O valor por hora será usado no cálculo dos relatórios. O cliente será criado sem atividades e sem horas registradas.
              </p>
            </div>
          </section>

          <footer className="modal-footer">
            <span className="required-legend">* Campos obrigatórios</span>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}