import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  Search, 
  Plus, 
  CheckCircle2, 
  Building2, 
  User, 
  CreditCard, 
  Scale, 
  Tractor, 
  Sprout, 
  AlertCircle, 
  X,
  Clock,
  Trash2,
  Package,
  DollarSign,
  Copy,
  Check,
  Edit2,
  Pencil,
  Save,
  Calendar,
  Filter,
  Eye,
  Printer,
  Download,
  ShoppingBag,
  UtensilsCrossed,
  Layers,
  Fuel,
  Wrench,
  FlaskConical,
  Sparkles,
  FileCheck,
  Loader2,
  ArrowRightCircle
} from 'lucide-react';
import {
  PedidoCompraGeral,
  Agricultor,
  Fornecedor,
  StatusPedidoCompra,
  CategoriaCompra,
  carregarPedidosCompra,
  salvarPedidosCompra,
  efetivarPedidoCompra,
  excluirPedidoCompra,
  UNIDADES_PEDIDO_COMPRA,
  lerNumeroBR,
  formatarDecimalBR
} from '../../data/mockStore';
import {
  carregarCalculosNaRoca,
  definirPagamentoCalculoRoca,
  excluirCalculoNaRoca,
  adicionarComprovante
} from '../../data/calculoRocaData';
import { CampoAnexoComprovante, ArquivoComprovante } from './ComprovantesRoca';
import {
  carregarAgricultores,
  carregarFornecedores,
  EVENTO_CADASTROS_ATUALIZADOS
} from '../../data/cadastrosData';
import { hojeISO, paraISO, formatarDataBR, somarDias } from '../../lib/datas';
import { EMPRESA } from '../../lib/empresa';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';

export function PedidoCompra() {
  const [pedidos, setPedidos] = useState<PedidoCompraGeral[]>(carregarPedidosCompra());
  const [agricultores, setAgricultores] = useState<Agricultor[]>(() => carregarAgricultores());
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => carregarFornecedores());

  // Atualiza listas de parceiros quando o cadastro mudar
  React.useEffect(() => {
    const atualizarCadastros = () => {
      setAgricultores(carregarAgricultores());
      setFornecedores(carregarFornecedores());
    };
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizarCadastros);
    return () => window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizarCadastros);
  }, []);
  
  // Filtros e busca
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'A_CONFIRMAR' | 'CONFIRMADOS' | 'PAGOS' | 'A_PAGAR' | 'PROGRAMADO' | 'ORCAMENTO'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [filtroParceiro, setFiltroParceiro] = useState<'TODOS' | 'AGRICULTOR' | 'FORNECEDOR'>('TODOS');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Modal Definir Pagamento / Virar Despesa (para pedidos de compra virarem despesa)
  const [pedidoDefinirPagamento, setPedidoDefinirPagamento] = useState<PedidoCompraGeral | null>(null);
  const [tipoPagamentoDef, setTipoPagamentoDef] = useState<'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL'>('JA_PAGO');
  const [produtoCompradoDef, setProdutoCompradoDef] = useState('');
  const [valorTotalDef, setValorTotalDef] = useState('');
  const [dataPagamentoOuVencDef, setDataPagamentoOuVencDef] = useState(new Date().toLocaleDateString('pt-BR'));
  const [formaPagamentoDef, setFormaPagamentoDef] = useState<string>('PIX');
  const [categoriaDef, setCategoriaDef] = useState<CategoriaCompra>('Embalagens');
  const [contaBancariaDef, setContaBancariaDef] = useState('Banco do Brasil - Conta Movimento');
  const [valorAdiantadoDef, setValorAdiantadoDef] = useState('');
  const [vencimentoSaldoDef, setVencimentoSaldoDef] = useState(somarDias(hojeISO(), 30));
  const [obsPagamentoDef, setObsPagamentoDef] = useState('');
  // Comprovante de pagamento (somente compras do Cálculo na Roça; guardado em chave própria)
  const [anexoPagamentoDef, setAnexoPagamentoDef] = useState<ArquivoComprovante | null>(null);

  // Sincronização de pedidos de compra e detecção de redirecionamento do Cálculo na Roça
  React.useEffect(() => {
    const handleUpdate = () => {
      setPedidos(carregarPedidosCompra());
    };
    window.addEventListener('pedidos_compra_updated', handleUpdate);

    // Verifica se veio do Cálculo na Roça solicitando definição de pagamento
    const targetPedidoId = sessionStorage.getItem('abrir_definicao_pagamento_pedido_id');
    if (targetPedidoId) {
      sessionStorage.removeItem('abrir_definicao_pagamento_pedido_id');
      const pedidosAtuais = carregarPedidosCompra();
      const ped = pedidosAtuais.find(p => p.id === targetPedidoId);
      if (ped) {
        setPedidoDefinirPagamento(ped);
        setProdutoCompradoDef(ped.item_descricao || '');
        setValorTotalDef(ped.valor_total ? ped.valor_total.toString() : '');
        setCategoriaDef(ped.categoria || 'Embalagens');
        setFormaPagamentoDef(ped.forma_pagamento || 'PIX');
        setDataPagamentoOuVencDef(new Date().toLocaleDateString('pt-BR'));
        setVencimentoSaldoDef(somarDias(hojeISO(), 30));
        setObsPagamentoDef('');
        setAnexoPagamentoDef(null);
        setMensagemSucesso(`Pedido gerado a partir do Cálculo na Roça! Defina abaixo a situação para virar despesa.`);
        setTimeout(() => setMensagemSucesso(null), 8000);
      }
    }

    return () => window.removeEventListener('pedidos_compra_updated', handleUpdate);
  }, []);

  // Modal Novo Pedido de Compra (Simples: Fornecedor, Data, Valor e Descrição)
  const [modalNovoPedido, setModalNovoPedido] = useState(false);
  const [tipoParceiroForm, setTipoParceiroForm] = useState<'AGRICULTOR' | 'FORNECEDOR'>('FORNECEDOR');
  
  // IDs selecionados no formulário
  const [agricultorIdForm, setAgricultorIdForm] = useState(() => carregarAgricultores()[0]?.id || '');
  const [fornecedorIdForm, setFornecedorIdForm] = useState(() => carregarFornecedores()[0]?.id || '');

  // Mantém a seleção válida quando a lista de parceiros mudar
  React.useEffect(() => {
    if (!agricultores.some(a => a.id === agricultorIdForm)) setAgricultorIdForm(agricultores[0]?.id || '');
  }, [agricultores]);
  React.useEffect(() => {
    if (!fornecedores.some(f => f.id === fornecedorIdForm)) setFornecedorIdForm(fornecedores[0]?.id || '');
  }, [fornecedores]);

  // Dados do formulário simples: Fornecedor, Data, Valor e Descrição
  const [dataForm, setDataForm] = useState(new Date().toLocaleDateString('pt-BR'));
  const [valorTotalForm, setValorTotalForm] = useState('');
  const [itemDescricaoForm, setItemDescricaoForm] = useState('');
  const [compradorNomeForm, setCompradorNomeForm] = useState('Equipe de Compras');
  const [localCompraForm, setLocalCompraForm] = useState('');
  const [categoriaForm, setCategoriaForm] = useState<CategoriaCompra>('Embalagens');
  const [quantidadeForm, setQuantidadeForm] = useState('1');
  const [unidadeMedidaForm, setUnidadeMedidaForm] = useState<PedidoCompraGeral['unidade_medida']>('Unidades');
  const [valorUnitarioForm, setValorUnitarioForm] = useState('');
  const [residuoDestopoForm, setResiduoDestopoForm] = useState('');
  const [statusPedidoForm, setStatusPedidoForm] = useState<StatusPedidoCompra>('Programado');
  const [formaPagamentoForm, setFormaPagamentoForm] = useState<PedidoCompraGeral['forma_pagamento']>('PIX');
  const [observacoesForm, setObservacoesForm] = useState('');

  // Modal de edição completa do Pedido de Compra (se editar, edita na despesa programada)
  const [modalEditarPedido, setModalEditarPedido] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState<PedidoCompraGeral | null>(null);
  const [editTipoParceiro, setEditTipoParceiro] = useState<'AGRICULTOR' | 'FORNECEDOR'>('AGRICULTOR');
  const [editParceiroId, setEditParceiroId] = useState('');
  const [editData, setEditData] = useState('');
  const [editCompradorNome, setEditCompradorNome] = useState('');
  const [editLocalCompra, setEditLocalCompra] = useState('');
  const [editCategoria, setEditCategoria] = useState<CategoriaCompra>('Embalagens');
  const [editItemDescricao, setEditItemDescricao] = useState('');
  const [editQuantidade, setEditQuantidade] = useState('');
  const [editUnidadeMedida, setEditUnidadeMedida] = useState<PedidoCompraGeral['unidade_medida']>('KG');
  const [editValorUnitario, setEditValorUnitario] = useState('');
  const [editStatusPedido, setEditStatusPedido] = useState<StatusPedidoCompra>('Programado');
  const [editFormaPagamento, setEditFormaPagamento] = useState<PedidoCompraGeral['forma_pagamento']>('PIX');
  const [editObservacoes, setEditObservacoes] = useState('');

  // Modal de edição rápida de Resíduo/Destopo/Casca
  const [pedidoEdicaoDestopo, setPedidoEdicaoDestopo] = useState<PedidoCompraGeral | null>(null);
  const [destopoInputKg, setDestopoInputKg] = useState<string>('');

  // Modal de Visualização A4 (Espelho do Pedido de Compra Grupo ENO)
  const [pedidoVisualizarA4, setPedidoVisualizarA4] = useState<PedidoCompraGeral | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Feedback de cópia da chave PIX
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const copiarChavePix = (chave: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => {
      setCopiadoId(null);
    }, 2000);
  };

  // Agricultor selecionado no form
  const agricultorAtualForm = useMemo(() => {
    return agricultores.find(a => a.id === agricultorIdForm);
  }, [agricultores, agricultorIdForm]);

  // Fornecedor selecionado no form
  const fornecedorAtualForm = useMemo(() => {
    return fornecedores.find(f => f.id === fornecedorIdForm);
  }, [fornecedores, fornecedorIdForm]);

  // Alternar status rápido do pagamento/pedido
  const alternarStatusPedido = (pedidoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPedidos(prev => prev.map(p => {
      if (p.id === pedidoId) {
        let proximoStatus: StatusPedidoCompra;
        if (p.status_pedido === 'Pago') {
          proximoStatus = 'Entregue (A Pagar)';
        } else if (p.status_pedido === 'Entregue (A Pagar)') {
          proximoStatus = 'Pago';
        } else if (p.status_pedido === 'Orçamento') {
          proximoStatus = 'Programado';
        } else {
          proximoStatus = 'Entregue (A Pagar)';
        }
        return {
          ...p,
          status_pedido: proximoStatus,
          data_pagamento: proximoStatus === 'Pago' ? new Date().toLocaleString('pt-BR') : undefined
        };
      }
      return p;
    }));
  };

  // Salvar alteração de destopo
  const salvarEdicaoDestopo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoEdicaoDestopo) return;

    const novoDestopo = Number(destopoInputKg) || 0;
    const atualizados = carregarPedidosCompra().map(p =>
      p.id === pedidoEdicaoDestopo.id ? { ...p, residuo_destopo_casca_kg: novoDestopo } : p
    );
    salvarPedidosCompra(atualizados);
    setPedidos(atualizados);

    setPedidoEdicaoDestopo(null);
  };

  // Salvar Novo Pedido de Compra (Programação Simples: Fornecedor, Data, Valor e Descrição)
  const salvarNovoPedido = (e: React.FormEvent) => {
    e.preventDefault();

    const qtd = lerNumeroBR(quantidadeForm);
    if (!(qtd > 0)) {
      alert('Informe a quantidade do pedido.');
      return;
    }
    const total = parseFloat((lerNumeroBR(valorTotalForm) || (qtd * lerNumeroBR(valorUnitarioForm)) || 0).toFixed(2));
    const unitario = qtd > 0 ? parseFloat((total / qtd).toFixed(4)) : total;

    let novoPedido: PedidoCompraGeral;

    if (tipoParceiroForm === 'AGRICULTOR') {
      const agr = agricultores.find(a => a.id === agricultorIdForm) || agricultores[0];
      if (!agr) {
        alert('Nenhum agricultor cadastrado. Cadastre o agricultor antes de programar a compra.');
        return;
      }

      novoPedido = {
        id: `ped_${Date.now()}`,
        data: paraISO(dataForm) || hojeISO(),
        tipo_parceiro: 'AGRICULTOR',
        agricultor_id: agr.id,
        agricultor_nome: agr.nome_completo,
        agricultor_propriedade: agr.nome_propriedade,
        agricultor_cpf_cnpj: agr.cpf_cnpj,
        agricultor_ie: agr.ie_rural,
        agricultor_cidade_uf: `${agr.endereco.municipio}/${agr.endereco.uf}`,
        agricultor_chave_pix: `${agr.chave_pix} (${agr.tipo_chave_pix})`,
        comprador_nome: 'Equipe de Compras',
        local_compra: `${agr.nome_propriedade} (${agr.endereco.municipio}/${agr.endereco.uf})`,
        item_descricao: itemDescricaoForm.trim() || 'Mandioca Industrial (Raiz In Natura)',
        categoria: 'Mandioca / Matéria-Prima',
        quantidade: qtd,
        unidade_medida: unidadeMedidaForm,
        valor_unitario: unitario,
        valor_total: total,
        status_pedido: 'Programado',
        forma_pagamento: 'PIX',
        observacoes: 'Programado — Categoria e pagamento definidos ao efetivar'
      };
    } else {
      const forn = fornecedores.find(f => f.id === fornecedorIdForm) || fornecedores[0];
      if (!forn) {
        alert('Nenhum fornecedor cadastrado. Cadastre o fornecedor antes de programar a compra.');
        return;
      }

      novoPedido = {
        id: `ped_${Date.now()}`,
        data: paraISO(dataForm) || hojeISO(),
        tipo_parceiro: 'FORNECEDOR',
        fornecedor_id: forn.id,
        fornecedor_nome: forn.razao_nome,
        fornecedor_fantasia: forn.fantasia,
        fornecedor_cnpj: forn.cpf_cnpj,
        fornecedor_ie: forn.ie_rg,
        fornecedor_cidade_uf: `${forn.endereco.municipio}/${forn.endereco.uf}`,
        fornecedor_chave_pix: forn.chave_pix,
        fornecedor_telefone: forn.telefone,
        comprador_nome: 'Equipe de Compras',
        local_compra: forn.fantasia || forn.razao_nome,
        item_descricao: itemDescricaoForm.trim() || 'Pedido de Compra Programado',
        categoria: 'Embalagens',
        quantidade: qtd,
        unidade_medida: unidadeMedidaForm,
        valor_unitario: unitario,
        valor_total: total,
        status_pedido: 'Programado',
        forma_pagamento: 'PIX',
        observacoes: 'Programado — Categoria e pagamento definidos ao efetivar'
      };
    }

    const atualizados = [novoPedido, ...pedidos];
    setPedidos(atualizados);
    salvarPedidosCompra(atualizados);

    // Pedido programado não gera despesa: ele aparece como programado a partir do próprio pedido de compra

    // Notifica financeiro para refletir nas despesas programadas
    window.dispatchEvent(new Event('financeiro_updated'));

    setModalNovoPedido(false);
    // Reset forms
    setDataForm(new Date().toLocaleDateString('pt-BR'));
    setItemDescricaoForm('');
    setValorTotalForm('');
    setQuantidadeForm('1');
    setUnidadeMedidaForm('Unidades');
    setValorUnitarioForm('');
    setMensagemSucesso('Pedido de compra programado com sucesso!');
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  // Abrir Modal de Edição Completa
  const abrirEdicaoPedido = (pedido: PedidoCompraGeral, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPedidoEditando(pedido);
    setEditTipoParceiro(pedido.tipo_parceiro);
    setEditParceiroId(
      pedido.tipo_parceiro === 'AGRICULTOR' 
        ? (pedido.agricultor_id || agricultores[0]?.id || '') 
        : (pedido.fornecedor_id || fornecedores[0]?.id || '')
    );
    setEditData(pedido.data);
    setEditCompradorNome(pedido.comprador_nome || 'Equipe de Compras');
    setEditLocalCompra(pedido.local_compra || '');
    setEditCategoria(pedido.categoria);
    setEditItemDescricao(pedido.item_descricao);
    setEditQuantidade(String(pedido.quantidade));
    setEditUnidadeMedida(pedido.unidade_medida);
    setEditValorUnitario(String(pedido.valor_unitario));
    setEditStatusPedido(pedido.status_pedido);
    setEditFormaPagamento(pedido.forma_pagamento);
    setEditObservacoes(pedido.observacoes || '');
    setModalEditarPedido(true);
  };

  // Salvar Edição do Pedido de Compra (Atualiza no pedido e na despesa programada vinculada)
  const salvarEdicaoPedido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoEditando) return;

    const qtd = lerNumeroBR(editQuantidade);
    const unit = lerNumeroBR(editValorUnitario);
    const total = qtd * unit;

    const pedidosAtuais = carregarPedidosCompra();
    const index = pedidosAtuais.findIndex(p => p.id === pedidoEditando.id);
    if (index === -1) return;

    let atualizado: PedidoCompraGeral;

    if (editTipoParceiro === 'AGRICULTOR') {
      const agr = agricultores.find(a => a.id === editParceiroId) || agricultores[0];
      atualizado = {
        ...pedidoEditando,
        data: paraISO(editData) || editData,
        tipo_parceiro: 'AGRICULTOR',
        agricultor_id: agr?.id,
        agricultor_nome: agr?.nome_completo,
        agricultor_propriedade: agr?.nome_propriedade,
        agricultor_cpf_cnpj: agr?.cpf_cnpj,
        agricultor_ie: agr?.ie_rural,
        agricultor_cidade_uf: agr ? `${agr.endereco.municipio}/${agr.endereco.uf}` : '',
        agricultor_chave_pix: agr ? `${agr.chave_pix} (${agr.tipo_chave_pix})` : '',
        comprador_nome: editCompradorNome,
        local_compra: editLocalCompra,
        item_descricao: editItemDescricao,
        categoria: editCategoria,
        quantidade: qtd,
        unidade_medida: editUnidadeMedida,
        valor_unitario: unit,
        valor_total: total,
        status_pedido: editStatusPedido,
        forma_pagamento: editFormaPagamento,
        observacoes: editObservacoes || undefined
      };
    } else {
      const forn = fornecedores.find(f => f.id === editParceiroId) || fornecedores[0];
      atualizado = {
        ...pedidoEditando,
        data: paraISO(editData) || editData,
        tipo_parceiro: 'FORNECEDOR',
        fornecedor_id: forn?.id,
        fornecedor_nome: forn?.razao_nome,
        fornecedor_fantasia: forn?.fantasia,
        fornecedor_cnpj: forn?.cpf_cnpj,
        fornecedor_ie: forn?.ie_rg,
        fornecedor_cidade_uf: forn ? `${forn.endereco.municipio}/${forn.endereco.uf}` : '',
        fornecedor_chave_pix: forn?.chave_pix,
        fornecedor_telefone: forn?.telefone,
        comprador_nome: editCompradorNome,
        local_compra: editLocalCompra,
        item_descricao: editItemDescricao,
        categoria: editCategoria,
        quantidade: qtd,
        unidade_medida: editUnidadeMedida,
        valor_unitario: unit,
        valor_total: total,
        status_pedido: editStatusPedido,
        forma_pagamento: editFormaPagamento,
        observacoes: editObservacoes || undefined
      };
    }

    pedidosAtuais[index] = atualizado;
    salvarPedidosCompra(pedidosAtuais);
    setPedidos(pedidosAtuais);

    // Sincroniza alteração na despesa vinculada se existir
    try {
      const rawDespesas = localStorage.getItem('grupo_eno_financeiro_despesas_v1');
      if (rawDespesas) {
        const despesas = JSON.parse(rawDespesas);
        const parceiroNome = atualizado.tipo_parceiro === 'AGRICULTOR' ? atualizado.agricultor_nome : atualizado.fornecedor_nome;
        const despesasAtualizadas = despesas.map((d: any) => {
          // Só a despesa PROGRAMADA (legado) acompanha a edição; despesas pagas/adiantamentos já movimentaram
          // o caixa e só mudam ao redefinir o pagamento (senão o valor e o caixa ficariam divergentes)
          if (String(d.id || '') === `desp_prog_${atualizado.id}`) {
            return {
              ...d,
              data: atualizado.data,
              descricao: `[Pedido de Compra] ${atualizado.item_descricao} - ${parceiroNome}`,
              valor: atualizado.valor_total,
              forma_pagamento: atualizado.forma_pagamento
            };
          }
          return d;
        });
        localStorage.setItem('grupo_eno_financeiro_despesas_v1', JSON.stringify(despesasAtualizadas));
        window.dispatchEvent(new Event('financeiro_updated'));
      }
    } catch (err) {
      console.error(err);
    }

    setModalEditarPedido(false);
    setPedidoEditando(null);
    setMensagemSucesso('Pedido de compra e despesa programada atualizados com sucesso!');
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  const handleConfirmarPedido = (pedido: PedidoCompraGeral, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPedidoDefinirPagamento(pedido);
    setProdutoCompradoDef(pedido.item_descricao || '');
    setValorTotalDef(pedido.valor_total ? pedido.valor_total.toString() : '');
    setCategoriaDef(pedido.categoria || 'Embalagens');
    setFormaPagamentoDef(pedido.forma_pagamento || 'PIX');
    setDataPagamentoOuVencDef(new Date().toLocaleDateString('pt-BR'));
    setVencimentoSaldoDef(somarDias(hojeISO(), 30));
    setObsPagamentoDef('');
    setAnexoPagamentoDef(null);
  };

  const handleSalvarDefinicaoPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoDefinirPagamento) return;

    const ped = carregarPedidosCompra().find(p => p.id === pedidoDefinirPagamento.id);
    if (!ped) return;

    // Edições do modal (produto, valor, categoria) são gravadas no pedido
    const itemEfetivado = produtoCompradoDef.trim() || ped.item_descricao;
    const textoValor = valorTotalDef.trim();
    const valorLido = parseFloat(textoValor.includes(',') ? textoValor.replace(/\./g, '').replace(',', '.') : textoValor);
    const valTotal = !isNaN(valorLido) ? valorLido : ped.valor_total;
    if (!paraISO(dataPagamentoOuVencDef)) {
      alert('Informe uma data válida (DD/MM/AAAA).');
      return;
    }
    const valorAdiantado = parseFloat(valorAdiantadoDef.replace(',', '.')) || 0;
    if (tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL' && (valorAdiantado <= 0 || valorAdiantado > valTotal)) {
      alert('Informe um valor de adiantamento maior que zero e menor ou igual ao valor da compra.');
      return;
    }
    const temSaldo = tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL' && valTotal - valorAdiantado > 0.009;
    if (temSaldo && !paraISO(vencimentoSaldoDef)) {
      alert('Informe o vencimento do saldo restante.');
      return;
    }
    const dataVencimentoSaldo = temSaldo ? vencimentoSaldoDef : undefined;

    // Verifica se este pedido é de um cálculo na roça
    const calculos = carregarCalculosNaRoca();
    const calculoCorrespondente = calculos.find(c => c.pedido_compra_id === ped.id || c.id === ped.id);

    if (calculoCorrespondente) {
      const res = definirPagamentoCalculoRoca(
        calculoCorrespondente.id,
        {
          tipo: tipoPagamentoDef,
          forma_pagamento: formaPagamentoDef,
          data_pagamento_ou_vencimento: dataPagamentoOuVencDef,
          data_vencimento_saldo: dataVencimentoSaldo,
          valor_pago: tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL' ? valorAdiantado : valTotal,
          saldo_restante: tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL' ? Math.max(0, valTotal - valorAdiantado) : 0,
          conta_bancaria: contaBancariaDef,
          observacao: obsPagamentoDef
        },
        { item_descricao: itemEfetivado, valor_total: valTotal, categoria: categoriaDef }
      );
      if (!res.sucesso) {
        alert(res.mensagem); // ex.: sem saldo no caixa — mantém a janela aberta
        return;
      }
      let mensagem = res.mensagem;
      if (res.sucesso && anexoPagamentoDef) {
        const anexo = adicionarComprovante(calculoCorrespondente.id, anexoPagamentoDef);
        mensagem = anexo.sucesso ? `${mensagem} Comprovante anexado.` : `${mensagem} ATENÇÃO: ${anexo.mensagem}`;
        if (!anexo.sucesso) alert(anexo.mensagem);
      }
      setAnexoPagamentoDef(null);
      setMensagemSucesso(mensagem);
    } else {
      // Pedido comum (não-roça): mesmo núcleo idempotente (sem duplicar título/despesa/estoque)
      const res = efetivarPedidoCompra(ped.id, {
        tipo: tipoPagamentoDef,
        data: dataPagamentoOuVencDef,
        data_vencimento_saldo: dataVencimentoSaldo,
        forma_pagamento: formaPagamentoDef,
        item_descricao: itemEfetivado,
        valor_total: valTotal,
        categoria: categoriaDef,
        valor_pago: valorAdiantado,
        conta_bancaria: contaBancariaDef,
        observacao: obsPagamentoDef
      });
      if (!res.sucesso) {
        alert(res.mensagem); // ex.: sem saldo no caixa — mantém a janela aberta
        return;
      }
      setMensagemSucesso(res.mensagem);
    }

    setPedidos(carregarPedidosCompra());
    setPedidoDefinirPagamento(null);
    setTimeout(() => setMensagemSucesso(null), 6000);
  };

  const excluirPedido = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ped = pedidos.find(p => p.id === id);
    const avisoEstoque = ped?.entrada_estoque ? ' A entrada no estoque de matéria-prima também será estornada.' : '';
    if (window.confirm(`Deseja realmente excluir este pedido de compra? Os lançamentos vinculados no Financeiro serão removidos.${avisoEstoque}`)) {
      const calculo = carregarCalculosNaRoca().find(c => c.pedido_compra_id === id);
      if (calculo) {
        // Pedido gerado pelo Cálculo na Roça: exclui a pesagem junto (bloqueado se já houve pagamento)
        const res = excluirCalculoNaRoca(calculo.id);
        setPedidos(carregarPedidosCompra());
        if (!res.sucesso) alert(res.mensagem);
        setMensagemSucesso(res.mensagem);
        setTimeout(() => setMensagemSucesso(null), 5000);
        return;
      }
      excluirPedidoCompra(id);
      setPedidos(carregarPedidosCompra());
      setMensagemSucesso('Pedido de compra e lançamentos vinculados excluídos com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 5000);
    }
  };

  // Filtragem dos pedidos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(ped => {
      const termo = busca.toLowerCase();
      const matchBusca = 
        (ped.agricultor_nome && ped.agricultor_nome.toLowerCase().includes(termo)) ||
        (ped.agricultor_propriedade && ped.agricultor_propriedade.toLowerCase().includes(termo)) ||
        (ped.fornecedor_nome && ped.fornecedor_nome.toLowerCase().includes(termo)) ||
        (ped.fornecedor_fantasia && ped.fornecedor_fantasia.toLowerCase().includes(termo)) ||
        ped.item_descricao.toLowerCase().includes(termo) ||
        (ped.fornecedor_cnpj && ped.fornecedor_cnpj.includes(termo)) ||
        (ped.agricultor_cpf_cnpj && ped.agricultor_cpf_cnpj.includes(termo));

      // Filtro Status
      let matchStatus = true;
      if (filtroStatus === 'A_CONFIRMAR') {
        matchStatus = ped.status_pedido === 'A Confirmar';
      } else if (filtroStatus === 'CONFIRMADOS') {
        matchStatus = ped.status_pedido === 'Confirmado';
      } else if (filtroStatus === 'PAGOS') {
        matchStatus = ped.status_pedido === 'Pago';
      } else if (filtroStatus === 'A_PAGAR') {
        matchStatus = ped.status_pedido === 'Entregue (A Pagar)';
      } else if (filtroStatus === 'PROGRAMADO') {
        matchStatus = ped.status_pedido === 'Programado' || ped.status_pedido === 'A Confirmar' || ped.status_pedido === 'Orçamento';
      } else if (filtroStatus === 'ORCAMENTO') {
        matchStatus = ped.status_pedido === 'Orçamento';
      }

      // Filtro Categoria
      const matchCategoria = filtroCategoria === 'TODAS' || ped.categoria === filtroCategoria;

      // Filtro Parceiro
      const matchParceiro = filtroParceiro === 'TODOS' || ped.tipo_parceiro === filtroParceiro;

      return matchBusca && matchStatus && matchCategoria && matchParceiro;
    });
  }, [pedidos, busca, filtroStatus, filtroCategoria, filtroParceiro]);

  // Métricas
  const totalGeralCompras = useMemo(() => {
    return pedidos.reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [pedidos]);

  const totalProgramadas = useMemo(() => {
    return pedidos
      .filter(p => p.status_pedido === 'Programado' || p.status_pedido === 'A Confirmar' || p.status_pedido === 'Orçamento')
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [pedidos]);

  const qtdProgramadas = useMemo(() => {
    return pedidos.filter(p => p.status_pedido === 'Programado' || p.status_pedido === 'A Confirmar' || p.status_pedido === 'Orçamento').length;
  }, [pedidos]);

  const totalPagos = useMemo(() => {
    return pedidos
      .filter(p => p.status_pedido === 'Pago')
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [pedidos]);

  const totalAPagar = useMemo(() => {
    return pedidos
      .filter(p => p.status_pedido === 'Entregue (A Pagar)')
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [pedidos]);

  const totalProgramadoOrcamento = useMemo(() => {
    return pedidos
      .filter(p => p.status_pedido === 'Programado' || p.status_pedido === 'Orçamento')
      .reduce((acc, curr) => acc + curr.valor_total, 0);
  }, [pedidos]);

  // Função definitiva para gerar e baixar PDF idêntico ao visualizador na tela
  const gerarEBaixarPDF = (pedido: PedidoCompraGeral) => {
    try {
      setGerandoPdf(true);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const isAgro = pedido.tipo_parceiro === 'AGRICULTOR';
      const nome = isAgro ? pedido.agricultor_nome : pedido.fornecedor_nome;
      const cpfCnpj = isAgro ? pedido.agricultor_cpf_cnpj : pedido.fornecedor_cnpj;
      const cidade = isAgro ? pedido.agricultor_cidade_uf : pedido.fornecedor_cidade_uf;
      const pix = isAgro ? pedido.agricultor_chave_pix : pedido.fornecedor_chave_pix;
      
      // 1. CABEÇALHO DO GRUPO ENO
      try {
        pdf.addImage(EMPRESA.logo, 'PNG', 15, 14.5, 12.5, 12.5);
      } catch {
        pdf.setFillColor(6, 78, 59);
        pdf.roundedRect(15, 15, 12, 12, 1.5, 1.5, 'F');
      }
      pdf.setFont('helvetica', 'bold');
      
      pdf.setFontSize(13);
      pdf.setTextColor(6, 78, 59);
      pdf.text(EMPRESA.nome, 30, 20);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(EMPRESA.razao, 30, 24.5);
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`CNPJ: ${EMPRESA.cnpj}  |  ${EMPRESA.endereco}`, 30, 28.5);
      pdf.text(`Tel: ${EMPRESA.telefone}  |  ${EMPRESA.email}`, 30, 32.5);
      
      // Badge PEDIDO DE COMPRA
      pdf.setFillColor(6, 78, 59);
      pdf.roundedRect(145, 15, 50, 7, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('PEDIDO DE COMPRA', 170, 19.8, { align: 'center' });
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59);
      pdf.text(`Data: ${formatarDataBR(pedido.data)}`, 195, 27, { align: 'right' });
      
      // Linha divisória
      pdf.setDrawColor(6, 78, 59);
      pdf.setLineWidth(0.6);
      pdf.line(15, 36, 195, 36);
      
      // 2. DADOS DO FORNECEDOR / PRODUTOR RURAL
      const boxY = 42;
      const boxHeight = pix ? 34 : 26;
      
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(15, boxY, 180, boxHeight, 1.5, 1.5, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(6, 78, 59);
      pdf.text(isAgro ? 'DADOS DO PRODUTOR RURAL' : 'DADOS DO FORNECEDOR', 19, boxY + 5.5);
      
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(19, boxY + 7.5, 191, boxY + 7.5);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Nome:', 19, boxY + 13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(nome || '-', 31, boxY + 13);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('CPF / CNPJ:', 110, boxY + 13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(cpfCnpj || '-', 130, boxY + 13);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Cidade:', 19, boxY + 19);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(cidade || '-', 31, boxY + 19);
      
      if (isAgro && pedido.agricultor_propriedade) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('Propriedade:', 110, boxY + 19);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(pedido.agricultor_propriedade, 130, boxY + 19);
      }
      
      if (pix) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('Chave PIX:', 19, boxY + 26);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(6, 78, 59);
        pdf.text(pix, 36, boxY + 26);
      }
      
      // 3. TABELA DE PRODUTO E VALORES
      const tableY = boxY + boxHeight + 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text('PRODUTO E VALORES', 15, tableY);
      
      // Cabeçalho da tabela
      const thY = tableY + 3;
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.3);
      pdf.rect(15, thY, 180, 7, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text('PRODUTO / DESCRIÇÃO', 18, thY + 4.8);
      pdf.text('QUANTIDADE', 125, thY + 4.8, { align: 'right' });
      pdf.text('VALOR UNITÁRIO', 158, thY + 4.8, { align: 'right' });
      pdf.text('VALOR TOTAL', 191, thY + 4.8, { align: 'right' });
      
      // Quebra e cálculo de altura dinâmico para a descrição (sem sobreposição!)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      const descLines = pdf.splitTextToSize(pedido.item_descricao || '', 78);
      const rowHeight = Math.max(10, descLines.length * 4.2 + 4);
      
      const rowY = thY + 7;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(15, rowY, 180, rowHeight, 'FD');
      
      // Texto da descrição multilinha
      pdf.setTextColor(15, 23, 42);
      pdf.text(descLines, 18, rowY + 5);
      
      // Colunas numéricas fixas
      const numMidY = rowY + 5.5;
      pdf.text(`${pedido.quantidade.toLocaleString('pt-BR')} ${pedido.unidade_medida}`, 125, numMidY, { align: 'right' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(`R$ ${pedido.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 158, numMidY, { align: 'right' });
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`R$ ${pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 191, numMidY, { align: 'right' });
      
      // 4. DESTAQUE TOTAL A PAGAR
      const totalY = rowY + rowHeight + 6;
      pdf.setFillColor(236, 253, 245);
      pdf.setDrawColor(110, 231, 183);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(15, totalY, 180, 12, 1.5, 1.5, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(6, 78, 59);
      pdf.text('TOTAL A PAGAR:', 20, totalY + 7.5);
      
      pdf.setFontSize(13);
      pdf.text(`R$ ${pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, totalY + 8, { align: 'right' });
      
      // 5. ASSINATURAS
      const signY = totalY + 45;
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.3);
      pdf.line(25, signY, 90, signY);
      pdf.line(120, signY, 185, signY);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(EMPRESA.razao, 57.5, signY + 5, { align: 'center' });
      pdf.text(nome || 'Fornecedor', 152.5, signY + 5, { align: 'center' });
      
      // Processo de Download Seguro para qualquer navegador e iframe
      const cleanName = (nome || 'Pedido').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Pedido_Compra_${cleanName}_${pedido.data.replace(/\//g, '-')}.pdf`;
      
      try {
        const blob = pdf.output('blob');
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          window.URL.revokeObjectURL(blobUrl);
        }, 1500);
      } catch (dlErr) {
        console.warn('Fallback para pdf.save direct:', dlErr);
        pdf.save(fileName);
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGerandoPdf(false);
    }
  };

  // Função para acionar impressão A4
  const imprimirA4 = () => {
    window.print();
  };

  const abrirNovoPedido = () => {
    // Inicializar defaults com status Programado
    setTipoParceiroForm('FORNECEDOR');
    setCategoriaForm('Embalagens');
    setItemDescricaoForm('');
    setUnidadeMedidaForm('Unidades');
    setQuantidadeForm('1');
    setValorUnitarioForm('');
    setValorTotalForm('');
    setStatusPedidoForm('Programado');
    setModalNovoPedido(true);
  };

  const reais = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const qtdPagos = pedidos.filter(p => p.status_pedido === 'Pago').length;
  const qtdAPagar = pedidos.filter(p => p.status_pedido === 'Entregue (A Pagar)').length;
  const qtdAConfirmar = pedidos.filter(p => p.status_pedido === 'A Confirmar').length;
  const nomeParceiro = (p: PedidoCompraGeral) =>
    p.tipo_parceiro === 'AGRICULTOR' ? p.agricultor_nome : p.fornecedor_fantasia || p.fornecedor_nome;
  const veioDaRoca = (p: PedidoCompraGeral) =>
    p.id.startsWith('ped_roca_') || (!!p.observacoes && p.observacoes.includes('Cálculo na Roça')) || p.item_descricao.toLowerCase().includes('roça');

  // Situação + ação de pagamento (mesma regra de antes; só a apresentação mudou)
  const situacaoCompra = (pedido: PedidoCompraGeral, grande = false) => {
    const tam = grande ? 'h-10 px-3 text-[12.5px] w-full justify-center' : 'h-7 px-2.5 text-[12px]';
    if (pedido.status_pedido === 'Programado' || pedido.status_pedido === 'A Confirmar' || pedido.status_pedido === 'Orçamento') {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleConfirmarPedido(pedido, e); }}
          className={`inline-flex items-center gap-1 rounded-[5px] bg-eno-800 hover:bg-eno-900 text-white font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${tam}`}
          title="Transformar este pedido de compra em despesa financeira"
        >
          <ArrowRightCircle className="w-3.5 h-3.5" />
          Virar despesa
        </button>
      );
    }
    const pago = pedido.status_pedido === 'Pago' || pedido.status_pedido === 'Confirmado';
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleConfirmarPedido(pedido, e); }}
        className={`inline-flex items-center gap-1 rounded-[5px] font-semibold cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ouro ${
          pago ? 'bg-st-pago-bg text-st-pago' : 'bg-st-aguardando-bg text-st-aguardando'
        } ${tam}`}
        title={pago ? 'Ver ou alterar a situação do pagamento' : 'Registrar a quitação'}
      >
        {pago ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        {pago ? 'Comprado / pago' : 'Entregue · a pagar'}
      </button>
    );
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      <div className="mx-auto w-full max-w-[1700px] shrink-0">
        <CabecalhoPagina
          titulo="Pedidos de compra"
          resumo={
            pedidos.length === 0 ? (
              'Nenhum pedido de compra cadastrado.'
            ) : (
              <>
                {pedidos.length} pedidos · {reais(totalGeralCompras)} · {qtdProgramadas} programados ({reais(totalProgramadas)})
                {qtdAPagar > 0 && <span className="text-st-aguardando font-semibold"> · {reais(totalAPagar)} a pagar</span>}
              </>
            )
          }
          acoes={
            pedidos.length > 0 ? (
              <BotaoPrimario onClick={abrirNovoPedido} className="w-full sm:w-auto h-10 sm:h-9">
                <Plus className="w-4 h-4" />
                Novo pedido de compra
              </BotaoPrimario>
            ) : undefined
          }
        />

        {mensagemSucesso && (
          <div className="mx-4 sm:mx-6 mb-3 pl-3 pr-1 py-1 rounded-md bg-st-pago-bg flex items-center justify-between gap-2 text-[12.5px] text-st-pago font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
            <button
              onClick={() => setMensagemSucesso(null)}
              className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-md hover:bg-st-pago/10 cursor-pointer"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {qtdAConfirmar > 0 && !mensagemSucesso && (
          <div className="mx-4 sm:mx-6 mb-3 px-3 py-2.5 rounded-md bg-st-aguardando-bg flex items-start gap-2 text-[12.5px] text-st-aguardando">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>
              <strong>{qtdAConfirmar} {qtdAConfirmar === 1 ? 'pedido aguarda' : 'pedidos aguardam'} definição de pagamento</strong> (inclui compras do Cálculo na roça). Use <strong>Virar despesa</strong> para dizer se já pagou ou se é a pagar.
            </span>
          </div>
        )}

        <BarraFiltros>
          <Segmentado<typeof filtroStatus>
            rotuloAria="Situação da compra"
            valor={filtroStatus}
            onChange={setFiltroStatus}
            className="w-full md:w-fit [&>button]:h-9 sm:[&>button]:h-7"
            opcoes={[
              { valor: 'TODOS', rotulo: 'Todos', contagem: pedidos.length },
              { valor: 'PROGRAMADO', rotulo: 'Programados', contagem: qtdProgramadas },
              { valor: 'A_PAGAR', rotulo: 'A pagar', contagem: qtdAPagar },
              { valor: 'PAGOS', rotulo: 'Pagos', contagem: qtdPagos },
              { valor: 'ORCAMENTO', rotulo: 'Orçamento', contagem: pedidos.filter(p => p.status_pedido === 'Orçamento').length },
            ]}
          />
          <div className="flex items-center gap-2 w-full md:w-auto">
            <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produtor, fornecedor, item ou CNPJ" className="flex-1 md:flex-none md:w-72" />
            <SeletorFiltro value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} aria-label="Categoria" className="max-w-[44%] md:max-w-none">
              <option value="TODAS">Todas as categorias</option>
              <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
              <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
              <option value="Embalagens">Embalagens</option>
              <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
              <option value="Manutenção & Peças">Manutenção & Peças</option>
              <option value="Químicos & Laboratório">Químicos & Laboratório</option>
              <option value="Limpeza & Escritório">Limpeza & Escritório</option>
              <option value="Outros">Outros</option>
            </SeletorFiltro>
          </div>
        </BarraFiltros>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              <EstadoVazio
                titulo={pedidos.length === 0 ? 'Nenhum pedido de compra' : 'Nada encontrado'}
                texto={
                  pedidos.length === 0
                    ? 'Registre o que a fábrica precisa comprar (mandioca, embalagens, insumos). Ao virar despesa, o pedido vai para o financeiro.'
                    : 'Troque a situação, a categoria ou limpe a busca.'
                }
                acao={pedidos.length === 0 ? <BotaoPrimario onClick={abrirNovoPedido}><Plus className="w-4 h-4" />Novo pedido de compra</BotaoPrimario> : undefined}
              />
            </div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {pedidosFiltrados.map(pedido => (
                  <li key={pedido.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                    <button type="button" onClick={() => setPedidoVisualizarA4(pedido)} className="w-full text-left">
                      <div className="text-[11.5px] text-cinza tabular-nums truncate">
                        {formatarDataBR(pedido.data)} · {pedido.categoria.split('/')[0].trim()}{veioDaRoca(pedido) ? ' · Cálculo na roça' : ''}
                      </div>
                      <div className="text-[14px] font-bold text-tinta truncate">{nomeParceiro(pedido)}</div>
                      <div className="text-[12px] text-tinta-2 line-clamp-2">{pedido.item_descricao}</div>
                      <div className="flex items-end justify-end mt-1.5">
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{reais(pedido.valor_total)}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="flex-1 min-w-0">{situacaoCompra(pedido, true)}</div>
                      <button
                        type="button"
                        onClick={(e) => abrirEdicaoPedido(pedido, e)}
                        className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-md border border-linha-forte text-tinta-2"
                        aria-label="Editar pedido de compra"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => gerarEBaixarPDF(pedido)}
                        className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-md border border-linha-forte text-tinta-2"
                        aria-label="Baixar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => excluirPedido(pedido.id, e)}
                        className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-md border border-linha-forte text-cinza active:bg-st-vencido-bg active:text-st-vencido"
                        aria-label="Excluir pedido de compra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* A partir de sm: tabela densa */}
              <TabelaDados className="hidden sm:block">
                <thead className={tabela.thead}>
                  <tr>
                    <Th>Data</Th>
                    <Th>Fornecedor / produtor</Th>
                    <Th>Categoria</Th>
                    <Th>Item</Th>
                    <Th numero>Valor</Th>
                    <Th>Situação</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(pedido => (
                    <tr key={pedido.id} onClick={() => setPedidoVisualizarA4(pedido)} className={`${tabela.tr} cursor-pointer group`}>
                      <Td className="tabular-nums whitespace-nowrap">{formatarDataBR(pedido.data)}</Td>
                      <Td className="max-w-[280px]">
                        <div className="font-semibold text-tinta truncate group-hover:text-eno-700">{nomeParceiro(pedido)}</div>
                        {pedido.tipo_parceiro === 'AGRICULTOR' ? (
                          <div className="flex items-center gap-1.5 text-[11.5px] text-cinza min-w-0">
                            <span className="truncate">{pedido.agricultor_propriedade || 'Produtor rural'}</span>
                            {pedido.agricultor_chave_pix && (
                              <button
                                type="button"
                                onClick={(e) => copiarChavePix(pedido.agricultor_chave_pix || '', pedido.id, e)}
                                className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer"
                                title="Copiar chave PIX do produtor"
                              >
                                {copiadoId === pedido.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                PIX
                              </button>
                            )}
                          </div>
                        ) : (
                          pedido.fornecedor_cnpj && <div className="text-[11.5px] text-cinza tabular-nums truncate">CNPJ {pedido.fornecedor_cnpj}</div>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-tinta-2">{pedido.categoria.split('/')[0].trim()}</Td>
                      <Td className="max-w-[300px]">
                        <div className="text-tinta line-clamp-2" title={pedido.item_descricao}>{pedido.item_descricao}</div>
                        {veioDaRoca(pedido) && <div className="text-[11px] text-cinza">Cálculo na roça</div>}
                      </Td>
                      <Td numero>
                        <span className="font-bold text-tinta text-[13.5px]">{reais(pedido.valor_total)}</span>
                      </Td>
                      <Td className="whitespace-nowrap">{situacaoCompra(pedido)}</Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setPedidoVisualizarA4(pedido)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-[5px] text-tinta-2 hover:bg-papel-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            title="Ver e imprimir a folha A4"
                            aria-label="Ver folha A4"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => abrirEdicaoPedido(pedido, e)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-[5px] text-tinta-2 hover:bg-papel-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            title="Editar (altera também a despesa programada)"
                            aria-label="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => gerarEBaixarPDF(pedido)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-[5px] text-tinta-2 hover:bg-papel-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            title="Baixar em PDF"
                            aria-label="Baixar PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => excluirPedido(pedido.id, e)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-[5px] text-cinza-claro hover:bg-st-vencido-bg hover:text-st-vencido transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            title="Excluir (some também da despesa programada)"
                            aria-label="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TabelaDados>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: NOVO PEDIDO DE COMPRA (SIMPLES: FORNECEDOR, DATA, VALOR, DESCRIÇÃO) */}
      {/* ========================================================= */}
      {modalNovoPedido && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-papel rounded-none sm:rounded-md border-0 sm:border border-linha shadow-2xl max-w-2xl sm:max-w-3xl w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)] flex flex-col sm:my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Topo do Modal */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-linha bg-papel-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-eno-800 text-white rounded-md shadow-xs">
                  <Package className="w-5 h-5 text-ouro-claro" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-tinta">
                    Novo Pedido de Compra / Programação
                  </h3>
                  <p className="text-xs text-cinza">
                    Preencha o fornecedor, data, valor e a descrição da compra necessária
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoPedido(false)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md text-cinza hover:text-tinta-2 hover:bg-linha/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DO TIPO DE PARCEIRO: FORNECEDOR vs PRODUTOR RURAL */}
            <div className="px-6 pt-3 pb-2 border-b border-linha bg-papel-2/50">
              <div className="grid grid-cols-2 gap-2 p-1 bg-linha/70 rounded-md max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setTipoParceiroForm('FORNECEDOR');
                  }}
                  className={`py-2 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tipoParceiroForm === 'FORNECEDOR'
                      ? 'bg-eno-800 text-white shadow-sm'
                      : 'text-tinta-2 hover:text-tinta'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Fornecedor Cadastrado</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoParceiroForm('AGRICULTOR');
                  }}
                  className={`py-2 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tipoParceiroForm === 'AGRICULTOR'
                      ? 'bg-eno-800 text-white shadow-sm'
                      : 'text-tinta-2 hover:text-tinta'
                  }`}
                >
                  <Tractor className="w-4 h-4" />
                  <span>Produtor Rural / Mandioca</span>
                </button>
              </div>
            </div>

            {/* FORMULÁRIO ENXUTO E DIRETO */}
            <form onSubmit={salvarNovoPedido} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* 1. SELEÇÃO DO FORNECEDOR OU PRODUTOR */}
              <div>
                <label className="block text-xs font-bold text-tinta-2 mb-1">
                  {tipoParceiroForm === 'AGRICULTOR' ? 'Produtor Rural / Mandioca' : 'Fornecedor'} <span className="text-st-vencido">*</span>
                </label>

                {tipoParceiroForm === 'AGRICULTOR' ? (
                  <select
                    required
                    value={agricultorIdForm}
                    onChange={(e) => setAgricultorIdForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    {agricultores.map(agr => (
                      <option key={agr.id} value={agr.id}>
                        {agr.nome_completo} — {agr.nome_propriedade} ({agr.endereco.municipio}/{agr.endereco.uf})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={fornecedorIdForm}
                    onChange={(e) => setFornecedorIdForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    {fornecedores.map(forn => (
                      <option key={forn.id} value={forn.id}>
                        {forn.fantasia ? `${forn.fantasia} (${forn.razao_nome})` : forn.razao_nome} — CNPJ: {forn.cpf_cnpj}
                      </option>
                    ))}
                  </select>
                )}

                {/* Card do parceiro selecionado */}
                {tipoParceiroForm === 'AGRICULTOR' && agricultorAtualForm && (
                  <div className="mt-2 p-2.5 rounded-md bg-eno-50 border border-eno-100 text-xs flex items-center justify-between">
                    <span className="font-bold text-eno-800 flex items-center gap-1.5">
                      <Sprout className="w-3.5 h-3.5 text-eno-700" />
                      {agricultorAtualForm.nome_propriedade} ({agricultorAtualForm.endereco.municipio}/{agricultorAtualForm.endereco.uf})
                    </span>
                    <span className="tabular-nums text-eno-800 font-semibold">
                      CPF: {agricultorAtualForm.cpf_cnpj}
                    </span>
                  </div>
                )}

                {tipoParceiroForm === 'FORNECEDOR' && fornecedorAtualForm && (
                  <div className="mt-2 p-2.5 rounded-md bg-st-producao-bg border border-st-producao/30 text-xs flex items-center justify-between">
                    <span className="font-bold text-st-producao flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-st-producao" />
                      {fornecedorAtualForm.razao_nome}
                    </span>
                    <span className="tabular-nums text-st-producao font-semibold">
                      CNPJ: {fornecedorAtualForm.cpf_cnpj}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. GRID: DATA DO PEDIDO / PREVISTA + VALOR PREVISTO (R$) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Data da Compra / Prevista <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dataForm}
                    onChange={(e) => setDataForm(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Valor Estimado / Total (R$) <span className="text-st-vencido">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs sm:text-sm font-bold text-cinza">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={valorTotalForm}
                      onChange={(e) => {
                        setValorTotalForm(e.target.value);
                        const q = lerNumeroBR(quantidadeForm);
                        const t = lerNumeroBR(e.target.value);
                        if (q > 0 && t > 0) setValorUnitarioForm(formatarDecimalBR(t / q, 4));
                      }}
                      placeholder="Ex: 1.500,00"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-extrabold tabular-nums text-tinta focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                    />
                  </div>
                </div>
              </div>

              {/* 2b. QUANTIDADE + UNIDADE + VALOR UNITÁRIO (total calculado) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Quantidade <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={quantidadeForm}
                    onChange={(e) => {
                      setQuantidadeForm(e.target.value);
                      const q = lerNumeroBR(e.target.value);
                      const u = lerNumeroBR(valorUnitarioForm);
                      if (q > 0 && u > 0) setValorTotalForm(formatarDecimalBR(q * u, 2));
                    }}
                    placeholder="Ex: 1.000"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-bold tabular-nums text-tinta focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Unidade <span className="text-st-vencido">*</span>
                  </label>
                  <select
                    value={unidadeMedidaForm}
                    onChange={(e) => setUnidadeMedidaForm(e.target.value as PedidoCompraGeral['unidade_medida'])}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    {UNIDADES_PEDIDO_COMPRA.map(u => (
                      <option key={u.valor} value={u.valor}>{u.rotulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">Valor Unitário (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorUnitarioForm}
                    onChange={(e) => {
                      setValorUnitarioForm(e.target.value);
                      const q = lerNumeroBR(quantidadeForm);
                      const u = lerNumeroBR(e.target.value);
                      if (q > 0 && u > 0) setValorTotalForm(formatarDecimalBR(q * u, 2));
                    }}
                    placeholder="Ex: 1,50"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-bold tabular-nums text-tinta focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>
              </div>

              {/* 3. DESCRIÇÃO DO ITEM / O QUE PRECISAMOS COMPRAR */}
              <div>
                <label className="block text-xs font-bold text-tinta-2 mb-1">
                  Descrição do Pedido / O que precisamos comprar <span className="text-st-vencido">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={itemDescricaoForm}
                  onChange={(e) => setItemDescricaoForm(e.target.value)}
                  placeholder="Ex: Precisamos de 10.000 sacarias plásticas de 1kg para empacotamento de farinha fina, compra de correia B-85 para o picador..."
                  className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 resize-none"
                />
              </div>

              {/* 4. DICA VISUAL SOBRE EFETIVAÇÃO */}
              <div className="p-3.5 rounded-md bg-st-aguardando-bg/80 border border-ouro-claro/60 text-xs text-st-aguardando space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-st-aguardando" />
                  <span>Programação Rápida de Compra</span>
                </div>
                <p className="text-[11px] text-st-aguardando leading-relaxed">
                  Este pedido ficará guardado como lembrete de compra e constará em <strong>Despesas Programadas</strong>.
                  Quando a compra for realizada, clique no botão <strong>Finalizar Compra</strong> na tabela para definir a <strong>Categoria</strong> contábil (Embalagens, Manutenção, etc.) e a <strong>Forma de Pagamento (PIX / Dinheiro)</strong>.
                </p>
              </div>

              {/* BOTÕES SALVAR / CANCELAR */}
              <div className="pt-4 border-t border-linha flex items-center justify-end gap-3 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setModalNovoPedido(false)}
                  className="px-5 py-2.5 rounded-md border border-linha-forte text-xs font-bold text-tinta-2 hover:bg-papel-3/60 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    flex items-center gap-2 px-6 py-2.5 rounded-md
                    bg-eno-800 hover:bg-eno-900 active:bg-eno-950
                    text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
                    transition-all cursor-pointer
                  "
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Gravar Pedido de Compra</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE EDIÇÃO COMPLETA: EDITAR PEDIDO DE COMPRA         */}
      {/* ========================================================= */}
      {modalEditarPedido && pedidoEditando && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-papel rounded-none sm:rounded-md border-0 sm:border border-linha shadow-2xl max-w-5xl lg:max-w-6xl w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)] flex flex-col sm:my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Topo do Modal de Edição */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-linha bg-papel-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-st-producao text-white rounded-md">
                  <Pencil className="w-5 h-5 text-st-producao-bg" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-tinta">
                    Editar Pedido de Compra / Programação
                  </h3>
                  <p className="text-xs text-cinza">As alterações serão sincronizadas diretamente na despesa programada vinculada</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalEditarPedido(false);
                  setPedidoEditando(null);
                }}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md text-cinza hover:text-tinta-2 hover:bg-linha/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DO TIPO DE PARCEIRO NA EDIÇÃO */}
            <div className="px-6 pt-3 pb-2 border-b border-linha bg-papel">
              <div className="grid grid-cols-2 gap-2 p-1 bg-papel-3/60 rounded-md max-w-md">
                <button
                  type="button"
                  onClick={() => setEditTipoParceiro('AGRICULTOR')}
                  className={`py-2 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    editTipoParceiro === 'AGRICULTOR'
                      ? 'bg-eno-800 text-white shadow-sm'
                      : 'text-tinta-2 hover:text-tinta'
                  }`}
                >
                  <Tractor className="w-4 h-4" />
                  <span>Produtor Rural / Agricultor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditTipoParceiro('FORNECEDOR')}
                  className={`py-2 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    editTipoParceiro === 'FORNECEDOR'
                      ? 'bg-eno-800 text-white shadow-sm'
                      : 'text-tinta-2 hover:text-tinta'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Fornecedor Cadastrado</span>
                </button>
              </div>
            </div>

            {/* FORMULÁRIO DE EDIÇÃO */}
            <form onSubmit={salvarEdicaoPedido} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* LINHA 1: PARCEIRO CADASTRADO (2 COLS) + CATEGORIA (1 COL) + DATA (1 COL) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    {editTipoParceiro === 'AGRICULTOR' ? 'Produtor Rural / Agricultor' : 'Fornecedor Cadastrado'} <span className="text-st-vencido">*</span>
                  </label>

                  {editTipoParceiro === 'AGRICULTOR' ? (
                    <select
                      required
                      value={editParceiroId}
                      onChange={(e) => setEditParceiroId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                    >
                      {agricultores.map(agr => (
                        <option key={agr.id} value={agr.id}>
                          {agr.nome_completo} — {agr.nome_propriedade} ({agr.endereco.municipio}/{agr.endereco.uf})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      value={editParceiroId}
                      onChange={(e) => setEditParceiroId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                    >
                      {fornecedores.map(forn => (
                        <option key={forn.id} value={forn.id}>
                          {forn.fantasia ? `${forn.fantasia} (${forn.razao_nome})` : forn.razao_nome} — CNPJ: {forn.cpf_cnpj}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Categoria da Compra <span className="text-st-vencido">*</span>
                  </label>
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value as CategoriaCompra)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                    <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
                    <option value="Manutenção & Peças">Manutenção & Peças</option>
                    <option value="Químicos & Laboratório">Químicos & Laboratório</option>
                    <option value="Insumos Agrícolas">Insumos Agrícolas</option>
                    <option value="Limpeza & Escritório">Limpeza & Escritório</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Data da Compra / Previsão <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>
              </div>

              {/* LINHA 2: SOLICITANTE + LOCAL + DESCRIÇÃO DO ITEM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Solicitante / Comprador <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCompradorNome}
                    onChange={(e) => setEditCompradorNome(e.target.value)}
                    placeholder="Ex: Almoxarifado, Gerência..."
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Local da Compra
                  </label>
                  <input
                    type="text"
                    value={editLocalCompra}
                    onChange={(e) => setEditLocalCompra(e.target.value)}
                    placeholder="Ex: Fornecedor, Fábrica..."
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Descrição do Item / Produto Necessário <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemDescricao}
                    onChange={(e) => setEditItemDescricao(e.target.value)}
                    placeholder="Ex: Sacaria de Ráfia Valvulada 50kg Personalizada Grupo ENO..."
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 font-bold text-tinta"
                  />
                </div>
              </div>

              {/* LINHA 3: QUANTIDADE, UNIDADE, VALOR UNITÁRIO E TOTAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Quantidade <span className="text-st-vencido">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editQuantidade}
                    onChange={(e) => setEditQuantidade(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-bold tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Unidade de Medida <span className="text-st-vencido">*</span>
                  </label>
                  <select
                    value={editUnidadeMedida}
                    onChange={(e) => setEditUnidadeMedida(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    <option value="KG">KG (Quilogramas)</option>
                    <option value="Unidades">Unidades (UN)</option>
                    <option value="Sacos">Sacos (SC)</option>
                    <option value="Litros">Litros (L)</option>
                    <option value="Caixas">Caixas (CX)</option>
                    <option value="Fardos">Fardos (FD)</option>
                    <option value="Pacotes">Pacotes (PCT)</option>
                    <option value="Toneladas">Toneladas (TON)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Valor Unitário (R$) <span className="text-st-vencido">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-cinza">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editValorUnitario}
                      onChange={(e) => setEditValorUnitario(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-bold tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                    />
                  </div>
                </div>

                {/* CARD VALOR TOTAL RECALCULADO */}
                <div className="p-3 rounded-md bg-st-producao text-white flex flex-col justify-center shadow-inner h-[62px]">
                  <span className="text-[10px] text-st-producao-bg font-bold block uppercase tracking-wider">
                    Total Calculado
                  </span>
                  <span className="text-base sm:text-lg font-extrabold tabular-nums text-white truncate">
                    R$ {(lerNumeroBR(editQuantidade) * lerNumeroBR(editValorUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* LINHA 4: STATUS, FORMA DE PAGAMENTO E OBSERVAÇÕES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Status do Pedido <span className="text-st-vencido">*</span>
                  </label>
                  <select
                    value={editStatusPedido}
                    onChange={(e) => setEditStatusPedido(e.target.value as StatusPedidoCompra)}
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-bold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    <option value="Programado">Programado (A Lembrar / Comprar)</option>
                    <option value="Pago">Pago / Finalizado</option>
                    <option value="Entregue (A Pagar)">Entregue (A Pagar)</option>
                    <option value="Orçamento">Orçamento</option>
                    <option value="A Confirmar">A Confirmar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={editFormaPagamento}
                    onChange={(e) => setEditFormaPagamento(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-semibold focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20 bg-papel"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência TED">Transferência TED</option>
                    <option value="À Vista Dinheiro">À Vista Dinheiro</option>
                    <option value="Cartão Corporativo">Cartão Corporativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    placeholder="Ex: Entrega na fábrica, prazo..."
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-700/20"
                  />
                </div>
              </div>

              {/* BOTOES SALVAR / CANCELAR */}
              <div className="pt-4 border-t border-linha flex items-center justify-end gap-3 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarPedido(false);
                    setPedidoEditando(null);
                  }}
                  className="px-5 py-2.5 rounded-md border border-linha-forte text-xs font-bold text-tinta-2 hover:bg-papel-3/60 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    flex items-center gap-2 px-6 py-2.5 rounded-md
                    bg-st-producao hover:bg-st-producao active:bg-st-producao
                    text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
                    transition-all cursor-pointer
                  "
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações (Atualiza Pedido e Despesa)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: VISUALIZAR FOLHA A4 PERSONALIZADA GRUPO ENO      */}
      {/* ========================================================= */}
      {pedidoVisualizarA4 && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-eno-900 rounded-none sm:rounded-md border-0 sm:border border-eno-800 shadow-2xl max-w-5xl lg:max-w-6xl w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)] flex flex-col sm:my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Barra Superior de Ações */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-eno-800 bg-eno-800 text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-eno-700 text-white font-extrabold flex items-center justify-center text-xs">
                  ENO
                </div>
                <h3 className="font-bold text-sm text-eno-50">
                  Folha A4 — Pedido de Compra
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão Baixar PDF */}
                <button
                  onClick={() => pedidoVisualizarA4 && gerarEBaixarPDF(pedidoVisualizarA4)}
                  disabled={gerandoPdf}
                  className="
                    flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg
                    bg-eno-600 hover:bg-eno-600 disabled:opacity-50 text-white font-bold text-xs
                    shadow-sm transition-all cursor-pointer
                  "
                  title="Baixar arquivo PDF"
                >
                  {gerandoPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{gerandoPdf ? 'Baixando...' : 'Baixar PDF'}</span>
                </button>

                {/* Botão Imprimir */}
                <button
                  onClick={imprimirA4}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    bg-eno-800 hover:bg-cinza text-white font-bold text-xs
                    shadow-sm transition-all cursor-pointer
                  "
                  title="Imprimir folha A4"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>

                {/* Botão Fechar */}
                <button
                  onClick={() => setPedidoVisualizarA4(null)}
                  className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md text-eno-100 hover:text-white hover:bg-eno-800 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ÁREA DE VISUALIZAÇÃO A4 ENQUADRADA SEM ROLAGEM */}
            <div className="flex-1 p-2 sm:p-3 bg-eno-900 flex items-center justify-center overflow-hidden">
              
              <div 
                id="folha-a4-documento"
                className="
                  bg-papel text-tinta p-5 sm:p-6 rounded-sm shadow-2xl border border-linha-forte
                  flex flex-col justify-between text-xs select-text font-sans
                  h-full max-h-[calc(100vh-215px)] aspect-[210/297] box-border
                "
              >
                
                {/* 1. CABEÇALHO DA EMPRESA & DATA */}
                <div className="flex items-start justify-between border-b-2 border-eno-700 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <img src={EMPRESA.logo} alt="" className="w-7 h-7 object-contain" />
                      <h1 className="text-sm font-extrabold text-eno-800 tracking-tight uppercase">
                        {EMPRESA.nome}
                      </h1>
                    </div>
                    <div className="text-[10px] text-tinta-2 font-medium">
                      {EMPRESA.razao}
                    </div>
                    <div className="text-[9px] text-cinza">
                      CNPJ: <strong>{EMPRESA.cnpj}</strong> | {EMPRESA.endereco}
                    </div>
                    <div className="text-[9px] text-cinza">
                      Tel: {EMPRESA.telefone} | {EMPRESA.email}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="inline-block px-2 py-0.5 bg-eno-900 text-white font-extrabold text-[10px] uppercase tracking-wider rounded">
                      Pedido de Compra
                    </div>
                    <div className="text-xs font-bold text-tinta">
                      Data: <span className="tabular-nums">{formatarDataBR(pedidoVisualizarA4.data)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. DADOS DO FORNECEDOR / AGRICULTOR */}
                <div className="p-2.5 rounded bg-papel-2 border border-linha">
                  <div className="text-[10px] font-extrabold uppercase text-eno-800 border-b border-linha pb-1 mb-1.5">
                    {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? 'Dados do Produtor Rural' : 'Dados do Fornecedor'}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div>
                      <span className="text-cinza">Nome:</span>{' '}
                      <strong className="text-tinta">
                        {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                          ? pedidoVisualizarA4.agricultor_nome 
                          : pedidoVisualizarA4.fornecedor_nome}
                      </strong>
                    </div>

                    <div>
                      <span className="text-cinza">CPF / CNPJ:</span>{' '}
                      <strong className="text-tinta tabular-nums">
                        {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                          ? pedidoVisualizarA4.agricultor_cpf_cnpj 
                          : pedidoVisualizarA4.fornecedor_cnpj}
                      </strong>
                    </div>

                    {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' && pedidoVisualizarA4.agricultor_propriedade && (
                      <div>
                        <span className="text-cinza">Propriedade:</span>{' '}
                        <strong className="text-tinta">{pedidoVisualizarA4.agricultor_propriedade}</strong>
                      </div>
                    )}

                    <div>
                      <span className="text-cinza">Cidade:</span>{' '}
                      <strong className="text-tinta">
                        {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                          ? pedidoVisualizarA4.agricultor_cidade_uf 
                          : pedidoVisualizarA4.fornecedor_cidade_uf}
                      </strong>
                    </div>

                    {(pedidoVisualizarA4.agricultor_chave_pix || pedidoVisualizarA4.fornecedor_chave_pix) && (
                      <div className="col-span-2">
                        <span className="text-cinza">Chave PIX:</span>{' '}
                        <strong className="text-eno-800 tabular-nums">
                          {pedidoVisualizarA4.agricultor_chave_pix || pedidoVisualizarA4.fornecedor_chave_pix}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. DADOS DO PRODUTO E VALORES */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold uppercase text-tinta-2">
                    Produto e Valores
                  </div>

                  <table className="w-full border-collapse border border-linha-forte text-xs table-fixed">
                    <thead>
                      <tr className="bg-papel-3/60 text-[10px] font-extrabold uppercase text-tinta-2 border-b border-linha-forte">
                        <th className="py-2 px-2.5 text-left border-r border-linha-forte w-[42%]">Produto / Descrição</th>
                        <th className="py-2 px-1.5 text-right border-r border-linha-forte w-[18%]">Quantidade</th>
                        <th className="py-2 px-1.5 text-right border-r border-linha-forte w-[18%]">Valor Unitário</th>
                        <th className="py-2 px-2 text-right w-[22%]">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-linha">
                        <td className="py-2.5 px-2.5 border-r border-linha font-bold text-tinta break-words leading-snug">
                          {pedidoVisualizarA4.item_descricao}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-linha text-right tabular-nums font-bold text-tinta whitespace-nowrap text-[11px]">
                          {pedidoVisualizarA4.quantidade.toLocaleString('pt-BR')} {pedidoVisualizarA4.unidade_medida}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-linha text-right tabular-nums text-tinta-2 whitespace-nowrap text-[11px]">
                          R$ {pedidoVisualizarA4.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-extrabold text-tinta text-xs bg-papel-2 whitespace-nowrap tabular-nums">
                          R$ {pedidoVisualizarA4.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. TOTAL EM DESTAQUE */}
                <div className="p-2.5 bg-eno-50 rounded border border-eno-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-eno-800 uppercase">
                    Total a Pagar:
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-eno-800">
                    R$ {pedidoVisualizarA4.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 5. ASSINATURAS SIMPLES */}
                <div className="pt-4 grid grid-cols-2 gap-6 text-center text-xs">
                  <div className="space-y-1">
                    <div className="border-t border-linha-forte w-4/5 mx-auto pt-1"></div>
                    <div className="font-bold text-tinta text-[11px]">{EMPRESA.razao}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="border-t border-linha-forte w-4/5 mx-auto pt-1"></div>
                    <div className="font-bold text-tinta text-[11px]">
                      {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                        ? pedidoVisualizarA4.agricultor_nome 
                        : pedidoVisualizarA4.fornecedor_nome}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDIÇÃO RÁPIDA DE DESTOPO / RESÍDUO / CASCA       */}
      {/* ========================================================= */}
      {pedidoEdicaoDestopo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-papel rounded-none sm:rounded-md border-0 sm:border border-linha shadow-2xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-7 space-y-4 sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-linha pb-3">
              <div className="flex items-center gap-2 text-st-aguardando font-extrabold text-sm">
                <Edit2 className="w-4 h-4 text-st-aguardando" />
                <span>Editar Resíduo, Destopo e Casca</span>
              </div>
              <button
                onClick={() => setPedidoEdicaoDestopo(null)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md text-cinza hover:text-tinta-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoDestopo} className="space-y-4">
              <div className="p-3 bg-eno-50 rounded-md border border-eno-100 text-xs">
                <div className="font-bold text-eno-800">
                  {pedidoEdicaoDestopo.agricultor_nome || pedidoEdicaoDestopo.fornecedor_nome}
                </div>
                <div className="text-eno-800 tabular-nums mt-0.5">
                  Mandioca Total: <strong>{pedidoEdicaoDestopo.quantidade.toLocaleString('pt-BR')} KG</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta-2 mb-1">
                  Resíduo, Destopo e Casca (KG)
                </label>
                <input
                  type="number"
                  min="0"
                  value={destopoInputKg}
                  onChange={(e) => setDestopoInputKg(e.target.value)}
                  placeholder="Ex: 2100"
                  className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-sm tabular-nums font-bold focus:outline-none focus:border-ouro focus:ring-2 focus:ring-ouro/20"
                />
                <span className="text-[10px] text-st-aguardando font-medium block mt-1">
                  Usado exclusivamente para apuração de rendimento industrial da fábrica.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPedidoEdicaoDestopo(null)}
                  className="px-4 py-2 rounded-md border border-linha-forte text-xs font-bold text-tinta-2 hover:bg-papel-3/60 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-ouro-escuro hover:bg-ouro-escuro text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Salvar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DEFINIR PAGAMENTO / VIRAR DESPESA (INTEGRAÇÃO COM FINANCEIRO)    */}
      {/* ========================================================================= */}
      {pedidoDefinirPagamento && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-4xl sm:max-w-5xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-eno-600/20 text-ouro-claro border border-eno-600/40 flex items-center justify-center font-bold">
                  <ArrowRightCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Efetivar Pedido de Compra e Virar Despesa
                    </h3>
                    {(pedidoDefinirPagamento.id.startsWith('ped_roca_') || (pedidoDefinirPagamento.observacoes && pedidoDefinirPagamento.observacoes.includes('Cálculo na Roça')) || pedidoDefinirPagamento.item_descricao.toLowerCase().includes('roça')) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-eno-950 text-ouro-claro border border-eno-600">
                        Origem: Cálculo na Roça
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-cinza">
                    Ajuste o produto comprado, categoria contábil e forma de pagamento para lançar como despesa no Financeiro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPedidoDefinirPagamento(null)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSalvarDefinicaoPagamento} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Card de Resumo do Parceiro */}
              <div className="p-4 rounded-md bg-papel-2 border border-linha flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-cinza font-bold uppercase text-[10px] block">Fornecedor / Produtor Rural:</span>
                  <strong className="text-sm font-bold text-tinta">
                    {pedidoDefinirPagamento.tipo_parceiro === 'AGRICULTOR' 
                      ? pedidoDefinirPagamento.agricultor_nome 
                      : (pedidoDefinirPagamento.fornecedor_fantasia || pedidoDefinirPagamento.fornecedor_nome)}
                  </strong>
                  <p className="text-[11px] text-cinza mt-0.5">
                    Data Programada: <strong>{formatarDataBR(pedidoDefinirPagamento.data)}</strong> • Qtd: <strong>{pedidoDefinirPagamento.quantidade.toLocaleString('pt-BR')} {pedidoDefinirPagamento.unidade_medida}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-cinza font-bold uppercase text-[10px] block">Valor Estimado Inicial:</span>
                  <strong className="text-lg font-extrabold tabular-nums text-eno-800">
                    R$ {pedidoDefinirPagamento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  {(pedidoDefinirPagamento.agricultor_chave_pix || pedidoDefinirPagamento.fornecedor_chave_pix) && (
                    <span className="text-[10px] text-eno-700 tabular-nums block mt-0.5">
                      Chave PIX: {pedidoDefinirPagamento.agricultor_chave_pix || pedidoDefinirPagamento.fornecedor_chave_pix}
                    </span>
                  )}
                </div>
              </div>

              {/* SEÇÃO 1: EDIÇÃO DOS DADOS DA COMPRA (A DESCRIÇÃO VIRA PRODUTO QUE FOI COMPRADO, CATEGORIA E FORMA DE PAGAMENTO) */}
              <div className="p-4 rounded-md bg-eno-50/50 border border-eno-100 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-eno-100/70">
                  <Package className="w-4 h-4 text-eno-800" />
                  <span className="font-extrabold text-xs text-eno-800 uppercase tracking-wider">
                    1. Dados da Compra Efetivada (O que foi Comprado, Categoria & Pagamento)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Produto Comprado (Descrição inicial vira produto exato comprado) */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-tinta mb-1 text-xs">
                      Produto / Item Comprado * <span className="text-eno-700 font-semibold">(A descrição vira o produto que foi comprado)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={produtoCompradoDef}
                      onChange={(e) => setProdutoCompradoDef(e.target.value)}
                      placeholder="Ex: 5.000 Sacos de Ráfia / Rolamento 6205 / Óleo Lubrificante 68..."
                      className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2.5 font-bold text-tinta focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/20 text-xs sm:text-sm shadow-2xs"
                    />
                  </div>

                  {/* Categoria da Despesa / Compra */}
                  <div>
                    <label className="block font-bold text-tinta mb-1 text-xs">
                      Categoria da Despesa *
                    </label>
                    <select
                      value={categoriaDef}
                      onChange={(e) => setCategoriaDef(e.target.value as CategoriaCompra)}
                      className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2.5 text-tinta font-bold focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/20 cursor-pointer text-xs shadow-2xs"
                    >
                      <option value="Embalagens">Embalagens (Sacos, Ráfia, Fitas)</option>
                      <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                      <option value="Manutenção & Peças">Manutenção Mecânica & Peças</option>
                      <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
                      <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
                      <option value="Limpeza & Escritório">Limpeza & Escritório</option>
                      <option value="Químicos & Laboratório">Químicos & Laboratório</option>
                      <option value="Insumos Agrícolas">Insumos Agrícolas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block font-bold text-tinta mb-1 text-xs">
                      Forma de Pagamento *
                    </label>
                    <select
                      value={formaPagamentoDef}
                      onChange={(e) => setFormaPagamentoDef(e.target.value)}
                      className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2.5 text-tinta font-bold focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/20 cursor-pointer text-xs shadow-2xs"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Boleto Bancário">Boleto Bancário</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Transferência Bancária">Transferência Bancária</option>
                    </select>
                  </div>

                  {/* Valor Total Efetivo da Compra */}
                  <div>
                    <label className="block font-bold text-tinta mb-1 text-xs">
                      Valor Final da Compra (R$) *
                    </label>
                    <input
                      type="text"
                      required
                      value={valorTotalDef}
                      onChange={(e) => setValorTotalDef(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2.5 tabular-nums font-extrabold text-eno-800 text-xs sm:text-sm focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/20 shadow-2xs"
                    />
                  </div>

                  {/* Data da Efetivação / Vencimento */}
                  <div>
                    <label className="block font-bold text-tinta mb-1 text-xs">
                      {tipoPagamentoDef === 'JA_PAGO' ? 'Data do Pagamento Realizado *' : 'Data de Vencimento *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={dataPagamentoOuVencDef}
                      onChange={(e) => setDataPagamentoOuVencDef(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2.5 tabular-nums font-bold text-tinta text-xs sm:text-sm focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/20 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: SITUAÇÃO DA LIQUIDAÇÃO / PAGAMENTO */}
              <div className="space-y-2">
                <label className="block font-bold text-tinta text-xs">
                  2. Situação da Liquidação / Pagamento no Financeiro *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoPagamentoDef('JA_PAGO')}
                    className={`p-3.5 rounded-md border-2 text-left transition-all cursor-pointer ${
                      tipoPagamentoDef === 'JA_PAGO'
                        ? 'border-eno-600 bg-eno-50/70 shadow-xs'
                        : 'border-linha bg-papel hover:border-linha-forte'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-eno-800 font-extrabold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-eno-700 shrink-0" />
                      <span>1. Já Foi Pago no Ato</span>
                    </div>
                    <p className="text-[11px] text-cinza mt-1 leading-relaxed">
                      O dinheiro ou PIX já foi quitado. Entrará imediatamente como Despesa Paga no caixa do Financeiro.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoPagamentoDef('A_PAGAR')}
                    className={`p-3.5 rounded-md border-2 text-left transition-all cursor-pointer ${
                      tipoPagamentoDef === 'A_PAGAR'
                        ? 'border-st-producao/30 bg-st-producao-bg/70 shadow-xs'
                        : 'border-linha bg-papel hover:border-linha-forte'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-st-producao font-extrabold text-xs">
                      <Clock className="w-4 h-4 text-st-producao shrink-0" />
                      <span>2. Ainda Não Foi Pago (A Pagar)</span>
                    </div>
                    <p className="text-[11px] text-cinza mt-1 leading-relaxed">
                      Faturado a prazo. Entrará no Contas a Pagar do Financeiro com o vencimento informado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoPagamentoDef('ADIANTAMENTO_PARCIAL')}
                    className={`p-3.5 rounded-md border-2 text-left transition-all cursor-pointer ${
                      tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL'
                        ? 'border-st-producao/30 bg-st-producao-bg/70 shadow-xs'
                        : 'border-linha bg-papel hover:border-linha-forte'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-st-producao font-extrabold text-xs">
                      <DollarSign className="w-4 h-4 text-st-producao shrink-0" />
                      <span>3. Adiantamento + Saldo a Pagar</span>
                    </div>
                    <p className="text-[11px] text-cinza mt-1 leading-relaxed">
                      Foi paga uma entrada e o saldo restante será lançado como título a pagar no Financeiro.
                    </p>
                  </button>
                </div>
              </div>

              {/* SEÇÃO 3: CAMPOS CONDICIONAIS DE CAIXA / ADIANTAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-md bg-papel-2 border border-linha">
                {tipoPagamentoDef === 'JA_PAGO' ? (
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1 text-xs">Conta Bancária / Caixa de Saída</label>
                    <select
                      value={contaBancariaDef}
                      onChange={(e) => setContaBancariaDef(e.target.value)}
                      className="w-full bg-papel border border-linha rounded-md px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700 cursor-pointer text-xs"
                    >
                      <option value="Banco do Brasil - Conta Movimento">Banco do Brasil - Conta Movimento</option>
                      <option value="Sicoob Agro - Cooperativa">Sicoob Agro - Cooperativa</option>
                      <option value="Itaú Unibanco - Conta Giro">Itaú Unibanco - Conta Giro</option>
                      <option value="Caixa Físico da Fábrica / Espécie">Caixa Físico da Fábrica / Espécie</option>
                    </select>
                  </div>
                ) : tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL' ? (
                  <>
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1 text-xs">Valor do Adiantamento Pago (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valorAdiantadoDef}
                      onChange={(e) => setValorAdiantadoDef(e.target.value)}
                      placeholder="Ex: 1000.00"
                      className="w-full bg-papel border border-linha rounded-md px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700 text-xs"
                    />
                  </div>
                  {(lerNumeroBR(valorTotalDef) || pedidoDefinirPagamento.valor_total) - (parseFloat(valorAdiantadoDef.replace(',', '.')) || 0) > 0.009 && (
                    <div>
                      <label className="block font-bold text-tinta-2 mb-1 text-xs">Vencimento do saldo *</label>
                      <input
                        type="date"
                        required
                        value={vencimentoSaldoDef}
                        onChange={(e) => setVencimentoSaldoDef(e.target.value)}
                        className="w-full bg-papel border border-linha rounded-md px-3 py-2 tabular-nums text-tinta focus:outline-none focus:border-eno-700 text-xs"
                      />
                    </div>
                  )}
                  </>
                ) : (
                  <div className="flex items-center text-cinza font-medium py-2 text-xs">
                    <span>O valor total entrará integralmente no Contas a Pagar do Financeiro.</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-tinta-2 mb-1 text-xs">Observações do Pagamento (Opcional)</label>
                  <input
                    type="text"
                    value={obsPagamentoDef}
                    onChange={(e) => setObsPagamentoDef(e.target.value)}
                    placeholder="Ex: Nota fiscal enviada, comprovante no WhatsApp..."
                    className="w-full bg-papel border border-linha rounded-md px-3 py-2 text-tinta focus:outline-none focus:border-eno-700 text-xs"
                  />
                </div>

                {tipoPagamentoDef !== 'A_PAGAR' && carregarCalculosNaRoca().some(c => c.pedido_compra_id === pedidoDefinirPagamento.id || c.id === pedidoDefinirPagamento.id) && (
                  <div className="sm:col-span-2">
                    <CampoAnexoComprovante arquivo={anexoPagamentoDef} onChange={setAnexoPagamentoDef} />
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-linha flex items-center justify-between max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setPedidoDefinirPagamento(null)}
                  className="px-5 py-2.5 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-eno-800 hover:bg-eno-900 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm"
                >
                  <ArrowRightCircle className="w-4 h-4 text-ouro-claro" />
                  <span>Confirmar & Virar Despesa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
