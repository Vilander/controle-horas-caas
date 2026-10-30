import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';
import { ModalInativarUsuario } from '../../components/ModalInativarUsuario/ModalInativarUsuario';
import './Usuarios.css';

export function Usuarios({ onOpenNewUserModal, onOpenEditUserModal }) {
  const { user: currentUser, profile: currentProfile, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativo');

  // Estado para controlar o modal de inativação
  const [userToToggle, setUserToToggle] = useState(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erro ao carregar lista de usuários:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const handleConfirmToggleStatus = async (targetUser, nextStatus) => {
    try {
      const { error } = await supabase.rpc('set_user_status', {
        target_user_id: targetUser.id,
        new_status: nextStatus,
      });

      if (error) throw error;

      await logAuditEvent({
        userId: currentUser.id,
        userName: currentProfile?.full_name || currentUser.email,
        action: nextStatus === 'ativo' ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
        entityType: 'user',
        entityId: targetUser.id,
        clientName: 'Gestão de Acessos',
        details: {
          operador_afetado: targetUser.full_name,
          novo_status: nextStatus,
        },
      });

      loadUsers();
    } catch (err) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && (u.status || 'ativo') === statusFilter;
  });

  const activeCount = users.filter((u) => (u.status || 'ativo') === 'ativo').length;
  const inactiveCount = users.filter((u) => u.status === 'inativo').length;

  return (
    <div className="usuarios-page">
      <header className="usuarios-header">
        <div>
          <span className="usuarios-breadcrumb">Administração / Equipe</span>
          <h1 className="usuarios-title">Gestão de Usuários</h1>
          <p className="usuarios-subtitle">
            Gerencie os acessos, cargos e operadores disponíveis para apontamento em clientes.
          </p>
        </div>

        {isAdmin && (
          <button type="button" className="btn-primary" onClick={onOpenNewUserModal}>
            + Convidar operador
          </button>
        )}
      </header>

      {/* Indicadores */}
      <div className="usuarios-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Operadores Ativos</span>
          <div className="metric-value">{activeCount}</div>
          <span className="metric-footer">Habilitados para novas tarefas</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Operadores Inativos</span>
          <div className="metric-value" style={{ color: 'var(--color-danger, #EF4444)' }}>
            {inactiveCount}
          </div>
          <span className="metric-footer">Histórico e apontamentos preservados</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Total Cadastrado</span>
          <div className="metric-value">{users.length}</div>
          <span className="metric-footer">Base geral de acessos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="usuarios-filter-bar">
        <div className="usuarios-search-box">
          <input
            type="text"
            placeholder="Q Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="usuarios-status-select">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ativo">Situação: Ativos</option>
            <option value="inativo">Situação: Inativos</option>
            <option value="all">Situação: Todos</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="usuarios-table-card">
        {loading ? (
          <div className="table-status-msg">Carregando operadores...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="table-status-msg">Nenhum operador localizado.</div>
        ) : (
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>OPERADOR</th>
                <th>PERFIL / CARGO</th>
                <th>SITUAÇÃO</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const initials = (u.full_name || 'US')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0].toUpperCase())
                  .join('');

                const isCurrent = u.id === currentUser.id;
                const userStatus = u.status || 'ativo';

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="user-identity">
                        <div className="user-badge">{initials}</div>
                        <div>
                          <div className="user-name">
                            {u.full_name || 'Sem nome'} {isCurrent && <span className="tag-self">(você)</span>}
                          </div>
                          <div className="user-email">{u.email || 'E-mail não informado'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role === 'admin' ? 'Administrador(a)' : 'Consultor(a)'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-tag status-${userStatus}`}>
                        • {userStatus === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="user-actions-cell">
                        {isAdmin && !isCurrent && (
                          <button
                            type="button"
                            className={`btn-action-pill ${userStatus === 'ativo' ? 'action-deactivate' : 'action-activate'}`}
                            onClick={() => setUserToToggle(u)}
                          >
                            {userStatus === 'ativo' ? 'Inativar' : 'Reativar'}
                          </button>
                        )}
                        {onOpenEditUserModal && (
                          <button
                            type="button"
                            className="btn-action-icon"
                            title="Editar operador"
                            onClick={() => onOpenEditUserModal(u)}
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Confirmação de Inativação / Reativação */}
      <ModalInativarUsuario
        isOpen={!!userToToggle}
        user={userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleConfirmToggleStatus}
      />
    </div>
  );
}