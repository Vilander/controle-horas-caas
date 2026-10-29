import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setErrorMsg(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao autenticar. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-badge">AS&amp;V Growth Partner</span>
          <h1 className="login-title">Controle de Horas</h1>
          <p className="login-subtitle">
            Acesse para acompanhar atividades e lançamentos da carteira.
          </p>
        </div>

        {errorMsg && <div className="login-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email">E-mail corporativo</label>
            <input
              id="email"
              type="email"
              required
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="login-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </form>

        <footer className="login-footer">
          <p>Acesso restrito a consultores e administradores autorizados.</p>
        </footer>
      </div>
    </div>
  );
}