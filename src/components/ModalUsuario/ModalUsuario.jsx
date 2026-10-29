import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ModalUsuario.css';

export function ModalUsuario({ isOpen, onClose, onUserCreated }) {
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
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 1. Cadastra na autenticação do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
          },
        },
      });

      if (authError) throw authError;

      // 2. Garante gravação/atualização na tabela profiles
      if (authData.user) {
        await supabase
          .from('profiles')
          .upsert([
            {
              id: authData.user.id,
              full_name: fullName.trim(),
              role: role,
            },
          ]);
      }

      alert('Usuário cadastrado com sucesso!');
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('consultant');
      onUserCreated();
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao cadastrar usuário: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '460px' }}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Cadastrar novo usuário</h2>
            <p className="modal-subtitle">Acesso restrito ao painel administrativo.</p>
          </div>
          <button className="modal-btn-close" onClick={onClose}>&times;</button>
        </header>

        {errorMsg && <div className="modal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field full-width">
            <label htmlFor="usr-name">Nome completo *</label>
            <input
              id="usr-name"
              type="text"
              required
              placeholder="Ex: Carlos Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="usr-email">E-mail de acesso *</label>
            <input
              id="usr-email"
              type="email"
              required
              placeholder="carlos@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="usr-pass">Senha provisória *</label>
            <input
              id="usr-pass"
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="usr-role">Privilégios de acesso *</label>
            <select
              id="usr-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
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