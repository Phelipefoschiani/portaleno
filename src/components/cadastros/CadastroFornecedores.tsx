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
  History,
  Package,
  FileCheck2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  X,
  Eye,
  Download,
  AlertCircle,
  ExternalLink,
  Layers,
  Database,
  Boxes,
  Check,
  Truck
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
import {
  carregarFornecedores,
  salvarFornecedores,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { carregarPedidosCompra } from '../../data/mockStore';
import { carregarMateriaPrima, salvarMateriaPrima, MateriaPrimaEstoque } from '../../data/produtosData';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { formatarDataBR } from '../../lib/datas';
import { mesReferenciaDe, ultimosMesesReferencia } from '../../lib/mesesReferencia';

export interface ProdutoFornecidoItem {
  id: string;
  produto_id?: number | string;
  materia_prima_id?: number | string;
  codigo_referencia?: string;
  codigo_materia_prima?: string;
  nome: string;
  unidade: string;
  categoria: 'Matéria-Prima' | 'Embalagens' | 'Insumos Agrícolas' | 'Químicos' | 'Outros';
  codigo_fornecedor?: string;
  integrado_materia_prima: boolean;
}

export interface Fornecedor {
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
  produtos_fornecidos: ProdutoFornecidoItem[];
  forma_pagamento_id: string;
  forma_pagamento_nome?: string;
  prazo_pagamento_id: string;
  prazo_pagamento_nome?: string;
  chave_pix?: string;
  ativo: boolean;
  criado_em: string;
}

export interface ItemCompraFornecedor {
  id: string;
  nome_produto: string;
  codigo: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
}

export interface CompraFornecedor {
  id: string;
  fornecedor_id: string;
  numero_compra: string;
  data_emissao: string;
  data_entrega?: string;
  numero_nota_fiscal: string;
  serie_nf?: string;
  chave_acesso_nfe?: string;
  valor_total: number;
  mes_referencia: string;
  status: 'ENTREGUE' | 'A_CAMINHO' | 'EM_PROCESSAMENTO';
  itens: ItemCompraFornecedor[];
  tem_danfe: boolean;
}

// Catálogo Global de Matérias-Primas do Grupo ENO (public.materias_primas)
type CategoriaProdutoFornecido = ProdutoFornecidoItem['categoria'];
export interface ItemCatalogoMateriaPrima {
  id: number | string;
  codigo: string;
  nome: string;
  unidade: string;
  categoria: CategoriaProdutoFornecido;
  estoque: number;
  custo_medio: number;
}

// Catálogo de matérias-primas lido do cadastro real (Produtos > Matéria Prima)
function carregarCatalogoMateriasPrimas(): ItemCatalogoMateriaPrima[] {
  return carregarMateriaPrima().map((mp: MateriaPrimaEstoque) => ({
    id: mp.id,
    codigo: mp.codigo,
    nome: mp.nome,
    unidade: mp.unidade_medida,
    categoria: (mp.categoria === 'Embalagens' ? 'Embalagens' : mp.categoria === 'Insumos Industriais' ? 'Químicos' : 'Matéria-Prima') as CategoriaProdutoFornecido,
    estoque: Number(mp.estoque_atual) || 0,
    custo_medio: Number(mp.custo_medio_unitario) || 0,
  }));
}

/** @deprecated catálogo fixo removido; use o cadastro de Matéria Prima */
export const CATALOGO_MATERIAS_PRIMAS_BASE: ItemCatalogoMateriaPrima[] = [];

// Formas e Prazos de Pagamento
const FORMAS_PAGAMENTO_OPTIONS = [
  { id: 'fp_1', nome: 'Boleto Bancário' },
  { id: 'fp_2', nome: 'Pix' },
  { id: 'fp_3', nome: 'Transferência Bancária (TED)' },
  { id: 'fp_4', nome: 'Cartão de Crédito Corporativo' },
  { id: 'fp_5', nome: 'Dinheiro' },
];

const PRAZOS_PAGAMENTO_OPTIONS = [
  { id: 'pp_1', nome: 'À Vista (0 dias)' },
  { id: 'pp_2', nome: '7 Dias' },
  { id: 'pp_3', nome: '14 Dias' },
  { id: 'pp_4', nome: '21 Dias' },
  { id: 'pp_5', nome: '28 Dias' },
  { id: 'pp_6', nome: '30 / 60 Dias (2x)' },
  { id: 'pp_7', nome: '30 / 60 / 90 Dias (3x)' },
];

// Converte os pedidos de compra reais (Pedidos > Pedido de Compra) deste fornecedor para o histórico
function montarComprasFornecedor(fornecedorId: string): CompraFornecedor[] {
  return carregarPedidosCompra()
    .filter(pc => pc.tipo_parceiro === 'FORNECEDOR' && pc.fornecedor_id === fornecedorId)
    .map(pc => ({
      id: pc.id,
      fornecedor_id: fornecedorId,
      numero_compra: pc.id,
      data_emissao: formatarDataBR(pc.data),
      numero_nota_fiscal: '',
      valor_total: Number(pc.valor_total) || 0,
      mes_referencia: mesReferenciaDe(pc.data),
      status: (pc.status_pedido === 'Entregue (A Pagar)' || pc.status_pedido === 'Pago')
        ? 'ENTREGUE'
        : (pc.status_pedido === 'Programado' || pc.status_pedido === 'Confirmado') ? 'A_CAMINHO' : 'EM_PROCESSAMENTO',
      itens: [{
        id: `${pc.id}_item`,
        nome_produto: pc.item_descricao,
        codigo: '',
        quantidade: Number(pc.quantidade) || 0,
        unidade: pc.unidade_medida,
        valor_unitario: Number(pc.valor_unitario) || 0,
        valor_total: Number(pc.valor_total) || 0,
      }],
      tem_danfe: false,
    }));
}

// Normaliza registros lidos (podem ter sido gravados por outros módulos com o tipo base de mockStore)
function carregarFornecedoresCompletos(): Fornecedor[] {
  return carregarFornecedores().map(f => ({
    forma_pagamento_id: '',
    prazo_pagamento_id: '',
    ...f,
    produtos_fornecidos: Array.isArray((f as Partial<Fornecedor>).produtos_fornecidos) ? (f as Fornecedor).produtos_fornecidos : [],
  } as Fornecedor));
}

const CustomTooltipCompras = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
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

export function CadastroFornecedores() {
  // Persistidos no armazenamento local (cadastrosData) e sincronizados entre telas
  const [fornecedores, setFornecedores] = useListaPersistida<Fornecedor>(carregarFornecedoresCompletos, salvarFornecedores, EVENTO_CADASTROS_ATUALIZADOS);
  const [catalogoMateriasPrimas, setCatalogoMateriasPrimas] = useState<ItemCatalogoMateriaPrima[]>(() => carregarCatalogoMateriasPrimas());
  const [versaoCompras, setVersaoCompras] = useState(0);
  React.useEffect(() => {
    const recarregarCatalogo = () => setCatalogoMateriasPrimas(carregarCatalogoMateriasPrimas());
    const recarregarCompras = () => setVersaoCompras(v => v + 1);
    window.addEventListener('produtos_updated', recarregarCatalogo);
    window.addEventListener('pedidos_compra_updated', recarregarCompras);
    return () => {
      window.removeEventListener('produtos_updated', recarregarCatalogo);
      window.removeEventListener('pedidos_compra_updated', recarregarCompras);
    };
  }, []);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PJ' | 'PF'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Navegação: 'lista', 'formulario' ou 'historico'
  const [modo, setModo] = useState<'lista' | 'formulario' | 'historico'>('lista');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);

  // Controle de accordion no histórico: apenas 1 pedido expandido por vez
  const [compraExpandidaId, setCompraExpandidaId] = useState<string | null>(null);

  // Modal de DANFE / Nota Fiscal Anexa
  const [compraModalDanfe, setCompraModalDanfe] = useState<CompraFornecedor | null>(null);

  // Estado do Formulário Principal
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
    produtos_fornecidos: ProdutoFornecidoItem[];
    forma_pagamento_id: string;
    prazo_pagamento_id: string;
    chave_pix: string;
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
    produtos_fornecidos: [],
    forma_pagamento_id: 'fp_1',
    prazo_pagamento_id: 'pp_1',
    chave_pix: '',
    ativo: true,
  });

  // Estado do formulário de inclusão de produto/matéria-prima
  const [modoInclusaoProduto, setModoInclusaoProduto] = useState<'catalogo' | 'novo'>('catalogo');
  const [materiaPrimaSelecionadaId, setMateriaPrimaSelecionadaId] = useState<string>('');
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemUnidade, setNovoItemUnidade] = useState('UN');
  const [novoItemCategoria, setNovoItemCategoria] = useState<'Matéria-Prima' | 'Embalagens' | 'Insumos Agrícolas' | 'Químicos' | 'Outros'>('Matéria-Prima');
  const [novoItemCodigoFornecedor, setNovoItemCodigoFornecedor] = useState('');
  // Matéria-prima só é criada em Produtos → Matéria-Prima; aqui nunca cadastra no estoque
  const cadastrarNoEstoqueMateriaPrima = false;

  const toggleExpandirCompra = (compraId: string) => {
    setCompraExpandidaId(prev => (prev === compraId ? null : compraId));
  };

  // Adicionar produto existente do catálogo de matérias-primas
  const adicionarDoCatalogo = () => {
    if (!materiaPrimaSelecionadaId) return;
    const mp = catalogoMateriasPrimas.find(m => String(m.id) === String(materiaPrimaSelecionadaId));
    if (!mp) return;

    // Checar se já foi adicionado
    if (formData.produtos_fornecidos.some(p => p.materia_prima_id === mp.id || p.nome.toLowerCase() === mp.nome.toLowerCase())) {
      setMateriaPrimaSelecionadaId('');
      return;
    }

    const novoItem: ProdutoFornecidoItem = {
      id: `prod_${Date.now()}`,
      produto_id: mp.id,
      materia_prima_id: mp.id,
      codigo_referencia: novoItemCodigoFornecedor.trim() || mp.codigo,
      codigo_materia_prima: mp.codigo,
      nome: mp.nome,
      unidade: mp.unidade,
      categoria: mp.categoria,
      codigo_fornecedor: novoItemCodigoFornecedor.trim() || undefined,
      integrado_materia_prima: true,
    };

    setFormData({
      ...formData,
      produtos_fornecidos: [...formData.produtos_fornecidos, novoItem]
    });
    setMateriaPrimaSelecionadaId('');
    setNovoItemCodigoFornecedor('');
  };

  // Cadastrar nova matéria-prima e vincular ao fornecedor
  const cadastrarNovoProdutoEIntegrar = () => {
    const nomeLimpo = novoItemNome.trim();
    if (!nomeLimpo) return;

    // Se estiver marcado para cadastrar no catálogo geral de matérias-primas
    let novoMpId: string | undefined = undefined;
    let novoCodigoMp = `MP-${100 + catalogoMateriasPrimas.length + 1}`;

    if (cadastrarNoEstoqueMateriaPrima) {
      novoMpId = `mp_${Date.now()}`;
      const unidadesValidas: MateriaPrimaEstoque['unidade_medida'][] = ['KG', 'TON', 'ESTÉREO (m³)', 'UN', 'LITRO'];
      const unidade = (unidadesValidas as string[]).includes(novoItemUnidade.toUpperCase())
        ? (novoItemUnidade.toUpperCase() as MateriaPrimaEstoque['unidade_medida'])
        : 'UN';
      const novaMP: MateriaPrimaEstoque = {
        id: novoMpId,
        codigo: novoCodigoMp,
        nome: nomeLimpo,
        categoria: novoItemCategoria === 'Embalagens' ? 'Embalagens' : 'Insumos Industriais',
        unidade_medida: unidade,
        estoque_atual: 0,
        estoque_minimo: 0,
        custo_medio_unitario: 0,
        fornecedor_principal: formData.razao_nome || '',
        localizacao_patio: '',
        status: 'NORMAL',
      };
      // Grava no cadastro real de Matéria Prima (evento 'produtos_updated' recarrega o catálogo)
      salvarMateriaPrima([...carregarMateriaPrima(), novaMP]);
    }

    const novoItem: ProdutoFornecidoItem = {
      id: `prod_${Date.now()}`,
      produto_id: novoMpId,
      materia_prima_id: novoMpId,
      codigo_referencia: novoItemCodigoFornecedor.trim() || (cadastrarNoEstoqueMateriaPrima ? novoCodigoMp : undefined),
      codigo_materia_prima: cadastrarNoEstoqueMateriaPrima ? novoCodigoMp : undefined,
      nome: nomeLimpo,
      unidade: novoItemUnidade,
      categoria: novoItemCategoria,
      codigo_fornecedor: novoItemCodigoFornecedor.trim() || undefined,
      integrado_materia_prima: cadastrarNoEstoqueMateriaPrima,
    };

    setFormData({
      ...formData,
      produtos_fornecidos: [...formData.produtos_fornecidos, novoItem]
    });

    setNovoItemNome('');
    setNovoItemCodigoFornecedor('');
  };

  const removerProdutoLista = (idOuNome: string) => {
    setFormData({
      ...formData,
      produtos_fornecidos: formData.produtos_fornecidos.filter(p => p.id !== idOuNome && p.nome !== idOuNome)
    });
  };

  const abrirFormularioNovo = () => {
    setFornecedorSelecionado(null);
    setMateriaPrimaSelecionadaId('');
    setNovoItemNome('');
    setNovoItemCodigoFornecedor('');
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
      produtos_fornecidos: [],
      forma_pagamento_id: 'fp_1',
      prazo_pagamento_id: 'pp_1',
      chave_pix: '',
      ativo: true,
    });
    setModo('formulario');
  };

  const abrirFormularioEditar = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setMateriaPrimaSelecionadaId('');
    setNovoItemNome('');
    setNovoItemCodigoFornecedor('');
    setFormData({
      tipo_pessoa: fornecedor.tipo_pessoa,
      razao_nome: fornecedor.razao_nome,
      fantasia: fornecedor.fantasia || '',
      cpf_cnpj: fornecedor.cpf_cnpj,
      ie_rg: fornecedor.ie_rg || '',
      email: fornecedor.email,
      telefone: fornecedor.telefone,
      cep: fornecedor.endereco.cep,
      logradouro: fornecedor.endereco.logradouro,
      numero: fornecedor.endereco.numero,
      bairro: fornecedor.endereco.bairro,
      municipio: fornecedor.endereco.municipio,
      uf: fornecedor.endereco.uf,
      complemento: fornecedor.endereco.complemento || '',
      produtos_fornecidos: [...fornecedor.produtos_fornecidos],
      forma_pagamento_id: fornecedor.forma_pagamento_id,
      prazo_pagamento_id: fornecedor.prazo_pagamento_id,
      chave_pix: fornecedor.chave_pix || '',
      ativo: fornecedor.ativo,
    });
    setModo('formulario');
  };

  const abrirHistorico = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setCompraExpandidaId(null);
    setModo('historico');
  };

  const alternarStatusFornecedor = (id: string) => {
    setFornecedores(prev => prev.map(f => f.id === id ? { ...f, ativo: !f.ativo } : f));
  };

  const salvarFornecedor = (e: React.FormEvent) => {
    e.preventDefault();

    const fp = FORMAS_PAGAMENTO_OPTIONS.find(f => f.id === formData.forma_pagamento_id);
    const pp = PRAZOS_PAGAMENTO_OPTIONS.find(p => p.id === formData.prazo_pagamento_id);

    if (fornecedorSelecionado) {
      // UPDATE
      setFornecedores(prev => prev.map(f => f.id === fornecedorSelecionado.id ? {
        ...f,
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
        produtos_fornecidos: formData.produtos_fornecidos,
        forma_pagamento_id: formData.forma_pagamento_id,
        forma_pagamento_nome: fp?.nome,
        prazo_pagamento_id: formData.prazo_pagamento_id,
        prazo_pagamento_nome: pp?.nome,
        chave_pix: formData.chave_pix,
        ativo: formData.ativo,
      } : f));
    } else {
      // INSERT
      const novo: Fornecedor = {
        id: `forn_${Date.now()}`,
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
        produtos_fornecidos: formData.produtos_fornecidos,
        forma_pagamento_id: formData.forma_pagamento_id,
        forma_pagamento_nome: fp?.nome,
        prazo_pagamento_id: formData.prazo_pagamento_id,
        prazo_pagamento_nome: pp?.nome,
        chave_pix: formData.chave_pix,
        ativo: formData.ativo,
        criado_em: new Date().toISOString(),
      };
      setFornecedores(prev => [novo, ...prev]);
    }

    setModo('lista');
  };

  // Filtragem da lista
  const fornecedoresFiltrados = fornecedores.filter(fornecedor => {
    const buscaLower = busca.toLowerCase();
    const matchBusca = 
      fornecedor.razao_nome.toLowerCase().includes(buscaLower) ||
      (fornecedor.fantasia && fornecedor.fantasia.toLowerCase().includes(buscaLower)) ||
      fornecedor.cpf_cnpj.includes(busca) ||
      fornecedor.email.toLowerCase().includes(buscaLower) ||
      fornecedor.endereco.municipio.toLowerCase().includes(buscaLower) ||
      fornecedor.produtos_fornecidos.some(p => 
        p.nome.toLowerCase().includes(buscaLower) || 
        (p.codigo_materia_prima && p.codigo_materia_prima.toLowerCase().includes(buscaLower)) ||
        p.categoria.toLowerCase().includes(buscaLower)
      );

    const matchTipo = filtroTipo === 'TODOS' || fornecedor.tipo_pessoa === filtroTipo;
    const matchStatus = 
      filtroStatus === 'TODOS' || 
      (filtroStatus === 'ATIVOS' && fornecedor.ativo) || 
      (filtroStatus === 'INATIVOS' && !fornecedor.ativo);

    return matchBusca && matchTipo && matchStatus;
  });

  // Compras do fornecedor selecionado no histórico
  const comprasDoFornecedor = useMemo(() => {
    if (!fornecedorSelecionado) return [];
    return montarComprasFornecedor(fornecedorSelecionado.id);
  }, [fornecedorSelecionado, versaoCompras]);

  const totalCompradoFornecedor = useMemo(() => {
    return comprasDoFornecedor.reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [comprasDoFornecedor]);

  // Gráfico mensal de compras feitas no fornecedor
  const dadosGraficoMensal = useMemo(() => {
    const ordemMeses = ultimosMesesReferencia(6);
    const mapaMeses: Record<string, number> = Object.fromEntries(ordemMeses.map(m => [m, 0]));

    comprasDoFornecedor.forEach(c => {
      if (c.mes_referencia in mapaMeses) {
        mapaMeses[c.mes_referencia] += c.valor_total;
      }
    });

    return ordemMeses.map(mes => ({
      mes,
      totalCompras: mapaMeses[mes]
    }));
  }, [comprasDoFornecedor]);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white rounded-2xl border border-emerald-950/15 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. MODO: LISTAGEM DE FORNECEDORES                         */}
      {/* ========================================================= */}
      {modo === 'lista' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* CABEÇALHO DA LISTA (PADRÃO CLIENTES) */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-sm">
                <Truck className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Fornecedores
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {fornecedores.length} Cadastrados
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Novo Fornecedor */}
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
              <span>Novo Cadastro de Fornecedor</span>
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

          {/* TABELA DE FORNECEDORES */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-10 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-6">Tipo</th>
                  <th className="py-3 px-6">Fornecedor (Razão / Fantasia)</th>
                  <th className="py-3 px-6">CNPJ / CPF</th>
                  <th className="py-3 px-6">Contato</th>
                  <th className="py-3 px-6">Cidade / UF</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center">Histórico</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {fornecedoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum fornecedor encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  fornecedoresFiltrados.map((forn) => (
                    <tr 
                      key={forn.id}
                      className="hover:bg-emerald-50/40 transition-colors group"
                    >
                      {/* Tipo Pessoa */}
                      <td className="py-3.5 px-6">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide
                          ${forn.tipo_pessoa === 'PJ' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}
                        `}>
                          {forn.tipo_pessoa === 'PJ' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {forn.tipo_pessoa}
                        </span>
                      </td>

                      {/* Nome e Fantasia */}
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {forn.razao_nome}
                        </div>
                        {forn.fantasia && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            {forn.fantasia}
                          </div>
                        )}
                      </td>

                      {/* CNPJ / CPF */}
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">{forn.cpf_cnpj}</div>
                        {forn.ie_rg && <div className="text-slate-400">IE/RG: {forn.ie_rg}</div>}
                      </td>

                      {/* Contato */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span>{forn.telefone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[170px]">{forn.email}</span>
                        </div>
                      </td>

                      {/* Cidade / UF */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">
                          {forn.endereco.municipio} - {forn.endereco.uf}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {forn.endereco.bairro}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => alternarStatusFornecedor(forn.id)}
                          className="cursor-pointer"
                          title={forn.ativo ? 'Clique para Inativar' : 'Clique para Ativar'}
                        >
                          {forn.ativo ? (
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

                      {/* Histórico de Compras */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => abrirHistorico(forn)}
                          className="
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-xl
                            bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200
                            text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer
                          "
                          title="Ver histórico de compras, pedidos e notas fiscais"
                        >
                          <History className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Histórico</span>
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => abrirFormularioEditar(forn)}
                          className="
                            inline-flex items-center justify-center p-2 rounded-xl
                            text-slate-600 hover:text-emerald-800 hover:bg-slate-100
                            transition-all cursor-pointer
                          "
                          title="Editar cadastro do fornecedor"
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
      {/* 2. MODO: HISTÓRICO DE COMPRAS E NOTAS FISCAIS DO FORNECEDOR */}
      {/* ========================================================= */}
      {modo === 'historico' && fornecedorSelecionado && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
          
          {/* HEADER DO HISTÓRICO */}
          <div className="p-4 sm:p-6 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModo('lista')}
                className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                title="Voltar para a lista"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {fornecedorSelecionado.razao_nome}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    Fornecedor
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  CNPJ: <span className="font-mono font-semibold text-slate-700">{fornecedorSelecionado.cpf_cnpj}</span> • 
                  Cidade: <span className="font-semibold text-slate-700">{fornecedorSelecionado.endereco.municipio}/{fornecedorSelecionado.endereco.uf}</span>
                </p>
              </div>
            </div>

            {/* Total Histórico Comprado */}
            <div className="flex items-center gap-4 bg-emerald-50/80 px-4 py-2.5 rounded-xl border border-emerald-200">
              <div className="text-right">
                <span className="block text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                  Total em Compras Realizadas
                </span>
                <span className="text-lg font-black text-emerald-950 font-mono">
                  R$ {totalCompradoFornecedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* CONTEÚDO DO HISTÓRICO (COM SCROLL) */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
            
            {/* GRÁFICO DE COMPRAS MENSAIS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span>Evolução Mensal de Compras (Gastos com este Fornecedor)</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Últimos 6 meses</span>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGraficoMensal} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="mes" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltipCompras />} />
                    <Line 
                      type="monotone" 
                      dataKey="totalCompras" 
                      stroke="#047857" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LISTAGEM EM LINHAS DE COMPRAS E NOTAS FISCAIS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                  <ReceiptText className="w-4 h-4 text-emerald-800" />
                  <span>Pedidos de Compra & Notas Fiscais de Entrada</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {comprasDoFornecedor.length} pedidos registrados
                </span>
              </div>

              {comprasDoFornecedor.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                  Nenhuma compra registrada para este fornecedor até o momento.
                </div>
              ) : (
                comprasDoFornecedor.map((compra) => {
                  const expandido = compraExpandidaId === compra.id;

                  return (
                    <div 
                      key={compra.id}
                      className={`
                        bg-white rounded-2xl border transition-all overflow-hidden
                        ${expandido ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-200/90 shadow-xs hover:border-emerald-300'}
                      `}
                    >
                      {/* Linha Principal da Compra */}
                      <div 
                        onClick={() => toggleExpandirCompra(compra.id)}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Identificação do Pedido e Datas */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                          <div>
                            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              Pedido de Compra
                            </span>
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {compra.numero_compra}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              Emissão
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {compra.data_emissao}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              Entrega
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {compra.data_entrega || 'Recebido'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              Nota Fiscal (NF-e)
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                              <FileCheck2 className="w-3 h-3 text-indigo-600" />
                              Nº {compra.numero_nota_fiscal}
                            </span>
                          </div>
                        </div>

                        {/* Valor, Botão de Ver NF e Ação de Expandir */}
                        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                          {/* Botão de Ver Nota Fiscal Anexa */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompraModalDanfe(compra);
                            }}
                            className="
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                              bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200
                              text-xs font-bold transition-all shadow-xs cursor-pointer
                            "
                            title="Visualizar DANFE e dados fiscais anexos"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Ver NF Anexa</span>
                          </button>

                          <div className="text-right">
                            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              Valor da Compra
                            </span>
                            <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                              R$ {compra.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
                            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Seção Expandida com Itens / Matérias-Primas da Compra */}
                      {expandido && (
                        <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-emerald-700" />
                              Matérias-Primas e Insumos Recebidos nesta Compra
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Chave NF-e: <span className="font-mono">{compra.chave_acesso_nfe || 'Emitida eletronicamente'}</span>
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-4">Código</th>
                                  <th className="py-2.5 px-4">Item / Matéria-Prima</th>
                                  <th className="py-2.5 px-4 text-center">Qtd</th>
                                  <th className="py-2.5 px-4 text-center">Unidade</th>
                                  <th className="py-2.5 px-4 text-right">Valor Unitário</th>
                                  <th className="py-2.5 px-4 text-right">Valor Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {compra.itens.map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{item.codigo}</td>
                                    <td className="py-2.5 px-4 font-bold text-slate-800">{item.nome_produto}</td>
                                    <td className="py-2.5 px-4 text-center font-mono font-semibold">{item.quantidade.toLocaleString('pt-BR')}</td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                        {item.unidade}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                      R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                                      R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODO: FORMULÁRIO DE CADASTRO / EDIÇÃO DE FORNECEDOR     */}
      {/* ========================================================= */}
      {modo === 'formulario' && (
        <form onSubmit={salvarFornecedor} className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* TOPO DO FORMULÁRIO */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                title="Voltar sem salvar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {fornecedorSelecionado ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h2>
                <p className="text-xs text-slate-500">
                  Preencha os dados cadastrais, endereço e vincule às Matérias-Primas do estoque
                </p>
              </div>
            </div>

            {/* Status Ativo / Inativo no Formulário */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Status:</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5
                  ${formData.ativo ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'}
                `}
              >
                {formData.ativo ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                <span>{formData.ativo ? 'Ativo' : 'Inativo'}</span>
              </button>
            </div>
          </div>

          {/* CORPO DO FORMULÁRIO COM SCROLL */}
          <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-8">
            
            {/* SEÇÃO 1: DADOS GERAIS & IDENTIFICAÇÃO */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <span>1. Identificação e Documentos</span>
                </div>

                {/* Seleção PJ / PF */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PJ' })}
                    className={`px-3 py-1 rounded-lg transition-all ${formData.tipo_pessoa === 'PJ' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    Pessoa Jurídica (PJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PF' })}
                    className={`px-3 py-1 rounded-lg transition-all ${formData.tipo_pessoa === 'PF' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    Pessoa Física (PF)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {/* Razão Social / Nome */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.razao_nome}
                    onChange={(e) => setFormData({ ...formData, razao_nome: e.target.value })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Paulínia Embalagens e Plásticos Ltda' : 'Ex: José Augusto Ferreira da Silva'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.fantasia}
                    onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                    placeholder="Ex: Paulínia Embalagens"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* CPF / CNPJ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Inscrição Estadual / RG */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Inscrição Estadual (IE)' : 'RG'}
                  </label>
                  <input
                    type="text"
                    value={formData.ie_rg}
                    onChange={(e) => setFormData({ ...formData, ie_rg: e.target.value })}
                    placeholder="Ex: 524.119.340.118"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telefone de Contato <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(19) 3874-5000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* E-mail Comercial */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    E-mail Comercial / Faturamento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendas@fornecedor.com.br"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: PRODUTOS FORNECIDOS & VÍNCULO COM MATÉRIA-PRIMA */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                    <Boxes className="w-4 h-4 text-emerald-800" />
                    <span>2. Matéria-Prima Vinculados</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vincula as matérias-primas deste fornecedor diretamente ao módulo de <span className="font-bold text-emerald-800">Matéria Prima (Estoque e Cadastro)</span>
                  </p>
                </div>

                {/* Alternador de Modo de Inclusão */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setModoInclusaoProduto('catalogo')}
                    className={`px-3 py-1 rounded-lg transition-all ${modoInclusaoProduto === 'catalogo' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    Vincular do Catálogo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoInclusaoProduto('novo')}
                    className={`px-3 py-1 rounded-lg transition-all ${modoInclusaoProduto === 'novo' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    + Novo Insumo / Produto
                  </button>
                </div>
              </div>

              {/* OPÇÃO A: SELECIONAR DO CATÁLOGO DE MATÉRIAS-PRIMAS EXISTENTES */}
              {modoInclusaoProduto === 'catalogo' ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <span className="block text-xs font-bold text-slate-700">
                    Selecione uma matéria-prima já cadastrada na empresa:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <select
                        value={materiaPrimaSelecionadaId}
                        onChange={(e) => setMateriaPrimaSelecionadaId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                      >
                        <option value="">-- Selecione uma Matéria-Prima / Insumo --</option>
                        {catalogoMateriasPrimas.map(mp => (
                          <option key={mp.id} value={mp.id}>
                            [{mp.codigo}] {mp.nome} • {mp.categoria} ({mp.unidade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={novoItemCodigoFornecedor}
                        onChange={(e) => setNovoItemCodigoFornecedor(e.target.value)}
                        placeholder="Cód. no Fornecedor (Opcional)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-emerald-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={adicionarDoCatalogo}
                        disabled={!materiaPrimaSelecionadaId}
                        className="
                          px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40
                          text-white font-bold text-xs transition-all cursor-pointer whitespace-nowrap shadow-xs
                        "
                      >
                        + Vincular
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* OPÇÃO B: DIGITAR NOVA MATÉRIA-PRIMA E JÁ ENVIAR AO ESTOQUE */
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/90 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold text-emerald-950">
                      Item fornecido que não é matéria-prima (serviço, peça, outros):
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-900">
                      Matéria-prima se cadastra em Produtos → Matéria-Prima e depois se vincula pelo catálogo.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Nome */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome da Matéria-Prima / Insumo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novoItemNome}
                        onChange={(e) => setNovoItemNome(e.target.value)}
                        placeholder="Ex: Embalagem Alumínio 1kg, Farelo de Trigo..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>

                    {/* Categoria */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Categoria
                      </label>
                      <select
                        value={novoItemCategoria}
                        onChange={(e) => setNovoItemCategoria(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-white"
                      >
                        <option value="Matéria-Prima">Matéria-Prima</option>
                        <option value="Embalagens">Embalagens</option>
                        <option value="Insumos Agrícolas">Insumos Agrícolas</option>
                        <option value="Químicos">Químicos</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    {/* Unidade */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Unidade de Medida
                      </label>
                      <select
                        value={novoItemUnidade}
                        onChange={(e) => setNovoItemUnidade(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600 bg-white"
                      >
                        <option value="UN">Unidade (UN)</option>
                        <option value="KG">Quilo (KG)</option>
                        <option value="SC">Saca (SC)</option>
                        <option value="L">Litro (L)</option>
                        <option value="CX">Caixa (CX)</option>
                        <option value="BOB">Bobina (BOB)</option>
                        <option value="RL">Rolo (RL)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex-1 max-w-sm">
                      <input
                        type="text"
                        value={novoItemCodigoFornecedor}
                        onChange={(e) => setNovoItemCodigoFornecedor(e.target.value)}
                        placeholder="Código de Referência no Fornecedor (Opcional)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={cadastrarNovoProdutoEIntegrar}
                      disabled={!novoItemNome.trim()}
                      className="
                        px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40
                        text-white font-bold text-xs transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1.5
                      "
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar & Integrar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA DOS PRODUTOS / MATÉRIAS-PRIMAS VINCULADAS A ESTE FORNECEDOR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Matéria-Prima Vinculados ({formData.produtos_fornecidos.length}):</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Disponíveis para pedidos de compra e controle de estoque
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 min-h-[90px] flex flex-wrap items-center gap-2">
                  {formData.produtos_fornecidos.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3">
                      Nenhuma matéria-prima vinculada ainda. Selecione acima para ligar ao estoque e compras.
                    </p>
                  ) : (
                    formData.produtos_fornecidos.map((prod) => (
                      <div
                        key={prod.id}
                        className="
                          inline-flex items-center gap-2 px-3 py-2 rounded-xl
                          bg-white text-slate-900 border border-slate-200 shadow-xs text-xs font-semibold
                        "
                      >
                        <Boxes className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{prod.nome}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                              {prod.unidade}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-normal mt-0.5">
                            <span className="text-emerald-800 font-medium">Cat: {prod.categoria}</span>
                            {prod.codigo_materia_prima && (
                              <span className="text-slate-400 font-mono">Cód: {prod.codigo_materia_prima}</span>
                            )}
                            {prod.integrado_materia_prima && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                                <Check className="w-2.5 h-2.5" />
                                Estoque MP
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removerProdutoLista(prod.id)}
                          className="ml-2 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                          title="Desvincular produto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* SEÇÃO 3: ENDEREÇO OPERACIONAL */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-emerald-800" />
                  <span>3. Endereço e Localização</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {/* CEP */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    CEP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Logradouro */}
                <div className="sm:col-span-2 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Logradouro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    placeholder="Ex: Av. José Paulino"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Número */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="2400 ou S/N"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Bairro */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Ex: Distrito Industrial"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* UF */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estado (UF) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  >
                    {['SP', 'MG', 'PR', 'RJ', 'SC', 'RS', 'GO', 'MS', 'MT', 'BA', 'ES', 'DF'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>

                {/* Município */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Município <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="Ex: Paulínia"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Complemento */}
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Complemento / Ponto de Referência
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Ex: Bloco A, Doca 2, Portaria Industrial"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO: DADOS PARA PAGAMENTO (CHAVE PIX) */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                  <CreditCard className="w-4 h-4 text-emerald-800" />
                  <span>Dados para Pagamento (Chave PIX)</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Condições comerciais, forma e prazo serão definidos diretamente na compra da matéria-prima
                </span>
              </div>

              <div className="max-w-xl">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chave PIX do Fornecedor
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.chave_pix}
                    onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                    placeholder="CNPJ, E-mail, Telefone celular ou Chave Aleatória"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/30 focus:bg-white transition-all pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    PIX
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Chave cadastrada para emissão de pagamentos e transferências a este fornecedor.
                </p>
              </div>
            </div>

          </div>

          {/* RODAPÉ DO FORMULÁRIO */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-slate-200 bg-white">
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
              <span>{fornecedorSelecionado ? 'Salvar Alterações do Fornecedor' : 'Cadastrar Fornecedor'}</span>
            </button>
          </div>

        </form>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL DE VISUALIZAÇÃO DA NOTA FISCAL (DANFE) ANEXA     */}
      {/* (AMPLO E HORIZONTAL PARA OCUPAR A TELA)                  */}
      {/* ========================================================= */}
      {compraModalDanfe && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl sm:max-w-5xl lg:max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Header do Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#01140b] to-[#032e1c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Documento Fiscal Eletrônico (DANFE / NF-e)
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-mono">
                    Nota Fiscal de Entrada Nº {compraModalDanfe.numero_nota_fiscal} • Série {compraModalDanfe.serie_nf || '1'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCompraModalDanfe(null)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Fiscal */}
            <div className="p-5 overflow-auto space-y-4 text-xs">
              {/* Chave de Acesso */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
                <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Chave de Acesso (44 Dígitos Autorizada pela SEFAZ)
                </span>
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 break-all select-all">
                  {compraModalDanfe.chave_acesso_nfe || '35260303882110000192550010000842191002341908'}
                </p>
              </div>

              {/* Grid com Dados do Documento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Emissão</span>
                  <span className="font-bold text-slate-800">{compraModalDanfe.data_emissao}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Entrada</span>
                  <span className="font-bold text-slate-800">{compraModalDanfe.data_entrega || '16/03/2026'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Status SEFAZ</span>
                  <span className="font-bold text-emerald-700">Autorizada (100)</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase">Valor Total NF</span>
                  <span className="font-black text-emerald-950 font-mono text-sm">
                    R$ {compraModalDanfe.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Itens Fiscais Constantes na NF */}
              <div className="space-y-2">
                <span className="block font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                  Itens Fiscais Vinculados
                </span>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Vlr. Unitário</th>
                        <th className="py-2 px-3 text-right">Vlr. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compraModalDanfe.itens.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{it.nome_produto}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{it.codigo}</div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-semibold">
                            {it.quantidade} {it.unidade}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            R$ {it.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            R$ {it.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>
                  O arquivo XML oficial desta NF-e está integrado ao módulo de notas fiscais de entrada (financeiro/fiscal).
                </span>
              </div>
            </div>

            {/* Footer do Modal com Botões de Ação */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                XML & DANFE disponíveis para download
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Download do XML da NF-e ${compraModalDanfe.numero_nota_fiscal} simulado com sucesso.`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar XML</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert(`Visualização do DANFE em PDF da NF-e ${compraModalDanfe.numero_nota_fiscal} aberto.`)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir DANFE (PDF)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
