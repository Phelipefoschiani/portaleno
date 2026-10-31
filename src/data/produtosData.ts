// Módulo de Dados de Produtos, Formulações, Custos e Estoques do Grupo ENO

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

export interface ConfiguracaoCusto {
  id: string;
  produto_id: string;
  produto_nome: string;
  custo_materia_prima_kg: number; // baseada na cotação da raiz
  custo_energia_lenha_kg: number; // biomassa caldeira e eletricidade moagem
  custo_embalagem_unit: number; // saco 25kg ráfia ou liner big bag
  custo_mao_obra_kg: number;
  custo_operacional_fixo_kg: number;
  custo_total_producao_kg: number;
  margem_lucro_alvo_percentual: number;
  preco_sugerido_venda_kg: number;
  preco_sugerido_saco_25kg: number;
  ultima_atualizacao: string;
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
  categoria: 'Raiz In Natura' | 'Biomassa / Lenha' | 'Embalagens' | 'Insumos Industriais';
  unidade_medida: 'KG' | 'TON' | 'ESTÉREO (m³)' | 'UN' | 'LITRO';
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
}

export interface FichaTecnica {
  id: string;
  produto_id?: string;
  produto_nome: string;
  codigo?: string;
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
  desconto_padrao_percentual: number;
  prazo_padrao: string;
  frete_tipo: 'FOB (Retira Fábrica)' | 'CIF (Entrega Grupo ENO)';
  vigencia_inicio: string;
  vigencia_fim: string;
  status: 'VIGENTE' | 'PROGRAMADA' | 'ARQUIVADA';
  produtos_ids?: string[];
}

// DADOS INICIAIS DE RECEITAS INDUSTRIAIS
export const RECEITAS_INICIAIS: ReceitaIndustrial[] = [];


// DADOS DE CONFIGURAÇÃO DE CUSTO
export const CONFIGURACOES_CUSTO_INICIAIS: ConfiguracaoCusto[] = [];


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
const STORAGE_KEY_CUSTOS = 'grupo_eno_custos_v1';

function verificarModoLimpo(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
}

export function carregarEstoqueProdutos(): ProdutoEstoque[] {
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

export function carregarReceitas(): ReceitaIndustrial[] {
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

export function carregarTabelasPreco(): TabelaPreco[] {
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
