// Dados e Lógica do Portal de Controle do Sítio
// Combustível por tipo (tanques Diesel/Gasolina + posto externo), máquinas, horas de máquina
// e outras despesas. Tudo no localStorage (prefixo 'grupo_eno_'), mesma chave da versão anterior:
// o formato antigo (tanque único + lista de despesas) é migrado na leitura sem perder registros.

import { hojeISO, mesAtualKey, parseData, paraISO } from '../lib/datas';

// ============================================================
// TIPOS
// ============================================================

export interface ItemNotaFiscal {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  total: number;
}

export interface NotaFiscalDespesa {
  numero: string; // Ex: '048.291' ('' quando não informada)
  serie: string;
  chaveAcesso: string;
  dataEmissao: string;
  emitente: string;
  cnpjEmitente: string;
  destinatario: string;
  cnpjDestinatario: string;
  formaPagamento: string;
  itens: ItemNotaFiscal[];
  observacoes?: string;
}

export type TipoCombustivel = 'DIESEL' | 'GASOLINA' | 'ETANOL';
export type TipoMaquina = 'TRATOR' | 'CAMINHONETE' | 'ROCADEIRA' | 'IMPLEMENTO' | 'OUTRO';
export type MedidorMaquina = 'HORIMETRO' | 'HODOMETRO';

/** Tipo de lançamento no livro do sítio. */
export type MovimentoSitio =
  | 'COMPRA' // entrada de combustível no tanque (gera financeiro)
  | 'ABASTECIMENTO' // saída do tanque para uma máquina (consumo, sem financeiro)
  | 'POSTO' // abasteceu direto no posto (gera financeiro, não mexe no tanque)
  | 'DESPESA'; // outras despesas (gera financeiro)

export type CategoriaDespesaSitio =
  | 'COMBUSTIVEL'
  | 'COMBUSTIVEL_FORA'
  | 'PECAS'
  | 'MANUTENCAO'
  | 'MAO_DE_OBRA'
  | 'INSUMOS'
  | 'ENERGIA'
  | 'FRETE'
  | 'ALIMENTACAO'
  | 'OUTROS';

export type SituacaoPagamento = 'PAGO' | 'A_PAGAR';

export interface DespesaSitio {
  id: string;
  data: string; // YYYY-MM-DD
  nomeDespesa: string;
  tipo: 'COMBUSTIVEL' | 'PECA' | 'MANUTENCAO' | 'LUBRIFICANTE' | 'OUTROS';
  produto: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  maquinaTrator: string; // nome da máquina (ou 'Tanque Diesel', 'Geral')
  responsavel: string; // operador / quem lançou
  notaFiscal: NotaFiscalDespesa;
  horasTrabalhadas?: number; // legado: horas informadas junto do abastecimento
  // ---- Campos da versão 4 (opcionais para conviver com registros antigos) ----
  movimento?: MovimentoSitio;
  categoria?: CategoriaDespesaSitio;
  combustivel?: TipoCombustivel;
  maquinaId?: string;
  leituraMedidor?: number; // horímetro (h) ou hodômetro (km) no momento do abastecimento
  fornecedor?: string;
  formaPagamento?: string;
  situacao?: SituacaoPagamento;
  vencimento?: string;
  observacao?: string;
}

export interface TanqueCombustivel {
  combustivel: TipoCombustivel;
  capacidadeLitros: number;
  saldoLitros: number;
}

export interface MaquinaSitio {
  id: string;
  nome: string;
  tipo: TipoMaquina;
  combustivel: TipoCombustivel;
  medidor: MedidorMaquina;
  leituraInicial: number; // horímetro ou hodômetro no cadastro
  ativo: boolean;
  criadoEm: string;
}

export interface ApontamentoHoras {
  id: string;
  data: string;
  maquinaId: string;
  horimetroInicial?: number;
  horimetroFinal?: number;
  horas: number;
  operador: string;
  atividade: string;
  talhao?: string;
  observacao?: string;
  origemLegado?: boolean; // veio das horas lançadas junto do abastecimento (versão anterior)
}

export interface ControleSitioState {
  versao?: number;
  /** Soma dos saldos dos tanques (mantido para quem já lê esse campo, ex.: consolidado geral). */
  totalLitrosDisponivel: number;
  /** Capacidade do tanque de Diesel (compatibilidade). */
  capacidadeTanqueLitros: number;
  tanques?: TanqueCombustivel[];
  maquinas?: MaquinaSitio[];
  apontamentos?: ApontamentoHoras[];
  despesas: DespesaSitio[];
}

/** Estado já migrado e normalizado (todos os campos presentes). */
export type ControleSitioCompleto = ControleSitioState & {
  versao: number;
  tanques: TanqueCombustivel[];
  maquinas: MaquinaSitio[];
  apontamentos: ApontamentoHoras[];
};

// ============================================================
// CONSTANTES E RÓTULOS
// ============================================================

export const VERSAO_SITIO = 4;
export const STORAGE_KEY_SITIO_DESPESAS = 'grupo_eno_sitio_controle_despesas_v3';
export const EVENTO_SITIO_ATUALIZADO = 'sitio_controle_despesas_updated';

export const CAPACIDADE_PADRAO: Record<TipoCombustivel, number> = {
  DIESEL: 5000,
  GASOLINA: 1000,
  ETANOL: 1000
};

/** Combustíveis com tanque próprio no sítio. Etanol só por posto. */
export const COMBUSTIVEIS_TANQUE: TipoCombustivel[] = ['DIESEL', 'GASOLINA'];
export const COMBUSTIVEIS: TipoCombustivel[] = ['DIESEL', 'GASOLINA', 'ETANOL'];

export const ROTULO_COMBUSTIVEL: Record<TipoCombustivel, string> = {
  DIESEL: 'Diesel',
  GASOLINA: 'Gasolina',
  ETANOL: 'Etanol'
};

export const ROTULO_TIPO_MAQUINA: Record<TipoMaquina, string> = {
  TRATOR: 'Trator',
  CAMINHONETE: 'Caminhonete',
  ROCADEIRA: 'Roçadeira',
  IMPLEMENTO: 'Implemento',
  OUTRO: 'Outro'
};

export const ROTULO_CATEGORIA: Record<CategoriaDespesaSitio, string> = {
  COMBUSTIVEL: 'Combustível (tanque)',
  COMBUSTIVEL_FORA: 'Combustível fora',
  PECAS: 'Peças',
  MANUTENCAO: 'Manutenção',
  MAO_DE_OBRA: 'Mão de obra / diárias',
  INSUMOS: 'Insumos',
  ENERGIA: 'Energia',
  FRETE: 'Frete',
  ALIMENTACAO: 'Alimentação',
  OUTROS: 'Outros'
};

/** Categorias oferecidas no lançamento de "Outras despesas". */
export const CATEGORIAS_DESPESA: CategoriaDespesaSitio[] = [
  'COMBUSTIVEL_FORA',
  'PECAS',
  'MANUTENCAO',
  'MAO_DE_OBRA',
  'INSUMOS',
  'ENERGIA',
  'FRETE',
  'ALIMENTACAO',
  'OUTROS'
];

/** Categoria usada no Financeiro (combustível separado de manutenção). */
export const CATEGORIA_FINANCEIRO: Record<CategoriaDespesaSitio, string> = {
  COMBUSTIVEL: 'Combustível & Lubrificantes',
  COMBUSTIVEL_FORA: 'Combustível & Lubrificantes',
  PECAS: 'Manutenção & Peças',
  MANUTENCAO: 'Manutenção & Peças',
  MAO_DE_OBRA: 'Mão de Obra / Diárias',
  INSUMOS: 'Insumos Agrícolas',
  ENERGIA: 'Energia / Concessionárias',
  FRETE: 'Fretes',
  ALIMENTACAO: 'Alimentação',
  OUTROS: 'Outros'
};

export const ATIVIDADES_SUGERIDAS = [
  'Plantio',
  'Colheita',
  'Gradagem',
  'Aração',
  'Pulverização',
  'Adubação',
  'Roçada',
  'Transporte',
  'Manutenção de estrada'
];

export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto', 'Faturado 30 dias'];

export const DESTINATARIO_SITIO = 'Sítio Santana - Grupo ENO Agroindústria';

// ============================================================
// UTILITÁRIOS
// ============================================================

export const numSitio = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

const semAcento = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const gerarIdSitio = (prefixo: string) =>
  `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function combustivelDoProduto(produto?: string): TipoCombustivel {
  const p = semAcento(produto || '');
  if (p.includes('gasolina')) return 'GASOLINA';
  if (p.includes('etanol') || p.includes('alcool')) return 'ETANOL';
  return 'DIESEL';
}

export function chaveMes(data?: string): string {
  const d = parseData(data);
  return d ? mesAtualKey(d) : '';
}

/** Classificação de lançamentos antigos (sem campo movimento). Mesma regra da tela anterior. */
function classificarLegado(d: DespesaSitio): MovimentoSitio {
  const id = String(d.id || '');
  const nome = semAcento(d.nomeDespesa);
  const maquina = semAcento(d.maquinaTrator);
  const ehCompra =
    id.startsWith('mov_compra_') ||
    (!id.startsWith('mov_abast_') && !id.startsWith('mov_desp_') && (nome.includes('compra') || maquina.includes('tanque')));
  if (ehCompra) return 'COMPRA';
  const ehAbast =
    id.startsWith('mov_abast_') ||
    (!id.startsWith('mov_desp_') && (nome.includes('abastecimento') || (d.unidade === 'L' && d.tipo === 'COMBUSTIVEL')));
  if (ehAbast) return 'ABASTECIMENTO';
  return 'DESPESA';
}

function categoriaLegado(tipo: DespesaSitio['tipo']): CategoriaDespesaSitio {
  if (tipo === 'PECA') return 'PECAS';
  if (tipo === 'MANUTENCAO' || tipo === 'LUBRIFICANTE') return 'MANUTENCAO';
  if (tipo === 'COMBUSTIVEL') return 'COMBUSTIVEL_FORA';
  return 'OUTROS';
}

export function tipoLegadoDaCategoria(c: CategoriaDespesaSitio): DespesaSitio['tipo'] {
  if (c === 'COMBUSTIVEL' || c === 'COMBUSTIVEL_FORA') return 'COMBUSTIVEL';
  if (c === 'PECAS') return 'PECA';
  if (c === 'MANUTENCAO') return 'MANUTENCAO';
  return 'OUTROS';
}

/** Movimento do lançamento (registros antigos são classificados na hora). */
export function movimentoDe(d: DespesaSitio): MovimentoSitio {
  return d.movimento || classificarLegado(d);
}

/** Categoria do lançamento para relatórios. Compra de tanque = COMBUSTIVEL. */
export function categoriaDe(d: DespesaSitio): CategoriaDespesaSitio {
  if (d.categoria) return d.categoria;
  const mov = movimentoDe(d);
  if (mov === 'COMPRA' || mov === 'ABASTECIMENTO') return 'COMBUSTIVEL';
  if (mov === 'POSTO') return 'COMBUSTIVEL_FORA';
  return categoriaLegado(d.tipo);
}

/** true quando o lançamento representa dinheiro gasto (o abastecimento de tanque é só consumo). */
export function ehGasto(d: DespesaSitio): boolean {
  return movimentoDe(d) !== 'ABASTECIMENTO';
}

// ============================================================
// MIGRAÇÃO E NORMALIZAÇÃO
// ============================================================

function tipoMaquinaPeloNome(nome: string): TipoMaquina {
  const n = semAcento(nome);
  if (n.includes('trator')) return 'TRATOR';
  if (n.includes('caminhonete') || n.includes('pick') || n.includes('hilux') || n.includes('s10') || n.includes('strada')) return 'CAMINHONETE';
  if (n.includes('rocadeira')) return 'ROCADEIRA';
  return 'OUTRO';
}

function estadoVazio(): ControleSitioCompleto {
  return {
    versao: VERSAO_SITIO,
    totalLitrosDisponivel: 0,
    capacidadeTanqueLitros: CAPACIDADE_PADRAO.DIESEL,
    tanques: COMBUSTIVEIS_TANQUE.map(c => ({ combustivel: c, capacidadeLitros: CAPACIDADE_PADRAO[c], saldoLitros: 0 })),
    maquinas: [],
    apontamentos: [],
    despesas: []
  };
}

/**
 * Converte o formato antigo (tanque único) no novo:
 * - saldo do tanque: dividido por combustível conforme o produto das compras/abastecimentos; sem indicação vai para Diesel;
 * - máquinas: criadas a partir dos nomes usados nos abastecimentos;
 * - horas lançadas no abastecimento viram apontamentos de horas.
 */
function migrarLegado(d: Partial<ControleSitioState>): ControleSitioCompleto {
  const despesasBrutas: DespesaSitio[] = Array.isArray(d.despesas)
    ? (d.despesas.filter(x => x && typeof x === 'object') as DespesaSitio[])
    : [];
  const totalAntigo = Math.max(0, numSitio(d.totalLitrosDisponivel));
  const capDiesel = numSitio(d.capacidadeTanqueLitros) > 0 ? numSitio(d.capacidadeTanqueLitros) : CAPACIDADE_PADRAO.DIESEL;

  // Saldo de gasolina pelo livro (compras - abastecimentos de gasolina); o resto do saldo é Diesel
  let saldoGasolinaLivro = 0;
  despesasBrutas.forEach(x => {
    const mov = classificarLegado(x);
    if (combustivelDoProduto(x.produto) !== 'GASOLINA') return;
    if (mov === 'COMPRA') saldoGasolinaLivro += numSitio(x.quantidade);
    if (mov === 'ABASTECIMENTO') saldoGasolinaLivro -= numSitio(x.quantidade);
  });
  const saldoGasolina = r2(Math.min(totalAntigo, Math.max(0, saldoGasolinaLivro)));
  const saldoDiesel = r2(totalAntigo - saldoGasolina);

  // Máquinas a partir dos abastecimentos antigos
  const maquinas: MaquinaSitio[] = [];
  const porNome = new Map<string, MaquinaSitio>();
  despesasBrutas.forEach(x => {
    if (classificarLegado(x) !== 'ABASTECIMENTO') return;
    const nome = String(x.maquinaTrator || '').trim() || 'Trator';
    const chave = semAcento(nome);
    if (porNome.has(chave)) return;
    const m: MaquinaSitio = {
      id: `maq_legado_${maquinas.length + 1}`,
      nome,
      tipo: tipoMaquinaPeloNome(nome),
      combustivel: combustivelDoProduto(x.produto),
      medidor: tipoMaquinaPeloNome(nome) === 'CAMINHONETE' ? 'HODOMETRO' : 'HORIMETRO',
      leituraInicial: 0,
      ativo: true,
      criadoEm: paraISO(x.data) || hojeISO()
    };
    porNome.set(chave, m);
    maquinas.push(m);
  });

  const apontamentos: ApontamentoHoras[] = [];
  const despesas: DespesaSitio[] = despesasBrutas.map(x => {
    const mov = classificarLegado(x);
    const base: DespesaSitio = { ...x, movimento: mov };
    if (mov === 'COMPRA') {
      base.categoria = 'COMBUSTIVEL';
      base.combustivel = combustivelDoProduto(x.produto);
      base.fornecedor = x.notaFiscal?.emitente || '';
      base.formaPagamento = x.notaFiscal?.formaPagamento || '';
    } else if (mov === 'ABASTECIMENTO') {
      base.categoria = 'COMBUSTIVEL';
      base.combustivel = combustivelDoProduto(x.produto);
      const maq = porNome.get(semAcento(String(x.maquinaTrator || '').trim() || 'Trator'));
      if (maq) {
        base.maquinaId = maq.id;
        const horas = numSitio(x.horasTrabalhadas);
        if (horas > 0) {
          apontamentos.push({
            id: `apt_legado_${x.id}`,
            data: paraISO(x.data) || hojeISO(),
            maquinaId: maq.id,
            horas,
            operador: x.responsavel || '',
            atividade: 'Lançado no abastecimento',
            origemLegado: true
          });
        }
      }
    } else {
      base.categoria = categoriaLegado(x.tipo);
      base.fornecedor = x.notaFiscal?.emitente || '';
      base.formaPagamento = x.notaFiscal?.formaPagamento || '';
    }
    return base;
  });

  return {
    versao: VERSAO_SITIO,
    totalLitrosDisponivel: totalAntigo,
    capacidadeTanqueLitros: capDiesel,
    tanques: [
      { combustivel: 'DIESEL', capacidadeLitros: capDiesel, saldoLitros: saldoDiesel },
      { combustivel: 'GASOLINA', capacidadeLitros: Math.max(CAPACIDADE_PADRAO.GASOLINA, saldoGasolina), saldoLitros: saldoGasolina }
    ],
    maquinas,
    apontamentos,
    despesas
  };
}

function normalizarTanques(lista: unknown): TanqueCombustivel[] {
  const arr = Array.isArray(lista) ? (lista as Partial<TanqueCombustivel>[]) : [];
  return COMBUSTIVEIS_TANQUE.map(c => {
    const t = arr.find(x => x && x.combustivel === c);
    const cap = numSitio(t?.capacidadeLitros);
    return {
      combustivel: c,
      capacidadeLitros: cap > 0 ? cap : CAPACIDADE_PADRAO[c],
      saldoLitros: Math.max(0, r2(numSitio(t?.saldoLitros)))
    };
  });
}

/** Valida o formato gravado e migra versões antigas. */
export function normalizarEstadoSitio(dados: unknown): ControleSitioCompleto {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return estadoVazio();
  const d = dados as Partial<ControleSitioState>;
  if (numSitio(d.versao) < VERSAO_SITIO) return migrarLegado(d);
  const tanques = normalizarTanques(d.tanques);
  return {
    versao: VERSAO_SITIO,
    tanques,
    totalLitrosDisponivel: r2(tanques.reduce((a, t) => a + t.saldoLitros, 0)),
    capacidadeTanqueLitros: tanques.find(t => t.combustivel === 'DIESEL')?.capacidadeLitros || CAPACIDADE_PADRAO.DIESEL,
    maquinas: Array.isArray(d.maquinas) ? d.maquinas.filter(x => x && typeof x === 'object' && x.id) : [],
    apontamentos: Array.isArray(d.apontamentos) ? d.apontamentos.filter(x => x && typeof x === 'object' && x.id) : [],
    despesas: Array.isArray(d.despesas) ? d.despesas.filter(x => x && typeof x === 'object') : []
  };
}

export function carregarControleSitio(): ControleSitioCompleto {
  if (typeof window === 'undefined') return estadoVazio();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITIO_DESPESAS);
    if (raw === null) {
      const vazio = estadoVazio();
      localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(vazio));
      return vazio;
    }
    const bruto = JSON.parse(raw);
    const estado = normalizarEstadoSitio(bruto);
    // Grava a migração uma única vez (sem disparar evento, para não criar laço de atualização)
    if (bruto && typeof bruto === 'object' && numSitio((bruto as ControleSitioState).versao) < VERSAO_SITIO) {
      try {
        localStorage.setItem(`${STORAGE_KEY_SITIO_DESPESAS}_backup_pre_v4`, raw);
        localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(estado));
      } catch {
        /* sem espaço: segue com o estado migrado só em memória */
      }
    }
    return estado;
  } catch (e) {
    console.error('Erro ao ler controle do sítio:', e);
  }
  return estadoVazio();
}

export function salvarControleSitio(dados: ControleSitioState): void {
  try {
    const estado = normalizarEstadoSitio({ ...dados, versao: VERSAO_SITIO });
    localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(estado));
    window.dispatchEvent(new Event(EVENTO_SITIO_ATUALIZADO));
  } catch (e) {
    console.error('Erro ao salvar controle do sítio:', e);
  }
}

// ============================================================
// CONSULTAS
// ============================================================

export function tanqueDe(estado: ControleSitioCompleto, c: TipoCombustivel): TanqueCombustivel | undefined {
  return estado.tanques.find(t => t.combustivel === c);
}

/** Custo médio por litro das compras de um combustível (ponderado). */
export function custoMedioLitro(estado: ControleSitioCompleto, c: TipoCombustivel): number {
  let litros = 0;
  let valor = 0;
  estado.despesas.forEach(d => {
    if (movimentoDe(d) !== 'COMPRA') return;
    if ((d.combustivel || combustivelDoProduto(d.produto)) !== c) return;
    litros += numSitio(d.quantidade);
    valor += numSitio(d.valorTotal);
  });
  return litros > 0 ? r2(valor / litros) : 0;
}

/** Maior leitura conhecida do horímetro/hodômetro da máquina. */
export function leituraAtual(estado: ControleSitioCompleto, maquinaId: string): number {
  const m = estado.maquinas.find(x => x.id === maquinaId);
  let maior = numSitio(m?.leituraInicial);
  estado.apontamentos.forEach(a => {
    if (a.maquinaId !== maquinaId) return;
    maior = Math.max(maior, numSitio(a.horimetroFinal));
  });
  estado.despesas.forEach(d => {
    if (d.maquinaId !== maquinaId) return;
    maior = Math.max(maior, numSitio(d.leituraMedidor));
  });
  return maior;
}

export interface MetricaMaquina {
  maquina: MaquinaSitio;
  horasMes: number;
  horasTotal: number;
  litrosMes: number;
  litrosTotal: number;
  custoCombustivelTotal: number;
  consumoLh: number | null; // litros por hora (horímetro)
  custoPorHora: number | null;
  kmPorLitro: number | null; // hodômetro
  leituraAtual: number;
}

export function metricasMaquinas(estado: ControleSitioCompleto, mes: string): MetricaMaquina[] {
  return estado.maquinas.map(m => {
    let horasMes = 0;
    let horasTotal = 0;
    estado.apontamentos.forEach(a => {
      if (a.maquinaId !== m.id) return;
      const h = numSitio(a.horas);
      horasTotal += h;
      if (chaveMes(a.data) === mes) horasMes += h;
    });
    let litrosMes = 0;
    let litrosTotal = 0;
    let custo = 0;
    const leituras: number[] = [];
    estado.despesas.forEach(d => {
      if (d.maquinaId !== m.id) return;
      const mov = movimentoDe(d);
      if (mov !== 'ABASTECIMENTO' && mov !== 'POSTO') return;
      const l = numSitio(d.quantidade);
      litrosTotal += l;
      custo += numSitio(d.valorTotal);
      if (chaveMes(d.data) === mes) litrosMes += l;
      if (numSitio(d.leituraMedidor) > 0) leituras.push(numSitio(d.leituraMedidor));
    });
    let kmPorLitro: number | null = null;
    if (m.medidor === 'HODOMETRO' && leituras.length >= 2 && litrosTotal > 0) {
      const rodado = Math.max(...leituras) - Math.min(...leituras);
      if (rodado > 0) kmPorLitro = r2(rodado / litrosTotal);
    }
    return {
      maquina: m,
      horasMes: r2(horasMes),
      horasTotal: r2(horasTotal),
      litrosMes: r2(litrosMes),
      litrosTotal: r2(litrosTotal),
      custoCombustivelTotal: r2(custo),
      consumoLh: horasTotal > 0 && litrosTotal > 0 ? r2(litrosTotal / horasTotal) : null,
      custoPorHora: horasTotal > 0 && custo > 0 ? r2(custo / horasTotal) : null,
      kmPorLitro,
      leituraAtual: leituraAtual(estado, m.id)
    };
  });
}

/** Gasto do mês por categoria (compra de combustível, posto e despesas; abastecimento de tanque não conta). */
export function gastoPorCategoria(estado: ControleSitioCompleto, mes: string): { categoria: CategoriaDespesaSitio; valor: number }[] {
  const mapa = new Map<CategoriaDespesaSitio, number>();
  estado.despesas.forEach(d => {
    if (!ehGasto(d) || chaveMes(d.data) !== mes) return;
    const c = categoriaDe(d);
    mapa.set(c, (mapa.get(c) || 0) + numSitio(d.valorTotal));
  });
  return Array.from(mapa.entries())
    .map(([categoria, valor]) => ({ categoria, valor: r2(valor) }))
    .sort((a, b) => b.valor - a.valor);
}

// ============================================================
// OPERAÇÕES (retornam o novo estado e o lançamento criado)
// ============================================================

function notaBasica(p: {
  numero?: string;
  data: string;
  emitente?: string;
  formaPagamento?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  total: number;
  observacoes?: string;
}): NotaFiscalDespesa {
  return {
    numero: (p.numero || '').trim(),
    serie: (p.numero || '').trim() ? '1' : '',
    chaveAcesso: '',
    dataEmissao: p.data,
    emitente: p.emitente || '',
    cnpjEmitente: '',
    destinatario: DESTINATARIO_SITIO,
    cnpjDestinatario: '',
    formaPagamento: p.formaPagamento || '',
    itens: [
      {
        descricao: p.descricao,
        quantidade: p.quantidade,
        unidade: p.unidade,
        precoUnitario: p.precoUnitario,
        total: p.total
      }
    ],
    observacoes: p.observacoes
  };
}

/** Resultado das operações: ok=false traz a mensagem em `erro` (formato plano por não usarmos strict). */
export interface Resultado {
  ok: boolean;
  erro?: string;
  estado?: ControleSitioCompleto;
  lancamento?: DespesaSitio;
}

export interface EntradaCompra {
  data: string;
  combustivel: TipoCombustivel;
  litros: number;
  valorTotal: number;
  fornecedor: string;
  numeroNF?: string;
  formaPagamento: string;
  situacao: SituacaoPagamento;
  vencimento?: string;
  observacao?: string;
  responsavel?: string;
}

export function registrarCompraCombustivel(estado: ControleSitioCompleto, e: EntradaCompra): Resultado {
  const litros = numSitio(e.litros);
  const total = r2(numSitio(e.valorTotal));
  if (litros <= 0 || total <= 0) return { ok: false, erro: 'Informe litros e valor total maiores que zero.' };
  const tanque = tanqueDe(estado, e.combustivel);
  if (!tanque) return { ok: false, erro: 'Esse combustível não tem tanque no sítio. Use "Abasteceu no posto".' };
  const livre = Math.max(0, tanque.capacidadeLitros - tanque.saldoLitros);
  if (litros > livre) {
    return {
      ok: false,
      erro: `Não cabe no tanque de ${ROTULO_COMBUSTIVEL[e.combustivel]} (${tanque.capacidadeLitros} L). Saldo ${tanque.saldoLitros} L; cabem ${r2(livre)} L.`
    };
  }
  if (e.situacao === 'A_PAGAR' && !paraISO(e.vencimento)) return { ok: false, erro: 'Informe o vencimento da conta a pagar.' };
  const data = paraISO(e.data) || hojeISO();
  const precoL = r2(total / litros);
  const nome = ROTULO_COMBUSTIVEL[e.combustivel];
  const lanc: DespesaSitio = {
    id: gerarIdSitio('mov_compra'),
    data,
    nomeDespesa: `Compra de ${nome} (${litros} L)`,
    tipo: 'COMBUSTIVEL',
    produto: nome,
    quantidade: litros,
    unidade: 'L',
    valorUnitario: precoL,
    valorTotal: total,
    maquinaTrator: `Tanque ${nome}`,
    responsavel: e.responsavel || '',
    notaFiscal: notaBasica({
      numero: e.numeroNF,
      data,
      emitente: e.fornecedor,
      formaPagamento: e.formaPagamento,
      descricao: `${nome.toUpperCase()} A GRANEL`,
      quantidade: litros,
      unidade: 'L',
      precoUnitario: precoL,
      total,
      observacoes: e.observacao
    }),
    movimento: 'COMPRA',
    categoria: 'COMBUSTIVEL',
    combustivel: e.combustivel,
    fornecedor: e.fornecedor,
    formaPagamento: e.formaPagamento,
    situacao: e.situacao,
    vencimento: e.situacao === 'A_PAGAR' ? paraISO(e.vencimento) : undefined,
    observacao: e.observacao
  };
  const tanques = estado.tanques.map(t =>
    t.combustivel === e.combustivel ? { ...t, saldoLitros: r2(t.saldoLitros + litros) } : t
  );
  return { ok: true, lancamento: lanc, estado: { ...estado, tanques, despesas: [lanc, ...estado.despesas] } };
}

export interface EntradaAbastecimento {
  data: string;
  maquinaId: string;
  combustivel: TipoCombustivel;
  litros: number;
  leitura?: number;
  operador: string;
  observacao?: string;
  origem: 'TANQUE' | 'POSTO';
  // Somente posto:
  valorTotal?: number;
  posto?: string;
  numeroNF?: string;
  formaPagamento?: string;
  situacao?: SituacaoPagamento;
  vencimento?: string;
}

export function registrarAbastecimento(estado: ControleSitioCompleto, e: EntradaAbastecimento): Resultado {
  const litros = numSitio(e.litros);
  if (litros <= 0) return { ok: false, erro: 'Informe os litros abastecidos (maior que zero).' };
  const maq = estado.maquinas.find(m => m.id === e.maquinaId);
  if (!maq) return { ok: false, erro: 'Escolha a máquina abastecida.' };
  const leitura = numSitio(e.leitura);
  const atual = leituraAtual(estado, maq.id);
  if (leitura > 0 && leitura < atual) {
    const un = maq.medidor === 'HODOMETRO' ? 'km' : 'h';
    return { ok: false, erro: `Leitura ${leitura} ${un} menor que a última registrada (${atual} ${un}).` };
  }
  const data = paraISO(e.data) || hojeISO();
  const nome = ROTULO_COMBUSTIVEL[e.combustivel];

  if (e.origem === 'TANQUE') {
    const tanque = tanqueDe(estado, e.combustivel);
    if (!tanque) return { ok: false, erro: `Não há tanque de ${nome} no sítio. Use "Abasteceu no posto".` };
    if (litros > tanque.saldoLitros) {
      return {
        ok: false,
        erro: `Abastecimento de ${litros} L maior que o saldo de ${nome} (${tanque.saldoLitros} L). Registre antes a compra.`
      };
    }
    const custoL = custoMedioLitro(estado, e.combustivel);
    const total = r2(litros * custoL);
    const lanc: DespesaSitio = {
      id: gerarIdSitio('mov_abast'),
      data,
      nomeDespesa: `Abastecimento ${maq.nome} (${litros} L)`,
      tipo: 'COMBUSTIVEL',
      produto: nome,
      quantidade: litros,
      unidade: 'L',
      valorUnitario: custoL,
      valorTotal: total,
      maquinaTrator: maq.nome,
      responsavel: e.operador,
      notaFiscal: notaBasica({
        data,
        emitente: `Tanque ${nome} (consumo interno)`,
        formaPagamento: 'Retirada direta do tanque',
        descricao: `ABASTECIMENTO ${nome.toUpperCase()}`,
        quantidade: litros,
        unidade: 'L',
        precoUnitario: custoL,
        total,
        observacoes: e.observacao
      }),
      movimento: 'ABASTECIMENTO',
      categoria: 'COMBUSTIVEL',
      combustivel: e.combustivel,
      maquinaId: maq.id,
      leituraMedidor: leitura > 0 ? leitura : undefined,
      observacao: e.observacao
    };
    const tanques = estado.tanques.map(t =>
      t.combustivel === e.combustivel ? { ...t, saldoLitros: r2(t.saldoLitros - litros) } : t
    );
    return { ok: true, lancamento: lanc, estado: { ...estado, tanques, despesas: [lanc, ...estado.despesas] } };
  }

  // Posto externo: vira despesa (financeiro) e não mexe no tanque
  const total = r2(numSitio(e.valorTotal));
  if (total <= 0) return { ok: false, erro: 'Informe o valor pago no posto.' };
  const situacao: SituacaoPagamento = e.situacao || 'PAGO';
  if (situacao === 'A_PAGAR' && !paraISO(e.vencimento)) return { ok: false, erro: 'Informe o vencimento da conta a pagar.' };
  const precoL = r2(total / litros);
  const lanc: DespesaSitio = {
    id: gerarIdSitio('mov_posto'),
    data,
    nomeDespesa: `${nome} no posto · ${maq.nome} (${litros} L)`,
    tipo: 'COMBUSTIVEL',
    produto: nome,
    quantidade: litros,
    unidade: 'L',
    valorUnitario: precoL,
    valorTotal: total,
    maquinaTrator: maq.nome,
    responsavel: e.operador,
    notaFiscal: notaBasica({
      numero: e.numeroNF,
      data,
      emitente: e.posto || 'Posto',
      formaPagamento: e.formaPagamento,
      descricao: `${nome.toUpperCase()} - ABASTECIMENTO NO POSTO`,
      quantidade: litros,
      unidade: 'L',
      precoUnitario: precoL,
      total,
      observacoes: e.observacao
    }),
    movimento: 'POSTO',
    categoria: 'COMBUSTIVEL_FORA',
    combustivel: e.combustivel,
    maquinaId: maq.id,
    leituraMedidor: leitura > 0 ? leitura : undefined,
    fornecedor: e.posto || '',
    formaPagamento: e.formaPagamento,
    situacao,
    vencimento: situacao === 'A_PAGAR' ? paraISO(e.vencimento) : undefined,
    observacao: e.observacao
  };
  return { ok: true, lancamento: lanc, estado: { ...estado, despesas: [lanc, ...estado.despesas] } };
}

export interface EntradaDespesa {
  data: string;
  categoria: CategoriaDespesaSitio;
  descricao: string;
  valorTotal: number;
  maquinaId?: string;
  fornecedor: string;
  numeroNF?: string;
  formaPagamento: string;
  situacao: SituacaoPagamento;
  vencimento?: string;
  responsavel?: string;
  observacao?: string;
}

export function registrarDespesa(estado: ControleSitioCompleto, e: EntradaDespesa): Resultado {
  const total = r2(numSitio(e.valorTotal));
  if (!e.descricao.trim()) return { ok: false, erro: 'Descreva a despesa (ex.: filtro de óleo, diária do Zé).' };
  if (total <= 0) return { ok: false, erro: 'Informe o valor (maior que zero).' };
  if (e.situacao === 'A_PAGAR' && !paraISO(e.vencimento)) return { ok: false, erro: 'Informe o vencimento da conta a pagar.' };
  const data = paraISO(e.data) || hojeISO();
  const maq = e.maquinaId ? estado.maquinas.find(m => m.id === e.maquinaId) : undefined;
  const lanc: DespesaSitio = {
    id: gerarIdSitio('mov_desp'),
    data,
    nomeDespesa: e.descricao.trim(),
    tipo: tipoLegadoDaCategoria(e.categoria),
    produto: e.descricao.trim(),
    quantidade: 1,
    unidade: 'UN',
    valorUnitario: total,
    valorTotal: total,
    maquinaTrator: maq ? maq.nome : 'Geral',
    responsavel: e.responsavel || '',
    notaFiscal: notaBasica({
      numero: e.numeroNF,
      data,
      emitente: e.fornecedor,
      formaPagamento: e.formaPagamento,
      descricao: e.descricao.trim().toUpperCase(),
      quantidade: 1,
      unidade: 'UN',
      precoUnitario: total,
      total,
      observacoes: e.observacao
    }),
    movimento: 'DESPESA',
    categoria: e.categoria,
    maquinaId: maq?.id,
    fornecedor: e.fornecedor,
    formaPagamento: e.formaPagamento,
    situacao: e.situacao,
    vencimento: e.situacao === 'A_PAGAR' ? paraISO(e.vencimento) : undefined,
    observacao: e.observacao
  };
  return { ok: true, lancamento: lanc, estado: { ...estado, despesas: [lanc, ...estado.despesas] } };
}

export interface EntradaApontamento {
  data: string;
  maquinaId: string;
  modo: 'HORIMETRO' | 'HORAS';
  horimetroInicial?: number;
  horimetroFinal?: number;
  horas?: number;
  operador: string;
  atividade: string;
  talhao?: string;
  observacao?: string;
}

export function registrarApontamento(estado: ControleSitioCompleto, e: EntradaApontamento): Resultado {
  const maq = estado.maquinas.find(m => m.id === e.maquinaId);
  if (!maq) return { ok: false, erro: 'Escolha a máquina.' };
  if (!e.atividade.trim()) return { ok: false, erro: 'Informe a atividade (ex.: plantio, gradagem).' };
  let horas = 0;
  let ini: number | undefined;
  let fim: number | undefined;
  if (e.modo === 'HORIMETRO') {
    ini = numSitio(e.horimetroInicial);
    fim = numSitio(e.horimetroFinal);
    if (fim <= 0) return { ok: false, erro: 'Informe o horímetro final.' };
    if (fim < ini) return { ok: false, erro: `Horímetro final (${fim}) menor que o inicial (${ini}). Confira a leitura.` };
    horas = r2(fim - ini);
    if (horas <= 0) return { ok: false, erro: 'Horímetro final igual ao inicial: nenhuma hora trabalhada.' };
  } else {
    horas = r2(numSitio(e.horas));
    if (horas <= 0) return { ok: false, erro: 'Informe as horas trabalhadas.' };
  }
  if (horas > 24) return { ok: false, erro: `${horas} h num só apontamento passa de 24 h. Confira a leitura ou divida por dia.` };
  const apt: ApontamentoHoras = {
    id: gerarIdSitio('apt'),
    data: paraISO(e.data) || hojeISO(),
    maquinaId: maq.id,
    horimetroInicial: ini,
    horimetroFinal: fim,
    horas,
    operador: e.operador.trim(),
    atividade: e.atividade.trim(),
    talhao: e.talhao?.trim() || undefined,
    observacao: e.observacao?.trim() || undefined
  };
  return { ok: true, estado: { ...estado, apontamentos: [apt, ...estado.apontamentos] } };
}

export function excluirApontamento(estado: ControleSitioCompleto, id: string): ControleSitioCompleto {
  return { ...estado, apontamentos: estado.apontamentos.filter(a => a.id !== id) };
}

export interface EntradaMaquina {
  id?: string;
  nome: string;
  tipo: TipoMaquina;
  combustivel: TipoCombustivel;
  medidor: MedidorMaquina;
  leituraInicial: number;
  ativo: boolean;
}

export function salvarMaquina(estado: ControleSitioCompleto, e: EntradaMaquina): Resultado {
  const nome = e.nome.trim();
  if (!nome) return { ok: false, erro: 'Dê um nome para a máquina (ex.: Trator Valtra A950).' };
  const repetido = estado.maquinas.some(m => m.id !== e.id && semAcento(m.nome) === semAcento(nome));
  if (repetido) return { ok: false, erro: 'Já existe uma máquina com esse nome.' };
  const leitura = Math.max(0, numSitio(e.leituraInicial));
  if (e.id) {
    const maquinas = estado.maquinas.map(m =>
      m.id === e.id ? { ...m, nome, tipo: e.tipo, combustivel: e.combustivel, medidor: e.medidor, leituraInicial: leitura, ativo: e.ativo } : m
    );
    return { ok: true, estado: { ...estado, maquinas } };
  }
  const nova: MaquinaSitio = {
    id: gerarIdSitio('maq'),
    nome,
    tipo: e.tipo,
    combustivel: e.combustivel,
    medidor: e.medidor,
    leituraInicial: leitura,
    ativo: e.ativo,
    criadoEm: hojeISO()
  };
  return { ok: true, estado: { ...estado, maquinas: [...estado.maquinas, nova] } };
}

export function ajustarCapacidadeTanque(estado: ControleSitioCompleto, c: TipoCombustivel, capacidade: number): Resultado {
  const cap = numSitio(capacidade);
  const t = tanqueDe(estado, c);
  if (!t) return { ok: false, erro: 'Tanque não encontrado.' };
  if (cap <= 0) return { ok: false, erro: 'Capacidade deve ser maior que zero.' };
  if (cap < t.saldoLitros) return { ok: false, erro: `Capacidade menor que o saldo atual (${t.saldoLitros} L).` };
  const tanques = estado.tanques.map(x => (x.combustivel === c ? { ...x, capacidadeLitros: cap } : x));
  return { ok: true, estado: { ...estado, tanques } };
}
