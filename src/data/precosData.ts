// Regra única de preço por Tabela de Preço do Grupo ENO.
// Usada pela tela de Tabelas (visualizar, imprimir, copiar WhatsApp), pelo cadastro de produtos
// (preço do produto em cada tabela) e pelo orçamento/venda.
//
// A tabela tem só VALOR por produto: precos_fixos[produto_id] = preço da unidade/pacote.
// Caixa/fardo = unitário × quantidade do acondicionamento do produto. Sem valor = não vendido na tabela.
// O produto não tem preço próprio (preco_unitario_venda é legado e não forma preço).
// Margem líquida = preço − custo do produto − impostos de base Venda (calculados sobre o preço da tabela).
// Tabelas antigas (acréscimo/desconto, margem sobre custo, exceções) são congeladas em valor fixo
// na leitura (produtosData → carregarTabelasPreco).

import type { ImpostoProduto, ProdutoEstoque, TabelaPreco } from './produtosData';
import { calcularImpostosVenda, carregarTabelasPreco, salvarTabelasPreco } from './produtosData';
import { hojeISO, parseData, formatarDataBR } from '../lib/datas';

export type MostrarPrecoTabela = NonNullable<TabelaPreco['mostrar_preco']>;

export const OPCOES_MOSTRAR_PRECO: { id: MostrarPrecoTabela; nome: string; descricao: string }[] = [
  { id: 'UNITARIO', nome: 'Unitário', descricao: 'Mostra e vende por unidade/pacote' },
  { id: 'ACONDICIONAMENTO', nome: 'Caixa / Fardo', descricao: 'Mostra e vende por caixa/fardo fechado' },
  { id: 'AMBOS', nome: 'Ambos', descricao: 'Mostra os dois; o vendedor escolhe na venda' },
];

export function mostrarPrecoDaTabela(t?: Pick<TabelaPreco, 'mostrar_preco'> | null): MostrarPrecoTabela {
  return t?.mostrar_preco || 'AMBOS';
}

export function nomeMostrarPreco(t?: Pick<TabelaPreco, 'mostrar_preco'> | null): string {
  const id = mostrarPrecoDaTabela(t);
  return OPCOES_MOSTRAR_PRECO.find(o => o.id === id)?.nome || 'Ambos';
}

export const mostraUnitario = (t?: Pick<TabelaPreco, 'mostrar_preco'> | null) => mostrarPrecoDaTabela(t) !== 'ACONDICIONAMENTO';
export const mostraAcondicionamento = (t?: Pick<TabelaPreco, 'mostrar_preco'> | null) => mostrarPrecoDaTabela(t) !== 'UNITARIO';

/** Campos do produto usados na precificação (aceita ProdutoEstoque ou objetos equivalentes). */
export type ProdutoPrecificavel = Pick<ProdutoEstoque, 'id'> &
  Partial<Pick<ProdutoEstoque,
    'custo_total' | 'custo_materia_prima' | 'custo_operacional' | 'impostos' |
    'tipo_acondicionamento' | 'unidades_por_acondicionamento' | 'tipo_embalagem'>>;

export interface PrecoNaTabela {
  na_tabela: boolean; // produto tem valor nesta tabela
  sem_preco: boolean; // = !na_tabela
  custo: number; // custo do pacote (insumos + operacional + impostos de base Custo/Fixo)
  preco: number; // preço da unidade/pacote nesta tabela (0 quando não vendido)
  unidades: number; // pacotes por fardo/caixa (1 = avulso/saco)
  tipo_acondicionamento: string;
  preco_acondicionamento: number; // preço do pacote × unidades
  impostos_venda: number; // R$ dos impostos de base Venda sobre o preço da tabela (por unidade)
  margem_liquida: number; // preço − custo − impostos de venda (R$ por unidade)
  margem_liquida_percentual: number | null; // margem líquida ÷ preço
  margem_percentual: number | null; // (preço − custo) / preço; null quando não há custo apurado
  markup_percentual: number | null; // (preço − custo) / custo
  abaixo_custo: boolean;
  margem_negativa: boolean; // margem líquida < 0
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const r6 = (v: number) => Math.round((Number(v) || 0) * 1e6) / 1e6;
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Custo atual do pacote: custo_total recalculado da receita; senão insumos + operacional. */
export function custoAtualProduto(p: ProdutoPrecificavel): number {
  const total = num(p.custo_total);
  if (total > 0) return total;
  return num(p.custo_materia_prima) + num(p.custo_operacional);
}

/** Pacotes por acondicionamento (mesma regra do orçamento: Fardo/Caixa sem número = 10). */
export function unidadesAcondicionamento(p: Pick<ProdutoPrecificavel, 'unidades_por_acondicionamento' | 'tipo_acondicionamento'>): number {
  const n = num(p.unidades_por_acondicionamento);
  if (n > 0) return n;
  if (p.tipo_acondicionamento === 'Fardo' || p.tipo_acondicionamento === 'Caixa') return 10;
  return 1;
}

export function tipoAcondicionamento(p: ProdutoPrecificavel): string {
  if (p.tipo_acondicionamento) return p.tipo_acondicionamento;
  const emb = String(p.tipo_embalagem || '');
  return emb.includes('Fardo') ? 'Fardo' : emb.includes('Caixa') ? 'Caixa' : 'Saco';
}

/** Preço da unidade do produto na tabela (0 = não vendido nesta tabela). */
export function precoUnitarioNaTabela(tabela: Pick<TabelaPreco, 'precos_fixos'>, produtoId: string): number {
  const v = num(tabela.precos_fixos?.[produtoId]);
  return v > 0 ? v : 0;
}

/** Análise de um preço unitário para um produto: custo, impostos de venda e margem líquida. */
export function analisarPreco(
  preco: number,
  custo: number,
  impostos: ImpostoProduto[] | undefined
): Pick<PrecoNaTabela, 'impostos_venda' | 'margem_liquida' | 'margem_liquida_percentual' | 'margem_percentual' | 'markup_percentual' | 'abaixo_custo' | 'margem_negativa'> {
  const p = num(preco);
  const c = num(custo);
  const impVenda = p > 0 ? r2(calcularImpostosVenda(impostos, p)) : 0;
  const liquida = r2(p - c - impVenda);
  return {
    impostos_venda: impVenda,
    margem_liquida: p > 0 ? liquida : 0,
    margem_liquida_percentual: p > 0 ? Math.round((liquida / p) * 1000) / 10 : null,
    margem_percentual: c > 0 && p > 0 ? Math.round(((p - c) / p) * 1000) / 10 : null,
    markup_percentual: c > 0 && p > 0 ? Math.round(((p - c) / c) * 1000) / 10 : null,
    abaixo_custo: c > 0 && p > 0 && p < c,
    margem_negativa: p > 0 && liquida < 0,
  };
}

/** Regra única: preço do produto na tabela (unidade e fardo/caixa), custo e margem líquida. */
export function calcularPrecoNaTabela(produto: ProdutoPrecificavel, tabela: Pick<TabelaPreco, 'precos_fixos'>): PrecoNaTabela {
  const custo = r2(custoAtualProduto(produto));
  const precoBruto = precoUnitarioNaTabela(tabela, produto.id);
  const unidades = unidadesAcondicionamento(produto);
  const na = precoBruto > 0;
  return {
    na_tabela: na,
    sem_preco: !na,
    custo,
    // Unidade com até 4 casas (vem da caixa ÷ quantidade); caixa sempre fecha em centavos
    preco: Math.round(precoBruto * 10000) / 10000,
    unidades,
    tipo_acondicionamento: tipoAcondicionamento(produto),
    preco_acondicionamento: r2(precoBruto * unidades),
    ...analisarPreco(precoBruto, custo, produto.impostos),
  };
}

/** Converte o preço da caixa/fardo digitado em preço unitário (guardado com precisão para fechar a caixa). */
export function unitarioDaCaixa(precoCaixa: number, unidades: number): number {
  const u = num(unidades) > 0 ? num(unidades) : 1;
  return r6(num(precoCaixa) / u);
}

/** Tabela utilizável na venda: não arquivada e dentro da vigência. */
export function tabelaPrecoAtiva(t: TabelaPreco): boolean {
  if (t.status === 'ARQUIVADA') return false;
  const hoje = parseData(hojeISO())!.getTime();
  const fim = parseData(t.vigencia_fim);
  if (fim && fim.getTime() < hoje) return false;
  const ini = parseData(t.vigencia_inicio);
  if (ini && ini.getTime() > hoje) return false;
  return true;
}

/** Normaliza precos_fixos (só > 0) e devolve os campos da tabela coerentes (produtos_ids = produtos com valor). */
export function camposDePreco(precos: Record<string, number>): Pick<TabelaPreco, 'modo_preco' | 'precos_fixos' | 'produtos_ids' | 'excecoes_preco'> {
  const limpos = Object.fromEntries(
    Object.entries(precos || {}).filter(([, v]) => num(v) > 0).map(([id, v]) => [id, r6(num(v))])
  );
  return { modo_preco: 'PRECO_FIXO', precos_fixos: limpos, produtos_ids: Object.keys(limpos), excecoes_preco: {} };
}

// ============================================================
// PREÇO DO PRODUTO EM CADA TABELA (cadastro de produtos)
// ============================================================

/** tabelaId → preço unitário nas tabelas em que o produto tem valor. */
export function carregarPrecosDoProduto(produtoId: string): Record<string, number> {
  const mapa: Record<string, number> = {};
  if (!produtoId) return mapa;
  carregarTabelasPreco().forEach(t => {
    const v = precoUnitarioNaTabela(t, produtoId);
    if (v > 0) mapa[t.id] = v;
  });
  return mapa;
}

/**
 * Grava o preço do produto nas tabelas. Tabela do mapa com valor > 0 passa a ter o produto;
 * tabela listada em `tabelasEditadas` sem valor no mapa deixa de vender o produto.
 * Tabelas fora dessas listas não mudam.
 */
export function salvarPrecosDoProduto(
  produtoId: string,
  mapa: Record<string, number>,
  tabelasEditadas: string[] = Object.keys(mapa || {})
): void {
  if (!produtoId) return;
  const ids = new Set([...Object.keys(mapa || {}), ...tabelasEditadas]);
  if (ids.size === 0) return;
  let alterou = false;
  const atualizadas = carregarTabelasPreco().map(t => {
    if (!ids.has(t.id)) return t;
    const precos = { ...(t.precos_fixos || {}) };
    const novo = num(mapa?.[t.id]);
    const antes = num(precos[produtoId]);
    if (novo > 0) precos[produtoId] = novo;
    else delete precos[produtoId];
    const jaListado = (t.produtos_ids || []).includes(produtoId);
    if (Math.abs(antes - (novo > 0 ? novo : 0)) < 1e-9 && jaListado === novo > 0) return t;
    alterou = true;
    return { ...t, ...camposDePreco(precos) };
  });
  if (alterou) salvarTabelasPreco(atualizadas);
}

/** Cria e grava uma tabela ativa (só valor por produto) com vigência a partir de hoje, sem término. */
export function criarTabelaRapida(nome: string, mostrar_preco: MostrarPrecoTabela = 'AMBOS'): TabelaPreco {
  const nova: TabelaPreco = {
    id: `tab_${Date.now()}`,
    codigo: `TAB-${Date.now().toString().slice(-4)}`,
    nome: String(nome || '').trim() || 'Nova Tabela',
    tipo: 'Atacado / Distribuidor',
    ...camposDePreco({}),
    mostrar_preco,
    prazo_padrao: 'Boleto Bancário 28 Dias',
    frete_tipo: 'CIF (Entrega Grupo ENO)',
    vigencia_inicio: formatarDataBR(hojeISO()),
    vigencia_fim: '',
    status: 'VIGENTE',
  };
  salvarTabelasPreco([nova, ...carregarTabelasPreco()]);
  return nova;
}
