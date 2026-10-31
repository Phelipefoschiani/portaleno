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

const STORAGE_KEY_SITIO_DESPESAS = 'grupo_eno_sitio_controle_despesas_v3';

export function carregarControleSitio(): ControleSitioState {
  const modoLimpo = typeof window !== 'undefined' && localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
  const vazioState: ControleSitioState = { totalLitrosDisponivel: 0, capacidadeTanqueLitros: 5000, despesas: [] };
  if (typeof window === 'undefined') return modoLimpo ? vazioState : CONTROLE_SITIO_INICIAL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITIO_DESPESAS);
    if (raw === null) {
      if (modoLimpo) {
        localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(vazioState));
        return vazioState;
      }
      localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(CONTROLE_SITIO_INICIAL));
      return CONTROLE_SITIO_INICIAL;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler controle do sítio:', e);
  }
  return modoLimpo ? vazioState : CONTROLE_SITIO_INICIAL;
}

export function salvarControleSitio(dados: ControleSitioState): void {
  try {
    localStorage.setItem(STORAGE_KEY_SITIO_DESPESAS, JSON.stringify(dados));
    window.dispatchEvent(new Event('sitio_controle_despesas_updated'));
  } catch (e) {
    console.error('Erro ao salvar controle do sítio:', e);
  }
}
