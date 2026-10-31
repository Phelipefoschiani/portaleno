import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Save, 
  FileText,
  ArrowLeft,
  History,
  ShoppingBag,
  Package,
  FileCheck2,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  UserCheck,
  Tag
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { carregarClientes, salvarClientes, Cliente } from '../../data/clientesData';

// Estrutura de Itens do Pedido
export interface CompraItem {
  produto_nome: string;
  tipo_embalagem: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  lote_produto?: string;
}

// Estrutura do Pedido/Compra do Cliente
export interface CompraCliente {
  id: string;
  empresa_id: string;
  cliente_id: string;
  numero_pedido: string;
  emitido_em: string;
  data_entrega?: string;
  status_nome: 'Entregue' | 'Faturado' | 'Em Produção';
  nota_fiscal?: {
    numero: string;
    serie: string;
    chave_acesso?: string;
  };
  itens: CompraItem[];
  valor_total: number;
  status_financeiro: 'Liquidado' | 'A Vencer' | 'Vencido';
  mes_referencia: string; // Ex: "Out/25", "Nov/25", "Dez/25", "Jan/26", "Fev/26", "Mar/26"
}

// Opções de lookup
const FORMAS_PAGAMENTO_OPTIONS = [
  { id: 'fp_1', nome: 'Boleto Bancário' },
  { id: 'fp_2', nome: 'Pix' },
  { id: 'fp_3', nome: 'Transferência Bancária (TED)' },
  { id: 'fp_4', nome: 'Cartão de Crédito' },
  { id: 'fp_5', nome: 'Dinheiro' },
];

const PRAZOS_PAGAMENTO_OPTIONS = [
  { id: 'pp_1', nome: 'À Vista (0 dias)', dias: 0, parcelas: 1 },
  { id: 'pp_2', nome: '7 Dias', dias: 7, parcelas: 1 },
  { id: 'pp_3', nome: '14 Dias', dias: 14, parcelas: 1 },
  { id: 'pp_4', nome: '21 Dias', dias: 21, parcelas: 1 },
  { id: 'pp_5', nome: '28 Dias', dias: 28, parcelas: 1 },
  { id: 'pp_6', nome: '30 / 60 Dias (2x)', dias: 60, parcelas: 2 },
  { id: 'pp_7', nome: '30 / 60 / 90 Dias (3x)', dias: 90, parcelas: 3 },
];

// Tabelas de Preço do Grupo ENO (public.tabelas_preco)
const TABELAS_PRECO_OPTIONS = [
  { id: 'tab_01', nome: 'Tabela Padrão (Distribuição)' },
  { id: 'tab_02', nome: 'Tabela Varejo / Supermercados' },
  { id: 'tab_03', nome: 'Tabela Atacado / Grande Porte' },
  { id: 'tab_04', nome: 'Tabela Especial / Contratos' },
];

// Vendedores / Representantes Comerciais do Grupo ENO (public.usuarios)
const VENDEDORES_OPTIONS = [
  { id: 'usr_vend_01', nome: 'Rodrigo Eno', email: 'rodrigo.eno@grupoeno.com.br' },
  { id: 'usr_vend_02', nome: 'Marcos Silva', email: 'marcos.silva@grupoeno.com.br' },
  { id: 'usr_vend_03', nome: 'Juliana Santos', email: 'juliana.santos@grupoeno.com.br' },
  { id: 'usr_vend_04', nome: 'André Oliveira', email: 'andre.oliveira@grupoeno.com.br' },
];

// Clientes Iniciais
const CLIENTES_INICIAIS: Cliente[] = [
  {
    id: 'cli_001',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PJ',
    razao_nome: 'Supermercados Alvorada Ltda',
    fantasia: 'Alvorada Supermercados',
    cpf_cnpj: '14.285.901/0001-44',
    ie_rg: '254.991.002-1',
    email: 'compras@alvorada.com.br',
    telefone: '(19) 3844-2200',
    endereco: {
      cep: '13840-000',
      logradouro: 'Av. Brasil',
      numero: '1540',
      bairro: 'Centro',
      municipio: 'Mogi Guaçu',
      uf: 'SP',
      complemento: 'Galpão 02'
    },
    forma_pagamento_id: 'fp_1',
    forma_pagamento_nome: 'Boleto Bancário',
    prazo_pagamento_id: 'pp_5',
    prazo_pagamento_nome: '28 Dias',
    vendedor_id: 'usr_vend_01',
    vendedor_nome: 'Rodrigo Eno',
    tabela_preco_id: 'tab_02',
    tabela_preco_nome: 'Tabela Varejo / Supermercados',
    ativo: true,
    criado_em: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cli_002',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PJ',
    razao_nome: 'Distribuidora de Alimentos Vale Verde S.A.',
    fantasia: 'Vale Verde Distribuição',
    cpf_cnpj: '08.774.321/0001-89',
    ie_rg: '109.432.880-3',
    email: 'pedidos@valeverdealimentos.com.br',
    telefone: '(11) 4590-1122',
    endereco: {
      cep: '06700-000',
      logradouro: 'Rodovia Raposo Tavares',
      numero: 'Km 28',
      bairro: 'Granja Viana',
      municipio: 'Cotia',
      uf: 'SP',
    },
    forma_pagamento_id: 'fp_1',
    forma_pagamento_nome: 'Boleto Bancário',
    prazo_pagamento_id: 'pp_6',
    prazo_pagamento_nome: '30 / 60 Dias (2x)',
    vendedor_id: 'usr_vend_02',
    vendedor_nome: 'Marcos Silva',
    tabela_preco_id: 'tab_01',
    tabela_preco_nome: 'Tabela Padrão (Distribuição)',
    ativo: true,
    criado_em: '2026-02-01T14:30:00Z',
  },
  {
    id: 'cli_003',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PF',
    razao_nome: 'Carlos Eduardo Nogueira',
    fantasia: 'Padaria e Confeitaria Nogueira',
    cpf_cnpj: '284.119.558-90',
    ie_rg: '34.889.012-X',
    email: 'carloseduardo.pan@gmail.com',
    telefone: '(19) 99812-4433',
    endereco: {
      cep: '13870-000',
      logradouro: 'Rua Saldanha Marinho',
      numero: '220',
      bairro: 'Vila Nova',
      municipio: 'São João da Boa Vista',
      uf: 'SP',
    },
    forma_pagamento_id: 'fp_2',
    forma_pagamento_nome: 'Pix',
    prazo_pagamento_id: 'pp_1',
    prazo_pagamento_nome: 'À Vista (0 dias)',
    vendedor_id: 'usr_vend_03',
    vendedor_nome: 'Juliana Santos',
    tabela_preco_id: 'tab_03',
    tabela_preco_nome: 'Tabela Atacado / Grande Porte',
    ativo: true,
    criado_em: '2026-02-18T09:15:00Z',
  },
];

// Dados históricos com múltiplos meses para alimentar o gráfico de faturamento e a lista em linhas
const HISTORICO_COMPRAS_MOCK: CompraCliente[] = [
  // Supermercados Alvorada (cli_001)
  {
    id: 'ped_102',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_001',
    numero_pedido: 'PED-2026-0058',
    emitido_em: '05/03/2026',
    data_entrega: '08/03/2026',
    status_nome: 'Faturado',
    mes_referencia: 'Mar/26',
    nota_fiscal: {
      numero: '004.912',
      serie: '1',
      chave_acesso: '35260314285901000144550010000049121004912088'
    },
    itens: [
      {
        produto_nome: 'Mandioca Descascada Congelada 1kg',
        tipo_embalagem: 'Caixa c/ 10 un (10kg)',
        quantidade: 200,
        preco_unitario: 78.50,
        total: 15700.00,
        lote_produto: 'LOTE-MC-2603-01'
      }
    ],
    valor_total: 15700.00,
    status_financeiro: 'A Vencer'
  },
  {
    id: 'ped_101',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_001',
    numero_pedido: 'PED-2026-0042',
    emitido_em: '28/02/2026',
    data_entrega: '02/03/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Fev/26',
    nota_fiscal: {
      numero: '004.821',
      serie: '1',
      chave_acesso: '35260214285901000144550010000048211004821019'
    },
    itens: [
      {
        produto_nome: 'Farinha de Mandioca Torrada Especial 1kg',
        tipo_embalagem: 'Fardo c/ 20 un (20kg)',
        quantidade: 150,
        preco_unitario: 110.00,
        total: 16500.00,
        lote_produto: 'LOTE-FM-2602-01'
      },
      {
        produto_nome: 'Goma de Tapioca Hidratada 500g',
        tipo_embalagem: 'Caixa c/ 24 un (12kg)',
        quantidade: 100,
        preco_unitario: 84.00,
        total: 8400.00,
        lote_produto: 'LOTE-TP-2602-03'
      }
    ],
    valor_total: 24900.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_103',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_001',
    numero_pedido: 'PED-2026-0018',
    emitido_em: '15/01/2026',
    data_entrega: '18/01/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Jan/26',
    nota_fiscal: {
      numero: '004.590',
      serie: '1',
      chave_acesso: '35260114285901000144550010000045901004590123'
    },
    itens: [
      {
        produto_nome: 'Polvilho Doce 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 180,
        preco_unitario: 65.00,
        total: 11700.00,
        lote_produto: 'LOTE-PD-2601-02'
      },
      {
        produto_nome: 'Goma de Tapioca Hidratada 500g',
        tipo_embalagem: 'Caixa c/ 24 un (12kg)',
        quantidade: 96,
        preco_unitario: 84.375,
        total: 8100.00,
        lote_produto: 'LOTE-TP-2601-01'
      }
    ],
    valor_total: 19800.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_104',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_001',
    numero_pedido: 'PED-2025-0894',
    emitido_em: '12/12/2025',
    data_entrega: '15/12/2025',
    status_nome: 'Entregue',
    mes_referencia: 'Dez/25',
    nota_fiscal: {
      numero: '004.310',
      serie: '1',
      chave_acesso: '35251214285901000144550010000043101004310999'
    },
    itens: [
      {
        produto_nome: 'Farinha de Mandioca Torrada Especial 1kg',
        tipo_embalagem: 'Fardo c/ 20 un (20kg)',
        quantidade: 220,
        preco_unitario: 108.00,
        total: 23760.00,
        lote_produto: 'LOTE-FM-2512-04'
      },
      {
        produto_nome: 'Mandioca Descascada Congelada 1kg',
        tipo_embalagem: 'Caixa c/ 10 un (10kg)',
        quantidade: 100,
        preco_unitario: 76.40,
        total: 7640.00,
        lote_produto: 'LOTE-MC-2512-01'
      }
    ],
    valor_total: 31400.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_105',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_001',
    numero_pedido: 'PED-2025-0780',
    emitido_em: '10/11/2025',
    data_entrega: '14/11/2025',
    status_nome: 'Entregue',
    mes_referencia: 'Nov/25',
    nota_fiscal: {
      numero: '004.095',
      serie: '1',
      chave_acesso: '35251114285901000144550010000040951004095882'
    },
    itens: [
      {
        produto_nome: 'Goma de Tapioca Hidratada 500g',
        tipo_embalagem: 'Caixa c/ 24 un (12kg)',
        quantidade: 270,
        preco_unitario: 83.33,
        total: 22500.00,
        lote_produto: 'LOTE-TP-2511-03'
      }
    ],
    valor_total: 22500.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_106',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_001',
    numero_pedido: 'PED-2025-0652',
    emitido_em: '18/10/2025',
    data_entrega: '21/10/2025',
    status_nome: 'Entregue',
    mes_referencia: 'Out/25',
    nota_fiscal: {
      numero: '003.882',
      serie: '1',
      chave_acesso: '35251014285901000144550010000038821003882771'
    },
    itens: [
      {
        produto_nome: 'Farinha de Mandioca Torrada Especial 1kg',
        tipo_embalagem: 'Fardo c/ 20 un (20kg)',
        quantidade: 170,
        preco_unitario: 107.05,
        total: 18200.00,
        lote_produto: 'LOTE-FM-2510-02'
      }
    ],
    valor_total: 18200.00,
    status_financeiro: 'Liquidado'
  },

  // Distribuidora Vale Verde (cli_002)
  {
    id: 'ped_201',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_002',
    numero_pedido: 'PED-2026-0035',
    emitido_em: '20/02/2026',
    data_entrega: '23/02/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Fev/26',
    nota_fiscal: {
      numero: '004.760',
      serie: '1',
      chave_acesso: '35260208774321000189550010000047601004760032'
    },
    itens: [
      {
        produto_nome: 'Fécula de Mandioca Industrial (Saco 25kg)',
        tipo_embalagem: 'Palete c/ 40 sacos (1.000kg)',
        quantidade: 10,
        preco_unitario: 4200.00,
        total: 42000.00,
        lote_produto: 'LOTE-FC-2602-02'
      },
      {
        produto_nome: 'Polvilho Doce 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 100,
        preco_unitario: 65.00,
        total: 6500.00,
        lote_produto: 'LOTE-PD-2602-01'
      }
    ],
    valor_total: 48500.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_202',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_002',
    numero_pedido: 'PED-2026-0012',
    emitido_em: '12/01/2026',
    data_entrega: '16/01/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Jan/26',
    nota_fiscal: {
      numero: '004.510',
      serie: '1',
      chave_acesso: '35260108774321000189550010000045101004510444'
    },
    itens: [
      {
        produto_nome: 'Fécula de Mandioca Industrial (Saco 25kg)',
        tipo_embalagem: 'Palete c/ 40 sacos (1.000kg)',
        quantidade: 12,
        preco_unitario: 4200.00,
        total: 50400.00,
        lote_produto: 'LOTE-FC-2601-01'
      },
      {
        produto_nome: 'Polvilho Azedo 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 25,
        preco_unitario: 64.00,
        total: 1600.00,
        lote_produto: 'LOTE-PA-2601-01'
      }
    ],
    valor_total: 52000.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_203',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_002',
    numero_pedido: 'PED-2025-0870',
    emitido_em: '08/12/2025',
    data_entrega: '11/12/2025',
    status_nome: 'Entregue',
    mes_referencia: 'Dez/25',
    nota_fiscal: {
      numero: '004.280',
      serie: '1',
      chave_acesso: '35251208774321000189550010000042801004280221'
    },
    itens: [
      {
        produto_nome: 'Fécula de Mandioca Industrial (Saco 25kg)',
        tipo_embalagem: 'Palete c/ 40 sacos (1.000kg)',
        quantidade: 15,
        preco_unitario: 4150.00,
        total: 62250.00,
        lote_produto: 'LOTE-FC-2512-03'
      },
      {
        produto_nome: 'Polvilho Doce 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 27,
        preco_unitario: 64.81,
        total: 1750.00,
        lote_produto: 'LOTE-PD-2512-02'
      }
    ],
    valor_total: 64000.00,
    status_financeiro: 'Liquidado'
  },

  // Carlos Eduardo Nogueira (cli_003)
  {
    id: 'ped_301',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_003',
    numero_pedido: 'PED-2026-0062',
    emitido_em: '06/03/2026',
    data_entrega: '07/03/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Mar/26',
    nota_fiscal: {
      numero: '004.930',
      serie: '1',
      chave_acesso: '35260328411955800019550010000049301004930015'
    },
    itens: [
      {
        produto_nome: 'Polvilho Azedo Especial 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 15,
        preco_unitario: 68.00,
        total: 1020.00,
        lote_produto: 'LOTE-PA-2603-01'
      },
      {
        produto_nome: 'Goma de Tapioca Hidratada 500g',
        tipo_embalagem: 'Caixa c/ 24 un (12kg)',
        quantidade: 10,
        preco_unitario: 84.00,
        total: 840.00,
        lote_produto: 'LOTE-TP-2603-02'
      }
    ],
    valor_total: 1860.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_302',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_003',
    numero_pedido: 'PED-2026-0028',
    emitido_em: '14/02/2026',
    data_entrega: '15/02/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Fev/26',
    nota_fiscal: {
      numero: '004.710',
      serie: '1',
      chave_acesso: '35260228411955800019550010000047101004710123'
    },
    itens: [
      {
        produto_nome: 'Polvilho Doce 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 20,
        preco_unitario: 65.00,
        total: 1300.00,
        lote_produto: 'LOTE-PD-2602-01'
      },
      {
        produto_nome: 'Polvilho Azedo Especial 1kg',
        tipo_embalagem: 'Fardo c/ 10 un (10kg)',
        quantidade: 17,
        preco_unitario: 67.65,
        total: 1150.00,
        lote_produto: 'LOTE-PA-2602-01'
      }
    ],
    valor_total: 2450.00,
    status_financeiro: 'Liquidado'
  },
  {
    id: 'ped_303',
    empresa_id: 'emp_grupo_eno',
    cliente_id: 'cli_003',
    numero_pedido: 'PED-2026-0005',
    emitido_em: '10/01/2026',
    data_entrega: '11/01/2026',
    status_nome: 'Entregue',
    mes_referencia: 'Jan/26',
    nota_fiscal: {
      numero: '004.490',
      serie: '1',
      chave_acesso: '35260128411955800019550010000044901004490772'
    },
    itens: [
      {
        produto_nome: 'Goma de Tapioca Hidratada 500g',
        tipo_embalagem: 'Caixa c/ 24 un (12kg)',
        quantidade: 23,
        preco_unitario: 86.08,
        total: 1980.00,
        lote_produto: 'LOTE-TP-2601-03'
      }
    ],
    valor_total: 1980.00,
    status_financeiro: 'Liquidado'
  }
];

// Tooltip customizado para o gráfico
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 text-xs">
        <p className="font-semibold text-slate-300">{label}</p>
        <p className="font-black text-emerald-400 font-mono text-sm mt-0.5">
          R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export interface CadastroClientesProps {
  clienteIdInicial?: string | null;
}

export function CadastroClientes({ clienteIdInicial }: CadastroClientesProps = {}) {
  const [clientes, setClientes] = useState<Cliente[]>(() => carregarClientes());
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PJ' | 'PF'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  
  // Controle de Navegação: 'lista', 'formulario' ou 'historico'
  const [modo, setModo] = useState<'lista' | 'formulario' | 'historico'>('lista');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      setClientes(carregarClientes());
    };
    window.addEventListener('clientes_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    return () => {
      window.removeEventListener('clientes_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  React.useEffect(() => {
    if (clienteIdInicial) {
      const cli = clientes.find(c => c.id === clienteIdInicial);
      if (cli) {
        setClienteSelecionado(cli);
        setModo('historico');
      }
    }
  }, [clienteIdInicial, clientes]);

  // Estado para controlar qual pedido está expandido (apenas um aberto por vez)
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState<string | null>(null);

  const toggleExpandirPedido = (pedidoId: string) => {
    setPedidoExpandidoId(prev => (prev === pedidoId ? null : pedidoId));
  };

  // Form State (Sem limite de crédito)
  const [formData, setFormData] = useState<{
    tipo_pessoa: 'PF' | 'PJ';
    razao_nome: string;
    fantasia: string;
    cpf_cnpj: string;
    ie_rg: string;
    email: string;
    telefone: string;
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    complemento: string;
    forma_pagamento_id: string;
    prazo_pagamento_id: string;
    vendedor_id: string;
    tabela_preco_id: string;
    ativo: boolean;
  }>({
    tipo_pessoa: 'PJ',
    razao_nome: '',
    fantasia: '',
    cpf_cnpj: '',
    ie_rg: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    municipio: '',
    uf: 'SP',
    complemento: '',
    forma_pagamento_id: 'fp_1',
    prazo_pagamento_id: 'pp_1',
    vendedor_id: 'usr_vend_01',
    tabela_preco_id: 'tab_01',
    ativo: true,
  });

  const abrirFormularioNovo = () => {
    setClienteSelecionado(null);
    setFormData({
      tipo_pessoa: 'PJ',
      razao_nome: '',
      fantasia: '',
      cpf_cnpj: '',
      ie_rg: '',
      email: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      municipio: '',
      uf: 'SP',
      complemento: '',
      forma_pagamento_id: 'fp_1',
      prazo_pagamento_id: 'pp_1',
      vendedor_id: 'usr_vend_01',
      tabela_preco_id: 'tab_01',
      ativo: true,
    });
    setModo('formulario');
  };

  const abrirFormularioEditar = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setFormData({
      tipo_pessoa: cliente.tipo_pessoa,
      razao_nome: cliente.razao_nome,
      fantasia: cliente.fantasia || '',
      cpf_cnpj: cliente.cpf_cnpj,
      ie_rg: cliente.ie_rg || '',
      email: cliente.email,
      telefone: cliente.telefone,
      cep: cliente.endereco.cep,
      logradouro: cliente.endereco.logradouro,
      numero: cliente.endereco.numero,
      bairro: cliente.endereco.bairro,
      municipio: cliente.endereco.municipio,
      uf: cliente.endereco.uf,
      complemento: cliente.endereco.complemento || '',
      forma_pagamento_id: cliente.forma_pagamento_id,
      prazo_pagamento_id: cliente.prazo_pagamento_id,
      vendedor_id: cliente.vendedor_id || 'usr_vend_01',
      tabela_preco_id: cliente.tabela_preco_id || 'tab_01',
      ativo: cliente.ativo,
    });
    setModo('formulario');
  };

  const abrirHistorico = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    // Limpa a seleção de pedido expandido ao abrir um novo cliente
    setPedidoExpandidoId(null);
    setModo('historico');
  };

  const alternarStatusCliente = (id: string) => {
    const atualizados = clientes.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c);
    setClientes(atualizados);
    salvarClientes(atualizados);
  };

  const salvarCliente = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.razao_nome.trim() || !formData.cpf_cnpj.trim()) {
      alert('A Razão Social/Nome e o CPF/CNPJ são campos obrigatórios para o cadastro.');
      return;
    }

    const fp = FORMAS_PAGAMENTO_OPTIONS.find(f => f.id === formData.forma_pagamento_id);
    const pp = PRAZOS_PAGAMENTO_OPTIONS.find(p => p.id === formData.prazo_pagamento_id);
    const vend = VENDEDORES_OPTIONS.find(v => v.id === formData.vendedor_id);
    const tab = TABELAS_PRECO_OPTIONS.find(t => t.id === formData.tabela_preco_id);

    if (clienteSelecionado) {
      // UPDATE
      const atualizados = clientes.map(c => c.id === clienteSelecionado.id ? {
        ...c,
        tipo_pessoa: formData.tipo_pessoa,
        razao_nome: formData.razao_nome,
        fantasia: formData.fantasia,
        cpf_cnpj: formData.cpf_cnpj,
        ie_rg: formData.ie_rg,
        email: formData.email,
        telefone: formData.telefone,
        endereco: {
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          bairro: formData.bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          complemento: formData.complemento
        },
        forma_pagamento_id: formData.forma_pagamento_id,
        forma_pagamento_nome: fp?.nome,
        prazo_pagamento_id: formData.prazo_pagamento_id,
        prazo_pagamento_nome: pp?.nome,
        vendedor_id: formData.vendedor_id,
        vendedor_nome: vend?.nome,
        tabela_preco_id: formData.tabela_preco_id,
        tabela_preco_nome: tab?.nome,
        ativo: formData.ativo,
      } : c);
      setClientes(atualizados);
      salvarClientes(atualizados);
    } else {
      // INSERT
      const novo: Cliente = {
        id: `cli_${Date.now()}`,
        empresa_id: 'emp_grupo_eno',
        tipo_pessoa: formData.tipo_pessoa,
        razao_nome: formData.razao_nome,
        fantasia: formData.fantasia,
        cpf_cnpj: formData.cpf_cnpj,
        ie_rg: formData.ie_rg,
        email: formData.email,
        telefone: formData.telefone,
        endereco: {
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          bairro: formData.bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          complemento: formData.complemento
        },
        forma_pagamento_id: formData.forma_pagamento_id,
        forma_pagamento_nome: fp?.nome,
        prazo_pagamento_id: formData.prazo_pagamento_id,
        prazo_pagamento_nome: pp?.nome,
        vendedor_id: formData.vendedor_id,
        vendedor_nome: vend?.nome,
        tabela_preco_id: formData.tabela_preco_id,
        tabela_preco_nome: tab?.nome,
        ativo: formData.ativo,
        criado_em: new Date().toISOString(),
      };
      const atualizados = [novo, ...clientes];
      setClientes(atualizados);
      salvarClientes(atualizados);
    }

    setModo('lista');
  };

  // Filtragem da lista
  const clientesFiltrados = clientes.filter(cliente => {
    const matchBusca = 
      cliente.razao_nome.toLowerCase().includes(busca.toLowerCase()) ||
      (cliente.fantasia && cliente.fantasia.toLowerCase().includes(busca.toLowerCase())) ||
      cliente.cpf_cnpj.includes(busca) ||
      cliente.email.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.endereco.municipio.toLowerCase().includes(busca.toLowerCase()) ||
      (cliente.vendedor_nome && cliente.vendedor_nome.toLowerCase().includes(busca.toLowerCase())) ||
      (cliente.tabela_preco_nome && cliente.tabela_preco_nome.toLowerCase().includes(busca.toLowerCase()));

    const matchTipo = filtroTipo === 'TODOS' || cliente.tipo_pessoa === filtroTipo;
    const matchStatus = 
      filtroStatus === 'TODOS' || 
      (filtroStatus === 'ATIVOS' && cliente.ativo) || 
      (filtroStatus === 'INATIVOS' && !cliente.ativo);

    return matchBusca && matchTipo && matchStatus;
  });

  // Compras do cliente selecionado
  const comprasDoCliente = useMemo(() => {
    if (!clienteSelecionado) return [];
    return HISTORICO_COMPRAS_MOCK.filter(p => p.cliente_id === clienteSelecionado.id);
  }, [clienteSelecionado]);

  const totalComprado = useMemo(() => {
    return comprasDoCliente.reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [comprasDoCliente]);

  // Dados estruturados para o Gráfico de Linhas Mensal do Faturamento
  const dadosGraficoMensal = useMemo(() => {
    const ordemMeses = ['Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26'];
    const mapaMeses: Record<string, number> = {
      'Out/25': 0,
      'Nov/25': 0,
      'Dez/25': 0,
      'Jan/26': 0,
      'Fev/26': 0,
      'Mar/26': 0,
    };

    comprasDoCliente.forEach(compra => {
      if (compra.mes_referencia in mapaMeses) {
        mapaMeses[compra.mes_referencia] += compra.valor_total;
      }
    });

    return ordemMeses.map(mes => ({
      mes,
      faturamento: mapaMeses[mes]
    }));
  }, [comprasDoCliente]);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white rounded-2xl border border-emerald-950/15 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden">
      
      {/* ========================================================================= */}
      {/* VISTA 1: LISTAGEM DE CLIENTES (COM COLUNA HISTÓRICO ENTRE STATUS E AÇÕES)  */}
      {/* ========================================================================= */}
      {modo === 'lista' && (
        <>
          {/* CABEÇALHO DA LISTA */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-sm">
                <Building2 className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Clientes
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {clientes.length} Cadastrados
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Novo Cliente */}
            <button
              onClick={abrirFormularioNovo}
              className="
                flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
                text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
                transition-all cursor-pointer
              "
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Cadastro de Cliente</span>
            </button>
          </div>

          {/* BARRA DE BUSCA E FILTROS */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-white">
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por Razão, Fantasia, CNPJ/CPF, Cidade..."
                className="
                  w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium
                  rounded-xl border border-slate-200 bg-slate-50/50
                  focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20
                  transition-all
                "
              />
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setFiltroTipo('TODOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroTipo === 'TODOS' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroTipo('PJ')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroTipo === 'PJ' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Pessoa Jurídica (PJ)
                </button>
                <button
                  onClick={() => setFiltroTipo('PF')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroTipo === 'PF' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Pessoa Física (PF)
                </button>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setFiltroStatus('TODOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroStatus === 'TODOS' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Status: Todos
                </button>
                <button
                  onClick={() => setFiltroStatus('ATIVOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroStatus === 'ATIVOS' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFiltroStatus('INATIVOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroStatus === 'INATIVOS' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Inativos
                </button>
              </div>
            </div>
          </div>

          {/* TABELA DE CLIENTES */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-10 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-6">Tipo</th>
                  <th className="py-3 px-6">Cliente (Razão Social / Fantasia)</th>
                  <th className="py-3 px-6">CPF / CNPJ & IE/RG</th>
                  <th className="py-3 px-6">Contato</th>
                  <th className="py-3 px-6">Cidade / UF</th>
                  <th className="py-3 px-6">Representante & Tabela</th>
                  <th className="py-3 px-6">Condição Comercial</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  
                  {/* COLUNA HISTÓRICO ENTRE STATUS E AÇÕES */}
                  <th className="py-3 px-6 text-center">Histórico</th>
                  
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Nenhum cliente encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cli) => (
                    <tr 
                      key={cli.id}
                      className="hover:bg-emerald-50/40 transition-colors group"
                    >
                      {/* Tipo Pessoa */}
                      <td className="py-3.5 px-6">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide
                          ${cli.tipo_pessoa === 'PJ' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}
                        `}>
                          {cli.tipo_pessoa === 'PJ' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {cli.tipo_pessoa}
                        </span>
                      </td>

                      {/* Nome e Fantasia */}
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {cli.razao_nome}
                        </div>
                        {cli.fantasia && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            {cli.fantasia}
                          </div>
                        )}
                      </td>

                      {/* Documentos */}
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">{cli.cpf_cnpj}</div>
                        {cli.ie_rg && <div className="text-slate-400">IE/RG: {cli.ie_rg}</div>}
                      </td>

                      {/* Contato */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span>{cli.telefone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{cli.email}</span>
                        </div>
                      </td>

                      {/* Cidade / UF */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">
                          {cli.endereco.municipio} - {cli.endereco.uf}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {cli.endereco.bairro}
                        </div>
                      </td>

                      {/* Representante & Tabela */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate max-w-[170px]">{cli.vendedor_nome || 'Não vinculado'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mt-0.5">
                          <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[170px]">{cli.tabela_preco_nome || 'Tabela Padrão'}</span>
                        </div>
                      </td>

                      {/* Condição Comercial */}
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-800">
                          {cli.prazo_pagamento_nome}
                        </div>
                        <div className="text-[11px] text-emerald-800 font-medium">
                          {cli.forma_pagamento_nome}
                        </div>
                      </td>

                      {/* Status Ativo/Inativo */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => alternarStatusCliente(cli.id)}
                          className="cursor-pointer"
                          title={cli.ativo ? 'Clique para Inativar' : 'Clique para Ativar'}
                        >
                          {cli.ativo ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                              <XCircle className="w-3 h-3 text-red-600" />
                              Inativo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* BOTÃO HISTÓRICO ENTRE STATUS E AÇÕES */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => abrirHistorico(cli)}
                          className="
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                            bg-emerald-50 hover:bg-emerald-800 text-emerald-900 hover:text-white
                            border border-emerald-200 hover:border-emerald-700
                            font-bold text-xs shadow-2xs hover:shadow-sm
                            transition-all cursor-pointer
                          "
                          title="Ver Histórico de Compras"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Histórico</span>
                        </button>
                      </td>

                      {/* Ações (Editar) */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => abrirFormularioEditar(cli)}
                          className="
                            p-2 rounded-lg text-slate-600 hover:text-emerald-900 hover:bg-emerald-100/60
                            transition-colors cursor-pointer
                          "
                          title="Editar Cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: FORMULÁRIO EM TELA CHEIA (SEM LIMITE DE CRÉDITO)                  */}
      {/* ========================================================================= */}
      {modo === 'formulario' && (
        <form onSubmit={salvarCliente} className="flex-1 w-full h-full flex flex-col overflow-hidden">
          
          {/* CABEÇALHO DO FORMULÁRIO */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-3.5 border-b border-slate-200 bg-slate-50/90">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="
                  flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                  border border-slate-300 bg-white hover:bg-slate-100
                  text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-sm
                "
                title="Voltar para a listagem"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {clienteSelecionado ? `Editar Cliente: ${clienteSelecionado.razao_nome}` : 'Novo Cadastro de Cliente'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Preencha os dados cadastrais, fiscais e endereço de entrega
                </p>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Cliente Ativo
                </span>
              </label>

              <button
                type="button"
                onClick={() => setModo('lista')}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="
                  flex items-center gap-2 px-6 py-2 rounded-xl
                  bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
                  text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
                  transition-all cursor-pointer
                "
              >
                <Save className="w-4 h-4" />
                <span>{clienteSelecionado ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
              </button>
            </div>
          </div>

          {/* CORPO DO FORMULÁRIO */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-slate-50/40">
            
            {/* SEÇÃO 1: CLASSIFICAÇÃO & DOCUMENTOS */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>1. Classificação e Documentos Oficiais</span>
                </div>

                {/* Alternador PF / PJ */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PJ' })}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.tipo_pessoa === 'PJ' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Pessoa Jurídica (PJ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PF' })}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.tipo_pessoa === 'PF' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Pessoa Física (PF)</span>
                  </button>
                </div>
              </div>

              {/* Grid Amplo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                
                {/* Razão Social / Nome Completo */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">(razao_nome)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.razao_nome}
                    onChange={(e) => setFormData({ ...formData, razao_nome: e.target.value })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Supermercados Alvorada Ltda' : 'Ex: Carlos Eduardo Nogueira'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Nome Fantasia */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nome Fantasia
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">(fantasia)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fantasia}
                    onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                    placeholder="Ex: Alvorada Supermercados"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* CPF / CNPJ */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">(cpf_cnpj)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Inscrição Estadual / RG */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Inscrição Estadual (IE)' : 'RG'}
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">(ie_rg)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ie_rg}
                    onChange={(e) => setFormData({ ...formData, ie_rg: e.target.value })}
                    placeholder="Ex: 254.991.002-1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Telefone */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telefone / WhatsApp <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">(telefone)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* E-mail */}
                <div className="sm:col-span-2 lg:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    E-mail Oficial (Contato, Pedidos e Envio de NF-e) <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">(email)</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="compras@empresa.com.br ou financeiro@empresa.com.br"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

              </div>
            </div>

            {/* SEÇÃO 2: ENDEREÇO DE ENTREGA E COBRANÇA */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span>2. Endereço de Entrega & Faturamento</span>
                </div>
              </div>

              {/* Grid de Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
                
                {/* CEP */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    CEP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Logradouro */}
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Logradouro (Rua, Avenida, Rodovia) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    placeholder="Ex: Av. Brasil ou Rodovia SP-340"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Número */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="1540 ou S/N"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Bairro */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Ex: Centro ou Distrito Industrial"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* UF */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estado (UF) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  >
                    {['SP', 'MG', 'RJ', 'PR', 'SC', 'RS', 'GO', 'MS', 'MT', 'BA', 'ES', 'DF'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>

                {/* Município */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Município <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="Ex: Mogi Guaçu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Complemento */}
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Complemento / Ponto de Referência / Instruções de Entrega
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Galpão 02, Docas 4 a 6, Entrada pela portaria lateral"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

              </div>
            </div>

            {/* SEÇÃO 3: POLÍTICAS COMERCIAIS & CARTEIRA */}
            <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-sm space-y-5">
              <div className="pb-3 border-b border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm uppercase tracking-wide">
                  <CreditCard className="w-4 h-4 text-emerald-800" />
                  <span>3. Condições Comerciais, Carteira & Tabela de Preço</span>
                </div>
                <span className="text-xs text-emerald-900/70 font-medium">
                  Define o representante, tabela de preço e condições de faturamento padrão
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vendedor / Representante */}
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Representante Responsável <span className="text-red-500">*</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">(vendedor_id)</span>
                    </label>
                    <select
                      value={formData.vendedor_id}
                      onChange={(e) => setFormData({ ...formData, vendedor_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    >
                      {VENDEDORES_OPTIONS.map(vend => (
                        <option key={vend.id} value={vend.id}>
                          {vend.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Usuário com acesso comercial vinculado a este cliente
                  </p>
                </div>

                {/* Tabela de Preço */}
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Tabela de Preço Vinculada <span className="text-red-500">*</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">(tabela_preco_id)</span>
                    </label>
                    <select
                      value={formData.tabela_preco_id}
                      onChange={(e) => setFormData({ ...formData, tabela_preco_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    >
                      {TABELAS_PRECO_OPTIONS.map(tab => (
                        <option key={tab.id} value={tab.id}>
                          {tab.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Usada automaticamente nos orçamentos e pedidos de venda
                  </p>
                </div>

                {/* Forma de Pagamento */}
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Forma de Pagamento Padrão <span className="text-red-500">*</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">(forma_pagamento_id)</span>
                    </label>
                    <select
                      value={formData.forma_pagamento_id}
                      onChange={(e) => setFormData({ ...formData, forma_pagamento_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    >
                      {FORMAS_PAGAMENTO_OPTIONS.map(fp => (
                        <option key={fp.id} value={fp.id}>{fp.nome}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Meio oficial de pagamento acordado comercialmente
                  </p>
                </div>

                {/* Prazo de Pagamento */}
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Prazo de Pagamento Padrão <span className="text-red-500">*</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">(prazo_pagamento_id)</span>
                    </label>
                    <select
                      value={formData.prazo_pagamento_id}
                      onChange={(e) => setFormData({ ...formData, prazo_pagamento_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    >
                      {PRAZOS_PAGAMENTO_OPTIONS.map(pp => (
                        <option key={pp.id} value={pp.id}>{pp.nome}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Intervalo de dias e faturamento pré-estabelecido
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RODAPÉ DO FORMULÁRIO */}
          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setModo('lista')}
              className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Cancelar e Voltar
            </button>

            <button
              type="submit"
              className="
                flex items-center gap-2 px-8 py-2.5 rounded-xl
                bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
                text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg
                transition-all cursor-pointer
              "
            >
              <Save className="w-4 h-4" />
              <span>{clienteSelecionado ? 'Salvar Alterações do Cliente' : 'Cadastrar Cliente Oficial'}</span>
            </button>
          </div>

        </form>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: HISTÓRICO DE COMPRAS DO CLIENTE (SEM CNPJ NO TOPO, COM GRÁFICO   */}
      {/* DE FATURAMENTO MENSAL E TABELA EM LINHAS EXPANSÍVEL AO CLIQUE)            */}
      {/* ========================================================================= */}
      {modo === 'historico' && clienteSelecionado && (
        <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-slate-50/60">
          
          {/* CABEÇALHO LIMPO: SEM CNPJ NO TOPO E SEM SUBTÍTULOS TÉCNICOS */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="
                  flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                  border border-slate-300 bg-white hover:bg-slate-100
                  text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-sm
                "
                title="Voltar para Clientes"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Clientes</span>
              </button>

              <div className="h-7 w-px bg-slate-200" />

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Histórico de Compras: {clienteSelecionado.razao_nome}
                  {clienteSelecionado.fantasia && (
                    <span className="text-sm font-semibold text-slate-500 ml-2 font-normal">
                      ({clienteSelecionado.fantasia})
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {/* Total Comprado */}
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Comprado Acumulado
              </span>
              <span className="text-xl font-black text-emerald-900 font-mono">
                R$ {totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SEÇÃO SUPERIOR: CARDS DE RESUMO + GRÁFICO DE LINHAS MENSAL DO FATURAMENTO */}
          <div className="px-8 py-5 border-b border-slate-200 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* 3 CARDS DE KPI (COLUNA ESQUERDA: 4 DE 12) */}
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Pedidos Realizados</span>
                    <span className="text-base font-black text-slate-900 font-mono">{comprasDoCliente.length} pedidos</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-800">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Ticket Médio por Pedido</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      R$ {comprasDoCliente.length > 0 ? (totalComprado / comprasDoCliente.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Última Compra Registrada</span>
                    <span className="text-sm font-black text-slate-900">
                      {comprasDoCliente.length > 0 ? comprasDoCliente[0].emitido_em : 'Nenhum pedido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* GRÁFICO DE LINHAS MENSAL DO FATURAMENTO (COLUNA DIREITA: 8 DE 12) */}
              <div className="lg:col-span-8 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-black uppercase tracking-wide text-slate-800">
                      Faturamento Mensal do Cliente (R$)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Últimos 6 Meses</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosGraficoMensal} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis 
                        dataKey="mes" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="faturamento" 
                        stroke="#059669" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: '#047857' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

          {/* LISTA EM LINHAS DOS PEDIDOS: CLIQUE ABRE MAIS INFORMAÇÕES DE PRODUTOS */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Pedidos de Venda ({comprasDoCliente.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Clique em qualquer linha para abrir e fechar os detalhes e lotes de produtos
                  </p>
                </div>
              </div>

              {comprasDoCliente.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-medium">
                  Nenhum pedido de venda registrado para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* Cabeçalho da Tabela em Linha (Sem Entregue e Sem Liquidado) */}
                  <div className="grid grid-cols-12 gap-3 px-6 py-3.5 bg-slate-100/80 text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <div className="col-span-3">Pedido</div>
                    <div className="col-span-2">Data de Emissão</div>
                    <div className="col-span-2">Data de Entrega</div>
                    <div className="col-span-3">Nota Fiscal (NF-e)</div>
                    <div className="col-span-2 text-right">Valor Total</div>
                  </div>

                  {/* Linhas de Pedido */}
                  {comprasDoCliente.map((compra) => {
                    const expandido = pedidoExpandidoId === compra.id;

                    return (
                      <div key={compra.id} className="transition-colors border-b border-slate-100 last:border-b-0">
                        
                        {/* Linha principal clicável */}
                        <div 
                          onClick={() => toggleExpandirPedido(compra.id)}
                          className={`
                            grid grid-cols-12 gap-3 px-6 py-4 items-center cursor-pointer transition-all
                            ${expandido ? 'bg-emerald-50/60' : 'hover:bg-slate-50/90'}
                          `}
                        >
                          {/* Pedido & Chevron */}
                          <div className="col-span-3 flex items-center gap-2.5">
                            <button
                              type="button"
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-800 hover:bg-emerald-100/60 transition-colors"
                            >
                              {expandido ? (
                                <ChevronUp className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {compra.numero_pedido}
                            </span>
                          </div>

                          {/* Emissão */}
                          <div className="col-span-2 text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{compra.emitido_em}</span>
                          </div>

                          {/* Entrega */}
                          <div className="col-span-2 text-xs font-medium text-slate-600">
                            {compra.data_entrega ? (
                              <span>{compra.data_entrega}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>

                          {/* Nota Fiscal */}
                          <div className="col-span-3 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            {compra.nota_fiscal ? (
                              <>
                                <ReceiptText className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="font-mono font-bold text-indigo-950">
                                  NF-e nº {compra.nota_fiscal.numero}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400">Pendente</span>
                            )}
                          </div>

                          {/* Valor Total */}
                          <div className="col-span-2 text-right">
                            <span className="font-mono text-sm font-black text-emerald-900">
                              R$ {compra.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Detalhes de Produtos Abertos Embaixo ao Clicar no Pedido */}
                        {expandido && (
                          <div className="px-8 py-5 bg-slate-50/70 border-t border-slate-200 space-y-4">
                            
                            {/* Chave de Acesso NF-e (se houver) */}
                            {compra.nota_fiscal?.chave_acesso && (
                              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-indigo-100 text-xs text-indigo-950 font-mono">
                                <div className="flex items-center gap-2">
                                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                                  <span><strong>Chave NF-e:</strong> {compra.nota_fiscal.chave_acesso}</span>
                                </div>
                                <span className="text-[11px] text-slate-400">Série {compra.nota_fiscal.serie}</span>
                              </div>
                            )}

                            {/* Produtos: Nome, Quantidade e Valor */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                              <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-800" />
                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                  Produtos do Pedido ({compra.itens.length} {compra.itens.length === 1 ? 'item' : 'itens'})
                                </h5>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                                    <tr>
                                      <th className="py-2.5 px-5">Produto</th>
                                      <th className="py-2.5 px-4">Embalagem</th>
                                      <th className="py-2.5 px-4 text-right">Quantidade</th>
                                      <th className="py-2.5 px-4 text-right">Valor Unitário</th>
                                      <th className="py-2.5 px-5 text-right">Valor Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {compra.itens.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Nome do Produto */}
                                        <td className="py-3 px-5 font-bold text-slate-900">
                                          {item.produto_nome}
                                        </td>
                                        {/* Embalagem */}
                                        <td className="py-3 px-4 text-slate-500">
                                          {item.tipo_embalagem}
                                        </td>
                                        {/* Quantidade */}
                                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                          {item.quantidade}
                                        </td>
                                        {/* Valor Unitário */}
                                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                                          R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        {/* Valor Total */}
                                        <td className="py-3 px-5 text-right font-mono font-black text-slate-900">
                                          R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
