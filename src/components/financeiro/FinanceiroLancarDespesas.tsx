import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import { jsPDF } from 'jspdf';
import { Plus, Trash2, Save, X, Printer, Download, Pencil, Loader2, ArrowRightCircle } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import {
  ModalFolha, Campo, GrupoForm, campo, campoArea, FaixaFin, ListaCartoes, ItemCartao, moedaSemSimbolo,
  botaoLinhaPrimario, botaoLinhaIcone, botaoLinhaExcluir,
} from './finUi';
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
  conferirSaldoParaPagar,
  estornarBaixaNoCaixa
} from '../../data/financeiroData';
import { carregarAgricultores, carregarFornecedores, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { hojeISO, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import {
  PedidoCompraGeral,
  carregarPedidosCompra,
  salvarPedidosCompra,
  efetivarPedidoCompra,
  UNIDADES_PEDIDO_COMPRA,
  lerNumeroBR,
  formatarDecimalBR,
  pedidoCompraDaDespesa,
  estornarPagamentoPedidoCompra,
  Agricultor,
  Fornecedor,
  CategoriaCompra,
  StatusPedidoCompra
} from '../../data/mockStore';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';
import { carregarCalculosNaRoca, definirPagamentoCalculoRoca, excluirCalculoNaRoca, estornarPagamentoCalculoRoca } from '../../data/calculoRocaData';

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
    // Despesa paga só sai se o caixa tiver saldo
    const semSaldo = conferirSaldoParaPagar(nova.valor);
    if (semSaldo) {
      alert(semSaldo);
      return;
    }
    salvarDespesas([nova, ...carregarDespesas()]);
    // Despesa realizada já foi paga: sai do caixa uma única vez
    registrarBaixaNoCaixa(`despesa:${nova.id}`, -nova.valor, { descricao: `${nova.descricao}${nova.categoria ? ` (${nova.categoria})` : ''}`, data: nova.data });
    setModalNovaDespesa(false);
    setMensagemFeedback('Despesa operacional lançada com sucesso!');
    setTimeout(() => setMensagemFeedback(null), 5000);
  };

  // Ação: Excluir Despesa Direta
  const handleExcluirDespesa = (id: string) => {
    // Despesa de pedido de compra: excluir = estornar o pagamento do pedido (não deixa o pedido "Pago")
    const despesa = carregarDespesas().find(d => d.id === id);
    const pedidoId = pedidoCompraDaDespesa(despesa as (DespesaOperacional & { pedido_compra_id?: string }) | undefined);
    const pedido = pedidoId ? carregarPedidosCompra().find(p => p.id === pedidoId) : undefined;
    if (pedido) {
      const calculo = carregarCalculosNaRoca().find(c => c.pedido_compra_id === pedido.id);
      const aviso =
        `Esta despesa é o pagamento do pedido de compra "${pedido.item_descricao}".\n\n` +
        'Ao excluir:\n' +
        '• o valor pago volta para o caixa;\n' +
        '• o saldo em aberto no Contas a Pagar deste pedido (se houver) também é removido;\n' +
        `• o pedido volta para "A Confirmar" (sem pagamento)${calculo ? ` e a pesagem ${calculo.numero_ticket} volta a "Definir Pagamento"` : ''};\n` +
        '• a entrada no estoque de matéria-prima já lançada é mantida (não duplica ao finalizar de novo).\n\n' +
        'Deseja continuar?';
      if (!confirm(aviso)) return;
      const res = calculo ? estornarPagamentoCalculoRoca(calculo.id) : estornarPagamentoPedidoCompra(pedido.id);
      if (!res.sucesso) {
        alert(res.mensagem);
        return;
      }
      recarregar();
      window.dispatchEvent(new Event('pedidos_compra_updated'));
      setMensagemFeedback(res.mensagem);
      setTimeout(() => setMensagemFeedback(null), 6000);
      return;
    }
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
    const qtd = lerNumeroBR(novoQtd);
    if (!(qtd > 0)) {
      alert('Informe a quantidade do pedido.');
      return;
    }
    const total = lerNumeroBR(novoValorTotal) || (qtd * lerNumeroBR(novoUnitario)) || 0;
    if (total <= 0) {
      alert('Informe um valor estimado maior que zero.');
      return;
    }
    const unitario = parseFloat((total / qtd).toFixed(4));
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
        quantidade: qtd,
        unidade_medida: novoUnidade,
        valor_unitario: unitario,
        valor_total: parseFloat(total.toFixed(2)),
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
        quantidade: qtd,
        unidade_medida: novoUnidade,
        valor_unitario: unitario,
        valor_total: parseFloat(total.toFixed(2)),
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
    setNovoQtd('1');
    setNovoUnidade('Unidades');
    setNovoUnitario('');
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

    const qtd = lerNumeroBR(editQtd);
    const unit = lerNumeroBR(editUnitario);
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
      // Pedido gerado pelo Cálculo na Roça: exclui junto a pesagem (sem deixar pesagem órfã)
      const calculo = carregarCalculosNaRoca().find(c => c.pedido_compra_id === pedidoId);
      if (calculo) {
        const res = excluirCalculoNaRoca(calculo.id);
        setPedidosCompra(carregarPedidosCompra());
        if (!res.sucesso) alert(res.mensagem);
        setMensagemFeedback(res.mensagem);
        setTimeout(() => setMensagemFeedback(null), 5000);
        return;
      }
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
    // Aceita "1.500,00", "1500,00" e "1500.00"
    const textoValor = valorTotalFinalizacao.trim();
    const valTotal = parseFloat(textoValor.includes(',') ? textoValor.replace(/\./g, '').replace(',', '.') : textoValor) || numeroSeguro(pedidoFinalizando.valor_total);
    if (!(valTotal > 0)) {
      alert('Informe o valor total da compra.');
      return;
    }
    const dataEfetiva = paraISO(dataFinalizacao) || hojeISO();

    // Pagamento à vista só sai se o caixa tiver saldo (antes de mexer em qualquer lançamento)
    if (tipoFinalizacao === 'JA_PAGO') {
      const semSaldo = conferirSaldoParaPagar(valTotal);
      if (semSaldo) {
        alert(semSaldo);
        return;
      }
    }

    // 1. O lançamento programado anterior (desp_prog_*) deixa de existir
    removerProgramadasDoPedido(pedidoFinalizando.id);

    // 2. Efetivação única (mesma do Pedido de Compra): status do pedido, despesa paga OU título
    // a pagar, entrada no estoque de matéria-prima e baixa no caixa — sem duplicar
    // Pedido do Cálculo na Roça: define o pagamento pela pesagem (situação da pesagem e extrato do agricultor)
    const calculoRoca = carregarCalculosNaRoca().find(c => c.pedido_compra_id === pedidoFinalizando.id);
    const res = calculoRoca
      ? definirPagamentoCalculoRoca(
          calculoRoca.id,
          {
            tipo: tipoFinalizacao === 'JA_PAGO' ? 'JA_PAGO' : 'A_PAGAR',
            forma_pagamento: formaPagamentoFinalizacao,
            data_pagamento_ou_vencimento: dataEfetiva,
            valor_pago: tipoFinalizacao === 'JA_PAGO' ? valTotal : 0,
            saldo_restante: tipoFinalizacao === 'JA_PAGO' ? 0 : valTotal,
            observacao: obsFinalizacao || undefined
          },
          { item_descricao: itemEfetivado, valor_total: valTotal, categoria: categoriaFinalizacao as CategoriaCompra }
        )
      : efetivarPedidoCompra(pedidoFinalizando.id, {
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

  const abrirNovaDespesa = () => {
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
  };

  const nomeParceiro = (p: PedidoCompraGeral) =>
    p.tipo_parceiro === 'AGRICULTOR' ? p.agricultor_nome : (p.fornecedor_fantasia || p.fornecedor_nome);

  const realizadas = abaAtiva === 'REALIZADAS';
  const listaVazia = realizadas ? despesasRealizadasFiltradas.length === 0 : pedidosProgramadosFiltrados.length === 0;
  const temAlgo = realizadas ? despesasRealizadas.length > 0 : pedidosProgramados.length > 0;

  const botaoPrincipal = realizadas ? (
    <BotaoPrimario onClick={abrirNovaDespesa} className="w-full sm:w-auto h-11 sm:h-9">
      <Plus className="w-4 h-4" /> Lançar despesa
    </BotaoPrimario>
  ) : (
    <BotaoPrimario onClick={() => setModalNovoPedido(true)} className="w-full sm:w-auto h-11 sm:h-9">
      <Plus className="w-4 h-4" /> Programar compra
    </BotaoPrimario>
  );

  const selectCampo = `${campo} cursor-pointer`;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_lancar_despesas" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Despesas"
            resumo={
              <>
                <span className="font-semibold text-tinta-2">
                  {despesasRealizadasMes.length} {despesasRealizadasMes.length === 1 ? 'paga no mês' : 'pagas no mês'}
                </span>
                <span> · {pedidosProgramados.length} {pedidosProgramados.length === 1 ? 'compra programada' : 'compras programadas'}</span>
              </>
            }
            acoes={botaoPrincipal}
          />

          <div className="px-4 sm:px-6 pb-4">
            <FaixaFin colunas="lg:grid-cols-[1.45fr_1fr_1fr]">
              <CardNumero destaque rotulo="Pago no mês" unidade="R$" unidadeAntes valor={moedaSemSimbolo(totalDespesasRealizadas)}
                detalhe={`${despesasRealizadasMes.length} ${despesasRealizadasMes.length === 1 ? 'despesa' : 'despesas'}`} />
              <CardNumero rotulo="Programado" unidade="R$" unidadeAntes valor={moedaSemSimbolo(totalDespesasProgramadas)}
                detalhe={`${pedidosProgramados.length} a comprar`}
                onClick={pedidosProgramados.length > 0 && realizadas ? () => setAbaAtiva('PROGRAMADAS') : undefined} />
              <CardNumero rotulo="Previsão total" unidade="R$" unidadeAntes valor={moedaSemSimbolo(totalDespesasRealizadas + totalDespesasProgramadas)}
                detalhe="Pago no mês + programado" />
            </FaixaFin>
          </div>

          {mensagemFeedback && (
            <div role="status" className="mx-4 sm:mx-6 mb-3 flex items-start justify-between gap-3 rounded-md border border-st-pago/30 bg-st-pago-bg px-3.5 py-2.5 text-[13px] font-semibold text-st-pago">
              <span className="min-w-0">{mensagemFeedback}</span>
              <button type="button" onClick={() => setMensagemFeedback(null)} aria-label="Fechar aviso"
                className="shrink-0 -my-1.5 -mr-1.5 inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/50 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <BarraFiltros>
            <Segmentado<'REALIZADAS' | 'PROGRAMADAS'>
              rotuloAria="Tipo de despesa"
              valor={abaAtiva}
              onChange={setAbaAtiva}
              opcoes={[
                { valor: 'REALIZADAS', rotulo: 'Realizadas', contagem: despesasRealizadas.length },
                { valor: 'PROGRAMADAS', rotulo: 'Compras programadas', contagem: pedidosProgramados.length },
              ]}
            />
            <CampoBusca
              valor={busca}
              onChange={setBusca}
              placeholder={realizadas ? 'Buscar descrição, categoria ou responsável' : 'Buscar item, fornecedor ou categoria'}
              className="w-full md:w-80"
            />
          </BarraFiltros>

          <div className="px-4 sm:px-6 pb-6">
            {!realizadas && pedidosProgramados.length > 0 && (
              <p className="mb-2 text-[12px] text-cinza">Mesma lista da tela Pedidos de compra: o que mudar aqui muda lá.</p>
            )}

            {listaVazia ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio
                  titulo={
                    temAlgo
                      ? 'Nada encontrado com essa busca'
                      : realizadas ? 'Nenhuma despesa paga ainda' : 'Nenhuma compra programada'
                  }
                  texto={
                    temAlgo
                      ? 'Confira o termo digitado ou limpe a busca.'
                      : realizadas
                      ? 'Lance aqui o que já foi pago: peças, combustível, insumos. O valor sai do caixa na hora.'
                      : 'Programe o que a fábrica precisa comprar. Quando a compra acontecer, use "Virar despesa".'
                  }
                  acao={temAlgo ? <BotaoSecundario onClick={() => setBusca('')}>Limpar busca</BotaoSecundario> : botaoPrincipal}
                />
              </div>
            ) : realizadas ? (
              <>
                <ListaCartoes>
                  {despesasRealizadasFiltradas.map(item => (
                    <ItemCartao key={item.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{formatarDataBR(item.data)} · {item.categoria}</div>
                          <div className="text-[14px] font-bold text-tinta line-clamp-2">{item.descricao}</div>
                        </div>
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta whitespace-nowrap">{formatarMoeda(item.valor)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-[12px] text-cinza truncate">{[item.setor, item.responsavel, item.forma_pagamento].filter(Boolean).join(' · ')}</span>
                        <button type="button" onClick={() => handleExcluirDespesa(item.id)} className={botaoLinhaExcluir} aria-label="Excluir despesa" title="Excluir despesa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </ItemCartao>
                  ))}
                </ListaCartoes>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Data</Th>
                      <Th>Descrição</Th>
                      <Th>Categoria e setor</Th>
                      <Th>Responsável</Th>
                      <Th>Pagamento</Th>
                      <Th numero>Valor</Th>
                      <Th className="text-right">Ação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasRealizadasFiltradas.map(item => (
                      <tr key={item.id} className={tabela.tr}>
                        <Td className="whitespace-nowrap tabular-nums">{formatarDataBR(item.data)}</Td>
                        <Td className="font-semibold text-tinta max-w-[360px]">{item.descricao}</Td>
                        <Td>
                          <div>{item.categoria}</div>
                          <div className="text-[11.5px] text-cinza">{item.setor}</div>
                        </Td>
                        <Td>{item.responsavel}</Td>
                        <Td className="whitespace-nowrap">{item.forma_pagamento}</Td>
                        <Td numero><span className="font-bold text-tinta text-[13.5px]">{formatarMoeda(item.valor)}</span></Td>
                        <Td className="text-right">
                          <button type="button" onClick={() => handleExcluirDespesa(item.id)} className={botaoLinhaExcluir} title="Excluir despesa" aria-label="Excluir despesa">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TabelaDados>
              </>
            ) : (
              <>
                <ListaCartoes>
                  {pedidosProgramadosFiltrados.map(pedido => (
                    <ItemCartao key={pedido.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{formatarDataBR(pedido.data)} · {(pedido.categoria || '').split('/')[0].trim()}</div>
                          <div className="text-[14px] font-bold text-tinta line-clamp-2">{pedido.item_descricao}</div>
                          <div className="text-[12px] text-cinza truncate">
                            {pedido.tipo_parceiro === 'AGRICULTOR' ? 'Produtor' : 'Fornecedor'}: {nomeParceiro(pedido) || 'não especificado'}
                          </div>
                        </div>
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta whitespace-nowrap">{formatarMoeda(pedido.valor_total)}</span>
                      </div>
                      {pedido.observacoes && <p className="mt-1 text-[12px] text-cinza line-clamp-2">Obs.: {pedido.observacoes}</p>}
                      <div className="flex items-center gap-1 mt-2.5">
                        <button type="button" onClick={() => abrirFinalizacaoCompra(pedido)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-eno-800 text-white text-[13px] font-semibold active:bg-eno-900">
                          <ArrowRightCircle className="w-4 h-4" /> Virar despesa
                        </button>
                        <button type="button" onClick={() => abrirEdicaoProgramado(pedido)} className={botaoLinhaIcone} aria-label="Editar pedido"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setPedidoVisualizarA4(pedido)} className={botaoLinhaIcone} aria-label="Ver folha A4"><Printer className="w-4 h-4" /></button>
                        <button type="button" onClick={() => gerarEBaixarPDF(pedido)} className={botaoLinhaIcone} aria-label="Baixar PDF"><Download className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleExcluirProgramado(pedido.id)} className={botaoLinhaExcluir} aria-label="Excluir pedido"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </ItemCartao>
                  ))}
                </ListaCartoes>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Data prevista</Th>
                      <Th>Item a comprar</Th>
                      <Th>Fornecedor ou produtor</Th>
                      <Th>Categoria</Th>
                      <Th numero>Valor estimado</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosProgramadosFiltrados.map(pedido => (
                      <tr key={pedido.id} className={tabela.tr}>
                        <Td className="whitespace-nowrap tabular-nums">{formatarDataBR(pedido.data)}</Td>
                        <Td className="max-w-[340px]">
                          <div className="font-semibold text-tinta">{pedido.item_descricao}</div>
                          {pedido.observacoes && <div className="text-[11.5px] text-cinza truncate">Obs.: {pedido.observacoes}</div>}
                        </Td>
                        <Td className="max-w-[240px]">
                          <div className="truncate">{nomeParceiro(pedido) || <span className="text-cinza-claro">Não especificado</span>}</div>
                          <div className="text-[11.5px] text-cinza">{pedido.tipo_parceiro === 'AGRICULTOR' ? 'Produtor rural' : 'Fornecedor'}</div>
                        </Td>
                        <Td className="whitespace-nowrap">{(pedido.categoria || '').split('/')[0].trim()}</Td>
                        <Td numero><span className="font-bold text-tinta text-[13.5px]">{formatarMoeda(pedido.valor_total)}</span></Td>
                        <Td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-0.5">
                            <button type="button" onClick={() => abrirFinalizacaoCompra(pedido)} className={`${botaoLinhaPrimario} mr-1`}
                              title="Transformar este pedido de compra em despesa">
                              <ArrowRightCircle className="w-3.5 h-3.5" /> Virar despesa
                            </button>
                            <button type="button" onClick={() => abrirEdicaoProgramado(pedido)} className={botaoLinhaIcone}
                              title="Editar (muda também no pedido de compra)" aria-label="Editar pedido"><Pencil className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setPedidoVisualizarA4(pedido)} className={botaoLinhaIcone}
                              title="Ver e imprimir folha A4" aria-label="Ver folha A4"><Printer className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => gerarEBaixarPDF(pedido)} className={botaoLinhaIcone}
                              title="Baixar PDF" aria-label="Baixar PDF"><Download className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleExcluirProgramado(pedido.id)} className={botaoLinhaExcluir}
                              title="Excluir (some também da despesa programada)" aria-label="Excluir pedido"><Trash2 className="w-3.5 h-3.5" /></button>
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
      </div>

      {/* MODAL 1: LANÇAR DESPESA REALIZADA */}
      {modalNovaDespesa && (
        <ModalFolha
          titulo="Lançar despesa paga"
          subtitulo="Gasto já feito: peças, combustível, insumos. Sai do caixa na hora."
          onFechar={() => setModalNovaDespesa(false)}
          onSubmit={handleSalvarDespesaDireta}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalNovaDespesa(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Gravar despesa</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Descrição do gasto" className="sm:col-span-2">
              <input type="text" required value={formDespesa.descricao}
                onChange={e => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                placeholder="Ex: Óleo lubrificante ISO 68 para o redutor do moinho" className={campo} />
            </Campo>
            <Campo rotulo="Valor (R$)">
              <CampoNumero step="0.01" min={0} casas={2} ocultarZero required value={formDespesa.valor}
                onChange={n => setFormDespesa({ ...formDespesa, valor: n })} placeholder="0,00" className={`${campo} font-semibold`} />
            </Campo>
            <Campo rotulo="Data">
              <input type="date" required value={paraISO(formDespesa.data)}
                onChange={e => setFormDespesa({ ...formDespesa, data: e.target.value })} className={campo} />
            </Campo>
            <Campo rotulo="Setor">
              <select value={formDespesa.setor} onChange={e => setFormDespesa({ ...formDespesa, setor: e.target.value as any })} className={selectCampo}>
                <option value="Fábrica & Moagem">Fábrica & Moagem</option>
                <option value="Secador & Caldeira">Secador & Caldeira</option>
                <option value="Frotas & Logística">Frotas & Logística</option>
                <option value="Administrativo & TI">Administrativo & TI</option>
                <option value="Qualidade & Laboratório">Qualidade & Laboratório</option>
              </select>
            </Campo>
            <Campo rotulo="Responsável">
              <input type="text" required value={formDespesa.responsavel}
                onChange={e => setFormDespesa({ ...formDespesa, responsavel: e.target.value })}
                placeholder="Nome do colaborador" className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}

      {/* MODAL 2: PROGRAMAR COMPRA */}
      {modalNovoPedido && (
        <ModalFolha
          titulo="Programar compra"
          subtitulo="Lembrete do que a fábrica precisa comprar. Categoria e pagamento ficam para quando virar despesa."
          onFechar={() => setModalNovoPedido(false)}
          onSubmit={handleSalvarNovoPedidoProgramado}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalNovoPedido(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Gravar compra programada</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="O que precisamos comprar *" className="sm:col-span-2">
              <textarea required rows={2} value={novoItem} onChange={e => setNovoItem(e.target.value)}
                placeholder="Sacaria plástica 1 kg, correia transportadora..." className={campoArea} />
            </Campo>
            <Campo rotulo="Comprar de">
              <select value={novoTipoParceiro} onChange={e => setNovoTipoParceiro(e.target.value as any)} className={selectCampo}>
                <option value="FORNECEDOR">Fornecedor cadastrado</option>
                <option value="AGRICULTOR">Produtor rural</option>
              </select>
            </Campo>
            <Campo rotulo={novoTipoParceiro === 'FORNECEDOR' ? 'Fornecedor' : 'Produtor rural'}>
              {novoTipoParceiro === 'FORNECEDOR' ? (
                <select value={novoParceiroId} onChange={e => setNovoParceiroId(e.target.value)} className={selectCampo}>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.fantasia || f.razao_nome} (CNPJ {f.cpf_cnpj})</option>
                  ))}
                </select>
              ) : (
                <select value={novoParceiroId} onChange={e => setNovoParceiroId(e.target.value)} className={selectCampo}>
                  {agricultores.map(a => (
                    <option key={a.id} value={a.id}>{a.nome_completo} — {a.nome_propriedade}</option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo rotulo="Data prevista *">
              <input type="date" required value={paraISO(novoData)} onChange={e => setNovoData(e.target.value)} className={campo} />
            </Campo>
            <div className="hidden sm:block" />
            <Campo rotulo="Quantidade *">
              <input type="text" inputMode="decimal" required value={novoQtd}
                onChange={e => {
                  setNovoQtd(e.target.value);
                  const q = lerNumeroBR(e.target.value);
                  const u = lerNumeroBR(novoUnitario);
                  if (q > 0 && u > 0) setNovoValorTotal(formatarDecimalBR(q * u, 2));
                }}
                placeholder="1.000" className={campo} />
            </Campo>
            <Campo rotulo="Unidade *">
              <select value={novoUnidade} onChange={e => setNovoUnidade(e.target.value as PedidoCompraGeral['unidade_medida'])} className={selectCampo}>
                {UNIDADES_PEDIDO_COMPRA.map(u => <option key={u.valor} value={u.valor}>{u.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Valor unitário (R$)">
              <input type="text" inputMode="decimal" value={novoUnitario}
                onChange={e => {
                  setNovoUnitario(e.target.value);
                  const q = lerNumeroBR(novoQtd);
                  const u = lerNumeroBR(e.target.value);
                  if (q > 0 && u > 0) setNovoValorTotal(formatarDecimalBR(q * u, 2));
                }}
                placeholder="1,50" className={campo} />
            </Campo>
            <Campo rotulo="Valor total estimado (R$) *">
              <input type="text" inputMode="decimal" required value={novoValorTotal}
                onChange={e => {
                  setNovoValorTotal(e.target.value);
                  const q = lerNumeroBR(novoQtd);
                  const t = lerNumeroBR(e.target.value);
                  if (q > 0 && t > 0) setNovoUnitario(formatarDecimalBR(t / q, 4));
                }}
                placeholder="1.500,00" className={`${campo} font-semibold`} />
            </Campo>
          </div>
        </ModalFolha>
      )}

      {/* MODAL 3: EDITAR COMPRA PROGRAMADA */}
      {pedidoEditando && (
        <ModalFolha
          titulo="Editar compra programada"
          subtitulo="A alteração vale aqui e na tela Pedidos de compra."
          onFechar={() => setPedidoEditando(null)}
          onSubmit={handleSalvarEdicaoProgramado}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setPedidoEditando(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Salvar alterações</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Item" className="sm:col-span-2">
              <input type="text" required value={editItem} onChange={e => setEditItem(e.target.value)} className={campo} />
            </Campo>
            <Campo rotulo="Categoria">
              <select value={editCategoria} onChange={e => setEditCategoria(e.target.value as any)} className={selectCampo}>
                <option value="Embalagens">Embalagens</option>
                <option value="Manutenção & Peças">Manutenção & Peças</option>
                <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
                <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                <option value="Químicos & Laboratório">Químicos & Laboratório</option>
                <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
                <option value="Limpeza & Escritório">Limpeza & Escritório</option>
                <option value="Outros">Outros</option>
              </select>
            </Campo>
            <Campo rotulo="Data prevista">
              <input type="date" required value={paraISO(editData)} onChange={e => setEditData(e.target.value)} className={campo} />
            </Campo>
            <Campo rotulo="Quantidade">
              <input type="number" step="any" required inputMode="decimal" value={editQtd} onChange={e => setEditQtd(e.target.value)} className={campo} />
            </Campo>
            <Campo rotulo="Unidade">
              <select value={editUnidade} onChange={e => setEditUnidade(e.target.value as any)} className={selectCampo}>
                {UNIDADES_PEDIDO_COMPRA.map(u => <option key={u.valor} value={u.valor}>{u.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Preço unitário (R$)">
              <input type="number" step="0.01" required inputMode="decimal" value={editUnitario} onChange={e => setEditUnitario(e.target.value)} className={campo} />
            </Campo>
            <div className="flex flex-col justify-end">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Total recalculado</span>
              <span className="mt-1 text-[22px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta leading-none">
                {formatarMoeda(lerNumeroBR(editQtd) * lerNumeroBR(editUnitario))}
              </span>
            </div>
            <Campo rotulo="Observações" className="sm:col-span-2">
              <input type="text" value={editObservacoes} onChange={e => setEditObservacoes(e.target.value)} className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}

      {/* MODAL 4: VIRAR DESPESA */}
      {pedidoFinalizando && (
        <ModalFolha
          titulo="Virar despesa"
          subtitulo={
            <>
              {nomeParceiro(pedidoFinalizando) || 'Parceiro não informado'} · programado para {formatarDataBR(pedidoFinalizando.data)}
            </>
          }
          onFechar={() => setPedidoFinalizando(null)}
          onSubmit={handleConfirmarFinalizacaoCompra}
          largura="sm:max-w-xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setPedidoFinalizando(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><ArrowRightCircle className="w-4 h-4" /> Confirmar e virar despesa</BotaoPrimario>
            </>
          }
        >
          <div className="space-y-5">
            <GrupoForm titulo="1. O que foi comprado">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo rotulo="Produto comprado *" dica="A descrição do pedido vira o produto da despesa." className="sm:col-span-2">
                  <input type="text" required value={produtoFinalizacao} onChange={e => setProdutoFinalizacao(e.target.value)}
                    placeholder="5.000 sacos de ráfia" className={campo} />
                </Campo>
                <Campo rotulo="Categoria *">
                  <select value={categoriaFinalizacao} onChange={e => setCategoriaFinalizacao(e.target.value as CategoriaCompra)} className={selectCampo}>
                    <option value="Embalagens">Embalagens (sacos, ráfia, fitas)</option>
                    <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                    <option value="Manutenção & Peças">Manutenção mecânica & peças</option>
                    <option value="Mercado / Cozinha / Copa">Mercado / Cozinha / Copa</option>
                    <option value="Combustível & Lubrificantes">Combustível & Lubrificantes</option>
                    <option value="Limpeza & Escritório">Limpeza & Escritório</option>
                    <option value="Químicos & Laboratório">Químicos & Laboratório</option>
                    <option value="Insumos Agrícolas">Insumos agrícolas</option>
                    <option value="Outros">Outros</option>
                  </select>
                </Campo>
                <Campo rotulo="Forma de pagamento *">
                  <select value={formaPagamentoFinalizacao} onChange={e => setFormaPagamentoFinalizacao(e.target.value)} className={selectCampo}>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                  </select>
                </Campo>
                <Campo rotulo="Valor final (R$) *" className="sm:col-span-2">
                  <input type="text" required inputMode="decimal" value={valorTotalFinalizacao}
                    onChange={e => setValorTotalFinalizacao(e.target.value)} placeholder="0,00" className={`${campo} font-semibold`} />
                </Campo>
              </div>
            </GrupoForm>

            <GrupoForm titulo="2. Pagamento">
              <div role="radiogroup" aria-label="Situação do pagamento" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  ['JA_PAGO', 'Já pago', 'Vira despesa paga e sai do caixa'],
                  ['A_PAGAR', 'A prazo', 'Vai para Contas a pagar'],
                ] as const).map(([valor, rotulo, dica]) => {
                  const ativo = tipoFinalizacao === valor;
                  return (
                    <button key={valor} type="button" role="radio" aria-checked={ativo} onClick={() => setTipoFinalizacao(valor)}
                      className={`text-left min-h-[52px] px-3.5 py-2.5 rounded-md border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
                        ativo ? 'border-eno-800 bg-eno-50 ring-1 ring-eno-800' : 'border-linha-forte bg-papel hover:bg-papel-3'
                      }`}>
                      <span className={`block text-[14px] font-bold ${ativo ? 'text-eno-800' : 'text-tinta'}`}>{rotulo}</span>
                      <span className="block text-[12px] text-cinza">{dica}</span>
                    </button>
                  );
                })}
              </div>
              <Campo rotulo={tipoFinalizacao === 'JA_PAGO' ? 'Data do pagamento *' : 'Vencimento *'} className="mt-4">
                <input type="date" required value={paraISO(dataFinalizacao)} onChange={e => setDataFinalizacao(e.target.value)} className={campo} />
              </Campo>
            </GrupoForm>
          </div>
        </ModalFolha>
      )}

      {/* MODAL 5: FOLHA A4 DO PEDIDO DE COMPRA */}
      {pedidoVisualizarA4 && (
        <ModalFolha
          titulo="Pedido de compra"
          subtitulo={`Folha A4 · ${formatarDataBR(pedidoVisualizarA4.data)}`}
          onFechar={() => setPedidoVisualizarA4(null)}
          largura="sm:max-w-4xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir</BotaoSecundario>
              <BotaoPrimario onClick={() => gerarEBaixarPDF(pedidoVisualizarA4)} disabled={gerandoPdf}>
                {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Baixar PDF
              </BotaoPrimario>
            </>
          }
        >
          <div className="flex justify-center -mx-2 sm:mx-0">
            <div className="bg-white text-slate-900 p-4 sm:p-6 rounded shadow-xl border border-slate-300 w-full max-w-[650px] min-h-[520px] sm:min-h-0 sm:aspect-[210/297] flex flex-col justify-between text-xs select-text">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-3 border-b-2 border-emerald-950 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-900 text-emerald-300 font-black flex items-center justify-center text-[10px] shrink-0">
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
                <div className="text-right shrink-0">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>Nome: <strong>{pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_nome : pedidoVisualizarA4.fornecedor_nome}</strong></div>
                  <div>Doc: <strong className="tabular-nums">{pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_cpf_cnpj : pedidoVisualizarA4.fornecedor_cnpj}</strong></div>
                  <div>Local: <strong>{pedidoVisualizarA4.local_compra || (pedidoVisualizarA4.tipo_parceiro === 'AGRICULTOR' ? pedidoVisualizarA4.agricultor_cidade_uf : pedidoVisualizarA4.fornecedor_cidade_uf)}</strong></div>
                  <div>Forma de Pagto: <strong>{pedidoVisualizarA4.forma_pagamento}</strong></div>
                </div>
              </div>

              {/* Tabela do Item */}
              <div className="my-2 flex-1">
                <div className="bg-slate-100 p-1.5 border border-slate-300 font-bold text-[10px] text-slate-700 flex justify-between gap-2 uppercase">
                  <span className="w-1/2">Item / Descrição</span>
                  <span className="w-1/6 text-right">Qtd</span>
                  <span className="w-1/6 text-right">Unitário</span>
                  <span className="w-1/6 text-right">Total</span>
                </div>
                <div className="p-2 border-x border-b border-slate-200 flex justify-between gap-2 font-medium">
                  <span className="w-1/2 font-bold text-slate-900 break-words">{pedidoVisualizarA4.item_descricao}</span>
                  <span className="w-1/6 text-right tabular-nums">{numeroSeguro(pedidoVisualizarA4.quantidade).toLocaleString('pt-BR')} {pedidoVisualizarA4.unidade_medida}</span>
                  <span className="w-1/6 text-right tabular-nums">{formatarMoeda(pedidoVisualizarA4.valor_unitario)}</span>
                  <span className="w-1/6 text-right tabular-nums font-bold text-slate-900">{formatarMoeda(pedidoVisualizarA4.valor_total)}</span>
                </div>

                <div className="mt-4 p-2.5 rounded bg-emerald-50 border border-emerald-300 flex justify-between items-center gap-2">
                  <span className="font-bold text-emerald-950 uppercase text-[10px]">Total a Pagar / Previsto:</span>
                  <span className="tabular-nums font-black text-emerald-950 text-base">
                    {formatarMoeda(pedidoVisualizarA4.valor_total)}
                  </span>
                </div>
              </div>

              {/* Assinaturas */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 sm:gap-8 text-center text-[10px]">
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
        </ModalFolha>
      )}
    </div>
  );
}
