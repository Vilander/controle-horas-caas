export function getContractStatusAlert(endDateString) {
  if (!endDateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = endDateString.split('-').map(Number);
  const endDate = new Date(year, month - 1, day);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      severity: 'expired',
      days: Math.abs(diffDays),
      message: `Contrato encerrado há ${Math.abs(diffDays)} dia(s).`,
      needsAction: true,
    };
  }

  if (diffDays === 0) {
    return {
      severity: 'urgent',
      days: 0,
      message: 'O contrato se encerra HOJE!',
      needsAction: true,
    };
  }

  if (diffDays === 1) {
    return {
      severity: 'urgent',
      days: 1,
      message: 'Atenção: encerramento do contrato amanhã (1 dia restante).',
      needsAction: true,
    };
  }

  if (diffDays <= 7) {
    return {
      severity: 'warning',
      days: diffDays,
      message: `Encerramento do contrato em ${diffDays} dias (aviso de 7 dias).`,
      needsAction: true,
    };
  }

  if (diffDays <= 15) {
    return {
      severity: 'info',
      days: diffDays,
      message: `Encerramento do contrato em ${diffDays} dias (aviso de 15 dias).`,
      needsAction: false,
    };
  }

  if (diffDays <= 30) {
    return {
      severity: 'info',
      days: diffDays,
      message: `Encerramento do contrato em ${diffDays} dias (aviso de 30 dias).`,
      needsAction: false,
    };
  }

  return null;
}