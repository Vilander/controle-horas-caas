/**
 * Converte caractere alfanumérico para o valor numérico da Receita Federal:
 * ASCII - 48 ('0'-'9' => 0-9; 'A'-'Z' => 17-42)
 */
function charToValue(char) {
  const code = char.toUpperCase().charCodeAt(0);
  return code - 48;
}

/**
 * Validador universal de CNPJ (Numérico tradicional e Alfanumérico)
 */
export function validateCNPJ(cnpj) {
  if (!cnpj) return true; // Campo não obrigatório

  // Remove caracteres especiais
  const cleaned = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (cleaned.length !== 14) return false;

  // Rejeita sequências repetidas triviais
  if (/^(\w)\1{13}$/.test(cleaned)) return false;

  // Validação dos Dígitos Verificadores (DV)
  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Cálculo do 1º DV
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += charToValue(cleaned[i]) * weightsFirst[i];
  }
  let rest = sum % 11;
  const expectedDv1 = rest < 2 ? 0 : 11 - rest;

  if (Number(cleaned[12]) !== expectedDv1) return false;

  // Cálculo do 2º DV
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += charToValue(cleaned[i]) * weightsSecond[i];
  }
  rest = sum % 11;
  const expectedDv2 = rest < 2 ? 0 : 11 - rest;

  return Number(cleaned[13]) === expectedDv2;
}

/**
 * Aplica máscara XX.XXX.XXX/XXXX-XX suportando letras e números
 */
export function maskCNPJ(value) {
  if (!value) return '';

  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);

  return clean
    .replace(/^([a-zA-Z0-9]{2})([a-zA-Z0-9])/, '$1.$2')
    .replace(/^([a-zA-Z0-9]{2})\.([a-zA-Z0-9]{3})([a-zA-Z0-9])/, '$1.$2.$3')
    .replace(/^([a-zA-Z0-9]{2})\.([a-zA-Z0-9]{3})\.([a-zA-Z0-9]{3})([a-zA-Z0-9])/, '$1.$2.$3/$4')
    .replace(/^([a-zA-Z0-9]{2})\.([a-zA-Z0-9]{3})\.([a-zA-Z0-9]{3})\/([a-zA-Z0-9]{4})([a-zA-Z0-9])/, '$1.$2.$3/$4-$5');
}