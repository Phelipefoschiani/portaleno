// Módulo Financeiro Consolidado do Grupo ENO Agroindustrial
// Integra Contas a Receber (Vendas Faturadas), Contas a Pagar (Compras de Mandioca / Insumos),
// Lançamento de Despesas, Notas Fiscais (Entrada/Saída), Receitas Extras e Caixa de Investimento.

import { parseData, mesAtualKey, hojeISO } from '../lib/datas';

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
  tipo_favorecido: 'Agricultor' | 'Fornecedor' | 'Operacional';
  categoria: 'Mandioca / Matéria-Prima' | 'Lenha & Biomassa' | 'Embalagens' | 'Energia / Concessionárias' | 'Manutenção Mecânica' | 'Fretes';
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

/**
 * Movimenta o saldo disponível do caixa (positivo = entrada, negativo = saída).
 * `chave` identifica o lançamento (ex.: 'pagar:<id>', 'receber:<id>', 'despesa:<id>');
 * se a chave já foi aplicada, nada acontece. Retorna true se movimentou.
 */
export function registrarBaixaNoCaixa(chave: string, delta: number): boolean {
  if (typeof window === 'undefined') return false;
  const valor = numeroSeguro(delta);
  if (!chave || valor === 0) return false;
  const baixas = carregarBaixasCaixa();
  if (Object.prototype.hasOwnProperty.call(baixas, chave)) return false;
  const caixa = carregarCaixaInvestimento();
  caixa.saldo_disponivel_industrial = numeroSeguro(caixa.saldo_disponivel_industrial + valor);
  baixas[chave] = valor;
  localStorage.setItem(STORAGE_KEY_CAIXA_BAIXAS, JSON.stringify(baixas));
  salvarCaixaInvestimento(caixa);
  return true;
}

/** Desfaz a movimentação de uma chave (ex.: lançamento pago excluído). Retorna true se estornou. */
export function estornarBaixaNoCaixa(chave: string): boolean {
  if (typeof window === 'undefined') return false;
  const baixas = carregarBaixasCaixa();
  if (!Object.prototype.hasOwnProperty.call(baixas, chave)) return false;
  const caixa = carregarCaixaInvestimento();
  caixa.saldo_disponivel_industrial = numeroSeguro(caixa.saldo_disponivel_industrial - numeroSeguro(baixas[chave]));
  delete baixas[chave];
  localStorage.setItem(STORAGE_KEY_CAIXA_BAIXAS, JSON.stringify(baixas));
  salvarCaixaInvestimento(caixa);
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
