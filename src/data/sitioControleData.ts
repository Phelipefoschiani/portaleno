// Dados e Lógica do Portal de Controle do Sítio
// Foco em: Controle de Combustível de Tratores, Litros Disponíveis, Despesas Situacionais e Notas Fiscais

export interface ItemNotaFiscal {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  total: number;
}

export interface NotaFiscalDespesa {
  numero: string; // Ex: '048.291'
  serie: string; // '1'
  chaveAcesso: string; // 44 dígitos
  dataEmissao: string;
  emitente: string; // Ex: 'Posto Rota do Agronegócio Ltda'
  cnpjEmitente: string;
  destinatario: string;
  cnpjDestinatario: string;
  formaPagamento: string;
  itens: ItemNotaFiscal[];
  observacoes?: string;
}

export interface DespesaSitio {
  id: string;
  data: string; // YYYY-MM-DD
  nomeDespesa: string; // Ex: 'Abastecimento Trator Valtra', 'Compra Diesel Tanque Central'
  tipo: 'COMBUSTIVEL' | 'PECA' | 'MANUTENCAO' | 'LUBRIFICANTE' | 'OUTROS';
  produto: string; // Ex: 'Diesel S10', 'Gasolina Comum', 'Filtro de Óleo Lubrificante'
  quantidade: number; // 120, 2, 1
  unidade: string; // 'L' (litros) ou 'UN' (unidades), 'JG', 'CX'
  valorUnitario: number;
  valorTotal: number;
  maquinaTrator: string; // Ex: 'Trator Valtra A950', 'Tanque Central do Sítio'
  responsavel: string; // Ex: 'Zé do Trator (Operador)'
  notaFiscal: NotaFiscalDespesa;
  horasTrabalhadas?: number; // Nova funcionalidade: Controle de horas máquina
}

export interface ControleSitioState {
  totalLitrosDisponivel: number; // Litros atualmente disponíveis no tanque de reserva do sítio
  capacidadeTanqueLitros: number; // Capacidade total do tanque do sítio
  despesas: DespesaSitio[];
}

export const CONTROLE_SITIO_INICIAL: ControleSitioState = {
  totalLitrosDisponivel: 0,
  capacidadeTanqueLitros: 5000,
  despesas: []
};

export const STORAGE_KEY_SITIO_DESPESAS = 'grupo_eno_sitio_controle_despesas_v3';
export const EVENTO_SITIO_ATUALIZADO = 'sitio_controle_despesas_updated';

function estadoVazio(): ControleSitioState {
  return { totalLitrosDisponivel: 0, capacidadeTanqueLitros: 5000, despesas: [] };
}

// Valida o formato gravado; qualquer coisa fora do formato vira estado zerado
function normalizarEstado(dados: unknown): ControleSitioState {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return estadoVazio();
  const d = dados as Partial<ControleSitioState>;
  const litros = Number(d.totalLitrosDisponivel);
  const capacidade = Number(d.capacidadeTanqueLitros);
  return {
    totalLitrosDisponivel: Number.isFinite(litros) && litros > 0 ? litros : 0,
    capacidadeTanqueLitros: Number.isFinite(capacidade) && capacidade > 0 ? capacidade : 5000,
    despesas: Array.isArray(d.despesas) ? d.despesas.filter(x => x && typeof x === 'object') : []
  };
}

export function carregarControleSitio(): ControleSitioState {
  if (typeof window === 'undefined') return estadoVazio();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITIO_DESPESAS);
    if (raw === null) {
      const vazio = estadoVazio();
      localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(vazio));
      return vazio;
    }
    return normalizarEstado(JSON.parse(raw));
  } catch (e) {
    console.error('Erro ao ler controle do sítio:', e);
  }
  return estadoVazio();
}

export function salvarControleSitio(dados: ControleSitioState): void {
  try {
    localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(dados));
    window.dispatchEvent(new Event(EVENTO_SITIO_ATUALIZADO));
  } catch (e) {
    console.error('Erro ao salvar controle do sítio:', e);
  }
}
