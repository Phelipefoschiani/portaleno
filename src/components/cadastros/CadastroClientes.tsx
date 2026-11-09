import React, { useState, useMemo } from 'react';
import { aplicarCodigosNoArmazenamento } from '../../lib/codigos';
import { lerRascunho, apagarRascunho, useRascunho } from '../../lib/rascunho';
import { mascaraCpfCnpj, mascaraInscricaoEstadual, ESTADOS_UF } from '../../lib/mascarasCadastro';
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
  Tag,
  KeyRound
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
import { carregarRcas, EVENTO_CADASTROS_ATUALIZADOS, RCA, sincronizarEspelhoClienteRca } from '../../data/cadastrosData';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { carregarTitulosReceber } from '../../data/financeiroData';
import { carregarTabelasPreco } from '../../data/produtosData';
import { mesReferenciaDe, ultimosMesesReferencia } from '../../lib/mesesReferencia';
import { formatarDataBR } from '../../lib/datas';
import { lerCondicao, normalizarDias, textoCondicao } from '../../lib/prazoPagamento';
import { obterSessao, obterUsuarioPorVinculo, listarUsuarios, EVENTO_AUTH_ATUALIZADO, UsuarioSistema } from '../../lib/auth';
import {
  AcessoPortalSecao,
  EstadoAcessoPortal,
  estadoAcessoInicial,
  planejarAcessoPortal,
  aplicarAcessoPortal,
} from './AcessoPortalSecao';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { Painel } from '../ui/Painel';
import { CORES } from '../ui/tokens';
import { FormularioCadastro, ChaveAtivo, BotaoLinha, BotaoCartao } from './FormularioCadastro';

// Converte os pedidos de venda reais do cliente para a estrutura do histórico
// rcaId (Portal do RCA): só os pedidos feitos por aquele RCA
function montarHistoricoCompras(clienteId: string, rcaId?: string): CompraCliente[] {
  const titulos = carregarTitulosReceber();
  return carregarPedidosVenda()
    .filter((p: PedidoVenda) => p.cliente_id === clienteId && p.tipo === 'PEDIDO_VENDA' && p.etapa !== 'ORCAMENTO')
    .filter((p: PedidoVenda) => !rcaId || p.rca_id === rcaId)
    .map((p: PedidoVenda): CompraCliente => {
      const titulosPedido = titulos.filter(t => t.pedido_venda_id === p.id);
      const statusFin: CompraCliente['status_financeiro'] =
        titulosPedido.length > 0 && titulosPedido.every(t => t.status === 'PAGO')
          ? 'Liquidado'
          : titulosPedido.some(t => t.status === 'VENCIDO') ? 'Vencido' : 'A Vencer';
      return {
        id: p.id,
        empresa_id: 'emp_grupo_eno',
        cliente_id: p.cliente_id,
        numero_pedido: p.numero_pedido,
        emitido_em: formatarDataBR(p.data_emissao),
        data_entrega: p.data_entrega_realizada ? formatarDataBR(p.data_entrega_realizada) : undefined,
        status_nome: p.etapa === 'ENTREGUE' ? 'Entregue' : p.etapa === 'EM_PRODUCAO' ? 'Em Produção' : 'Faturado',
        nota_fiscal: p.nota_fiscal ? { numero: p.nota_fiscal.numero, serie: p.nota_fiscal.serie, chave_acesso: p.nota_fiscal.chave_acesso } : undefined,
        itens: (p.itens || []).map(i => ({
          produto_nome: i.produto_nome,
          tipo_embalagem: String(i.tipo_embalagem || ''),
          quantidade: Number(i.quantidade) || 0,
          preco_unitario: Number(i.preco_unitario) || 0,
          total: Number(i.subtotal) || 0,
          lote_produto: i.lote_producao,
        })),
        valor_total: Number(p.valor_total) || 0,
        status_financeiro: statusFin,
        mes_referencia: mesReferenciaDe(p.data_emissao),
      };
    });
}

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
  { id: 'fp_6', nome: 'Conta corrente' },
];


// Tabelas de Preço reais (Produtos > Tabelas de Preço); arquivadas não aparecem para novos vínculos
function opcoesTabelasPreco(): { id: string; nome: string }[] {
  return carregarTabelasPreco()
    .filter(t => t.status !== 'ARQUIVADA')
    .map(t => ({ id: t.id, nome: `${t.nome} (${t.codigo})` }));
}


// Tooltip customizado para o gráfico
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-eno-900 text-white px-3 py-2 rounded-md text-xs">
        <p className="font-semibold text-white/60">{label}</p>
        <p className="font-extrabold text-white tabular-nums text-sm mt-0.5">
          R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export interface CadastroClientesProps {
  clienteIdInicial?: string | null;
  /**
   * Portal do RCA: só os clientes com vendedor_id === rcaFixoId; novos clientes já nascem
   * vinculados a ele e o representante não pode ser trocado.
   */
  rcaFixoId?: string;
  /** Quando muda (> 0), abre o formulário de novo cliente (atalho do portal do RCA). */
  abrirNovoSinal?: number;
}

const soDigitos = (s?: string) => String(s || '').replace(/\D/g, '');

export function CadastroClientes({ clienteIdInicial, rcaFixoId, abrirNovoSinal }: CadastroClientesProps = {}) {
  const modoRca = !!rcaFixoId;
  const abrirNovoRef = React.useRef<() => void>(() => {});
  abrirNovoRef.current = () => abrirFormularioNovo(); // definido mais abaixo; chamado só depois do render
  React.useEffect(() => {
    if (abrirNovoSinal) abrirNovoRef.current();
  }, [abrirNovoSinal]);
  const [todosClientes, setClientes] = useState<Cliente[]>(() => carregarClientes());
  // No Portal do RCA a tela só enxerga a carteira dele
  const clientes = useMemo(
    () => (rcaFixoId ? todosClientes.filter(c => c.vendedor_id === rcaFixoId) : todosClientes),
    [todosClientes, rcaFixoId]
  );
  const ehDoRca = (c?: Cliente | null) => !modoRca || (!!c && c.vendedor_id === rcaFixoId);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PJ' | 'PF'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  
  // Controle de Navegação: 'lista', 'formulario' ou 'historico'
  const [modo, setModo] = useState<'lista' | 'formulario' | 'historico'>('lista');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  // Acesso opcional ao Portal do Cliente (somente administrador cria/edita logins)
  const podeGerirAcesso = !modoRca && obterSessao()?.perfil === 'ADMIN';
  const [acessoEstado, setAcessoEstado] = useState<EstadoAcessoPortal>(() => estadoAcessoInicial());
  const [acessoExistente, setAcessoExistente] = useState<UsuarioSistema | undefined>(undefined);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [versaoAuth, setVersaoAuth] = useState(0);
  React.useEffect(() => {
    const h = () => setVersaoAuth(v => v + 1);
    window.addEventListener(EVENTO_AUTH_ATUALIZADO, h);
    return () => window.removeEventListener(EVENTO_AUTH_ATUALIZADO, h);
  }, []);
  // Clientes com login no portal (badge na lista do admin)
  const acessosClientes = useMemo(() => {
    const m = new Map<string, UsuarioSistema>();
    if (!podeGerirAcesso) return m;
    listarUsuarios().forEach(u => { if (u.perfil === 'CLIENTE' && u.vinculo_id) m.set(u.vinculo_id, u); });
    return m;
  }, [versaoAuth, podeGerirAcesso]);

  // RCAs cadastrados (Cadastro de RCA) para o vínculo vendedor_id do cliente
  const [rcasCadastrados, setRcasCadastrados] = useState<RCA[]>(() => carregarRcas());
  React.useEffect(() => {
    const handleRcas = () => setRcasCadastrados(carregarRcas());
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleRcas);
    return () => window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleRcas);
  }, []);

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
    prazo_dias: string;
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
    prazo_pagamento_id: 'livre',
    prazo_dias: '',
    vendedor_id: '',
    tabela_preco_id: '',
    ativo: true,
  });

  // Rascunho: enquanto cadastra um cliente novo, o formulário fica guardado
  useRascunho(`clientes${modoRca ? '_rca' : ''}`, formData, modo === 'formulario' && !clienteSelecionado);

  const abrirFormularioNovo = () => {
    setClienteSelecionado(null);
    setFormData(lerRascunho<typeof formData>(`clientes${modoRca ? '_rca' : ''}`) ?? {
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
      prazo_pagamento_id: 'livre',
      prazo_dias: '',
      vendedor_id: rcaFixoId || '',
      // Tabela de preço é sempre definida pela fábrica (administrador); o RCA não escolhe
      tabela_preco_id: '',
      ativo: true,
    });
    setAcessoExistente(undefined);
    setAcessoEstado(estadoAcessoInicial());
    setModo('formulario');
  };

  const abrirFormularioEditar = (cliente: Cliente) => {
    if (!ehDoRca(cliente)) return;
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
      prazo_dias: lerCondicao(cliente.prazo_pagamento_nome).dias,
      vendedor_id: cliente.vendedor_id || '',
      tabela_preco_id: cliente.tabela_preco_id || '',
      ativo: cliente.ativo,
    });
    const usuarioCliente = podeGerirAcesso ? obterUsuarioPorVinculo('CLIENTE', cliente.id) : undefined;
    setAcessoExistente(usuarioCliente);
    setAcessoEstado(estadoAcessoInicial(usuarioCliente));
    setModo('formulario');
  };

  const abrirHistorico = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    // Limpa a seleção de pedido expandido ao abrir um novo cliente
    setPedidoExpandidoId(null);
    setModo('historico');
  };

  const alternarStatusCliente = (id: string) => {
    const base = carregarClientes();
    if (!ehDoRca(base.find(c => c.id === id))) return; // RCA só altera cliente da própria carteira
    const atualizados = base.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c);
    setClientes(atualizados);
    salvarClientes(atualizados);
  };

  // Login do portal gravado depois do cadastro (o cliente já fica salvo mesmo se o acesso falhar)
  const gravarAcessoCliente = async (plano: ReturnType<typeof planejarAcessoPortal> | null, clienteId: string, nome: string) => {
    if (!plano || !('plano' in plano)) return;
    try {
      const msg = await aplicarAcessoPortal(plano.plano, { perfil: 'CLIENTE', vinculoId: clienteId, nome });
      if (msg) alert(msg);
    } catch (err) {
      alert(`O cliente foi salvo, mas o acesso ao portal não foi gravado: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
    }
  };

  const salvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoCliente) return;

    if (!formData.razao_nome.trim() || !formData.cpf_cnpj.trim()) {
      alert('A Razão Social/Nome e o CPF/CNPJ são campos obrigatórios para o cadastro.');
      return;
    }

    // Acesso ao Portal do Cliente (opcional, só admin): valida antes de gravar
    let planoAcesso: ReturnType<typeof planejarAcessoPortal> | null = null;
    if (podeGerirAcesso) {
      planoAcesso = planejarAcessoPortal(acessoEstado, acessoExistente, formData.email);
      if ('erro' in planoAcesso) {
        alert(planoAcesso.erro);
        return;
      }
      if (planoAcesso.plano.acao === 'remover' && !window.confirm('Remover o acesso deste cliente ao portal? O login será excluído.')) return;
    }
    const nomeAcesso = formData.fantasia?.trim() || formData.razao_nome.trim();

    const fp = FORMAS_PAGAMENTO_OPTIONS.find(f => f.id === formData.forma_pagamento_id);
    // Prazo digitado livremente (ex.: 28 ou 28/35/42); vazio = à vista
    const pp = { nome: textoCondicao(fp?.nome || 'Boleto Bancário', formData.prazo_dias) };
    // Portal do RCA: o representante é sempre o RCA logado
    const rcaSel = rcasCadastrados.find(r => r.id === (rcaFixoId || formData.vendedor_id));
    if (modoRca && !rcaSel) {
      alert('Seu cadastro de RCA não foi encontrado. Fale com o administrador.');
      return;
    }
    const vend = rcaSel ? { nome: rcaSel.nome_fantasia || rcaSel.nome_completo } : undefined;
    const tab = opcoesTabelasPreco().find(t => t.id === formData.tabela_preco_id);
    // Sempre grava sobre a lista atual do armazenamento (no portal a tela só tem a carteira do RCA)
    const base = carregarClientes();

    if (modoRca) {
      if (clienteSelecionado && !ehDoRca(base.find(c => c.id === clienteSelecionado.id))) {
        alert('Este cliente não está mais na sua carteira.');
        setModo('lista');
        return;
      }
      const doc = soDigitos(formData.cpf_cnpj);
      const duplicado = doc && base.some(c => c.id !== clienteSelecionado?.id && soDigitos(c.cpf_cnpj) === doc);
      if (duplicado) {
        alert('Já existe um cliente cadastrado com este CPF/CNPJ. Peça ao administrador para vinculá-lo à sua carteira.');
        return;
      }
    }

    if (clienteSelecionado) {
      // UPDATE
      const atualizados = base.map(c => c.id === clienteSelecionado.id ? {
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
        prazo_pagamento_id: 'livre',
        prazo_pagamento_nome: pp.nome,
        vendedor_id: rcaSel ? rcaSel.id : undefined,
        vendedor_nome: vend?.nome,
        tabela_preco_id: formData.tabela_preco_id,
        tabela_preco_nome: tab?.nome,
        ativo: formData.ativo,
      } : c);
      setClientes(atualizados);
      salvarClientes(atualizados);
      sincronizarEspelhoClienteRca(clienteSelecionado.id, rcaSel?.id);
      setSalvandoCliente(true);
      try {
        await gravarAcessoCliente(planoAcesso, clienteSelecionado.id, nomeAcesso);
      } finally {
        setSalvandoCliente(false);
      }
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
        prazo_pagamento_id: 'livre',
        prazo_pagamento_nome: pp.nome,
        vendedor_id: rcaSel ? rcaSel.id : undefined,
        vendedor_nome: vend?.nome,
        tabela_preco_id: formData.tabela_preco_id,
        tabela_preco_nome: tab?.nome,
        ativo: formData.ativo,
        criado_em: new Date().toISOString(),
      };
      const atualizados = [novo, ...base];
      setClientes(atualizados);
      salvarClientes(atualizados);
      // Código do cliente (CL + RCA + sequência) é atribuído na hora
      aplicarCodigosNoArmazenamento();
      setClientes(carregarClientes());
      sincronizarEspelhoClienteRca(novo.id, rcaSel?.id);
      setSalvandoCliente(true);
      try {
        await gravarAcessoCliente(planoAcesso, novo.id, nomeAcesso);
      } finally {
        setSalvandoCliente(false);
      }
    }

    apagarRascunho(`clientes${modoRca ? '_rca' : ''}`);
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

  // Recarrega o histórico quando pedidos/financeiro mudarem
  const [versaoPedidos, setVersaoPedidos] = useState(0);
  React.useEffect(() => {
    const h = () => setVersaoPedidos(v => v + 1);
    window.addEventListener('pedidos_venda_updated', h);
    window.addEventListener('financeiro_updated', h);
    return () => {
      window.removeEventListener('pedidos_venda_updated', h);
      window.removeEventListener('financeiro_updated', h);
    };
  }, []);

  // Compras do cliente selecionado
  const comprasDoCliente = useMemo(() => {
    if (!clienteSelecionado) return [];
    return montarHistoricoCompras(clienteSelecionado.id, rcaFixoId);
  }, [clienteSelecionado, versaoPedidos, rcaFixoId]);

  const totalComprado = useMemo(() => {
    return comprasDoCliente.reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [comprasDoCliente]);

  // Dados estruturados para o Gráfico de Linhas Mensal do Faturamento
  const dadosGraficoMensal = useMemo(() => {
    const ordemMeses = ultimosMesesReferencia(6);
    const mapaMeses: Record<string, number> = Object.fromEntries(ordemMeses.map(m => [m, 0]));

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

  const ativosCount = clientes.filter(c => c.ativo).length;
  const semTabelaCount = clientes.filter(c => c.ativo && !c.tabela_preco_id).length;

  return (
    <div className={`flex-1 w-full min-h-0 h-full flex flex-col text-tinta ${modoRca ? '' : 'bg-papel-2 overflow-hidden'}`}>

      {/* ========================================================================= */}
      {/* VISTA 1: LISTA DE CLIENTES (cartões no celular, tabela densa a partir de sm) */}
      {/* ========================================================================= */}
      {modo === 'lista' && (
        <>
          <div className={modoRca ? '' : 'mx-auto w-full max-w-[1700px]'}>
            <CabecalhoPagina
              titulo={modoRca ? 'Meus clientes' : 'Clientes'}
              resumo={
                clientes.length === 0
                  ? (modoRca ? 'Sua carteira ainda está vazia' : 'Nenhum cliente cadastrado')
                  : <>
                      {clientes.length} {clientes.length === 1 ? 'cliente' : `clientes${modoRca ? '_rca' : ''}`} · {ativosCount} {ativosCount === 1 ? 'ativo' : 'ativos'}
                      {semTabelaCount > 0 && <span className="text-st-aguardando font-semibold"> · {semTabelaCount} sem tabela de preço</span>}
                    </>
              }
              className={modoRca ? '!px-0 !pt-0' : ''}
              acoes={
                clientes.length === 0 ? undefined : (
                  <BotaoPrimario onClick={abrirFormularioNovo} className="w-full sm:w-auto h-10 sm:h-9">
                    <Plus className="w-4 h-4" />
                    {modoRca ? 'Adicionar cliente' : 'Novo cliente'}
                  </BotaoPrimario>
                )
              }
            />

            {clientes.length > 0 && (
              <BarraFiltros className={modoRca ? '!px-0' : ''}>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Segmentado<'TODOS' | 'PJ' | 'PF'>
                    rotuloAria="Tipo de pessoa"
                    valor={filtroTipo}
                    onChange={setFiltroTipo}
                    opcoes={[
                      { valor: 'TODOS', rotulo: 'Todos' },
                      { valor: 'PJ', rotulo: 'Empresas', contagem: clientes.filter(c => c.tipo_pessoa === 'PJ').length },
                      { valor: 'PF', rotulo: 'Pessoas físicas', contagem: clientes.filter(c => c.tipo_pessoa === 'PF').length },
                    ]}
                  />
                  <Segmentado<'TODOS' | 'ATIVOS' | 'INATIVOS'>
                    rotuloAria="Situação"
                    valor={filtroStatus}
                    onChange={setFiltroStatus}
                    opcoes={[
                      { valor: 'TODOS', rotulo: 'Todas' },
                      { valor: 'ATIVOS', rotulo: 'Ativos' },
                      { valor: 'INATIVOS', rotulo: 'Inativos', contagem: clientes.length - ativosCount },
                    ]}
                  />
                </div>
                <CampoBusca
                  valor={busca}
                  onChange={setBusca}
                  placeholder="Buscar nome, CNPJ/CPF ou cidade"
                  className="w-full md:w-80 [&_input]:h-10 sm:[&_input]:h-8"
                />
              </BarraFiltros>
            )}
          </div>

          <div className={modoRca ? '' : 'flex-1 min-h-0 overflow-y-auto'}>
            <div className={modoRca ? 'pb-4' : 'mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6'}>
              {clientesFiltrados.length === 0 ? (
                <div className="bg-papel border border-linha rounded-md">
                  {clientes.length === 0 ? (
                    <EstadoVazio
                      titulo={modoRca ? 'Sua carteira ainda está vazia' : 'Nenhum cliente cadastrado'}
                      texto={modoRca
                        ? 'Cadastre o primeiro cliente. Ele entra direto na sua carteira e a fábrica define a tabela de preço.'
                        : 'Cadastre os clientes para vender, definir tabela de preço, prazo e representante.'}
                      acao={
                        <BotaoPrimario onClick={abrirFormularioNovo} className="h-10 sm:h-9">
                          <Plus className="w-4 h-4" /> {modoRca ? 'Adicionar cliente' : 'Novo cliente'}
                        </BotaoPrimario>
                      }
                    />
                  ) : (
                    <EstadoVazio
                      titulo="Nenhum cliente com esses filtros"
                      texto="Confira a busca ou volte para Todos."
                      acao={<BotaoSecundario onClick={() => { setBusca(''); setFiltroTipo('TODOS'); setFiltroStatus('TODOS'); }}>Limpar filtros</BotaoSecundario>}
                    />
                  )}
                </div>
              ) : (
                <>
                  {/* Celular: cartões */}
                  <ul className="sm:hidden bg-papel border border-linha rounded-md">
                    {clientesFiltrados.map(cli => (
                      <li key={cli.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-tinta leading-snug line-clamp-2">{cli.razao_nome}</div>
                            <div className="text-[11.5px] text-cinza truncate tabular-nums">
                              {cli.fantasia ? `${cli.fantasia} · ` : ''}{cli.endereco.municipio}/{cli.endereco.uf}
                            </div>
                          </div>
                          <StatusChip tom={cli.ativo ? 'pago' : 'vencido'} className="shrink-0">{cli.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
                        </div>
                        <div className="mt-1.5 text-[12px] text-tinta-2 tabular-nums truncate">
                          {cli.prazo_pagamento_nome || 'Sem prazo'}{!modoRca && cli.vendedor_nome ? ` · ${cli.vendedor_nome}` : ''}
                        </div>
                        <div className={`text-[12px] truncate ${cli.tabela_preco_id ? 'text-cinza' : 'text-st-aguardando font-semibold'}`}>
                          {cli.tabela_preco_id ? cli.tabela_preco_nome : (modoRca ? 'Sem tabela (aguardando a fábrica)' : 'Sem tabela de preço')}
                        </div>
                        <div className="flex gap-2 mt-2.5">
                          <BotaoCartao onClick={() => abrirHistorico(cli)} className="flex-1">
                            <History className="w-3.5 h-3.5" /> Compras
                          </BotaoCartao>
                          <BotaoCartao onClick={() => abrirFormularioEditar(cli)} className="flex-1">
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </BotaoCartao>
                          {cli.telefone && (
                            <a
                              href={`tel:${soDigitos(cli.telefone)}`}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-linha-forte text-tinta-2 active:bg-papel-3"
                              aria-label={`Ligar para ${cli.razao_nome}`}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* A partir de sm: tabela densa */}
                  <TabelaDados className="hidden sm:block">
                    <thead className={tabela.thead}>
                      <tr>
                        <Th>Cliente</Th>
                        <Th>CNPJ / CPF</Th>
                        <Th>Contato</Th>
                        <Th>Cidade</Th>
                        {!modoRca && <Th>Representante</Th>}
                        <Th>Tabela e prazo</Th>
                        <Th className="text-center">Situação</Th>
                        <Th className="text-right">Ações</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map(cli => {
                        const acesso = acessosClientes.get(cli.id);
                        return (
                          <tr key={cli.id} className={tabela.tr}>
                            <Td>
                              <div className="font-semibold text-tinta">{cli.razao_nome}</div>
                              <div className="text-[11.5px] text-cinza">
                                {cli.tipo_pessoa === 'PJ' ? 'Empresa' : 'Pessoa física'}{cli.fantasia ? ` · ${cli.fantasia}` : ''}
                              </div>
                            </Td>
                            <Td className="tabular-nums whitespace-nowrap">
                              <div>{cli.cpf_cnpj}</div>
                              {cli.ie_rg && <div className="text-[11.5px] text-cinza">IE/RG {cli.ie_rg}</div>}
                            </Td>
                            <Td>
                              <div className="tabular-nums whitespace-nowrap">{cli.telefone || '—'}</div>
                              <div className="text-[11.5px] text-cinza truncate max-w-[200px]">{cli.email}</div>
                              {acesso && (
                                <div className={`text-[11px] font-semibold ${acesso.ativo ? 'text-st-pago' : 'text-cinza'}`} title={`Login do Portal do Cliente: ${acesso.usuario}`}>
                                  {acesso.ativo ? 'Acessa o portal' : 'Portal desativado'}
                                </div>
                              )}
                            </Td>
                            <Td>
                              <div className="whitespace-nowrap">{cli.endereco.municipio}/{cli.endereco.uf}</div>
                              <div className="text-[11.5px] text-cinza">{cli.endereco.bairro}</div>
                            </Td>
                            {!modoRca && (
                              <Td>
                                <div className="truncate max-w-[180px]">{cli.vendedor_nome || <span className="text-cinza">Sem representante</span>}</div>
                              </Td>
                            )}
                            <Td>
                              <div className={`truncate max-w-[200px] ${cli.tabela_preco_id ? 'text-tinta' : 'text-st-aguardando font-semibold'}`}>
                                {cli.tabela_preco_id ? cli.tabela_preco_nome : 'Sem tabela — definir'}
                              </div>
                              <div className="text-[11.5px] text-cinza">{cli.prazo_pagamento_nome}{cli.forma_pagamento_nome ? ` · ${cli.forma_pagamento_nome}` : ''}</div>
                            </Td>
                            <Td className="text-center">
                              <button
                                type="button"
                                onClick={() => alternarStatusCliente(cli.id)}
                                className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ouro"
                                title={cli.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                              >
                                <StatusChip tom={cli.ativo ? 'pago' : 'vencido'}>{cli.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
                              </button>
                            </Td>
                            <Td className="text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => abrirHistorico(cli)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 hover:text-eno-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              >
                                <History className="w-3.5 h-3.5" /> Compras
                              </button>
                              <BotaoLinha rotulo="Editar cliente" onClick={() => abrirFormularioEditar(cli)}>
                                <Edit2 className="w-4 h-4" />
                              </BotaoLinha>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TabelaDados>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: FORMULÁRIO EM TELA CHEIA (SEM LIMITE DE CRÉDITO)                  */}
      {/* ========================================================================= */}
      {modo === 'formulario' && (
        <FormularioCadastro
          onSubmit={salvarCliente}
          onCancelar={() => setModo('lista')}
          onLimpar={clienteSelecionado ? undefined : () => { apagarRascunho(`clientes${modoRca ? '_rca' : ''}`); abrirFormularioNovo(); }}
          titulo={clienteSelecionado ? clienteSelecionado.razao_nome : (modoRca ? 'Adicionar cliente' : 'Novo cliente')}
          subtitulo={clienteSelecionado ? 'Editar cadastro do cliente' : 'Dados fiscais, endereço de entrega e condição comercial'}
          extra={<ChaveAtivo ativo={formData.ativo} onChange={v => setFormData({ ...formData, ativo: v })} rotulo="Cliente ativo" />}
          rotuloSalvar={clienteSelecionado ? 'Salvar alterações' : 'Cadastrar cliente'}
          salvando={salvandoCliente}
        >

{/* CORPO DO FORMULÁRIO */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6 space-y-6 bg-papel-2/40">
            
            {/* SEÇÃO 1: CLASSIFICAÇÃO & DOCUMENTOS */}
            <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha/90  space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-linha">
                <div className="flex items-center gap-2 text-eno-950 font-extrabold text-sm uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-eno-700" />
                  <span>1. Classificação e Documentos Oficiais</span>
                </div>

                {/* Alternador PF / PJ */}
                <div className="flex items-center gap-2 bg-papel-2 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PJ' })}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.tipo_pessoa === 'PJ' ? 'bg-eno-800 text-white ' : 'text-tinta-2 hover:text-tinta'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Pessoa Jurídica (PJ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PF' })}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.tipo_pessoa === 'PF' ? 'bg-eno-800 text-white ' : 'text-tinta-2 hover:text-tinta'
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
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.razao_nome}
                    onChange={(e) => setFormData({ ...formData, razao_nome: e.target.value })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Supermercados Alvorada Ltda' : 'Ex: Carlos Eduardo Nogueira'}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Nome Fantasia */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.fantasia}
                    onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                    placeholder="Ex: Alvorada Supermercados"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* CPF / CNPJ */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: mascaraCpfCnpj(e.target.value) })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Inscrição Estadual / RG */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Inscrição Estadual (IE)' : 'RG'}
                  </label>
                  <input
                    type="text"
                    value={formData.ie_rg}
                    onChange={(e) => setFormData({ ...formData, ie_rg: formData.tipo_pessoa === 'PJ' ? mascaraInscricaoEstadual(e.target.value) : e.target.value })}
                    placeholder="Ex: 254.991.002-1"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Telefone */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Telefone / WhatsApp <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* E-mail */}
                <div className="sm:col-span-2 lg:col-span-6">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    E-mail Oficial (Contato, Pedidos e Envio de NF-e) <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="compras@empresa.com.br ou financeiro@empresa.com.br"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

              </div>
            </div>

            {/* SEÇÃO 2: ENDEREÇO DE ENTREGA E COBRANÇA */}
            <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha/90  space-y-5">
              <div className="pb-3 border-b border-linha flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-eno-950 font-extrabold text-sm uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-eno-700" />
                  <span>2. Endereço de Entrega & Faturamento</span>
                </div>
              </div>

              {/* Grid de Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
                
                {/* CEP */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    CEP <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Logradouro */}
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-4">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Logradouro (Rua, Avenida, Rodovia) <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    placeholder="Ex: Av. Brasil ou Rodovia SP-340"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Número */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Número <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="1540 ou S/N"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Bairro */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Bairro <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Ex: Centro ou Distrito Industrial"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* UF */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Estado (UF) <span className="text-st-vencido">*</span>
                  </label>
                  <select
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-bold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel"
                  >
                    {ESTADOS_UF.map(({ uf }) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>

                {/* Município */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Município <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="Ex: Mogi Guaçu"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Complemento */}
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-8">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Complemento / Ponto de Referência / Instruções de Entrega
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Galpão 02, Docas 4 a 6, Entrada pela portaria lateral"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

              </div>
            </div>

            {/* SEÇÃO 3: POLÍTICAS COMERCIAIS & CARTEIRA */}
            <div className="p-4 sm:p-6 rounded-md bg-eno-50/60 border border-linha-forte/80  space-y-5">
              <div className="pb-3 border-b border-linha-forte/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-eno-950 font-extrabold text-sm uppercase tracking-wide">
                  <CreditCard className="w-4 h-4 text-eno-800" />
                  <span>3. Condições Comerciais, Carteira & Tabela de Preço</span>
                </div>
                <span className="text-xs text-eno-900/70 font-medium">
                  Define o representante, tabela de preço e condições de faturamento padrão
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vendedor / Representante */}
                <div className="bg-papel p-4 rounded-md border border-linha  flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-tinta mb-1.5">
                      Representante Responsável (RCA)
                    </label>
                    {modoRca ? (
                      (() => {
                        const eu = rcasCadastrados.find(r => r.id === rcaFixoId);
                        return (
                          <div className="w-full px-3 py-2.5 rounded-md border border-linha-forte bg-eno-50 text-xs sm:text-sm font-bold text-eno-900 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-eno-700 shrink-0" />
                            <span className="truncate">{eu ? `${eu.codigo_rca} · ${eu.nome_fantasia || eu.nome_completo}` : 'Você'}</span>
                          </div>
                        );
                      })()
                    ) : (
                    <select
                      value={formData.vendedor_id}
                      onChange={(e) => setFormData({ ...formData, vendedor_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel"
                    >
                      <option value="">Sem representante (venda direta)</option>
                      {rcasCadastrados.map(rca => (
                        <option key={rca.id} value={rca.id}>
                          {rca.codigo_rca} · {rca.nome_fantasia || rca.nome_completo}{rca.status !== 'Ativo' ? ` (${rca.status})` : ''}
                        </option>
                      ))}
                    </select>
                    )}
                  </div>
                  <p className="text-[11px] text-cinza mt-2">
                    {modoRca ? 'Clientes cadastrados por você entram automaticamente na sua carteira' : 'Usuário com acesso comercial vinculado a este cliente'}
                  </p>
                </div>

                {/* Tabela de Preço */}
                <div className="bg-papel p-4 rounded-md border border-linha  flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-tinta mb-1.5">
                      Tabela de Preço Vinculada {!modoRca && <span className="text-st-vencido">*</span>}
                    </label>
                    {modoRca ? (
                      // RCA não define tabela: a fábrica libera depois
                      (() => {
                        const nome = opcoesTabelasPreco().find(t => t.id === formData.tabela_preco_id)?.nome;
                        return nome ? (
                          <div className="w-full px-3 py-2.5 rounded-md border border-linha-forte bg-eno-50 text-xs sm:text-sm font-bold text-eno-900">{nome}</div>
                        ) : (
                          <div className="w-full px-3 py-2.5 rounded-md border border-st-aguardando/30 bg-st-aguardando-bg text-xs sm:text-sm font-bold text-st-aguardando">
                            Aguardando a fábrica definir a tabela
                          </div>
                        );
                      })()
                    ) : (
                      <select
                        value={formData.tabela_preco_id}
                        onChange={(e) => setFormData({ ...formData, tabela_preco_id: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel"
                      >
                        <option value="">-- Sem tabela definida --</option>
                        {opcoesTabelasPreco().map(tab => (
                          <option key={tab.id} value={tab.id}>
                            {tab.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="text-[11px] text-cinza mt-2">
                    {modoRca
                      ? 'A tabela de preço é definida pela fábrica. Até lá, não é possível fazer pedido para este cliente.'
                      : 'Define os produtos e preços que o RCA e o cliente podem usar nos pedidos'}
                  </p>
                </div>

                {/* Forma de Pagamento */}
                <div className="bg-papel p-4 rounded-md border border-linha  flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-tinta mb-1.5">
                      Forma de Pagamento Padrão <span className="text-st-vencido">*</span>
                    </label>
                    <select
                      value={formData.forma_pagamento_id}
                      onChange={(e) => setFormData({ ...formData, forma_pagamento_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel"
                    >
                      {FORMAS_PAGAMENTO_OPTIONS.map(fp => (
                        <option key={fp.id} value={fp.id}>{fp.nome}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-cinza mt-2">
                    Meio oficial de pagamento acordado comercialmente
                  </p>
                </div>

                {/* Prazo de Pagamento */}
                <div className="bg-papel p-4 rounded-md border border-linha  flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-tinta mb-1.5">
                      Prazo de Pagamento (dias)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.prazo_dias}
                        onChange={(e) => setFormData({ ...formData, prazo_dias: e.target.value.replace(/[^\d/ ,]/g, '') })}
                        onBlur={(e) => setFormData({ ...formData, prazo_dias: normalizarDias(e.target.value) })}
                        placeholder="Ex.: 28  ou  28/35/42"
                        className="w-full pl-3 pr-12 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-bold tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-cinza">dias</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-cinza mt-2">
                    {(() => {
                      const fp = FORMAS_PAGAMENTO_OPTIONS.find(f => f.id === formData.forma_pagamento_id);
                      return <>Fica: <b className="text-tinta-2">{textoCondicao(fp?.nome || 'Boleto Bancário', formData.prazo_dias)}</b>. Vazio = à vista; use "/" para parcelas.</>;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: ACESSO AO PORTAL DO CLIENTE (opcional, só administrador) */}
            {podeGerirAcesso ? (
              <AcessoPortalSecao
                titulo="4. Acesso ao portal do cliente (opcional)"
                descricao={acessoExistente
                  ? 'Este cliente já entra no Portal do Cliente para fazer pedidos e ver o histórico.'
                  : 'Com login e senha o cliente faz pedidos direto pelo portal (entram para sua aprovação) e acompanha o histórico.'}
                existente={acessoExistente}
                estado={acessoEstado}
                onChange={setAcessoEstado}
                emailSugerido={formData.email}
                permitirRemover
              />
            ) : modoRca ? (
              <div className="flex items-start gap-2.5 p-3.5 rounded-md border border-linha bg-papel text-xs text-tinta-2">
                <KeyRound className="w-4 h-4 text-eno-700 shrink-0 mt-0.5" />
                <span>O acesso do cliente ao Portal do Cliente (pedidos pela internet) é liberado pela fábrica. Peça ao administrador se o cliente quiser comprar direto.</span>
              </div>
            ) : null}

          </div>

          </FormularioCadastro>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: HISTÓRICO DE COMPRAS DO CLIENTE (SEM CNPJ NO TOPO, COM GRÁFICO   */}
      {/* DE FATURAMENTO MENSAL E TABELA EM LINHAS EXPANSÍVEL AO CLIQUE)            */}
      {/* ========================================================================= */}
      {modo === 'historico' && clienteSelecionado && (
        <div className={`flex-1 w-full min-h-0 flex flex-col ${modoRca ? '' : 'overflow-y-auto'}`}>
          <div className={modoRca ? 'pb-4' : 'mx-auto w-full max-w-[1700px] pb-6'}>
            <div className={`pt-3 ${modoRca ? '' : 'px-4 sm:px-6'}`}>
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="inline-flex items-center gap-1.5 h-10 sm:h-8 -ml-1 px-1 text-[13px] font-semibold text-eno-700 hover:text-eno-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro rounded"
              >
                <ArrowLeft className="w-4 h-4" />
                {modoRca ? 'Meus clientes' : 'Clientes'}
              </button>
            </div>
            <CabecalhoPagina
              titulo={clienteSelecionado.fantasia || clienteSelecionado.razao_nome}
              resumo={`Histórico de compras${clienteSelecionado.fantasia ? ` · ${clienteSelecionado.razao_nome}` : ''}`}
              className={`!pt-1 ${modoRca ? '!px-0' : ''}`}
              acoes={
                <BotaoSecundario onClick={() => abrirFormularioEditar(clienteSelecionado)} className="h-10 sm:h-9">
                  <Edit2 className="w-4 h-4" /> Editar cadastro
                </BotaoSecundario>
              }
            />

            <div className={`space-y-4 ${modoRca ? '' : 'px-4 sm:px-6'}`}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-stretch">
                <section className="bg-papel border border-linha rounded-md overflow-hidden">
                  <div className="h-[3px] filete-ouro" aria-hidden />
                  <div className="grid grid-cols-2 gap-px bg-linha">
                    <div className="col-span-2 bg-eno-50 px-4 py-4">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Total comprado</div>
                      <div className="mt-2 flex items-baseline gap-1 text-[30px] font-extrabold tracking-[-0.02em] leading-none tabular-nums text-tinta">
                        <span className="text-[14px] font-semibold text-cinza">R$</span>
                        {totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-papel px-4 py-3.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Pedidos</div>
                      <div className="mt-1.5 text-[21px] font-extrabold tabular-nums text-tinta">{comprasDoCliente.length}</div>
                    </div>
                    <div className="bg-papel px-4 py-3.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Ticket médio</div>
                      <div className="mt-1.5 text-[17px] font-extrabold tabular-nums text-tinta">
                        {comprasDoCliente.length > 0 ? `R$ ${(totalComprado / comprasDoCliente.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </div>
                    </div>
                    <div className="col-span-2 bg-papel px-4 py-3">
                      <span className="text-[12px] text-cinza">Última compra </span>
                      <span className="text-[13px] font-semibold text-tinta tabular-nums">{comprasDoCliente.length > 0 ? comprasDoCliente[0].emitido_em : 'nenhuma ainda'}</span>
                    </div>
                  </div>
                </section>

                <Painel titulo="Faturamento mensal" contexto="últimos 6 meses">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosGraficoMensal} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CORES.linha} vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CORES.cinza }} axisLine={{ stroke: CORES.linha }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: CORES.cinza }} axisLine={false} tickLine={false} width={48} tickFormatter={(val) => `${(val / 1000).toFixed(0)} mil`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="faturamento" stroke={CORES.eno700} strokeWidth={2.5} dot={{ r: 3, fill: CORES.eno700, strokeWidth: 2, stroke: CORES.papel }} activeDot={{ r: 5, fill: CORES.ouroEscuro }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Painel>
              </div>

              {/* Pedidos: toque abre os produtos */}
              <section className="bg-papel border border-linha rounded-md overflow-hidden">
                <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-linha">
                  <h2 className="text-[15px] font-bold tracking-[-0.01em] text-tinta">Pedidos de venda</h2>
                  <span className="text-[12px] text-cinza tabular-nums">{comprasDoCliente.length} · toque para ver os produtos</span>
                </div>

                {comprasDoCliente.length === 0 ? (
                  <EstadoVazio titulo="Nenhum pedido de venda ainda" texto="Os pedidos aprovados deste cliente aparecem aqui, com nota fiscal e produtos." />
                ) : (
                  <>
                    <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 bg-papel-2 border-b border-linha-forte text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">
                      <div className="col-span-3">Pedido</div>
                      <div className="col-span-2">Emissão</div>
                      <div className="col-span-2">Entrega</div>
                      <div className="col-span-3">Nota fiscal</div>
                      <div className="col-span-2 text-right">Valor</div>
                    </div>
                    {comprasDoCliente.map((compra) => {
                      const expandido = pedidoExpandidoId === compra.id;
                      return (
                        <div key={compra.id} className="border-b border-linha last:border-b-0">
                          <button
                            type="button"
                            onClick={() => toggleExpandirPedido(compra.id)}
                            aria-expanded={expandido}
                            className={`w-full text-left px-4 py-3 min-h-[52px] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ouro ${expandido ? 'bg-papel-3/60' : 'hover:bg-papel-3/40'}`}
                          >
                            {/* Celular */}
                            <span className="sm:hidden flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-[13px] font-bold text-tinta tabular-nums">
                                  {expandido ? <ChevronUp className="w-4 h-4 text-eno-700" /> : <ChevronDown className="w-4 h-4 text-cinza" />}
                                  {compra.numero_pedido}
                                </span>
                                <span className="block text-[11.5px] text-cinza tabular-nums">
                                  {compra.emitido_em}{compra.nota_fiscal ? ` · NF-e ${compra.nota_fiscal.numero}` : ' · NF pendente'}
                                </span>
                              </span>
                              <span className="text-[16px] font-extrabold tabular-nums text-tinta shrink-0">
                                R$ {compra.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </span>
                            {/* A partir de sm */}
                            <span className="hidden sm:grid grid-cols-12 gap-3 items-center text-[13px]">
                              <span className="col-span-3 flex items-center gap-2 font-semibold text-tinta tabular-nums">
                                {expandido ? <ChevronUp className="w-4 h-4 text-eno-700" /> : <ChevronDown className="w-4 h-4 text-cinza" />}
                                {compra.numero_pedido}
                              </span>
                              <span className="col-span-2 tabular-nums text-tinta-2">{compra.emitido_em}</span>
                              <span className="col-span-2 tabular-nums text-tinta-2">{compra.data_entrega || <span className="text-cinza">—</span>}</span>
                              <span className="col-span-3 tabular-nums text-tinta-2">{compra.nota_fiscal ? `NF-e nº ${compra.nota_fiscal.numero}` : <span className="text-cinza">Pendente</span>}</span>
                              <span className="col-span-2 text-right font-extrabold tabular-nums text-tinta">R$ {compra.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </span>
                          </button>

                          {expandido && (
                            <div className="px-3 sm:px-6 py-4 bg-papel-2 border-t border-linha space-y-3">
                              {compra.nota_fiscal?.chave_acesso && (
                                <div className="text-[12px] text-tinta-2 tabular-nums break-all">
                                  <span className="text-cinza">Chave NF-e </span>{compra.nota_fiscal.chave_acesso}
                                  <span className="text-cinza"> · série {compra.nota_fiscal.serie}</span>
                                </div>
                              )}
                              {/* Celular: itens em lista */}
                              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                                {compra.itens.map((item, idx) => (
                                  <li key={idx} className="px-3 py-2.5 border-b border-linha last:border-b-0 flex items-start justify-between gap-3">
                                    <span className="min-w-0">
                                      <span className="block text-[13px] font-semibold text-tinta">{item.produto_nome}</span>
                                      <span className="block text-[11.5px] text-cinza tabular-nums">{item.quantidade} × {item.tipo_embalagem} · R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </span>
                                    <span className="text-[13px] font-bold tabular-nums text-tinta shrink-0">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </li>
                                ))}
                              </ul>
                              <TabelaDados className="hidden sm:block">
                                <thead className={tabela.thead}>
                                  <tr>
                                    <Th>Produto</Th>
                                    <Th>Embalagem</Th>
                                    <Th numero>Quantidade</Th>
                                    <Th numero>Unitário</Th>
                                    <Th numero>Total</Th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {compra.itens.map((item, idx) => (
                                    <tr key={idx} className={tabela.tr}>
                                      <Td className="font-semibold text-tinta">{item.produto_nome}</Td>
                                      <Td>{item.tipo_embalagem}</Td>
                                      <Td numero>{item.quantidade}</Td>
                                      <Td numero>R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                                      <Td numero className="font-bold text-tinta">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                                    </tr>
                                  ))}
                                </tbody>
                              </TabelaDados>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
