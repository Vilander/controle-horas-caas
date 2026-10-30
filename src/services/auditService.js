import { supabase } from '../lib/supabaseClient';

/**
 * Registra um evento de auditoria no sistema
 * @param {Object} params
 * @param {string} params.userId - ID do usuário logado
 * @param {string} params.userName - Nome completo do operador
 * @param {string} params.action - Ação realizada
 * @param {string} params.entityType - 'client' | 'activity' | 'time_entry'
 * @param {string} [params.entityId] - Identificador do objeto
 * @param {string} [params.clientName] - Nome fantasia do cliente
 * @param {Object} [params.details] - Metadados complementares
 */
export async function logAuditEvent({
  userId,
  userName,
  action,
  entityType,
  entityId = null,
  clientName = null,
  details = {},
}) {
  try {
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        user_name: userName || 'Usuário Desconhecido',
        action,
        entity_type: entityType,
        entity_id: String(entityId || ''),
        client_name: clientName,
        details,
      },
    ]);

    if (error) {
      console.warn('Falha ao registrar log de auditoria:', error.message);
    }
  } catch (err) {
    console.warn('Exceção capturada no logAuditEvent:', err);
  }
}