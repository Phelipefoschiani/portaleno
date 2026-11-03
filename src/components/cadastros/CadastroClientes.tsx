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
      prazo_pagamento_id: 'livre',
      prazo_dias: '',
      vendedor_id: rcaFixoId || '',
      tabela_preco_id: modoRca ? (rcasCadastrados.find(r => r.id === rcaFixoId)?.tabela_preco_padrao_id || '') : '',
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
      sincronizarEspelhoClienteRca(novo.id, rcaSel?.id);
      setSalvandoCliente(true);
      try {
        await gravarAcessoCliente(planoAcesso, novo.id, nomeAcesso);
      } finally {
        setSalvandoCliente(false);
      }
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
                    {modoRca ? 'Meus Clientes' : 'Clientes'}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {clientes.length} {modoRca ? 'na carteira' : 'Cadastrados'}
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
              <span>{modoRca ? 'Adicionar Cliente' : 'Novo Cadastro de Cliente'}</span>
            </button>
          </div>

          {/* BARRA DE BUSCA E FILTROS */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-white">
            <div className={`relative flex-1 max-w-md ${modoRca ? 'min-w-[220px]' : 'min-w-[280px]'}`}>
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
            <div className="flex flex-wrap items-center gap-2">
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

          {/* PORTAL DO RCA NO CELULAR: lista em cartões (sem rolagem lateral) */}
          {modoRca && (
            <div className="sm:hidden flex-1 overflow-y-auto divide-y divide-slate-100">
              {clientesFiltrados.length === 0 ? (
                <div className="py-12 px-6 text-center text-sm text-slate-500">
                  {clientes.length === 0 ? 'Sua carteira ainda está vazia. Toque em "Adicionar Cliente" para cadastrar o primeiro.' : 'Nenhum cliente com esses filtros.'}
                </div>
              ) : clientesFiltrados.map(cli => (
                <div key={cli.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm truncate">{cli.razao_nome}</span>
                      {!cli.ativo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">Inativo</span>}
                    </div>
                    {cli.fantasia && <div className="text-[11px] text-slate-500 truncate">{cli.fantasia}</div>}
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">{cli.endereco.municipio}/{cli.endereco.uf} · {cli.telefone || 'sem telefone'}</div>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-0.5 truncate">{cli.tabela_preco_nome || 'Tabela padrão'} · {cli.prazo_pagamento_nome}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => abrirFormularioEditar(cli)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 active:bg-slate-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => abrirHistorico(cli)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1 active:bg-emerald-100"
                    >
                      <History className="w-3.5 h-3.5" /> Compras
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABELA DE CLIENTES */}
          <div className={`flex-1 overflow-auto ${modoRca ? 'hidden sm:block' : ''}`}>
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
                        {acessosClientes.has(cli.id) && (
                          <div
                            className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black border ${
                              acessosClientes.get(cli.id)?.ativo ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title={`Login do Portal do Cliente: ${acessosClientes.get(cli.id)?.usuario}`}
                          >
                            <KeyRound className="w-3 h-3" />
                            {acessosClientes.get(cli.id)?.ativo ? 'Acessa o portal' : 'Portal desativado'}
                          </div>
                        )}
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
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-3.5 border-b border-slate-200 bg-slate-50/90">
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
          <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6 space-y-6 bg-slate-50/40">
            
            {/* SEÇÃO 1: CLASSIFICAÇÃO & DOCUMENTOS */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
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
            <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
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
            <div className="p-4 sm:p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-sm space-y-5">
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
                      Representante Responsável (RCA)
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">(vendedor_id)</span>
                    </label>
                    {modoRca ? (
                      (() => {
                        const eu = rcasCadastrados.find(r => r.id === rcaFixoId);
                        return (
                          <div className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="truncate">{eu ? `${eu.codigo_rca} · ${eu.nome_fantasia || eu.nome_completo}` : 'Você'}</span>
                          </div>
                        );
                      })()
                    ) : (
                    <select
                      value={formData.vendedor_id}
                      onChange={(e) => setFormData({ ...formData, vendedor_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                  <p className="text-[11px] text-slate-500 mt-2">
                    {modoRca ? 'Clientes cadastrados por você entram automaticamente na sua carteira' : 'Usuário com acesso comercial vinculado a este cliente'}
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
                      <option value="">-- Sem tabela definida --</option>
                      {opcoesTabelasPreco().map(tab => (
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
                        className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">dias</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    {(() => {
                      const fp = FORMAS_PAGAMENTO_OPTIONS.find(f => f.id === formData.forma_pagamento_id);
                      return <>Fica: <b className="text-slate-700">{textoCondicao(fp?.nome || 'Boleto Bancário', formData.prazo_dias)}</b>. Vazio = à vista; use "/" para parcelas.</>;
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
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-600">
                <KeyRound className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>O acesso do cliente ao Portal do Cliente (pedidos pela internet) é liberado pela fábrica. Peça ao administrador se o cliente quiser comprar direto.</span>
              </div>
            ) : null}

          </div>

          {/* RODAPÉ DO FORMULÁRIO */}
          <div className="flex items-center justify-between gap-2 px-4 sm:px-8 py-3.5 border-t border-slate-200 bg-white">
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
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-slate-200 bg-white">
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
          <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
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
