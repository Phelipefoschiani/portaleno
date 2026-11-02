// Regra única de preço por Tabela de Preço do Grupo ENO.
// Usada pela tela de Tabelas (visualizar, imprimir, copiar WhatsApp), pelo cadastro de produtos
// (preço do produto em cada tabela) e pelo orçamento/venda.
//
// Modos da tabela:
//  - ACRESCIMO_DESCONTO: preço base do produto (preco_unitario_venda) ± X% (positivo = acréscimo, negativo = desconto)
//  - MARGEM_CUSTO: custo atual do produto × (1 + margem%)
//  - PRECO_FIXO: preço digitado por produto dentro da tabela (precos_fixos)
// Em qualquer modo, excecoes_preco[produto_id] sobrescreve o preço do pacote daquele produto.

import type { ProdutoEstoque, TabelaPreco } from './produtosData';
import { carregarEstoqueProdutos, carregarTabelasPreco, salvarTabelasPreco } from './produtosData';
import { hojeISO, parseData, formatarDataBR } from '../lib/datas';

export type ModoTabelaPreco = NonNullable<TabelaPreco['modo_preco']>;

export const MODOS_TABELA_PRECO: { id: ModoTabelaPreco; nome: string; descricao: string }[] = [
  { id: 'ACRESCIMO_DESCONTO', nome: 'Acréscimo / Desconto', descricao: 'Preço base do produto ± %' },
  { id: 'MARGEM_CUSTO', nome: 'Margem sobre o Custo', descricao: 'Custo atual do produto + margem %' },
  { id: 'PRECO_FIXO', nome: 'Preço Fixo por Produto', descricao: 'Preço digitado produto a produto' },
];

export function nomeModoTabela(modo?: TabelaPreco['modo_preco']): string {
  return MODOS_TABELA_PRECO.find(m => m.id === (modo || 'ACRESCIMO_DESCONTO'))?.nome || 'Acréscimo / Desconto';
}

/** Campos do produto usados na precificação (aceita ProdutoEstoque ou objetos equivalentes). */
export type ProdutoPrecificavel = Pick<ProdutoEstoque, 'id'> &
  Partial<Pick<ProdutoEstoque,
    'preco_unitario_venda' | 'custo_total' | 'custo_materia_prima' | 'custo_operacional' |
    'tipo_acondicionamento' | 'unidades_por_acondicionamento' | 'tipo_embalagem'>>;

export interface PrecoNaTabela {
  custo: number; // custo atual do pacote
  preco_base: number; // preco_unitario_venda do cadastro
  preco: number; // preço do pacote nesta tabela
  preco_regra: number; // preço que a regra da tabela daria (sem exceção)
  unidades: number; // pacotes por fardo/caixa (1 = avulso/saco)
  tipo_acondicionamento: string;
  preco_acondicionamento: number; // preço do pacote × unidades
  margem_percentual: number | null; // (preço − custo) / preço; null quando não há custo apurado
  markup_percentual: number | null; // (preço − custo) / custo
  abaixo_custo: boolean;
  origem: 'EXCECAO' | ModoTabelaPreco;
  sem_preco: boolean; // regra não conseguiu formar preço (ex.: margem sem custo, preço fixo não digitado)
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
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
export function unidadesAcondicionamento(p: ProdutoPrecificavel): number {
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

/** Preço que a regra da tabela forma a partir de custo e preço base (sem exceções). */
export function precoPelaRegra(
  tabela: Pick<TabelaPreco, 'modo_preco' | 'ajuste_percentual' | 'margem_percentual' | 'desconto_padrao_percentual' | 'precos_fixos'>,
  custo: number,
  precoBase: number,
  produtoId?: string
): { preco: number; sem_preco: boolean } {
  const modo = tabela.modo_preco || 'ACRESCIMO_DESCONTO';
  if (modo === 'MARGEM_CUSTO') {
    if (custo <= 0) return { preco: r2(precoBase), sem_preco: true };
    return { preco: r2(custo * (1 + num(tabela.margem_percentual) / 100)), sem_preco: false };
  }
  if (modo === 'PRECO_FIXO') {
    const fixo = produtoId ? num(tabela.precos_fixos?.[produtoId]) : 0;
    if (fixo > 0) return { preco: r2(fixo), sem_preco: false };
    return { preco: r2(precoBase), sem_preco: true };
  }
  const ajuste = tabela.ajuste_percentual ?? -(num(tabela.desconto_padrao_percentual));
  return { preco: r2(precoBase * (1 + num(ajuste) / 100)), sem_preco: precoBase <= 0 };
}

/** Regra única: preço do produto na tabela (pacote e fardo/caixa), custo e margem resultante. */
export function calcularPrecoNaTabela(produto: ProdutoPrecificavel, tabela: TabelaPreco): PrecoNaTabela {
  const custo = r2(custoAtualProduto(produto));
  const precoBase = r2(num(produto.preco_unitario_venda));
  const modo = tabela.modo_preco || 'ACRESCIMO_DESCONTO';
  const regra = precoPelaRegra(tabela, custo, precoBase, produto.id);
  const excecao = num(tabela.excecoes_preco?.[produto.id]);
  const preco = excecao > 0 ? r2(excecao) : regra.preco;
  const unidades = unidadesAcondicionamento(produto);
  return {
    custo,
    preco_base: precoBase,
    preco,
    preco_regra: regra.preco,
    unidades,
    tipo_acondicionamento: tipoAcondicionamento(produto),
    preco_acondicionamento: r2(preco * unidades),
    margem_percentual: custo > 0 && preco > 0 ? Math.round(((preco - custo) / preco) * 1000) / 10 : null,
    markup_percentual: custo > 0 ? Math.round(((preco - custo) / custo) * 1000) / 10 : null,
    abaixo_custo: custo > 0 && preco < custo,
    origem: excecao > 0 ? 'EXCECAO' : modo,
    sem_preco: excecao > 0 ? false : regra.sem_preco,
  };
}

/** Texto curto da regra da tabela (ex.: "−5% sobre o preço base"). */
export function descreverRegraTabela(t: TabelaPreco): string {
  const modo = t.modo_preco || 'ACRESCIMO_DESCONTO';
  if (modo === 'MARGEM_CUSTO') return `Custo + ${num(t.margem_percentual)}% de margem`;
  if (modo === 'PRECO_FIXO') return 'Preço fixo por produto';
  const aj = num(t.ajuste_percentual ?? -(num(t.desconto_padrao_percentual)));
  if (aj === 0) return 'Preço base (sem ajuste)';
  return `${aj > 0 ? '+' : '−'}${Math.abs(aj)}% sobre o preço base`;
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

// ============================================================
// PREÇO DO PRODUTO EM CADA TABELA (cadastro de produtos)
// ============================================================

/** tabelaId → preço final do pacote nas tabelas que contêm o produto. */
export function carregarPrecosDoProduto(produtoId: string): Record<string, number> {
  const mapa: Record<string, number> = {};
  if (!produtoId) return mapa;
  const produto = carregarEstoqueProdutos().find(p => p.id === produtoId);
  carregarTabelasPreco().forEach(t => {
    if (!(t.produtos_ids || []).includes(produtoId)) return;
    if (produto) {
      mapa[t.id] = calcularPrecoNaTabela(produto, t).preco;
    } else {
      const fixo = num(t.excecoes_preco?.[produtoId]) || num(t.precos_fixos?.[produtoId]);
      if (fixo > 0) mapa[t.id] = r2(fixo);
    }
  });
  return mapa;
}

/**
 * Para cada tabela do mapa: inclui o produto em produtos_ids e grava o preço.
 * PRECO_FIXO → precos_fixos; demais modos → exceção do produto (só quando difere da regra da tabela,
 * para o preço continuar acompanhando o custo/preço base quando o usuário aceitou o sugerido).
 * Tabelas fora do mapa não mudam.
 */
export function salvarPrecosDoProduto(produtoId: string, mapa: Record<string, number>): void {
  if (!produtoId || !mapa) return;
  const ids = Object.keys(mapa);
  if (ids.length === 0) return;
  const produto = carregarEstoqueProdutos().find(p => p.id === produtoId);
  const tabelas = carregarTabelasPreco();
  let alterou = false;
  const atualizadas = tabelas.map(t => {
    if (!ids.includes(t.id)) return t;
    const preco = r2(num(mapa[t.id]));
    alterou = true;
    const produtos_ids = (t.produtos_ids || []).includes(produtoId) ? t.produtos_ids || [] : [...(t.produtos_ids || []), produtoId];
    const precos_fixos = { ...(t.precos_fixos || {}) };
    const excecoes_preco = { ...(t.excecoes_preco || {}) };
    if ((t.modo_preco || 'ACRESCIMO_DESCONTO') === 'PRECO_FIXO') {
      if (preco > 0) precos_fixos[produtoId] = preco;
      delete excecoes_preco[produtoId];
    } else {
      const regra = produto
        ? precoPelaRegra(t, r2(custoAtualProduto(produto)), r2(num(produto.preco_unitario_venda)), produtoId)
        : { preco: -1, sem_preco: true };
      if (preco > 0 && (regra.sem_preco || Math.abs(regra.preco - preco) > 0.005)) excecoes_preco[produtoId] = preco;
      else delete excecoes_preco[produtoId];
    }
    return { ...t, produtos_ids, precos_fixos, excecoes_preco };
  });
  if (alterou) salvarTabelasPreco(atualizadas);
}

/** Cria e grava uma tabela ativa com vigência a partir de hoje (sem data de término). */
export function criarTabelaRapida(nome: string, modo: ModoTabelaPreco, percentual?: number): TabelaPreco {
  const p = num(percentual);
  const nova: TabelaPreco = {
    id: `tab_${Date.now()}`,
    codigo: `TAB-${Date.now().toString().slice(-4)}`,
    nome: String(nome || '').trim() || 'Nova Tabela',
    tipo: 'Atacado / Distribuidor',
    modo_preco: modo,
    ajuste_percentual: modo === 'ACRESCIMO_DESCONTO' ? p : 0,
    margem_percentual: modo === 'MARGEM_CUSTO' ? p : 0,
    precos_fixos: {},
    excecoes_preco: {},
    prazo_padrao: 'Boleto Bancário 28 Dias',
    frete_tipo: 'CIF (Entrega Grupo ENO)',
    vigencia_inicio: formatarDataBR(hojeISO()),
    vigencia_fim: '',
    status: 'VIGENTE',
    produtos_ids: [],
  };
  salvarTabelasPreco([nova, ...carregarTabelasPreco()]);
  return nova;
}
