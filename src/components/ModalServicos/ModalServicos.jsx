import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalServicos.css';

export function ModalServicos({ isOpen, onClose, onServicesUpdated }) {
  const [services, setServices] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function fetchServices() {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Erro ao listar serviços:', err.message);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingServiceId(null);
    setErrorMsg('');
  };

  const handleEditClick = (service) => {
    setEditingServiceId(service.id);
    setName(service.name);
    setDescription(service.description || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      if (editingServiceId) {
        const { error } = await supabase
          .from('services')
          .update({ name: name.trim(), description: description.trim() })
          .eq('id', editingServiceId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert([{ name: name.trim(), description: description.trim() }]);

        if (error) throw error;
      }

      await fetchServices();
      if (onServicesUpdated) onServicesUpdated();
      resetForm();
    } catch (err) {
      setErrorMsg(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;
      await fetchServices();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err) {
      alert('Erro ao alterar status do serviço: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-servicos-dialog">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Gestão de Tipos de Serviços</h2>
            <p className="modal-subtitle">Configure as modalidades de contratação disponíveis para os clientes.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button">&times;</button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="form-novo-servico">
          <div className="form-row">
            <div className="form-field">
              <label>Nome da Modalidade *</label>
              <input
                type="text"
                placeholder="Ex: Treinamento Comercial"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Descrição Breve</label>
              <input
                type="text"
                placeholder="Ex: Capacitação da equipe de SDRs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="service-form-actions">
            {editingServiceId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar Edição
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : editingServiceId ? 'Salvar Alteração' : '+ Adicionar Serviço'}
            </button>
          </div>
        </form>

        <div className="services-list-container">
          <table className="servicos-table">
            <thead>
              <tr>
                <th>NOME</th>
                <th>DESCRIÇÃO</th>
                <th>SITUAÇÃO</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.description || '—'}</td>
                  <td>
                    <span className={`service-status-pill ${item.is_active ? 'status-active' : 'status-inactive'}`}>
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-action-icon"
                      title="Editar modalidade"
                      onClick={() => handleEditClick(item)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-action-pill"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.is_active ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Concluir
          </button>
        </footer>
      </div>
    </div>
  );
}