// Store compartilhado para sincronização entre Cadastros e Pedidos de Compra
import { integrarEntradaMateriaPrima, estornarEntradaMateriaPrima } from './pipelineIntegrado';
import type { RegistroEntradaMateriaPrima } from './pipelineIntegrado';
import { hojeISO, paraISO, somarDias } from '../lib/datas';
import { registrarBaixaNoCaixa, estornarBaixaNoCaixa } from './financeiroData';

export type StatusPedidoCompra = 'A Confirmar' | 'Confirmado' | 'Programado' | 'Orçamento' | 'Entregue (A Pagar)' | 'Pago';

export type CategoriaCompra = 
  | 'Mandioca / Matéria-Prima'
  | 'Mercado / Cozinha / Copa'
  | 'Embalagens'
  | 'Manutenção & Peças'
  | 'Combustível & Lubrificantes'
  | 'Químicos & Laboratório'
  | 'Insumos Agrícolas'
  | 'Limpeza & Escritório'
  | 'Outros';

export interface PedidoCompraGeral {
  id: string;
  data: string;
  tipo_parceiro: 'AGRICULTOR' | 'FORNECEDOR';
  // Agricultor (quando aplicável)
  agricultor_id?: string;
  agricultor_nome?: string;
  agricultor_propriedade?: string;
  agricultor_cpf_cnpj?: string;
  agricultor_ie?: string;
  agricultor_cidade_uf?: string;
  agricultor_chave_pix?: string;
  // Fornecedor (quando aplicável)
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_fantasia?: string;
  fornecedor_cnpj?: string;
  fornecedor_ie?: string;
  fornecedor_cidade_uf?: string;
  fornecedor_chave_pix?: string;
  fornecedor_telefone?: string;
  // Solicitante e Local de Compra
  comprador_nome?: string;
  local_compra?: string;
  // Detalhes da Compra
  item_descricao: string;
  categoria: CategoriaCompra;
  quantidade: number;
  unidade_medida: 'KG' | 'Sacos' | 'Litros' | 'Unidades' | 'Caixas' | 'Toneladas' | 'Pacotes' | 'Fardos';
  valor_unitario: number;
  valor_total: number;
  // Refugo de mandioca (apenas quando for mandioca)
  residuo_destopo_casca_kg?: number;
  // Status e Pagamento
  status_pedido: StatusPedidoCompra;
  forma_pagamento: 'PIX' | 'Boleto Bancário' | 'Transferência TED' | 'À Vista Dinheiro' | 'Cartão Corporativo';
  data_pagamento?: string;
  observacoes?: string;
  // Integração com estoque/financeiro
  materia_prima_id?: string; // matéria-prima cadastrada correspondente (opcional; senão, procura pelo nome)
  entrada_estoque?: RegistroEntradaMateriaPrima; // preenchido quando a entrada no estoque já foi feita (uma única vez)
  efetivado_em?: string; // quando virou despesa/título no financeiro
}

export interface Agricultor {
  id: string;
  empresa_id: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_completo: string;
  nome_propriedade: string;
  cpf_cnpj: string;
  ie_rural: string;
  telefone: string;
  email?: string;
  endereco: {
    estrada_linha: string;
    comunidade_bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ponto_referencia?: string;
  };
  area_hectares?: number;
  capacidade_estimada_safra_ton?: number;
  chave_pix: string;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  titular_pix?: string;
  banco_nome?: string;
  agencia?: string;
  conta?: string;
  observacoes_financeiras?: string;
  ativo: boolean;
  criado_em: string;
}

export interface Fornecedor {
  id: string;
  empresa_id: string;
  tipo_pessoa: 'PF' | 'PJ';
  razao_nome: string;
  fantasia?: string;
  cpf_cnpj: string;
  ie_rg?: string;
  email: string;
  telefone: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    complemento?: string;
  };
  forma_pagamento_nome?: string;
  chave_pix?: string;
  ativo: boolean;
  criado_em: string;
}

export const AGRICULTORES_CADASTRADOS: Agricultor[] = [];

export const FORNECEDORES_CADASTRADOS: Fornecedor[] = [];

export const PEDIDOS_COMPRA_INICIAIS: PedidoCompraGeral[] = [];

const STORAGE_KEY_PEDIDOS_COMPRA = 'grupo_eno_pedidos_compra_v2';

export function carregarPedidosCompra(): PedidoCompraGeral[] {
  const modoLimpo = typeof window !== 'undefined' && localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
  if (typeof window === 'undefined') return modoLimpo ? [] : PEDIDOS_COMPRA_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PEDIDOS_COMPRA);
    if (raw === null) {
      if (modoLimpo) {
        localStorage.setItem(STORAGE_KEY_PEDIDOS_COMPRA, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_PEDIDOS_COMPRA, JSON.stringify(PEDIDOS_COMPRA_INICIAIS));
      return PEDIDOS_COMPRA_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarPedidosCompra(pedidos: PedidoCompraGeral[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PEDIDOS_COMPRA, JSON.stringify(pedidos));
  window.dispatchEvent(new Event('pedidos_compra_updated'));
}

// ============================================================
// EFETIVAÇÃO DE PEDIDOS DE COMPRA (núcleo único e idempotente)
// Regra financeira:
// - JA_PAGO  -> só Despesa realizada (paga). Nenhum título a pagar.
// - A_PAGAR  -> só Título a Pagar. A despesa nasce quando o título for pago no Financeiro.
// - ADIANTAMENTO_PARCIAL -> Despesa paga do adiantamento + Título a Pagar do saldo.
// Refazer a definição substitui os lançamentos anteriores do mesmo pedido (não duplica).
// Entrada no estoque de matéria-prima acontece uma única vez por pedido.
// ============================================================

const CHAVE_DESPESAS = 'grupo_eno_financeiro_despesas_v1';
const CHAVE_TITULOS_PAGAR = 'grupo_eno_financeiro_pagar_v1';

function lerJson(chave: string): any[] {
  try {
    const raw = localStorage.getItem(chave);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

// Reconhece lançamentos (atuais e legados) vinculados a um pedido/cálculo pelo id
function idVinculado(id: string, chaves: string[]): boolean {
  return chaves.some(k => !!k && (id === k || id.endsWith(`_${k}`) || id.includes(`_${k}_`)));
}

// Categoria financeira = a categoria escolhida na compra (sem inferência por palavra-chave)
export function categoriaFinanceiraCompra(categoria?: CategoriaCompra): CategoriaCompra {
  return categoria || 'Outros';
}

function setorDaCategoria(categoria: CategoriaCompra): string {
  switch (categoria) {
    case 'Mandioca / Matéria-Prima':
    case 'Embalagens':
    case 'Manutenção & Peças':
      return 'Fábrica & Moagem';
    case 'Combustível & Lubrificantes':
      return 'Frotas & Logística';
    case 'Químicos & Laboratório':
    case 'Insumos Agrícolas':
      return 'Qualidade & Laboratório';
    default:
      return 'Administrativo & TI';
  }
}

export function nomeParceiroCompra(pedido: PedidoCompraGeral): string {
  return pedido.tipo_parceiro === 'AGRICULTOR'
    ? (pedido.agricultor_nome || 'Produtor Rural')
    : (pedido.fornecedor_fantasia || pedido.fornecedor_nome || 'Fornecedor');
}

export interface DadosEfetivacaoCompra {
  tipo: 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
  // Data do pagamento (JA_PAGO / adiantamento) ou do vencimento (A_PAGAR / saldo). Aceita DD/MM/AAAA ou AAAA-MM-DD.
  data: string;
  data_vencimento_saldo?: string;
  forma_pagamento?: string;
  item_descricao?: string;
  valor_total?: number;
  categoria?: CategoriaCompra;
  valor_pago?: number; // adiantamento
  conta_bancaria?: string;
  observacao?: string;
  numero_documento?: string;
  status_final?: StatusPedidoCompra; // padrão: 'Pago' ou 'Entregue (A Pagar)'
  ids_legados?: string[]; // ids extras (ex.: id do cálculo na roça) para limpar lançamentos antigos
}

export interface ResultadoEfetivacaoCompra {
  sucesso: boolean;
  mensagem: string;
  entradaEstoque?: RegistroEntradaMateriaPrima | null;
}

export function efetivarPedidoCompra(pedidoId: string, dados: DadosEfetivacaoCompra): ResultadoEfetivacaoCompra {
  if (typeof window === 'undefined') return { sucesso: false, mensagem: 'Janela indisponível' };

  const pedidos = carregarPedidosCompra();
  const index = pedidos.findIndex(p => p.id === pedidoId);
  if (index === -1) return { sucesso: false, mensagem: 'Pedido de compra não encontrado.' };

  const pedido: PedidoCompraGeral = { ...pedidos[index] };

  // 1. Aplica as edições feitas no momento da efetivação (produto, valor, categoria, forma)
  if (dados.item_descricao && dados.item_descricao.trim()) pedido.item_descricao = dados.item_descricao.trim();
  if (typeof dados.valor_total === 'number' && dados.valor_total >= 0 && !isNaN(dados.valor_total)) {
    pedido.valor_total = parseFloat(dados.valor_total.toFixed(2));
    if (pedido.quantidade > 0) pedido.valor_unitario = parseFloat((pedido.valor_total / pedido.quantidade).toFixed(4));
  }
  if (dados.categoria) pedido.categoria = dados.categoria;
  if (dados.forma_pagamento) pedido.forma_pagamento = dados.forma_pagamento as PedidoCompraGeral['forma_pagamento'];

  const categoria = categoriaFinanceiraCompra(pedido.categoria);
  const setor = setorDaCategoria(categoria);
  const parceiroNome = nomeParceiroCompra(pedido);
  const dataMov = paraISO(dados.data) || hojeISO();
  const valorTotal = Number(pedido.valor_total) || 0;
  const chaves = [pedido.id, ...(dados.ids_legados || [])];
  const numeroDoc = dados.numero_documento || `PC-${pedido.id.toUpperCase()}`;

  // 2. Remove lançamentos anteriores do mesmo pedido (programados, despesas e títulos ainda não pagos)
  const despesasTodas = lerJson(CHAVE_DESPESAS);
  const despVinculada = (d: any) => d.pedido_compra_id === pedido.id || idVinculado(String(d.id || ''), chaves);
  const despesasRemovidas = despesasTodas.filter(despVinculada);
  const despesas = despesasTodas.filter((d: any) => !despVinculada(d));
  const titulosTodos = lerJson(CHAVE_TITULOS_PAGAR);
  const vinculadoTitulo = (t: any) => t.pedido_compra_id === pedido.id || idVinculado(String(t.id || ''), chaves);
  const titulosJaPagos = titulosTodos.filter((t: any) => vinculadoTitulo(t) && t.status === 'PAGO');
  const titulos = titulosTodos.filter((t: any) => !vinculadoTitulo(t) || t.status === 'PAGO');
  const jaQuitadoEmTitulos = titulosJaPagos.reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0);

  const ts = Date.now();
  const novaDespesa = (valor: number, descricao: string) => ({
    id: `desp_pc_${pedido.id}_${ts}`,
    pedido_compra_id: pedido.id,
    tipo_despesa: 'REALIZADA',
    status_despesa: 'PAGO',
    data: dataMov,
    categoria,
    descricao,
    valor: parseFloat(valor.toFixed(2)),
    setor,
    responsavel: pedido.comprador_nome || 'Gestão de Suprimentos',
    forma_pagamento: pedido.forma_pagamento || 'PIX',
    conta_bancaria: dados.conta_bancaria,
    comprovante_anexo: true
  });
  const novoTitulo = (valor: number, vencimento: string, sufixo: string, obs: string) => ({
    id: `pag_pc_${pedido.id}_${ts}${sufixo}`,
    pedido_compra_id: pedido.id,
    numero_documento: `${numeroDoc}${sufixo ? '-SALDO' : ''}`,
    favorecido_nome: parceiroNome,
    tipo_favorecido: pedido.tipo_parceiro === 'AGRICULTOR' ? 'Agricultor' : 'Fornecedor',
    categoria,
    valor: parseFloat(valor.toFixed(2)),
    data_emissao: paraISO(pedido.data) || hojeISO(),
    data_vencimento: vencimento,
    status: 'A_PAGAR',
    forma_pagamento: pedido.forma_pagamento || 'PIX',
    chave_pix: pedido.agricultor_chave_pix || pedido.fornecedor_chave_pix,
    observacoes: obs
  });

  const restante = Math.max(0, valorTotal - jaQuitadoEmTitulos);
  const obsBase = `${pedido.item_descricao} - Qtd: ${pedido.quantidade} ${pedido.unidade_medida}${dados.observacao ? ` | ${dados.observacao}` : ''}`;

  if (dados.tipo === 'JA_PAGO') {
    if (restante > 0.009) despesas.unshift(novaDespesa(restante, `[Compra Paga] ${pedido.item_descricao} - ${parceiroNome}`));
    pedido.status_pedido = dados.status_final || 'Pago';
    pedido.data_pagamento = dataMov;
  } else if (dados.tipo === 'A_PAGAR') {
    if (restante > 0.009) titulos.unshift(novoTitulo(restante, dataMov, '', obsBase));
    pedido.status_pedido = dados.status_final || 'Entregue (A Pagar)';
    pedido.data_pagamento = undefined;
  } else {
    const adiantado = Math.min(restante, Math.max(0, Number(dados.valor_pago) || 0));
    const saldo = Math.max(0, restante - adiantado);
    if (adiantado > 0.009) despesas.unshift(novaDespesa(adiantado, `[Adiantamento de Compra] ${pedido.item_descricao} - ${parceiroNome}`));
    if (saldo > 0.009) {
      const venc = paraISO(dados.data_vencimento_saldo) || dataMov;
      titulos.unshift(novoTitulo(saldo, venc, '_saldo', `Saldo restante: ${obsBase}`));
    }
    pedido.status_pedido = saldo > 0.009 ? (dados.status_final || 'Entregue (A Pagar)') : 'Pago';
    pedido.data_pagamento = saldo > 0.009 ? undefined : dataMov;
  }

  localStorage.setItem(CHAVE_DESPESAS, JSON.stringify(despesas));
  localStorage.setItem(CHAVE_TITULOS_PAGAR, JSON.stringify(titulos));

  // Caixa: estorna as saídas das despesas substituídas e registra a saída das novas despesas pagas (uma vez por id)
  despesasRemovidas.forEach((d: any) => estornarBaixaNoCaixa(`despesa:${d.id}`));
  despesas
    .filter((d: any) => d.pedido_compra_id === pedido.id && d.status_despesa === 'PAGO')
    .forEach((d: any) => registrarBaixaNoCaixa(`despesa:${d.id}`, -(Number(d.valor) || 0)));

  // 3. Entrada no estoque de matéria-prima: só itens que são matéria-prima cadastrada, uma única vez
  let entrada: RegistroEntradaMateriaPrima | null | undefined = pedido.entrada_estoque;
  if (!pedido.entrada_estoque) {
    try {
      entrada = integrarEntradaMateriaPrima({
        descricaoItem: pedido.item_descricao,
        quantidade: pedido.quantidade,
        unidade: pedido.unidade_medida,
        valorTotal: valorTotal,
        fornecedorNome: parceiroNome,
        fornecedorCpfCnpj: pedido.agricultor_cpf_cnpj || pedido.fornecedor_cnpj,
        tipoParceiro: pedido.tipo_parceiro === 'AGRICULTOR' ? 'Agricultor' : 'Fornecedor',
        numeroNF: numeroDoc,
        data: pedido.data,
        materiaPrimaId: pedido.materia_prima_id
      });
      if (entrada) pedido.entrada_estoque = entrada;
    } catch (e) {
      console.error('Erro na entrada de matéria-prima:', e);
    }
  }

  pedido.efetivado_em = new Date().toISOString();
  pedidos[index] = pedido;
  salvarPedidosCompra(pedidos);

  window.dispatchEvent(new Event('financeiro_updated'));
  window.dispatchEvent(new Event('produtos_updated'));

  const msgFin = dados.tipo === 'JA_PAGO'
    ? 'lançado como Despesa paga'
    : dados.tipo === 'A_PAGAR'
      ? 'lançado no Contas a Pagar'
      : 'adiantamento lançado como Despesa e saldo no Contas a Pagar';
  const msgEstoque = pedido.entrada_estoque
    ? ` Estoque de "${pedido.entrada_estoque.materia_prima_nome}" atualizado (+${pedido.entrada_estoque.quantidade.toLocaleString('pt-BR')} ${pedido.entrada_estoque.unidade}).`
    : '';
  return {
    sucesso: true,
    mensagem: `Compra "${pedido.item_descricao}" ${msgFin} (categoria "${categoria}").${msgEstoque}`,
    entradaEstoque: pedido.entrada_estoque
  };
}

/**
 * Confirma o Pedido de Compra (sem alteração de produto ou valor), como compra A PAGAR.
 * Protegido contra confirmação dupla: se o pedido já foi efetivado, não lança nada de novo.
 */
export function confirmarPedidoCompraELancarDespesa(
  pedidoId: string,
  opcoes?: { dataVencimento?: string }
): { sucesso: boolean; mensagem: string; categoriaFinanceiro: string } {
  if (typeof window === 'undefined') return { sucesso: false, mensagem: 'Janela indisponível', categoriaFinanceiro: '' };
  const pedido = carregarPedidosCompra().find(p => p.id === pedidoId);
  if (!pedido) return { sucesso: false, mensagem: 'Pedido não encontrado', categoriaFinanceiro: '' };
  const categoriaFinanceiro = categoriaFinanceiraCompra(pedido.categoria);

  if (pedido.efetivado_em || pedido.status_pedido === 'Pago' || pedido.status_pedido === 'Entregue (A Pagar)' || pedido.status_pedido === 'Confirmado') {
    return { sucesso: false, mensagem: 'Este pedido de compra já foi confirmado anteriormente. Nada foi lançado novamente.', categoriaFinanceiro };
  }

  const res = efetivarPedidoCompra(pedidoId, {
    tipo: 'A_PAGAR',
    data: opcoes?.dataVencimento || somarDias(hojeISO(), 7),
    status_final: 'Confirmado'
  });
  return { sucesso: res.sucesso, mensagem: res.mensagem, categoriaFinanceiro };
}

/**
 * Exclui o pedido de compra, os lançamentos financeiros vinculados e estorna a entrada de estoque.
 */
export function excluirPedidoCompra(pedidoId: string, idsLegados: string[] = []): void {
  if (typeof window === 'undefined') return;
  const pedidos = carregarPedidosCompra();
  const pedido = pedidos.find(p => p.id === pedidoId);
  salvarPedidosCompra(pedidos.filter(p => p.id !== pedidoId));
  const chaves = [pedidoId, ...idsLegados];
  try {
    const despesasTodas = lerJson(CHAVE_DESPESAS);
    const vinc = (d: any) => d.pedido_compra_id === pedidoId || idVinculado(String(d.id || ''), chaves);
    despesasTodas.filter(vinc).forEach((d: any) => estornarBaixaNoCaixa(`despesa:${d.id}`));
    localStorage.setItem(CHAVE_DESPESAS, JSON.stringify(despesasTodas.filter((d: any) => !vinc(d))));
    const titulosTodos = lerJson(CHAVE_TITULOS_PAGAR);
    const vincT = (t: any) => t.pedido_compra_id === pedidoId || idVinculado(String(t.id || ''), chaves);
    titulosTodos.filter(vincT).forEach((t: any) => estornarBaixaNoCaixa(`pagar:${t.id}`));
    const titulos = titulosTodos.filter((t: any) => !vincT(t));
    localStorage.setItem(CHAVE_TITULOS_PAGAR, JSON.stringify(titulos));
    if (pedido?.entrada_estoque) estornarEntradaMateriaPrima(pedido.entrada_estoque);
    window.dispatchEvent(new Event('financeiro_updated'));
    window.dispatchEvent(new Event('produtos_updated'));
  } catch (err) {
    console.error('Erro ao excluir lançamentos do pedido de compra:', err);
  }
}
