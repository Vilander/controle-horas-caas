import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
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
      // 1. Tenta autenticar na API do Supabase
      const { user } = await signIn(email.trim(), password);

      // 2. Valida se o usuário existe e se o status no perfil está ativo
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error('Falha ao validar permissões do perfil.');
        }

        // CORREÇÃO AQUI: Bloqueia se o perfil vier vazio (RLS) ou se estiver inativo
        if (!profile || profile.status === 'inativo') {
          // Desconecta imediatamente e bloqueia a navegação
          await supabase.auth.signOut();
          throw new Error('Sua conta foi desativada, procure um administrador.');
        }
      }
    } catch (err) {
      const message = err?.message || '';

      if (message.includes('Invalid login credentials')) {
        setErrorMsg('E-mail ou senha incorretos.');
      } else if (message.includes('Email not confirmed')) {
        setErrorMsg('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
      } else if (message.includes('desativada')) {
        setErrorMsg(message);
      } else {
        setErrorMsg('Erro ao autenticar. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <header className="login-header">
          <img 
            src="/Logo-Original.webp" 
            alt="AS&V Growth Partner" 
            className="login-logo"
            onError={(e) => { 
              e.currentTarget.style.display = 'none'; 
            }}
          />
          <span className="login-badge">SISTEMA DE CONTROLE DE HORAS (SCH)</span>
          <h1 className="login-title">Acesso ao Painel</h1>
          <p className="login-subtitle">
            Informe suas credenciais corporativas para gerenciar atividades e lançamentos.
          </p>
        </header>

        {errorMsg && (
          <div className="login-alert-error" role="alert">
            <span className="alert-icon">⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">E-mail corporativo</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu.nome@asvgrowth.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Senha de acesso</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="login-btn-submit"
            disabled={isSubmitting || !email.trim() || !password}
          >
            {isSubmitting ? 'Validando acesso...' : 'Entrar no sistema'}
          </button>
        </form>

        <footer className="login-footer">
          <p>Acesso restrito a consultores e administradores autorizados.</p>
        </footer>
      </div>
    </div>
  );
}