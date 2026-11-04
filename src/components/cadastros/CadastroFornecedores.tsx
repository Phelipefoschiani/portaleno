import React, { useState, useMemo } from 'react';
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
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { Painel } from '../ui/Painel';
import { CORES } from '../ui/tokens';
import { FormularioCadastro, ChaveAtivo, BotaoLinha, BotaoCartao } from './FormularioCadastro';
import { ListaCadastro, LinkLinha } from './ListaCadastro';

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

  const ativosCount = fornecedores.filter(f => f.ativo).length;

  return (
    <div className="flex-1 w-full min-h-0 h-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* ========================================================= */}
      {/* 1. MODO: LISTAGEM DE FORNECEDORES                         */}
      {/* ========================================================= */}
      {modo === 'lista' && (
        <>
          <div className="mx-auto w-full max-w-[1700px]">
            <CabecalhoPagina
              titulo="Fornecedores"
              resumo={
                fornecedores.length === 0
                  ? 'Nenhum fornecedor cadastrado'
                  : `${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'} · ${ativosCount} ${ativosCount === 1 ? 'ativo' : 'ativos'}`
              }
              acoes={
                fornecedores.length === 0 ? undefined : (
                  <BotaoPrimario onClick={abrirFormularioNovo} className="w-full sm:w-auto h-10 sm:h-9">
                    <Plus className="w-4 h-4" /> Novo fornecedor
                  </BotaoPrimario>
                )
              }
            />
            {fornecedores.length > 0 && (
              <BarraFiltros>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Segmentado<'TODOS' | 'PJ' | 'PF'>
                    rotuloAria="Tipo de pessoa"
                    valor={filtroTipo}
                    onChange={setFiltroTipo}
                    opcoes={[
                      { valor: 'TODOS', rotulo: 'Todos' },
                      { valor: 'PJ', rotulo: 'Empresas', contagem: fornecedores.filter(f => f.tipo_pessoa === 'PJ').length },
                      { valor: 'PF', rotulo: 'Pessoas físicas', contagem: fornecedores.filter(f => f.tipo_pessoa === 'PF').length },
                    ]}
                  />
                  <Segmentado<'TODOS' | 'ATIVOS' | 'INATIVOS'>
                    rotuloAria="Situação"
                    valor={filtroStatus}
                    onChange={setFiltroStatus}
                    opcoes={[
                      { valor: 'TODOS', rotulo: 'Todas' },
                      { valor: 'ATIVOS', rotulo: 'Ativos' },
                      { valor: 'INATIVOS', rotulo: 'Inativos', contagem: fornecedores.length - ativosCount },
                    ]}
                  />
                </div>
                <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar nome, CNPJ/CPF ou cidade" className="w-full md:w-80 [&_input]:h-10 sm:[&_input]:h-8" />
              </BarraFiltros>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
              {fornecedoresFiltrados.length === 0 ? (
                <div className="bg-papel border border-linha rounded-md">
                  {fornecedores.length === 0 ? (
                    <EstadoVazio
                      titulo="Nenhum fornecedor cadastrado"
                      texto="Cadastre quem vende embalagens, insumos e serviços. Ao vincular as matérias-primas, as compras e o estoque já sabem de quem comprar."
                      acao={<BotaoPrimario onClick={abrirFormularioNovo} className="h-10 sm:h-9"><Plus className="w-4 h-4" /> Novo fornecedor</BotaoPrimario>}
                    />
                  ) : (
                    <EstadoVazio
                      titulo="Nenhum fornecedor com esses filtros"
                      texto="Confira a busca ou volte para Todos."
                      acao={<BotaoSecundario onClick={() => { setBusca(''); setFiltroTipo('TODOS'); setFiltroStatus('TODOS'); }}>Limpar filtros</BotaoSecundario>}
                    />
                  )}
                </div>
              ) : (
                <ListaCadastro<Fornecedor>
                  itens={fornecedoresFiltrados}
                  chave={f => f.id}
                  cartao={f => ({
                    titulo: f.razao_nome,
                    subtitulo: `${f.fantasia ? `${f.fantasia} · ` : ''}${f.endereco.municipio}/${f.endereco.uf}`,
                    status: <StatusChip tom={f.ativo ? 'pago' : 'vencido'}>{f.ativo ? 'Ativo' : 'Inativo'}</StatusChip>,
                    detalhes: [f.cpf_cnpj, f.telefone || f.email],
                  })}
                  acoesCartao={f => (
                    <>
                      <BotaoCartao onClick={() => abrirHistorico(f)} className="flex-1"><History className="w-3.5 h-3.5" /> Compras</BotaoCartao>
                      <BotaoCartao onClick={() => abrirFormularioEditar(f)} className="flex-1"><Edit2 className="w-3.5 h-3.5" /> Editar</BotaoCartao>
                    </>
                  )}
                  colunas={[
                    {
                      titulo: 'Fornecedor',
                      render: f => (
                        <>
                          <div className="font-semibold text-tinta">{f.razao_nome}</div>
                          <div className="text-[11.5px] text-cinza">{f.tipo_pessoa === 'PJ' ? 'Empresa' : 'Pessoa física'}{f.fantasia ? ` · ${f.fantasia}` : ''}</div>
                        </>
                      ),
                    },
                    {
                      titulo: 'CNPJ / CPF',
                      className: 'tabular-nums whitespace-nowrap',
                      render: f => (
                        <>
                          <div>{f.cpf_cnpj}</div>
                          {f.ie_rg && <div className="text-[11.5px] text-cinza">IE/RG {f.ie_rg}</div>}
                        </>
                      ),
                    },
                    {
                      titulo: 'Contato',
                      render: f => (
                        <>
                          <div className="tabular-nums whitespace-nowrap">{f.telefone || '—'}</div>
                          <div className="text-[11.5px] text-cinza truncate max-w-[220px]">{f.email}</div>
                        </>
                      ),
                    },
                    {
                      titulo: 'Cidade',
                      render: f => (
                        <>
                          <div className="whitespace-nowrap">{f.endereco.municipio}/{f.endereco.uf}</div>
                          <div className="text-[11.5px] text-cinza">{f.endereco.bairro}</div>
                        </>
                      ),
                    },
                    {
                      titulo: 'Situação',
                      centro: true,
                      render: f => (
                        <button
                          type="button"
                          onClick={() => alternarStatusFornecedor(f.id)}
                          className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ouro"
                          title={f.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                        >
                          <StatusChip tom={f.ativo ? 'pago' : 'vencido'}>{f.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
                        </button>
                      ),
                    },
                  ]}
                  acoesLinha={f => (
                    <>
                      <LinkLinha onClick={() => abrirHistorico(f)} title="Compras e notas fiscais"><History className="w-3.5 h-3.5" /> Compras</LinkLinha>
                      <BotaoLinha rotulo="Editar fornecedor" onClick={() => abrirFormularioEditar(f)}><Edit2 className="w-4 h-4" /></BotaoLinha>
                    </>
                  )}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. MODO: HISTÓRICO DE COMPRAS E NOTAS FISCAIS DO FORNECEDOR */}
      {/* ========================================================= */}
      {modo === 'historico' && fornecedorSelecionado && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-[1700px] pb-6">
          <div className="px-4 sm:px-6 pt-3">
            <button
              type="button"
              onClick={() => setModo('lista')}
              className="inline-flex items-center gap-1.5 h-10 sm:h-8 -ml-1 px-1 text-[13px] font-semibold text-eno-700 hover:text-eno-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro rounded"
            >
              <ArrowLeft className="w-4 h-4" /> Fornecedores
            </button>
          </div>
          <CabecalhoPagina
            titulo={fornecedorSelecionado.fantasia || fornecedorSelecionado.razao_nome}
            resumo={`${fornecedorSelecionado.cpf_cnpj} · ${fornecedorSelecionado.endereco.municipio}/${fornecedorSelecionado.endereco.uf} · R$ ${totalCompradoFornecedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em compras`}
            className="!pt-1"
            acoes={
              <BotaoSecundario onClick={() => abrirFormularioEditar(fornecedorSelecionado)} className="h-10 sm:h-9">
                <Edit2 className="w-4 h-4" /> Editar cadastro
              </BotaoSecundario>
            }
          />

          {/* CONTEÚDO DO HISTÓRICO */}
          <div className="px-4 sm:px-6 space-y-5">

            {/* GRÁFICO DE COMPRAS MENSAIS */}
            <Painel titulo="Compras por mês" contexto="últimos 6 meses">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGraficoMensal} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CORES.linha} />
                    <XAxis dataKey="mes" tick={{ fill: CORES.cinza, fontSize: 11 }} axisLine={{ stroke: CORES.linha }} tickLine={false} />
                    <YAxis tick={{ fill: CORES.cinza, fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(val) => `${(val / 1000).toFixed(0)} mil`} />
                    <Tooltip content={<CustomTooltipCompras />} />
                    <Line type="monotone" dataKey="totalCompras" stroke={CORES.eno700} strokeWidth={2.5} dot={{ r: 3, fill: CORES.eno700, stroke: CORES.papel, strokeWidth: 2 }} activeDot={{ r: 5, fill: CORES.ouroEscuro }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            {/* LISTAGEM EM LINHAS DE COMPRAS E NOTAS FISCAIS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-tinta font-extrabold text-sm">
                  <ReceiptText className="w-4 h-4 text-eno-800" />
                  <span>Pedidos de Compra & Notas Fiscais de Entrada</span>
                </div>
                <span className="text-xs font-semibold text-cinza">
                  {comprasDoFornecedor.length} pedidos registrados
                </span>
              </div>

              {comprasDoFornecedor.length === 0 ? (
                <div className="p-8 text-center bg-papel rounded-md border border-linha text-cinza text-sm">
                  Nenhuma compra registrada para este fornecedor até o momento.
                </div>
              ) : (
                comprasDoFornecedor.map((compra) => {
                  const expandido = compraExpandidaId === compra.id;

                  return (
                    <div 
                      key={compra.id}
                      className={`
                        bg-papel rounded-md border transition-all overflow-hidden
                        ${expandido ? 'border-eno-600  ring-1 ring-eno-600/20' : 'border-linha/90  hover:border-linha-forte'}
                      `}
                    >
                      {/* Linha Principal da Compra */}
                      <div 
                        onClick={() => toggleExpandirCompra(compra.id)}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-papel-2/60 transition-colors"
                      >
                        {/* Identificação do Pedido e Datas */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                          <div>
                            <span className="block text-[10px] font-extrabold uppercase text-cinza tracking-wider">
                              Pedido de Compra
                            </span>
                            <span className="text-sm font-extrabold text-tinta tabular-nums">
                              {compra.numero_compra}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-extrabold uppercase text-cinza tracking-wider">
                              Emissão
                            </span>
                            <span className="text-xs font-bold text-tinta-2">
                              {compra.data_emissao}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-extrabold uppercase text-cinza tracking-wider">
                              Entrega
                            </span>
                            <span className="text-xs font-bold text-tinta-2">
                              {compra.data_entrega || 'Recebido'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] font-extrabold uppercase text-cinza tracking-wider">
                              Nota Fiscal (NF-e)
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-tinta-2 tabular-nums bg-papel-2 px-2 py-0.5 rounded-md border border-linha-forte/60">
                              <FileCheck2 className="w-3 h-3 text-tinta-2" />
                              Nº {compra.numero_nota_fiscal}
                            </span>
                          </div>
                        </div>

                        {/* Valor, Botão de Ver NF e Ação de Expandir */}
                        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-linha">
                          {/* Botão de Ver Nota Fiscal Anexa */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompraModalDanfe(compra);
                            }}
                            className="
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                              bg-papel-2 hover:bg-papel-2 text-tinta-2 border border-linha-forte
                              text-xs font-bold transition-all  cursor-pointer
                            "
                            title="Visualizar DANFE e dados fiscais anexos"
                          >
                            <Eye className="w-3.5 h-3.5 text-tinta-2" />
                            <span>Ver NF Anexa</span>
                          </button>

                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold uppercase text-cinza tracking-wider">
                              Valor da Compra
                            </span>
                            <span className="text-sm sm:text-base font-extrabold text-tinta tabular-nums">
                              R$ {compra.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="p-1 rounded-lg bg-papel-2 text-tinta-2">
                            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Seção Expandida com Itens / Matérias-Primas da Compra */}
                      {expandido && (
                        <div className="border-t border-linha bg-papel-2/70 p-4 sm:p-5 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-tinta-2 uppercase tracking-wider flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-eno-700" />
                              Matérias-Primas e Insumos Recebidos nesta Compra
                            </span>
                            <span className="text-[11px] text-cinza font-medium">
                              Chave NF-e: <span className="tabular-nums">{compra.chave_acesso_nfe || 'Emitida eletronicamente'}</span>
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-md border border-linha bg-papel">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-papel-2/70 text-tinta-2 font-bold uppercase text-[10px] border-b border-linha">
                                <tr>
                                  <th className="py-2.5 px-4">Código</th>
                                  <th className="py-2.5 px-4">Item / Matéria-Prima</th>
                                  <th className="py-2.5 px-4 text-center">Qtd</th>
                                  <th className="py-2.5 px-4 text-center">Unidade</th>
                                  <th className="py-2.5 px-4 text-right">Valor Unitário</th>
                                  <th className="py-2.5 px-4 text-right">Valor Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-linha">
                                {compra.itens.map(item => (
                                  <tr key={item.id} className="hover:bg-papel-2/50">
                                    <td className="py-2.5 px-4 tabular-nums text-[11px] text-cinza">{item.codigo}</td>
                                    <td className="py-2.5 px-4 font-bold text-tinta">{item.nome_produto}</td>
                                    <td className="py-2.5 px-4 text-center tabular-nums font-semibold">{item.quantidade.toLocaleString('pt-BR')}</td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className="px-2 py-0.5 rounded bg-papel-2 text-tinta-2 text-[10px] font-bold">
                                        {item.unidade}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-right tabular-nums text-tinta-2">
                                      R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-4 text-right tabular-nums font-extrabold text-tinta">
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
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODO: FORMULÁRIO DE CADASTRO / EDIÇÃO DE FORNECEDOR     */}
      {/* ========================================================= */}
      {modo === 'formulario' && (
        <FormularioCadastro
          onSubmit={salvarFornecedor}
          onCancelar={() => setModo('lista')}
          titulo={fornecedorSelecionado ? (fornecedorSelecionado.fantasia || fornecedorSelecionado.razao_nome) : 'Novo fornecedor'}
          subtitulo={fornecedorSelecionado ? 'Editar cadastro do fornecedor' : 'Dados cadastrais, endereço e matérias-primas que ele fornece'}
          extra={<ChaveAtivo ativo={formData.ativo} onChange={v => setFormData({ ...formData, ativo: v })} rotulo="Fornecedor ativo" />}
          rotuloSalvar={fornecedorSelecionado ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        >
          
          
{/* CORPO DO FORMULÁRIO COM SCROLL */}
          <div className="flex-1 overflow-auto px-3 py-4 sm:p-8 space-y-5 sm:space-y-8">
            
            {/* SEÇÃO 1: DADOS GERAIS & IDENTIFICAÇÃO */}
            <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha  space-y-5">
              <div className="pb-3 border-b border-linha flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-tinta font-extrabold text-sm uppercase tracking-wide">
                  <Building2 className="w-4 h-4 text-eno-800" />
                  <span>1. Identificação e Documentos</span>
                </div>

                {/* Seleção PJ / PF */}
                <div className="flex items-center bg-papel-2 p-1 rounded-md text-xs font-bold text-tinta-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PJ' })}
                    className={`px-3 py-1 rounded-lg transition-all ${formData.tipo_pessoa === 'PJ' ? 'bg-papel text-eno-900 ' : 'hover:text-tinta'}`}
                  >
                    Pessoa Jurídica (PJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_pessoa: 'PF' })}
                    className={`px-3 py-1 rounded-lg transition-all ${formData.tipo_pessoa === 'PF' ? 'bg-papel text-eno-900 ' : 'hover:text-tinta'}`}
                  >
                    Pessoa Física (PF)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {/* Razão Social / Nome */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.razao_nome}
                    onChange={(e) => setFormData({ ...formData, razao_nome: e.target.value })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? 'Ex: Paulínia Embalagens e Plásticos Ltda' : 'Ex: José Augusto Ferreira da Silva'}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.fantasia}
                    onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                    placeholder="Ex: Paulínia Embalagens"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* CPF / CNPJ */}
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: mascaraCpfCnpj(e.target.value) })}
                    placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Inscrição Estadual / RG */}
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    {formData.tipo_pessoa === 'PJ' ? 'Inscrição Estadual (IE)' : 'RG'}
                  </label>
                  <input
                    type="text"
                    value={formData.ie_rg}
                    onChange={(e) => setFormData({ ...formData, ie_rg: formData.tipo_pessoa === 'PJ' ? mascaraInscricaoEstadual(e.target.value) : e.target.value })}
                    placeholder="Ex: 524.119.340.118"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Telefone de Contato <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(19) 3874-5000"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* E-mail Comercial */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    E-mail Comercial / Faturamento <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendas@fornecedor.com.br"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: PRODUTOS FORNECIDOS & VÍNCULO COM MATÉRIA-PRIMA */}
            <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha  space-y-5">
              <div className="pb-3 border-b border-linha flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-tinta font-extrabold text-sm uppercase tracking-wide">
                    <Boxes className="w-4 h-4 text-eno-800" />
                    <span>2. Matéria-Prima Vinculados</span>
                  </div>
                  <p className="text-xs text-cinza mt-0.5">
                    Vincula as matérias-primas deste fornecedor diretamente ao módulo de <span className="font-bold text-eno-800">Matéria Prima (Estoque e Cadastro)</span>
                  </p>
                </div>

                {/* Alternador de Modo de Inclusão */}
                <div className="flex items-center bg-papel-2 p-1 rounded-md text-xs font-bold text-tinta-2">
                  <button
                    type="button"
                    onClick={() => setModoInclusaoProduto('catalogo')}
                    className={`px-3 py-1 rounded-lg transition-all ${modoInclusaoProduto === 'catalogo' ? 'bg-papel text-eno-900 ' : 'hover:text-tinta'}`}
                  >
                    Vincular do Catálogo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoInclusaoProduto('novo')}
                    className={`px-3 py-1 rounded-lg transition-all ${modoInclusaoProduto === 'novo' ? 'bg-papel text-eno-900 ' : 'hover:text-tinta'}`}
                  >
                    + Novo Insumo / Produto
                  </button>
                </div>
              </div>

              {/* OPÇÃO A: SELECIONAR DO CATÁLOGO DE MATÉRIAS-PRIMAS EXISTENTES */}
              {modoInclusaoProduto === 'catalogo' ? (
                <div className="p-4 rounded-md bg-papel-2 border border-linha/80 space-y-3">
                  <span className="block text-xs font-bold text-tinta-2">
                    Selecione uma matéria-prima já cadastrada na empresa:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <select
                        value={materiaPrimaSelecionadaId}
                        onChange={(e) => setMateriaPrimaSelecionadaId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel"
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
                        className="flex-1 px-3 py-2 rounded-md border border-linha-forte text-xs tabular-nums focus:outline-none focus:border-eno-600 bg-papel"
                      />
                      <button
                        type="button"
                        onClick={adicionarDoCatalogo}
                        disabled={!materiaPrimaSelecionadaId}
                        className="
                          px-4 py-2 rounded-md bg-eno-800 hover:bg-eno-900 disabled:opacity-40
                          text-white font-bold text-xs transition-all cursor-pointer whitespace-nowrap 
                        "
                      >
                        + Vincular
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* OPÇÃO B: DIGITAR NOVA MATÉRIA-PRIMA E JÁ ENVIAR AO ESTOQUE */
                <div className="p-4 rounded-md bg-eno-50/50 border border-linha-forte/90 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold text-eno-950">
                      Item fornecido que não é matéria-prima (serviço, peça, outros):
                    </span>
                    <span className="text-[11px] font-semibold text-eno-900">
                      Matéria-prima se cadastra em Produtos → Matéria-Prima e depois se vincula pelo catálogo.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Nome */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-tinta-2 mb-1">
                        Nome da Matéria-Prima / Insumo <span className="text-st-vencido">*</span>
                      </label>
                      <input
                        type="text"
                        value={novoItemNome}
                        onChange={(e) => setNovoItemNome(e.target.value)}
                        placeholder="Ex: Embalagem Alumínio 1kg, Farelo de Trigo..."
                        className="w-full px-3 py-2 rounded-md border border-linha-forte text-xs font-medium focus:outline-none focus:border-eno-600 bg-papel"
                      />
                    </div>

                    {/* Categoria */}
                    <div>
                      <label className="block text-[11px] font-bold text-tinta-2 mb-1">
                        Categoria
                      </label>
                      <select
                        value={novoItemCategoria}
                        onChange={(e) => setNovoItemCategoria(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-md border border-linha-forte text-xs font-medium focus:outline-none focus:border-eno-600 bg-papel"
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
                      <label className="block text-[11px] font-bold text-tinta-2 mb-1">
                        Unidade de Medida
                      </label>
                      <select
                        value={novoItemUnidade}
                        onChange={(e) => setNovoItemUnidade(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-linha-forte text-xs font-medium focus:outline-none focus:border-eno-600 bg-papel"
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
                        className="w-full px-3 py-2 rounded-md border border-linha-forte text-xs tabular-nums focus:outline-none focus:border-eno-600 bg-papel"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={cadastrarNovoProdutoEIntegrar}
                      disabled={!novoItemNome.trim()}
                      className="
                        px-5 py-2 rounded-md bg-eno-800 hover:bg-eno-900 disabled:opacity-40
                        text-white font-bold text-xs transition-all cursor-pointer whitespace-nowrap  flex items-center gap-1.5
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
                <div className="flex items-center justify-between text-xs font-bold text-tinta-2">
                  <span>Matéria-Prima Vinculados ({formData.produtos_fornecidos.length}):</span>
                  <span className="text-[11px] text-cinza font-normal">
                    Disponíveis para pedidos de compra e controle de estoque
                  </span>
                </div>

                <div className="p-3.5 rounded-md bg-papel-2/80 border border-linha min-h-[90px] flex flex-wrap items-center gap-2">
                  {formData.produtos_fornecidos.length === 0 ? (
                    <p className="text-xs text-cinza italic py-3">
                      Nenhuma matéria-prima vinculada ainda. Selecione acima para ligar ao estoque e compras.
                    </p>
                  ) : (
                    formData.produtos_fornecidos.map((prod) => (
                      <div
                        key={prod.id}
                        className="
                          inline-flex items-center gap-2 px-3 py-2 rounded-md
                          bg-papel text-tinta border border-linha  text-xs font-semibold
                        "
                      >
                        <Boxes className="w-3.5 h-3.5 text-eno-700 shrink-0" />
                        
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-tinta">{prod.nome}</span>
                            <span className="text-[10px] tabular-nums px-1.5 py-0.2 rounded bg-papel-2 text-tinta-2 font-bold">
                              {prod.unidade}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-cinza font-normal mt-0.5">
                            <span className="text-eno-800 font-medium">Cat: {prod.categoria}</span>
                            {prod.codigo_materia_prima && (
                              <span className="text-cinza tabular-nums">Cód: {prod.codigo_materia_prima}</span>
                            )}
                            {prod.integrado_materia_prima && (
                              <span className="inline-flex items-center gap-0.5 text-eno-700 font-bold bg-eno-50 px-1 rounded">
                                <Check className="w-2.5 h-2.5" />
                                Estoque MP
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removerProdutoLista(prod.id)}
                          className="ml-2 text-cinza hover:text-st-vencido transition-colors p-1 rounded-full hover:bg-papel-2 cursor-pointer"
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
            <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha  space-y-5">
              <div className="pb-3 border-b border-linha flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-tinta font-extrabold text-sm uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-eno-800" />
                  <span>3. Endereço e Localização</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {/* CEP */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    CEP <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Logradouro */}
                <div className="sm:col-span-2 md:col-span-4">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Logradouro <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    placeholder="Ex: Av. José Paulino"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Número */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Número <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="2400 ou S/N"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Bairro */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Bairro <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Ex: Distrito Industrial"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* UF */}
                <div className="sm:col-span-2">
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
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Município <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="Ex: Paulínia"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>

                {/* Complemento */}
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-8">
                  <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                    Complemento / Ponto de Referência
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Ex: Bloco A, Doca 2, Portaria Industrial"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO: DADOS PARA PAGAMENTO (CHAVE PIX) */}
            <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha  space-y-4">
              <div className="pb-3 border-b border-linha flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2 text-tinta font-extrabold text-sm uppercase tracking-wide">
                  <CreditCard className="w-4 h-4 text-eno-800" />
                  <span>Dados para Pagamento (Chave PIX)</span>
                </div>
                <span className="text-xs text-cinza font-medium">
                  Condições comerciais, forma e prazo serão definidos diretamente na compra da matéria-prima
                </span>
              </div>

              <div className="max-w-xl">
                <label className="block text-xs font-bold text-tinta-2 mb-1.5">
                  Chave PIX do Fornecedor
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.chave_pix}
                    onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                    placeholder="CNPJ, E-mail, Telefone celular ou Chave Aleatória"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 bg-papel-2/30 focus:bg-papel transition-all pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-extrabold bg-eno-100 text-eno-800 px-1.5 py-0.5 rounded">
                    PIX
                  </span>
                </div>
                <p className="text-[11px] text-cinza mt-1.5">
                  Chave cadastrada para emissão de pagamentos e transferências a este fornecedor.
                </p>
              </div>
            </div>

          </div>

          </FormularioCadastro>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL DE VISUALIZAÇÃO DA NOTA FISCAL (DANFE) ANEXA     */}
      {/* (AMPLO E HORIZONTAL PARA OCUPAR A TELA)                  */}
      {/* ========================================================= */}
      {compraModalDanfe && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-eno-950/60 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 relative w-full max-w-6xl bg-papel sm:rounded-md border border-linha overflow-hidden flex flex-col sm:my-auto h-dvh sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Header do Modal */}
            <div className="shrink-0 px-4 py-3 sm:p-5 bg-[linear-gradient(100deg,#042013_0%,#0b3d24_100%)] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-eno-600" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Documento Fiscal Eletrônico (DANFE / NF-e)
                  </h3>
                  <p className="text-[11px] text-eno-100/80 tabular-nums">
                    Nota Fiscal de Entrada Nº {compraModalDanfe.numero_nota_fiscal} • Série {compraModalDanfe.serie_nf || '1'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCompraModalDanfe(null)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Fiscal */}
            <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-auto space-y-4 text-xs">
              {/* Chave de Acesso */}
              <div className="p-3.5 rounded-md bg-papel-2 border border-linha tabular-nums space-y-1">
                <span className="block text-[10px] font-extrabold uppercase text-cinza tracking-wider">
                  Chave de Acesso (44 Dígitos Autorizada pela SEFAZ)
                </span>
                <p className="text-xs sm:text-[13px] font-bold text-tinta break-all select-all">
                  {compraModalDanfe.chave_acesso_nfe || '35260303882110000192550010000842191002341908'}
                </p>
              </div>

              {/* Grid com Dados do Documento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-papel-2 border border-linha">
                  <span className="block text-[10px] font-bold text-cinza uppercase">Emissão</span>
                  <span className="font-bold text-tinta">{compraModalDanfe.data_emissao}</span>
                </div>
                <div className="p-3 rounded-md bg-papel-2 border border-linha">
                  <span className="block text-[10px] font-bold text-cinza uppercase">Entrada</span>
                  <span className="font-bold text-tinta">{compraModalDanfe.data_entrega || '16/03/2026'}</span>
                </div>
                <div className="p-3 rounded-md bg-papel-2 border border-linha">
                  <span className="block text-[10px] font-bold text-cinza uppercase">Status SEFAZ</span>
                  <span className="font-bold text-eno-700">Autorizada (100)</span>
                </div>
                <div className="p-3 rounded-md bg-eno-50 border border-linha-forte">
                  <span className="block text-[10px] font-bold text-eno-800 uppercase">Valor Total NF</span>
                  <span className="font-extrabold text-eno-950 tabular-nums text-sm">
                    R$ {compraModalDanfe.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Itens Fiscais Constantes na NF */}
              <div className="space-y-2">
                <span className="block font-bold text-tinta uppercase text-[11px] tracking-wider">
                  Itens Fiscais Vinculados
                </span>
                <div className="rounded-md border border-linha overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-papel-2 text-tinta-2 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Vlr. Unitário</th>
                        <th className="py-2 px-3 text-right">Vlr. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-linha">
                      {compraModalDanfe.itens.map((it, idx) => (
                        <tr key={idx} className="hover:bg-papel-2">
                          <td className="py-2 px-3">
                            <div className="font-bold text-tinta">{it.nome_produto}</div>
                            <div className="text-[10px] text-cinza tabular-nums">{it.codigo}</div>
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums font-semibold">
                            {it.quantidade} {it.unidade}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-tinta-2">
                            R$ {it.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-bold text-tinta">
                            R$ {it.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 rounded-md bg-st-aguardando-bg border border-st-aguardando/30 text-st-aguardando flex items-center gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-st-aguardando" />
                <span>
                  O arquivo XML oficial desta NF-e está integrado ao módulo de notas fiscais de entrada (financeiro/fiscal).
                </span>
              </div>
            </div>

            {/* Footer do Modal com Botões de Ação */}
            <div className="shrink-0 p-3 sm:p-4 bg-papel-2 border-t border-linha flex flex-wrap items-center justify-between gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <span className="hidden sm:inline text-[11px] text-cinza font-medium">
                XML & DANFE disponíveis para download
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none [&>button]:h-11 sm:[&>button]:h-9 [&>button]:justify-center">
                <button
                  type="button"
                  onClick={() => alert(`Download do XML da NF-e ${compraModalDanfe.numero_nota_fiscal} simulado com sucesso.`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-linha-forte hover:bg-papel-2 text-tinta-2 font-bold text-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar XML</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert(`Visualização do DANFE em PDF da NF-e ${compraModalDanfe.numero_nota_fiscal} aberto.`)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-eno-800 hover:bg-eno-900 text-white font-bold text-xs transition-all cursor-pointer "
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
