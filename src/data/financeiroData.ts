// Módulo Financeiro Consolidado do Grupo ENO Agroindustrial
// Integra Contas a Receber (Vendas Faturadas), Contas a Pagar (Compras de Mandioca / Insumos),
// Lançamento de Despesas, Notas Fiscais (Entrada/Saída), Receitas Extras e Caixa de Investimento.

import { parseData, mesAtualKey, hojeISO, paraISO } from '../lib/datas';

export interface TituloReceber {
  id: string;
  pedido_venda_id?: string;
  numero_documento: string; // ex: DUP-4891-01
  cliente_nome: string;
  cliente_cnpj: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'EM_ABERTO' | 'PAGO' | 'VENCIDO';
  forma_pagamento: string;
  banco_emissor: string;
  linha_digitavel?: string;
  observacoes?: string;
}

export interface TituloPagar {
  id: string;
  pedido_compra_id?: string;
  numero_documento: string; // ex: DUP-ENT-1048
  favorecido_nome: string;
  tipo_favorecido: 'Agricultor' | 'Fornecedor' | 'Operacional' | 'RCA';
  categoria: 'Mandioca / Matéria-Prima' | 'Lenha & Biomassa' | 'Embalagens' | 'Energia / Concessionárias' | 'Manutenção Mecânica' | 'Fretes' | 'Comissão de RCA';
  pedido_venda_id?: string; // Comissão de RCA: pedido de venda que gerou o título
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'A_PAGAR' | 'PAGO' | 'VENCIDO';
  forma_pagamento: string;
  chave_pix?: string;
  dados_bancarios?: string;
  observacoes?: string;
}

import type { NotaFornecedor } from './notasFornecedorData';

export interface DespesaOperacional {
  id: string;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  setor: 'Fábrica & Moagem' | 'Secador & Caldeira' | 'Frotas & Logística' | 'Administrativo & TI' | 'Qualidade & Laboratório';
  responsavel: string;
  forma_pagamento: string;
  comprovante_anexo?: boolean;
  nota_fiscal?: NotaFornecedor; // nota do fornecedor (para a declaração)
}

export interface NotaFiscalSaida {
  id: string;
  numero: string;
  serie: string;
  chave_acesso: string;
  cliente_nome: string;
  cnpj_cpf: string;
  valor_total: number;
  peso_liquido_kg: number;
  data_emissao: string;
  status_sefaz: 'AUTORIZADA' | 'CANCELADA' | 'INUTILIZADA';
  transportadora: string;
  placa: string;
}

export interface NotaFiscalEntrada {
  id: string;
  numero: string;
  serie: string;
  chave_acesso: string;
  parceiro_nome: string;
  tipo_parceiro: 'Agricultor' | 'Fornecedor';
  cnpj_cpf: string;
  produto_descricao: string;
  peso_liquido_kg: number;
  valor_total: number;
  data_emissao: string;
  status_sefaz: 'AUTORIZADA' | 'PROCESSADA';
  despesa_id?: string; // despesa paga que esta nota comprova
  pedido_compra_id?: string; // compra que esta nota comprova
}

export interface LancamentoReceita {
  id: string;
  data: string;
  origem: 'Venda de Resíduo/Bagaço Úmido' | 'Venda de Cascas/Destopo' | 'Rendimento de Aplicação Financeira' | 'Bonificação/Reembolso' | 'Outras Receitas';
  comprador_origem: string;
  descricao: string;
  valor: number;
  conta_creditada: string;
  forma_recebimento: string;
}

export interface CaixaInvestimento {
  saldo_disponivel_industrial: number;
  fundo_reserva_safra: number;
  fundo_modernizacao_maquinario: number;
  rendimento_mensal_estimado: number;
  investimentos_recentes: Array<{
    id: string;
    data: string;
    titulo: string;
    valor: number;
    categoria: string;
    status: 'CONCLUIDO' | 'EM_ANDAMENTO' | 'PLANEJADO';
  }>;
}

// DADOS INICIAIS DE CONTAS A RECEBER (espelhado dos pedidos faturados)
export const TITULOS_RECEBER_INICIAIS: TituloReceber[] = [];


// DADOS INICIAIS DE CONTAS A PAGAR
export const TITULOS_PAGAR_INICIAIS: TituloPagar[] = [];


// DADOS DE DESPESAS OPERACIONAIS
export const DESPESAS_OPERACIONAIS_INICIAIS: DespesaOperacional[] = [];


// DADOS DE NOTAS FISCAIS DE SAÍDA (NF-e)
export const NOTAS_SAIDA_INICIAIS: NotaFiscalSaida[] = [];


// DADOS DE NOTAS FISCAIS DE ENTRADA (NFe-E)
export const NOTAS_ENTRADA_INICIAIS: NotaFiscalEntrada[] = [];


// RECEITAS EXTRAS / SUBPRODUTOS
export const RECEITAS_EXTRAS_INICIAIS: LancamentoReceita[] = [];


// CAIXA DE INVESTIMENTO E RESERVA DE SAFRA
export const CAIXA_INVESTIMENTO_INICIAL: CaixaInvestimento = {
  saldo_disponivel_industrial: 0,
  fundo_reserva_safra: 0,
  fundo_modernizacao_maquinario: 0,
  rendimento_mensal_estimado: 0,
  investimentos_recentes: []
};

// STORAGE HELPERS
const STORAGE_KEY_RECEBER = 'grupo_eno_financeiro_receber_v1';
const STORAGE_KEY_PAGAR = 'grupo_eno_financeiro_pagar_v1';
const STORAGE_KEY_DESPESAS = 'grupo_eno_financeiro_despesas_v1';
const STORAGE_KEY_RECEITAS_EXTRAS = 'grupo_eno_financeiro_receitas_v1';

function verificarModoLimpo(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
}

/** Próximo número sequencial de título (ex.: PAG-0007), sem sorteio. */
export function proximoNumeroTitulo(prefixo: 'PAG' | 'DUP', titulos: { numero_documento?: string }[]): string {
  const usados = titulos
    .map(t => (t.numero_documento || '').match(new RegExp(`^${prefixo}-(\d+)$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => parseInt(m[1], 10));
  const proximo = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefixo}-${String(proximo).padStart(4, '0')}`;
}

export function carregarTitulosReceber(): TituloReceber[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : TITULOS_RECEBER_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEBER);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_RECEBER, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_RECEBER, JSON.stringify(TITULOS_RECEBER_INICIAIS));
      return TITULOS_RECEBER_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarTitulosReceber(dados: TituloReceber[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_RECEBER, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}

export function carregarTitulosPagar(): TituloPagar[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : TITULOS_PAGAR_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAGAR);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_PAGAR, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_PAGAR, JSON.stringify(TITULOS_PAGAR_INICIAIS));
      return TITULOS_PAGAR_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarTitulosPagar(dados: TituloPagar[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PAGAR, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}

export function carregarDespesas(): DespesaOperacional[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : DESPESAS_OPERACIONAIS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DESPESAS);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_DESPESAS, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_DESPESAS, JSON.stringify(DESPESAS_OPERACIONAIS_INICIAIS));
      return DESPESAS_OPERACIONAIS_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarDespesas(dados: DespesaOperacional[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_DESPESAS, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}

export function carregarReceitasExtras(): LancamentoReceita[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : RECEITAS_EXTRAS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEITAS_EXTRAS);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_RECEITAS_EXTRAS, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_RECEITAS_EXTRAS, JSON.stringify(RECEITAS_EXTRAS_INICIAIS));
      return RECEITAS_EXTRAS_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarReceitasExtras(dados: LancamentoReceita[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_RECEITAS_EXTRAS, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}

const STORAGE_KEY_NOTAS_SAIDA = 'grupo_eno_financeiro_notas_saida_v1';
const STORAGE_KEY_NOTAS_ENTRADA = 'grupo_eno_financeiro_notas_entrada_v1';
const STORAGE_KEY_CAIXA_INVEST = 'grupo_eno_financeiro_caixa_invest_v1';

export function carregarNotasSaida(): NotaFiscalSaida[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : NOTAS_SAIDA_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTAS_SAIDA);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_NOTAS_SAIDA, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_NOTAS_SAIDA, JSON.stringify(NOTAS_SAIDA_INICIAIS));
      return NOTAS_SAIDA_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarNotasSaida(dados: NotaFiscalSaida[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_NOTAS_SAIDA, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}

export function carregarNotasEntrada(): NotaFiscalEntrada[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : NOTAS_ENTRADA_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTAS_ENTRADA);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_NOTAS_ENTRADA, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_NOTAS_ENTRADA, JSON.stringify(NOTAS_ENTRADA_INICIAIS));
      return NOTAS_ENTRADA_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarNotasEntrada(dados: NotaFiscalEntrada[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_NOTAS_ENTRADA, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}

function caixaZerado(): CaixaInvestimento {
  return {
    saldo_disponivel_industrial: 0,
    fundo_reserva_safra: 0,
    fundo_modernizacao_maquinario: 0,
    rendimento_mensal_estimado: 0,
    investimentos_recentes: []
  };
}

// Valida o formato gravado; qualquer coisa fora do formato (ex.: [] gravado por reset antigo) vira caixa zerado
function normalizarCaixa(dados: unknown): CaixaInvestimento {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return caixaZerado();
  const d = dados as Partial<CaixaInvestimento>;
  return {
    saldo_disponivel_industrial: numeroSeguro(d.saldo_disponivel_industrial),
    fundo_reserva_safra: numeroSeguro(d.fundo_reserva_safra),
    fundo_modernizacao_maquinario: numeroSeguro(d.fundo_modernizacao_maquinario),
    rendimento_mensal_estimado: numeroSeguro(d.rendimento_mensal_estimado),
    investimentos_recentes: Array.isArray(d.investimentos_recentes)
      ? d.investimentos_recentes.filter(i => i && typeof i === 'object').map(i => ({ ...i, valor: numeroSeguro(i.valor) }))
      : []
  };
}

export function carregarCaixaInvestimento(): CaixaInvestimento {
  if (typeof window === 'undefined') return caixaZerado();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAIXA_INVEST);
    if (raw === null) {
      const vazio = caixaZerado();
      localStorage.setItem(STORAGE_KEY_CAIXA_INVEST, JSON.stringify(vazio));
      return vazio;
    }
    return normalizarCaixa(JSON.parse(raw));
  } catch (e) {
    return caixaZerado();
  }
}

export function salvarCaixaInvestimento(dados: CaixaInvestimento): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CAIXA_INVEST, JSON.stringify(dados));
  window.dispatchEvent(new Event('financeiro_updated'));
}


// ============================================================
// BAIXAS NO CAIXA (cada título/despesa movimenta o saldo uma única vez)
// ============================================================
const STORAGE_KEY_CAIXA_BAIXAS = 'grupo_eno_financeiro_caixa_baixas_v1';

function carregarBaixasCaixa(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAIXA_BAIXAS);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch (e) {
    return {};
  }
}

// ============================================================
// EXTRATO DO CAIXA (cada movimentação do saldo gera um movimento legível)
// ============================================================
const STORAGE_KEY_CAIXA_MOVIMENTOS = 'grupo_eno_financeiro_caixa_movimentos_v1';

export type FundoCaixa = 'saldo_disponivel_industrial' | 'fundo_reserva_safra' | 'fundo_modernizacao_maquinario';

export const ROTULO_FUNDO_CAIXA: Record<FundoCaixa, string> = {
  saldo_disponivel_industrial: 'Caixa Industrial',
  fundo_reserva_safra: 'Reserva de Safra',
  fundo_modernizacao_maquinario: 'Modernização / CAPEX'
};

export type OrigemMovimentoCaixa =
  | 'Despesa'
  | 'Conta a pagar'
  | 'Conta a receber'
  | 'Receita'
  | 'Investimento'
  | 'Transferência'
  | 'Saldo inicial'
  | 'Ajuste';

export const ORIGENS_MOVIMENTO_CAIXA: OrigemMovimentoCaixa[] = [
  'Despesa', 'Conta a pagar', 'Conta a receber', 'Receita', 'Investimento', 'Transferência', 'Saldo inicial', 'Ajuste'
];

export interface MovimentoCaixa {
  id: string;
  data: string; // AAAA-MM-DD
  tipo: 'ENTRADA' | 'SAIDA';
  origem: OrigemMovimentoCaixa;
  descricao: string;
  valor: number; // sempre positivo
  saldo_apos: number; // saldo do fundo após o movimento
  chave: string;
  fundo: FundoCaixa;
  estorno?: boolean;
  registrado_em: string;
}

export interface InfoMovimentoCaixa {
  descricao?: string;
  origem?: OrigemMovimentoCaixa | string;
  data?: string;
  fundo?: FundoCaixa;
}

const FUNDOS_CAIXA: FundoCaixa[] = ['saldo_disponivel_industrial', 'fundo_reserva_safra', 'fundo_modernizacao_maquinario'];

function origemPelaChave(chave: string): OrigemMovimentoCaixa {
  if (chave.startsWith('despesa:desp_inv_')) return 'Investimento';
  if (chave.startsWith('despesa:')) return 'Despesa';
  if (chave.startsWith('pagar:')) return 'Conta a pagar';
  if (chave.startsWith('receber:')) return 'Conta a receber';
  if (chave.startsWith('receita:')) return 'Receita';
  if (chave.startsWith('transf:')) return 'Transferência';
  if (chave.startsWith('inicial:')) return 'Saldo inicial';
  return 'Ajuste';
}

function normalizarOrigem(origem: string | undefined, chave: string): OrigemMovimentoCaixa {
  return ORIGENS_MOVIMENTO_CAIXA.includes(origem as OrigemMovimentoCaixa) ? (origem as OrigemMovimentoCaixa) : origemPelaChave(chave);
}

// Sem descrição informada: busca o lançamento pela chave (ex.: despesa do sítio, comissão paga)
function descricaoPelaChave(chave: string): string {
  try {
    const [prefixo, ...resto] = chave.split(':');
    const id = resto.join(':');
    if (prefixo === 'despesa') {
      const d = carregarDespesas().find(x => x.id === id);
      if (d) return `${d.descricao}${d.categoria ? ` (${d.categoria})` : ''}`;
    } else if (prefixo === 'pagar') {
      const t = carregarTitulosPagar().find(x => x.id === id);
      if (t) return `Pagamento ${t.numero_documento} - ${t.favorecido_nome}${t.categoria ? ` (${t.categoria})` : ''}`;
    } else if (prefixo === 'receber') {
      const t = carregarTitulosReceber().find(x => x.id === id);
      if (t) return `Recebimento ${t.numero_documento} - ${t.cliente_nome}`;
    } else if (prefixo === 'receita') {
      const r = carregarReceitasExtras().find(x => x.id === id);
      if (r) return r.descricao;
    }
  } catch (e) {
    // sem descrição: usa a origem
  }
  return '';
}

export function carregarMovimentosCaixa(): MovimentoCaixa[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAIXA_MOVIMENTOS);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

let seqMovimento = 0;
function gravarMovimentoCaixa(mov: Omit<MovimentoCaixa, 'id' | 'registrado_em'>): void {
  const lista = carregarMovimentosCaixa();
  seqMovimento += 1;
  lista.push({ ...mov, id: `mov_${Date.now()}_${seqMovimento}`, registrado_em: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY_CAIXA_MOVIMENTOS, JSON.stringify(lista));
}

/**
 * Movimenta o saldo do caixa (positivo = entrada, negativo = saída) e grava o movimento no extrato.
 * `chave` identifica o lançamento (ex.: 'pagar:<id>', 'receber:<id>', 'despesa:<id>');
 * se a chave já foi aplicada, nada acontece. Retorna true se movimentou.
 * `info` (opcional): descrição legível, origem, data (DD/MM/AAAA ou AAAA-MM-DD) e fundo (padrão: caixa industrial).
 */
// ============================================================
// TRAVA DE SALDO: pagamento só sai se o caixa tiver saldo para cobrir
// ============================================================

/** Valor já debitado no caixa pelas chaves informadas (ex.: pagamento anterior que será refeito). */
export function valorJaDebitadoNoCaixa(chaves: string[]): number {
  const baixas = carregarBaixasCaixa();
  return chaves.reduce((acc, k) => acc + Math.max(0, -numeroSeguro(baixas[k])), 0);
}

/**
 * Confere se o fundo tem saldo para pagar `valor`. `devolvido` é o que volta ao caixa antes do
 * pagamento (ex.: estorno de um pagamento anterior do mesmo lançamento). Retorna mensagem se faltar.
 */
export function conferirSaldoParaPagar(valor: number, devolvido = 0, fundo: FundoCaixa = 'saldo_disponivel_industrial'): string | null {
  const v = numeroSeguro(valor);
  if (v <= 0) return null;
  const saldo = numeroSeguro(carregarCaixaInvestimento()[fundo]) + numeroSeguro(devolvido);
  if (v <= saldo + 0.005) return null;
  return `Saldo insuficiente no caixa (${ROTULO_FUNDO_CAIXA[fundo]}): disponível ${formatarMoeda(saldo)}, pagamento ${formatarMoeda(v)}. ` +
    'Lance o saldo inicial ou um aporte em Financeiro → Caixa & Investimento, ou registre como "a pagar".';
}

export function registrarBaixaNoCaixa(chave: string, delta: number, info?: InfoMovimentoCaixa): boolean {
  if (typeof window === 'undefined') return false;
  const valor = numeroSeguro(delta);
  if (!chave || valor === 0) return false;
  const baixas = carregarBaixasCaixa();
  if (Object.prototype.hasOwnProperty.call(baixas, chave)) return false;
  const fundo: FundoCaixa = info?.fundo && FUNDOS_CAIXA.includes(info.fundo) ? info.fundo : 'saldo_disponivel_industrial';
  const caixa = carregarCaixaInvestimento();
  caixa[fundo] = numeroSeguro(numeroSeguro(caixa[fundo]) + valor);
  baixas[chave] = valor;
  localStorage.setItem(STORAGE_KEY_CAIXA_BAIXAS, JSON.stringify(baixas));
  const origem = normalizarOrigem(info?.origem, chave);
  gravarMovimentoCaixa({
    data: paraISO(info?.data) || hojeISO(),
    tipo: valor > 0 ? 'ENTRADA' : 'SAIDA',
    origem,
    descricao: (info?.descricao || '').trim() || descricaoPelaChave(chave) || origem,
    valor: Math.abs(valor),
    saldo_apos: caixa[fundo],
    chave,
    fundo
  });
  salvarCaixaInvestimento(caixa);
  return true;
}

/** Desfaz a movimentação de uma chave (ex.: lançamento pago excluído) e grava o estorno no extrato. Retorna true se estornou. */
export function estornarBaixaNoCaixa(chave: string, info?: { descricao?: string; data?: string }): boolean {
  if (typeof window === 'undefined') return false;
  const baixas = carregarBaixasCaixa();
  if (!Object.prototype.hasOwnProperty.call(baixas, chave)) return false;
  const original = [...carregarMovimentosCaixa()].reverse().find(m => m.chave === chave && !m.estorno);
  const fundo: FundoCaixa = original?.fundo || 'saldo_disponivel_industrial';
  const valor = numeroSeguro(baixas[chave]);
  const caixa = carregarCaixaInvestimento();
  caixa[fundo] = numeroSeguro(numeroSeguro(caixa[fundo]) - valor);
  delete baixas[chave];
  localStorage.setItem(STORAGE_KEY_CAIXA_BAIXAS, JSON.stringify(baixas));
  gravarMovimentoCaixa({
    data: paraISO(info?.data) || hojeISO(),
    tipo: valor > 0 ? 'SAIDA' : 'ENTRADA',
    origem: original?.origem || origemPelaChave(chave),
    descricao: info?.descricao || `Estorno de ${original?.descricao || chave}`,
    valor: Math.abs(valor),
    saldo_apos: caixa[fundo],
    chave,
    fundo,
    estorno: true
  });
  salvarCaixaInvestimento(caixa);
  return true;
}

/** Transferência entre fundos: dois movimentos (saída da origem e entrada no destino). */
export function transferirEntreFundosCaixa(origem: FundoCaixa, destino: FundoCaixa, valor: number, data?: string): boolean {
  const v = numeroSeguro(valor);
  if (typeof window === 'undefined' || v <= 0 || origem === destino) return false;
  const chave = `transf:${Date.now()}`;
  const desc = `Transferência ${ROTULO_FUNDO_CAIXA[origem]} → ${ROTULO_FUNDO_CAIXA[destino]}`;
  registrarBaixaNoCaixa(`${chave}:saida`, -v, { origem: 'Transferência', descricao: desc, data, fundo: origem });
  registrarBaixaNoCaixa(`${chave}:entrada`, v, { origem: 'Transferência', descricao: desc, data, fundo: destino });
  return true;
}

// ============================================================
// HELPERS DE EXIBIÇÃO (status vencido, mês corrente, moeda)
// ============================================================

// Converte qualquer valor em número finito (NaN/undefined/string inválida viram 0)
export function numeroSeguro(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function formatarMoeda(valor: unknown): string {
  return numeroSeguro(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Soma protegida contra NaN/undefined. Uso: somarValores(lista, item => item.valor)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function somarValores(lista: readonly any[] | null | undefined, seletor: (item: any) => unknown): number {
  if (!Array.isArray(lista)) return 0;
  return lista.reduce((acc: number, item) => acc + numeroSeguro(seletor(item)), 0);
}

// true se a data (qualquer formato aceito) cai no mês corrente
export function dataNoMesAtual(valor?: string | null): boolean {
  const d = parseData(valor);
  return !!d && mesAtualKey(d) === mesAtualKey();
}

// true se a data é anterior a hoje (vencimento passado)
export function dataVencida(valor?: string | null): boolean {
  const d = parseData(valor);
  const hoje = parseData(hojeISO());
  return !!d && !!hoje && d.getTime() < hoje.getTime();
}

// Status calculado na exibição: título não pago com vencimento passado aparece como VENCIDO
export function statusEfetivoPagar(t: TituloPagar): TituloPagar['status'] {
  if (t.status === 'PAGO') return 'PAGO';
  if (dataVencida(t.data_vencimento)) return 'VENCIDO';
  return t.status === 'VENCIDO' && !parseData(t.data_vencimento) ? 'VENCIDO' : 'A_PAGAR';
}

export function statusEfetivoReceber(t: TituloReceber): TituloReceber['status'] {
  if (t.status === 'PAGO') return 'PAGO';
  if (dataVencida(t.data_vencimento)) return 'VENCIDO';
  return t.status === 'VENCIDO' && !parseData(t.data_vencimento) ? 'VENCIDO' : 'EM_ABERTO';
}

// Lançamento de despesa PROGRAMADA (pedido de compra ainda não efetivado, ids 'desp_prog_*').
// Nunca deve contar como despesa realizada/paga nem aparecer como quitada.
export function ehDespesaProgramada(d: DespesaOperacional): boolean {
  const extra = d as DespesaOperacional & { tipo_despesa?: string };
  return String(d?.id || '').startsWith('desp_prog_') || extra?.tipo_despesa === 'PROGRAMADA';
}
