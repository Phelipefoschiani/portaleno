import { LucideIcon } from 'lucide-react';

export type UserRole = 'representante' | 'gerente' | 'producao';

export interface User {
  id: string;
  nome: string;
  login: string;
  senha?: string;
  perfil: UserRole;
  ativo: boolean;
}

export interface MetaRepresentante {
  id: string;
  representante_id: string;
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
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  canal: 'Supermercado' | 'Food Service' | 'Distribuidor' | 'Atacado' | 'Varejo' | 'Outro';
  status: 'Aguardando liberação' | 'Liberado' | 'Bloqueado' | 'Inativo';
  data_cadastro: string;
  observacoes?: string;
}

export interface ItemPedido {
  produto_id: string;
  quantidade: number;
  preco: number;
}

export interface Orcamento {
  id: string;
  representante_id: string;
  cliente_id: string;
  data: string;
  valor_total: number;
  items: ItemPedido[];
  status: 'Rascunho' | 'Enviado' | 'Aprovado' | 'Reprovado' | 'Convertido em Pedido' | 'Cancelado';
  condicao_pagamento: string;
  prazo_entrega: string;
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
  status: 'Enviado' | 'Em análise' | 'Aprovado' | 'Em produção' | 'Faturado' | 'Entregue' | 'Cancelado';
  nf_anexo?: string;
  nf_numero?: string;
  nf_serie?: string;
  nf_chave?: string;
  nf_data_emissao?: string;
  data_faturamento?: string;
  data_entrega?: string;
  previsao_entrega?: string;
  observacoes?: string;
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
