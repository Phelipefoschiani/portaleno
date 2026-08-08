import { LucideIcon } from 'lucide-react';

export type UserRole = 'representante' | 'gerente' | 'producao' | 'empana' | 'suporte';

export interface User {
  id: string;
  nome: string;
  login: string;
  senha?: string;
  perfil: UserRole;
  ativo: boolean;
  data_cadastro?: string;
}

export interface MetaRepresentante {
  id: string;
  representante_id: string;
  ano: number;
  mes: number;
  valor: number;
}

export interface ObjetivoEmpresa {
  id: string;
  ano: number;
  mes: number;
  valor: number;
}

export interface Cliente {
  id: string;
  representante_id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj_cpf: string;
  inscricao_estadual?: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cep: string;
  endereco: string;
  numero?: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel?: string;
  canal: 'Supermercado' | 'Food Service' | 'Distribuidor' | 'Atacado' | 'Varejo' | 'Outro';
  categorias?: string[];
  status: 'Aguardando liberação' | 'Liberado' | 'Bloqueado' | 'Inativo';
  data_cadastro: string;
  observacoes?: string;
}

export interface ItemPedido {
  produto_id: string;
  quantidade: number;
  preco: number;
  tipo?: 'venda' | 'bonificacao';
  desconto?: number;
  quantidade_produzida?: number;
}

export interface SolicitacaoInsumo {
  id: string;
  item: string;
  quantidade: number;
  unidade: string;
  urgente: boolean;
  status: 'Pendente' | 'Comprado' | 'Entregue';
}

export interface Orcamento {
  id: string;
  representante_id: string;
  cliente_id: string;
  data: string;
  valor_total: number;
  items: ItemPedido[];
  status: 'Orçamento' | 'Rascunho' | 'Enviado' | 'Convertido em Pedido' | 'Cancelado';
  condicao_pagamento: string;
  prazo_entrega: string;
  data_vencimento?: string;
  previsao_entrega?: string;
  observacoes?: string;
}

export interface Pedido {
  id: string;
  representante_id: string;
  cliente_id: string;
  data: string;
  valor_total: number;
  custo_total: number;
  margem: number;
  items: ItemPedido[];
  status: 'Aguardando Produção' | 'Em produção' | 'Pronto' | 'Faturado' | 'Cancelado';
  nf_anexo?: string;
  nf_numero?: string;
  nf_serie?: string;
  nf_chave?: string;
  nf_data_emissao?: string;
  nf_valor_total?: number;
  data_faturamento?: string;
  data_entrega?: string;
  previsao_entrega?: string;
  condicao_pagamento?: string;
  prazo_entrega?: string;
  observacoes?: string;
  solicitacoes_insumos?: SolicitacaoInsumo[];
  data_fabricacao?: string;
  data_vencimento?: string;
  lote?: string;
  forma_pagamento_nf?: string;
  data_pagamento_nf?: string;
  adiantado?: boolean;
  data_adiantamento?: string;
  valor_adiantado_recebido?: number;
  juros_adiantamento?: number;
  recebido?: boolean;
  data_recebimento?: string;
  juros_recebido?: number;
}

export interface CustoDiferenciado {
  id: string;
  nome: string;
  grupo: 'Imposto' | 'Materia Prima' | 'Comissao' | 'Frete' | 'Trade' | 'Embalagem' | 'Outros';
  tipo: 'Fixo' | 'Variavel'; // Fixo: R$ based, Variavel: % based
  unidade_medida: 'kg' | 'und' | '%' | 'lt' | 'g';
  valor: number;
  proporcao: number; // For recipe (Materia Prima) or for fixed costs (per item)
  base_calculo?: 'Venda' | 'Custo'; // For % items
}

export interface Produto {
  id: string;
  codigo?: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_unidade?: number;
  preco_base: number;
  custo: number;
  custos_detalhados?: CustoDiferenciado[];
  margem_pretendida: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
}

export interface Despesa {
  id: string;
  usuario_id: string;
  tipo: 'Empresa' | 'Representante' | 'Pessoal';
  categoria: string; // Transformed to string for more flexibility as requested
  data: string;
  vencimento: string;
  valor: number;
  forma_pagamento: 'Dinheiro' | 'Cartão' | 'Pix' | 'Boleto' | 'Cartão Crédito' | 'Cartão Débito';
  recorrente: boolean;
  parcelas: number;
  parcela_atual: number;
  status: 'Paga' | 'Pago' | 'Em aberto' | 'Vencida' | 'Cancelada';
  descricao: string;
  comprovante?: string;
  tipo_despesa?: 'fixa' | 'variavel';
  compra_mandioca_id?: string;
  data_pagamento?: string;
  juros_pago?: number;
  dias_atraso?: number;
}

export interface Comissao {
  id: string;
  representante_id: string;
  pedido_id: string;
  nf_numero?: string;
  nf_serie?: string;
  valor_base: number;
  percentual: number;
  valor_comissao: number;
  status: 'Prevista' | 'Liberada' | 'Paga' | 'Bloqueada';
  data_prevista: string;
  data_pagamento?: string;
}

export interface Producao {
  id: string;
  produto_id: string;
  data: string;
  data_inicio: string;
  data_fim?: string;
  status: 'Planejada' | 'Em andamento' | 'Finalizada';
  lote: string;
  quantidade_produzida: number; // Qtd real produzida
  quantidade_estimada: number; // Qtd planejada
  quantidade_materia_prima: number;
  perda: number;
  rendimento: number;
  validade: string;
  custo_lote: number;
}

export interface Fornecedor {
  id: string;
  nome: string;
  telefone: string;
  rua_linha: string;
  numero: string;
  cidade: string;
  estado: string;
  ponto_referencia: string;
  contato_secundario: string;
}

export interface CompraMandioca {
  id: string;
  fornecedor_id: string;
  data: string;
  tipo_pesagem: 'sacos' | 'total';
  pesagens_sacos: number[];
  quantidade_total: number;
  status_pagamento: 'Pago' | 'Pendente' | 'Ordem de Compra' | 'Ordem Cumprida';
  casca_kg: number;
  destopo_kg: number;
  preco_quilo?: number;
  valor_total?: number;
  ordem_compra_id?: string;
}

export interface AppEvent {
  id: string;
  data: string;
  hora: string;
  descricao: string;
  usuario_id: string;
  usuario_nome: string;
  valor?: number;
}

export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return "0,00";
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
