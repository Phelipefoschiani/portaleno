// Módulo de Gerenciamento de Clientes do Grupo ENO
// Unifica o armazenamento e persistência dos clientes entre o Cadastro de Clientes e as Vendas/Pedidos

import { isModoLimpoAtivo } from './sistemaReset';

export interface Cliente {
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
  forma_pagamento_id: string;
  forma_pagamento_nome?: string;
  prazo_pagamento_id: string;
  prazo_pagamento_nome?: string;
  vendedor_id?: string;
  vendedor_nome?: string;
  tabela_preco_id?: string;
  tabela_preco_nome?: string;
  ativo: boolean;
  criado_em: string;
}

export interface ClienteLookup {
  id: string;
  nome: string;
  cnpj: string;
  cidade_uf: string;
  limite_credito?: number;
  status_credito?: 'Liberado' | 'Em Análise' | 'Bloqueado';
  rca_id?: string;
  rca_nome?: string;
  comissao?: number;
  prazo?: string;
}

export const CLIENTES_INICIAIS: Cliente[] = [];

const STORAGE_KEY_CLIENTES = 'grupo_eno_clientes_v1';

export function carregarClientes(): Cliente[] {
  if (typeof window === 'undefined') return isModoLimpoAtivo() ? [] : CLIENTES_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLIENTES);
    if (raw === null) {
      if (isModoLimpoAtivo()) {
        localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(CLIENTES_INICIAIS));
      return CLIENTES_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarClientes(clientes: Cliente[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(clientes));
  window.dispatchEvent(new Event('clientes_updated'));
}

export function obterClientesParaVenda(): ClienteLookup[] {
  const lista = carregarClientes();
  return lista.map(c => ({
    id: c.id,
    nome: c.razao_nome || c.fantasia || 'Cliente Sem Nome',
    cnpj: c.cpf_cnpj || 'Não informado',
    cidade_uf: c.endereco ? `${c.endereco.municipio}/${c.endereco.uf}` : 'Local não informado',
    limite_credito: 100000,
    status_credito: 'Liberado' as const,
    rca_id: c.vendedor_id || 'rca_001',
    rca_nome: c.vendedor_nome || 'Diretoria Comercial',
    comissao: 2.5,
    prazo: c.prazo_pagamento_nome || 'À Vista'
  }));
}
