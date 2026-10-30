import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';
import './ModalUsuario.css';

export function ModalUsuario({ isOpen, onClose, onUserCreated }) {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('consultant');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('A senha provisória deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro desconhecido na Edge Function.');
      }

      // Trilha de auditoria da criação de usuário
      const operatorName = profile?.full_name || user?.email?.split('@')[0] || 'Administrador';
      await logAuditEvent({
        userId: user?.id,
        userName: operatorName,
        action: 'USER_CREATE',
        entityType: 'user',
        entityId: result?.user?.id,
        clientName: 'Sistema Interno',
        details: {
          operador_criado: fullName.trim(),
          email: email.trim(),
          papel: role === 'admin' ? 'Administrador(a)' : 'Consultor(a)',
        },
      });

      setFullName('');
      setEmail('');
      setPassword('');
      setRole('consultant');
      if (onUserCreated) onUserCreated();
      onClose();
    } catch (err) {
      setErrorMsg(`Erro ao cadastrar usuário: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-usuario-dialog" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Cadastrar novo usuário</h2>
            <p className="modal-subtitle">Acesso restrito ao painel administrativo.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose} type="button" aria-label="Fechar">
            &times;
          </button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field full-width">
            <label htmlFor="user-fullname">Nome completo *</label>
            <input
              id="user-fullname"
              type="text"
              required
              placeholder="Ex: Carlos Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="user-email">E-mail de acesso *</label>
            <input
              id="user-email"
              type="email"
              required
              placeholder="carlos@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="user-password">Senha provisória *</label>
            <input
              id="user-password"
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="user-role">Privilégios de acesso *</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="consultant">Consultor(a) (apontamento e atividades)</option>
              <option value="admin">Administrador(a) (gestão de clientes, equipe e fechamento)</option>
            </select>
          </div>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}