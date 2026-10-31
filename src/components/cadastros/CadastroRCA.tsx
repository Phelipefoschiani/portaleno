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
  AlertCircle, 
  X,
  Clock,
  Trash2,
  Percent,
  Briefcase,
  Users,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Layers,
  ShieldCheck,
  Package,
  ShoppingBag,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  carregarRcas,
  salvarRcas,
  carregarVendasRca,
  salvarVendasRca,
  montarClientesVinculados,
  montarVendasComissaoRca,
  EVENTO_CADASTROS_ATUALIZADOS,
  ModeloComissao,
  ComissaoGrupo,
  ComissaoCliente,
  ClienteVinculado,
  RCA,
  VendaComissaoRCA,
} from '../../data/cadastrosData';
import { carregarClientes, salvarClientes } from '../../data/clientesData';
import { carregarPedidosVenda } from '../../data/pedidosVendaData';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { formatarDataBR, hojeISO } from '../../lib/datas';
import { ultimosMesesReferencia } from '../../lib/mesesReferencia';

/**
 * Grupos de Produtos do Grupo ENO
 */
export const GRUPOS_PRODUTO_ENO = [
  { id: 'grp_01', nome: 'Fécula de Mandioca Nativa Industrial' },
  { id: 'grp_02', nome: 'Féculas Modificadas (Catiônica / Oxidada)' },
  { id: 'grp_03', nome: 'Farinhas de Mandioca (Torrada / Especial)' },
  { id: 'grp_04', nome: 'Polvilhos Especiais (Azedo / Doce)' },
  { id: 'grp_05', nome: 'Mandioca Descascada & Congelada' },
  { id: 'grp_06', nome: 'Goma de Tapioca Hidratada' },
];

/**
 * Tabelas de Preço do Grupo ENO
 */
export const TABELAS_PRECO_OPTIONS = [
  { id: 'tab_01', nome: 'Tabela Padrão (Distribuição)' },
  { id: 'tab_02', nome: 'Tabela Varejo / Supermercados' },
  { id: 'tab_03', nome: 'Tabela Atacado / Grande Porte' },
  { id: 'tab_04', nome: 'Tabela Especial / Contratos' },
];

// Tipos e persistência centralizados em cadastrosData (lidos também pelo Portal RCA e Pedidos)
export type {
  ModeloComissao,
  ComissaoGrupo,
  ComissaoCliente,
  ClienteVinculado,
  RCA,
  VendaComissaoRCA,
} from '../../data/cadastrosData';

export interface CadastroRCAProps {
  onNavigateToCliente?: (clienteId: string) => void;
}

export function CadastroRCA({ onNavigateToCliente }: CadastroRCAProps = {}) {
  // RCAs persistidos (cadastrosData) e sincronizados entre telas
  const [rcas, setRcas] = useListaPersistida<RCA>(carregarRcas, salvarRcas, EVENTO_CADASTROS_ATUALIZADOS);
  // Status de pagamento das comissões (o restante vem dos pedidos de venda reais)
  const [vendasSalvas, setVendasSalvas] = useListaPersistida<VendaComissaoRCA>(carregarVendasRca, salvarVendasRca, EVENTO_CADASTROS_ATUALIZADOS);

  // Clientes reais (Cadastro de Clientes) + pedidos reais para estatísticas da carteira
  const [versaoDados, setVersaoDados] = useState(0);
  React.useEffect(() => {
    const h = () => setVersaoDados(v => v + 1);
    window.addEventListener('clientes_updated', h);
    window.addEventListener('pedidos_venda_updated', h);
    window.addEventListener('sistema_reset_updated', h);
    return () => {
      window.removeEventListener('clientes_updated', h);
      window.removeEventListener('pedidos_venda_updated', h);
      window.removeEventListener('sistema_reset_updated', h);
    };
  }, []);
  const pedidosVenda = useMemo(() => carregarPedidosVenda(), [versaoDados]);
  const clientesDisponiveis = useMemo<ClienteVinculado[]>(
    () => montarClientesVinculados(carregarClientes(), pedidosVenda),
    [versaoDados, pedidosVenda]
  );
  const vendas = useMemo(() => montarVendasComissaoRca(pedidosVenda, vendasSalvas), [pedidosVenda, vendasSalvas]);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroRegiao, setFiltroRegiao] = useState<string>('TODAS');
  
  const [selectedRcaId, setSelectedRcaId] = useState<string | null>(() => carregarRcas()[0]?.id || null);
  const selectedRca = useMemo(() => rcas.find(r => r.id === selectedRcaId) || null, [rcas, selectedRcaId]);
  const setSelectedRca = (r: RCA | null) => setSelectedRcaId(r ? r.id : null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [copiedPix, setCopiedPix] = useState(false);
  
  // Modal de Detalhes do Cliente Vinculado
  const [clienteModal, setClienteModal] = useState<ClienteVinculado | null>(null);

  // Estados temporários para adicionar regras no formulário
  const [novoGrupoId, setNovoGrupoId] = useState<string>(GRUPOS_PRODUTO_ENO[0].id);
  const [novoGrupoPercentual, setNovoGrupoPercentual] = useState<number>(3.5);
  const [novoClienteId, setNovoClienteId] = useState<string>('');
  const [novoClientePercentual, setNovoClientePercentual] = useState<number>(3.0);

  // Formulário de Edição / Criação
  const [formData, setFormData] = useState<Partial<RCA>>({
    tipo_pessoa: 'PF',
    status: 'Ativo',
    modelo_comissao: 'geral',
    comissao_padrao_percentual: 3.5,
    comissoes_por_grupo: [],
    comissoes_por_cliente: [],
    tipo_chave_pix: 'CPF',
    estados_atuacao: ['PR'],
    clientes_vinculados_ids: [],
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      municipio: '',
      uf: 'PR',
      complemento: ''
    }
  });

  // Regiões únicas
  const regioesOptions = useMemo(() => {
    return Array.from(new Set(rcas.map(r => r.regiao_atuacao).filter(Boolean)));
  }, [rcas]);

  // Filtro de RCAs
  const rcasFiltrados = useMemo(() => {
    return rcas.filter(rca => {
      const matchBusca = 
        rca.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
        (rca.nome_fantasia && rca.nome_fantasia.toLowerCase().includes(busca.toLowerCase())) ||
        rca.codigo_rca.toLowerCase().includes(busca.toLowerCase()) ||
        rca.cpf_cnpj.includes(busca) ||
        rca.regiao_atuacao.toLowerCase().includes(busca.toLowerCase()) ||
        rca.endereco.municipio.toLowerCase().includes(busca.toLowerCase());
      
      const matchStatus = filtroStatus === 'TODOS' ? true : rca.status === filtroStatus;
      const matchRegiao = filtroRegiao === 'TODAS' ? true : rca.regiao_atuacao === filtroRegiao;

      return matchBusca && matchStatus && matchRegiao;
    });
  }, [rcas, busca, filtroStatus, filtroRegiao]);

  // Vendas do RCA Selecionado
  const vendasDoRca = useMemo(() => {
    if (!selectedRca) return [];
    return vendas.filter(v => v.rca_id === selectedRca.id);
  }, [vendas, selectedRca]);

  // Clientes Vinculados ao RCA Selecionado
  const clientesDoRca = useMemo(() => {
    if (!selectedRca) return [];
    // Fonte da verdade do vínculo: Cliente.vendedor_id === id do RCA
    return clientesDisponiveis.filter(c => c.vendedor_id === selectedRca.id);
  }, [selectedRca, clientesDisponiveis]);

  // Estatísticas Financeiras do RCA Selecionado (Sem metas)
  const statsRca = useMemo(() => {
    if (!selectedRca) return { totalFaturado: 0, totalComissao: 0, comissaoPendente: 0, comissaoPaga: 0 };
    
    const totalFaturado = vendasDoRca.reduce((acc, curr) => acc + curr.valor_faturado, 0);
    const totalComissao = vendasDoRca.reduce((acc, curr) => acc + curr.valor_comissao, 0);
    const comissaoPendente = vendasDoRca
      .filter(v => v.status_comissao !== 'Pago (PIX)')
      .reduce((acc, curr) => acc + curr.valor_comissao, 0);
    const comissaoPaga = vendasDoRca
      .filter(v => v.status_comissao === 'Pago (PIX)')
      .reduce((acc, curr) => acc + curr.valor_comissao, 0);

    return {
      totalFaturado,
      totalComissao,
      comissaoPendente,
      comissaoPaga
    };
  }, [selectedRca, vendasDoRca]);

  // Gráfico Mensal de Faturamento e Comissões (Sem linha de meta)
  const dadosGraficoMensal = useMemo(() => {
    if (!selectedRca) return [];
    const meses = ultimosMesesReferencia(6);
    
    return meses.map(mes => {
      const vendasMes = vendasDoRca.filter(v => v.mes_referencia === mes);
      const faturamento = vendasMes.reduce((acc, curr) => acc + curr.valor_faturado, 0);
      const comissao = vendasMes.reduce((acc, curr) => acc + curr.valor_comissao, 0);
      return {
        mes,
        faturamento,
        comissao
      };
    });
  }, [selectedRca, vendasDoRca]);

  // Form Handlers
  const handleNovoRca = () => {
    const maiorCodigo = rcas.reduce((max, r) => Math.max(max, Number(String(r.codigo_rca || '').replace(/\D/g, '')) || 0), 0);
    const proximoNum = Math.max(rcas.length, maiorCodigo) + 1;
    const cod = `RCA-${proximoNum.toString().padStart(3, '0')}`;
    
    setFormData({
      codigo_rca: cod,
      tipo_pessoa: 'PF',
      status: 'Ativo',
      modelo_comissao: 'geral',
      comissao_padrao_percentual: 3.5,
      comissoes_por_grupo: [],
      comissoes_por_cliente: [],
      clientes_vinculados_ids: [],
      tipo_chave_pix: 'CPF',
      estados_atuacao: ['PR'],
      data_admissao_contrato: formatarDataBR(hojeISO()),
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        municipio: '',
        uf: 'PR',
        complemento: ''
      }
    });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditarRca = (rca: RCA) => {
    setFormData({
      ...rca,
      comissoes_por_grupo: [...(rca.comissoes_por_grupo || [])],
      comissoes_por_cliente: [...(rca.comissoes_por_cliente || [])],
      clientes_vinculados_ids: clientesDisponiveis.filter(c => c.vendedor_id === rca.id).map(c => c.id),
      endereco: { ...rca.endereco }
    });
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleAdicionarComissaoGrupo = () => {
    const grupo = GRUPOS_PRODUTO_ENO.find(g => g.id === novoGrupoId);
    if (!grupo) return;
    
    const existentes = formData.comissoes_por_grupo || [];
    if (existentes.some(g => g.grupo_id === grupo.id)) {
      alert('Este grupo de produto já possui taxa cadastrada.');
      return;
    }

    const nova: ComissaoGrupo = {
      id: `cg_${Date.now()}`,
      grupo_id: grupo.id,
      grupo_nome: grupo.nome,
      percentual: Number(novoGrupoPercentual)
    };

    setFormData(prev => ({
      ...prev,
      comissoes_por_grupo: [...(prev.comissoes_por_grupo || []), nova]
    }));
  };

  const handleRemoverComissaoGrupo = (id: string) => {
    setFormData(prev => ({
      ...prev,
      comissoes_por_grupo: (prev.comissoes_por_grupo || []).filter(g => g.id !== id)
    }));
  };

  const handleAdicionarComissaoCliente = () => {
    const cli = clientesDisponiveis.find(c => c.id === novoClienteId);
    if (!cli) return;

    const existentes = formData.comissoes_por_cliente || [];
    if (existentes.some(c => c.cliente_id === cli.id)) {
      alert('Este cliente já possui comissão específica cadastrada.');
      return;
    }

    const nova: ComissaoCliente = {
      id: `cc_${Date.now()}`,
      cliente_id: cli.id,
      cliente_nome: cli.razao_social,
      cliente_cidade: `${cli.municipio}/${cli.uf}`,
      percentual: Number(novoClientePercentual)
    };

    setFormData(prev => ({
      ...prev,
      comissoes_por_cliente: [...(prev.comissoes_por_cliente || []), nova]
    }));
  };

  const handleRemoverComissaoCliente = (id: string) => {
    setFormData(prev => ({
      ...prev,
      comissoes_por_cliente: (prev.comissoes_por_cliente || []).filter(c => c.id !== id)
    }));
  };

  const handleToggleClienteVinculado = (cliId: string) => {
    const atuais = formData.clientes_vinculados_ids || [];
    if (atuais.includes(cliId)) {
      setFormData(prev => ({
        ...prev,
        clientes_vinculados_ids: atuais.filter(id => id !== cliId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        clientes_vinculados_ids: [...atuais, cliId]
      }));
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_completo || !formData.cpf_cnpj) {
      alert('Por favor, preencha o Nome e o CPF/CNPJ do RCA.');
      return;
    }

    if (isCreating) {
      const novoRca: RCA = {
        id: `rca_${Date.now()}`,
        empresa_id: 'emp_grupo_eno',
        codigo_rca: formData.codigo_rca || `RCA-${(rcas.length + 1).toString().padStart(3, '0')}`,
        tipo_pessoa: formData.tipo_pessoa || 'PF',
        nome_completo: formData.nome_completo || '',
        nome_fantasia: formData.nome_fantasia || '',
        cpf_cnpj: formData.cpf_cnpj || '',
        rg_ie: formData.rg_ie || '',
        telefone: formData.telefone || '',
        whatsapp: formData.whatsapp || '',
        email: formData.email || '',
        endereco: {
          cep: formData.endereco?.cep || '',
          logradouro: formData.endereco?.logradouro || '',
          numero: formData.endereco?.numero || '',
          bairro: formData.endereco?.bairro || '',
          municipio: formData.endereco?.municipio || '',
          uf: formData.endereco?.uf || 'PR',
          complemento: formData.endereco?.complemento || ''
        },
        regiao_atuacao: formData.regiao_atuacao || '',
        estados_atuacao: formData.estados_atuacao || ['PR'],
        cidades_principais: formData.cidades_principais || '',
        tabela_preco_padrao_id: formData.tabela_preco_padrao_id || 'tab_01',
        tabela_preco_padrao_nome: TABELAS_PRECO_OPTIONS.find(t => t.id === formData.tabela_preco_padrao_id)?.nome || 'Tabela Padrão',
        modelo_comissao: formData.modelo_comissao || 'geral',
        comissao_padrao_percentual: Number(formData.comissao_padrao_percentual) || 3.5,
        comissoes_por_grupo: formData.comissoes_por_grupo || [],
        comissoes_por_cliente: formData.comissoes_por_cliente || [],
        clientes_vinculados_ids: formData.clientes_vinculados_ids || [],
        chave_pix: formData.chave_pix || '',
        tipo_chave_pix: formData.tipo_chave_pix || 'CPF',
        titular_pix: formData.titular_pix || formData.nome_completo || '',
        banco_nome: formData.banco_nome || '',
        agencia: formData.agencia || '',
        conta: formData.conta || '',
        observacoes_financeiras: formData.observacoes_financeiras || '',
        status: formData.status || 'Ativo',
        data_admissao_contrato: formData.data_admissao_contrato || formatarDataBR(hojeISO()),
        observacoes: formData.observacoes || '',
        criado_em: new Date().toISOString()
      };

      setRcas(prev => [novoRca, ...prev]);
      sincronizarClientesDoRca(novoRca);
      setSelectedRca(novoRca);
      setIsEditing(false);
      setIsCreating(false);
    } else if (selectedRca) {
      const rcaAtualizado: RCA = {
        ...selectedRca,
        ...formData,
        endereco: {
          ...selectedRca.endereco,
          ...(formData.endereco || {})
        },
        tabela_preco_padrao_nome: TABELAS_PRECO_OPTIONS.find(t => t.id === formData.tabela_preco_padrao_id)?.nome || selectedRca.tabela_preco_padrao_nome,
        comissao_padrao_percentual: Number(formData.comissao_padrao_percentual),
        comissoes_por_grupo: formData.comissoes_por_grupo || [],
        comissoes_por_cliente: formData.comissoes_por_cliente || [],
        clientes_vinculados_ids: formData.clientes_vinculados_ids || []
      } as RCA;

      setRcas(prev => prev.map(r => r.id === selectedRca.id ? rcaAtualizado : r));
      sincronizarClientesDoRca(rcaAtualizado);
      setSelectedRca(rcaAtualizado);
      setIsEditing(false);
    }
  };

  // Grava o vínculo no cadastro do cliente (vendedor_id = id real do RCA)
  const sincronizarClientesDoRca = (rca: RCA, removerTodos: boolean = false) => {
    const ids = removerTodos ? [] : (rca.clientes_vinculados_ids || []);
    const nomeRca = rca.nome_fantasia || rca.nome_completo;
    const clientes = carregarClientes();
    let alterou = false;
    const atualizados = clientes.map(c => {
      if (ids.includes(c.id)) {
        if (c.vendedor_id !== rca.id || c.vendedor_nome !== nomeRca) {
          alterou = true;
          return { ...c, vendedor_id: rca.id, vendedor_nome: nomeRca };
        }
        return c;
      }
      if (c.vendedor_id === rca.id) {
        alterou = true;
        return { ...c, vendedor_id: undefined, vendedor_nome: undefined };
      }
      return c;
    });
    if (alterou) salvarClientes(atualizados);
    // Outros RCAs não devem continuar listando os clientes que mudaram de carteira
    if (!removerTodos && ids.length > 0) {
      setRcas(prev => prev.map(r => r.id === rca.id ? r : {
        ...r,
        clientes_vinculados_ids: (r.clientes_vinculados_ids || []).filter(id => !ids.includes(id))
      }));
    }
  };

  const handleExcluirRca = (rca: RCA) => {
    if (!window.confirm('Excluir o RCA "' + rca.nome_completo + '"? Os clientes da carteira ficarão sem representante.')) return;
    sincronizarClientesDoRca(rca, true);
    setRcas(prev => prev.filter(r => r.id !== rca.id));
    setSelectedRcaId(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCopiarPix = (pix: string) => {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleLiquidadoPix = (vendaId: string) => {
    const hoje = formatarDataBR(hojeISO());
    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) return;
    const atualizada: VendaComissaoRCA = { ...venda, status_comissao: 'Pago (PIX)', data_pagamento_pix: hoje };
    setVendasSalvas(prev => prev.some(v => v.id === vendaId)
      ? prev.map(v => v.id === vendaId ? atualizada : v)
      : [atualizada, ...prev]);
  };

  // Helper para rotular o modelo de comissão
  const getNomeModeloComissao = (modelo: ModeloComissao) => {
    switch (modelo) {
      case 'geral': return 'Taxa Geral Única';
      case 'por_grupo': return 'Por Grupo de Produto';
      case 'por_cliente': return 'Por Cliente';
      case 'misto': return 'Misto (Cliente > Grupo > Geral)';
      default: return 'Geral';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden select-none">
      
      {/* CABEÇALHO */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Cadastro de RCA / Representantes Comerciais</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                {rcas.length} Cadastrados
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Gestão de representantes, comissões flexíveis por produto/cliente e carteira vinculada</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedRca && !isEditing && (
            <button
              onClick={() => handleExcluirRca(selectedRca)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 text-sm font-bold border border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>
          )}

          {selectedRca && !isEditing && (
            <button
              onClick={() => handleEditarRca(selectedRca)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold border border-slate-300 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-slate-600" />
              <span>Editar Cadastro</span>
            </button>
          )}

          {!isEditing && (
            <button
              onClick={handleNovoRca}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo RCA</span>
            </button>
          )}
        </div>
      </div>

      {/* PAINÉIS PRINCIPAIS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LISTA LATERAL DE RCAs */}
        <div className="w-[360px] lg:w-[400px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
          
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por Nome, Código, Região..."
                className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-0.5 block">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Inativo">Inativos</option>
                  <option value="Em Férias">Em Férias</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-0.5 block">Região</label>
                <select
                  value={filtroRegiao}
                  onChange={(e) => setFiltroRegiao(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="TODAS">Todas as Regiões</option>
                  {regioesOptions.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {rcasFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">Nenhum RCA encontrado</p>
              </div>
            ) : (
              rcasFiltrados.map((rca) => {
                const isSelected = selectedRca?.id === rca.id && !isEditing;
                const totalClientes = clientesDisponiveis.filter(c => c.vendedor_id === rca.id).length;
                return (
                  <div
                    key={rca.id}
                    onClick={() => {
                      setSelectedRca(rca);
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className={`
                      p-3 rounded-xl cursor-pointer transition-all border text-left
                      ${isSelected 
                        ? 'bg-emerald-50/90 border-emerald-600/60 shadow-xs ring-1 ring-emerald-500/20' 
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-emerald-300 font-mono text-[10px] font-black tracking-wider">
                          {rca.codigo_rca}
                        </span>
                        <span className={`
                          text-[10px] font-bold px-2 py-0.5 rounded-full border
                          ${rca.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}
                        `}>
                          {rca.status}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-emerald-700">
                        {rca.comissao_padrao_percentual}% base
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 mt-1.5 line-clamp-1 leading-snug">
                      {rca.nome_completo}
                    </h3>

                    {rca.nome_fantasia && (
                      <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                        {rca.nome_fantasia}
                      </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 line-clamp-1 max-w-[180px]">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        {rca.regiao_atuacao || `${rca.endereco.municipio}/${rca.endereco.uf}`}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        {totalClientes} {totalClientes === 1 ? 'Cliente' : 'Clientes'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-4 sm:p-6">
          
          {/* FORMULÁRIO (CRIAR / EDITAR) */}
          {isEditing ? (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {isCreating ? 'Cadastrar Novo Representante Comercial (RCA)' : `Editar RCA - ${formData.codigo_rca}`}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Configure comissões por grupo de produto, por cliente e carteira</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvar}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar RCA</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSalvar} className="space-y-6 text-left">
                
                {/* 1. DADOS DE IDENTIFICAÇÃO */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    1. Identificação do RCA
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Código RCA</label>
                      <input
                        type="text"
                        value={formData.codigo_rca || ''}
                        onChange={(e) => setFormData({ ...formData, codigo_rca: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="RCA-001"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Pessoa</label>
                      <select
                        value={formData.tipo_pessoa || 'PF'}
                        onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'PF' | 'PJ' })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="PF">Pessoa Física (PF)</option>
                        <option value="PJ">Pessoa Jurídica (PJ / Representação)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Status do Contrato</label>
                      <select
                        value={formData.status || 'Ativo'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Inativo' | 'Em Férias' })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="Ativo">Ativo (Operando)</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Em Férias">Em Férias</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {formData.tipo_pessoa === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
                      </label>
                      <input
                        type="text"
                        value={formData.nome_completo || ''}
                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Silva Representações Comerciais Ltda' : 'Ex: Marcos Silva'}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nome Fantasia / Nome Comercial</label>
                      <input
                        type="text"
                        value={formData.nome_fantasia || ''}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: Silva Representações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {formData.tipo_pessoa === 'PJ' ? 'CNPJ *' : 'CPF *'}
                      </label>
                      <input
                        type="text"
                        value={formData.cpf_cnpj || ''}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {formData.tipo_pessoa === 'PJ' ? 'Inscrição Estadual (IE)' : 'RG / Órgão Emissor'}
                      </label>
                      <input
                        type="text"
                        value={formData.rg_ie || ''}
                        onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: 908.123.456-78"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Data de Início / Contrato</label>
                      <input
                        type="text"
                        value={formData.data_admissao_contrato || ''}
                        onChange={(e) => setFormData({ ...formData, data_admissao_contrato: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Telefone Fixo</label>
                      <input
                        type="text"
                        value={formData.telefone || ''}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="(43) 3524-0000"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp / Celular</label>
                      <input
                        type="text"
                        value={formData.whatsapp || ''}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="(43) 99888-0000"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">E-mail Comercial</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="rca@exemplo.com.br"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. SISTEMA DE COMISSÕES FLEXÍVEIS (ANTI-DUPLICIDADE) */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      2. Configuração de Comissões (Gestão pelo Administrador)
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Anti-Duplicidade Ativa
                    </span>
                  </div>

                  {/* Banner Explicativo de Anti-Duplicidade */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs mb-4 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Regra de Resolução & Prioridade Única:</span> O administrador pode definir comissões por cliente, grupo de produto ou geral. Um produto <strong>nunca receberá duas comissões</strong>. A regra mais específica tem prioridade: 
                      <span className="font-mono font-bold text-amber-800 ml-1">1º Comissão do Cliente &gt; 2º Comissão do Grupo de Produto &gt; 3º Comissão Geral Base</span>.
                    </div>
                  </div>

                  {/* Seleção do Modo de Comissionamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Modelo de Comissionamento do RCA</label>
                      <select
                        value={formData.modelo_comissao || 'geral'}
                        onChange={(e) => setFormData({ ...formData, modelo_comissao: e.target.value as ModeloComissao })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="geral">Taxa Única Geral (Comissão Fixa)</option>
                        <option value="por_grupo">Diferenciada por Grupo de Produto</option>
                        <option value="por_cliente">Diferenciada por Cliente</option>
                        <option value="misto">Misto (Personalizado com Prioridade Anti-Duplicidade)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Comissão Base / Padrão Geral (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={formData.comissao_padrao_percentual ?? 3.5}
                          onChange={(e) => setFormData({ ...formData, comissao_padrao_percentual: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Subseção A: Comissões por Grupo de Produto */}
                  {(formData.modelo_comissao === 'por_grupo' || formData.modelo_comissao === 'misto') && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          Comissões por Grupo de Produto
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium">Prevalece sobre a comissão geral</span>
                      </div>

                      {/* Tabela de Grupos Configurados */}
                      {(formData.comissoes_por_grupo || []).length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                          {formData.comissoes_por_grupo?.map((cg) => (
                            <div key={cg.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
                              <span className="font-semibold text-slate-800">{cg.grupo_nome}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {cg.percentual}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverComissaoGrupo(cg.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mb-3">Nenhum grupo específico adicionado. Use os campos abaixo para configurar.</p>
                      )}

                      {/* Adicionar Grupo */}
                      <div className="flex items-center gap-2">
                        <select
                          value={novoGrupoId}
                          onChange={(e) => setNovoGrupoId(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                        >
                          {GRUPOS_PRODUTO_ENO.map(g => (
                            <option key={g.id} value={g.id}>{g.nome}</option>
                          ))}
                        </select>
                        <div className="w-24 relative">
                          <input
                            type="number"
                            step="0.1"
                            value={novoGrupoPercentual}
                            onChange={(e) => setNovoGrupoPercentual(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-900"
                            placeholder="%"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAdicionarComissaoGrupo}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subseção B: Comissões por Cliente */}
                  {(formData.modelo_comissao === 'por_cliente' || formData.modelo_comissao === 'misto') && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          Comissões por Cliente Específico
                        </h4>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-100/60 px-2 py-0.5 rounded">Prioridade Máxima</span>
                      </div>

                      {/* Tabela de Clientes Configurados */}
                      {(formData.comissoes_por_cliente || []).length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                          {formData.comissoes_por_cliente?.map((cc) => (
                            <div key={cc.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
                              <div>
                                <span className="font-semibold text-slate-800">{cc.cliente_nome}</span>
                                {cc.cliente_cidade && (
                                  <span className="text-[11px] text-slate-400 ml-2">({cc.cliente_cidade})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {cc.percentual}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverComissaoCliente(cc.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mb-3">Nenhum cliente específico com comissão diferenciada.</p>
                      )}

                      {/* Adicionar Cliente */}
                      <div className="flex items-center gap-2">
                        <select
                          value={novoClienteId}
                          onChange={(e) => setNovoClienteId(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                        >
                          {clientesDisponiveis.map(c => (
                            <option key={c.id} value={c.id}>{c.razao_social} ({c.municipio}/{c.uf})</option>
                          ))}
                        </select>
                        <div className="w-24 relative">
                          <input
                            type="number"
                            step="0.1"
                            value={novoClientePercentual}
                            onChange={(e) => setNovoClientePercentual(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-900"
                            placeholder="%"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAdicionarComissaoCliente}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. VINCULAR CLIENTES À CARTEIRA */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4" />
                    3. Clientes Vinculados à Carteira deste RCA
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {clientesDisponiveis.map((cli) => {
                      const isVinculado = (formData.clientes_vinculados_ids || []).includes(cli.id);
                      return (
                        <div
                          key={cli.id}
                          onClick={() => handleToggleClienteVinculado(cli.id)}
                          className={`
                            p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all
                            ${isVinculado ? 'bg-emerald-50 border-emerald-500 text-slate-900 font-semibold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}
                          `}
                        >
                          <div>
                            <p className="line-clamp-1">{cli.razao_social}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{cli.municipio}/{cli.uf} • {cli.cpf_cnpj}</p>
                            {!isVinculado && cli.vendedor_id && cli.vendedor_id !== selectedRca?.id && (
                              <p className="text-[10px] text-amber-600 font-semibold">Vinculado a outro RCA (será transferido)</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${isVinculado ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                            {isVinculado && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. DADOS BANCÁRIOS & CHAVE PIX */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4" />
                    4. Dados Financeiros & Repasse de Comissão (PIX)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tipo da Chave PIX</label>
                      <select
                        value={formData.tipo_chave_pix || 'CPF'}
                        onChange={(e) => setFormData({ ...formData, tipo_chave_pix: e.target.value as any })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="Celular">Celular</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Aleatória">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Chave PIX *</label>
                      <input
                        type="text"
                        value={formData.chave_pix || ''}
                        onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Informe a Chave PIX"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Banco</label>
                      <input
                        type="text"
                        value={formData.banco_nome || ''}
                        onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: Banco Itaú"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Agência</label>
                      <input
                        type="text"
                        value={formData.agencia || ''}
                        onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: 0412"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Conta Corrente</label>
                      <input
                        type="text"
                        value={formData.conta || ''}
                        onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: 29.340-1"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. ENDEREÇO & REGIÃO */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" />
                    5. Endereço & Região Comercial
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Região de Atuação</label>
                      <input
                        type="text"
                        value={formData.regiao_atuacao || ''}
                        onChange={(e) => setFormData({ ...formData, regiao_atuacao: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: Norte Pioneiro / PR"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Cidades Principais</label>
                      <input
                        type="text"
                        value={formData.cidades_principais || ''}
                        onChange={(e) => setFormData({ ...formData, cidades_principais: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        placeholder="Ex: Jacarezinho, Cambará, Ourinhos"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.endereco?.cep || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { logradouro: '', numero: '', bairro: '', municipio: '', uf: 'PR' }), cep: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Logradouro / Rua</label>
                      <input
                        type="text"
                        value={formData.endereco?.logradouro || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', numero: '', bairro: '', municipio: '', uf: 'PR' }), logradouro: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        placeholder="Ex: Rua Paraná"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Número</label>
                      <input
                        type="text"
                        value={formData.endereco?.numero || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', logradouro: '', bairro: '', municipio: '', uf: 'PR' }), numero: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Estado (UF)</label>
                      <select
                        value={formData.endereco?.uf || 'PR'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', logradouro: '', numero: '', bairro: '', municipio: '' }), uf: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                      >
                        <option value="PR">Paraná (PR)</option>
                        <option value="SP">São Paulo (SP)</option>
                        <option value="MS">Mato Grosso do Sul (MS)</option>
                        <option value="SC">Santa Catarina (SC)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Município</label>
                      <input
                        type="text"
                        value={formData.endereco?.municipio || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', logradouro: '', numero: '', bairro: '', municipio: '' }), municipio: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        placeholder="Jacarezinho"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Representante</span>
                  </button>
                </div>
              </form>
            </div>
          ) : selectedRca ? (
            
            /* VISUALIZAÇÃO DOS DETALHES DO RCA */
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* CARTÃO SUPERIOR: PERFIL DO RCA */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-emerald-300 font-mono text-xs font-black tracking-wider">
                        {selectedRca.codigo_rca}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedRca.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {selectedRca.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Desde {selectedRca.data_admissao_contrato}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {selectedRca.nome_completo}
                    </h2>

                    {selectedRca.nome_fantasia && (
                      <p className="text-sm font-semibold text-emerald-800">
                        {selectedRca.nome_fantasia}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-xs text-slate-600 font-medium">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {selectedRca.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}: {selectedRca.cpf_cnpj}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedRca.whatsapp || selectedRca.telefone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedRca.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {selectedRca.regiao_atuacao || `${selectedRca.endereco.municipio}/${selectedRca.endereco.uf}`}
                      </span>
                    </div>
                  </div>

                  {/* BOX PIX COM CÓPIA RÁPIDA */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 sm:w-80 shrink-0 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        Chave PIX Cadastrada ({selectedRca.tipo_chave_pix})
                      </span>
                    </div>
                    <p className="font-mono text-xs font-black text-slate-900 break-all select-all">
                      {selectedRca.chave_pix}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/60">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {selectedRca.banco_nome ? `${selectedRca.banco_nome} • Ag: ${selectedRca.agencia}` : 'PIX Direto'}
                      </span>
                      <button
                        onClick={() => handleCopiarPix(selectedRca.chave_pix)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        {copiedPix ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 CARDS DE INDICADORES (SEM METAS) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Modelo de Comissão</span>
                  <p className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    {getNomeModeloComissao(selectedRca.modelo_comissao)}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">Taxa base: {selectedRca.comissao_padrao_percentual}%</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Total Faturado</span>
                  <p className="text-lg font-black text-slate-900 font-mono">
                    R$ {statsRca.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-bold">{vendasDoRca.length} Pedidos Faturados</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Comissões Pagas (PIX)</span>
                  <p className="text-lg font-black text-emerald-700 font-mono">
                    R$ {statsRca.comissaoPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">Repassadas com sucesso</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Comissões a Pagar</span>
                  <p className="text-lg font-black text-amber-700 font-mono">
                    R$ {statsRca.comissaoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-amber-600 font-bold">Liberadas / Pendentes</span>
                </div>
              </div>

              {/* REGRAS ATIVAS DE COMISSÃO (ANTI-DUPLICIDADE) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Grade de Comissões do RCA</h3>
                      <p className="text-[11px] text-slate-500">Regras configuradas pelo administrador com garantia anti-duplicidade de comissão</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                    Modo: {getNomeModeloComissao(selectedRca.modelo_comissao)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Regra Geral */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">1. Taxa Geral Padrão</span>
                    <p className="text-xl font-black text-slate-900 font-mono">{selectedRca.comissao_padrao_percentual}%</p>
                    <p className="text-[11px] text-slate-500 mt-1">Aplicada quando não houver regra específica de grupo ou cliente.</p>
                  </div>

                  {/* Regras por Grupo */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-1">2. Por Grupo de Produto ({selectedRca.comissoes_por_grupo?.length || 0})</span>
                    {selectedRca.comissoes_por_grupo && selectedRca.comissoes_por_grupo.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {selectedRca.comissoes_por_grupo.map(cg => (
                          <div key={cg.id} className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-slate-200">
                            <span className="line-clamp-1 text-slate-700 font-medium">{cg.grupo_nome}</span>
                            <span className="font-mono font-bold text-emerald-700 ml-2">{cg.percentual}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-2">Nenhuma taxa de grupo customizada.</p>
                    )}
                  </div>

                  {/* Regras por Cliente */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block mb-1">3. Por Cliente Específico ({selectedRca.comissoes_por_cliente?.length || 0})</span>
                    {selectedRca.comissoes_por_cliente && selectedRca.comissoes_por_cliente.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {selectedRca.comissoes_por_cliente.map(cc => (
                          <div key={cc.id} className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-slate-200">
                            <span className="line-clamp-1 text-slate-700 font-medium">{cc.cliente_nome}</span>
                            <span className="font-mono font-bold text-amber-700 ml-2">{cc.percentual}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-2">Nenhuma taxa individual de cliente.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO DE CLIENTES VINCULADOS (CARTEIRA DO RCA) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h3 className="text-base font-black text-slate-900">Carteira de Clientes Vinculados ({clientesDoRca.length})</h3>
                      <p className="text-xs text-slate-500">Clique em qualquer cliente para ver detalhes cadastrais, compras e navegar para a ficha completa</p>
                    </div>
                  </div>
                </div>

                {clientesDoRca.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold">Nenhum cliente vinculado a este RCA</p>
                    <p className="text-xs mt-1">Edite o cadastro para vincular clientes à carteira.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clientesDoRca.map((cli) => {
                      return (
                        <div
                          key={cli.id}
                          onClick={() => setClienteModal(cli)}
                          className="p-4 rounded-xl border border-slate-200/90 bg-white hover:bg-emerald-50/40 hover:border-emerald-500/50 transition-all cursor-pointer shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                                {cli.razao_social}
                              </h4>
                              {cli.nome_fantasia && (
                                <p className="text-xs font-medium text-slate-500 line-clamp-1">{cli.nome_fantasia}</p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                              {cli.status}
                            </span>
                          </div>

                          <div className="mt-2.5 grid grid-cols-3 gap-2 text-left bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Compras</span>
                              <span className="text-xs font-black text-slate-800">{cli.qtd_compras} pedidos</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Faturado</span>
                              <span className="text-xs font-black text-emerald-700 font-mono">
                                R$ {(cli.valor_total_compras / 1000).toFixed(1)}k
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Última Compra</span>
                              <span className="text-xs font-semibold text-slate-700">{cli.ultima_compra_data}</span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {cli.municipio}/{cli.uf}
                            </span>
                            <span className="text-emerald-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>Ver detalhes</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GRÁFICO HISTÓRICO DE VENDAS & COMISSÕES (SEM METAS) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Evolução de Vendas & Comissões (Últimos 6 Meses)</h3>
                    <p className="text-xs text-slate-500">Comparativo mensal de faturamento líquido gerado e comissões repassadas</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="mes" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000)}k`} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          name === 'faturamento' ? 'Faturamento Líquido' : 'Comissão Gerada'
                        ]}
                      />
                      <Legend 
                        formatter={(value) => value === 'faturamento' ? 'Faturamento Total (R$)' : 'Comissão do RCA (R$)'}
                      />
                      <Bar dataKey="faturamento" fill="#047857" radius={[4, 4, 0, 0]} name="faturamento" />
                      <Bar dataKey="comissao" fill="#F59E0B" radius={[4, 4, 0, 0]} name="comissao" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* EXTRATO DE VENDAS & LIQUIDAÇÃO PIX */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Extrato de Vendas & Liquidação de Comissões</h3>
                    <p className="text-xs text-slate-500">Pedidos gerados com identificação da regra aplicada e status de pagamento PIX</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Pedido</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Cliente / Cidade</th>
                        <th className="py-2.5 px-3">Regra Aplicada</th>
                        <th className="py-2.5 px-3 text-right">Faturado</th>
                        <th className="py-2.5 px-3 text-right">% Com.</th>
                        <th className="py-2.5 px-3 text-right">Comissão</th>
                        <th className="py-2.5 px-3 text-center">Status PIX</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendasDoRca.map((v) => {
                        const isPago = v.status_comissao === 'Pago (PIX)';
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">{v.numero_pedido}</td>
                            <td className="py-3 px-3 text-slate-600">{v.data}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800 line-clamp-1">{v.cliente_nome}</p>
                              <p className="text-[10px] text-slate-400">{v.cliente_cidade}</p>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                v.tipo_regra_aplicada === 'Por Cliente' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                v.tipo_regra_aplicada === 'Por Grupo' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {v.tipo_regra_aplicada}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-900 font-bold">
                              R$ {v.valor_faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              {v.percentual_comissao}%
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-emerald-800">
                              R$ {v.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPago ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {v.status_comissao}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!isPago && (
                                <button
                                  onClick={() => handleLiquidadoPix(v.id)}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                >
                                  Pagar PIX
                                </button>
                              )}
                              {isPago && (
                                <span className="text-[10px] text-slate-400 font-medium">{v.data_pagamento_pix}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-base font-bold text-slate-600">Nenhum RCA selecionado</h3>
              <p className="text-xs text-slate-400 mt-1">Selecione um representante na lista ao lado para visualizar os detalhes.</p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL DE DETALHES DO CLIENTE VINCULADO (AMPLO E HORIZONTAL) */}
      {clienteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full p-6 text-left my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {clienteModal.razao_social}
                  </h3>
                  {clienteModal.nome_fantasia && (
                    <p className="text-xs font-semibold text-emerald-700">{clienteModal.nome_fantasia}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setClienteModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações Cadastrais e Indicadores em Grid Amplo Lado a Lado */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Coluna 1: Dados Cadastrais */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Identificação & Contato
                </span>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">CNPJ / CPF</span>
                    <span className="font-mono font-bold text-slate-800">{clienteModal.cpf_cnpj}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Cidade / UF</span>
                    <span className="font-semibold text-slate-800">{clienteModal.municipio} / {clienteModal.uf}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Telefone</span>
                    <span className="text-slate-700 font-medium">{clienteModal.telefone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">E-mail</span>
                    <span className="text-slate-700 font-medium line-clamp-1">{clienteModal.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span><strong>Tabela de Preço:</strong> {clienteModal.tabela_preco_nome}</span>
                  <span><strong>Prazo Comercial:</strong> {clienteModal.prazo_pagamento_nome}</span>
                </div>
              </div>

              {/* Coluna 2: Indicadores de Performance & Última Compra */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Performance Comercial
                </span>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Pedidos</span>
                    <span className="text-base font-black text-emerald-950">{clienteModal.qtd_compras}</span>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Volume Total</span>
                    <span className="text-base font-black text-emerald-950 font-mono">
                      R$ {(clienteModal.valor_total_compras / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Ticket Médio</span>
                    <span className="text-base font-black text-emerald-950 font-mono">
                      R$ {(clienteModal.ticket_medio / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>

                {/* Detalhes da Última Compra */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                      Última Compra Registrada
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {clienteModal.ultima_compra_pedido}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">Data: {clienteModal.ultima_compra_data}</span>
                    <span className="font-mono font-black text-emerald-800 text-base">
                      R$ {clienteModal.ultima_compra_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setClienteModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = clienteModal.id;
                  setClienteModal(null);
                  if (onNavigateToCliente) {
                    onNavigateToCliente(id);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <span>Ir para Cadastro do Cliente</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
