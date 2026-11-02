// Módulo de Dados de Produtos, Formulações, Custos e Estoques do Grupo ENO

import { hojeISO } from '../lib/datas';

export interface ItemMateriaPrimaReceita {
  materia_prima_id: string;
  materia_prima_nome: string;
  quantidade: number; // Quanto usa nesta matéria-prima
  unidade_medida: string; // 'KG' | 'TON' | 'UN' | 'LITRO' | 'ESTÉREO (m³)'
  custo_unitario?: number;
  custo_total?: number;
}

export interface ReceitaIndustrial {
  id: string;
  codigo: string;
  nome: string; // Nome da receita (ex: "Mandioca Gourmet")
  produto_id?: string; // Produto acabado vinculado (gravado também em ProdutoEstoque.receita_id)
  produto_nome?: string;
  tipo_embalagem?: 'Saco 25kg' | 'Big Bag 1000kg' | 'Fardo 10x1kg' | 'Pacote 1kg' | 'Caixa' | 'Granel' | string;
  rendimento_pacotes: number; // Quantos pacotes rende a receita
  peso_por_pacote_kg?: number; // Peso líquido de cada pacote (ex: 1kg ou 25kg)
  rendimento_total_kg?: number; // Total produzido em kg
  materias_primas: ItemMateriaPrimaReceita[]; // Matérias-primas e quantidades selecionadas
  custo_total_materias_primas?: number;
  custo_por_pacote?: number;
  tempo_processamento_horas?: number;
  observacoes_tecnicas?: string;
  data_criacao?: string;
  // Parâmetros técnicos complementares
  rendimento_amido_percentual?: number;
  kg_mandioca_por_kg_produto?: number;
  agua_m3_por_ton?: number;
  perda_destopo_casca_percentual?: number;
  bagaço_umido_gerado_kg?: number;
  aditivos_permitidos?: string;
}

export interface ImpostoProduto {
  id: string;
  nome: string;
  base: 'Custo' | 'Venda' | 'Fixo';
  tipo: 'Porcentagem' | 'Valor';
  valor: number;
}

export interface ProdutoEstoque {
  id: string;
  codigo: string;
  nome: string;
  categoria: 'Féculas Nativas' | 'Féculas Especiais' | 'Polvilhos' | 'Tapiocas' | 'Farinhas' | 'Mandioca Gourmet' | string;
  tipo_embalagem: 'Saco 25kg' | 'Big Bag 1000kg' | 'Fardo 10x1kg' | 'Pacote 1kg' | 'Caixa' | string;
  peso_unitario_kg: number;
  estoque_atual_sacos: number;
  estoque_atual_kg: number;
  estoque_minimo_kg: number;
  localizacao_galpao: string;
  preco_unitario_venda: number;
  lote_recente: string;
  status: 'EM_ESTOQUE' | 'ESTOQUE_BAIXO' | 'CRITICO';
  // Vínculo com a Receita e Custos:
  receita_id?: string;
  receita_nome?: string;
  custo_materia_prima?: number; // Custo dos insumos vindo direto da receita
  impostos?: ImpostoProduto[]; // Nova lista de impostos dinâmicos
  impostos_percentual?: number; // % Impostos (total consolidado para legado)
  impostos_valor?: number; // R$ Impostos (total consolidado)
  custo_operacional?: number; // Outros custos operacionais (mão de obra, energia)
  custo_total?: number; // Custo Total = Insumos + Impostos + Operacional
  tipo_acondicionamento?: 'Fardo' | 'Caixa' | 'Saco' | 'Avulso' | string; // se é Fardo ou Caixa
  unidades_por_acondicionamento?: number; // quantos que vai (ex: 10 ou 12)
  preco_venda_acondicionamento?: number; // Preço do fardo ou caixa fechada
  margem_lucro_percentual?: number; // Margem bruta (%)
}

export interface MateriaPrimaEstoque {
  id: string;
  codigo: string;
  nome: string;
  categoria: 'Raiz In Natura' | 'Ingredientes' | 'Biomassa / Lenha' | 'Embalagens' | 'Insumos Industriais';
  unidade_medida: 'KG' | 'G' | 'TON' | 'ESTÉREO (m³)' | 'UN' | 'LITRO' | 'ML';
  estoque_atual: number;
  estoque_minimo: number;
  custo_medio_unitario: number;
  fornecedor_principal: string;
  localizacao_patio: string;
  status: 'NORMAL' | 'REPOSICAO_NECESSARIA' | 'CRITICO';
}

export interface ItemFichaTecnica {
  id?: string;
  item_nome: string; // O que o usuário quer colocar (livre)
  quantidade: string; // A quantidade que o usuário quer colocar (livre)
  origem?: 'RECEITA' | 'LIVRE'; // RECEITA = gerado da composição da receita do produto
  materia_prima_id?: string;
}

export interface FichaTecnica {
  id: string;
  produto_id?: string;
  produto_nome: string;
  codigo?: string;
  receita_id?: string; // Receita usada para preencher os itens de composição
  receita_assinatura?: string; // Assinatura da composição no momento da importação (detecta mudança na receita)
  descricao_padrao?: string;
  itens_especificacao?: ItemFichaTecnica[]; // Lista dinâmica onde o usuário coloca o que quer e a quantidade
  umidade_maxima_percentual?: number;
  acidez_maxima_cm3?: number;
  ph_faixa?: string;
  cinzas_maximas_percentual?: number;
  aspecto_cor?: string;
  viscosidade_brookfield_cp?: number;
  prazo_validade_meses?: number;
  armazenamento?: string;
  aplicacoes_industriais?: string;
  registro_sif_mapa?: string;
}

export interface TabelaPreco {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'Atacado / Distribuidor' | 'Grandes Indústrias (Carga Fechada)' | 'Varejo / Padarias' | 'Pagamento à Vista (FOB)';
  /** Como a tabela forma o preço (regra em src/data/precosData.ts → calcularPrecoNaTabela) */
  modo_preco?: 'ACRESCIMO_DESCONTO' | 'MARGEM_CUSTO' | 'PRECO_FIXO';
  /** ACRESCIMO_DESCONTO: % sobre o preço base (positivo = acréscimo, negativo = desconto) */
  ajuste_percentual?: number;
  /** MARGEM_CUSTO: % de margem aplicada sobre o custo atual do produto */
  margem_percentual?: number;
  /** PRECO_FIXO: preço do pacote digitado por produto (produto_id → preço) */
  precos_fixos?: Record<string, number>;
  /** Exceção por produto em qualquer modo (produto_id → preço do pacote) */
  excecoes_preco?: Record<string, number>;
  /** Legado: tabelas antigas (migradas para ACRESCIMO_DESCONTO com −desconto) */
  desconto_padrao_percentual?: number;
  prazo_padrao: string;
  frete_tipo: 'FOB (Retira Fábrica)' | 'CIF (Entrega Grupo ENO)';
  vigencia_inicio: string;
  vigencia_fim: string;
  status: 'VIGENTE' | 'PROGRAMADA' | 'ARQUIVADA';
  produtos_ids?: string[];
}

// ============================================================
// UNIDADES DE MEDIDA (normalização e conversão)
// ============================================================

export type UnidadeNormalizada = 'KG' | 'G' | 'TON' | 'UN' | 'LITRO' | 'ML' | 'M3' | string;

// Normaliza variações de escrita ('Toneladas', 'TON', 't', 'Kg', 'Litros', 'Sacos'...) para um código único
export function normalizarUnidade(unidade?: string | null): UnidadeNormalizada {
  const s = String(unidade || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
  if (!s) return '';
  if (['KG', 'KGS', 'QUILO', 'QUILOS', 'KILO', 'KILOS', 'QUILOGRAMA', 'QUILOGRAMAS'].includes(s)) return 'KG';
  if (['G', 'GR', 'GRS', 'GRAMA', 'GRAMAS'].includes(s)) return 'G';
  if (['TON', 'TONS', 'T', 'TONELADA', 'TONELADAS'].includes(s)) return 'TON';
  if (['L', 'LT', 'LTS', 'LITRO', 'LITROS'].includes(s)) return 'LITRO';
  if (['ML', 'MILILITRO', 'MILILITROS'].includes(s)) return 'ML';
  if (s.startsWith('ESTEREO') || s === 'M3' || s === 'M³') return 'M3';
  if ([
    'UN', 'UND', 'UNID', 'UNIDADE', 'UNIDADES', 'PC', 'PCS', 'PECA', 'PECAS',
    'SACO', 'SACOS', 'PACOTE', 'PACOTES', 'CAIXA', 'CAIXAS', 'FARDO', 'FARDOS'
  ].includes(s)) return 'UN';
  return s;
}

// Converte quantidade entre unidades. Retorna null quando as unidades não são compatíveis (ex.: UN -> TON).
export function converterQuantidade(quantidade: number, de?: string | null, para?: string | null): number | null {
  const a = normalizarUnidade(de);
  const b = normalizarUnidade(para);
  if (!a || !b || a === b) return quantidade;
  // Massa (em gramas) e volume (em mililitros) convertem entre si dentro do mesmo grupo
  const massa: Record<string, number> = { G: 1, KG: 1000, TON: 1000000 };
  const volume: Record<string, number> = { ML: 1, LITRO: 1000 };
  if (massa[a] && massa[b]) return (quantidade * massa[a]) / massa[b];
  if (volume[a] && volume[b]) return (quantidade * volume[a]) / volume[b];
  return null;
}

// ============================================================
// STATUS DE ESTOQUE (regra única para todo o sistema)
// CRÍTICO: zerado ou até 50% do mínimo | BAIXO: abaixo do mínimo | NORMAL: no mínimo ou acima
// ============================================================

function nivelEstoque(atual: number, minimo: number): 'CRITICO' | 'BAIXO' | 'NORMAL' {
  const a = Number(atual) || 0;
  const m = Number(minimo) || 0;
  if (a <= 0 || (m > 0 && a <= m * 0.5)) return 'CRITICO';
  if (a < m) return 'BAIXO';
  return 'NORMAL';
}

export function calcularStatusProduto(estoqueKg: number, minimoKg: number): ProdutoEstoque['status'] {
  const n = nivelEstoque(estoqueKg, minimoKg);
  return n === 'CRITICO' ? 'CRITICO' : n === 'BAIXO' ? 'ESTOQUE_BAIXO' : 'EM_ESTOQUE';
}

export function calcularStatusMateriaPrima(estoque: number, minimo: number): MateriaPrimaEstoque['status'] {
  const n = nivelEstoque(estoque, minimo);
  return n === 'CRITICO' ? 'CRITICO' : n === 'BAIXO' ? 'REPOSICAO_NECESSARIA' : 'NORMAL';
}

// ============================================================
// CUSTOS SEMPRE ATUALIZADOS (receita <- matéria-prima, produto <- receita)
// ============================================================

const arred = (v: number, casas = 4) => {
  const f = Math.pow(10, casas);
  return Math.round((Number(v) || 0) * f) / f;
};

// Recalcula o custo de uma receita a partir do custo médio ATUAL de cada matéria-prima
export function recalcularCustoReceita(receita: ReceitaIndustrial, materias: MateriaPrimaEstoque[]): ReceitaIndustrial {
  const itens = (receita.materias_primas || []).map(item => {
    const mp = materias.find(m => m.id === item.materia_prima_id);
    if (!mp) return item;
    const fator = converterQuantidade(1, item.unidade_medida, mp.unidade_medida) ?? 1;
    const custoUnit = (Number(mp.custo_medio_unitario) || 0) * fator;
    return {
      ...item,
      materia_prima_nome: mp.nome || item.materia_prima_nome,
      custo_unitario: arred(custoUnit),
      custo_total: arred((Number(item.quantidade) || 0) * custoUnit)
    };
  });
  const total = itens.reduce((acc, it) => acc + (Number(it.custo_total) || 0), 0);
  const rendimento = Number(receita.rendimento_pacotes) || 0;
  return {
    ...receita,
    materias_primas: itens,
    custo_total_materias_primas: arred(total, 2),
    custo_por_pacote: rendimento > 0 ? arred(total / rendimento) : 0
  };
}

// Soma dos impostos de um produto (mesma regra do cadastro de produtos)
export function calcularImpostosProduto(impostos: ImpostoProduto[] | undefined, precoUnitario: number, baseCusto: number): number {
  return (impostos || []).reduce((acc, imp) => {
    if (imp.tipo === 'Porcentagem') {
      const base = imp.base === 'Venda' ? precoUnitario : imp.base === 'Custo' ? baseCusto : 0;
      return acc + (base * (Number(imp.valor) || 0)) / 100;
    }
    return acc + (Number(imp.valor) || 0);
  }, 0);
}

// Recalcula custo/margem do produto a partir da receita atual. Receita excluída não deixa vínculo órfão.
export function recalcularCustoProduto(
  produto: ProdutoEstoque,
  receitas: ReceitaIndustrial[],
  materias: MateriaPrimaEstoque[]
): ProdutoEstoque {
  if (!produto.receita_id) return produto;
  const rec = receitas.find(r => r.id === produto.receita_id);
  if (!rec) {
    // Receita foi excluída: remove o vínculo e mantém o último custo conhecido
    return { ...produto, receita_id: undefined, receita_nome: undefined };
  }
  const recAtual = recalcularCustoReceita(rec, materias);
  const custoMp = arred(recAtual.custo_por_pacote || 0, 2);
  const custoOp = Number(produto.custo_operacional) || 0;
  const preco = Number(produto.preco_unitario_venda) || 0;
  const impostosValor = produto.impostos && produto.impostos.length > 0
    ? calcularImpostosProduto(produto.impostos, preco, custoMp + custoOp)
    : (Number(produto.impostos_valor) || 0);
  const custoTotal = custoMp + custoOp + impostosValor;
  return {
    ...produto,
    receita_nome: rec.nome || rec.produto_nome || produto.receita_nome,
    custo_materia_prima: custoMp,
    impostos_valor: arred(impostosValor, 2),
    custo_total: arred(custoTotal, 2),
    margem_lucro_percentual: preco > 0 ? arred(((preco - custoTotal) / preco) * 100, 1) : 0
  };
}

// ============================================================
// AMARRAÇÃO PRODUTO <-> RECEITA <-> MATÉRIA-PRIMA
// ============================================================

export interface ConsumoPorPacote {
  materia_prima_id: string;
  materia_prima_nome: string;
  unidade_medida: string;
  quantidade_receita: number; // quantidade na batelada da receita
  quantidade_por_pacote: number; // quantidade por pacote produzido
}

// Quanto cada matéria-prima da receita consome por pacote (receita ÷ rendimento)
export function consumoPorPacoteDaReceita(receita?: ReceitaIndustrial | null): ConsumoPorPacote[] {
  if (!receita) return [];
  const rend = Number(receita.rendimento_pacotes) || 0;
  return (receita.materias_primas || []).map(mi => ({
    materia_prima_id: mi.materia_prima_id,
    materia_prima_nome: mi.materia_prima_nome,
    unidade_medida: mi.unidade_medida,
    quantidade_receita: Number(mi.quantidade) || 0,
    quantidade_por_pacote: rend > 0 ? arred((Number(mi.quantidade) || 0) / rend, 6) : 0
  }));
}

// Assinatura simples da composição da receita (para saber se a ficha técnica ficou desatualizada)
export function assinaturaComposicaoReceita(receita?: ReceitaIndustrial | null): string {
  if (!receita) return '';
  return [
    receita.rendimento_pacotes || 0,
    ...(receita.materias_primas || []).map(m => `${m.materia_prima_id}:${Number(m.quantidade) || 0}:${m.unidade_medida}`)
  ].join('|');
}

// Grava o vínculo produto -> receita também do lado da receita (produto_id/produto_nome).
// Remove o produto_id da receita anterior quando o produto troca de receita.
export function vincularReceitaAoProduto(produtoId: string, produtoNome: string, receitaId?: string): void {
  const brutas = lerReceitasBruto();
  let alterou = false;
  const atualizadas = brutas.map(r => {
    if (receitaId && r.id === receitaId) {
      if (r.produto_id !== produtoId || r.produto_nome !== produtoNome) {
        alterou = true;
        return { ...r, produto_id: produtoId, produto_nome: produtoNome };
      }
      return r;
    }
    if (r.produto_id === produtoId) {
      alterou = true;
      return { ...r, produto_id: undefined };
    }
    return r;
  });
  if (alterou) salvarReceitas(atualizadas);
}

// Disponibilidade de produto acabado em PACOTES (estoque_atual_sacos conta pacotes)
export function verificarDisponibilidadeProduto(produtoId: string, pacotes: number): { disponivel: number; falta: number } {
  const prod = lerEstoqueProdutosBruto().find(p => p.id === produtoId);
  const disponivel = Math.max(0, Number(prod?.estoque_atual_sacos) || 0);
  const necessario = Math.max(0, Number(pacotes) || 0);
  return { disponivel, falta: Math.max(0, parseFloat((necessario - disponivel).toFixed(3))) };
}

// DADOS INICIAIS DE RECEITAS INDUSTRIAIS
export const RECEITAS_INICIAIS: ReceitaIndustrial[] = [];


// ESTOQUE DE PRODUTOS ACABADOS
export const ESTOQUE_PRODUTOS_INICIAIS: ProdutoEstoque[] = [];


// ESTOQUE DE MATÉRIAS-PRIMAS E INSUMOS
export const MATERIAS_PRIMAS_INICIAIS: MateriaPrimaEstoque[] = [];


// FICHAS TÉCNICAS INDUSTRIAIS
export const FICHAS_TECNICAS_INICIAIS: FichaTecnica[] = [];


// TABELAS DE PREÇO
export const TABELAS_PRECO_INICIAIS: TabelaPreco[] = [];


// STORAGE HELPERS
const STORAGE_KEY_PRODUTOS_ESTOQUE = 'grupo_eno_produtos_estoque_v1';
const STORAGE_KEY_MATERIA_PRIMA = 'grupo_eno_materia_prima_v1';
const STORAGE_KEY_RECEITAS = 'grupo_eno_receitas_v1';

function verificarModoLimpo(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
}

// Lê os produtos já com custo/margem recalculados a partir da receita e da matéria-prima atuais
export function carregarEstoqueProdutos(): ProdutoEstoque[] {
  const lista = lerEstoqueProdutosBruto();
  if (lista.length === 0) return lista;
  const receitas = carregarReceitas();
  const materias = carregarMateriaPrima();
  return lista.map(p => recalcularCustoProduto(p, receitas, materias));
}

function lerEstoqueProdutosBruto(): ProdutoEstoque[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : ESTOQUE_PRODUTOS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUTOS_ESTOQUE);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_PRODUTOS_ESTOQUE, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_PRODUTOS_ESTOQUE, JSON.stringify(ESTOQUE_PRODUTOS_INICIAIS));
      return ESTOQUE_PRODUTOS_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarEstoqueProdutos(dados: ProdutoEstoque[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PRODUTOS_ESTOQUE, JSON.stringify(dados));
  window.dispatchEvent(new Event('produtos_updated'));
}

export function carregarMateriaPrima(): MateriaPrimaEstoque[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : MATERIAS_PRIMAS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MATERIA_PRIMA);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_MATERIA_PRIMA, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_MATERIA_PRIMA, JSON.stringify(MATERIAS_PRIMAS_INICIAIS));
      return MATERIAS_PRIMAS_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarMateriaPrima(dados: MateriaPrimaEstoque[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MATERIA_PRIMA, JSON.stringify(dados));
  window.dispatchEvent(new Event('produtos_updated'));
}

// ============================================================
// MOVIMENTAÇÃO MANUAL DO ESTOQUE DE MATÉRIA-PRIMA (com histórico)
// ENTRADA: abastecimento/recebimento (recalcula custo médio ponderado)
// SAIDA: uso/abertura de embalagem | PERDA: avaria, vencido, descarte
// AJUSTE: contagem física (o saldo passa a ser a quantidade contada)
// ============================================================

export type TipoMovimentoMP = 'ENTRADA' | 'SAIDA' | 'PERDA' | 'AJUSTE';

export interface MovimentoMateriaPrima {
  id: string;
  materia_prima_id: string;
  materia_prima_nome: string;
  tipo: TipoMovimentoMP;
  quantidade: number; // na unidade da matéria-prima (no AJUSTE: diferença aplicada)
  unidade_medida: string;
  saldo_anterior: number;
  saldo_posterior: number;
  custo_unitario?: number;
  data: string; // AAAA-MM-DD
  registrado_em: string; // ISO completo
  observacao?: string;
}

const STORAGE_KEY_MOVIMENTOS_MP = 'grupo_eno_movimentos_mp_v1';

export function carregarMovimentosMateriaPrima(materiaPrimaId?: string): MovimentoMateriaPrima[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVIMENTOS_MP);
    const lista: MovimentoMateriaPrima[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(lista)) return [];
    return materiaPrimaId ? lista.filter(m => m.materia_prima_id === materiaPrimaId) : lista;
  } catch (e) {
    return [];
  }
}

/**
 * Registra um movimento e atualiza o saldo da matéria-prima.
 * `gravarMateria=false` só registra o histórico (usado no saldo inicial do cadastro, que já grava a MP).
 * Retorna a matéria-prima atualizada ou uma mensagem de erro.
 */
export function registrarMovimentoMateriaPrima(
  mp: MateriaPrimaEstoque,
  dados: { tipo: TipoMovimentoMP; quantidade: number; custo_unitario?: number; data?: string; observacao?: string },
  gravarMateria = true
): { materia?: MateriaPrimaEstoque; erro?: string } {
  const qtd = Number(dados.quantidade);
  if (!(qtd >= 0) || (dados.tipo !== 'AJUSTE' && !(qtd > 0))) {
    return { erro: 'Informe uma quantidade maior que zero.' };
  }
  const saldoAnterior = gravarMateria ? Number(mp.estoque_atual) || 0 : 0;
  if ((dados.tipo === 'SAIDA' || dados.tipo === 'PERDA') && qtd > saldoAnterior) {
    return { erro: `Saldo insuficiente: há ${saldoAnterior} ${mp.unidade_medida} em estoque.` };
  }

  let saldoPosterior = saldoAnterior;
  let custoMedio = Number(mp.custo_medio_unitario) || 0;
  if (dados.tipo === 'ENTRADA') {
    saldoPosterior = saldoAnterior + qtd;
    const custoEntrada = Number(dados.custo_unitario);
    if (custoEntrada > 0 && saldoPosterior > 0) {
      custoMedio = (saldoAnterior * custoMedio + qtd * custoEntrada) / saldoPosterior;
    }
  } else if (dados.tipo === 'SAIDA' || dados.tipo === 'PERDA') {
    saldoPosterior = saldoAnterior - qtd;
  } else {
    saldoPosterior = qtd; // AJUSTE: quantidade contada
  }
  saldoPosterior = parseFloat(saldoPosterior.toFixed(4));

  const atualizada: MateriaPrimaEstoque = {
    ...mp,
    estoque_atual: saldoPosterior,
    custo_medio_unitario: parseFloat(custoMedio.toFixed(6)),
    status: calcularStatusMateriaPrima(saldoPosterior, mp.estoque_minimo)
  };

  if (gravarMateria) {
    salvarMateriaPrima(carregarMateriaPrima().map(m => (m.id === mp.id ? atualizada : m)));
  }

  const movimento: MovimentoMateriaPrima = {
    id: `mov_mp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    materia_prima_id: mp.id,
    materia_prima_nome: mp.nome,
    tipo: dados.tipo,
    quantidade: dados.tipo === 'AJUSTE' ? parseFloat((saldoPosterior - saldoAnterior).toFixed(4)) : qtd,
    unidade_medida: mp.unidade_medida,
    saldo_anterior: saldoAnterior,
    saldo_posterior: saldoPosterior,
    custo_unitario: dados.tipo === 'ENTRADA' && Number(dados.custo_unitario) > 0 ? Number(dados.custo_unitario) : undefined,
    data: dados.data || hojeISO(),
    registrado_em: new Date().toISOString(),
    observacao: dados.observacao?.trim() || undefined
  };
  localStorage.setItem(STORAGE_KEY_MOVIMENTOS_MP, JSON.stringify([movimento, ...carregarMovimentosMateriaPrima()]));
  window.dispatchEvent(new Event('produtos_updated'));
  return { materia: atualizada };
}

// Lê as receitas com custos recalculados pelo custo médio atual das matérias-primas
export function carregarReceitas(): ReceitaIndustrial[] {
  const lista = lerReceitasBruto();
  if (lista.length === 0) return lista;
  const materias = carregarMateriaPrima();
  return lista.map(r => recalcularCustoReceita(r, materias));
}

function lerReceitasBruto(): ReceitaIndustrial[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : RECEITAS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEITAS);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_RECEITAS, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_RECEITAS, JSON.stringify(RECEITAS_INICIAIS));
      return RECEITAS_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarReceitas(dados: ReceitaIndustrial[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_RECEITAS, JSON.stringify(dados));
  window.dispatchEvent(new Event('receitas_updated'));
  window.dispatchEvent(new Event('produtos_updated'));
}

// STORAGE HELPERS PARA FICHAS TÉCNICAS
const STORAGE_KEY_FICHAS_TECNICAS = 'grupo_eno_fichas_tecnicas_v1';

export function carregarFichasTecnicas(): FichaTecnica[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : FICHAS_TECNICAS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FICHAS_TECNICAS);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_FICHAS_TECNICAS, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_FICHAS_TECNICAS, JSON.stringify(FICHAS_TECNICAS_INICIAIS));
      return FICHAS_TECNICAS_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarFichasTecnicas(dados: FichaTecnica[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_FICHAS_TECNICAS, JSON.stringify(dados));
  window.dispatchEvent(new Event('fichas_tecnicas_updated'));
}

// STORAGE HELPERS PARA TABELAS DE PREÇO
const STORAGE_KEY_TABELAS_PRECO = 'grupo_eno_tabelas_preco_v1';

// Migração: tabela antiga (só desconto_padrao_percentual) vira ACRESCIMO_DESCONTO com −desconto
function migrarTabelaPreco(t: TabelaPreco): TabelaPreco {
  if (!t || t.modo_preco) return t;
  const desconto = Number(t.desconto_padrao_percentual) || 0;
  return { ...t, modo_preco: 'ACRESCIMO_DESCONTO', ajuste_percentual: desconto ? -desconto : 0 };
}

export function carregarTabelasPreco(): TabelaPreco[] {
  return lerTabelasPrecoBruto().map(migrarTabelaPreco);
}

function lerTabelasPrecoBruto(): TabelaPreco[] {
  if (typeof window === 'undefined') return verificarModoLimpo() ? [] : TABELAS_PRECO_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABELAS_PRECO);
    if (raw === null) {
      if (verificarModoLimpo()) {
        localStorage.setItem(STORAGE_KEY_TABELAS_PRECO, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_TABELAS_PRECO, JSON.stringify(TABELAS_PRECO_INICIAIS));
      return TABELAS_PRECO_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarTabelasPreco(dados: TabelaPreco[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TABELAS_PRECO, JSON.stringify(dados));
  window.dispatchEvent(new Event('tabelas_preco_updated'));
}
