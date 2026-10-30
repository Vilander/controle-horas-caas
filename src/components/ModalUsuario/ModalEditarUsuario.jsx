import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';
import './ModalUsuario.css';

export function ModalEditarUsuario({ isOpen, user: userToEdit, onClose, onUserUpdated }) {
  const { user: currentUser, profile, isAdmin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('consultant');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && userToEdit) {
      setFullName(userToEdit.full_name || '');
      setPhone(userToEdit.phone || '');
      setRole(userToEdit.role || 'consultant');
      setErrorMsg('');
    }
  }, [isOpen, userToEdit]);

  if (!isOpen || !userToEdit) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('O nome completo é obrigatório.');
      return;
    }

    if (userToEdit.id === currentUser.id && role === 'consultant' && isAdmin) {
      const confirmSelfDemotion = window.confirm(
        'Atenção: Está a alterar o seu próprio perfil para Consultor(a). Perderá acesso a este painel administrativo. Deseja continuar?'
      );
      if (!confirmSelfDemotion) return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Chamada nativa Fetch para desvendar o erro que o Supabase JS esconde
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          target_user_id: userToEdit.id,
          full_name: fullName.trim(),
          phone: phone.trim() || null, // Garante que o campo vazio vai como nulo
          role: role,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro desconhecido na Edge Function.');
      }

      // Trilha de auditoria
      const operatorName = profile?.full_name || currentUser?.email?.split('@')[0] || 'Administrador';
      await logAuditEvent({
        userId: currentUser?.id,
        userName: operatorName,
        action: 'USER_UPDATE',
        entityType: 'user',
        entityId: userToEdit.id,
        clientName: 'Gestão de Acessos',
        details: {
          operador_editado: userToEdit.full_name,
          novo_nome: fullName.trim(),
          novo_telefone: phone.trim(),
          novo_papel: role === 'admin' ? 'Administrador(a)' : 'Consultor(a)',
        },
      });

      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(`Falha na atualização: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-usuario-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Editar operador</h2>
            <p className="modal-subtitle">Atualize os dados cadastrais e privilégios de acesso.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field full-width">
            <label>E-mail de acesso (Não editável)</label>
            <input
              type="text"
              value={userToEdit.email || 'E-mail não disponível'}
              disabled
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="edit-user-fullname">Nome completo (Display Name) *</label>
            <input
              id="edit-user-fullname"
              type="text"
              required
              placeholder="Ex: Carlos Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="edit-user-phone">Telefone</label>
            <input
              id="edit-user-phone"
              type="text"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="edit-user-role">Privilégios de acesso *</label>
            <select
              id="edit-user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="consultant">Consultor(a) (apontamento e atividades)</option>
              <option value="admin">Administrador(a) (gestão completa, contratos e auditoria)</option>
            </select>
          </div>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'A guardar...' : 'Salvar alterações'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}