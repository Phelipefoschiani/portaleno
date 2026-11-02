// Ordens de Produção (OP) do Grupo ENO
// Uma OP produz um produto acabado a partir da sua receita:
//   PLANEJADA -> EM_PRODUCAO -> CONCLUIDA (ou CANCELADA)
// Origem: item de pedido de venda (gerada automaticamente quando o pedido entra em produção) ou manual "para estoque".
// Na CONCLUSÃO (uma única vez): entra o produto acabado e baixa a matéria-prima pela receita.

import {
  carregarEstoqueProdutos,
  carregarReceitas,
  carregarFichasTecnicas
} from './produtosData';
import {
  aplicarProducaoNoEstoque,
  calcularConsumoProducao,
  integrarConclusaoProducao,
  ConsumoMateriaPrimaProducao
} from './pipelineIntegrado';
import {
  carregarPedidosVenda,
  salvarPedidosVenda,
  pacotesDoItem,
  unidadesPorEmbalagemItem,
  PedidoVenda,
  ApontamentoProducao
} from './pedidosVendaData';
import { hojeISO, paraISO, parseData } from '../lib/datas';

export type StatusOrdemProducao = 'PLANEJADA' | 'EM_PRODUCAO' | 'CONCLUIDA' | 'CANCELADA';

export interface ApontamentoOP {
  id: string;
  data: string; // AAAA-MM-DD
  pacotes: number;
  operador?: string;
  observacao?: string;
}

export interface OrdemProducao {
  id: string;
  numero: string; // OP-AAAA-0001
  origem: 'PEDIDO' | 'ESTOQUE';
  status: StatusOrdemProducao;
  // Vínculo com pedido de venda (origem PEDIDO)
  pedido_id?: string;
  pedido_numero?: string;
  cliente_nome?: string;
  item_index?: number;
  unidades_por_embalagem?: number; // pacotes por fardo/caixa do item do pedido
  tipo_embalagem?: string;
  ciclo_encerrado?: boolean; // pedido voltou para orçamento: OP não cobre mais o pedido
  // Produto e receita
  produto_id: string;
  produto_nome: string;
  receita_id?: string;
  receita_nome?: string;
  peso_unitario_kg?: number;
  // Quantidades em PACOTES
  quantidade_planejada_pacotes: number;
  quantidade_produzida_pacotes: number;
  apontamentos?: ApontamentoOP[];
  // Rastreabilidade
  lote?: string;
  data_fabricacao?: string; // AAAA-MM-DD
  data_validade?: string; // AAAA-MM-DD
  // Datas de status
  data_criacao: string;
  data_prevista?: string;
  data_inicio?: string;
  data_conclusao?: string;
  data_cancelamento?: string;
  // Conclusão (idempotente)
  estoque_integrado?: boolean;
  consumo_real?: ConsumoMateriaPrimaProducao[];
  observacoes?: string;
}

const STORAGE_KEY_OPS = 'grupo_eno_ordens_producao_v1';
export const EVENTO_OPS = 'ordens_producao_updated';

export function carregarOrdensProducao(): OrdemProducao[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPS);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY_OPS, JSON.stringify([]));
      return [];
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarOrdensProducao(dados: OrdemProducao[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_OPS, JSON.stringify(dados));
  window.dispatchEvent(new Event(EVENTO_OPS));
}

function proximoNumeroOP(lista: OrdemProducao[], extra = 0): string {
  const ano = new Date().getFullYear();
  const prefixo = `OP-${ano}-`;
  const maior = lista
    .filter(o => o.numero?.startsWith(prefixo))
    .reduce((acc, o) => Math.max(acc, parseInt(o.numero.slice(prefixo.length)) || 0), 0);
  return `${prefixo}${String(maior + 1 + extra).padStart(4, '0')}`;
}

const novoId = (sufixo = '') => `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${sufixo}`;

// Soma meses a uma data ('AAAA-MM-DD' ou 'DD/MM/AAAA'), devolvendo 'AAAA-MM-DD'
export function somarMeses(valor: string, meses: number): string {
  const d = parseData(valor) || new Date();
  const dia = d.getDate();
  const r = new Date(d.getFullYear(), d.getMonth() + meses, 1);
  const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(dia, ultimo));
  return hojeISO(r);
}

// Prazo de validade (meses) pela ficha técnica do produto; 24 meses quando não informado
export function prazoValidadeMesesProduto(produtoId: string): number {
  const ficha = carregarFichasTecnicas().find(f => f.produto_id === produtoId);
  const meses = Number(ficha?.prazo_validade_meses) || 0;
  return meses > 0 ? meses : 24;
}

export function validadePadraoProduto(produtoId: string, dataFabricacao: string = hojeISO()): string {
  return somarMeses(dataFabricacao, prazoValidadeMesesProduto(produtoId));
}

export function loteSugeridoOP(numeroOP: string): string {
  return `LOT-${hojeISO().slice(2).replace(/-/g, '')}-${numeroOP.replace(/\D/g, '').slice(-4)}`;
}

// MP necessária para a OP (planejado ou o que falta produzir), com estoque atual e falta
export function necessidadeMateriaPrimaOP(op: OrdemProducao, base: 'PLANEJADO' | 'RESTANTE' | 'PRODUZIDO' = 'PLANEJADO'): ConsumoMateriaPrimaProducao[] {
  const pacotes =
    base === 'PRODUZIDO'
      ? op.quantidade_produzida_pacotes
      : base === 'RESTANTE'
        ? Math.max(0, op.quantidade_planejada_pacotes - (op.quantidade_produzida_pacotes || 0))
        : op.quantidade_planejada_pacotes;
  return calcularConsumoProducao(op.produto_id, pacotes, {
    produtoNome: op.produto_nome,
    pesoUnitarioKg: op.peso_unitario_kg
  });
}

export function opTemFaltaMateriaPrima(op: OrdemProducao): boolean {
  if (op.status !== 'PLANEJADA' && op.status !== 'EM_PRODUCAO') return false;
  return necessidadeMateriaPrimaOP(op, 'RESTANTE').some(c => c.falta > 0);
}

// OPs que cobrem um pedido (ciclo atual, não canceladas)
export function ordensDoPedido(pedidoId: string, lista: OrdemProducao[] = carregarOrdensProducao()): OrdemProducao[] {
  return lista.filter(o => o.pedido_id === pedidoId && !o.ciclo_encerrado && o.status !== 'CANCELADA');
}

function montarOP(
  dados: Omit<OrdemProducao, 'id' | 'numero' | 'status' | 'data_criacao' | 'quantidade_produzida_pacotes' | 'receita_id' | 'receita_nome' | 'peso_unitario_kg'> & { quantidade_produzida_pacotes?: number },
  numero: string
): OrdemProducao {
  const prod = carregarEstoqueProdutos().find(p => p.id === dados.produto_id);
  const rec = prod?.receita_id ? carregarReceitas().find(r => r.id === prod.receita_id) : undefined;
  return {
    ...dados,
    id: novoId(),
    numero,
    status: (dados.quantidade_produzida_pacotes || 0) > 0 ? 'EM_PRODUCAO' : 'PLANEJADA',
    data_criacao: hojeISO(),
    produto_nome: prod?.nome || dados.produto_nome,
    receita_id: rec?.id,
    receita_nome: rec ? rec.nome || rec.produto_nome : undefined,
    peso_unitario_kg: prod?.peso_unitario_kg,
    quantidade_produzida_pacotes: dados.quantidade_produzida_pacotes || 0
  };
}

// OP manual "para estoque"
export function criarOrdemProducaoEstoque(params: {
  produto_id: string;
  quantidade_pacotes: number;
  data_prevista?: string;
  observacoes?: string;
}): OrdemProducao | null {
  const prod = carregarEstoqueProdutos().find(p => p.id === params.produto_id);
  const qtd = Number(params.quantidade_pacotes) || 0;
  if (!prod || qtd <= 0) return null;
  const lista = carregarOrdensProducao();
  const op = montarOP(
    {
      origem: 'ESTOQUE',
      produto_id: prod.id,
      produto_nome: prod.nome,
      quantidade_planejada_pacotes: qtd,
      data_prevista: paraISO(params.data_prevista) || undefined,
      observacoes: params.observacoes || undefined
    },
    proximoNumeroOP(lista)
  );
  salvarOrdensProducao([op, ...lista]);
  return op;
}

/**
 * Pedido entrou em produção: cria uma OP por item (se o pedido ainda não tem OPs no ciclo atual).
 * `novoCiclo`: pedido saiu de orçamento — OPs abertas anteriores são canceladas e as concluídas deixam de cobrir.
 */
export function gerarOrdensDoPedido(pedido: PedidoVenda, opcoes?: { novoCiclo?: boolean }): OrdemProducao[] {
  let lista = carregarOrdensProducao();
  if (opcoes?.novoCiclo) {
    lista = lista.map(o => {
      if (o.pedido_id !== pedido.id || o.ciclo_encerrado) return o;
      if (o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO') {
        return { ...o, status: 'CANCELADA' as const, data_cancelamento: hojeISO(), ciclo_encerrado: true };
      }
      return { ...o, ciclo_encerrado: true };
    });
  }
  const existentes = ordensDoPedido(pedido.id, lista);
  const novas: OrdemProducao[] = [];
  pedido.itens.forEach((item, i) => {
    if (existentes.some(o => o.item_index === i)) return;
    const pacotes = pacotesDoItem(item);
    if (pacotes <= 0) return;
    novas.push(
      montarOP(
        {
          origem: 'PEDIDO',
          pedido_id: pedido.id,
          pedido_numero: pedido.numero_pedido,
          cliente_nome: pedido.cliente_nome,
          item_index: i,
          unidades_por_embalagem: unidadesPorEmbalagemItem(item),
          tipo_embalagem: item.tipo_embalagem,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_planejada_pacotes: pacotes,
          quantidade_produzida_pacotes: pacotesDoItem(item, Number(item.quantidade_produzida) || 0),
          lote: item.lote_producao || pedido.lote_producao,
          data_prevista: paraISO(pedido.data_previsao_entrega) || undefined
        },
        proximoNumeroOP(lista, novas.length)
      )
    );
  });
  if (novas.length > 0 || opcoes?.novoCiclo) salvarOrdensProducao([...novas, ...lista]);
  return novas;
}

// Pedidos já em produção antes das OPs existirem: gera as OPs que faltam
export function garantirOrdensDosPedidosEmProducao(): void {
  carregarPedidosVenda()
    .filter(p => p.etapa === 'EM_PRODUCAO')
    .forEach(p => gerarOrdensDoPedido(p));
}

// Pedido voltou para orçamento: cancela as OPs abertas e solta as concluídas do ciclo
export function encerrarOrdensDoPedido(pedidoId: string): void {
  const lista = carregarOrdensProducao();
  if (!lista.some(o => o.pedido_id === pedidoId && !o.ciclo_encerrado)) return;
  salvarOrdensProducao(
    lista.map(o => {
      if (o.pedido_id !== pedidoId || o.ciclo_encerrado) return o;
      if (o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO') {
        return { ...o, status: 'CANCELADA' as const, data_cancelamento: hojeISO(), ciclo_encerrado: true };
      }
      return { ...o, ciclo_encerrado: true };
    })
  );
}

// Pedido (tela Em Produção) apontou/removeu produção: OP acompanha o total produzido do item
export function sincronizarOrdensComPedido(pedido: PedidoVenda): void {
  const lista = carregarOrdensProducao();
  let alterou = false;
  const atualizadas = lista.map(o => {
    if (o.pedido_id !== pedido.id || o.ciclo_encerrado) return o;
    if (o.status !== 'PLANEJADA' && o.status !== 'EM_PRODUCAO') return o;
    const item = typeof o.item_index === 'number' ? pedido.itens[o.item_index] : undefined;
    if (!item) return o;
    const produzido = pacotesDoItem(item, Number(item.quantidade_produzida) || 0);
    const lote = item.lote_producao || pedido.lote_producao || o.lote;
    if (produzido === o.quantidade_produzida_pacotes && lote === o.lote) return o;
    alterou = true;
    return {
      ...o,
      quantidade_produzida_pacotes: produzido,
      lote,
      status: produzido > 0 ? ('EM_PRODUCAO' as const) : o.status,
      data_inicio: produzido > 0 ? o.data_inicio || hojeISO() : o.data_inicio
    };
  });
  if (alterou) salvarOrdensProducao(atualizadas);
}

// Reflete no item do pedido o que a OP produziu (apontamento feito pela OP / portal da produção)
function refletirOPNoPedido(op: OrdemProducao, pacotesApontados: number, operador?: string): void {
  if (op.origem !== 'PEDIDO' || !op.pedido_id || typeof op.item_index !== 'number') return;
  const pedidos = carregarPedidosVenda();
  const idx = pedidos.findIndex(p => p.id === op.pedido_id);
  if (idx < 0) return;
  const ped = pedidos[idx];
  if (ped.etapa !== 'EM_PRODUCAO') return;
  const item = ped.itens[op.item_index];
  if (!item) return;
  const unidades = unidadesPorEmbalagemItem(item);
  const embalagens = parseFloat((op.quantidade_produzida_pacotes / unidades).toFixed(3));
  const itens = ped.itens.map((it, i) => (i === op.item_index ? { ...it, quantidade_produzida: embalagens, lote_producao: op.lote || it.lote_producao } : it));
  let apontamentos = ped.apontamentos_producao || [];
  if (pacotesApontados !== 0) {
    const apt: ApontamentoProducao = {
      id: `apt_op_${Date.now()}`,
      data: hojeISO(),
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      tipo_embalagem: item.tipo_embalagem,
      quantidade_produzida_embalagens: parseFloat((pacotesApontados / unidades).toFixed(3)),
      quantidade_produzida_kg: pacotesApontados * (Number(item.peso_unitario_kg) || 0),
      operador: operador || 'Ordem de Produção',
      lote: op.lote,
      observacao: `Apontado na ${op.numero}`
    };
    apontamentos = [apt, ...apontamentos];
  }
  pedidos[idx] = {
    ...ped,
    itens,
    apontamentos_producao: apontamentos,
    quantidade_produzida_acumulada_kg: apontamentos.reduce((acc, a) => acc + (Number(a.quantidade_produzida_kg) || 0), 0),
    lote_producao: ped.lote_producao || op.lote,
    data_fabricacao: ped.data_fabricacao || op.data_fabricacao,
    data_vencimento: ped.data_vencimento || op.data_validade
  };
  salvarPedidosVenda(pedidos);
}

function atualizarOP(opId: string, fn: (op: OrdemProducao) => OrdemProducao | null): OrdemProducao | null {
  const lista = carregarOrdensProducao();
  const idx = lista.findIndex(o => o.id === opId);
  if (idx < 0) return null;
  const nova = fn(lista[idx]);
  if (!nova) return null;
  lista[idx] = nova;
  salvarOrdensProducao(lista);
  return nova;
}

export function iniciarOrdemProducao(opId: string): OrdemProducao | null {
  return atualizarOP(opId, op => {
    if (op.status !== 'PLANEJADA') return null;
    const fab = op.data_fabricacao || hojeISO();
    return {
      ...op,
      status: 'EM_PRODUCAO',
      data_inicio: hojeISO(),
      lote: op.lote || loteSugeridoOP(op.numero),
      data_fabricacao: fab,
      data_validade: op.data_validade || validadePadraoProduto(op.produto_id, fab)
    };
  });
}

// Grava lote / fabricação / validade da OP
export function atualizarRastreabilidadeOP(opId: string, dados: { lote?: string; data_fabricacao?: string; data_validade?: string }): OrdemProducao | null {
  return atualizarOP(opId, op => {
    if (op.status === 'CONCLUIDA' || op.status === 'CANCELADA') return null;
    return {
      ...op,
      lote: dados.lote?.trim() || op.lote,
      data_fabricacao: paraISO(dados.data_fabricacao) || op.data_fabricacao,
      data_validade: paraISO(dados.data_validade) || op.data_validade
    };
  });
}

// Apontamento de pacotes produzidos (pode ser negativo para correção, sem passar de 0)
export function apontarProducaoOP(opId: string, pacotes: number, extras?: { operador?: string; observacao?: string; lote?: string; data_fabricacao?: string; data_validade?: string }): OrdemProducao | null {
  const qtd = Number(pacotes) || 0;
  if (qtd === 0) return null;
  let delta = 0;
  const op = atualizarOP(opId, o => {
    if (o.status === 'CONCLUIDA' || o.status === 'CANCELADA') return null;
    const novo = Math.max(0, (o.quantidade_produzida_pacotes || 0) + qtd);
    delta = novo - (o.quantidade_produzida_pacotes || 0);
    const fab = paraISO(extras?.data_fabricacao) || o.data_fabricacao || hojeISO();
    return {
      ...o,
      status: 'EM_PRODUCAO',
      data_inicio: o.data_inicio || hojeISO(),
      quantidade_produzida_pacotes: novo,
      lote: extras?.lote?.trim() || o.lote || loteSugeridoOP(o.numero),
      data_fabricacao: fab,
      data_validade: paraISO(extras?.data_validade) || o.data_validade || validadePadraoProduto(o.produto_id, fab),
      apontamentos: [
        { id: `apt_${Date.now()}`, data: hojeISO(), pacotes: delta, operador: extras?.operador, observacao: extras?.observacao },
        ...(o.apontamentos || [])
      ]
    };
  });
  if (op && delta !== 0) refletirOPNoPedido(op, delta, extras?.operador);
  return op;
}

/**
 * Conclui a OP (idempotente): entra o produto acabado pelos pacotes apontados e baixa a MP pela receita.
 * Grava o consumo real (com falta, se houve) na OP.
 * `refletirNoPedido=false` quando quem chama já está salvando o pedido (moverPedidoEtapa).
 */
export function concluirOrdemProducao(
  opId: string,
  dados?: { pacotes_produzidos?: number; lote?: string; data_fabricacao?: string; data_validade?: string },
  opcoes?: { refletirNoPedido?: boolean }
): OrdemProducao | null {
  const lista = carregarOrdensProducao();
  const idx = lista.findIndex(o => o.id === opId);
  if (idx < 0) return null;
  const atual = lista[idx];
  if (atual.status === 'CONCLUIDA' || atual.status === 'CANCELADA' || atual.estoque_integrado) return atual;

  const produzido = Math.max(0, dados?.pacotes_produzidos !== undefined ? Number(dados.pacotes_produzidos) || 0 : atual.quantidade_produzida_pacotes || 0);
  const fab = paraISO(dados?.data_fabricacao) || atual.data_fabricacao || hojeISO();
  const lote = dados?.lote?.trim() || atual.lote || loteSugeridoOP(atual.numero);
  const validade = paraISO(dados?.data_validade) || atual.data_validade || validadePadraoProduto(atual.produto_id, fab);

  // Marca como integrada ANTES de mexer no estoque (evita dupla baixa em chamadas concorrentes)
  const travada: OrdemProducao = { ...atual, estoque_integrado: true };
  lista[idx] = travada;
  salvarOrdensProducao(lista);

  let consumo: ConsumoMateriaPrimaProducao[] = [];
  try {
    consumo = aplicarProducaoNoEstoque([
      { produto_id: atual.produto_id, produto_nome: atual.produto_nome, pacotes: produzido, peso_unitario_kg: atual.peso_unitario_kg, lote }
    ]);
  } catch (e) {
    console.error('Erro ao integrar conclusão da OP:', e);
  }

  const delta = produzido - (atual.quantidade_produzida_pacotes || 0);
  const concluida: OrdemProducao = {
    ...travada,
    status: 'CONCLUIDA',
    quantidade_produzida_pacotes: produzido,
    lote,
    data_fabricacao: fab,
    data_validade: validade,
    data_inicio: atual.data_inicio || hojeISO(),
    data_conclusao: hojeISO(),
    consumo_real: consumo
  };
  const listaFinal = carregarOrdensProducao().map(o => (o.id === opId ? concluida : o));
  salvarOrdensProducao(listaFinal);
  if (opcoes?.refletirNoPedido !== false) refletirOPNoPedido(concluida, delta);
  return concluida;
}

export function cancelarOrdemProducao(opId: string): OrdemProducao | null {
  return atualizarOP(opId, op => {
    if (op.status === 'CONCLUIDA' || op.status === 'CANCELADA') return null;
    return { ...op, status: 'CANCELADA', data_cancelamento: hojeISO() };
  });
}

/**
 * Pedido passa para A_FATURAR: conclui as OPs abertas do pedido com o que foi apontado no item
 * (OPs já concluídas não entram de novo) e integra pelo modo legado só os itens sem OP.
 */
export function integrarProducaoDoPedido(pedido: PedidoVenda): void {
  if (pedido.producao_integrada) return;
  const ops = ordensDoPedido(pedido.id);
  const cobertos: number[] = [];
  ops.forEach(op => {
    if (typeof op.item_index !== 'number') return;
    cobertos.push(op.item_index);
    if (op.status === 'CONCLUIDA') return;
    const item = pedido.itens[op.item_index];
    const pacotes = item ? pacotesDoItem(item, Number(item.quantidade_produzida) || 0) : op.quantidade_produzida_pacotes;
    concluirOrdemProducao(
      op.id,
      {
        pacotes_produzidos: pacotes,
        lote: item?.lote_producao || pedido.lote_producao,
        data_fabricacao: pedido.data_fabricacao,
        data_validade: pedido.data_vencimento
      },
      { refletirNoPedido: false }
    );
  });
  integrarConclusaoProducao(pedido, cobertos);
}

// Lotes de OPs concluídas de um produto (para etiqueta), mais recente primeiro
export function lotesConcluidosDoProduto(produtoId: string): OrdemProducao[] {
  return carregarOrdensProducao()
    .filter(o => o.produto_id === produtoId && o.status === 'CONCLUIDA' && !!o.lote)
    .sort((a, b) => String(b.data_conclusao || '').localeCompare(String(a.data_conclusao || '')));
}
