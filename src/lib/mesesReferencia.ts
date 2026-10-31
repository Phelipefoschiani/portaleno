// Meses de referência no formato 'Mmm/AA' (ex.: 'Out/26') usados nos gráficos mensais.
import { parseData } from './datas';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** 'Mmm/AA' de uma data em qualquer formato aceito por parseData. Retorna '' se inválida. */
export function mesReferenciaDe(valor?: string | Date | null): string {
  const d = valor instanceof Date ? valor : parseData(valor);
  if (!d) return '';
  return `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
}

/** Últimos `n` meses (do mais antigo ao atual) no formato 'Mmm/AA'. */
export function ultimosMesesReferencia(n: number = 6, base: Date = new Date()): string[] {
  const lista: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    lista.push(mesReferenciaDe(new Date(base.getFullYear(), base.getMonth() - i, 1)));
  }
  return lista;
}
