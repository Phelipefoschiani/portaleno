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
  ArrowLeft, 
  TrendingUp, 
  Copy, 
  Check, 
  Scale, 
  Tractor, 
  Sprout, 
  AlertCircle, 
  X,
  Clock,
  Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface EntregaRomaneioMandioca {
  id: string;
  empresa_id: string;
  agricultor_id: string;
  numero_romaneio: string;
  data: string; // Ex: '08/03/2026'
  safra_referencia: string;
  mes_referencia: string; // Ex: 'Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26'
  // DADOS DA MANDIOCA & PAGAMENTO AO PRODUTOR
  peso_mandioca_kg: number; // Peso total da mandioca entregue pelo agricultor
  preco_kg: number; // Preço negociado por kg (R$/kg)
  valor_total: number; // peso_mandioca_kg * preco_kg (pago integralmente ao agricultor)
  // RESÍDUO, DESTOPO E CASCA (APENAS PARA CÁLCULO DE APROVEITAMENTO INDUSTRIAL DA FÁBRICA - NÃO DESCONTA DO AGRICULTOR)
  residuo_destopo_casca_kg: number; // Lançado pelo gerente (pode ser editado a qualquer momento)
  status_pagamento: 'Pago (PIX)' | 'Pendente';
  data_liquidacao_pix?: string;
  observacoes?: string;
}

export interface Agricultor {
  id: string;
  empresa_id: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_completo: string; // ou Razão Social
  nome_propriedade: string; // Sítio, Fazenda, Chácara
  cpf_cnpj: string;
  ie_rural: string; // Inscrição Estadual de Produtor Rural
  telefone: string;
  email?: string;
  endereco: {
    estrada_linha: string; // Ex: Linha Pinhalzinho, Km 4
    comunidade_bairro: string; // Ex: Bairro Água Doce
    municipio: string;
    uf: string;
    cep: string;
    ponto_referencia?: string; // Ponto de encontro para o caminhão
  };
  area_hectares?: number; // Área plantada de mandioca
  capacidade_estimada_safra_ton?: number;
  // DADOS FINANCEIROS & PIX
  chave_pix: string;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  titular_pix?: string;
  banco_nome?: string;
  agencia?: string;
  conta?: string;
  observacoes_financeiras?: string;
  ativo: boolean;
  criado_em: string;
}

// Mock inicial de agricultores fornecedores de mandioca do Grupo ENO
const AGRICULTORES_INICIAIS: Agricultor[] = [
  {
    id: 'agr_001',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PF',
    nome_completo: 'Sebastião Moreira dos Santos',
    nome_propriedade: 'Sítio São José',
    cpf_cnpj: '241.882.909-44',
    ie_rural: 'PR-904.312.11-0',
    telefone: '(43) 99654-2211',
    email: 'sebastiao.moreira.agro@gmail.com',
    endereco: {
      estrada_linha: 'Estrada Municipal da Água Doce, Km 6',
      comunidade_bairro: 'Bairro Água Doce',
      municipio: 'Jacarezinho',
      uf: 'PR',
      cep: '86400-000',
      ponto_referencia: 'Próximo à Capela São José (Entrada da Porteira Branca)'
    },
    area_hectares: 24,
    capacidade_estimada_safra_ton: 480,
    chave_pix: '241.882.909-44',
    tipo_chave_pix: 'CPF',
    titular_pix: 'Sebastião Moreira dos Santos',
    banco_nome: 'Banco do Brasil',
    agencia: '0158-9',
    conta: '14.520-X (Conta Produtor)',
    observacoes_financeiras: 'Pagamento de safra via PIX na pesagem',
    ativo: true,
    criado_em: '2026-01-10T08:00:00Z',
  },
  {
    id: 'agr_002',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PF',
    nome_completo: 'Antônio Carlos de Oliveira',
    nome_propriedade: 'Fazenda Santa Helena',
    cpf_cnpj: '315.774.208-15',
    ie_rural: 'PR-842.119.50-2',
    telefone: '(43) 99877-3344',
    email: 'antoniocarlos.helena@hotmail.com',
    endereco: {
      estrada_linha: 'Rodovia PR-431, Km 12 (Entrada da Barra Grande)',
      comunidade_bairro: 'Barra Grande',
      municipio: 'Ribeirão Claro',
      uf: 'PR',
      cep: '86410-000',
      ponto_referencia: 'Caminho do Lago, após o silo de grãos'
    },
    area_hectares: 58,
    capacidade_estimada_safra_ton: 1100,
    chave_pix: '43998773344',
    tipo_chave_pix: 'Celular',
    titular_pix: 'Antônio Carlos de Oliveira',
    banco_nome: 'Sicredi Agro',
    agencia: '0718',
    conta: '55.431-2',
    observacoes_financeiras: 'PIX celular com confirmação imediata',
    ativo: true,
    criado_em: '2026-01-18T10:30:00Z',
  },
  {
    id: 'agr_003',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PJ',
    nome_completo: 'Agropecuária & Mandioca Terra Viva Ltda',
    nome_propriedade: 'Fazenda Terra Viva',
    cpf_cnpj: '18.442.890/0001-62',
    ie_rural: 'SP-458.910.334',
    telefone: '(19) 3862-9900',
    email: 'financeiro@terravivaagro.com.br',
    endereco: {
      estrada_linha: 'Estrada Velha de Mogi, Gleba 4',
      comunidade_bairro: 'Zona Rural Sul',
      municipio: 'Mogi Mirim',
      uf: 'SP',
      cep: '13800-970',
      ponto_referencia: 'Em frente ao entreposto da cooperativa'
    },
    area_hectares: 120,
    capacidade_estimada_safra_ton: 2600,
    chave_pix: '18.442.890/0001-62',
    tipo_chave_pix: 'CNPJ',
    titular_pix: 'Agropecuária & Mandioca Terra Viva Ltda',
    banco_nome: 'Bradesco',
    agencia: '2104',
    conta: '0018542-9',
    observacoes_financeiras: 'PIX corporativo CNPJ',
    ativo: true,
    criado_em: '2026-02-05T14:15:00Z',
  },
  {
    id: 'agr_004',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PF',
    nome_completo: 'Benedito Ramos da Silva',
    nome_propriedade: 'Chácara Bela Vista',
    cpf_cnpj: '109.845.228-70',
    ie_rural: 'PR-775.402.19-8',
    telefone: '(43) 99120-8855',
    email: 'benedito.ramos.rural@gmail.com',
    endereco: {
      estrada_linha: 'Estrada do Bairro dos Macacos, Lote 14',
      comunidade_bairro: 'Bairro dos Macacos',
      municipio: 'Carlópolis',
      uf: 'PR',
      cep: '86420-000',
      ponto_referencia: 'Segunda porteira de aroeira à direita da ponte'
    },
    area_hectares: 18,
    capacidade_estimada_safra_ton: 360,
    chave_pix: 'benedito.ramos.rural@gmail.com',
    tipo_chave_pix: 'E-mail',
    titular_pix: 'Benedito Ramos da Silva',
    banco_nome: 'Sicoob',
    agencia: '4350',
    conta: '19.880-1',
    observacoes_financeiras: 'PIX e-mail após conferência da pesagem',
    ativo: true,
    criado_em: '2026-02-20T11:40:00Z',
  }
];

// Romaneios de recebimento de mandioca (Valor pago = Mandioca KG * Preço/KG. Destopo/Casca é controle interno)
const ENTREGAS_MANDIOCA_MOCK: EntregaRomaneioMandioca[] = [
  // Sebastião Moreira (agr_001)
  {
    id: 'rom_001',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_001',
    numero_romaneio: 'ROM-MAN-2026-0042',
    data: '08/03/2026',
    safra_referencia: 'Safra 2026',
    mes_referencia: 'Mar/26',
    peso_mandioca_kg: 24500,
    preco_kg: 0.60,
    valor_total: 14700.00,
    residuo_destopo_casca_kg: 2100,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '08/03/2026 15:42',
    observacoes: 'Carga sadia de boa qualidade. Aproveitamento industrial de 91,4%.'
  },
  {
    id: 'rom_002',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_001',
    numero_romaneio: 'ROM-MAN-2026-0031',
    data: '22/02/2026',
    safra_referencia: 'Safra 2026',
    mes_referencia: 'Fev/26',
    peso_mandioca_kg: 18200,
    preco_kg: 0.65,
    valor_total: 11830.00,
    residuo_destopo_casca_kg: 1450,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '22/02/2026 17:10',
    observacoes: 'Raízes recém-arrancadas de alta qualidade.'
  },
  {
    id: 'rom_003',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_001',
    numero_romaneio: 'ROM-MAN-2026-0012',
    data: '16/01/2026',
    safra_referencia: 'Safra 2026',
    mes_referencia: 'Jan/26',
    peso_mandioca_kg: 21000,
    preco_kg: 0.60,
    valor_total: 12600.00,
    residuo_destopo_casca_kg: 1890,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '16/01/2026 14:05',
    observacoes: 'Primeiro lote do ano.'
  },
  {
    id: 'rom_004',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_001',
    numero_romaneio: 'ROM-MAN-2025-0188',
    data: '18/12/2025',
    safra_referencia: 'Safra 2025/2026',
    mes_referencia: 'Dez/25',
    peso_mandioca_kg: 19500,
    preco_kg: 0.58,
    valor_total: 11310.00,
    residuo_destopo_casca_kg: 1650,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '18/12/2025 16:30',
    observacoes: 'Encerramento de dezembro.'
  },
  {
    id: 'rom_005',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_001',
    numero_romaneio: 'ROM-MAN-2025-0145',
    data: '14/11/2025',
    safra_referencia: 'Safra 2025/2026',
    mes_referencia: 'Nov/25',
    peso_mandioca_kg: 22800,
    preco_kg: 0.58,
    valor_total: 13224.00,
    residuo_destopo_casca_kg: 2200,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '14/11/2025 18:00',
    observacoes: 'Lote recebido em período de chuva.'
  },
  {
    id: 'rom_006',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_001',
    numero_romaneio: 'ROM-MAN-2025-0102',
    data: '20/10/2025',
    safra_referencia: 'Safra 2025/2026',
    mes_referencia: 'Out/25',
    peso_mandioca_kg: 16000,
    preco_kg: 0.56,
    valor_total: 8960.00,
    residuo_destopo_casca_kg: 1300,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '20/10/2025 15:15',
    observacoes: 'Início da safra intermediária.'
  },
  // Antônio Carlos (agr_002)
  {
    id: 'rom_007',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_002',
    numero_romaneio: 'ROM-MAN-2026-0048',
    data: '06/03/2026',
    safra_referencia: 'Safra 2026',
    mes_referencia: 'Mar/26',
    peso_mandioca_kg: 32000,
    preco_kg: 0.60,
    valor_total: 19200.00,
    residuo_destopo_casca_kg: 2900,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '06/03/2026 16:20',
  },
  {
    id: 'rom_008',
    empresa_id: 'emp_grupo_eno',
    agricultor_id: 'agr_002',
    numero_romaneio: 'ROM-MAN-2026-0025',
    data: '12/02/2026',
    safra_referencia: 'Safra 2026',
    mes_referencia: 'Fev/26',
    peso_mandioca_kg: 28500,
    preco_kg: 0.60,
    valor_total: 17100.00,
    residuo_destopo_casca_kg: 2400,
    status_pagamento: 'Pago (PIX)',
    data_liquidacao_pix: '12/02/2026 14:00',
  }
];

export function CadastroAgricultores() {
  const [agricultores, setAgricultores] = useState<Agricultor[]>(AGRICULTORES_INICIAIS);
  const [romaneios, setRomaneios] = useState<EntregaRomaneioMandioca[]>(ENTREGAS_MANDIOCA_MOCK);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PF' | 'PJ'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Modo de exibição: 'lista', 'formulario' ou 'historico'
  const [modo, setModo] = useState<'lista' | 'formulario' | 'historico'>('lista');
  const [agricultorSelecionado, setAgricultorSelecionado] = useState<Agricultor | null>(null);

  // Modal para lançamento de novo Romaneio
  const [modalNovoRomaneio, setModalNovoRomaneio] = useState(false);
  const [novoRomaneioForm, setNovoRomaneioForm] = useState({
    data: new Date().toLocaleDateString('pt-BR'),
    peso_mandioca_kg: '',
    preco_kg: '0.60',
    residuo_destopo_casca_kg: '',
    status_pagamento: 'Pago (PIX)' as 'Pago (PIX)' | 'Pendente',
    observacoes: ''
  });

  // Modal / Edição rápida de Resíduo, Destopo e Casca pós-gravação
  const [romaneioEdicaoDestopo, setRomaneioEdicaoDestopo] = useState<EntregaRomaneioMandioca | null>(null);
  const [destopoInputKg, setDestopoInputKg] = useState<string>('');

  // Feedback de cópia da chave PIX
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Formulário de Agricultor
  const [formData, setFormData] = useState<{
    tipo_pessoa: 'PF' | 'PJ';
    nome_completo: string;
    nome_propriedade: string;
    cpf_cnpj: string;
    ie_rural: string;
    telefone: string;
    email: string;
    estrada_linha: string;
    comunidade_bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ponto_referencia: string;
    area_hectares: string;
    capacidade_estimada_safra_ton: string;
    chave_pix: string;
    tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
    titular_pix: string;
    banco_nome: string;
    agencia: string;
    conta: string;
    observacoes_financeiras: string;
    ativo: boolean;
  }>({
    tipo_pessoa: 'PF',
    nome_completo: '',
    nome_propriedade: '',
    cpf_cnpj: '',
    ie_rural: '',
    telefone: '',
    email: '',
    estrada_linha: '',
    comunidade_bairro: '',
    municipio: '',
    uf: 'PR',
    cep: '',
    ponto_referencia: '',
    area_hectares: '',
    capacidade_estimada_safra_ton: '',
    chave_pix: '',
    tipo_chave_pix: 'CPF',
    titular_pix: '',
    banco_nome: '',
    agencia: '',
    conta: '',
    observacoes_financeiras: '',
    ativo: true,
  });

  const copiarChavePix = (chave: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => {
      setCopiadoId(null);
    }, 2000);
  };

  const abrirFormularioNovo = () => {
    setAgricultorSelecionado(null);
    setFormData({
      tipo_pessoa: 'PF',
      nome_completo: '',
      nome_propriedade: '',
      cpf_cnpj: '',
      ie_rural: '',
      telefone: '',
      email: '',
      estrada_linha: '',
      comunidade_bairro: '',
      municipio: 'Jacarezinho',
      uf: 'PR',
      cep: '86400-000',
      ponto_referencia: '',
      area_hectares: '',
      capacidade_estimada_safra_ton: '',
      chave_pix: '',
      tipo_chave_pix: 'CPF',
      titular_pix: '',
      banco_nome: 'Banco do Brasil',
      agencia: '',
      conta: '',
      observacoes_financeiras: '',
      ativo: true,
    });
    setModo('formulario');
  };

  const abrirFormularioEdicao = (agr: Agricultor) => {
    setAgricultorSelecionado(agr);
    setFormData({
      tipo_pessoa: agr.tipo_pessoa,
      nome_completo: agr.nome_completo,
      nome_propriedade: agr.nome_propriedade,
      cpf_cnpj: agr.cpf_cnpj,
      ie_rural: agr.ie_rural || '',
      telefone: agr.telefone,
      email: agr.email || '',
      estrada_linha: agr.endereco.estrada_linha,
      comunidade_bairro: agr.endereco.comunidade_bairro,
      municipio: agr.endereco.municipio,
      uf: agr.endereco.uf,
      cep: agr.endereco.cep,
      ponto_referencia: agr.endereco.ponto_referencia || '',
      area_hectares: agr.area_hectares ? String(agr.area_hectares) : '',
      capacidade_estimada_safra_ton: agr.capacidade_estimada_safra_ton ? String(agr.capacidade_estimada_safra_ton) : '',
      chave_pix: agr.chave_pix,
      tipo_chave_pix: agr.tipo_chave_pix,
      titular_pix: agr.titular_pix || '',
      banco_nome: agr.banco_nome || '',
      agencia: agr.agencia || '',
      conta: agr.conta || '',
      observacoes_financeiras: agr.observacoes_financeiras || '',
      ativo: agr.ativo,
    });
    setModo('formulario');
  };

  const abrirHistorico = (agr: Agricultor) => {
    setAgricultorSelecionado(agr);
    setModo('historico');
  };

  const alternarStatusAgricultor = (id: string) => {
    setAgricultores(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a));
  };

  const salvarAgricultor = (e: React.FormEvent) => {
    e.preventDefault();

    if (agricultorSelecionado) {
      setAgricultores(prev => prev.map(a => a.id === agricultorSelecionado.id ? {
        ...a,
        tipo_pessoa: formData.tipo_pessoa,
        nome_completo: formData.nome_completo,
        nome_propriedade: formData.nome_propriedade,
        cpf_cnpj: formData.cpf_cnpj,
        ie_rural: formData.ie_rural,
        telefone: formData.telefone,
        email: formData.email,
        endereco: {
          estrada_linha: formData.estrada_linha,
          comunidade_bairro: formData.comunidade_bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          cep: formData.cep,
          ponto_referencia: formData.ponto_referencia
        },
        area_hectares: formData.area_hectares ? Number(formData.area_hectares) : undefined,
        capacidade_estimada_safra_ton: formData.capacidade_estimada_safra_ton ? Number(formData.capacidade_estimada_safra_ton) : undefined,
        chave_pix: formData.chave_pix,
        tipo_chave_pix: formData.tipo_chave_pix,
        titular_pix: formData.titular_pix || formData.nome_completo,
        banco_nome: formData.banco_nome,
        agencia: formData.agencia,
        conta: formData.conta,
        observacoes_financeiras: formData.observacoes_financeiras,
        ativo: formData.ativo,
      } : a));
    } else {
      const novo: Agricultor = {
        id: `agr_${Date.now()}`,
        empresa_id: 'emp_grupo_eno',
        tipo_pessoa: formData.tipo_pessoa,
        nome_completo: formData.nome_completo,
        nome_propriedade: formData.nome_propriedade,
        cpf_cnpj: formData.cpf_cnpj,
        ie_rural: formData.ie_rural,
        telefone: formData.telefone,
        email: formData.email,
        endereco: {
          estrada_linha: formData.estrada_linha,
          comunidade_bairro: formData.comunidade_bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          cep: formData.cep,
          ponto_referencia: formData.ponto_referencia
        },
        area_hectares: formData.area_hectares ? Number(formData.area_hectares) : undefined,
        capacidade_estimada_safra_ton: formData.capacidade_estimada_safra_ton ? Number(formData.capacidade_estimada_safra_ton) : undefined,
        chave_pix: formData.chave_pix,
        tipo_chave_pix: formData.tipo_chave_pix,
        titular_pix: formData.titular_pix || formData.nome_completo,
        banco_nome: formData.banco_nome,
        agencia: formData.agencia,
        conta: formData.conta,
        observacoes_financeiras: formData.observacoes_financeiras,
        ativo: formData.ativo,
        criado_em: new Date().toISOString(),
      };
      setAgricultores(prev => [novo, ...prev]);
    }

    setModo('lista');
  };

  // Alternar pagamento do Romaneio (Pago PIX ou Pendente)
  const alternarPagamentoRomaneio = (romId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRomaneios(prev => prev.map(r => {
      if (r.id === romId) {
        const novoStatus = r.status_pagamento === 'Pago (PIX)' ? 'Pendente' : 'Pago (PIX)';
        return {
          ...r,
          status_pagamento: novoStatus,
          data_liquidacao_pix: novoStatus === 'Pago (PIX)' ? new Date().toLocaleString('pt-BR') : undefined
        };
      }
      return r;
    }));
  };

  // Abrir modal de edição de destopo/casca para um romaneio já gravado
  const abrirEdicaoDestopo = (rom: EntregaRomaneioMandioca, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRomaneioEdicaoDestopo(rom);
    setDestopoInputKg(String(rom.residuo_destopo_casca_kg || ''));
  };

  // Salvar alteração de destopo
  const salvarEdicaoDestopo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!romaneioEdicaoDestopo) return;

    const novoDestopo = Number(destopoInputKg) || 0;
    setRomaneios(prev => prev.map(r => {
      if (r.id === romaneioEdicaoDestopo.id) {
        return {
          ...r,
          residuo_destopo_casca_kg: novoDestopo
        };
      }
      return r;
    }));

    setRomaneioEdicaoDestopo(null);
  };

  // Salvar novo Romaneio lançado pelo Gerente
  const salvarNovoRomaneio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agricultorSelecionado) return;

    const pesoMandioca = Number(novoRomaneioForm.peso_mandioca_kg) || 0;
    const preco = Number(novoRomaneioForm.preco_kg) || 0.60;
    // O valor pago é calculado pelo peso total de mandioca entregue (não desconta destopo/casca do agricultor)
    const valorTotal = pesoMandioca * preco;
    const residuo = Number(novoRomaneioForm.residuo_destopo_casca_kg) || 0;

    const dataObj = new Date();
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mesRef = `${mesesAbrev[dataObj.getMonth()]}/${String(dataObj.getFullYear()).slice(-2)}`;

    const novoRom: EntregaRomaneioMandioca = {
      id: `rom_${Date.now()}`,
      empresa_id: 'emp_grupo_eno',
      agricultor_id: agricultorSelecionado.id,
      numero_romaneio: `ROM-MAN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      data: novoRomaneioForm.data,
      safra_referencia: 'Safra 2026',
      mes_referencia: mesRef,
      peso_mandioca_kg: pesoMandioca,
      preco_kg: preco,
      valor_total: valorTotal,
      residuo_destopo_casca_kg: residuo,
      status_pagamento: novoRomaneioForm.status_pagamento,
      data_liquidacao_pix: novoRomaneioForm.status_pagamento === 'Pago (PIX)' ? new Date().toLocaleString('pt-BR') : undefined,
      observacoes: novoRomaneioForm.observacoes || undefined
    };

    setRomaneios(prev => [novoRom, ...prev]);
    setModalNovoRomaneio(false);
    setNovoRomaneioForm({
      data: new Date().toLocaleDateString('pt-BR'),
      peso_mandioca_kg: '',
      preco_kg: '0.60',
      residuo_destopo_casca_kg: '',
      status_pagamento: 'Pago (PIX)',
      observacoes: ''
    });
  };

  // Excluir romaneio
  const excluirRomaneio = (romId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Tem certeza que deseja remover este romaneio?')) {
      setRomaneios(prev => prev.filter(r => r.id !== romId));
    }
  };

  // Filtragem dos agricultores
  const agricultoresFiltrados = agricultores.filter(agr => {
    const matchBusca = 
      agr.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      agr.nome_propriedade.toLowerCase().includes(busca.toLowerCase()) ||
      agr.cpf_cnpj.includes(busca) ||
      agr.endereco.municipio.toLowerCase().includes(busca.toLowerCase()) ||
      agr.chave_pix.toLowerCase().includes(busca.toLowerCase());

    const matchTipo = filtroTipo === 'TODOS' || agr.tipo_pessoa === filtroTipo;
    const matchStatus = 
      filtroStatus === 'TODOS' || 
      (filtroStatus === 'ATIVOS' && agr.ativo) || 
      (filtroStatus === 'INATIVOS' && !agr.ativo);

    return matchBusca && matchTipo && matchStatus;
  });

  // Entregas do agricultor selecionado
  const entregasDoAgricultor = useMemo(() => {
    if (!agricultorSelecionado) return [];
    return romaneios.filter(e => e.agricultor_id === agricultorSelecionado.id);
  }, [agricultorSelecionado, romaneios]);

  // Totais consolidados
  const totalPagoProdutor = useMemo(() => {
    return entregasDoAgricultor
      .filter(e => e.status_pagamento === 'Pago (PIX)')
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [entregasDoAgricultor]);

  const totalPendenteProdutor = useMemo(() => {
    return entregasDoAgricultor
      .filter(e => e.status_pagamento === 'Pendente')
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [entregasDoAgricultor]);

  const totalKgMandioca = useMemo(() => {
    return entregasDoAgricultor.reduce((acc, curr) => acc + curr.peso_mandioca_kg, 0);
  }, [entregasDoAgricultor]);

  const totalKgResiduoDestopoCasca = useMemo(() => {
    return entregasDoAgricultor.reduce((acc, curr) => acc + curr.residuo_destopo_casca_kg, 0);
  }, [entregasDoAgricultor]);

  // DADOS DO GRÁFICO COM AS 3 LINHAS:
  // 1. Linha de Mandioca (KG entregue)
  // 2. Linha de Valor Total (R$)
  // 3. Linha de Resíduo, Destopo e Casca (KG de refugo apontado pelo gerente)
  const dadosGrafico3Linhas = useMemo(() => {
    const ordemMeses = ['Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26'];
    const mapa: Record<string, { kgMandioca: number; valorTotal: number; kgResiduo: number }> = {
      'Out/25': { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 },
      'Nov/25': { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 },
      'Dez/25': { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 },
      'Jan/26': { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 },
      'Fev/26': { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 },
      'Mar/26': { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 },
    };

    entregasDoAgricultor.forEach(e => {
      if (e.mes_referencia in mapa) {
        mapa[e.mes_referencia].kgMandioca += e.peso_mandioca_kg;
        mapa[e.mes_referencia].valorTotal += e.valor_total;
        mapa[e.mes_referencia].kgResiduo += e.residuo_destopo_casca_kg;
      }
    });

    return ordemMeses.map(mes => ({
      mes,
      kgMandioca: mapa[mes].kgMandioca,
      valorTotal: mapa[mes].valorTotal,
      kgResiduo: mapa[mes].kgResiduo
    }));
  }, [entregasDoAgricultor]);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white rounded-2xl border border-emerald-950/15 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. MODO: LISTAGEM DE AGRICULTORES DE MANDIOCA             */}
      {/* ========================================================= */}
      {modo === 'lista' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* CABEÇALHO DA LISTA (PADRÃO CLIENTES & FORNECEDORES) */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-sm">
                <Tractor className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Agricultores & Produtores de Mandioca
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {agricultores.length} Cadastrados
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Novo Agricultor */}
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
              <span>Novo Cadastro de Agricultor</span>
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
                placeholder="Buscar por Produtor, Sítio/Fazenda, CPF/CNPJ, Município, Chave PIX..."
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
                  onClick={() => setFiltroTipo('PF')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroTipo === 'PF' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Produtor Familiar (PF)
                </button>
                <button
                  onClick={() => setFiltroTipo('PJ')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroTipo === 'PJ' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Fazenda / Agro (PJ)
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

          {/* TABELA DE AGRICULTORES */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-10 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-6">Tipo</th>
                  <th className="py-3 px-6">Produtor / Sítio ou Fazenda</th>
                  <th className="py-3 px-6">CPF / CNPJ & IE Rural</th>
                  <th className="py-3 px-6">Contato</th>
                  <th className="py-3 px-6">Localização Rural</th>
                  <th className="py-3 px-6">Chave PIX (Pagamento Safra)</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center">Romaneios de Mandioca</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {agricultoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nenhum agricultor encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  agricultoresFiltrados.map((agr) => (
                    <tr 
                      key={agr.id}
                      className="hover:bg-emerald-50/40 transition-colors group"
                    >
                      {/* Tipo */}
                      <td className="py-3.5 px-6">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide
                          ${agr.tipo_pessoa === 'PJ' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}
                        `}>
                          {agr.tipo_pessoa === 'PJ' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {agr.tipo_pessoa === 'PJ' ? 'PJ Agro' : 'Produtor PF'}
                        </span>
                      </td>

                      {/* Nome do Agricultor & Propriedade */}
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {agr.nome_completo}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold mt-0.5">
                          <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{agr.nome_propriedade}</span>
                          {agr.area_hectares && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({agr.area_hectares} ha de mandioca)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CPF / CNPJ e IE Rural */}
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">{agr.cpf_cnpj}</div>
                        {agr.ie_rural && (
                          <div className="text-slate-400 text-[10px]">IE: {agr.ie_rural}</div>
                        )}
                      </td>

                      {/* Contato */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span>{agr.telefone}</span>
                        </div>
                        {agr.email ? (
                          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{agr.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Sem e-mail</span>
                        )}
                      </td>

                      {/* Localização Rural */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">
                          {agr.endereco.municipio} - {agr.endereco.uf}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[180px]" title={agr.endereco.estrada_linha}>
                          {agr.endereco.comunidade_bairro}
                        </div>
                      </td>

                      {/* CHAVE PIX EM DESTAQUE COM COPIAR */}
                      <td className="py-3.5 px-6">
                        {agr.chave_pix ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-950 bg-emerald-50 border border-emerald-300/80 px-2.5 py-1 rounded-lg">
                              <span className="text-[9px] bg-emerald-800 text-white font-black px-1.5 py-0.5 rounded tracking-wider">
                                {agr.tipo_chave_pix || 'PIX'}
                              </span>
                              <span className="truncate max-w-[160px] font-bold" title={agr.chave_pix}>
                                {agr.chave_pix}
                              </span>
                            </div>
                            <button
                              onClick={(e) => copiarChavePix(agr.chave_pix, agr.id, e)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                              title="Copiar Chave PIX"
                            >
                              {copiadoId === agr.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Não informada</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => alternarStatusAgricultor(agr.id)}
                          className="cursor-pointer"
                          title={agr.ativo ? 'Clique para Inativar' : 'Clique para Ativar'}
                        >
                          {agr.ativo ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-300">
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Inativo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Romaneios e Histórico */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => abrirHistorico(agr)}
                          className="
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
                            text-white text-xs font-bold
                            transition-all cursor-pointer shadow-2xs hover:shadow-xs
                          "
                          title="Ver Romaneios, KG e Resíduo/Destopo/Casca"
                        >
                          <Scale className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Entregas & KG</span>
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => abrirFormularioEdicao(agr)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Agricultor"
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
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MODO: FORMULÁRIO DE CADASTRO / EDIÇÃO                  */}
      {/* ========================================================= */}
      {modo === 'formulario' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* TOPO DO FORMULÁRIO */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModo('lista')}
                className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Tractor className="w-5 h-5 text-emerald-800" />
                  <span>{agricultorSelecionado ? 'Editar Cadastro de Produtor de Mandioca' : 'Novo Cadastro de Produtor de Mandioca'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Cadastre os dados rurais do produtor de mandioca e chave PIX para pagamentos da safra
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-agricultor"
                className="
                  flex items-center gap-2 px-6 py-2 rounded-xl
                  bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
                  text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
                  transition-all cursor-pointer
                "
              >
                <Save className="w-4 h-4" />
                <span>Salvar Produtor</span>
              </button>
            </div>
          </div>

          {/* FORMULÁRIO ROLÁVEL */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            <form id="form-agricultor" onSubmit={salvarAgricultor} className="max-w-5xl mx-auto space-y-6">
              
              {/* SEÇÃO 1: DADOS DO PRODUTOR E DA PROPRIEDADE */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                  <User className="w-4 h-4 text-emerald-800" />
                  <span>1. Identificação do Produtor e da Propriedade Rural</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Produtor <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_pessoa: 'PF' })}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          formData.tipo_pessoa === 'PF' 
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Produtor PF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_pessoa: 'PJ' })}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          formData.tipo_pessoa === 'PJ' 
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Fazenda PJ</span>
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo do Produtor / Razão Social <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome_completo}
                      onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                      placeholder="Ex: Sebastião Moreira dos Santos"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome da Propriedade / Sítio / Fazenda <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Sprout className="w-4 h-4 text-emerald-700 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={formData.nome_propriedade}
                        onChange={(e) => setFormData({ ...formData, nome_propriedade: e.target.value })}
                        placeholder="Ex: Sítio São José"
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {formData.tipo_pessoa === 'PF' ? 'CPF do Produtor' : 'CNPJ da Agropecuária'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Inscrição Estadual de Produtor Rural (IE)
                    </label>
                    <input
                      type="text"
                      value={formData.ie_rural}
                      onChange={(e) => setFormData({ ...formData, ie_rural: e.target.value })}
                      placeholder="Ex: PR-904.312.11-0"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp para Contato <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(43) 90000-0000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail (Opcional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="produtor@email.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: LOCALIZAÇÃO RURAL & LOGÍSTICA DE RECOLHIMENTO */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                    <MapPin className="w-4 h-4 text-emerald-800" />
                    <span>2. Localização da Propriedade & Acesso para Caminhões</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estrada / Linha Rural / Rodovia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.estrada_linha}
                      onChange={(e) => setFormData({ ...formData, estrada_linha: e.target.value })}
                      placeholder="Ex: Estrada Municipal da Água Doce, Km 6"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Comunidade / Bairro Rural <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.comunidade_bairro}
                      onChange={(e) => setFormData({ ...formData, comunidade_bairro: e.target.value })}
                      placeholder="Ex: Bairro Água Doce"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estado (UF) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {['PR', 'SP', 'MG', 'RJ', 'SC', 'RS', 'GO', 'MS', 'MT', 'BA', 'ES', 'DF'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Município <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.municipio}
                      onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                      placeholder="Ex: Jacarezinho"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CEP Rural
                    </label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="86400-000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ponto de Referência / Como Chegar na Porteira
                    </label>
                    <input
                      type="text"
                      value={formData.ponto_referencia}
                      onChange={(e) => setFormData({ ...formData, ponto_referencia: e.target.value })}
                      placeholder="Ex: Porteira branca à esquerda após a Capela São José"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Área Plantada de Mandioca (Hectares)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.area_hectares}
                      onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                      placeholder="Ex: 24.5 ha"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: DADOS PARA PAGAMENTO & CHAVE PIX */}
              <div className="p-6 rounded-2xl bg-emerald-50/50 border-2 border-emerald-300/80 shadow-md space-y-5">
                <div className="pb-3 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-sm uppercase tracking-wide">
                    <CreditCard className="w-4.5 h-4.5 text-emerald-800" />
                    <span>3. Dados para Pagamento da Safra & Chave PIX</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                      Tipo de Chave PIX <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.tipo_chave_pix}
                      onChange={(e) => setFormData({ ...formData, tipo_chave_pix: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs sm:text-sm font-bold bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="CPF">CPF</option>
                      <option value="Celular">Telefone Celular</option>
                      <option value="E-mail">E-mail</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="Aleatória">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                      Chave PIX do Agricultor <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.chave_pix}
                        onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                        placeholder="Digite o CPF, celular com DDD, e-mail ou chave aleatória"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs sm:text-sm font-mono font-bold bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 pr-16"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] font-black bg-emerald-800 text-white px-2 py-0.5 rounded tracking-wider">
                        PIX
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do Titular da Conta PIX
                    </label>
                    <input
                      type="text"
                      value={formData.titular_pix}
                      onChange={(e) => setFormData({ ...formData, titular_pix: e.target.value })}
                      placeholder="Nome completo do titular"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Banco / Cooperativa de Crédito
                    </label>
                    <input
                      type="text"
                      value={formData.banco_nome}
                      onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                      placeholder="Ex: Banco do Brasil / Sicredi / Sicoob"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Agência e Conta (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.conta}
                      onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                      placeholder="Ag. 0000 / CC 00000-0"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instruções Financeiras & Acordos de Safra
                  </label>
                  <input
                    type="text"
                    value={formData.observacoes_financeiras}
                    onChange={(e) => setFormData({ ...formData, observacoes_financeiras: e.target.value })}
                    placeholder="Ex: Pagamento imediato via PIX após pesagem na balança"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODO: HISTÓRICO DE ENTREGAS DE MANDIOCA (ROMANEIOS)    */}
      {/* ========================================================= */}
      {modo === 'historico' && agricultorSelecionado && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* TOPO DO HISTÓRICO */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModo('lista')}
                className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{agricultorSelecionado.nome_completo}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    {agricultorSelecionado.nome_propriedade}
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>CPF/CNPJ: <strong className="font-mono text-slate-700">{agricultorSelecionado.cpf_cnpj}</strong></span>
                  <span>•</span>
                  <span>{agricultorSelecionado.endereco.municipio} - {agricultorSelecionado.endereco.uf}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 font-mono text-emerald-900 font-bold">
                    <span className="text-[10px] bg-emerald-800 text-white px-1.5 rounded">PIX</span>
                    <span>{agricultorSelecionado.chave_pix}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copiarChavePix(agricultorSelecionado.chave_pix, 'hist')}
                className="
                  flex items-center gap-2 px-3.5 py-2 rounded-xl
                  border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs
                  transition-all cursor-pointer shadow-2xs
                "
              >
                {copiadoId === 'hist' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span>Chave Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-emerald-700" />
                    <span>Copiar PIX</span>
                  </>
                )}
              </button>

              {/* Tag informativa de compras em Pedidos de Compra */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold">
                <span>📦 Lançamento de compras em <strong>Pedidos &gt; Pedido de Compra</strong></span>
              </div>
            </div>
          </div>

          {/* CONTEÚDO DO HISTÓRICO */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
            
            {/* CARDS COM RESUMO ESPECÍFICO DE MANDIOCA */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Card 1: Volume de Mandioca (KG) */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Mandioca (KG)</span>
                  <Scale className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-900 font-mono">
                  {totalKgMandioca.toLocaleString('pt-BR')} <span className="text-sm font-bold text-emerald-700">KG</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Total de mandioca recebida
                </div>
              </div>

              {/* Card 2: Resíduo, Destopo e Casca (KG) */}
              <div className="p-5 bg-white rounded-2xl border border-amber-200/80 shadow-sm bg-amber-50/30">
                <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
                  <span>Resíduo, Destopo & Casca</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-amber-900 font-mono">
                  {totalKgResiduoDestopoCasca.toLocaleString('pt-BR')} <span className="text-sm font-bold text-amber-700">KG</span>
                </div>
                <div className="mt-1 text-[11px] text-amber-700 font-medium">
                  {totalKgMandioca > 0 
                    ? `${((totalKgResiduoDestopoCasca / totalKgMandioca) * 100).toFixed(1)}% refugo fábrica (não desconta do produtor)`
                    : 'Apenas para cálculo de aproveitamento'}
                </div>
              </div>

              {/* Card 3: Total Liquidado via PIX */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Total Pago (PIX)</span>
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
                  R$ {totalPagoProdutor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Liquidado via PIX
                </div>
              </div>

              {/* Card 4: Pendente */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Pendente</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-amber-950 font-mono">
                  R$ {totalPendenteProdutor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Valores em aberto
                </div>
              </div>
            </div>

            {/* GRÁFICO COM AS 3 LINHAS */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-black text-sm text-slate-900 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-emerald-800" />
                  <span>Acompanhamento: Mandioca (KG), Valor Total (R$) e Resíduo/Destopo/Casca (KG)</span>
                </div>
                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                  Últimos 6 Meses
                </span>
              </div>

              {/* Gráfico Recharts com 3 Linhas e Eixo Duplo (KG vs R$) */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico3Linhas} margin={{ top: 15, right: 35, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    
                    {/* Eixo Esquerdo: Volume em KG */}
                    <YAxis 
                      yAxisId="kg"
                      tick={{ fontSize: 11, fill: '#059669' }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)} t`}
                    />

                    {/* Eixo Direito: Valor em R$ */}
                    <YAxis 
                      yAxisId="valor"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#4f46e5' }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    />

                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xl min-w-[240px] space-y-2">
                              <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                                <span>{label}</span>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Safra</span>
                              </div>
                              <div className="space-y-1.5 pt-0.5">
                                {payload.map((entry, index) => {
                                  const isMandioca = entry.dataKey === 'kgMandioca';
                                  const isValor = entry.dataKey === 'valorTotal';
                                  const isResiduo = entry.dataKey === 'kgResiduo';

                                  const labelText = entry.name;
                                  const valueFormatted = isValor 
                                    ? `R$ ${(entry.value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : `${(entry.value as number).toLocaleString('pt-BR')} KG`;

                                  const textColor = isMandioca ? 'text-emerald-800' : isValor ? 'text-indigo-800' : 'text-amber-800';
                                  const dotColor = isMandioca ? 'bg-emerald-600' : isValor ? 'bg-indigo-600' : 'bg-amber-600';

                                  return (
                                    <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                                        <span>{labelText}:</span>
                                      </div>
                                      <span className={`font-black font-mono ${textColor}`}>
                                        {valueFormatted}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />

                    {/* LINHA 1: Mandioca em KG */}
                    <Line 
                      yAxisId="kg"
                      type="monotone" 
                      dataKey="kgMandioca" 
                      name="Mandioca (KG)"
                      stroke="#059669" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />

                    {/* LINHA 2: Valor Total em R$ */}
                    <Line 
                      yAxisId="valor"
                      type="monotone" 
                      dataKey="valorTotal" 
                      name="Valor Total (R$)"
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />

                    {/* LINHA 3: Resíduo, Destopo e Casca (KG) */}
                    <Line 
                      yAxisId="kg"
                      type="monotone" 
                      dataKey="kgResiduo" 
                      name="Resíduo, Destopo e Casca (KG)"
                      stroke="#d97706" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#d97706', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda Informativa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                  <span><strong>Mandioca (KG):</strong> Volume total entregue pelo produtor.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0"></span>
                  <span><strong>Valor Total (R$):</strong> Total pago (Mandioca KG × R$/KG).</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-600 shrink-0"></span>
                  <span><strong>Resíduo, Destopo e Casca:</strong> Indicador para aproveitamento na fábrica.</span>
                </div>
              </div>
            </div>

            {/* TABELA DE CARGAS E ROMANEIOS EM LINHAS (SEM SANFONA) */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-black text-sm text-slate-900 uppercase tracking-wide">
                  <Scale className="w-4 h-4 text-emerald-800" />
                  <span>Cargas e Romaneios de Mandioca ({entregasDoAgricultor.length})</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Clique no botão de destopo para lançar/ajustar a quebra técnica a qualquer momento
                </span>
              </div>

              {entregasDoAgricultor.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum romaneio de mandioca registrado para este produtor ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="py-3 px-4">Romaneio</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4 text-right">Mandioca (KG)</th>
                        <th className="py-3 px-4 text-right">Preço (R$/KG)</th>
                        <th className="py-3 px-4 text-right">Valor Total (R$)</th>
                        <th className="py-3 px-4 text-center">Destopo, Resíduo & Casca</th>
                        <th className="py-3 px-4 text-center">Pagamento</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {entregasDoAgricultor.map((rom) => {
                        const isPago = rom.status_pagamento === 'Pago (PIX)';
                        const percAproveitamento = rom.peso_mandioca_kg > 0 
                          ? (((rom.peso_mandioca_kg - rom.residuo_destopo_casca_kg) / rom.peso_mandioca_kg) * 100).toFixed(1)
                          : '100.0';

                        return (
                          <tr key={rom.id} className="hover:bg-emerald-50/40 transition-colors">
                            {/* Romaneio */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 font-mono">
                                {rom.numero_romaneio}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {rom.safra_referencia}
                              </div>
                            </td>

                            {/* Data */}
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              {rom.data}
                            </td>

                            {/* Mandioca (KG) */}
                            <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                              {rom.peso_mandioca_kg.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-slate-400">KG</span>
                            </td>

                            {/* Preço R$/KG */}
                            <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-semibold">
                              R$ {rom.preco_kg.toFixed(2)}
                            </td>

                            {/* Valor Total R$ */}
                            <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-950 text-sm">
                              R$ {rom.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Resíduo, Destopo e Casca (com botão para alterar mesmo depois de gravado) */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                                <div className="text-left font-mono">
                                  <span className="font-black text-amber-900 text-xs">
                                    {rom.residuo_destopo_casca_kg.toLocaleString('pt-BR')} KG
                                  </span>
                                  <span className="text-[10px] text-amber-700 ml-1">
                                    ({percAproveitamento}% aprov.)
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => abrirEdicaoDestopo(rom, e)}
                                  className="p-1 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                                  title="Editar Destopo e Casca deste romaneio"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Pagamento (Pago PIX / Pendente com toggle com 1 clique) */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={(e) => alternarPagamentoRomaneio(rom.id, e)}
                                className="cursor-pointer transition-transform active:scale-95"
                                title="Clique para alternar o status do pagamento"
                              >
                                {isPago ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    Pago (PIX)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <Clock className="w-3 h-3" />
                                    Pendente
                                  </span>
                                )}
                              </button>
                            </td>

                            {/* Ações */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={(e) => abrirEdicaoDestopo(rom, e)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar Destopo / Refugo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => excluirRomaneio(rom.id, e)}
                                  className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir Romaneio"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: EDITAR DESTOPO, RESÍDUO E CASCA PÓS-GRAVAÇÃO    */}
      {/* (AMPLO E HORIZONTAL)                                      */}
      {/* ========================================================= */}
      {romaneioEdicaoDestopo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Ajustar Destopo, Resíduo & Casca da Mandioca
                  </h3>
                  <p className="text-[11px] text-amber-800">Romaneio {romaneioEdicaoDestopo.numero_romaneio} • {romaneioEdicaoDestopo.produtor_nome}</p>
                </div>
              </div>
              <button 
                onClick={() => setRomaneioEdicaoDestopo(null)}
                className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoDestopo} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">Dados da Carga de Raiz</span>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Romaneio:</span>
                    <span className="font-mono font-bold text-slate-800">{romaneioEdicaoDestopo.numero_romaneio}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Data de Entrada:</span>
                    <span className="font-bold text-slate-800">{romaneioEdicaoDestopo.data}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Peso Bruto Mandioca:</span>
                    <span className="font-mono font-bold text-emerald-900">{romaneioEdicaoDestopo.peso_mandioca_kg.toLocaleString('pt-BR')} KG</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Teor de Amido:</span>
                    <span className="font-mono font-bold text-slate-800">{romaneioEdicaoDestopo.teor_amido}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1.5">
                      Resíduo, Destopo e Casca (KG) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={destopoInputKg}
                      onChange={(e) => setDestopoInputKg(e.target.value)}
                      placeholder="Ex: 2100"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-sm font-mono font-bold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 bg-amber-50/20"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      Este valor atualiza imediatamente o gráfico de 3 linhas e o cálculo de aproveitamento da mandioca na fábrica (não altera o valor a pagar ao produtor).
                    </p>
                  </div>

                  {destopoInputKg && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
                      <span className="text-emerald-900 font-bold">Aproveitamento Industrial Líquido:</span>
                      <span className="font-mono font-black text-emerald-950 text-base">
                        {(
                          ((romaneioEdicaoDestopo.peso_mandioca_kg - Number(destopoInputKg)) / romaneioEdicaoDestopo.peso_mandioca_kg) * 100
                        ).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRomaneioEdicaoDestopo(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    flex items-center gap-2 px-5 py-2 rounded-xl
                    bg-amber-700 hover:bg-amber-800 active:bg-amber-900
                    text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
                    transition-all cursor-pointer
                  "
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Destopo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
