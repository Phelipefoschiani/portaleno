// Lotes de matéria-prima: cada entrada no estoque vira um lote com saldo próprio,
// e cada produção grava de quais lotes a matéria-prima saiu (rastreabilidade).
import { hojeISO, formatarDataBR } from '../lib/datas';

export interface LoteMateriaPrima {
  id: string;
  materia_prima_id: string;
  materia_prima_nome: string;
  lote: string; // vazio = entrada sem lote informado
  data_entrada: string; // AAAA-MM-DD
  data_validade?: string; // AAAA-MM-DD
  quantidade_entrada: number; // na unidade da matéria-prima
  saldo: number;
  unidade: string;
  fornecedor_nome?: string;
  pedido_compra_id?: string;
  nota?: string;
}

// Saída de um lote numa produção
export interface UsoLoteMateriaPrima {
  lote_id?: string; // ausente = saldo sem lote identificado
  lote: string;
  quantidade: number;
  unidade: string;
  data_validade?: string;
}

const STORAGE_KEY = 'grupo_eno_lotes_materia_prima_v1';
export const EVENTO_LOTES_MP = 'lotes_materia_prima_updated';
export const SEM_LOTE = 'Sem lote identificado';

const arred = (n: number) => parseFloat((Number(n) || 0).toFixed(4));

export function carregarLotesMP(): LoteMateriaPrima[] {
  if (typeof window === 'undefined') return [];
  try {
    const lista = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarLotesMP(lista: LoteMateriaPrima[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO_LOTES_MP));
}

export function rotuloLoteMP(l: Pick<LoteMateriaPrima, 'lote' | 'data_entrada'>): string {
  return l.lote ? l.lote : `S/ lote (entrada ${formatarDataBR(l.data_entrada)})`;
}

export function registrarLoteMP(dados: Omit<LoteMateriaPrima, 'id' | 'saldo' | 'data_entrada'> & { data_entrada?: string }): LoteMateriaPrima | null {
  if (typeof window === 'undefined' || !(dados.quantidade_entrada > 0)) return null;
  const novo: LoteMateriaPrima = {
    ...dados,
    id: `lmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    lote: (dados.lote || '').trim(),
    data_entrada: dados.data_entrada || hojeISO(),
    quantidade_entrada: arred(dados.quantidade_entrada),
    saldo: arred(dados.quantidade_entrada)
  };
  salvarLotesMP([novo, ...carregarLotesMP()]);
  return novo;
}

// Estorno de uma entrada (exclusão do pedido de compra): o lote some
export function removerLoteMP(loteId?: string): void {
  if (!loteId) return;
  salvarLotesMP(carregarLotesMP().filter(l => l.id !== loteId));
}

// Lotes com saldo de uma matéria-prima: vence primeiro sai primeiro, depois o mais antigo
export function lotesDisponiveisMP(materiaPrimaId: string): LoteMateriaPrima[] {
  return carregarLotesMP()
    .filter(l => l.materia_prima_id === materiaPrimaId && l.saldo > 0.0001)
    .sort((a, b) =>
      (a.data_validade || '9999').localeCompare(b.data_validade || '9999') ||
      a.data_entrada.localeCompare(b.data_entrada)
    );
}

/**
 * Baixa `quantidade` dos lotes da matéria-prima: primeiro os lotes escolhidos pela produção (na ordem),
 * depois os demais por validade. O que não couber em lote nenhum fica como "Sem lote identificado".
 */
export function consumirLotesMP(materiaPrimaId: string, quantidade: number, unidade: string, preferidos: string[] = []): UsoLoteMateriaPrima[] {
  let resta = arred(quantidade);
  if (resta <= 0) return [];
  const lista = carregarLotesMP();
  const disponiveis = lotesDisponiveisMP(materiaPrimaId);
  const ordem = [
    ...preferidos.map(id => disponiveis.find(l => l.id === id)).filter((l): l is LoteMateriaPrima => !!l),
    ...disponiveis.filter(l => !preferidos.includes(l.id))
  ];
  const usos: UsoLoteMateriaPrima[] = [];
  for (const l of ordem) {
    if (resta <= 0) break;
    const tirar = Math.min(l.saldo, resta);
    const idx = lista.findIndex(x => x.id === l.id);
    if (idx < 0 || tirar <= 0) continue;
    lista[idx] = { ...lista[idx], saldo: arred(lista[idx].saldo - tirar) };
    usos.push({ lote_id: l.id, lote: rotuloLoteMP(l), quantidade: arred(tirar), unidade, data_validade: l.data_validade });
    resta = arred(resta - tirar);
  }
  if (resta > 0) usos.push({ lote: SEM_LOTE, quantidade: resta, unidade });
  if (usos.some(u => u.lote_id)) salvarLotesMP(lista);
  return usos;
}

// Lotes usados, em texto ("L123, L124")
export function textoUsosLotes(usos?: UsoLoteMateriaPrima[]): string {
  return (usos || []).map(u => u.lote).join(', ');
}
