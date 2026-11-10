import React, { useState, useMemo } from 'react';
import { lerRascunho, apagarRascunho, useRascunho } from '../../lib/rascunho';
import { mascaraCpfCnpj, mascaraInscricaoEstadual, ESTADOS_UF } from '../../lib/mascarasCadastro';
import { CampoNumero } from '../ui/CampoNumero';
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
  lancarAdiantamentoRca,
  saldoAdiantamentoRca,
  obterRcaPorId,
  EVENTO_CADASTROS_ATUALIZADOS,
  ModeloComissao,
  ComissaoGrupo,
  ComissaoCliente,
  ComissaoProduto,
  ClienteVinculado,
  RCA,
  VendaComissaoRCA,
} from '../../data/cadastrosData';
import { carregarClientes, salvarClientes } from '../../data/clientesData';
import { carregarPedidosVenda } from '../../data/pedidosVendaData';
import { carregarTabelasPreco, carregarEstoqueProdutos } from '../../data/produtosData';
import { carregarCategoriasProduto, EVENTO_CATEGORIAS_PRODUTO } from '../../data/categoriasProdutoData';
import { baixarTituloComissao, sincronizarTitulosComissao, DIA_VENCIMENTO_COMISSAO_PADRAO, rotuloRegraComissao } from '../../data/comissoesData';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { formatarDataBR, hojeISO } from '../../lib/datas';
import { ultimosMesesReferencia } from '../../lib/mesesReferencia';
import { obterUsuarioPorVinculo, excluirUsuario, EVENTO_AUTH_ATUALIZADO, UsuarioSistema } from '../../lib/auth';
import {
  AcessoPortalSecao,
  EstadoAcessoPortal,
  estadoAcessoInicial,
  planejarAcessoPortal,
  aplicarAcessoPortal,
} from './AcessoPortalSecao';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { CampoBusca, SeletorFiltro } from '../ui/BarraFiltros';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { FormularioCadastro } from './FormularioCadastro';

/**
 * Grupos de Produto para comissão = lista de categorias de produto (cadastro de produtos: botão + / gerenciar),
 * que já inclui as categorias em uso pelos produtos. O id do grupo é a própria categoria
 * (é o que o cálculo da comissão compara).
 */
export function obterGruposProdutoComissao(): { id: string; nome: string }[] {
  return carregarCategoriasProduto().map(c => ({ id: c, nome: c }));
}

/** Tabelas de Preço reais (Produtos > Tabelas de Preço) */
const nomeTabelaPreco = (id?: string) => (id ? carregarTabelasPreco().find(t => t.id === id)?.nome : undefined);

// Tipos e persistência centralizados em cadastrosData (lidos também pelo Portal RCA e Pedidos)
export type {
  ModeloComissao,
  ComissaoGrupo,
  ComissaoCliente,
  ComissaoProduto,
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
    window.addEventListener('financeiro_updated', h);
    window.addEventListener('produtos_updated', h);
    window.addEventListener(EVENTO_CATEGORIAS_PRODUTO, h);
    return () => {
      window.removeEventListener(EVENTO_CATEGORIAS_PRODUTO, h);
      window.removeEventListener('clientes_updated', h);
      window.removeEventListener('pedidos_venda_updated', h);
      window.removeEventListener('sistema_reset_updated', h);
      window.removeEventListener('financeiro_updated', h);
      window.removeEventListener('produtos_updated', h);
    };
  }, []);
  const pedidosVenda = useMemo(() => carregarPedidosVenda(), [versaoDados]);
  // Pedido excluído/cancelado ou que voltou de etapa: remove a comissão a pagar ainda não paga
  React.useEffect(() => {
    sincronizarTitulosComissao(pedidosVenda);
  }, [pedidosVenda]);
  const gruposProduto = useMemo(() => obterGruposProdutoComissao(), [versaoDados]);
  const produtosCadastrados = useMemo(
    () => carregarEstoqueProdutos()
      .map(p => ({ id: String(p.id), nome: p.nome || String(p.id), codigo: p.codigo || '' }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [versaoDados]
  );
  const clientesDisponiveis = useMemo<ClienteVinculado[]>(
    () => montarClientesVinculados(carregarClientes(), pedidosVenda),
    [versaoDados, pedidosVenda]
  );
  const vendas = useMemo(() => montarVendasComissaoRca(pedidosVenda, vendasSalvas), [pedidosVenda, vendasSalvas, versaoDados]);

  const [busca, setBusca] = useState('');
  const [adiantValor, setAdiantValor] = useState('');
  const [adiantObs, setAdiantObs] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroRegiao, setFiltroRegiao] = useState<string>('TODAS');
  
  const [selectedRcaId, setSelectedRcaId] = useState<string | null>(() => carregarRcas()[0]?.id || null);
  const selectedRca = useMemo(() => rcas.find(r => r.id === selectedRcaId) || null, [rcas, selectedRcaId]);
  const setSelectedRca = (r: RCA | null) => setSelectedRcaId(r ? r.id : null);
  const [isEditing, setIsEditing] = useState(false);
  // Celular: abre o detalhe só depois de tocar num representante
  const [detalheMovel, setDetalheMovel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [copiedPix, setCopiedPix] = useState(false);
  
  // Modal de Detalhes do Cliente Vinculado
  const [clienteModal, setClienteModal] = useState<ClienteVinculado | null>(null);

  // Estados temporários para adicionar regras no formulário
  const [novoGrupoId, setNovoGrupoId] = useState<string>('');
  const [novoGrupoPercentual, setNovoGrupoPercentual] = useState<number>(3.5);
  const [novoClienteId, setNovoClienteId] = useState<string>('');
  const [novoClientePercentual, setNovoClientePercentual] = useState<number>(3.0);
  const [novoProdutoId, setNovoProdutoId] = useState<string>('');
  const [novoProdutoPercentual, setNovoProdutoPercentual] = useState<number>(3.0);
  const [mostrarModelosAvancados, setMostrarModelosAvancados] = useState(false);

  // Acesso ao portal do RCA (usuário perfil 'RCA' com vinculo_id = id do RCA)
  const [acessoEstado, setAcessoEstado] = useState<EstadoAcessoPortal>(() => estadoAcessoInicial());
  const [acessoExistente, setAcessoExistente] = useState<UsuarioSistema | undefined>(undefined);
  const [salvandoRca, setSalvandoRca] = useState(false);
  const [versaoAuth, setVersaoAuth] = useState(0);
  React.useEffect(() => {
    const h = () => setVersaoAuth(v => v + 1);
    window.addEventListener(EVENTO_AUTH_ATUALIZADO, h);
    return () => window.removeEventListener(EVENTO_AUTH_ATUALIZADO, h);
  }, []);
  const acessoDoSelecionado = useMemo(
    () => (selectedRcaId ? obterUsuarioPorVinculo('RCA', selectedRcaId) : undefined),
    [selectedRcaId, versaoAuth]
  );

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

  // Rascunho: o cadastro novo fica guardado enquanto é preenchido
  useRascunho('rca', formData, isCreating);

  // Form Handlers
  const handleNovoRca = () => {
    const maiorCodigo = rcas.reduce((max, r) => Math.max(max, Number(String(r.codigo_rca || '').replace(/\D/g, '')) || 0), 0);
    const proximoNum = Math.max(rcas.length, maiorCodigo) + 1;
    const cod = `RCA-${proximoNum.toString().padStart(3, '0')}`;
    
    const rascunhoRca = lerRascunho<typeof formData>('rca');
    setFormData(rascunhoRca ? { ...rascunhoRca, codigo_rca: cod } : {
      codigo_rca: cod,
      tipo_pessoa: 'PF',
      status: 'Ativo',
      modelo_comissao: 'geral',
      comissao_padrao_percentual: 3.5,
      comissoes_por_grupo: [],
      comissoes_por_cliente: [],
      comissoes_por_produto: [],
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
    setMostrarModelosAvancados(false);
    setAcessoExistente(undefined);
    setAcessoEstado(estadoAcessoInicial());
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditarRca = (rca: RCA) => {
    setFormData({
      ...rca,
      comissoes_por_grupo: [...(rca.comissoes_por_grupo || [])],
      comissoes_por_cliente: [...(rca.comissoes_por_cliente || [])],
      comissoes_por_produto: [...(rca.comissoes_por_produto || [])],
      clientes_vinculados_ids: clientesDisponiveis.filter(c => c.vendedor_id === rca.id).map(c => c.id),
      endereco: { ...rca.endereco }
    });
    setMostrarModelosAvancados(['por_grupo', 'por_cliente', 'misto'].includes(rca.modelo_comissao));
    const usuarioRca = obterUsuarioPorVinculo('RCA', rca.id);
    setAcessoExistente(usuarioRca);
    setAcessoEstado(estadoAcessoInicial(usuarioRca));
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleAdicionarComissaoProduto = () => {
    const prod = produtosCadastrados.find(p => p.id === (novoProdutoId || produtosCadastrados.find(x => !(formData.comissoes_por_produto || []).some(c => String(c.produto_id) === x.id))?.id));
    if (!prod) {
      alert('Cadastre produtos (Produtos > Estoque) para usar comissão por produto.');
      return;
    }
    if ((formData.comissoes_por_produto || []).some(c => String(c.produto_id) === prod.id)) {
      alert('Este produto já possui comissão cadastrada. Ajuste o % na lista.');
      return;
    }
    const nova: ComissaoProduto = { produto_id: prod.id, produto_nome: prod.nome, percentual: Number(novoProdutoPercentual) || 0 };
    setFormData(prev => ({ ...prev, comissoes_por_produto: [...(prev.comissoes_por_produto || []), nova] }));
    setNovoProdutoId('');
  };

  const handleAlterarPercentualProduto = (produtoId: string, percentual: number) => {
    setFormData(prev => ({
      ...prev,
      comissoes_por_produto: (prev.comissoes_por_produto || []).map(c => (c.produto_id === produtoId ? { ...c, percentual } : c))
    }));
  };

  const handleRemoverComissaoProduto = (produtoId: string) => {
    setFormData(prev => ({
      ...prev,
      comissoes_por_produto: (prev.comissoes_por_produto || []).filter(c => c.produto_id !== produtoId)
    }));
  };

  const handleAdicionarComissaoGrupo = () => {
    const grupo = gruposProduto.find(g => g.id === (novoGrupoId || gruposProduto[0]?.id));
    if (!grupo) {
      alert('Cadastre uma categoria de produto (cadastro de produtos, botão + ao lado de Categoria) para usar comissão por grupo.');
      return;
    }
    
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

  // Grava o login do portal depois do cadastro (o RCA já fica salvo mesmo se o acesso falhar)
  const gravarAcessoRca = async (plano: ReturnType<typeof planejarAcessoPortal>, rca: RCA) => {
    if (!('plano' in plano)) return;
    try {
      const msg = await aplicarAcessoPortal(plano.plano, {
        perfil: 'RCA',
        vinculoId: rca.id,
        nome: rca.nome_fantasia || rca.nome_completo,
      });
      if (msg) alert(msg);
    } catch (err) {
      alert(`O RCA foi salvo, mas o acesso ao portal não foi gravado: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoRca) return;
    if (!formData.nome_completo || !formData.cpf_cnpj) {
      alert('Por favor, preencha o Nome e o CPF/CNPJ do RCA.');
      return;
    }

    // Acesso ao portal: valida antes de gravar qualquer coisa
    const planoAcesso = planejarAcessoPortal(acessoEstado, acessoExistente, formData.email);
    if ('erro' in planoAcesso) {
      alert(planoAcesso.erro);
      return;
    }
    if (isCreating && planoAcesso.plano.acao === 'nenhuma') {
      const pular = window.confirm(
        'Este RCA ficará SEM acesso ao Portal do RCA (não conseguirá entrar no sistema).\n\n' +
        'Para liberar, cancele e preencha login e senha em "Acesso ao portal". Deseja salvar mesmo assim, sem acesso?'
      );
      if (!pular) return;
    }
    if (planoAcesso.plano.acao === 'remover' && !window.confirm('Remover o acesso deste RCA ao portal? O login será excluído.')) return;

    setSalvandoRca(true);
    try {
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
        tabela_preco_padrao_id: formData.tabela_preco_padrao_id || '',
        tabela_preco_padrao_nome: nomeTabelaPreco(formData.tabela_preco_padrao_id) || '',
        modelo_comissao: formData.modelo_comissao || 'geral',
        comissao_padrao_percentual: Number(formData.comissao_padrao_percentual ?? 3.5) || 0,
        comissoes_por_grupo: formData.comissoes_por_grupo || [],
        comissoes_por_cliente: formData.comissoes_por_cliente || [],
        comissoes_por_produto: formData.comissoes_por_produto || [],
        clientes_vinculados_ids: formData.clientes_vinculados_ids || [],
        chave_pix: formData.chave_pix || '',
        dia_vencimento_comissao: formData.dia_vencimento_comissao ?? DIA_VENCIMENTO_COMISSAO_PADRAO,
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

      apagarRascunho('rca');
      setRcas(prev => [novoRca, ...prev]);
      sincronizarClientesDoRca(novoRca);
      setSelectedRca(novoRca);
      setIsEditing(false);
      setIsCreating(false);
      await gravarAcessoRca(planoAcesso, novoRca);
    } else if (selectedRca) {
      const rcaAtualizado: RCA = {
        ...selectedRca,
        ...formData,
        endereco: {
          ...selectedRca.endereco,
          ...(formData.endereco || {})
        },
        tabela_preco_padrao_nome: formData.tabela_preco_padrao_id ? (nomeTabelaPreco(formData.tabela_preco_padrao_id) || selectedRca.tabela_preco_padrao_nome) : '',
        comissao_padrao_percentual: Number(formData.comissao_padrao_percentual),
        comissoes_por_grupo: formData.comissoes_por_grupo || [],
        comissoes_por_cliente: formData.comissoes_por_cliente || [],
        comissoes_por_produto: formData.comissoes_por_produto || [],
        clientes_vinculados_ids: formData.clientes_vinculados_ids || [],
        // Adiantamentos são movimentos do financeiro: vêm sempre do cadastro atual, nunca do formulário
        adiantamentos: obterRcaPorId(selectedRca.id)?.adiantamentos || []
      } as RCA;

      setRcas(prev => prev.map(r => r.id === selectedRca.id ? rcaAtualizado : r));
      sincronizarClientesDoRca(rcaAtualizado);
      setSelectedRca(rcaAtualizado);
      setIsEditing(false);
      await gravarAcessoRca(planoAcesso, rcaAtualizado);
    }
    } finally {
      setSalvandoRca(false);
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

  const handleExcluirRca = async (rca: RCA) => {
    const usuarioRca = obterUsuarioPorVinculo('RCA', rca.id);
    if (!window.confirm('Excluir o RCA "' + rca.nome_completo + '"? Os clientes da carteira ficarão sem representante.' + (usuarioRca ? ` O login "${usuarioRca.usuario}" do portal também será excluído.` : ''))) return;
    if (usuarioRca) {
      try {
        await excluirUsuario(usuarioRca.id);
      } catch (err) {
        alert(`Não foi possível excluir o login do portal: ${err instanceof Error ? err.message : 'erro'}. Remova em Usuários e Acessos.`);
      }
    }
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

  // Pago (PIX): baixa o título de comissão no Contas a Pagar (status PAGO + saída no caixa)
  const handleLiquidadoPix = (vendaId: string) => {
    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) return;
    const pedido = pedidosVenda.find(p => p.id === venda.pedido_id);
    if (!pedido) {
      // Lançamento antigo sem pedido de venda: mantém só a marcação legada
      const hoje = formatarDataBR(hojeISO());
      const atualizada: VendaComissaoRCA = { ...venda, status_comissao: 'Pago (PIX)', data_pagamento_pix: hoje };
      setVendasSalvas(prev => prev.some(v => v.id === vendaId)
        ? prev.map(v => v.id === vendaId ? atualizada : v)
        : [atualizada, ...prev]);
      return;
    }
    if (!window.confirm(`Confirmar o pagamento PIX da comissão do pedido ${venda.numero_pedido} (R$ ${venda.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})? O título será baixado no Contas a Pagar e sairá do caixa.`)) return;
    let pago;
    try {
      pago = baixarTituloComissao(pedido);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível pagar a comissão.');
      return;
    }
    if (!pago) {
      alert('Não há comissão a pagar para este pedido (valor zero ou pedido sem RCA).');
      return;
    }
    setVersaoDados(v => v + 1);
    setRcas(carregarRcas()); // o saldo de adiantamento pode ter sido descontado
  };

  // Lança um adiantamento ao RCA: sai do caixa agora e vira saldo a descontar das comissões pagas
  const handleLancarAdiantamento = () => {
    if (!selectedRca) return;
    const valor = parseFloat(adiantValor.replace(/\./g, '').replace(',', '.')) || 0;
    if (valor <= 0) {
      alert('Informe o valor do adiantamento.');
      return;
    }
    const nome = selectedRca.nome_fantasia || selectedRca.nome_completo;
    if (!window.confirm(`Lançar adiantamento de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${nome}? Sai do caixa agora e será descontado das próximas comissões pagas.`)) return;
    try {
      const atualizado = lancarAdiantamentoRca(selectedRca.id, {
        valor,
        data: formatarDataBR(hojeISO()),
        observacao: adiantObs
      });
      setRcas(prev => prev.map(r => (r.id === atualizado.id ? atualizado : r)));
      setAdiantValor('');
      setAdiantObs('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível lançar o adiantamento.');
    }
  };

  // Helper para rotular o modelo de comissão
  const getNomeModeloComissao = (modelo: ModeloComissao) => {
    switch (modelo) {
      case 'geral': return 'Pela venda (% sobre o total)';
      case 'por_produto': return 'Por produto';
      case 'por_grupo': return 'Por Grupo de Produto';
      case 'por_cliente': return 'Por Cliente';
      case 'misto': return 'Misto (Cliente > Grupo > Geral)';
      default: return 'Pela venda (% sobre o total)';
    }
  };

  const ativosRca = rcas.filter(r => r.status === 'Ativo').length;
  const cancelarEdicao = () => { setIsEditing(false); setIsCreating(false); };
  // Celular: lista OU detalhe (no computador os dois lado a lado)
  const mostrandoDetalheMovel = detalheMovel || isEditing;

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* CABEÇALHO */}
      <div className={`mx-auto w-full max-w-[1700px] ${mostrandoDetalheMovel ? 'hidden md:block' : ''}`}>
        <CabecalhoPagina
          titulo="Representantes"
          resumo={rcas.length === 0 ? 'Nenhum representante cadastrado' : `${rcas.length} ${rcas.length === 1 ? 'representante' : 'representantes'} · ${ativosRca} ${ativosRca === 1 ? 'ativo' : 'ativos'}`}
          acoes={
            !isEditing && rcas.length > 0 ? (
              <BotaoPrimario onClick={handleNovoRca} className="w-full sm:w-auto h-10 sm:h-9">
                <Plus className="w-4 h-4" /> Novo representante
              </BotaoPrimario>
            ) : undefined
          }
        />
      </div>

      {/* PAINÉIS PRINCIPAIS */}
      <div className="flex-1 min-h-0 flex overflow-hidden mx-auto w-full max-w-[1700px] md:px-6 md:pb-6 md:gap-4">

        {/* LISTA DE RCAs (lateral no computador) */}
        <div className={`${mostrandoDetalheMovel ? 'hidden md:flex' : 'flex'} w-full md:w-[330px] lg:w-[370px] md:bg-papel md:border md:border-linha md:rounded-md flex-col min-h-0 shrink-0 overflow-hidden`}>

          <div className="px-4 md:px-3 pb-3 md:pt-3 md:border-b md:border-linha space-y-2">
            <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar nome, código ou região" className="[&_input]:h-10 sm:[&_input]:h-8" />
            <div className="grid grid-cols-2 gap-2">
              <SeletorFiltro value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Situação" className="w-full h-10 sm:h-8">
                <option value="TODOS">Todas as situações</option>
                <option value="Ativo">Ativos</option>
                <option value="Inativo">Inativos</option>
                <option value="Em Férias">Em férias</option>
              </SeletorFiltro>
              <SeletorFiltro value={filtroRegiao} onChange={(e) => setFiltroRegiao(e.target.value)} aria-label="Região" className="w-full h-10 sm:h-8">
                <option value="TODAS">Todas as regiões</option>
                {regioesOptions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </SeletorFiltro>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 md:p-0">
            {rcasFiltrados.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md md:border-0">
                {rcas.length === 0 ? (
                  <EstadoVazio
                    titulo="Nenhum representante cadastrado"
                    texto="Cadastre os RCAs para vincular a carteira de clientes, a tabela de preço e a regra de comissão."
                    acao={<BotaoPrimario onClick={handleNovoRca} className="h-10 sm:h-9"><Plus className="w-4 h-4" /> Novo representante</BotaoPrimario>}
                  />
                ) : (
                  <EstadoVazio titulo="Nenhum representante com esses filtros" texto="Confira a busca, a situação e a região." />
                )}
              </div>
            ) : (
              <ul className="bg-papel border border-linha rounded-md md:border-0 md:rounded-none">
              {rcasFiltrados.map((rca) => {
                const isSelected = selectedRca?.id === rca.id && !isEditing;
                const totalClientes = clientesDisponiveis.filter(c => c.vendedor_id === rca.id).length;
                return (
                  <li key={rca.id} className="border-b border-linha last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRca(rca);
                      setIsEditing(false);
                      setIsCreating(false);
                      setDetalheMovel(true);
                    }}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`relative w-full text-left px-3.5 py-3 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ouro ${
                      isSelected ? 'md:bg-papel-3' : 'hover:bg-papel-3/50'
                    }`}
                  >
                    {isSelected && <span className="hidden md:block absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-ouro" aria-hidden />}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11.5px] text-cinza tabular-nums">{rca.codigo_rca} · {rca.regiao_atuacao || `${rca.endereco.municipio}/${rca.endereco.uf}`}</div>
                        <div className="text-[14px] font-bold text-tinta leading-snug truncate">{rca.nome_fantasia || rca.nome_completo}</div>
                      </div>
                      <StatusChip tom={rca.status === 'Ativo' ? 'pago' : rca.status === 'Em Férias' ? 'aguardando' : 'vencido'} className="shrink-0">{rca.status}</StatusChip>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[12px] text-tinta-2 tabular-nums">
                      <span>{totalClientes} {totalClientes === 1 ? 'cliente' : 'clientes'}</span>
                      <span className="text-cinza">comissão base <strong className="text-tinta font-semibold">{rca.comissao_padrao_percentual}%</strong></span>
                    </div>
                  </button>
                  </li>
                );
              })}
              </ul>
            )}
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div className={`${mostrandoDetalheMovel ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 min-h-0 flex-col ${isEditing ? '' : 'overflow-y-auto px-4 pb-6 md:p-0'}`}>

          {/* FORMULÁRIO (CRIAR / EDITAR) */}
          {isEditing ? (
            <FormularioCadastro
              onSubmit={handleSalvar}
              onCancelar={cancelarEdicao}
              onLimpar={isCreating ? () => { apagarRascunho('rca'); handleNovoRca(); } : undefined}
              titulo={isCreating ? 'Novo representante' : (formData.nome_fantasia || formData.nome_completo || `Editar ${formData.codigo_rca}`)}
              subtitulo={isCreating ? 'Identificação, comissão, carteira, PIX e região' : `Editar ${formData.codigo_rca}`}
              rotuloSalvar={isCreating ? 'Cadastrar representante' : 'Salvar alterações'}
              salvando={salvandoRca}
              className="md:bg-papel md:border md:border-linha md:rounded-md"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:p-6">
              <div className="max-w-4xl mx-auto space-y-6 text-left">

                {/* 1. DADOS DE IDENTIFICAÇÃO */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-eno-800 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    1. Identificação do RCA
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Código RCA</label>
                      <input
                        type="text"
                        value={formData.codigo_rca || ''}
                        onChange={(e) => setFormData({ ...formData, codigo_rca: e.target.value })}
                        className="w-full bg-papel-2 border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="RCA-001"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Tipo de Pessoa</label>
                      <select
                        value={formData.tipo_pessoa || 'PF'}
                        onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'PF' | 'PJ' })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                      >
                        <option value="PF">Pessoa Física (PF)</option>
                        <option value="PJ">Pessoa Jurídica (PJ / Representação)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Status do Contrato</label>
                      <select
                        value={formData.status || 'Ativo'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Inativo' | 'Em Férias' })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                      >
                        <option value="Ativo">Ativo (Operando)</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Em Férias">Em Férias</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">
                        {formData.tipo_pessoa === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
                      </label>
                      <input
                        type="text"
                        value={formData.nome_completo || ''}
                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Silva Representações Comerciais Ltda' : 'Ex: Marcos Silva'}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Nome Fantasia / Nome Comercial</label>
                      <input
                        type="text"
                        value={formData.nome_fantasia || ''}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: Silva Representações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">
                        {formData.tipo_pessoa === 'PJ' ? 'CNPJ *' : 'CPF *'}
                      </label>
                      <input
                        type="text"
                        value={formData.cpf_cnpj || ''}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: mascaraCpfCnpj(e.target.value) })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">
                        {formData.tipo_pessoa === 'PJ' ? 'Inscrição Estadual (IE)' : 'RG / Órgão Emissor'}
                      </label>
                      <input
                        type="text"
                        value={formData.rg_ie || ''}
                        onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: 908.123.456-78"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Data de Início / Contrato</label>
                      <input
                        type="text"
                        value={formData.data_admissao_contrato || ''}
                        onChange={(e) => setFormData({ ...formData, data_admissao_contrato: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Telefone Fixo</label>
                      <input
                        type="text"
                        value={formData.telefone || ''}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="(43) 3524-0000"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">WhatsApp / Celular</label>
                      <input
                        type="text"
                        value={formData.whatsapp || ''}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="(43) 99888-0000"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">E-mail Comercial</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="rca@exemplo.com.br"
                      />
                    </div>
                  </div>
                </div>

                {/* ACESSO AO PORTAL DO RCA (login = e-mail) */}
                <AcessoPortalSecao
                  titulo="Acesso ao portal"
                  descricao={acessoExistente
                    ? 'Este RCA já entra no Portal do RCA. Troque o login, redefina a senha ou desative o acesso.'
                    : 'Login e senha que o RCA usa para entrar no Portal do RCA (pedidos, carteira e comissões).'}
                  existente={acessoExistente}
                  estado={acessoEstado}
                  onChange={setAcessoEstado}
                  emailSugerido={formData.email || ''}
                  obrigatorio={isCreating}
                />

                {/* 2. SISTEMA DE COMISSÕES FLEXÍVEIS (ANTI-DUPLICIDADE) */}
                <div className="pt-4 border-t border-linha">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-eno-800 flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      2. Configuração de Comissões (Gestão pelo Administrador)
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-eno-700 bg-eno-50 px-2.5 py-1 rounded-full border border-linha-forte">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Anti-Duplicidade Ativa
                    </span>
                  </div>

                  {/* Banner Explicativo de Anti-Duplicidade */}
                  <div className="p-3 bg-st-aguardando-bg/70 border border-st-aguardando/30 rounded-md text-st-aguardando text-xs mb-4 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-st-aguardando shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Regra de Resolução & Prioridade Única:</span> Escolha <strong>Pela venda</strong> (um % sobre o total) ou <strong>Por produto</strong> (um % para cada produto; produto sem regra usa o % padrão). Um item <strong>nunca recebe duas comissões</strong>. Nos modelos avançados vale a regra mais específica:
                      <span className="tabular-nums font-bold text-st-aguardando ml-1">1º Cliente &gt; 2º Grupo de Produto &gt; 3º Padrão</span>.
                    </div>
                  </div>

                  {/* Modelo de comissão: Pela venda | Por produto em destaque; os demais ficam em "avançados" */}
                  <div className="mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-cinza block mb-2">Como o RCA ganha comissão</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {([
                        { valor: 'geral' as ModeloComissao, titulo: 'Pela venda', desc: '% sobre o total da venda', Icone: DollarSign },
                        { valor: 'por_produto' as ModeloComissao, titulo: 'Por produto', desc: '% definido para cada produto', Icone: Package },
                      ]).map(({ valor, titulo, desc, Icone }) => {
                        const ativo = (formData.modelo_comissao || 'geral') === valor;
                        return (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setFormData({ ...formData, modelo_comissao: valor })}
                            aria-pressed={ativo}
                            className={`text-left rounded-md px-4 py-3 border-2 transition-all duration-200 flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-eno-600 ${
                              ativo
                                ? 'border-eno-700 bg-gradient-to-br from-eno-800 to-eno-950 text-white shadow-[0_10px_30px_-12px_rgba(6,78,59,0.8)]'
                                : 'border-linha bg-papel text-tinta hover:border-linha-forte'
                            }`}
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ativo ? 'bg-papel/15 text-eno-100' : 'bg-eno-50 text-eno-700'}`}>
                              <Icone className="w-4 h-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-extrabold tracking-tight">{titulo}</span>
                              <span className={`block text-[11px] ${ativo ? 'text-eno-100/80' : 'text-cinza'}`}>{desc}</span>
                            </span>
                            {ativo && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0 text-eno-600" />}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarModelosAvancados(v => !v)}
                      aria-expanded={mostrarModelosAvancados}
                      className="mt-2 text-[11px] font-bold text-eno-800 hover:text-eno-950 flex items-center gap-1"
                    >
                      {mostrarModelosAvancados ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Modelos avançados (por grupo, por cliente, misto)
                    </button>
                    {mostrarModelosAvancados && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {([
                          { valor: 'por_grupo' as ModeloComissao, titulo: 'Por grupo de produto' },
                          { valor: 'por_cliente' as ModeloComissao, titulo: 'Por cliente' },
                          { valor: 'misto' as ModeloComissao, titulo: 'Misto (cliente > grupo > padrão)' },
                        ]).map(op => {
                          const ativo = formData.modelo_comissao === op.valor;
                          return (
                            <button
                              key={op.valor}
                              type="button"
                              onClick={() => setFormData({ ...formData, modelo_comissao: op.valor })}
                              aria-pressed={ativo}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                ativo ? 'bg-eno-800 text-white border-eno-800' : 'bg-papel text-tinta-2 border-linha-forte hover:border-eno-600'
                              }`}
                            >
                              {op.titulo}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-tinta-2 block mb-1">
                        {(formData.modelo_comissao || 'geral') === 'geral' ? 'Comissão sobre o total da venda (%)' : 'Comissão padrão — itens sem regra própria (%)'}
                      </label>
                      <div className="relative max-w-[12rem]">
                        <CampoNumero
                          step="0.1"
                          min={0}
                          value={formData.comissao_padrao_percentual ?? 3.5}
                          onChange={(n) => setFormData({ ...formData, comissao_padrao_percentual: n })}
                          className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cinza">%</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Vencimento da comissão (dia do mês seguinte ao faturamento)</label>
                      <div className="flex items-center gap-2">
                        <CampoNumero
                          inteiro
                          min={1}
                          max={31}
                          vazioComo={DIA_VENCIMENTO_COMISSAO_PADRAO}
                          value={formData.dia_vencimento_comissao ?? DIA_VENCIMENTO_COMISSAO_PADRAO}
                          onChange={(n) => setFormData({ ...formData, dia_vencimento_comissao: n })}
                          className="w-24 bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        />
                        <span className="text-[11px] text-cinza">Ao faturar o pedido, a comissão vira conta a pagar ao RCA com este vencimento e a chave PIX cadastrada.</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Tabela de preço padrão (clientes cadastrados pelo RCA)</label>
                      <select
                        value={formData.tabela_preco_padrao_id || ''}
                        onChange={(e) => setFormData({ ...formData, tabela_preco_padrao_id: e.target.value })}
                        className="w-full max-w-sm bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                      >
                        <option value="">-- Sem tabela padrão --</option>
                        {carregarTabelasPreco().filter(t => t.status !== 'ARQUIVADA' || t.id === formData.tabela_preco_padrao_id).map(t => (
                          <option key={t.id} value={t.id}>{t.nome}{t.codigo ? ` (${t.codigo})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subseção: Comissão por Produto */}
                  {formData.modelo_comissao === 'por_produto' && (
                    <div className="mt-4 p-4 bg-papel-2 rounded-md border border-linha">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h4 className="text-xs font-bold text-tinta flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-eno-600" />
                          Comissão por Produto
                        </h4>
                        <span className="text-[10px] text-cinza font-medium text-right">
                          Produto sem regra: {Number(formData.comissao_padrao_percentual ?? 0)}% (padrão)
                        </span>
                      </div>

                      {(formData.comissoes_por_produto || []).length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                          {formData.comissoes_por_produto?.map(cp => (
                            <div key={cp.produto_id} className="flex items-center justify-between gap-2 bg-papel px-3 py-2 rounded-lg border border-linha text-xs">
                              <span className="font-semibold text-tinta min-w-0 truncate">
                                {cp.produto_nome}
                                {!produtosCadastrados.some(p => p.id === String(cp.produto_id)) && (
                                  <span className="ml-2 text-[10px] font-bold text-st-vencido">produto não encontrado no cadastro</span>
                                )}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-20 relative">
                                  <CampoNumero
                                    step="0.1"
                                    min={0}
                                    value={cp.percentual}
                                    onChange={(n) => handleAlterarPercentualProduto(cp.produto_id, n)}
                                    aria-label={`Comissão de ${cp.produto_nome} (%)`}
                                    className="w-full bg-eno-50 border border-linha-forte rounded px-2 py-1 text-xs tabular-nums font-bold text-eno-800 tabular-nums"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-eno-600">%</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverComissaoProduto(cp.produto_id)}
                                  className="text-st-vencido hover:text-st-vencido p-1 rounded hover:bg-st-vencido-bg"
                                  aria-label={`Remover regra de ${cp.produto_nome}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-cinza italic mb-3">Nenhum produto com % próprio: todos usam o % padrão até você adicionar.</p>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <select
                          value={novoProdutoId}
                          onChange={(e) => setNovoProdutoId(e.target.value)}
                          className="flex-1 min-w-0 bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 text-xs text-tinta font-medium"
                        >
                          <option value="">{produtosCadastrados.length === 0 ? 'Nenhum produto cadastrado' : 'Selecione o produto…'}</option>
                          {produtosCadastrados.map(p => (
                            <option key={p.id} value={p.id} disabled={(formData.comissoes_por_produto || []).some(c => String(c.produto_id) === p.id)}>
                              {p.codigo ? `${p.codigo} • ` : ''}{p.nome}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <div className="w-24 relative">
                            <CampoNumero
                              step="0.1"
                              min={0}
                              value={novoProdutoPercentual}
                              onChange={(n) => setNovoProdutoPercentual(n)}
                              className="w-full bg-papel border border-linha-forte rounded-lg px-2 py-1.5 text-xs tabular-nums font-bold text-tinta"
                              placeholder="%"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-cinza">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAdicionarComissaoProduto}
                            disabled={!novoProdutoId}
                            className="px-3 py-1.5 bg-eno-700 hover:bg-eno-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subseção A: Comissões por Grupo de Produto */}
                  {(formData.modelo_comissao === 'por_grupo' || formData.modelo_comissao === 'misto') && (
                    <div className="mt-4 p-4 bg-papel-2 rounded-md border border-linha">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-tinta flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-eno-600" />
                          Comissões por Grupo de Produto
                        </h4>
                        <span className="text-[10px] text-cinza font-medium">Prevalece sobre a comissão geral</span>
                      </div>

                      {/* Tabela de Grupos Configurados */}
                      {(formData.comissoes_por_grupo || []).length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                          {formData.comissoes_por_grupo?.map((cg) => (
                            <div key={cg.id} className="flex items-center justify-between bg-papel px-3 py-2 rounded-lg border border-linha text-xs">
                              <span className="font-semibold text-tinta">
                                {cg.grupo_nome}
                                {!gruposProduto.some(g => g.id === cg.grupo_id || g.nome === cg.grupo_nome) && (
                                  <span className="ml-2 text-[10px] font-bold text-st-vencido">não corresponde a nenhuma categoria de produto — não será aplicada</span>
                                )}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="tabular-nums font-bold text-eno-700 bg-eno-50 px-2 py-0.5 rounded border border-linha-forte">
                                  {cg.percentual}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverComissaoGrupo(cg.id)}
                                  className="text-st-vencido hover:text-st-vencido p-1 rounded hover:bg-st-vencido-bg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-cinza italic mb-3">Nenhum grupo específico adicionado. Use os campos abaixo para configurar.</p>
                      )}

                      {/* Adicionar Grupo */}
                      <div className="flex items-center gap-2">
                        <select
                          value={novoGrupoId || gruposProduto[0]?.id || ''}
                          onChange={(e) => setNovoGrupoId(e.target.value)}
                          className="flex-1 bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 text-xs text-tinta font-medium"
                        >
                          {gruposProduto.length === 0 && <option value="">Nenhuma categoria de produto cadastrada</option>}
                          {gruposProduto.map(g => (
                            <option key={g.id} value={g.id}>{g.nome}</option>
                          ))}
                        </select>
                        <div className="w-24 relative">
                          <CampoNumero
                            step="0.1"
                            min={0}
                            value={novoGrupoPercentual}
                            onChange={(n) => setNovoGrupoPercentual(n)}
                            className="w-full bg-papel border border-linha-forte rounded-lg px-2 py-1.5 text-xs tabular-nums font-bold text-tinta"
                            placeholder="%"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-cinza">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAdicionarComissaoGrupo}
                          className="px-3 py-1.5 bg-eno-700 hover:bg-eno-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subseção B: Comissões por Cliente */}
                  {(formData.modelo_comissao === 'por_cliente' || formData.modelo_comissao === 'misto') && (
                    <div className="mt-4 p-4 bg-papel-2 rounded-md border border-linha">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-tinta flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-eno-600" />
                          Comissões por Cliente Específico
                        </h4>
                        <span className="text-[10px] text-st-aguardando font-bold bg-st-aguardando-bg/60 px-2 py-0.5 rounded">Prioridade Máxima</span>
                      </div>

                      {/* Tabela de Clientes Configurados */}
                      {(formData.comissoes_por_cliente || []).length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                          {formData.comissoes_por_cliente?.map((cc) => (
                            <div key={cc.id} className="flex items-center justify-between bg-papel px-3 py-2 rounded-lg border border-linha text-xs">
                              <div>
                                <span className="font-semibold text-tinta">{cc.cliente_nome}</span>
                                {cc.cliente_cidade && (
                                  <span className="text-[11px] text-cinza ml-2">({cc.cliente_cidade})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="tabular-nums font-bold text-eno-700 bg-eno-50 px-2 py-0.5 rounded border border-linha-forte">
                                  {cc.percentual}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverComissaoCliente(cc.id)}
                                  className="text-st-vencido hover:text-st-vencido p-1 rounded hover:bg-st-vencido-bg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-cinza italic mb-3">Nenhum cliente específico com comissão diferenciada.</p>
                      )}

                      {/* Adicionar Cliente */}
                      <div className="flex items-center gap-2">
                        <select
                          value={novoClienteId}
                          onChange={(e) => setNovoClienteId(e.target.value)}
                          className="flex-1 bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 text-xs text-tinta font-medium"
                        >
                          {clientesDisponiveis.map(c => (
                            <option key={c.id} value={c.id}>{c.razao_social} ({c.municipio}/{c.uf})</option>
                          ))}
                        </select>
                        <div className="w-24 relative">
                          <CampoNumero
                            step="0.1"
                            min={0}
                            value={novoClientePercentual}
                            onChange={(n) => setNovoClientePercentual(n)}
                            className="w-full bg-papel border border-linha-forte rounded-lg px-2 py-1.5 text-xs tabular-nums font-bold text-tinta"
                            placeholder="%"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-cinza">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAdicionarComissaoCliente}
                          className="px-3 py-1.5 bg-eno-700 hover:bg-eno-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. VINCULAR CLIENTES À CARTEIRA */}
                <div className="pt-4 border-t border-linha">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-eno-800 flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4" />
                    3. Clientes Vinculados à Carteira deste RCA
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-papel-2 rounded-md border border-linha">
                    {clientesDisponiveis.map((cli) => {
                      const isVinculado = (formData.clientes_vinculados_ids || []).includes(cli.id);
                      return (
                        <div
                          key={cli.id}
                          onClick={() => handleToggleClienteVinculado(cli.id)}
                          className={`
                            p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all
                            ${isVinculado ? 'bg-eno-50 border-eno-600 text-tinta font-semibold ' : 'bg-papel border-linha text-tinta-2 hover:bg-papel-2'}
                          `}
                        >
                          <div>
                            <p className="line-clamp-1">{cli.razao_social}</p>
                            <p className="text-[10px] text-cinza font-normal">{cli.municipio}/{cli.uf} • {cli.cpf_cnpj}</p>
                            {!isVinculado && cli.vendedor_id && cli.vendedor_id !== selectedRca?.id && (
                              <p className="text-[10px] text-st-aguardando font-semibold">Vinculado a outro RCA (será transferido)</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${isVinculado ? 'bg-eno-600 border-eno-600 text-white' : 'border-linha-forte bg-papel'}`}>
                            {isVinculado && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. DADOS BANCÁRIOS & CHAVE PIX */}
                <div className="pt-4 border-t border-linha">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-eno-800 flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4" />
                    4. Dados Financeiros & Repasse de Comissão (PIX)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Tipo da Chave PIX</label>
                      <select
                        value={formData.tipo_chave_pix || 'CPF'}
                        onChange={(e) => setFormData({ ...formData, tipo_chave_pix: e.target.value as any })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="Celular">Celular</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Aleatória">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Chave PIX *</label>
                      <input
                        type="text"
                        value={formData.chave_pix || ''}
                        onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Informe a Chave PIX"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Banco</label>
                      <input
                        type="text"
                        value={formData.banco_nome || ''}
                        onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: Banco Itaú"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Agência</label>
                      <input
                        type="text"
                        value={formData.agencia || ''}
                        onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: 0412"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Conta Corrente</label>
                      <input
                        type="text"
                        value={formData.conta || ''}
                        onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: 29.340-1"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. ENDEREÇO & REGIÃO */}
                <div className="pt-4 border-t border-linha">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-eno-800 flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" />
                    5. Endereço & Região Comercial
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Região de Atuação</label>
                      <input
                        type="text"
                        value={formData.regiao_atuacao || ''}
                        onChange={(e) => setFormData({ ...formData, regiao_atuacao: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-semibold text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: Norte Pioneiro / PR"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Cidades Principais</label>
                      <input
                        type="text"
                        value={formData.cidades_principais || ''}
                        onChange={(e) => setFormData({ ...formData, cidades_principais: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-eno-600"
                        placeholder="Ex: Jacarezinho, Cambará, Ourinhos"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.endereco?.cep || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { logradouro: '', numero: '', bairro: '', municipio: '', uf: 'PR' }), cep: e.target.value } 
                        })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs tabular-nums text-tinta"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Logradouro / Rua</label>
                      <input
                        type="text"
                        value={formData.endereco?.logradouro || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', numero: '', bairro: '', municipio: '', uf: 'PR' }), logradouro: e.target.value } 
                        })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta"
                        placeholder="Ex: Rua Paraná"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Número</label>
                      <input
                        type="text"
                        value={formData.endereco?.numero || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', logradouro: '', bairro: '', municipio: '', uf: 'PR' }), numero: e.target.value } 
                        })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta"
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Estado (UF)</label>
                      <select
                        value={formData.endereco?.uf || 'PR'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', logradouro: '', numero: '', bairro: '', municipio: '' }), uf: e.target.value } 
                        })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs font-bold text-tinta"
                      >
                        {ESTADOS_UF.map(({ uf, nome }) => (
                          <option key={uf} value={uf}>{nome} ({uf})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-tinta-2 block mb-1">Município</label>
                      <input
                        type="text"
                        value={formData.endereco?.municipio || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endereco: { ...(formData.endereco || { cep: '', logradouro: '', numero: '', bairro: '', municipio: '' }), municipio: e.target.value } 
                        })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta"
                        placeholder="Jacarezinho"
                      />
                    </div>
                  </div>
                </div>

              </div>
              </div>
            </FormularioCadastro>
          ) : selectedRca ? (
            
            /* VISUALIZAÇÃO DOS DETALHES DO RCA */
            <div className="@container w-full max-w-5xl mx-auto space-y-5">
              <div className="flex items-center gap-2 pt-1 md:pt-0">
                <button
                  type="button"
                  onClick={() => setDetalheMovel(false)}
                  className="md:hidden inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-[13px] font-semibold text-eno-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Representantes
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <BotaoSecundario onClick={() => handleEditarRca(selectedRca)} className="h-10 sm:h-9">
                    <Edit2 className="w-4 h-4" /> Editar
                  </BotaoSecundario>
                  <BotaoSecundario onClick={() => handleExcluirRca(selectedRca)} className="h-10 sm:h-9 hover:!text-st-vencido hover:!bg-st-vencido-bg" aria-label="Excluir representante">
                    <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Excluir</span>
                  </BotaoSecundario>
                </div>
              </div>
              
              {/* CARTÃO SUPERIOR: PERFIL DO RCA */}
              <div className="bg-papel rounded-md border border-linha p-6  text-left">
                <div className="flex flex-col @2xl:flex-row @2xl:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-eno-900 text-eno-600 tabular-nums text-xs font-extrabold tracking-wider">
                        {selectedRca.codigo_rca}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedRca.status === 'Ativo' ? 'bg-eno-100 text-eno-800 border-linha-forte' : 'bg-papel-2 text-tinta-2 border-linha-forte'
                      }`}>
                        {selectedRca.status}
                      </span>
                      <span className="text-xs text-cinza font-medium">
                        Desde {selectedRca.data_admissao_contrato}
                      </span>
                    </div>

                    <h2 className="text-2xl font-extrabold text-tinta tracking-tight">
                      {selectedRca.nome_completo}
                    </h2>

                    {selectedRca.nome_fantasia && (
                      <p className="text-sm font-semibold text-eno-800">
                        {selectedRca.nome_fantasia}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-xs text-tinta-2 font-medium">
                      <span className="tabular-nums bg-papel-2 px-2 py-0.5 rounded border border-linha">
                        {selectedRca.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}: {selectedRca.cpf_cnpj}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-cinza" />
                        {selectedRca.whatsapp || selectedRca.telefone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-cinza" />
                        {selectedRca.email}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          acessoDoSelecionado
                            ? acessoDoSelecionado.ativo ? 'bg-eno-100 text-eno-800 border-linha-forte' : 'bg-papel-2 text-tinta-2 border-linha-forte'
                            : 'bg-st-aguardando-bg text-st-aguardando border-st-aguardando/30'
                        }`}
                        title={acessoDoSelecionado ? `Login do portal: ${acessoDoSelecionado.usuario}` : 'Edite o RCA para criar o login do portal'}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {acessoDoSelecionado
                          ? `Portal: ${acessoDoSelecionado.usuario}${acessoDoSelecionado.ativo ? '' : ' (desativado)'}`
                          : 'Sem acesso ao portal'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-eno-600" />
                        {selectedRca.regiao_atuacao || `${selectedRca.endereco.municipio}/${selectedRca.endereco.uf}`}
                      </span>
                    </div>
                  </div>

                  {/* BOX PIX COM CÓPIA RÁPIDA */}
                  <div className="bg-eno-50/80 border border-linha-forte rounded-md p-4 @2xl:w-80 shrink-0 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-eno-800 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-eno-600" />
                        Chave PIX Cadastrada ({selectedRca.tipo_chave_pix})
                      </span>
                    </div>
                    <p className="tabular-nums text-xs font-extrabold text-tinta break-all select-all">
                      {selectedRca.chave_pix}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-linha-forte/60">
                      <span className="text-[10px] text-cinza font-medium">
                        {selectedRca.banco_nome ? `${selectedRca.banco_nome} • Ag: ${selectedRca.agencia}` : 'PIX Direto'}
                      </span>
                      <button
                        onClick={() => handleCopiarPix(selectedRca.chave_pix)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-eno-700 hover:bg-eno-800 text-white text-[11px] font-bold  transition-all cursor-pointer"
                      >
                        {copiedPix ? <Check className="w-3 h-3 text-eno-100" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 CARDS DE INDICADORES (SEM METAS) */}
              <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-4 text-left">
                <div className="bg-papel p-4 rounded-md border border-linha ">
                  <span className="text-[11px] font-bold uppercase text-cinza block mb-1">Modelo de Comissão</span>
                  <p className="text-base font-extrabold text-tinta flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-eno-600" />
                    {getNomeModeloComissao(selectedRca.modelo_comissao)}
                  </p>
                  <span className="text-[11px] text-cinza font-medium">Taxa base: {selectedRca.comissao_padrao_percentual}%</span>
                </div>

                <div className="bg-papel p-4 rounded-md border border-linha ">
                  <span className="text-[11px] font-bold uppercase text-cinza block mb-1">Total Faturado</span>
                  <p className="text-lg font-extrabold text-tinta tabular-nums">
                    R$ {statsRca.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-eno-600 font-bold">{vendasDoRca.length} Pedidos Faturados</span>
                </div>

                <div className="bg-papel p-4 rounded-md border border-linha ">
                  <span className="text-[11px] font-bold uppercase text-cinza block mb-1">Comissões Pagas (PIX)</span>
                  <p className="text-lg font-extrabold text-eno-700 tabular-nums">
                    R$ {statsRca.comissaoPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-cinza font-medium">Repassadas com sucesso</span>
                </div>

                <div className="bg-papel p-4 rounded-md border border-linha ">
                  <span className="text-[11px] font-bold uppercase text-cinza block mb-1">Comissões a Pagar</span>
                  <p className="text-lg font-extrabold text-st-aguardando tabular-nums">
                    R$ {statsRca.comissaoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-st-aguardando font-bold">Liberadas / Pendentes</span>
                </div>

                <div className={`bg-papel p-4 rounded-md border ${saldoAdiantamentoRca(selectedRca) > 0 ? 'border-st-aguardando' : 'border-linha'}`}>
                  <span className="text-[11px] font-bold uppercase text-cinza block mb-1">Adiantamento a descontar</span>
                  <p className="text-lg font-extrabold text-st-aguardando tabular-nums">
                    R$ {saldoAdiantamentoRca(selectedRca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-cinza font-medium">Desconta das próximas comissões pagas</span>
                </div>
              </div>

              {/* ADIANTAMENTOS AO RCA (dinheiro entregue antes das comissões) */}
              <div className="bg-papel rounded-md border border-linha p-6 text-left">
                <div className="pb-3 mb-4 border-b border-linha">
                  <h3 className="text-sm font-extrabold text-tinta">Adiantamentos ao RCA</h3>
                  <p className="text-[11px] text-cinza">Sai do caixa no lançamento e é descontado das comissões pagas, da mais antiga para a mais nova.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 items-end">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-tinta-2 mb-1">Valor (R$)</label>
                    <input
                      inputMode="decimal"
                      value={adiantValor}
                      onChange={e => setAdiantValor(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-papel-2 border border-linha rounded-md px-3 py-2 text-[13px] text-tinta tabular-nums focus:outline-none focus:border-eno-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-tinta-2 mb-1">Observação</label>
                    <input
                      value={adiantObs}
                      onChange={e => setAdiantObs(e.target.value)}
                      placeholder="Ex: adiantamento da safra"
                      className="w-full bg-papel-2 border border-linha rounded-md px-3 py-2 text-[13px] text-tinta focus:outline-none focus:border-eno-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLancarAdiantamento}
                    className="h-10 px-4 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-[13px] cursor-pointer"
                  >
                    Lançar adiantamento
                  </button>
                </div>
                <div className="mt-4 divide-y divide-linha">
                  {(selectedRca.adiantamentos || []).length === 0 ? (
                    <p className="text-[12px] text-cinza py-2">Nenhum adiantamento lançado.</p>
                  ) : (
                    [...(selectedRca.adiantamentos || [])].reverse().map(a => (
                      <div key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                        <span className="text-tinta">
                          {a.data} · {a.observacao || 'Adiantamento'}
                        </span>
                        <span className="text-tinta-2 tabular-nums">
                          R$ {a.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · descontado R$ {(a.descontado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ·{' '}
                          <strong className={a.valor - (a.descontado || 0) > 0 ? 'text-st-aguardando' : 'text-eno-700'}>
                            {a.valor - (a.descontado || 0) > 0 ? `falta R$ ${(a.valor - (a.descontado || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'quitado'}
                          </strong>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* REGRAS ATIVAS DE COMISSÃO (ANTI-DUPLICIDADE) */}
              <div className="bg-papel rounded-md border border-linha p-6  text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-linha">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-eno-700" />
                    <div>
                      <h3 className="text-sm font-extrabold text-tinta">Grade de Comissões do RCA</h3>
                      <p className="text-[11px] text-cinza">Regras configuradas pelo administrador com garantia anti-duplicidade de comissão</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-papel-2 text-tinta-2 text-xs font-bold border border-linha">
                    Modo: {getNomeModeloComissao(selectedRca.modelo_comissao)}
                  </span>
                </div>

                <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-4">
                  {/* Regra Geral */}
                  <div className="bg-papel-2 p-3.5 rounded-md border border-linha">
                    <span className="text-[10px] font-bold uppercase text-cinza block mb-1">1. Taxa Geral Padrão</span>
                    <p className="text-xl font-extrabold text-tinta tabular-nums">{selectedRca.comissao_padrao_percentual}%</p>
                    <p className="text-[11px] text-cinza mt-1">Aplicada quando não houver regra específica de grupo ou cliente.</p>
                  </div>

                  {/* Regras por Produto (modelo 'por_produto' substitui o card de grupo) */}
                  {selectedRca.modelo_comissao === 'por_produto' ? (
                  <div className="bg-papel-2 p-3.5 rounded-md border border-linha">
                    <span className="text-[10px] font-bold uppercase text-eno-800 block mb-1">2. Por Produto ({selectedRca.comissoes_por_produto?.length || 0})</span>
                    {selectedRca.comissoes_por_produto && selectedRca.comissoes_por_produto.length > 0 ? (
                      <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                        {selectedRca.comissoes_por_produto.map(cp => (
                          <div key={cp.produto_id} className="flex items-center justify-between text-xs bg-papel p-1.5 rounded border border-linha">
                            <span className="line-clamp-1 text-tinta-2 font-medium">{cp.produto_nome}</span>
                            <span className="tabular-nums font-bold text-eno-700 ml-2 tabular-nums">{cp.percentual}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-cinza italic mt-2">Nenhum produto com % próprio: todos usam a taxa padrão.</p>
                    )}
                  </div>
                  ) : (
                  <div className="bg-papel-2 p-3.5 rounded-md border border-linha">
                    <span className="text-[10px] font-bold uppercase text-eno-800 block mb-1">2. Por Grupo de Produto ({selectedRca.comissoes_por_grupo?.length || 0})</span>
                    {selectedRca.comissoes_por_grupo && selectedRca.comissoes_por_grupo.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {selectedRca.comissoes_por_grupo.map(cg => (
                          <div key={cg.id} className="flex items-center justify-between text-xs bg-papel p-1.5 rounded border border-linha">
                            <span className="line-clamp-1 text-tinta-2 font-medium">{cg.grupo_nome}</span>
                            <span className="tabular-nums font-bold text-eno-700 ml-2">{cg.percentual}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-cinza italic mt-2">Nenhuma taxa de grupo customizada.</p>
                    )}
                  </div>
                  )}

                  {/* Regras por Cliente */}
                  <div className="bg-papel-2 p-3.5 rounded-md border border-linha">
                    <span className="text-[10px] font-bold uppercase text-st-aguardando block mb-1">3. Por Cliente Específico ({selectedRca.comissoes_por_cliente?.length || 0})</span>
                    {selectedRca.comissoes_por_cliente && selectedRca.comissoes_por_cliente.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {selectedRca.comissoes_por_cliente.map(cc => (
                          <div key={cc.id} className="flex items-center justify-between text-xs bg-papel p-1.5 rounded border border-linha">
                            <span className="line-clamp-1 text-tinta-2 font-medium">{cc.cliente_nome}</span>
                            <span className="tabular-nums font-bold text-st-aguardando ml-2">{cc.percentual}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-cinza italic mt-2">Nenhuma taxa individual de cliente.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO DE CLIENTES VINCULADOS (CARTEIRA DO RCA) */}
              <div className="bg-papel rounded-md border border-linha p-6  text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-linha">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-eno-700" />
                    <div>
                      <h3 className="text-base font-extrabold text-tinta">Carteira de Clientes Vinculados ({clientesDoRca.length})</h3>
                      <p className="text-xs text-cinza">Clique em qualquer cliente para ver detalhes cadastrais, compras e navegar para a ficha completa</p>
                    </div>
                  </div>
                </div>

                {clientesDoRca.length === 0 ? (
                  <div className="p-8 text-center text-cinza">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-cinza-claro" />
                    <p className="text-sm font-semibold">Nenhum cliente vinculado a este RCA</p>
                    <p className="text-xs mt-1">Edite o cadastro para vincular clientes à carteira.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 @xl:grid-cols-2 gap-3">
                    {clientesDoRca.map((cli) => {
                      return (
                        <div
                          key={cli.id}
                          onClick={() => setClienteModal(cli)}
                          className="p-4 rounded-md border border-linha/90 bg-papel hover:bg-eno-50/40 hover:border-eno-600/50 transition-all cursor-pointer  group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-extrabold text-tinta group-hover:text-eno-800 transition-colors line-clamp-1">
                                {cli.razao_social}
                              </h4>
                              {cli.nome_fantasia && (
                                <p className="text-xs font-medium text-cinza line-clamp-1">{cli.nome_fantasia}</p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-eno-100 text-eno-800 border border-linha-forte shrink-0">
                              {cli.status}
                            </span>
                          </div>

                          <div className="mt-2.5 grid grid-cols-3 gap-2 text-left [&>div]:min-w-0 [&>div>span:last-child]:whitespace-nowrap bg-papel-2 p-2.5 rounded-lg border border-linha">
                            <div>
                              <span className="text-[10px] text-cinza font-bold block uppercase">Compras</span>
                              <span className="text-xs font-extrabold text-tinta">{cli.qtd_compras} pedidos</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-cinza font-bold block uppercase">Total Faturado</span>
                              <span className="text-xs font-extrabold text-eno-700 tabular-nums">
                                R$ {(cli.valor_total_compras / 1000).toFixed(1)}k
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-cinza font-bold block uppercase">Última Compra</span>
                              <span className="text-xs font-semibold text-tinta-2">{cli.ultima_compra_data}</span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-linha flex items-center justify-between text-[11px]">
                            <span className="text-cinza flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cinza" />
                              {cli.municipio}/{cli.uf}
                            </span>
                            <span className="text-eno-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
              <div className="bg-papel rounded-md border border-linha p-6  text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-linha">
                  <div>
                    <h3 className="text-base font-extrabold text-tinta">Evolução de Vendas & Comissões (Últimos 6 Meses)</h3>
                    <p className="text-xs text-cinza">Comparativo mensal de faturamento líquido gerado e comissões repassadas</p>
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
              <div className="bg-papel rounded-md border border-linha p-6  text-left">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-linha">
                  <div>
                    <h3 className="text-base font-extrabold text-tinta">Extrato de Vendas & Liquidação de Comissões</h3>
                    <p className="text-xs text-cinza">Pedidos faturados, regra aplicada e status real do título de comissão no Contas a Pagar</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-linha bg-papel-2 text-tinta-2 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Pedido</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Cliente / Cidade</th>
                        <th className="py-2.5 px-3">Regra Aplicada</th>
                        <th className="py-2.5 px-3 text-right">Faturado</th>
                        <th className="py-2.5 px-3 text-right">% Com.</th>
                        <th className="py-2.5 px-3 text-right">Comissão</th>
                        <th className="py-2.5 px-3 text-center">Contas a Pagar</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-linha">
                      {vendasDoRca.map((v) => {
                        const isPago = v.status_comissao === 'Pago (PIX)';
                        return (
                          <tr key={v.id} className="hover:bg-papel-2/80 transition-colors">
                            <td className="py-3 px-3 tabular-nums font-bold text-tinta">{v.numero_pedido}</td>
                            <td className="py-3 px-3 text-tinta-2">{formatarDataBR(v.data)}</td>
                            <td className="py-3 px-3 !whitespace-normal min-w-40">
                              <p className="font-bold text-tinta line-clamp-1">{v.cliente_nome}</p>
                              <p className="text-[10px] text-cinza">{v.cliente_cidade}</p>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                v.tipo_regra_aplicada === 'Por Cliente' ? 'bg-st-aguardando-bg text-st-aguardando border-st-aguardando/30' :
                                v.tipo_regra_aplicada === 'Por Grupo' ? 'bg-papel-2 text-tinta-2 border-linha-forte' :
                                v.tipo_regra_aplicada === 'Por Produto' ? 'bg-papel-2 text-tinta-2 border-linha-forte' :
                                v.tipo_regra_aplicada === 'Mista' ? 'bg-papel-2 text-tinta-2 border-linha-forte' :
                                'bg-papel-2 text-tinta-2 border-linha'
                              }`}>
                                {rotuloRegraComissao(v.tipo_regra_aplicada)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-tinta font-bold">
                              R$ {v.valor_faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums font-bold text-eno-700">
                              {v.percentual_comissao}%
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums font-extrabold text-eno-800">
                              R$ {v.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPago ? 'bg-eno-100 text-eno-800 border-linha-forte' :
                                v.titulo_status === 'VENCIDO' ? 'bg-st-vencido-bg text-st-vencido border-st-vencido/30' :
                                'bg-st-aguardando-bg text-st-aguardando border-st-aguardando/30'
                              }`}>
                                {v.titulo_pagar_id
                                  ? (isPago ? 'Pago (PIX)' : v.titulo_status === 'VENCIDO' ? 'Vencido' : 'A pagar')
                                  : (isPago ? 'Pago (PIX)' : 'Sem título')}
                              </span>
                              {v.titulo_pagar_id && !isPago && v.titulo_vencimento && (
                                <span className="block text-[10px] text-cinza mt-0.5">vence {formatarDataBR(v.titulo_vencimento)}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!isPago && (
                                <button
                                  onClick={() => handleLiquidadoPix(v.id)}
                                  className="px-2.5 py-1 bg-eno-700 hover:bg-eno-800 text-white rounded-lg text-[10px] font-bold transition-all  cursor-pointer"
                                >
                                  Pagar PIX
                                </button>
                              )}
                              {isPago && (
                                <span className="text-[10px] text-cinza font-medium">{formatarDataBR(v.data_pagamento_pix)}</span>
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
            <div className="w-full bg-papel border border-linha rounded-md">
              <EstadoVazio titulo="Nenhum representante selecionado" texto="Escolha um representante na lista para ver carteira, comissões e extrato." />
            </div>
          )}

        </div>

      </div>

      {/* MODAL DE DETALHES DO CLIENTE VINCULADO (AMPLO E HORIZONTAL) */}
      {clienteModal && (
        <div className="fixed inset-0 bg-eno-900/60 backdrop-blur-xs z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="min-w-0 bg-papel rounded-md border border-linha  max-w-4xl sm:max-w-5xl w-full p-6 text-left my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between pb-4 border-b border-linha">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-eno-100 text-eno-800 flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-tinta leading-tight">
                    {clienteModal.razao_social}
                  </h3>
                  {clienteModal.nome_fantasia && (
                    <p className="text-xs font-semibold text-eno-700">{clienteModal.nome_fantasia}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setClienteModal(null)}
                className="p-2 rounded-md text-cinza hover:text-tinta-2 hover:bg-papel-2 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações Cadastrais e Indicadores em Grid Amplo Lado a Lado */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Coluna 1: Dados Cadastrais */}
              <div className="space-y-3">
                <span className="font-bold text-tinta uppercase tracking-wider text-[11px] block">
                  Identificação & Contato
                </span>
                <div className="grid grid-cols-2 gap-3 bg-papel-2 p-4 rounded-md border border-linha">
                  <div>
                    <span className="text-[10px] font-bold text-cinza uppercase block">CNPJ / CPF</span>
                    <span className="tabular-nums font-bold text-tinta">{clienteModal.cpf_cnpj}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-cinza uppercase block">Cidade / UF</span>
                    <span className="font-semibold text-tinta">{clienteModal.municipio} / {clienteModal.uf}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-cinza uppercase block">Telefone</span>
                    <span className="text-tinta-2 font-medium">{clienteModal.telefone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-cinza uppercase block">E-mail</span>
                    <span className="text-tinta-2 font-medium line-clamp-1">{clienteModal.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-papel-2 p-3 rounded-md border border-linha">
                  <span><strong>Tabela de Preço:</strong> {clienteModal.tabela_preco_nome}</span>
                  <span><strong>Prazo Comercial:</strong> {clienteModal.prazo_pagamento_nome}</span>
                </div>
              </div>

              {/* Coluna 2: Indicadores de Performance & Última Compra */}
              <div className="space-y-3">
                <span className="font-bold text-tinta uppercase tracking-wider text-[11px] block">
                  Performance Comercial
                </span>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-eno-50/70 p-3 rounded-md border border-linha-forte/80">
                    <span className="text-[10px] font-bold text-eno-800 uppercase block">Pedidos</span>
                    <span className="text-base font-extrabold text-eno-950">{clienteModal.qtd_compras}</span>
                  </div>
                  <div className="bg-eno-50/70 p-3 rounded-md border border-linha-forte/80">
                    <span className="text-[10px] font-bold text-eno-800 uppercase block">Volume Total</span>
                    <span className="text-base font-extrabold text-eno-950 tabular-nums">
                      R$ {(clienteModal.valor_total_compras / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="bg-eno-50/70 p-3 rounded-md border border-linha-forte/80">
                    <span className="text-[10px] font-bold text-eno-800 uppercase block">Ticket Médio</span>
                    <span className="text-base font-extrabold text-eno-950 tabular-nums">
                      R$ {(clienteModal.ticket_medio / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>

                {/* Detalhes da Última Compra */}
                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-tinta-2 uppercase flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-eno-600" />
                      Última Compra Registrada
                    </span>
                    <span className="tabular-nums text-xs font-bold text-tinta bg-papel px-2 py-0.5 rounded-md border border-linha">
                      {clienteModal.ultima_compra_pedido}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-cinza font-medium">Data: {clienteModal.ultima_compra_data}</span>
                    <span className="tabular-nums font-extrabold text-eno-800 text-base">
                      R$ {clienteModal.ultima_compra_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="mt-6 pt-4 border-t border-linha flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setClienteModal(null)}
                className="px-4 py-2.5 rounded-md bg-papel-2 hover:bg-papel-3 text-tinta-2 text-xs font-bold transition-colors cursor-pointer"
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
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-eno-700 hover:bg-eno-800 text-white text-xs font-extrabold  transition-all cursor-pointer"
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
