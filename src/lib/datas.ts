// Utilitários de data no fuso local (Brasil).
// Padrão de gravação: 'AAAA-MM-DD'. Leitura aceita 'AAAA-MM-DD', ISO completo e 'DD/MM/AAAA'.

const pad = (n: number) => String(n).padStart(2, '0');

// Data de hoje em 'AAAA-MM-DD' no fuso local (não usar toISOString, que é UTC)
export function hojeISO(base: Date = new Date()): string {
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

// Chave do mês corrente 'AAAA-MM' no fuso local
export function mesAtualKey(base: Date = new Date()): string {
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}`;
}

// Converte qualquer formato aceito em Date local (meia-noite). Retorna null se inválido.
export function parseData(valor?: string | null): Date | null {
  if (!valor) return null;
  const s = String(valor).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Normaliza para 'AAAA-MM-DD' (para gravar). Retorna '' se inválido.
export function paraISO(valor?: string | null): string {
  const d = parseData(valor);
  return d ? hojeISO(d) : '';
}

// Formata para exibição 'DD/MM/AAAA'. Retorna '-' se inválido.
export function formatarDataBR(valor?: string | null): string {
  const d = parseData(valor);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '-';
}

// Soma dias a uma data (aceita qualquer formato) e devolve 'AAAA-MM-DD'
export function somarDias(valor: string | Date, dias: number): string {
  const d = valor instanceof Date ? new Date(valor) : parseData(valor) || new Date();
  d.setDate(d.getDate() + dias);
  return hojeISO(d);
}

// Compara datas em qualquer formato aceito (para ordenar). Inválidas vão para o fim.
export function compararDatas(a?: string | null, b?: string | null): number {
  const da = parseData(a)?.getTime() ?? Infinity;
  const db = parseData(b)?.getTime() ?? Infinity;
  return da - db;
}
