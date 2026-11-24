// Metas de venda do Grupo ENO: por cliente ou por representante (RCA).
// Escopo: total, produto ou categoria. Unidade: valor (R$) ou quantidade (kg).
// O realizado conta pedidos FATURADOS ou ENTREGUES, pela data de faturamento (ou emissão), dentro do período.
import { carregarPedidosVenda, PedidoVenda } from './pedidosVendaData';
import { carregarEstoqueProdutos, ProdutoEstoque } from './produtosData';
import { paraISO } from '../lib/datas';

export type DestinatarioMeta = 'CLIENTE' | 'RCA';
export type EscopoMeta = 'TOTAL' | 'PRODUTO' | 'CATEGORIA';
export type UnidadeMeta = 'VALOR' | 'KG';

export interface MetaVenda {
  id: string;
  destinatario: DestinatarioMeta;
  destinatario_id: string;
  destinatario_nome: string;
  escopo: EscopoMeta;
  escopo_valor?: string; // id do produto ou nome da categoria
  escopo_nome?: string;  // nome exibido do produto ou da categoria
  unidade: UnidadeMeta;
  valor_meta: number;
  inicio: string; // AAAA-MM-DD
  fim: string;    // AAAA-MM-DD
  criado_em: string;
}

const STORAGE_KEY_METAS = 'grupo_eno_metas_v1';
export const EVENTO_METAS = 'metas_updated';

export function carregarMetas(): MetaVenda[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METAS);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function salvarMetas(lista: MetaVenda[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_METAS, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO_METAS));
}

export const rotuloEscopo = (m: Pick<MetaVenda, 'escopo' | 'escopo_nome'>) =>
  m.escopo === 'TOTAL' ? 'Total de vendas' : m.escopo === 'PRODUTO' ? `Produto: ${m.escopo_nome || ''}` : `Categoria: ${m.escopo_nome || ''}`;

export const rotuloUnidade = (u: UnidadeMeta) => (u === 'VALOR' ? 'Valor (R$)' : 'Quantidade (kg)');

function dentroDoPeriodo(data: string | undefined, inicio: string, fim: string): boolean {
  const iso = paraISO(data) || '';
  return !!iso && iso >= inicio && iso <= fim;
}

/** Quanto já foi vendido para a meta (valor em R$ ou kg), dentro do período. */
export function realizadoMeta(
  meta: MetaVenda,
  pedidos: PedidoVenda[] = carregarPedidosVenda(),
  produtos: ProdutoEstoque[] = carregarEstoqueProdutos()
): number {
  const categoriaDe = (produtoId: string) => produtos.find(p => p.id === produtoId)?.categoria || '';
  let total = 0;
  pedidos.forEach(p => {
    if (p.etapa !== 'FATURADO' && p.etapa !== 'ENTREGUE') return;
    if (meta.destinatario === 'CLIENTE' && p.cliente_id !== meta.destinatario_id) return;
    if (meta.destinatario === 'RCA' && p.rca_id !== meta.destinatario_id) return;
    if (!dentroDoPeriodo(p.data_faturamento || p.data_emissao, meta.inicio, meta.fim)) return;
    p.itens.forEach(item => {
      if (meta.escopo === 'PRODUTO' && item.produto_id !== meta.escopo_valor) return;
      if (meta.escopo === 'CATEGORIA' && categoriaDe(item.produto_id) !== meta.escopo_valor) return;
      total += meta.unidade === 'VALOR' ? Number(item.subtotal) || 0 : Number(item.peso_total_kg) || 0;
    });
  });
  return Math.round(total * 100) / 100;
}

/** Metas de um destinatário que estão valendo hoje (período em andamento). */
export function metasAtivasDo(destinatario: DestinatarioMeta, id: string, hoje: string): MetaVenda[] {
  return carregarMetas().filter(m =>
    m.destinatario === destinatario && m.destinatario_id === id && m.inicio <= hoje && m.fim >= hoje
  );
}
