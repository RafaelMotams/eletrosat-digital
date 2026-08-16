/**
 * Formata um número para uso no WhatsApp (wa.me): mantém apenas dígitos e
 * garante o código do Brasil (55) quando o número inclui DDD.
 * Retorna `null` quando o valor é vazio ou curto demais para ser válido.
 */
export function formatWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  // Se já começa com 55 (código do Brasil), usa direto
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Se tem DDD (10 ou 11 dígitos), adiciona código do Brasil
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Se tem apenas o número sem DDD (8 ou 9 dígitos), retorna como está
  return digits;
}
