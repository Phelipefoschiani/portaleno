// Comissões de RCA do Grupo ENO
// - Cálculo por item conforme o modelo do RCA (geral, por grupo, por cliente, misto: cliente > grupo > padrão).
//   Grupo de produto = categoria do produto (ProdutoEstoque.categoria).
// - Ao FATURAR o pedido a comissão vira Conta a Pagar ao RCA (um título por pedido: 'pag_com_<pedidoId>').
// - Pagamento ("Pago (PIX)") baixa o título e movimenta o caixa ('pagar:<id>').

import type { RCA } from './cadastrosData';
import { obterRcaPorId } from './cadastrosData';
import type { PedidoVenda } from './pedidosVendaData';
import { carregarEstoqueProdutos } from './produtosData';
import {
  carregarTitulosPagar,
  salvarTitulosPagar,
  registrarBaixaNoCaixa,
  TituloPagar
} from './financeiroData';
import { hojeISO, paraISO, parseData } from '../lib/datas';

export type RegraComissao = 'Por Cliente' | 'Por Grupo' | 'Taxa Geral';
export type RegraComissaoPedido = RegraComissao | 'Mista' | 'Sem RCA';

export interface ItemParaComissao {
  produto_id: string;
  subtotal: number;
  categoria?: string;
}

export interface ComissaoItemCalculada {
  produto_id: string;
  grupo: string;
  base: number;
  percentual: number;
  valor: number;
  regra: RegraComissao;
}

export interface ComissaoPedidoCalculada {
  itens: ComissaoItemCalculada[];
  base: number;
  valor: number;
  percentual_efetivo: number; // valor ÷ base
  regra: RegraComissaoPedido;
}

/** Campos de comissão gravados no pedido (além de comissao_percentual/comissao_valor). */
export interface CamposComissaoPedido {
  comissao_regra?: RegraComissaoPedido;
  comissao_itens?: ComissaoItemCalculada[];
}

export const PREFIXO_TITULO_COMISSAO = 'pag_com_';
export const DIA_VENCIMENTO_COMISSAO_PADRAO = 10;

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const norm = (s?: string) =>
  String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Percentual e regra para um item, aplicando o modelo do RCA. */
export function calcularComissaoItem(
  rca: RCA | undefined | null,
  clienteId: string | undefined,
  item: ItemParaComissao
): ComissaoItemCalculada {
  const base = Number(item.subtotal) || 0;
  const grupo = item.categoria || '';
  if (!rca) return { produto_id: item.produto_id, grupo, base, percentual: 0, valor: 0, regra: 'Taxa Geral' };

  const padrao = Number(rca.comissao_padrao_percentual) || 0;
  const regraCliente = clienteId ? (rca.comissoes_por_cliente || []).find(c => c.cliente_id === clienteId) : undefined;
  const regraGrupo = grupo
    ? (rca.comissoes_por_grupo || []).find(g => norm(g.grupo_id) === norm(grupo) || norm(g.grupo_nome) === norm(grupo))
    : undefined;

  let percentual = padrao;
  let regra: RegraComissao = 'Taxa Geral';
  const modelo = rca.modelo_comissao || 'geral';
  const usarCliente = (modelo === 'por_cliente' || modelo === 'misto') && !!regraCliente;
  const usarGrupo = !usarCliente && (modelo === 'por_grupo' || modelo === 'misto') && !!regraGrupo;
  if (usarCliente) {
    percentual = Number(regraCliente!.percentual) || 0;
    regra = 'Por Cliente';
  } else if (usarGrupo) {
    percentual = Number(regraGrupo!.percentual) || 0;
    regra = 'Por Grupo';
  }
  return { produto_id: item.produto_id, grupo, base, percentual, valor: r2((base * percentual) / 100), regra };
}

/** Comissão do pedido inteiro (itens sem categoria são completados pelo cadastro de produtos). */
export function calcularComissaoPedido(
  rca: RCA | undefined | null,
  clienteId: string | undefined,
  itens: ItemParaComissao[]
): ComissaoPedidoCalculada {
  const precisaCategoria = itens.some(i => !i.categoria);
  const categorias = precisaCategoria
    ? new Map(carregarEstoqueProdutos().map(p => [p.id, String(p.categoria || '')]))
    : new Map<string, string>();
  const calculados = itens.map(i =>
    calcularComissaoItem(rca, clienteId, { ...i, categoria: i.categoria || categorias.get(i.produto_id) || '' })
  );
  const base = r2(calculados.reduce((acc, i) => acc + i.base, 0));
  const valor = r2(calculados.reduce((acc, i) => acc + i.valor, 0));
  const regras = Array.from(new Set(calculados.map(i => i.regra)));
  const regra: RegraComissaoPedido = !rca ? 'Sem RCA' : regras.length === 1 ? regras[0] : regras.length === 0 ? 'Taxa Geral' : 'Mista';
  return {
    itens: calculados,
    base,
    valor,
    percentual_efetivo: base > 0 ? Math.round((valor / base) * 10000) / 100 : Number(rca?.comissao_padrao_percentual) || 0,
    regra
  };
}

// ============================================================
// TÍTULO A PAGAR DA COMISSÃO (gerado no faturamento)
// ============================================================

export function idTituloComissao(pedidoId: string): string {
  return `${PREFIXO_TITULO_COMISSAO}${pedidoId}`;
}

export function ehTituloComissao(t: Pick<TituloPagar, 'id'>): boolean {
  return String(t?.id || '').startsWith(PREFIXO_TITULO_COMISSAO);
}

/** Dia X do mês seguinte ao faturamento (dia ajustado ao último dia do mês). */
export function vencimentoComissao(dataFaturamento: string, dia: number = DIA_VENCIMENTO_COMISSAO_PADRAO): string {
  const d = parseData(dataFaturamento) || parseData(hojeISO())!;
  const ano = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  const mes = (d.getMonth() + 1) % 12;
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const diaOk = Math.min(Math.max(1, Math.round(Number(dia) || DIA_VENCIMENTO_COMISSAO_PADRAO)), ultimo);
  return hojeISO(new Date(ano, mes, diaOk));
}

/** Base da comissão: valor faturado (valor_faturado / valor da nota) ou o total do pedido. */
export function baseComissaoFaturada(pedido: PedidoVenda): number {
  return Number(pedido.valor_faturado) || Number(pedido.nota_fiscal?.valor_nota) || Number(pedido.valor_total) || 0;
}

/** Valor da comissão sobre o faturado, mantendo o percentual efetivo calculado na venda. */
export function valorComissaoFaturada(pedido: PedidoVenda & CamposComissaoPedido, rca?: RCA): { base: number; percentual: number; valor: number; regra: RegraComissaoPedido } {
  const base = baseComissaoFaturada(pedido);
  const total = Number(pedido.valor_total) || 0;
  let percentual: number;
  let regra: RegraComissaoPedido = pedido.comissao_regra || 'Taxa Geral';
  if (pedido.comissao_itens && pedido.comissao_itens.length > 0 && total > 0) {
    percentual = ((Number(pedido.comissao_valor) || 0) / total) * 100;
  } else if (Number(pedido.comissao_percentual) > 0) {
    percentual = Number(pedido.comissao_percentual);
  } else if (rca) {
    // Pedido antigo sem comissão gravada: aplica o modelo atual do RCA
    const calc = calcularComissaoPedido(rca, pedido.cliente_id, (pedido.itens || []).map(i => ({ produto_id: i.produto_id, subtotal: i.subtotal })));
    percentual = calc.percentual_efetivo;
    regra = calc.regra;
  } else {
    percentual = 0;
  }
  return { base: r2(base), percentual: Math.round(percentual * 100) / 100, valor: r2((base * percentual) / 100), regra };
}

/**
 * Gera a Conta a Pagar da comissão do RCA ao faturar o pedido.
 * Idempotente: um título por pedido (id 'pag_com_<pedidoId>'). Retorna o título (novo ou existente).
 */
export function gerarTituloComissaoAoFaturar(pedido: PedidoVenda): TituloPagar | null {
  if (!pedido?.id || !pedido.rca_id) return null;
  const id = idTituloComissao(pedido.id);
  const titulos = carregarTitulosPagar();
  const existente = titulos.find(t => t.id === id);
  if (existente) return existente;

  const rca = obterRcaPorId(pedido.rca_id);
  const calc = valorComissaoFaturada(pedido as PedidoVenda & CamposComissaoPedido, rca);
  if (calc.valor <= 0) return null;

  const dataFat = paraISO(pedido.data_faturamento) || hojeISO();
  const nomeRca = rca ? (rca.nome_fantasia || rca.nome_completo) : (pedido.rca_nome || 'RCA');
  const dadosBancarios = rca
    ? [rca.banco_nome, rca.agencia ? `Ag ${rca.agencia}` : '', rca.conta ? `C/C ${rca.conta}` : ''].filter(Boolean).join(' • ')
    : '';
  const titulo: TituloPagar = {
    id,
    pedido_venda_id: pedido.id,
    numero_documento: `COM-${String(pedido.numero_pedido || pedido.id).replace(/\s+/g, '')}`,
    favorecido_nome: nomeRca,
    tipo_favorecido: 'RCA',
    categoria: 'Comissão de RCA',
    valor: calc.valor,
    data_emissao: dataFat,
    data_vencimento: vencimentoComissao(dataFat, rca?.dia_vencimento_comissao ?? DIA_VENCIMENTO_COMISSAO_PADRAO),
    status: 'A_PAGAR',
    forma_pagamento: 'PIX',
    chave_pix: rca?.chave_pix || '',
    dados_bancarios: dadosBancarios,
    observacoes: `Comissão do pedido ${pedido.numero_pedido} (${pedido.cliente_nome}) • ${calc.percentual}% sobre ${calc.base.toFixed(2)} faturado • Regra: ${calc.regra}.`
  };
  salvarTitulosPagar([titulo, ...titulos]);
  return titulo;
}

/** Remove o título de comissão do pedido se ainda não foi pago. Retorna true se removeu. */
export function removerTituloComissaoDoPedido(pedidoId: string): boolean {
  const id = idTituloComissao(pedidoId);
  const titulos = carregarTitulosPagar();
  const alvo = titulos.find(t => t.id === id);
  if (!alvo || alvo.status === 'PAGO') return false;
  salvarTitulosPagar(titulos.filter(t => t.id !== id));
  return true;
}

/**
 * Pedido cancelado/estornado/excluído ou que voltou para antes do faturamento:
 * remove os títulos de comissão ainda não pagos. Títulos pagos nunca são apagados.
 */
export function sincronizarTitulosComissao(pedidos: PedidoVenda[]): number {
  const titulos = carregarTitulosPagar();
  const porId = new Map(pedidos.map(p => [p.id, p]));
  const remover = titulos.filter(t => {
    if (!ehTituloComissao(t) || t.status === 'PAGO') return false;
    const ped = porId.get(t.id.slice(PREFIXO_TITULO_COMISSAO.length));
    if (!ped) return true;
    const extra = ped as PedidoVenda & { status?: string; cancelado?: boolean };
    if (extra.cancelado || /cancel|estorn/i.test(String(extra.status || ''))) return true;
    return !(ped.etapa === 'FATURADO' || ped.etapa === 'ENTREGUE');
  });
  if (remover.length === 0) return 0;
  const ids = new Set(remover.map(t => t.id));
  salvarTitulosPagar(titulos.filter(t => !ids.has(t.id)));
  return remover.length;
}

/** Títulos de comissão (Contas a Pagar) indexados pelo id do pedido. */
export function titulosComissaoPorPedido(): Map<string, TituloPagar> {
  const mapa = new Map<string, TituloPagar>();
  carregarTitulosPagar().forEach(t => {
    if (ehTituloComissao(t)) mapa.set(t.pedido_venda_id || t.id.slice(PREFIXO_TITULO_COMISSAO.length), t);
  });
  return mapa;
}

/**
 * Baixa (paga) o título de comissão do pedido: status PAGO + saída no caixa ('pagar:<id>').
 * Se o pedido faturado ainda não tinha título (faturado antes desta regra), gera e baixa.
 */
export function baixarTituloComissao(pedido: PedidoVenda): TituloPagar | null {
  const titulo = gerarTituloComissaoAoFaturar(pedido);
  if (!titulo) return null;
  if (titulo.status === 'PAGO') return titulo;
  const pago: TituloPagar = { ...titulo, status: 'PAGO', data_pagamento: hojeISO() };
  salvarTitulosPagar(carregarTitulosPagar().map(t => (t.id === titulo.id ? pago : t)));
  registrarBaixaNoCaixa(`pagar:${titulo.id}`, -titulo.valor);
  return pago;
}
