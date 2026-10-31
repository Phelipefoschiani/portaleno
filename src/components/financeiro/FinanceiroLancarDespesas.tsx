import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Building2,
  Trash2,
  Save,
  Check,
  X,
  TrendingDown,
  Clock,
  CheckCircle2,
  Eye,
  Printer,
  Download,
  Pencil,
  Tractor,
  Sprout,
  Package,
  Fuel,
  Wrench,
  FlaskConical,
  UtensilsCrossed,
  FileCheck,
  Loader2,
  AlertCircle,
  ArrowRightCircle
} from 'lucide-react';
import {
  DespesaOperacional,
  TituloPagar,
  carregarDespesas,
  salvarDespesas,
  carregarTitulosPagar,
  salvarTitulosPagar,
  ehDespesaProgramada,
  dataNoMesAtual,
  somarValores,
  formatarMoeda,
  numeroSeguro,
  registrarBaixaNoCaixa,
  estornarBaixaNoCaixa
} from '../../data/financeiroData';
import { carregarAgricultores, carregarFornecedores, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { hojeISO, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import {
  PedidoCompraGeral,
  carregarPedidosCompra,
  salvarPedidosCompra,
  efetivarPedidoCompra,
  Agricultor,
  Fornecedor,
  CategoriaCompra,
  StatusPedidoCompra
} from '../../data/mockStore';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroLancarDespesas({ onNavigate }: Props) {
  // Aba ativa: Despesas Realizadas vs Despesas Programadas (Pedidos de Compra)
  const [abaAtiva, setAbaAtiva] = useState<'REALIZADAS' | 'PROGRAMADAS'>('REALIZADAS');

  // Dados
  const [despesas, setDespesas] = useState<DespesaOperacional[]>([]);
  const [pedidosCompra, setPedidosCompra] = useState<PedidoCompraGeral[]>([]);
  const [agricultores, setAgricultores] = useState<Agricultor[]>(() => carregarAgricultores());
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => carregarFornecedores());

  // Filtros
  const [busca, setBusca] = useState('');
  const [mensagemFeedback, setMensagemFeedback] = useState<string | null>(null);

  // Modal Nova Despesa Operacional Direta
  const [modalNovaDespesa, setModalNovaDespesa] = useState(false);
  const [formDespesa, setFormDespesa] = useState({
    data: hojeISO(),
    categoria: 'Manutenção Mecânica & Peças',
    descricao: '',
    valor: 0,
    setor: 'Fábrica & Moagem' as DespesaOperacional['setor'],
    responsavel: '',
    forma_pagamento: 'PIX'
  });

  // Modal Novo Pedido de Compra / Programação (Simples: Fornecedor, Data, Valor e Descrição)
  const [modalNovoPedido, setModalNovoPedido] = useState(false);
  const [novoTipoParceiro, setNovoTipoParceiro] = useState<'AGRICULTOR' | 'FORNECEDOR'>('FORNECEDOR');
  const [novoParceiroId, setNovoParceiroId] = useState('');
  const [novoData, setNovoData] = useState(hojeISO());
  const [novoValorTotal, setNovoValorTotal] = useState('');
  const [novoItem, setNovoItem] = useState('');
  const [novoComprador, setNovoComprador] = useState('Equipe de Compras');
  const [novoLocal, setNovoLocal] = useState('');
  const [novoCategoria, setNovoCategoria] = useState<CategoriaCompra>('Embalagens');
  const [novoQtd, setNovoQtd] = useState('1');
  const [novoUnidade, setNovoUnidade] = useState<PedidoCompraGeral['unidade_medida']>('Unidades');
  const [novoUnitario, setNovoUnitario] = useState('');
  const [novoFormaPagamento, setNovoFormaPagamento] = useState<PedidoCompraGeral['forma_pagamento']>('PIX');
  const [novoObservacoes, setNovoObservacoes] = useState('');

  // Modal Editar Pedido de Compra Programado
  const [pedidoEditando, setPedidoEditando] = useState<PedidoCompraGeral | null>(null);
  const [editItem, setEditItem] = useState('');
  const [editCategoria, setEditCategoria] = useState<CategoriaCompra>('Embalagens');
  const [editQtd, setEditQtd] = useState('');
  const [editUnidade, setEditUnidade] = useState<PedidoCompraGeral['unidade_medida']>('Unidades');
  const [editUnitario, setEditUnitario] = useState('');
  const [editData, setEditData] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  // Modal Finalizar Compra / Virar Despesa (Quando comprar, vira despesa)
  const [pedidoFinalizando, setPedidoFinalizando] = useState<PedidoCompraGeral | null>(null);
  const [produtoFinalizacao, setProdutoFinalizacao] = useState('');
  const [valorTotalFinalizacao, setValorTotalFinalizacao] = useState('');
  const [categoriaFinalizacao, setCategoriaFinalizacao] = useState<CategoriaCompra>('Embalagens');
  const [tipoFinalizacao, setTipoFinalizacao] = useState<'JA_PAGO' | 'A_PAGAR'>('JA_PAGO');
  const [dataFinalizacao, setDataFinalizacao] = useState(hojeISO());
  const [formaPagamentoFinalizacao, setFormaPagamentoFinalizacao] = useState('PIX');
  const [obsFinalizacao, setObsFinalizacao] = useState('');

  // Modal Folha A4 Oficial
  const [pedidoVisualizarA4, setPedidoVisualizarA4] = useState<PedidoCompraGeral | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Recarregar dados sincronizados
  const recarregar = () => {
    setDespesas(carregarDespesas());
    setPedidosCompra(carregarPedidosCompra());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    const handleCadastros = () => {
      setAgricultores(carregarAgricultores());
      setFornecedores(carregarFornecedores());
    };
    window.addEventListener('financeiro_updated', handleUpdate);
    window.addEventListener('pedidos_compra_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleCadastros);
    return () => {
      window.removeEventListener('financeiro_updated', handleUpdate);
      window.removeEventListener('pedidos_compra_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
      window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleCadastros);
    };
  }, []);

  // Mantém o parceiro selecionado válido conforme o tipo e os cadastros atuais
  useEffect(() => {
    const lista = novoTipoParceiro === 'AGRICULTOR' ? agricultores : fornecedores;
    if (!lista.some(p => p.id === novoParceiroId)) {
      setNovoParceiroId(lista[0]?.id || '');
    }
  }, [novoTipoParceiro, agricultores, fornecedores, novoParceiroId]);

  // Despesas realizadas = apenas lançamentos efetivamente pagos.
  // Registros "desp_prog_*" (programadas) nunca contam como realizadas.
  const despesasRealizadas = useMemo(() => {
    return despesas
      .filter(d => !ehDespesaProgramada(d))
      .sort((a, b) => compararDatas(b.data, a.data));
  }, [despesas]);

  // Lista de Pedidos Programados (A Lembrar / A Comprar)
  const pedidosProgramados = useMemo(() => {
    return pedidosCompra.filter(p => 
      p.status_pedido === 'Programado' || 
      p.status_pedido === 'A Confirmar' || 
      p.status_pedido === 'Orçamento'
    );
  }, [pedidosCompra]);

  // Métricas
  const despesasRealizadasMes = useMemo(() => {
    return despesasRealizadas.filter(d => dataNoMesAtual(d.data));
  }, [despesasRealizadas]);

  const totalDespesasRealizadas = useMemo(() => {
    return somarValores(despesasRealizadasMes, d => d.valor);
  }, [despesasRealizadasMes]);

  const totalDespesasProgramadas = useMemo(() => {
    return somarValores(pedidosProgramados, p => p.valor_total);
  }, [pedidosProgramados]);

  // Filtros de busca
  const despesasRealizadasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return despesasRealizadas.filter(d =>
      (d.descricao || '').toLowerCase().includes(termo) ||
      (d.categoria || '').toLowerCase().includes(termo) ||
      (d.responsavel || '').toLowerCase().includes(termo)
    );
  }, [despesasRealizadas, busca]);

  const pedidosProgramadosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return pedidosProgramados.filter(p =>
      (p.item_descricao || '').toLowerCase().includes(termo) ||
      (p.categoria || '').toLowerCase().includes(termo) ||
      (p.fornecedor_nome && p.fornecedor_nome.toLowerCase().includes(termo)) ||
      (p.agricultor_nome && p.agricultor_nome.toLowerCase().includes(termo))
    );
  }, [pedidosProgramados, busca]);

  // Ação: Lançar Despesa Operacional Direta
  const handleSalvarDespesaDireta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(numeroSeguro(formDespesa.valor) > 0)) {
      alert('Informe um valor maior que zero.');
      return;
    }
    const nova: DespesaOperacional = {
      id: `desp_${Date.now()}`,
      ...formDespesa,
      valor: numeroSeguro(formDespesa.valor),
      data: paraISO(formDespesa.data) || hojeISO()
    };
    salvarDespesas([nova, ...carregarDespesas()]);
    // Despesa realizada já foi paga: sai do caixa uma única vez
    registrarBaixaNoCaixa(`despesa:${nova.id}`, -nova.valor);
    setModalNovaDespesa(false);
    setMensagemFeedback('Despesa operacional lançada com sucesso!');
    setTimeout(() => setMensagemFeedback(null), 5000);
  };

  // Ação: Excluir Despesa Direta
  const handleExcluirDespesa = (id: string) => {
    if (confirm('Deseja excluir este lançamento de despesa?')) {
      salvarDespesas(carregarDespesas().filter(d => d.id !== id));
      // Estorna no caixa o que esta despesa havia debitado (se debitou)
      estornarBaixaNoCaixa(`despesa:${id}`);
      setMensagemFeedback('Despesa excluída com sucesso!');
      setTimeout(() => setMensagemFeedback(null), 5000);
    }
  };

  // Ação: Salvar Novo Pedido de Compra Programado (Simples: Fornecedor, Data, Valor e Descrição)
  const handleSalvarNovoPedidoProgramado = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(novoValorTotal.replace(',', '.')) || (Number(novoQtd) * Number(novoUnitario)) || 0;
    if (total <= 0) {
      alert('Informe um valor estimado maior que zero.');
      return;
    }
    const listaParceiros = novoTipoParceiro === 'AGRICULTOR' ? agricultores : fornecedores;
    if (listaParceiros.length === 0) {
      alert(novoTipoParceiro === 'AGRICULTOR'
        ? 'Nenhum produtor rural cadastrado. Cadastre o agricultor antes de programar a compra.'
        : 'Nenhum fornecedor cadastrado. Cadastre o fornecedor antes de programar a compra.');
      return;
    }
    const dataPrevista = paraISO(novoData) || hojeISO();

    let novo: PedidoCompraGeral;

    if (novoTipoParceiro === 'AGRICULTOR') {
      const agr = agricultores.find(a => a.id === novoParceiroId) || agricultores[0];
      novo = {
        id: `ped_${Date.now()}`,
        data: dataPrevista,
        tipo_parceiro: 'AGRICULTOR',
        agricultor_id: agr?.id,
        agricultor_nome: agr?.nome_completo,
        agricultor_propriedade: agr?.nome_propriedade,
        agricultor_cpf_cnpj: agr?.cpf_cnpj,
        agricultor_ie: agr?.ie_rural,
        agricultor_cidade_uf: agr?.endereco ? `${agr.endereco.municipio}/${agr.endereco.uf}` : '',
        agricultor_chave_pix: agr ? `${agr.chave_pix} (${agr.tipo_chave_pix})` : '',
        comprador_nome: 'Equipe de Compras',
        local_compra: agr?.nome_propriedade || '',
        item_descricao: novoItem.trim() || 'Pedido de Compra Programado',
        categoria: 'Mandioca / Matéria-Prima',
        quantidade: 1,
        unidade_medida: 'Unidades',
        valor_unitario: total,
        valor_total: total,
        status_pedido: 'Programado',
        forma_pagamento: 'PIX',
        observacoes: 'Programado — Categoria e pagamento definidos ao efetivar'
      };
    } else {
      const forn = fornecedores.find(f => f.id === novoParceiroId) || fornecedores[0];
      novo = {
        id: `ped_${Date.now()}`,
        data: dataPrevista,
        tipo_parceiro: 'FORNECEDOR',
        fornecedor_id: forn?.id,
        fornecedor_nome: forn?.razao_nome,
        fornecedor_fantasia: forn?.fantasia,
        fornecedor_cnpj: forn?.cpf_cnpj,
        fornecedor_ie: forn?.ie_rg,
        fornecedor_cidade_uf: forn?.endereco ? `${forn.endereco.municipio}/${forn.endereco.uf}` : '',
        fornecedor_chave_pix: forn?.chave_pix,
        fornecedor_telefone: forn?.telefone,
        comprador_nome: 'Equipe de Compras',
        local_compra: forn?.fantasia || forn?.razao_nome || '',
        item_descricao: novoItem.trim() || 'Pedido de Compra Programado',
        categoria: 'Embalagens',
        quantidade: 1,
        unidade_medida: 'Unidades',
        valor_unitario: total,
        valor_total: total,
        status_pedido: 'Programado',
        forma_pagamento: 'PIX',
        observacoes: 'Programado — Categoria e pagamento definidos ao efetivar'
      };
    }

    const atualizados = [novo, ...carregarPedidosCompra()];
    salvarPedidosCompra(atualizados);
    setPedidosCompra(atualizados);
    // A despesa programada é o próprio pedido (aba "Programadas"); não grava lançamento em
    // despesas realizadas, para não somar em dobro na previsão nem aparecer como quitada.

    setModalNovoPedido(false);
    setNovoItem('');
    setNovoValorTotal('');
    setMensagemFeedback('Pedido de compra programado com sucesso! Já disponível em Despesas Programadas.');
    setTimeout(() => setMensagemFeedback(null), 5000);
  };

  // Ação: Abrir Edição de Pedido Programado
  const abrirEdicaoProgramado = (pedido: PedidoCompraGeral) => {
    setPedidoEditando(pedido);
    setEditItem(pedido.item_descricao);
    setEditCategoria(pedido.categoria);
    setEditQtd(String(pedido.quantidade));
    setEditUnidade(pedido.unidade_medida);
    setEditUnitario(String(pedido.valor_unitario));
    setEditData(paraISO(pedido.data) || pedido.data);
    setEditObservacoes(pedido.observacoes || '');
  };

  // Ação: Salvar Edição de Pedido Programado (Se editar, edita em ambos!)
  const handleSalvarEdicaoProgramado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoEditando) return;

    const qtd = numeroSeguro(editQtd);
    const unit = numeroSeguro(editUnitario);
    const total = qtd * unit;
    const dataEditada = paraISO(editData) || editData;

    const atualizados = carregarPedidosCompra().map(p => {
      if (p.id === pedidoEditando.id) {
        return {
          ...p,
          item_descricao: editItem,
          categoria: editCategoria,
          quantidade: qtd,
          unidade_medida: editUnidade,
          valor_unitario: unit,
          valor_total: total,
          data: dataEditada,
          observacoes: editObservacoes || undefined
        };
      }
      return p;
    });

    salvarPedidosCompra(atualizados);
    setPedidosCompra(atualizados);

    // Se existir lançamento programado vinculado (criado por outras telas), atualiza junto
    const pedidoAtualizado = atualizados.find(p => p.id === pedidoEditando.id);
    const despesasAtuais = carregarDespesas();
    if (pedidoAtualizado && despesasAtuais.some(d => ehDespesaProgramada(d) && vinculadaAoPedido(d, pedidoEditando.id))) {
      const parceiroNome = pedidoAtualizado.tipo_parceiro === 'AGRICULTOR'
        ? pedidoAtualizado.agricultor_nome
        : (pedidoAtualizado.fornecedor_fantasia || pedidoAtualizado.fornecedor_nome);
      salvarDespesas(despesasAtuais.map(d =>
        ehDespesaProgramada(d) && vinculadaAoPedido(d, pedidoEditando.id)
          ? {
              ...d,
              data: dataEditada,
              categoria: editCategoria,
              descricao: `[Programado] ${editItem} - ${parceiroNome || ''}`,
              valor: total
            }
          : d
      ));
    }
    setPedidoEditando(null);
    setMensagemFeedback('Pedido de compra e despesa programada atualizados com sucesso!');
    setTimeout(() => setMensagemFeedback(null), 5000);
  };

  // Ação: Excluir Pedido Programado (Se deletar, ele some!)
  const handleExcluirProgramado = (pedidoId: string) => {
    if (confirm('Deseja excluir este pedido de compra programado? Ele sumirá desta lista e de pedidos de compra.')) {
      const atualizados = carregarPedidosCompra().filter(p => p.id !== pedidoId);
      salvarPedidosCompra(atualizados);
      setPedidosCompra(atualizados);

      // Limpa também lançamentos programados vinculados, se houver
      removerProgramadasDoPedido(pedidoId);

      setMensagemFeedback('Pedido de compra e despesa programada excluídos com sucesso!');
      setTimeout(() => setMensagemFeedback(null), 5000);
    }
  };

  // Ação: Abrir Finalização de Compra (Quando comprar, virar despesa!)
  const abrirFinalizacaoCompra = (pedido: PedidoCompraGeral) => {
    setPedidoFinalizando(pedido);
    setProdutoFinalizacao(pedido.item_descricao || '');
    setValorTotalFinalizacao(pedido.valor_total ? pedido.valor_total.toString() : '');
    setCategoriaFinalizacao(pedido.categoria || 'Embalagens');
    setTipoFinalizacao('JA_PAGO');
    setDataFinalizacao(hojeISO());
    setFormaPagamentoFinalizacao(pedido.forma_pagamento || 'PIX');
    setObsFinalizacao('');
  };

  // Ação: Confirmar Finalização da Compra e Virar Despesa
  const handleConfirmarFinalizacaoCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoFinalizando) return;

    const itemEfetivado = produtoFinalizacao.trim() || pedidoFinalizando.item_descricao;
    const valTotal = parseFloat(valorTotalFinalizacao.replace(',', '.')) || numeroSeguro(pedidoFinalizando.valor_total);
    if (!(valTotal > 0)) {
      alert('Informe o valor total da compra.');
      return;
    }
    const dataEfetiva = paraISO(dataFinalizacao) || hojeISO();

    // 1. O lançamento programado anterior (desp_prog_*) deixa de existir
    removerProgramadasDoPedido(pedidoFinalizando.id);

    // 2. Efetivação única (mesma do Pedido de Compra): status do pedido, despesa paga OU título
    // a pagar, entrada no estoque de matéria-prima e baixa no caixa — sem duplicar
    const res = efetivarPedidoCompra(pedidoFinalizando.id, {
      tipo: tipoFinalizacao === 'JA_PAGO' ? 'JA_PAGO' : 'A_PAGAR',
      data: dataEfetiva,
      forma_pagamento: formaPagamentoFinalizacao,
      item_descricao: itemEfetivado,
      valor_total: valTotal,
      categoria: categoriaFinalizacao as CategoriaCompra,
      observacao: obsFinalizacao || undefined
    });
    if (!res.sucesso) {
      alert(res.mensagem);
      return;
    }
    setPedidosCompra(carregarPedidosCompra());
    setDespesas(carregarDespesas());

    window.dispatchEvent(new Event('financeiro_updated'));
    window.dispatchEvent(new Event('pedidos_compra_updated'));

    setPedidoFinalizando(null);
    setMensagemFeedback(`Pedido transformado em despesa com sucesso! Produto: "${itemEfetivado}" | Categoria: "${categoriaFinalizacao}" | Pagamento: ${formaPagamentoFinalizacao}`);
    setTimeout(() => setMensagemFeedback(null), 5000);
  };

  // Lançamento programado vinculado a um pedido de compra
  function vinculadaAoPedido(d: DespesaOperacional, pedidoId: string): boolean {
    const extra = d as DespesaOperacional & { pedido_compra_id?: string };
    return extra.pedido_compra_id === pedidoId || d.id === `desp_prog_${pedidoId}`;
  }

  function removerProgramadasDoPedido(pedidoId: string) {
    const atuais = carregarDespesas();
    const filtradas = atuais.filter(d => !(ehDespesaProgramada(d) && vinculadaAoPedido(d, pedidoId)));
    if (filtradas.length !== atuais.length) {
      salvarDespesas(filtradas);
      setDespesas(filtradas);
    }
  }

  // Gerar e Baixar PDF Oficial
  const gerarEBaixarPDF = (pedido: PedidoCompraGeral) => {
    try {
      setGerandoPdf(true);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const isAgro = pedido.tipo_parceiro === 'AGRICULTOR';
      const nome = isAgro ? pedido.agricultor_nome : pedido.fornecedor_nome;

      // Cabeçalho Grupo ENO
      pdf.setFillColor(6, 78, 59);
      pdf.roundedRect(15, 15, 12, 12, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(167, 243, 208);
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

      // Badge Pedido de Compra
      pdf.setFillColor(6, 78, 59);
      pdf.roundedRect(145, 15, 50, 7, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('PEDIDO DE COMPRA', 170, 19.5, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`Emissão: ${formatarDataBR(pedido.data)}`, 195, 28, { align: 'right' });

      // Dados do parceiro
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(15, 38, 180, 25, 2, 2, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(6, 78, 59);
      pdf.text(isAgro ? 'DADOS DO PRODUTOR RURAL' : 'DADOS DO FORNECEDOR', 19, 44);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`Nome: ${nome || 'Não informado'}`, 19, 50);
      pdf.text(`Local / Cidade: ${pedido.local_compra || (isAgro ? pedido.agricultor_cidade_uf : pedido.fornecedor_cidade_uf) || '—'}`, 19, 55);

      // Item e Valores
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text('PRODUTO / ITEM COMPRADO', 15, 71);

      pdf.setFillColor(241, 245, 249);
      pdf.rect(15, 74, 180, 7, 'FD');
      pdf.setFontSize(7.5);
      pdf.text('DESCRIÇÃO', 18, 78.5);
      pdf.text('QUANTIDADE', 125, 78.5, { align: 'right' });
      pdf.text('VALOR UNIT.', 158, 78.5, { align: 'right' });
      pdf.text('TOTAL', 191, 78.5, { align: 'right' });

      pdf.setFillColor(255, 255, 255);
      pdf.rect(15, 81, 180, 12, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(pedido.item_descricao, 18, 88);
      pdf.text(`${numeroSeguro(pedido.quantidade).toLocaleString('pt-BR')} ${pedido.unidade_medida}`, 125, 88, { align: 'right' });
      pdf.text(formatarMoeda(pedido.valor_unitario), 158, 88, { align: 'right' });
      pdf.text(formatarMoeda(pedido.valor_total), 191, 88, { align: 'right' });

      // Total a pagar
      pdf.setFillColor(236, 253, 245);
      pdf.setDrawColor(110, 231, 183);
      pdf.roundedRect(15, 98, 180, 12, 1.5, 1.5, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(6, 78, 59);
      pdf.text('TOTAL PREVISTO / A PAGAR:', 20, 105.5);
      pdf.setFontSize(13);
      pdf.text(formatarMoeda(pedido.valor_total), 190, 106, { align: 'right' });

      // Assinaturas
      const signY = 150;
      pdf.setDrawColor(148, 163, 184);
      pdf.line(25, signY, 90, signY);
      pdf.line(120, signY, 185, signY);
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Grupo ENO Alimentos', 57.5, signY + 5, { align: 'center' });
      pdf.text(nome || 'Fornecedor', 152.5, signY + 5, { align: 'center' });

      pdf.save(`Pedido_Compra_${(nome || 'Item').replace(/[^a-zA-Z0-9]/g, '_')}_${(paraISO(pedido.data) || 'sem-data')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO FINANCEIRO */}
      <FinanceiroNavTabs activeTab="financeiro_lancar_despesas" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COM ABAS INTEGRADAS: DESPESAS REALIZADAS vs DESPESAS PROGRAMADAS */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Lançamento e Programação de Despesas
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                Grupo ENO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {abaAtiva === 'REALIZADAS' ? (
              <button
                onClick={() => {
                  setFormDespesa({
                    data: hojeISO(),
                    categoria: 'Manutenção Mecânica & Peças',
                    descricao: '',
                    valor: 0,
                    setor: 'Fábrica & Moagem',
                    responsavel: '',
                    forma_pagamento: 'PIX'
                  });
                  setModalNovaDespesa(true);
                }}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
                  shadow-xs transition-all cursor-pointer
                "
              >
                <Plus className="w-4 h-4" />
                <span>+ Lançar Nova Despesa Realizada</span>
              </button>
            ) : (
              <button
                onClick={() => setModalNovoPedido(true)}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs
                  shadow-xs transition-all cursor-pointer
                "
              >
                <Plus className="w-4 h-4" />
                <span>+ Programar Compra (Despesa Programada)</span>
              </button>
            )}
          </div>
        </div>

        {/* STATS BARS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider">
              Despesas Realizadas no Mês
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {formatarMoeda(totalDespesasRealizadas)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {despesasRealizadasMes.length} despesas pagas no mês
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <span className="text-blue-900 font-semibold block text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Despesas Programadas (Pedidos de Compra)</span>
              <Clock className="w-3.5 h-3.5 text-blue-700" />
            </span>
            <span className="font-mono font-black text-blue-950 text-sm">
              {formatarMoeda(totalDespesasProgramadas)}
            </span>
            <span className="text-[10px] text-blue-700 font-semibold block mt-0.5">
              {pedidosProgramados.length} compras a lembrar / realizar
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-emerald-900 font-semibold block text-[11px] uppercase tracking-wider">
              Previsão Total (Realizado no Mês + Programado)
            </span>
            <span className="font-mono font-black text-emerald-950 text-sm">
              {formatarMoeda(totalDespesasRealizadas + totalDespesasProgramadas)}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
              Planejamento orçamentário fabril
            </span>
          </div>
        </div>

        {/* SELETOR DE ABAS PRINCIPAIS */}
        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
          <button
            onClick={() => setAbaAtiva('REALIZADAS')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
              ${abaAtiva === 'REALIZADAS'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }
            `}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Despesas Realizadas ({despesasRealizadas.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('PROGRAMADAS')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
              ${abaAtiva === 'PROGRAMADAS'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }
            `}
          >
            <Clock className="w-4 h-4 text-blue-200" />
            <span>Despesas Programadas — Pedidos de Compra ({pedidosProgramados.length})</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK MENSAGEM */}
      {mensagemFeedback && (
        <div className="mx-6 my-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900 font-bold animate-in fade-in">
          <span>{mensagemFeedback}</span>
          <button onClick={() => setMensagemFeedback(null)} className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. BARRA DE BUSCA */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              abaAtiva === 'REALIZADAS'
                ? "Buscar por Descrição, Categoria ou Responsável..."
                : "Buscar em Pedidos Programados por Item, Fornecedor ou Categoria..."
            }
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>
        {abaAtiva === 'PROGRAMADAS' && (
          <span className="text-[11px] font-semibold text-blue-900 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-lg">
            Sincronizado automaticamente com a página de Pedidos de Compra
          </span>
        )}
      </div>

      {/* 4. CONTEÚDO DA TABELA CONFORME ABA SELECIONADA */}
      <div className="flex-1 p-6 overflow-y-auto">
        {abaAtiva === 'REALIZADAS' ? (
          /* TABELA 1: DESPESAS REALIZADAS */
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5">Data</th>
                  <th className="py-3 px-4">Descrição da Despesa</th>
                  <th className="py-3 px-4">Categoria & Setor</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Forma Pagto</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {despesasRealizadasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      Nenhuma despesa realizada encontrada para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  despesasRealizadasFiltradas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-600 font-bold whitespace-nowrap">
                        {formatarDataBR(item.data)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.descricao}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{item.categoria}</div>
                        <div className="text-[10px] text-slate-400">{item.setor}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {item.responsavel}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.forma_pagamento}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-right whitespace-nowrap">
                        {formatarMoeda(item.valor)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleExcluirDespesa(item.id)}
                          className="p-1 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                          title="Excluir Despesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TABELA 2: DESPESAS PROGRAMADAS (PEDIDOS DE COMPRA) */
          <div className="bg-white rounded-xl border border-blue-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50/70 text-blue-900 border-b border-blue-200 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5">Data Prevista</th>
                  <th className="py-3 px-4">Item / Produto a Comprar</th>
                  <th className="py-3 px-4">Fornecedor / Produtor</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Valor Estimado</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pedidosProgramadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhum pedido de compra programado no momento. Use o botão <strong>"+ Programar Compra"</strong> para registrar itens que a fábrica precisa lembrar de comprar.
                    </td>
                  </tr>
                ) : (
                  pedidosProgramadosFiltrados.map((pedido) => {
                    const parceiroNome = pedido.tipo_parceiro === 'AGRICULTOR' 
                      ? pedido.agricultor_nome 
                      : (pedido.fornecedor_fantasia || pedido.fornecedor_nome);

                    return (
                      <tr key={pedido.id} className="hover:bg-blue-50/30 transition-colors group">
                        {/* Data */}
                        <td className="py-3.5 px-5 font-mono text-slate-700 font-bold whitespace-nowrap">
                          {formatarDataBR(pedido.data)}
                        </td>

                        {/* Item */}
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 text-xs">
                            {pedido.item_descricao}
                          </div>
                          {pedido.observacoes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              Obs: {pedido.observacoes}
                            </div>
                          )}
                        </td>

                        {/* Fornecedor */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {pedido.tipo_parceiro === 'AGRICULTOR' ? (
                              <Tractor className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            )}
                            <span>{parceiroNome || 'Não especificado'}</span>
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {pedido.categoria === 'Embalagens' && <Package className="w-3 h-3 text-blue-700" />}
                            {pedido.categoria === 'Manutenção & Peças' && <Wrench className="w-3 h-3 text-slate-700" />}
                            {pedido.categoria === 'Combustível & Lubrificantes' && <Fuel className="w-3 h-3 text-orange-700" />}
                            {pedido.categoria === 'Mandioca / Matéria-Prima' && <Sprout className="w-3 h-3 text-emerald-700" />}
                            {pedido.categoria === 'Químicos & Laboratório' && <FlaskConical className="w-3 h-3 text-purple-700" />}
                            {pedido.categoria === 'Mercado / Cozinha / Copa' && <UtensilsCrossed className="w-3 h-3 text-amber-700" />}
                            <span>{(pedido.categoria || '').split('/')[0]}</span>
                          </span>
                        </td>

                        {/* Valor Estimado */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          {formatarMoeda(pedido.valor_total)}
                        </td>

                        {/* Status com botão Virar Despesa */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              <Clock className="w-3 h-3 text-blue-700" />
                              <span>Programado</span>
                            </span>
                            <button
                              onClick={() => abrirFinalizacaoCompra(pedido)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-black text-[11px] shadow-sm transition-all cursor-pointer hover:scale-105"
                              title="Transformar este pedido de compra em despesa financeira"
                            >
                              <ArrowRightCircle className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Virar Despesa</span>
                            </button>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Visualizar e Imprimir Folha A4 */}
                            <button
                              onClick={() => setPedidoVisualizarA4(pedido)}
                              className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                              title="Imprimir Pedido de Compra (Folha A4 Grupo ENO)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Editar Pedido Programado */}
                            <button
                              onClick={() => abrirEdicaoProgramado(pedido)}
                              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar Pedido (se editar, edita no pedido e na despesa programada)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Baixar PDF */}
                            <button
                              onClick={() => gerarEBaixarPDF(pedido)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Baixar PDF Oficial"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Excluir Pedido Programado */}
                            <button
                              onClick={() => handleExcluirProgramado(pedido.id)}
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
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: LANÇAR NOVA DESPESA OPERACIONAL DIRETA           */}
      {/* ========================================================= */}
      {modalNovaDespesa && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl sm:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-900/60 border border-red-700 flex items-center justify-center text-red-300">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Lançar Despesa Operacional Realizada</h3>
                  <p className="text-[11px] text-slate-400">Gastos já efetuados na fábrica, combustível, peças e insumos</p>
                </div>
              </div>
              <button onClick={() => setModalNovaDespesa(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarDespesaDireta} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data da Despesa</label>
                  <input
                    type="date"
                    required
                    value={paraISO(formDespesa.data)}
                    onChange={(e) => setFormDespesa({ ...formDespesa, data: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor do Gasto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formDespesa.valor || ''}
                    onChange={(e) => setFormDespesa({ ...formDespesa, valor: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-red-700 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Setor Fabril</label>
                  <select
                    value={formDespesa.setor}
                    onChange={(e) => setFormDespesa({ ...formDespesa, setor: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="Fábrica & Moagem">Fábrica & Moagem</option>
                    <option value="Secador & Caldeira">Secador & Caldeira</option>
                    <option value="Frotas & Logística">Frotas & Logística</option>
                    <option value="Administrativo & TI">Administrativo & TI</option>
                    <option value="Qualidade & Laboratório">Qualidade & Laboratório</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Responsável / Solicitante</label>
                  <input
                    type="text"
                    required
                    value={formDespesa.responsavel}
                    onChange={(e) => setFormDespesa({ ...formDespesa, responsavel: e.target.value })}
                    placeholder="Nome do colaborador"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">Descrição Detalhada do Gasto</label>
                  <input
                    type="text"
                    required
                    value={formDespesa.descricao}
                    onChange={(e) => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                    placeholder="Ex: Óleo lubrificante ISO 68 para redutor do moinho / Reparo elétrico"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovaDespesa(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Gravar Despesa Realizada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: PROGRAMAR NOVO PEDIDO DE COMPRA                  */}
      {/* ========================================================= */}
      {modalNovoPedido && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col my-auto overflow-hidden">
            <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between border-b border-blue-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-800 border border-blue-700 flex items-center justify-center text-blue-200">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Programar Pedido de Compra (Despesa Programada)</h3>
                  <p className="text-[11px] text-blue-200">Lembrete e planejamento de compras de embalagens, peças e insumos</p>
                </div>
              </div>
              <button onClick={() => setModalNovoPedido(false)} className="p-1.5 rounded-lg hover:bg-blue-800 text-blue-300 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoPedidoProgramado} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Parceiro</label>
                  <select
                    value={novoTipoParceiro}
                    onChange={(e) => setNovoTipoParceiro(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-700"
                  >
                    <option value="FORNECEDOR">Fornecedor Cadastrado</option>
                    <option value="AGRICULTOR">Produtor Rural / Mandioca</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {novoTipoParceiro === 'FORNECEDOR' ? 'Selecione o Fornecedor' : 'Selecione o Produtor Rural'}
                  </label>
                  {novoTipoParceiro === 'FORNECEDOR' ? (
                    <select
                      value={novoParceiroId}
                      onChange={(e) => setNovoParceiroId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-700"
                    >
                      {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.fantasia || f.razao_nome} (CNPJ: {f.cpf_cnpj})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={novoParceiroId}
                      onChange={(e) => setNovoParceiroId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-700"
                    >
                      {agricultores.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nome_completo} — {a.nome_propriedade}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Prevista da Compra *</label>
                  <input
                    type="date"
                    required
                    value={paraISO(novoData)}
                    onChange={(e) => setNovoData(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Estimado / Total (R$) *</label>
                  <input
                    type="text"
                    required
                    value={novoValorTotal}
                    onChange={(e) => setNovoValorTotal(e.target.value)}
                    placeholder="Ex: 1500,00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Descrição / O que precisamos comprar *</label>
                  <textarea
                    required
                    rows={2}
                    value={novoItem}
                    onChange={(e) => setNovoItem(e.target.value)}
                    placeholder="Ex: Sacaria plástica 1kg para empacotamento, troca da correia transportadora..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-900 focus:outline-none focus:border-blue-700 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Programação Simplificada de Compra</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    A <strong>Categoria Financeira</strong> e a <strong>Forma de Pagamento (PIX / Dinheiro)</strong> serão definidas no momento em que você clicar em <strong>Finalizar Compra</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoPedido(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Gravar Pedido Programado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDITAR PEDIDO DE COMPRA PROGRAMADO               */}
      {/* ========================================================= */}
      {pedidoEditando && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col my-auto overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-800 border border-blue-700 flex items-center justify-center text-blue-200">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Editar Pedido de Compra / Despesa Programada</h3>
                  <p className="text-[11px] text-slate-400">As alterações serão sincronizadas tanto aqui quanto na tela de Pedidos de Compra</p>
                </div>
              </div>
              <button onClick={() => setPedidoEditando(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoProgramado} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Item / Descrição do Produto</label>
                  <input
                    type="text"
                    required
                    value={editItem}
                    onChange={(e) => setEditItem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria da Compra</label>
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-700"
                  >
                    <option value="Embalagens">Embalagens</option>
                    <option value="Manutenção & Peças">Manutenção & Peças</option>
                    <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
                    <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                    <option value="Químicos & Laboratório">Químicos & Laboratório</option>
                    <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
                    <option value="Limpeza & Escritório">Limpeza & Escritório</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Prevista</label>
                  <input
                    type="date"
                    required
                    value={paraISO(editData)}
                    onChange={(e) => setEditData(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editQtd}
                    onChange={(e) => setEditQtd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={editUnidade}
                    onChange={(e) => setEditUnidade(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-700"
                  >
                    <option value="Unidades">Unidades (UN)</option>
                    <option value="KG">KG (Quilogramas)</option>
                    <option value="Sacos">Sacos (SC)</option>
                    <option value="Litros">Litros (L)</option>
                    <option value="Caixas">Caixas (CX)</option>
                    <option value="Fardos">Fardos (FD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editUnitario}
                    onChange={(e) => setEditUnitario(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="p-3 rounded-xl bg-blue-900 text-white flex flex-col justify-center">
                  <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                    Total Recalculado
                  </span>
                  <span className="text-base font-black font-mono text-white">
                    {formatarMoeda(numeroSeguro(editQtd) * numeroSeguro(editUnitario))}
                  </span>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">Observações</label>
                  <input
                    type="text"
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPedidoEditando(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
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
      {/* MODAL 4: EFETIVAR COMPRA E VIRAR DESPESA                   */}
      {/* ========================================================= */}
      {pedidoFinalizando && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <ArrowRightCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Efetivar Pedido de Compra e Virar Despesa</h3>
                  <p className="text-[11px] text-slate-400">Edite o produto comprado, categoria contábil e forma de pagamento para integrar ao Financeiro</p>
                </div>
              </div>
              <button onClick={() => setPedidoFinalizando(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarFinalizacaoCompra} className="p-6 space-y-4 text-xs">
              {/* Resumo do Pedido */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parceiro / Fornecedor:</div>
                  <div className="font-bold text-slate-900 text-xs">
                    {pedidoFinalizando.tipo_parceiro === 'AGRICULTOR' 
                      ? pedidoFinalizando.agricultor_nome 
                      : (pedidoFinalizando.fornecedor_fantasia || pedidoFinalizando.fornecedor_nome)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Programada:</div>
                  <div className="font-mono font-bold text-slate-700">{pedidoFinalizando.data}</div>
                </div>
              </div>

              {/* EDIÇÃO DA COMPRA EFETIVADA (A DESCRIÇÃO VIRA PRODUTO QUE FOI COMPRADO, CATEGORIA E FORMA DE PAGAMENTO) */}
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3.5">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-emerald-200/60 font-black text-xs text-emerald-950 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-emerald-800" />
                  <span>1. Dados da Compra Efetivada</span>
                </div>

                {/* Produto Comprado (Descrição inicial vira produto) */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    Produto / Item Comprado * <span className="text-emerald-700 font-semibold">(A descrição vira o produto que foi comprado)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={produtoFinalizacao}
                    onChange={(e) => setProdutoFinalizacao(e.target.value)}
                    placeholder="Ex: 5.000 Sacos de Ráfia / Rolamento 6205 / Óleo Lubrificante..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-700 text-xs shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Categoria */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">Categoria Contábil *</label>
                    <select
                      value={categoriaFinalizacao}
                      onChange={(e) => setCategoriaFinalizacao(e.target.value as CategoriaCompra)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-700 cursor-pointer text-xs shadow-2xs"
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
                    <label className="block font-bold text-slate-800 mb-1 text-xs">Forma de Pagamento *</label>
                    <select
                      value={formaPagamentoFinalizacao}
                      onChange={(e) => setFormaPagamentoFinalizacao(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer text-xs shadow-2xs"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Boleto Bancário">Boleto Bancário</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Transferência Bancária">Transferência Bancária</option>
                    </select>
                  </div>

                  {/* Valor Final */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">Valor Final (R$) *</label>
                    <input
                      type="text"
                      required
                      value={valorTotalFinalizacao}
                      onChange={(e) => setValorTotalFinalizacao(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-black text-emerald-900 text-xs focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SITUAÇÃO DA LIQUIDAÇÃO */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 text-xs">2. Situação do Pagamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoFinalizacao('JA_PAGO')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      tipoFinalizacao === 'JA_PAGO'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Já Pago no Ato (Despesa Paga)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFinalizacao('A_PAGAR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      tipoFinalizacao === 'A_PAGAR'
                        ? 'bg-blue-800 text-white border-blue-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Faturado a Prazo (Contas a Pagar)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {tipoFinalizacao === 'JA_PAGO' ? 'Data do Pagamento Efetuado *' : 'Data de Vencimento *'}
                </label>
                <input
                  type="date"
                  required
                  value={paraISO(dataFinalizacao)}
                  onChange={(e) => setDataFinalizacao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPedidoFinalizando(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowRightCircle className="w-4 h-4 text-emerald-300" />
                  <span>Confirmar & Virar Despesa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: VISUALIZAR E IMPRIMIR FOLHA A4 OFICIAL           */}
      {/* ========================================================= */}
      {pedidoVisualizarA4 && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col my-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-700 bg-slate-800 text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-700 text-white font-black flex items-center justify-center text-xs">
                  ENO
                </div>
                <h3 className="font-bold text-sm text-slate-100">
                  Folha A4 — Pedido de Compra Oficial
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => gerarEBaixarPDF(pedidoVisualizarA4)}
                  disabled={gerandoPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir A4</span>
                </button>
                <button
                  onClick={() => setPedidoVisualizarA4(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Espelho Folha A4 */}
            <div className="flex-1 p-4 bg-slate-900 flex items-center justify-center overflow-auto">
              <div className="bg-white text-slate-900 p-6 rounded shadow-xl border border-slate-300 w-full max-w-[650px] aspect-[210/297] flex flex-col justify-between text-xs select-text">
                {/* Cabeçalho */}
                <div className="flex items-start justify-between border-b-2 border-emerald-950 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-900 text-emerald-300 font-black flex items-center justify-center text-[10px]">
                        ENO
                      </div>
                      <h1 className="text-sm font-black text-emerald-950 uppercase">
                        Grupo ENO Alimentos
                      </h1>
                    </div>
                    <div className="text-[10px] text-slate-600">Grupo ENO Indústria e Comércio de Produtos Alimentícios Ltda</div>
                    <div className="text-[9px] text-slate-500">CNPJ: 45.981.234/0001-90 | IE: 908.412.301-12</div>
                    <div className="text-[9px] text-slate-500">Distrito Industrial — Jacarezinho / PR | Tel: (43) 3511-9000</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 bg-emerald-900 text-white font-black text-[10px] rounded uppercase">
                      Pedido de Compra
                    </span>
                    <div className="text-xs font-bold text-slate-800 mt-1">Data: {formatarDataBR(pedidoVisualizarA4.data)}</div>
                  </div>
                </div>

                {/* Fornecedor */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 my-2">
                  <div className="text-[10px] font-black uppercase text-emerald-900 pb-1 border-b border-slate-200 mb-1">
                    {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? 'Dados do Produtor Rural' : 'Dados do Fornecedor'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Nome: <strong>{pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_nome : pedidoVisualizarA4.fornecedor_nome}</strong></div>
                    <div>Doc: <strong className="font-mono">{pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_cpf_cnpj : pedidoVisualizarA4.fornecedor_cnpj}</strong></div>
                    <div>Local: <strong>{pedidoVisualizarA4.local_compra || (pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_cidade_uf : pedidoVisualizarA4.fornecedor_cidade_uf)}</strong></div>
                    <div>Forma de Pagto: <strong>{pedidoVisualizarA4.forma_pagamento}</strong></div>
                  </div>
                </div>

                {/* Tabela do Item */}
                <div className="my-2 flex-1">
                  <div className="bg-slate-100 p-1.5 border border-slate-300 font-bold text-[10px] text-slate-700 flex justify-between uppercase">
                    <span className="w-1/2">Item / Descrição</span>
                    <span className="w-1/6 text-right">Qtd</span>
                    <span className="w-1/6 text-right">Unitário</span>
                    <span className="w-1/6 text-right">Total</span>
                  </div>
                  <div className="p-2 border-x border-b border-slate-200 flex justify-between font-medium">
                    <span className="w-1/2 font-bold text-slate-900">{pedidoVisualizarA4.item_descricao}</span>
                    <span className="w-1/6 text-right font-mono">{numeroSeguro(pedidoVisualizarA4.quantidade).toLocaleString('pt-BR')} {pedidoVisualizarA4.unidade_medida}</span>
                    <span className="w-1/6 text-right font-mono">{formatarMoeda(pedidoVisualizarA4.valor_unitario)}</span>
                    <span className="w-1/6 text-right font-mono font-bold text-slate-900">{formatarMoeda(pedidoVisualizarA4.valor_total)}</span>
                  </div>

                  <div className="mt-4 p-2.5 rounded bg-emerald-50 border border-emerald-300 flex justify-between items-center">
                    <span className="font-bold text-emerald-950 uppercase text-[10px]">Total a Pagar / Previsto:</span>
                    <span className="font-mono font-black text-emerald-950 text-base">
                      {formatarMoeda(pedidoVisualizarA4.valor_total)}
                    </span>
                  </div>
                </div>

                {/* Assinaturas */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[10px]">
                  <div>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      Grupo ENO Alimentos
                    </div>
                    <div className="text-slate-400">{pedidoVisualizarA4.comprador_nome || 'Gestão de Suprimentos'}</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      {pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_nome : pedidoVisualizarA4.fornecedor_nome}
                    </div>
                    <div className="text-slate-400">Fornecedor / Emitente</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
