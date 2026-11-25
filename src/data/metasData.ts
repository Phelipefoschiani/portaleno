// Metas de venda do Grupo ENO: por cliente ou por representante (RCA).
// Escopo: total, produto ou categoria. Unidade: valor (R$) ou quantidade (kg).
// O realizado conta pedidos FATURADOS ou ENTREGUES, pela data de faturamento (ou emissão), dentro do período.
import { carregarPedidosVenda, PedidoVenda } from './pedidosVendaData';
import { carregarEstoqueProdutos, ProdutoEstoque } from './produtosData';
import { paraISO } from '../lib/datas';

export type DestinatarioMeta = 'CLIENTE' | 'RCA';
export type EscopoMeta = 'TOTAL' | 'PRODUTO' | 'CATEGORIA';
export type UnidadeMeta = 'VALOR' | 'KG';

/** Como a parte de cada cliente é definida dentro da meta do representante. */
export type ModoDistribuicao = 'PERCENTUAL' | 'PESO' | 'VALOR';

/** Parte de um cliente na meta do representante: % da meta, kg ou R$. */
export interface DistribuicaoMeta {
  cliente_id: string;
  cliente_nome: string;
  modo: ModoDistribuicao;
  valor: number;
}

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
  /** Só em metas de RCA: meta de cada cliente dele. Metas antigas não têm; tratadas como antes. */
  distribuicao?: DistribuicaoMeta[];
}

/** Meta de um cliente já calculada a partir da distribuição de uma meta de RCA. */
export interface MetaCliente extends MetaVenda {
  /** id da meta do RCA de onde veio */
  derivada_de: string;
}

/** Valor da meta do cliente, na unidade que o próprio modo define. */
export function metaDoClienteNaDistribuicao(
  m: Pick<MetaVenda, 'unidade' | 'valor_meta'>,
  d: DistribuicaoMeta
): { unidade: UnidadeMeta; valor: number } {
  if (d.modo === 'PERCENTUAL') return { unidade: m.unidade, valor: Math.round(m.valor_meta * d.valor) / 100 };
  if (d.modo === 'PESO') return { unidade: 'KG', valor: d.valor };
  return { unidade: 'VALOR', valor: d.valor };
}

export const rotuloModoDistribuicao = (d: Pick<DistribuicaoMeta, 'modo' | 'valor'>) =>
  d.modo === 'PERCENTUAL' ? `${d.valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% da meta`
  : d.modo === 'PESO' ? `${d.valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
  : `R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const proprias = carregarMetas().filter(m =>
    m.destinatario === destinatario && m.destinatario_id === id && m.inicio <= hoje && m.fim >= hoje
  );
  if (destinatario !== 'CLIENTE') return proprias;
  return [...proprias, ...metasDerivadasDoCliente(id, hoje)];
}

/** Metas do cliente que vêm da divisão feita nas metas dos representantes (valendo hoje). */
export function metasDerivadasDoCliente(clienteId: string, hoje: string): MetaCliente[] {
  const saida: MetaCliente[] = [];
  carregarMetas().forEach(m => {
    if (m.destinatario !== 'RCA' || !m.distribuicao || m.inicio > hoje || m.fim < hoje) return;
    m.distribuicao.forEach(d => {
      if (d.cliente_id !== clienteId || !(d.valor > 0)) return;
      const alvo = metaDoClienteNaDistribuicao(m, d);
      saida.push({
        ...m,
        id: `${m.id}__${clienteId}`,
        derivada_de: m.id,
        destinatario: 'CLIENTE',
        destinatario_id: clienteId,
        destinatario_nome: d.cliente_nome,
        unidade: alvo.unidade,
        valor_meta: alvo.valor,
        distribuicao: undefined,
      });
    });
  });
  return saida;
}

/**
 * Distribuição para editar numa meta de RCA. Meta sem divisão ainda: divide igualmente em % entre os clientes do RCA.
 * Meta já dividida: mantém o que estava e põe clientes novos com 0 (o usuário escolhe quanto dão).
 */
export function distribuicaoInicial(
  existente: DistribuicaoMeta[] | undefined,
  clientesDoRca: { id: string; nome: string }[]
): DistribuicaoMeta[] {
  if (!existente) {
    const n = clientesDoRca.length;
    const parte = n > 0 ? Math.round((100 / n) * 100) / 100 : 0;
    return clientesDoRca.map(c => ({ cliente_id: c.id, cliente_nome: c.nome, modo: 'PERCENTUAL' as ModoDistribuicao, valor: parte }));
  }
  const porId = new Map(existente.map(d => [d.cliente_id, d]));
  const listaRca = clientesDoRca.map(c =>
    porId.get(c.id)
      ? { ...porId.get(c.id)!, cliente_nome: c.nome }
      : { cliente_id: c.id, cliente_nome: c.nome, modo: 'PERCENTUAL' as ModoDistribuicao, valor: 0 }
  );
  const idsRca = new Set(clientesDoRca.map(c => c.id));
  // Clientes que saíram do RCA continuam listados só se já tinham parte (para não perder a conta)
  const sobra = existente.filter(d => !idsRca.has(d.cliente_id) && d.valor > 0);
  return [...listaRca, ...sobra];
}

/** Quanto um cliente já vendeu para a parte dele numa meta de RCA (mesma regra do realizadoMeta). */
export function realizadoDaParteDoCliente(
  m: MetaVenda,
  d: DistribuicaoMeta,
  pedidos: PedidoVenda[] = carregarPedidosVenda(),
  produtos: ProdutoEstoque[] = carregarEstoqueProdutos()
): { realizado: number; alvo: number; unidade: UnidadeMeta } {
  const alvo = metaDoClienteNaDistribuicao(m, d);
  const parte: MetaVenda = {
    ...m,
    id: `${m.id}__${d.cliente_id}`,
    destinatario: 'CLIENTE',
    destinatario_id: d.cliente_id,
    unidade: alvo.unidade,
    valor_meta: alvo.valor,
    distribuicao: undefined,
  };
  return { realizado: realizadoMeta(parte, pedidos, produtos), alvo: alvo.valor, unidade: alvo.unidade };
}
