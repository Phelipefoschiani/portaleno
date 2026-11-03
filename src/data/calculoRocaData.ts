// Gerenciamento de Compras de Mandioca e Pesagens na Roça (Saco a Saco)
import {
  PedidoCompraGeral,
  CategoriaCompra,
  carregarPedidosCompra,
  salvarPedidosCompra,
  efetivarPedidoCompra,
  excluirPedidoCompra,
  estornarPagamentoPedidoCompra
} from './mockStore';
import { parseData } from '../lib/datas';

export interface SacoPesagem {
  numero: number;
  peso_kg: number;
}

export interface CalculoNaRoca {
  id: string;
  numero_ticket: string;
  data: string;
  hora?: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_propriedade?: string;
  fornecedor_cidade_uf?: string;
  fornecedor_cpf_cnpj?: string;
  fornecedor_chave_pix?: string;
  fornecedor_tipo: 'AGRICULTOR' | 'FORNECEDOR';
  variedade_mandioca?: string;
  local_pesagem: string;
  pesador_responsavel: string;
  preco_por_kg: number;
  preco_por_tonelada: number;

  // Lista de pesos saco por saco
  sacos: SacoPesagem[];

  // Totais
  total_sacos: number;
  // Peso LÍQUIDO (bruto - desconto). É o peso que vai para o pedido de compra e o financeiro.
  peso_total_kg: number;
  peso_medio_saco_kg: number;
  // Valor = peso líquido × preço/kg
  valor_total_estimado: number;

  // Desconto na pesagem (casca/terra/impureza/tara). Pesagens antigas não têm: desconto 0.
  peso_bruto_kg?: number;
  desconto_percentual?: number;
  desconto_tara_kg?: number;
  desconto_kg?: number; // total descontado (percentual + tara)
  motivo_desconto?: string;

  observacoes?: string;

  // Vínculo com Pedido de Compra
  pedido_compra_id: string;
  situacao_pagamento: 'PENDENTE_DEFINICAO' | 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
  detalhes_pagamento?: {
    tipo: 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
    forma_pagamento: string;
    data_pagamento_ou_vencimento: string;
    valor_pago?: number;
    saldo_restante?: number;
    conta_bancaria?: string;
    observacao?: string;
  };
  criado_em: string;
}

const STORAGE_KEY_CALCULOS_ROCA = 'grupo_eno_calculos_roca_v1';

// Sem dados de demonstração: o sistema começa vazio
export const CALCULOS_ROCA_INICIAIS: CalculoNaRoca[] = [];

// ============================================================
// DESCONTO NA PESAGEM (bruto / desconto / líquido)
// ============================================================

/** Calcula desconto e peso líquido a partir do bruto, % de desconto e kg de tara. */
export function calcularDescontoPesagem(pesoBrutoKg: number, percentual: number, taraKg: number): { desconto: number; liquido: number } {
  const bruto = Math.max(0, Number(pesoBrutoKg) || 0);
  const pct = Math.min(100, Math.max(0, Number(percentual) || 0));
  const tara = Math.max(0, Number(taraKg) || 0);
  const desconto = Math.min(bruto, bruto * pct / 100 + tara);
  return {
    desconto: parseFloat(desconto.toFixed(3)),
    liquido: parseFloat(Math.max(0, bruto - desconto).toFixed(3))
  };
}

/** Pesos de uma pesagem (compatível com pesagens antigas sem desconto). */
export function pesosDoCalculo(c: CalculoNaRoca): { bruto: number; desconto: number; liquido: number } {
  const liquido = Number(c.peso_total_kg) || 0;
  const somaSacos = Array.isArray(c.sacos) ? c.sacos.reduce((acc, s) => acc + (Number(s.peso_kg) || 0), 0) : 0;
  const bruto = typeof c.peso_bruto_kg === 'number' ? c.peso_bruto_kg : (somaSacos > 0 ? parseFloat(somaSacos.toFixed(3)) : liquido);
  const desconto = typeof c.desconto_kg === 'number' ? c.desconto_kg : Math.max(0, parseFloat((bruto - liquido).toFixed(3)));
  return { bruto, desconto, liquido };
}

/** Texto curto do desconto aplicado (ex.: "3% + 10 kg tara (casca/terra)"). */
export function descricaoDesconto(c: CalculoNaRoca): string {
  const partes: string[] = [];
  if (c.desconto_percentual) partes.push(`${String(c.desconto_percentual).replace('.', ',')}%`);
  if (c.desconto_tara_kg) partes.push(`${c.desconto_tara_kg.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg tara`);
  const base = partes.join(' + ');
  return c.motivo_desconto ? `${base}${base ? ' ' : ''}(${c.motivo_desconto})` : base;
}

// ============================================================
// COMPROVANTES DE PAGAMENTO (chave própria, fora da lista de cálculos)
// ============================================================

const STORAGE_KEY_COMPROVANTES = 'grupo_eno_comprovantes_v1';
export const EVENTO_COMPROVANTES_ATUALIZADOS = 'comprovantes_updated';
export const LIMITE_COMPROVANTE_BYTES = 1.5 * 1024 * 1024;

export interface ComprovantePagamento {
  id: string;
  nome: string;
  tipo: string; // mime type
  data_url: string;
  tamanho_bytes: number;
  enviado_em: string;
}

type MapaComprovantes = Record<string, ComprovantePagamento[]>;

function lerMapaComprovantes(): MapaComprovantes {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPROVANTES);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch (e) {
    return {};
  }
}

/** Comprovantes de pagamento anexados a uma pesagem (indexados pelo id do cálculo). */
export function carregarComprovantes(calculoId: string): ComprovantePagamento[] {
  const lista = lerMapaComprovantes()[calculoId];
  return Array.isArray(lista) ? lista : [];
}

/** Ids de pesagens que têm comprovante (para mostrar o botão sem carregar os arquivos na tela). */
export function idsComComprovante(): Set<string> {
  const mapa = lerMapaComprovantes();
  return new Set(Object.keys(mapa).filter(k => Array.isArray(mapa[k]) && mapa[k].length > 0));
}

export function adicionarComprovante(calculoId: string, comp: Omit<ComprovantePagamento, 'id' | 'enviado_em'>): { sucesso: boolean; mensagem: string } {
  if (typeof window === 'undefined') return { sucesso: false, mensagem: 'Janela indisponível' };
  const mapa = lerMapaComprovantes();
  const novo: ComprovantePagamento = { ...comp, id: `comp_${Date.now()}`, enviado_em: new Date().toISOString() };
  mapa[calculoId] = [...(Array.isArray(mapa[calculoId]) ? mapa[calculoId] : []), novo];
  try {
    localStorage.setItem(STORAGE_KEY_COMPROVANTES, JSON.stringify(mapa));
  } catch (e) {
    return { sucesso: false, mensagem: 'Sem espaço no armazenamento do navegador para guardar o comprovante. Remova comprovantes antigos ou use um arquivo menor.' };
  }
  window.dispatchEvent(new Event(EVENTO_COMPROVANTES_ATUALIZADOS));
  return { sucesso: true, mensagem: 'Comprovante anexado.' };
}

export function removerComprovante(calculoId: string, comprovanteId: string): void {
  if (typeof window === 'undefined') return;
  const mapa = lerMapaComprovantes();
  const restantes = (mapa[calculoId] || []).filter(c => c.id !== comprovanteId);
  if (restantes.length) mapa[calculoId] = restantes;
  else delete mapa[calculoId];
  localStorage.setItem(STORAGE_KEY_COMPROVANTES, JSON.stringify(mapa));
  window.dispatchEvent(new Event(EVENTO_COMPROVANTES_ATUALIZADOS));
}

function removerTodosComprovantes(calculoId: string): void {
  const mapa = lerMapaComprovantes();
  if (!(calculoId in mapa)) return;
  delete mapa[calculoId];
  localStorage.setItem(STORAGE_KEY_COMPROVANTES, JSON.stringify(mapa));
  window.dispatchEvent(new Event(EVENTO_COMPROVANTES_ATUALIZADOS));
}

/** Baixa (ou abre) um comprovante a partir do dataURL. */
export function baixarComprovante(comp: ComprovantePagamento): void {
  const link = document.createElement('a');
  link.href = comp.data_url;
  link.download = comp.nome || 'comprovante';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================
// EXTRATO DO AGRICULTOR (pesagem + financeiro vinculado ao pedido de compra)
// ============================================================

export type StatusExtratoRoca = 'PAGO' | 'PARCIAL' | 'A_RECEBER' | 'VENCIDO';

export interface PagamentoExtratoRoca {
  data: string;
  valor: number;
  forma?: string;
}

export interface LinhaExtratoRoca {
  calculo: CalculoNaRoca;
  peso_bruto_kg: number;
  desconto_kg: number;
  peso_liquido_kg: number;
  valor_total: number;
  valor_recebido: number;
  saldo: number;
  pagamentos: PagamentoExtratoRoca[];
  data_ultimo_pagamento?: string;
  forma_pagamento?: string;
  vencimento?: string;
  status: StatusExtratoRoca;
}

export const ROTULO_STATUS_EXTRATO: Record<StatusExtratoRoca, string> = {
  PAGO: 'Pago',
  PARCIAL: 'Parcial',
  A_RECEBER: 'A receber',
  VENCIDO: 'Vencido'
};

function lerListaLocal(chave: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(chave);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function hojeMeiaNoite(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dataParaTempo(valor?: string): number | null {
  const d = parseData(valor);
  return d ? d.getTime() : null;
}

/**
 * Monta o extrato das pesagens lendo o financeiro vinculado ao pedido de compra:
 * - despesas pagas (pagamento no ato / adiantamento) com pedido_compra_id
 * - títulos a pagar com pedido_compra_id (se baixados no Financeiro, contam como pagos com a data de lá)
 * Sem lançamento financeiro, usa os detalhes de pagamento gravados na pesagem.
 */
export function montarExtratoRoca(calculos: CalculoNaRoca[]): LinhaExtratoRoca[] {
  const despesas = lerListaLocal('grupo_eno_financeiro_despesas_v1');
  const titulos = lerListaLocal('grupo_eno_financeiro_pagar_v1');
  const hoje = hojeMeiaNoite();

  return calculos.map(c => {
    const { bruto, desconto, liquido } = pesosDoCalculo(c);
    const pid = c.pedido_compra_id;
    const titulosVinc = pid ? titulos.filter((t: any) => t.pedido_compra_id === pid) : [];
    // Despesa gerada pela baixa de um título já é contada pelo próprio título (não duplica)
    const despesasDeTitulos = new Set(titulosVinc.map((t: any) => t.despesa_id).filter(Boolean));
    const despPagas = pid
      ? despesas.filter((d: any) =>
          d.pedido_compra_id === pid &&
          d.status_despesa === 'PAGO' &&
          d.tipo_despesa !== 'PROGRAMADA' &&
          !String(d.id || '').startsWith('desp_prog_') &&
          !d.titulo_pagar_id &&
          !despesasDeTitulos.has(d.id)
        )
      : [];

    const pagamentos: PagamentoExtratoRoca[] = [];
    let aberto = 0;
    let vencimento: string | undefined;
    despPagas.forEach((d: any) => pagamentos.push({ data: d.data, valor: Number(d.valor) || 0, forma: d.forma_pagamento }));
    titulosVinc.forEach((t: any) => {
      if (t.status === 'PAGO') {
        pagamentos.push({ data: t.data_pagamento || t.data_vencimento, valor: Number(t.valor) || 0, forma: t.forma_pagamento });
      } else {
        aberto += Number(t.valor) || 0;
        const tv = dataParaTempo(t.data_vencimento);
        const atual = dataParaTempo(vencimento);
        if (tv !== null && (atual === null || tv < atual)) vencimento = t.data_vencimento;
      }
    });

    let valorTotal: number;
    let recebido: number;
    const temFinanceiro = despPagas.length > 0 || titulosVinc.length > 0;
    if (temFinanceiro) {
      recebido = pagamentos.reduce((acc, p) => acc + p.valor, 0);
      valorTotal = recebido + aberto;
    } else {
      // Sem lançamento no financeiro: usa a definição gravada na pesagem
      valorTotal = Number(c.valor_total_estimado) || 0;
      const det = c.detalhes_pagamento;
      if (c.situacao_pagamento === 'JA_PAGO') recebido = valorTotal;
      else if (c.situacao_pagamento === 'ADIANTAMENTO_PARCIAL') recebido = Math.min(valorTotal, Number(det?.valor_pago) || 0);
      else recebido = 0;
      if (recebido > 0 && det) pagamentos.push({ data: det.data_pagamento_ou_vencimento, valor: recebido, forma: det.forma_pagamento });
      if (c.situacao_pagamento === 'A_PAGAR' && det) vencimento = det.data_pagamento_ou_vencimento;
    }

    pagamentos.sort((a, b) => (dataParaTempo(a.data) ?? 0) - (dataParaTempo(b.data) ?? 0));
    const ultimo = pagamentos[pagamentos.length - 1];
    const saldo = Math.max(0, parseFloat((valorTotal - recebido).toFixed(2)));
    const venc = dataParaTempo(vencimento);

    let status: StatusExtratoRoca;
    if (saldo <= 0.009 && (recebido > 0 || valorTotal <= 0)) status = 'PAGO';
    else if (venc !== null && venc < hoje) status = 'VENCIDO';
    else if (recebido > 0.009) status = 'PARCIAL';
    else status = 'A_RECEBER';

    return {
      calculo: c,
      peso_bruto_kg: bruto,
      desconto_kg: desconto,
      peso_liquido_kg: liquido,
      valor_total: parseFloat(valorTotal.toFixed(2)),
      valor_recebido: parseFloat(recebido.toFixed(2)),
      saldo,
      pagamentos,
      data_ultimo_pagamento: ultimo?.data,
      forma_pagamento: ultimo?.forma || c.detalhes_pagamento?.forma_pagamento,
      vencimento: saldo > 0.009 ? vencimento : undefined,
      status
    };
  });
}

export function carregarCalculosNaRoca(): CalculoNaRoca[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALCULOS_ROCA);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY_CALCULOS_ROCA, JSON.stringify([]));
      return [];
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarCalculosNaRoca(calculos: CalculoNaRoca[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CALCULOS_ROCA, JSON.stringify(calculos));
  window.dispatchEvent(new Event('calculos_roca_updated'));
}

/**
 * Próximo número de ticket: maior número já usado + 1 (não repete após exclusão).
 * Formato: ROCA-001/26 (ano com 2 dígitos).
 */
export function proximoNumeroTicketRoca(calculos: CalculoNaRoca[] = carregarCalculosNaRoca(), ano: number = new Date().getFullYear()): string {
  const maior = calculos.reduce((max, c) => {
    const m = String(c.numero_ticket || '').match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `ROCA-${String(maior + 1).padStart(3, '0')}/${String(ano).slice(-2)}`;
}

/**
 * Salva a pesagem na roça e gera o Pedido de Compra correspondente.
 * NOTA: O Pedido de Compra é gerado com status 'A Confirmar' e pendente de definição de pagamento,
 * de modo que NÃO lança ainda no financeiro até o usuário dizer se foi pago ou a pagar!
 * Ao editar uma pesagem já existente, a situação de pagamento do pedido é preservada.
 */
export function criarCalculoNaRocaELancarPedidoCompra(novoCalculo: CalculoNaRoca): { sucesso: boolean; pedidoCompraId: string } {
  if (typeof window === 'undefined') return { sucesso: false, pedidoCompraId: '' };

  // 1. Salva nos cálculos da roça
  const calculos = carregarCalculosNaRoca();
  const index = calculos.findIndex(c => c.id === novoCalculo.id);
  if (index >= 0) {
    calculos[index] = novoCalculo;
  } else {
    calculos.unshift(novoCalculo);
  }
  salvarCalculosNaRoca(calculos);

  // 2. Cria ou atualiza o Pedido de Compra correspondente
  const pedidos = carregarPedidosCompra();
  const pedidoExistenteIndex = pedidos.findIndex(p => p.id === novoCalculo.pedido_compra_id);

  const novoPedido: PedidoCompraGeral = {
    id: novoCalculo.pedido_compra_id,
    data: novoCalculo.data,
    tipo_parceiro: novoCalculo.fornecedor_tipo,
    agricultor_id: novoCalculo.fornecedor_tipo === 'AGRICULTOR' ? novoCalculo.fornecedor_id : undefined,
    agricultor_nome: novoCalculo.fornecedor_tipo === 'AGRICULTOR' ? novoCalculo.fornecedor_nome : undefined,
    agricultor_propriedade: novoCalculo.fornecedor_propriedade,
    agricultor_cpf_cnpj: novoCalculo.fornecedor_cpf_cnpj,
    agricultor_cidade_uf: novoCalculo.fornecedor_cidade_uf,
    agricultor_chave_pix: novoCalculo.fornecedor_chave_pix,
    fornecedor_id: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_id : undefined,
    fornecedor_nome: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_nome : undefined,
    fornecedor_cnpj: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_cpf_cnpj : undefined,
    fornecedor_cidade_uf: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_cidade_uf : undefined,
    fornecedor_chave_pix: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_chave_pix : undefined,
    comprador_nome: novoCalculo.pesador_responsavel,
    local_compra: novoCalculo.local_pesagem,
    item_descricao: `Mandioca na Roça (${novoCalculo.total_sacos} sacos${novoCalculo.variedade_mandioca ? ` - ${novoCalculo.variedade_mandioca}` : ''})`,
    categoria: 'Mandioca / Matéria-Prima',
    quantidade: novoCalculo.peso_total_kg,
    unidade_medida: 'KG',
    valor_unitario: novoCalculo.preco_por_kg,
    valor_total: novoCalculo.valor_total_estimado,
    status_pedido: 'A Confirmar',
    forma_pagamento: 'PIX',
    observacoes: `[Cálculo na Roça - Ticket ${novoCalculo.numero_ticket}] Pesagem saco a saco realizada em ${novoCalculo.data}${novoCalculo.hora ? ` às ${novoCalculo.hora}` : ''}. Total: ${novoCalculo.total_sacos} sacos (Média: ${novoCalculo.peso_medio_saco_kg} kg/saco).${(() => {
      const p = pesosDoCalculo(novoCalculo);
      return p.desconto > 0 ? ` Bruto ${p.bruto} kg - desconto ${p.desconto} kg${descricaoDesconto(novoCalculo) ? ` (${descricaoDesconto(novoCalculo)})` : ''} = líquido ${p.liquido} kg.` : '';
    })()}`
  };

  if (pedidoExistenteIndex >= 0) {
    const existente = pedidos[pedidoExistenteIndex];
    pedidos[pedidoExistenteIndex] = {
      ...existente,
      ...novoPedido,
      // Preserva situação de pagamento e integrações já realizadas
      status_pedido: existente.status_pedido,
      forma_pagamento: existente.forma_pagamento,
      data_pagamento: existente.data_pagamento,
      categoria: existente.categoria || novoPedido.categoria,
      entrada_estoque: existente.entrada_estoque,
      efetivado_em: existente.efetivado_em,
      observacoes: existente.observacoes || novoPedido.observacoes
    };
  } else {
    pedidos.unshift(novoPedido);
  }

  salvarPedidosCompra(pedidos);

  return { sucesso: true, pedidoCompraId: novoCalculo.pedido_compra_id };
}

/**
 * Define (ou redefine) o pagamento do cálculo da roça e sincroniza com Pedido de Compra e Financeiro.
 * Idempotente: redefinir substitui título/despesa anteriores e a entrada no estoque acontece uma única vez.
 * `edicoes` permite gravar ajustes feitos no modal (produto, valor, categoria).
 */
export function definirPagamentoCalculoRoca(
  calculoId: string,
  dadosPagamento: {
    tipo: 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
    forma_pagamento: string;
    data_pagamento_ou_vencimento: string;
    data_vencimento_saldo?: string;
    valor_pago?: number;
    saldo_restante?: number;
    conta_bancaria?: string;
    observacao?: string;
  },
  edicoes?: { item_descricao?: string; valor_total?: number; categoria?: CategoriaCompra }
): { sucesso: boolean; mensagem: string } {
  const calculos = carregarCalculosNaRoca();
  const cIndex = calculos.findIndex(c => c.id === calculoId);
  if (cIndex === -1) return { sucesso: false, mensagem: 'Pesagem na roça não encontrada' };

  const calculo = calculos[cIndex];
  const pedidos = carregarPedidosCompra();
  let pedido = pedidos.find(p => p.id === calculo.pedido_compra_id);
  if (!pedido) {
    // Pedido de compra removido: recria a partir da pesagem antes de lançar
    criarCalculoNaRocaELancarPedidoCompra(calculo);
    pedido = carregarPedidosCompra().find(p => p.id === calculo.pedido_compra_id);
    if (!pedido) return { sucesso: false, mensagem: 'Pedido de compra vinculado não encontrado.' };
  }

  const res = efetivarPedidoCompra(pedido.id, {
    tipo: dadosPagamento.tipo,
    data: dadosPagamento.data_pagamento_ou_vencimento,
    data_vencimento_saldo: dadosPagamento.data_vencimento_saldo,
    forma_pagamento: dadosPagamento.forma_pagamento,
    item_descricao: edicoes?.item_descricao,
    valor_total: edicoes?.valor_total,
    categoria: edicoes?.categoria,
    valor_pago: dadosPagamento.valor_pago,
    conta_bancaria: dadosPagamento.conta_bancaria,
    observacao: dadosPagamento.observacao,
    numero_documento: `TICKET-${calculo.numero_ticket}`,
    ids_legados: [calculo.id]
  });
  if (!res.sucesso) return res;

  const valorFinal = typeof edicoes?.valor_total === 'number' && !isNaN(edicoes.valor_total)
    ? edicoes.valor_total
    : calculo.valor_total_estimado;
  const pago = dadosPagamento.tipo === 'ADIANTAMENTO_PARCIAL' ? Math.min(valorFinal, dadosPagamento.valor_pago || 0) : undefined;

  const atualizados = carregarCalculosNaRoca().map(c =>
    c.id === calculoId
      ? {
          ...c,
          situacao_pagamento: dadosPagamento.tipo,
          detalhes_pagamento: {
            ...dadosPagamento,
            valor_pago: dadosPagamento.tipo === 'JA_PAGO' ? valorFinal : dadosPagamento.tipo === 'A_PAGAR' ? 0 : pago,
            saldo_restante: dadosPagamento.tipo === 'ADIANTAMENTO_PARCIAL' ? Math.max(0, valorFinal - (pago || 0)) : dadosPagamento.tipo === 'A_PAGAR' ? valorFinal : 0
          }
        }
      : c
  );
  salvarCalculosNaRoca(atualizados);

  return {
    sucesso: true,
    mensagem: dadosPagamento.tipo === 'JA_PAGO'
      ? `Pagamento registrado como PAGO e lançado como despesa no Financeiro. ${res.mensagem}`
      : dadosPagamento.tipo === 'A_PAGAR'
        ? `Pagamento registrado como A PAGAR e incluído no Contas a Pagar do Financeiro. ${res.mensagem}`
        : `Adiantamento registrado e saldo incluído no Contas a Pagar. ${res.mensagem}`
  };
}

/**
 * Estorna o pagamento da pesagem (exclusão da despesa no Financeiro): segue a mesma trava da roça —
 * bloqueia se o pedido tiver título já pago no Contas a Pagar. Caso contrário, remove despesa/títulos
 * em aberto do pedido, devolve ao caixa e a pesagem volta a "pendente de definição de pagamento".
 */
export function estornarPagamentoCalculoRoca(calculoId: string): { sucesso: boolean; mensagem: string } {
  const calculo = carregarCalculosNaRoca().find(c => c.id === calculoId);
  if (!calculo) return { sucesso: false, mensagem: 'Pesagem não encontrada.' };
  const res = estornarPagamentoPedidoCompra(calculo.pedido_compra_id, [calculo.id]);
  if (!res.sucesso) return res;
  salvarCalculosNaRoca(carregarCalculosNaRoca().map(c =>
    c.id === calculoId ? { ...c, situacao_pagamento: 'PENDENTE_DEFINICAO' as const, detalhes_pagamento: undefined } : c
  ));
  return { sucesso: true, mensagem: `${res.mensagem} A pesagem ${calculo.numero_ticket} voltou a "Definir Pagamento".` };
}

/**
 * Exclui a pesagem na roça.
 * - Se já houve pagamento (total ou adiantamento), a exclusão é bloqueada.
 * - Caso contrário, o pedido de compra gerado é removido junto (com títulos e entrada de estoque estornados).
 */
export function excluirCalculoNaRoca(calculoId: string): { sucesso: boolean; mensagem: string } {
  const calculos = carregarCalculosNaRoca();
  const calculo = calculos.find(c => c.id === calculoId);
  if (!calculo) return { sucesso: false, mensagem: 'Pesagem não encontrada.' };

  const pedido = carregarPedidosCompra().find(p => p.id === calculo.pedido_compra_id);
  const houvePagamento =
    calculo.situacao_pagamento === 'JA_PAGO' ||
    calculo.situacao_pagamento === 'ADIANTAMENTO_PARCIAL' ||
    pedido?.status_pedido === 'Pago' ||
    // Título do pedido já baixado no Financeiro (A Pagar quitado depois)
    lerListaLocal('grupo_eno_financeiro_pagar_v1').some((t: any) => t.pedido_compra_id === calculo.pedido_compra_id && t.status === 'PAGO');
  if (houvePagamento) {
    return {
      sucesso: false,
      mensagem: 'Esta pesagem já tem pagamento registrado e não pode ser excluída. Estorne o pagamento no Financeiro antes.'
    };
  }

  if (pedido) excluirPedidoCompra(pedido.id, [calculo.id]);
  salvarCalculosNaRoca(calculos.filter(c => c.id !== calculoId));
  removerTodosComprovantes(calculoId);
  return { sucesso: true, mensagem: `Pesagem ${calculo.numero_ticket} excluída${pedido ? ' junto com o pedido de compra gerado' : ''}.` };
}
