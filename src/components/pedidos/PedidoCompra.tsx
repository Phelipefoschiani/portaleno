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
      pdf.setFillColor(6, 78, 59); // emerald-900
      pdf.roundedRect(15, 15, 12, 12, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(167, 243, 208); // emerald-200
      pdf.text('ENO', 21, 22.5, { align: 'center' });
      
      pdf.setFontSize(13);
      pdf.setTextColor(6, 78, 59);
      pdf.text('GRUPO ENO ALIMENTOS', 30, 20);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Grupo ENO Indústria e Comércio de Produtos Alimentícios Ltda', 30, 24.5);
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('CNPJ: 45.981.234/0001-90  |  IE: 908.412.301-12', 30, 28.5);
      pdf.text('Distrito Industrial — Jacarezinho / PR  |  Tel: (43) 3511-9000', 30, 32.5);
      
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
      pdf.text('Grupo ENO Alimentos', 57.5, signY + 5, { align: 'center' });
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

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white rounded-2xl border border-emerald-950/15 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden">
      
      {/* CABEÇALHO SUPERIOR */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-sm font-black text-sm">
            ENO
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Pedidos de Compra
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {pedidos.length}
              </span>
            </div>
          </div>
        </div>

        {/* Botão Novo Pedido de Compra */}
        <button
          onClick={() => {
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
          }}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
            text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md
            transition-all cursor-pointer
          "
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Novo Pedido de Compra</span>
        </button>
      </div>

      {/* CARDS NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-emerald-950/[0.02] border-b border-slate-200">
        {/* Card 1: Compras Programadas */}
        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
            <span>Compras Programadas</span>
            <Clock className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1 font-mono">
            R$ {totalProgramadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
            {qtdProgramadas} pedidos a comprar / lembrar
          </div>
        </div>

        {/* Card 2: Pagos / Finalizados */}
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Finalizados / Pagos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-black text-emerald-950 mt-1 font-mono">
            R$ {totalPagos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {pedidos.filter(p => p.status_pedido === 'Pago').length} compras quitadas
          </div>
        </div>

        {/* Card 3: A Pagar */}
        <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>A Pagar (Entregue)</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl font-black text-amber-950 mt-1 font-mono">
            R$ {totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
            {pedidos.filter(p => p.status_pedido === 'Entregue (A Pagar)').length} pedidos a liquidar
          </div>
        </div>

        {/* Card 4: Total Geral */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total em Pedidos</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            R$ {totalGeralCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {pedidos.length} pedidos cadastrados
          </div>
        </div>
      </div>

      {/* BANNER DE INTEGRAÇÃO COM FINANCEIRO */}
      {mensagemSucesso && (
        <div className="mx-6 my-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900 font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button
            onClick={() => setMensagemSucesso(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* ALERTA DE PEDIDOS A CONFIRMAR / VINDO DO CÁLCULO NA ROÇA */}
      {pedidos.some(p => p.status_pedido === 'A Confirmar') && !mensagemSucesso && (
        <div className="mx-6 my-2.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900 font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Há <strong>{pedidos.filter(p => p.status_pedido === 'A Confirmar').length} pedido(s) aguardando definição de pagamento</strong> (incluindo compras do <strong>Cálculo na Roça</strong>). Clique em <strong>"Definir Pagamento"</strong> para informar se já pagou ou se é a pagar antes do lançamento financeiro.
            </span>
          </div>
        </div>
      )}

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-white">
        <div className="relative flex-1 min-w-[260px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Produtor, Fornecedor, Item, CPF/CNPJ..."
            className="
              w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium
              rounded-xl border border-slate-200 bg-slate-50/50
              focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20
              transition-all
            "
          />
        </div>

        {/* Filtros rápidos: Status e Categoria */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status do Pedido */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 overflow-x-auto">
            <button
              onClick={() => setFiltroStatus('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtroStatus === 'TODOS' ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Todos ({pedidos.length})
            </button>
            <button
              onClick={() => setFiltroStatus('PROGRAMADO')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${filtroStatus === 'PROGRAMADO' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-900 hover:bg-blue-100/60'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Programados ({qtdProgramadas})</span>
            </button>
            <button
              onClick={() => setFiltroStatus('PAGOS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filtroStatus === 'PAGOS' ? 'bg-emerald-700 text-white shadow-sm' : 'hover:text-emerald-800'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finalizados / Pagos ({pedidos.filter(p => p.status_pedido === 'Pago').length})</span>
            </button>
            <button
              onClick={() => setFiltroStatus('A_PAGAR')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filtroStatus === 'A_PAGAR' ? 'bg-amber-500 text-white shadow-sm' : 'hover:text-amber-700'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>A Pagar ({pedidos.filter(p => p.status_pedido === 'Entregue (A Pagar)').length})</span>
            </button>
            <button
              onClick={() => setFiltroStatus('ORCAMENTO')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${filtroStatus === 'ORCAMENTO' ? 'bg-white text-purple-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Orçamento ({pedidos.filter(p => p.status_pedido === 'Orçamento').length})
            </button>
          </div>

          {/* Filtro Categoria */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="TODAS">Todas as Categorias</option>
            <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
            <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
            <option value="Embalagens">Embalagens</option>
            <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
            <option value="Manutenção & Peças">Manutenção & Peças</option>
            <option value="Químicos & Laboratório">Químicos & Laboratório</option>
            <option value="Limpeza & Escritório">Limpeza & Escritório</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      {/* TABELA DE PEDIDOS DE COMPRA (ENXUTA E DIRETA) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
            <tr>
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-5">Fornecedor / Produtor Rural</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-5">Item / Descrição</th>
              <th className="py-3 px-5 text-right">Valor Total</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {pedidosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Nenhum pedido de compra encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              pedidosFiltrados.map((pedido) => {
                const isMandioca = pedido.categoria === 'Mandioca / Matéria-Prima';
                const aproveitamento = (isMandioca && pedido.quantidade > 0 && pedido.residuo_destopo_casca_kg !== undefined)
                  ? (((pedido.quantidade - pedido.residuo_destopo_casca_kg) / pedido.quantidade) * 100).toFixed(1)
                  : null;

                // Estilo do badge de status
                let badgeStatusStyle = 'bg-slate-100 text-slate-700 border-slate-300';
                if (pedido.status_pedido === 'Pago') {
                  badgeStatusStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
                } else if (pedido.status_pedido === 'Entregue (A Pagar)') {
                  badgeStatusStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                } else if (pedido.status_pedido === 'Programado') {
                  badgeStatusStyle = 'bg-blue-100 text-blue-800 border-blue-300';
                } else if (pedido.status_pedido === 'Orçamento') {
                  badgeStatusStyle = 'bg-purple-100 text-purple-800 border-purple-300';
                }

                return (
                  <tr 
                    key={pedido.id}
                    className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                    onClick={() => setPedidoVisualizarA4(pedido)}
                  >
                    {/* Data */}
                    <td className="py-3.5 px-4 text-slate-700 font-bold whitespace-nowrap">
                      {formatarDataBR(pedido.data)}
                    </td>

                    {/* Fornecedor / Produtor Rural */}
                    <td className="py-3.5 px-5">
                      {pedido.tipo_parceiro === 'AGRICULTOR' ? (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Tractor className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{pedido.agricultor_nome}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-medium mt-0.5">
                            <Sprout className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{pedido.agricultor_propriedade}</span>
                            {pedido.agricultor_chave_pix && (
                              <button
                                onClick={(e) => copiarChavePix(pedido.agricultor_chave_pix || '', pedido.id, e)}
                                className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer ml-1 font-semibold"
                                title="Copiar Chave PIX do Produtor"
                              >
                                {copiadoId === pedido.id ? (
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>PIX</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                            <span>{pedido.fornecedor_fantasia || pedido.fornecedor_nome}</span>
                          </div>
                          {pedido.fornecedor_cnpj && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              CNPJ: {pedido.fornecedor_cnpj}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {pedido.categoria === 'Mandioca / Matéria-Prima' && <Sprout className="w-3 h-3 text-emerald-700" />}
                        {pedido.categoria === 'Mercado / Cozinha / Copa' && <UtensilsCrossed className="w-3 h-3 text-amber-700" />}
                        {pedido.categoria === 'Embalagens' && <Package className="w-3 h-3 text-blue-700" />}
                        {pedido.categoria === 'Combustível & Lubrificantes' && <Fuel className="w-3 h-3 text-orange-700" />}
                        {pedido.categoria === 'Manutenção & Peças' && <Wrench className="w-3 h-3 text-slate-700" />}
                        {pedido.categoria === 'Químicos & Laboratório' && <FlaskConical className="w-3 h-3 text-purple-700" />}
                        <span>{pedido.categoria.split('/')[0]}</span>
                      </span>
                    </td>

                    {/* Item / Descrição */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-1">
                        {(pedido.id.startsWith('ped_roca_') || (pedido.observacoes && pedido.observacoes.includes('Cálculo na Roça')) || pedido.item_descricao.toLowerCase().includes('roça')) && (
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <Tractor className="w-3 h-3 text-emerald-700" />
                            <span>Cálculo na Roça</span>
                          </span>
                        )}
                        <div className="font-bold text-slate-800 text-xs line-clamp-2" title={pedido.item_descricao}>
                          {pedido.item_descricao}
                        </div>
                      </div>
                    </td>

                    {/* Valor Total */}
                    <td className="py-3.5 px-5 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                      R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {(pedido.status_pedido === 'Programado' || pedido.status_pedido === 'A Confirmar' || pedido.status_pedido === 'Orçamento') ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-700" />
                            <span>Programado</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmarPedido(pedido, e);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-black text-[11px] shadow-sm transition-all cursor-pointer hover:scale-105"
                            title="Transformar este pedido de compra em despesa financeira"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Virar Despesa</span>
                          </button>
                        </div>
                      ) : pedido.status_pedido === 'Pago' || pedido.status_pedido === 'Confirmado' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmarPedido(pedido, e);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs hover:bg-emerald-200 cursor-pointer"
                          title="Clique para ver ou alterar situação do pagamento"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Comprado / Pago</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmarPedido(pedido, e);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-200 cursor-pointer"
                          title="Clique para registrar quitação"
                        >
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Entregue (A Pagar)</span>
                        </button>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Olhinho: Abre e Imprime a Folha A4 Personalizada Grupo ENO */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPedidoVisualizarA4(pedido);
                          }}
                          className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title="Visualizar e Imprimir Folha A4 Oficial Grupo ENO"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Editar Pedido de Compra (se editar, edita na despesa programada) */}
                        <button
                          onClick={(e) => abrirEdicaoPedido(pedido, e)}
                          className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Pedido de Compra (se editar, edita na despesa programada)"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Botão Baixar direto em PDF */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            gerarEBaixarPDF(pedido);
                          }}
                          className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Baixar Pedido em PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Excluir Pedido (se deletar, ele some da despesa programada) */}
                        <button
                          onClick={(e) => excluirPedido(pedido.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Pedido (se deletar, some da despesa programada)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: NOVO PEDIDO DE COMPRA (SIMPLES: FORNECEDOR, DATA, VALOR, DESCRIÇÃO) */}
      {/* ========================================================= */}
      {modalNovoPedido && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl sm:max-w-3xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Topo do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-800 text-white rounded-xl shadow-xs">
                  <Package className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Novo Pedido de Compra / Programação
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha o fornecedor, data, valor e a descrição da compra necessária
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoPedido(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DO TIPO DE PARCEIRO: FORNECEDOR vs PRODUTOR RURAL */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setTipoParceiroForm('FORNECEDOR');
                  }}
                  className={`py-2 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tipoParceiroForm === 'FORNECEDOR'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tractor className="w-4 h-4" />
                  <span>Produtor Rural / Mandioca</span>
                </button>
              </div>
            </div>

            {/* FORMULÁRIO ENXUTO E DIRETO */}
            <form onSubmit={salvarNovoPedido} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* 1. SELEÇÃO DO FORNECEDOR OU PRODUTOR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {tipoParceiroForm === 'AGRICULTOR' ? 'Produtor Rural / Mandioca' : 'Fornecedor'} <span className="text-red-500">*</span>
                </label>

                {tipoParceiroForm === 'AGRICULTOR' ? (
                  <select
                    required
                    value={agricultorIdForm}
                    onChange={(e) => setAgricultorIdForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                      {agricultorAtualForm.nome_propriedade} ({agricultorAtualForm.endereco.municipio}/{agricultorAtualForm.endereco.uf})
                    </span>
                    <span className="font-mono text-emerald-900 font-semibold">
                      CPF: {agricultorAtualForm.cpf_cnpj}
                    </span>
                  </div>
                )}

                {tipoParceiroForm === 'FORNECEDOR' && fornecedorAtualForm && (
                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs flex items-center justify-between">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                      {fornecedorAtualForm.razao_nome}
                    </span>
                    <span className="font-mono text-indigo-900 font-semibold">
                      CNPJ: {fornecedorAtualForm.cpf_cnpj}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. GRID: DATA DO PEDIDO / PREVISTA + VALOR PREVISTO (R$) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data da Compra / Prevista <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dataForm}
                    onChange={(e) => setDataForm(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Estimado / Total (R$) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs sm:text-sm font-bold text-slate-400">R$</span>
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
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 2b. QUANTIDADE + UNIDADE + VALOR UNITÁRIO (total calculado) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantidade <span className="text-red-500">*</span>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={unidadeMedidaForm}
                    onChange={(e) => setUnidadeMedidaForm(e.target.value as PedidoCompraGeral['unidade_medida'])}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  >
                    {UNIDADES_PEDIDO_COMPRA.map(u => (
                      <option key={u.valor} value={u.valor}>{u.rotulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Unitário (R$)</label>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* 3. DESCRIÇÃO DO ITEM / O QUE PRECISAMOS COMPRAR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição do Pedido / O que precisamos comprar <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={itemDescricaoForm}
                  onChange={(e) => setItemDescricaoForm(e.target.value)}
                  placeholder="Ex: Precisamos de 10.000 sacarias plásticas de 1kg para empacotamento de farinha fina, compra de correia B-85 para o picador..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              {/* 4. DICA VISUAL SOBRE EFETIVAÇÃO */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Programação Rápida de Compra</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Este pedido ficará guardado como lembrete de compra e constará em <strong>Despesas Programadas</strong>.
                  Quando a compra for realizada, clique no botão <strong>Finalizar Compra</strong> na tabela para definir a <strong>Categoria</strong> contábil (Embalagens, Manutenção, etc.) e a <strong>Forma de Pagamento (PIX / Dinheiro)</strong>.
                </p>
              </div>

              {/* BOTÕES SALVAR / CANCELAR */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoPedido(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    flex items-center gap-2 px-6 py-2.5 rounded-xl
                    bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950
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
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl lg:max-w-6xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Topo do Modal de Edição */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-800 text-white rounded-xl">
                  <Pencil className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Editar Pedido de Compra / Programação
                  </h3>
                  <p className="text-xs text-slate-500">As alterações serão sincronizadas diretamente na despesa programada vinculada</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalEditarPedido(false);
                  setPedidoEditando(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DO TIPO DE PARCEIRO NA EDIÇÃO */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl max-w-md">
                <button
                  type="button"
                  onClick={() => setEditTipoParceiro('AGRICULTOR')}
                  className={`py-2 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    editTipoParceiro === 'AGRICULTOR'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Fornecedor Cadastrado</span>
                </button>
              </div>
            </div>

            {/* FORMULÁRIO DE EDIÇÃO */}
            <form onSubmit={salvarEdicaoPedido} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* LINHA 1: PARCEIRO CADASTRADO (2 COLS) + CATEGORIA (1 COL) + DATA (1 COL) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editTipoParceiro === 'AGRICULTOR' ? 'Produtor Rural / Agricultor' : 'Fornecedor Cadastrado'} <span className="text-red-500">*</span>
                  </label>

                  {editTipoParceiro === 'AGRICULTOR' ? (
                    <select
                      required
                      value={editParceiroId}
                      onChange={(e) => setEditParceiroId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria da Compra <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value as CategoriaCompra)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data da Compra / Previsão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* LINHA 2: SOLICITANTE + LOCAL + DESCRIÇÃO DO ITEM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Solicitante / Comprador <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCompradorNome}
                    onChange={(e) => setEditCompradorNome(e.target.value)}
                    placeholder="Ex: Almoxarifado, Gerência..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Local da Compra
                  </label>
                  <input
                    type="text"
                    value={editLocalCompra}
                    onChange={(e) => setEditLocalCompra(e.target.value)}
                    placeholder="Ex: Fornecedor, Fábrica..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descrição do Item / Produto Necessário <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemDescricao}
                    onChange={(e) => setEditItemDescricao(e.target.value)}
                    placeholder="Ex: Sacaria de Ráfia Valvulada 50kg Personalizada Grupo ENO..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* LINHA 3: QUANTIDADE, UNIDADE, VALOR UNITÁRIO E TOTAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editQuantidade}
                    onChange={(e) => setEditQuantidade(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade de Medida <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editUnidadeMedida}
                    onChange={(e) => setEditUnidadeMedida(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Unitário (R$) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editValorUnitario}
                      onChange={(e) => setEditValorUnitario(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* CARD VALOR TOTAL RECALCULADO */}
                <div className="p-3 rounded-xl bg-blue-900 text-white flex flex-col justify-center shadow-inner h-[62px]">
                  <span className="text-[10px] text-blue-200 font-bold block uppercase tracking-wider">
                    Total Calculado
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-white truncate">
                    R$ {(lerNumeroBR(editQuantidade) * lerNumeroBR(editValorUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* LINHA 4: STATUS, FORMA DE PAGAMENTO E OBSERVAÇÕES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status do Pedido <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editStatusPedido}
                    onChange={(e) => setEditStatusPedido(e.target.value as StatusPedidoCompra)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  >
                    <option value="Programado">Programado (A Lembrar / Comprar)</option>
                    <option value="Pago">Pago / Finalizado</option>
                    <option value="Entregue (A Pagar)">Entregue (A Pagar)</option>
                    <option value="Orçamento">Orçamento</option>
                    <option value="A Confirmar">A Confirmar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={editFormaPagamento}
                    onChange={(e) => setEditFormaPagamento(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência TED">Transferência TED</option>
                    <option value="À Vista Dinheiro">À Vista Dinheiro</option>
                    <option value="Cartão Corporativo">Cartão Corporativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    placeholder="Ex: Entrega na fábrica, prazo..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* BOTOES SALVAR / CANCELAR */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarPedido(false);
                    setPedidoEditando(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    flex items-center gap-2 px-6 py-2.5 rounded-xl
                    bg-blue-800 hover:bg-blue-900 active:bg-blue-950
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
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-5xl lg:max-w-6xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Barra Superior de Ações */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-700 bg-slate-800 text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-700 text-white font-black flex items-center justify-center text-xs">
                  ENO
                </div>
                <h3 className="font-bold text-sm text-slate-100">
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
                    bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs
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
                    bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs
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
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ÁREA DE VISUALIZAÇÃO A4 ENQUADRADA SEM ROLAGEM */}
            <div className="flex-1 p-2 sm:p-3 bg-slate-900 flex items-center justify-center overflow-hidden">
              
              <div 
                id="folha-a4-documento"
                className="
                  bg-white text-slate-900 p-5 sm:p-6 rounded-sm shadow-2xl border border-slate-300
                  flex flex-col justify-between text-xs select-text font-sans
                  h-full max-h-[calc(100vh-215px)] aspect-[210/297] box-border
                "
              >
                
                {/* 1. CABEÇALHO DA EMPRESA & DATA */}
                <div className="flex items-start justify-between border-b-2 border-emerald-950 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-900 text-emerald-300 font-black flex items-center justify-center text-[10px]">
                        ENO
                      </div>
                      <h1 className="text-sm font-black text-emerald-950 tracking-tight uppercase">
                        Grupo ENO Alimentos
                      </h1>
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Grupo ENO Indústria e Comércio de Produtos Alimentícios Ltda
                    </div>
                    <div className="text-[9px] text-slate-500">
                      CNPJ: <strong>45.981.234/0001-90</strong> | IE: <strong>908.412.301-12</strong>
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Distrito Industrial — Jacarezinho / PR | Tel: (43) 3511-9000
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="inline-block px-2 py-0.5 bg-emerald-900 text-white font-black text-[10px] uppercase tracking-wider rounded">
                      Pedido de Compra
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      Data: <span className="font-mono">{formatarDataBR(pedidoVisualizarA4.data)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. DADOS DO FORNECEDOR / AGRICULTOR */}
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-black uppercase text-emerald-900 border-b border-slate-200 pb-1 mb-1.5">
                    {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? 'Dados do Produtor Rural' : 'Dados do Fornecedor'}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div>
                      <span className="text-slate-500">Nome:</span>{' '}
                      <strong className="text-slate-900">
                        {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                          ? pedidoVisualizarA4.agricultor_nome 
                          : pedidoVisualizarA4.fornecedor_nome}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500">CPF / CNPJ:</span>{' '}
                      <strong className="text-slate-900 font-mono">
                        {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                          ? pedidoVisualizarA4.agricultor_cpf_cnpj 
                          : pedidoVisualizarA4.fornecedor_cnpj}
                      </strong>
                    </div>

                    {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' && pedidoVisualizarA4.agricultor_propriedade && (
                      <div>
                        <span className="text-slate-500">Propriedade:</span>{' '}
                        <strong className="text-slate-900">{pedidoVisualizarA4.agricultor_propriedade}</strong>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500">Cidade:</span>{' '}
                      <strong className="text-slate-900">
                        {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' 
                          ? pedidoVisualizarA4.agricultor_cidade_uf 
                          : pedidoVisualizarA4.fornecedor_cidade_uf}
                      </strong>
                    </div>

                    {(pedidoVisualizarA4.agricultor_chave_pix || pedidoVisualizarA4.fornecedor_chave_pix) && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Chave PIX:</span>{' '}
                        <strong className="text-emerald-900 font-mono">
                          {pedidoVisualizarA4.agricultor_chave_pix || pedidoVisualizarA4.fornecedor_chave_pix}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. DADOS DO PRODUTO E VALORES */}
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-slate-700">
                    Produto e Valores
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-xs table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 border-b border-slate-300">
                        <th className="py-2 px-2.5 text-left border-r border-slate-300 w-[42%]">Produto / Descrição</th>
                        <th className="py-2 px-1.5 text-right border-r border-slate-300 w-[18%]">Quantidade</th>
                        <th className="py-2 px-1.5 text-right border-r border-slate-300 w-[18%]">Valor Unitário</th>
                        <th className="py-2 px-2 text-right w-[22%]">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 px-2.5 border-r border-slate-200 font-bold text-slate-900 break-words leading-snug">
                          {pedidoVisualizarA4.item_descricao}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-[11px]">
                          {pedidoVisualizarA4.quantidade.toLocaleString('pt-BR')} {pedidoVisualizarA4.unidade_medida}
                        </td>
                        <td className="py-2.5 px-1.5 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap text-[11px]">
                          R$ {pedidoVisualizarA4.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs bg-slate-50 whitespace-nowrap tabular-nums">
                          R$ {pedidoVisualizarA4.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. TOTAL EM DESTAQUE */}
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-300 flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 uppercase">
                    Total a Pagar:
                  </span>
                  <span className="text-base font-black font-mono text-emerald-950">
                    R$ {pedidoVisualizarA4.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 5. ASSINATURAS SIMPLES */}
                <div className="pt-4 grid grid-cols-2 gap-6 text-center text-xs">
                  <div className="space-y-1">
                    <div className="border-t border-slate-400 w-4/5 mx-auto pt-1"></div>
                    <div className="font-bold text-slate-900 text-[11px]">Grupo ENO Alimentos</div>
                  </div>

                  <div className="space-y-1">
                    <div className="border-t border-slate-400 w-4/5 mx-auto pt-1"></div>
                    <div className="font-bold text-slate-900 text-[11px]">
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
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-7 space-y-4 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <Edit2 className="w-4 h-4 text-amber-700" />
                <span>Editar Resíduo, Destopo e Casca</span>
              </div>
              <button
                onClick={() => setPedidoEdicaoDestopo(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoDestopo} className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-950">
                  {pedidoEdicaoDestopo.agricultor_nome || pedidoEdicaoDestopo.fornecedor_nome}
                </div>
                <div className="text-emerald-800 font-mono mt-0.5">
                  Mandioca Total: <strong>{pedidoEdicaoDestopo.quantidade.toLocaleString('pt-BR')} KG</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resíduo, Destopo e Casca (KG)
                </label>
                <input
                  type="number"
                  min="0"
                  value={destopoInputKg}
                  onChange={(e) => setDestopoInputKg(e.target.value)}
                  placeholder="Ex: 2100"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-[10px] text-amber-800 font-medium block mt-1">
                  Usado exclusivamente para apuração de rendimento industrial da fábrica.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPedidoEdicaoDestopo(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl sm:max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <ArrowRightCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Efetivar Pedido de Compra e Virar Despesa
                    </h3>
                    {(pedidoDefinirPagamento.id.startsWith('ped_roca_') || (pedidoDefinirPagamento.observacoes && pedidoDefinirPagamento.observacoes.includes('Cálculo na Roça')) || pedidoDefinirPagamento.item_descricao.toLowerCase().includes('roça')) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-600">
                        Origem: Cálculo na Roça
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ajuste o produto comprado, categoria contábil e forma de pagamento para lançar como despesa no Financeiro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPedidoDefinirPagamento(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSalvarDefinicaoPagamento} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Card de Resumo do Parceiro */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Fornecedor / Produtor Rural:</span>
                  <strong className="text-sm font-bold text-slate-900">
                    {pedidoDefinirPagamento.tipo_parceiro === 'AGRICULTOR' 
                      ? pedidoDefinirPagamento.agricultor_nome 
                      : (pedidoDefinirPagamento.fornecedor_fantasia || pedidoDefinirPagamento.fornecedor_nome)}
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data Programada: <strong>{formatarDataBR(pedidoDefinirPagamento.data)}</strong> • Qtd: <strong>{pedidoDefinirPagamento.quantidade.toLocaleString('pt-BR')} {pedidoDefinirPagamento.unidade_medida}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Valor Estimado Inicial:</span>
                  <strong className="text-lg font-black font-mono text-emerald-900">
                    R$ {pedidoDefinirPagamento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  {(pedidoDefinirPagamento.agricultor_chave_pix || pedidoDefinirPagamento.fornecedor_chave_pix) && (
                    <span className="text-[10px] text-emerald-700 font-mono block mt-0.5">
                      Chave PIX: {pedidoDefinirPagamento.agricultor_chave_pix || pedidoDefinirPagamento.fornecedor_chave_pix}
                    </span>
                  )}
                </div>
              </div>

              {/* SEÇÃO 1: EDIÇÃO DOS DADOS DA COMPRA (A DESCRIÇÃO VIRA PRODUTO QUE FOI COMPRADO, CATEGORIA E FORMA DE PAGAMENTO) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/70">
                  <Package className="w-4 h-4 text-emerald-800" />
                  <span className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                    1. Dados da Compra Efetivada (O que foi Comprado, Categoria & Pagamento)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Produto Comprado (Descrição inicial vira produto exato comprado) */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      Produto / Item Comprado * <span className="text-emerald-700 font-semibold">(A descrição vira o produto que foi comprado)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={produtoCompradoDef}
                      onChange={(e) => setProdutoCompradoDef(e.target.value)}
                      placeholder="Ex: 5.000 Sacos de Ráfia / Rolamento 6205 / Óleo Lubrificante 68..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm shadow-2xs"
                    />
                  </div>

                  {/* Categoria da Despesa / Compra */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      Categoria da Despesa *
                    </label>
                    <select
                      value={categoriaDef}
                      onChange={(e) => setCategoriaDef(e.target.value as CategoriaCompra)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer text-xs shadow-2xs"
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
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      Forma de Pagamento *
                    </label>
                    <select
                      value={formaPagamentoDef}
                      onChange={(e) => setFormaPagamentoDef(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer text-xs shadow-2xs"
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
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      Valor Final da Compra (R$) *
                    </label>
                    <input
                      type="text"
                      required
                      value={valorTotalDef}
                      onChange={(e) => setValorTotalDef(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-black text-emerald-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>

                  {/* Data da Efetivação / Vencimento */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      {tipoPagamentoDef === 'JA_PAGO' ? 'Data do Pagamento Realizado *' : 'Data de Vencimento *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={dataPagamentoOuVencDef}
                      onChange={(e) => setDataPagamentoOuVencDef(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: SITUAÇÃO DA LIQUIDAÇÃO / PAGAMENTO */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800 text-xs">
                  2. Situação da Liquidação / Pagamento no Financeiro *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoPagamentoDef('JA_PAGO')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      tipoPagamentoDef === 'JA_PAGO'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>1. Já Foi Pago no Ato</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      O dinheiro ou PIX já foi quitado. Entrará imediatamente como Despesa Paga no caixa do Financeiro.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoPagamentoDef('A_PAGAR')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      tipoPagamentoDef === 'A_PAGAR'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-blue-900 font-black text-xs">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>2. Ainda Não Foi Pago (A Pagar)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Faturado a prazo. Entrará no Contas a Pagar do Financeiro com o vencimento informado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoPagamentoDef('ADIANTAMENTO_PARCIAL')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      tipoPagamentoDef === 'ADIANTAMENTO_PARCIAL'
                        ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
                      <DollarSign className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>3. Adiantamento + Saldo a Pagar</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Foi paga uma entrada e o saldo restante será lançado como título a pagar no Financeiro.
                    </p>
                  </button>
                </div>
              </div>

              {/* SEÇÃO 3: CAMPOS CONDICIONAIS DE CAIXA / ADIANTAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {tipoPagamentoDef === 'JA_PAGO' ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">Conta Bancária / Caixa de Saída</label>
                    <select
                      value={contaBancariaDef}
                      onChange={(e) => setContaBancariaDef(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer text-xs"
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
                    <label className="block font-bold text-slate-700 mb-1 text-xs">Valor do Adiantamento Pago (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valorAdiantadoDef}
                      onChange={(e) => setValorAdiantadoDef(e.target.value)}
                      placeholder="Ex: 1000.00"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700 text-xs"
                    />
                  </div>
                  {(lerNumeroBR(valorTotalDef) || pedidoDefinirPagamento.valor_total) - (parseFloat(valorAdiantadoDef.replace(',', '.')) || 0) > 0.009 && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-xs">Vencimento do saldo *</label>
                      <input
                        type="date"
                        required
                        value={vencimentoSaldoDef}
                        onChange={(e) => setVencimentoSaldoDef(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-emerald-700 text-xs"
                      />
                    </div>
                  )}
                  </>
                ) : (
                  <div className="flex items-center text-slate-500 font-medium py-2 text-xs">
                    <span>O valor total entrará integralmente no Contas a Pagar do Financeiro.</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Observações do Pagamento (Opcional)</label>
                  <input
                    type="text"
                    value={obsPagamentoDef}
                    onChange={(e) => setObsPagamentoDef(e.target.value)}
                    placeholder="Ex: Nota fiscal enviada, comprovante no WhatsApp..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-700 text-xs"
                  />
                </div>

                {tipoPagamentoDef !== 'A_PAGAR' && carregarCalculosNaRoca().some(c => c.pedido_compra_id === pedidoDefinirPagamento.id || c.id === pedidoDefinirPagamento.id) && (
                  <div className="sm:col-span-2">
                    <CampoAnexoComprovante arquivo={anexoPagamentoDef} onChange={setAnexoPagamentoDef} />
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPedidoDefinirPagamento(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm"
                >
                  <ArrowRightCircle className="w-4 h-4 text-emerald-300" />
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
