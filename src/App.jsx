import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login/Login';
import './App.css';

function MainApp() {
  const { user, profile, isAdmin, signOut } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Painel Principal</h1>
      <p>Logado como: <strong>{profile?.full_name || user.email}</strong></p>
      <p>Perfil de acesso: <strong>{profile?.role}</strong> {isAdmin && '(Acesso total de Administrador)'}</p>
      <button 
        onClick={signOut}
        style={{
          padding: '8px 16px',
          backgroundColor: '#0D0D11',
          color: '#FFF',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Sair
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}