import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  Tractor,
  Plus,
  Search,
  Scale,
  Trash2,
  Printer,
  Download,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  DollarSign,
  FileText,
  User,
  Check,
  ShoppingBag,
  Pencil,
  Eye,
  MapPin,
  Calendar
} from 'lucide-react';
import {
  CalculoNaRoca,
  SacoPesagem,
  carregarCalculosNaRoca,
  salvarCalculosNaRoca,
  criarCalculoNaRocaELancarPedidoCompra,
  definirPagamentoCalculoRoca,
  excluirCalculoNaRoca,
  proximoNumeroTicketRoca,
  calcularDescontoPesagem,
  pesosDoCalculo,
  descricaoDesconto,
  adicionarComprovante
} from '../../data/calculoRocaData';
import { CampoAnexoComprovante, ArquivoComprovante, ModalComprovantes, useExtratoRoca } from './ComprovantesRoca';
import { Agricultor } from '../../data/mockStore';
import { carregarAgricultores, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { hojeISO, paraISO, formatarDataBR, somarDias } from '../../lib/datas';
import { EMPRESA } from '../../lib/empresa';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';

interface Props {
  onNavigate?: (pageId: string) => void;
}

export function CalculoNaRocaComponent({ onNavigate }: Props) {
  const [calculos, setCalculos] = useState<CalculoNaRoca[]>(carregarCalculosNaRoca());
  const [agricultores, setAgricultores] = useState<Agricultor[]>(() => carregarAgricultores());

  // Lista de agricultores sempre vinda do cadastro
  useEffect(() => {
    const atualizar = () => setAgricultores(carregarAgricultores());
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizar);
    return () => window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizar);
  }, []);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [filtroAno, setFiltroAno] = useState<string>('TODOS');
  const [mensagemAviso, setMensagemAviso] = useState<string | null>(null);

  // Anos disponíveis para o filtro (ordenados do mais recente para o mais antigo)
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    const anoAtual = new Date().getFullYear();
    anos.add(anoAtual);
    anos.add(anoAtual - 1);
    calculos.forEach(c => {
      const match = c.data.match(/(\d{4})/);
      if (match) {
        anos.add(parseInt(match[1], 10));
      }
    });
    return Array.from(anos).sort((a, b) => b - a);
  }, [calculos]);

  // Função utilitária para extrair mês e ano de datas (DD/MM/AAAA ou AAAA-MM-DD)
  const extrairMesEAno = (dataStr: string) => {
    if (!dataStr) return null;
    if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        return { mes: parseInt(partes[1], 10), ano: parseInt(partes[2], 10) };
      }
    }
    if (dataStr.includes('-')) {
      const partes = dataStr.split('-');
      if (partes.length === 3) {
        return { mes: parseInt(partes[1], 10), ano: parseInt(partes[0], 10) };
      }
    }
    return null;
  };

  // Sincronização
  useEffect(() => {
    const handleUpdate = () => setCalculos(carregarCalculosNaRoca());
    window.addEventListener('calculos_roca_updated', handleUpdate);
    return () => window.removeEventListener('calculos_roca_updated', handleUpdate);
  }, []);

  // Modal Novo Cálculo na Roça (Apenas Agricultor, Data apenas, Local automático, Sem variedade)
  const [modalNovo, setModalNovo] = useState(false);
  const [parceiroId, setParceiroId] = useState(() => carregarAgricultores()[0]?.id || '');
  const [dataPesagem, setDataPesagem] = useState(new Date().toLocaleDateString('pt-BR'));
  const [pesadorResponsavel, setPesadorResponsavel] = useState('');
  const [precoPorKg, setPrecoPorKg] = useState('');
  const [observacoes, setObservacoes] = useState('');
  // Desconto na pesagem (casca/terra/impureza e/ou tara em kg)
  const [descontoPctInput, setDescontoPctInput] = useState('');
  const [descontoTaraInput, setDescontoTaraInput] = useState('');
  const [motivoDesconto, setMotivoDesconto] = useState('');

  // Lista de sacos na nova pesagem (sem arredondamento - até 3 casas após a vírgula)
  const [sacosForm, setSacosForm] = useState<SacoPesagem[]>([]);
  const [pesoSacoInput, setPesoSacoInput] = useState('');
  const inputSacoRef = useRef<HTMLInputElement>(null);

  // Estado para edição de linha de saco
  const [editandoSacoNumero, setEditandoSacoNumero] = useState<number | null>(null);
  const [editandoPesoInput, setEditandoPesoInput] = useState('');

  // Modal Visualizar / Exportar Ticket (A4)
  const [ticketModal, setTicketModal] = useState<CalculoNaRoca | null>(null);
  const [exportando, setExportando] = useState(false);
  const folhaTicketRef = useRef<HTMLDivElement>(null);

  // Modal Definir Pagamento
  const [modalPagamento, setModalPagamento] = useState<CalculoNaRoca | null>(null);
  const [tipoPagamentoForm, setTipoPagamentoForm] = useState<'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL'>('JA_PAGO');
  const [formaPagamentoEscolhida, setFormaPagamentoEscolhida] = useState('PIX');
  const [dataPagamentoOuVenc, setDataPagamentoOuVenc] = useState(new Date().toLocaleDateString('pt-BR'));
  const [valorAdiantado, setValorAdiantado] = useState('');
  const [vencimentoSaldo, setVencimentoSaldo] = useState(somarDias(hojeISO(), 30));
  const [contaBancaria, setContaBancaria] = useState('Banco do Brasil - Conta Movimento');
  const [obsPagamento, setObsPagamento] = useState('');
  const [anexoPagamento, setAnexoPagamento] = useState<ArquivoComprovante | null>(null);
  const [comprovantesDe, setComprovantesDe] = useState<CalculoNaRoca | null>(null);

  // Agricultor selecionado para preview e local automático
  const agricultorSelecionado = useMemo(() => {
    return agricultores.find(a => a.id === parceiroId) || agricultores[0];
  }, [parceiroId, agricultores]);

  // Local automático da propriedade do agricultor
  const localAutomatico = useMemo(() => {
    if (!agricultorSelecionado) return 'Roça do Agricultor';
    const prop = agricultorSelecionado.nome_propriedade || 'Propriedade Rural';
    const mun = agricultorSelecionado.endereco ? `${agricultorSelecionado.endereco.municipio}/${agricultorSelecionado.endereco.uf}` : 'Paraná';
    return `${prop} - ${mun}`;
  }, [agricultorSelecionado]);

  // Totais da pesagem em tempo real no formulário com até 3 casas decimais
  const totaisForm = useMemo(() => {
    const totalSacos = sacosForm.length;
    const pesoBruto = parseFloat(sacosForm.reduce((acc, s) => acc + s.peso_kg, 0).toFixed(3));
    const pesoMedio = totalSacos > 0 ? pesoBruto / totalSacos : 0;
    const precoKg = parseFloat(precoPorKg.replace(',', '.')) || 0;
    const descontoPct = parseFloat(descontoPctInput.replace(',', '.')) || 0;
    const descontoTara = parseFloat(descontoTaraInput.replace(',', '.')) || 0;
    const { desconto, liquido } = calcularDescontoPesagem(pesoBruto, descontoPct, descontoTara);
    // Valor = peso LÍQUIDO × preço/kg
    const valorTotal = liquido * precoKg;
    return {
      totalSacos,
      pesoBruto,
      descontoPct: Math.min(100, Math.max(0, descontoPct)),
      descontoTara: Math.max(0, descontoTara),
      desconto,
      pesoTotal: liquido,
      pesoMedio: parseFloat(pesoMedio.toFixed(3)),
      valorTotal: parseFloat(valorTotal.toFixed(2))
    };
  }, [sacosForm, precoPorKg, descontoPctInput, descontoTaraInput]);

  // Adicionar saco com precisão de até 3 casas decimais (sem arredondar)
  const handleAdicionarSaco = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = pesoSacoInput.trim().replace(',', '.');
    const peso = parseFloat(raw);
    if (!peso || isNaN(peso) || peso <= 0) return;

    // Preserva até 3 casas decimais
    const pesoFormatado = parseFloat(Number(peso).toFixed(3));

    setSacosForm(prev => [
      ...prev,
      {
        numero: prev.length + 1,
        peso_kg: pesoFormatado
      }
    ]);

    setPesoSacoInput('');
    if (inputSacoRef.current) {
      inputSacoRef.current.focus();
    }
  };

  // Iniciar edição de uma linha de saco
  const handleIniciarEdicaoSaco = (numero: number, pesoAtual: number) => {
    setEditandoSacoNumero(numero);
    setEditandoPesoInput(pesoAtual.toString().replace('.', ','));
  };

  // Salvar edição de uma linha de saco
  const handleSalvarEdicaoSaco = (numero: number) => {
    const raw = editandoPesoInput.trim().replace(',', '.');
    const peso = parseFloat(raw);
    if (!peso || isNaN(peso) || peso <= 0) return;

    const pesoFormatado = parseFloat(Number(peso).toFixed(3));
    setSacosForm(prev =>
      prev.map(s => (s.numero === numero ? { ...s, peso_kg: pesoFormatado } : s))
    );
    setEditandoSacoNumero(null);
    setEditandoPesoInput('');
  };

  // Cancelar edição
  const handleCancelarEdicaoSaco = () => {
    setEditandoSacoNumero(null);
    setEditandoPesoInput('');
  };

  // Remover saco da lista e renumerar
  const handleRemoverSaco = (numero: number) => {
    setSacosForm(prev => {
      const filtrados = prev.filter(s => s.numero !== numero);
      return filtrados.map((s, idx) => ({ ...s, numero: idx + 1 }));
    });
    if (editandoSacoNumero === numero) {
      setEditandoSacoNumero(null);
      setEditandoPesoInput('');
    }
  };

  // Adicionar lote rápido com pequena variação natural (3 casas)
  const handleAdicionarLotePadrao = (pesoBase: number, qtd: number) => {
    const novos: SacoPesagem[] = [];
    const inicio = sacosForm.length + 1;
    for (let i = 0; i < qtd; i++) {
      const variacao = Math.random() * 1.6 - 0.8;
      const peso = parseFloat((pesoBase + variacao).toFixed(3));
      novos.push({
        numero: inicio + i,
        peso_kg: peso
      });
    }
    setSacosForm(prev => [...prev, ...novos]);
  };

  // Limpar todos os sacos
  const handleLimparSacos = () => {
    if (sacosForm.length === 0) return;
    if (window.confirm('Deseja limpar todos os sacos lançados nesta pesagem?')) {
      setSacosForm([]);
      setEditandoSacoNumero(null);
    }
  };

  // Abrir modal novo
  const abrirModalNovo = () => {
    setSacosForm([]);
    setPesoSacoInput('');
    setEditandoSacoNumero(null);
    setDataPesagem(new Date().toLocaleDateString('pt-BR'));
    setPrecoPorKg('');
    if (!agricultores.some(a => a.id === parceiroId)) setParceiroId(agricultores[0]?.id || '');
    setObservacoes('');
    setDescontoPctInput('');
    setDescontoTaraInput('');
    setMotivoDesconto('');
    setModalNovo(true);
    setTimeout(() => {
      if (inputSacoRef.current) inputSacoRef.current.focus();
    }, 200);
  };

  // Salvar novo cálculo na roça
  const handleSalvarCalculo = (e: React.FormEvent) => {
    e.preventDefault();
    if (sacosForm.length === 0) {
      alert('Por favor, adicione pelo menos um saco pesado antes de salvar.');
      return;
    }

    if (!agricultorSelecionado) {
      alert('Selecione um agricultor cadastrado antes de salvar a pesagem.');
      return;
    }
    const precoKg = parseFloat(precoPorKg.replace(',', '.')) || 0;
    if (precoKg <= 0) {
      alert('Informe o preço por kg da mandioca.');
      return;
    }
    if (totaisForm.pesoTotal <= 0) {
      alert('O desconto não pode zerar o peso líquido da pesagem.');
      return;
    }
    const ticketId = proximoNumeroTicketRoca(carregarCalculosNaRoca());
    const calculoId = `roca_${Date.now()}`;
    const pedidoId = `ped_roca_${Date.now()}`;

    const nomeAgricultor = agricultorSelecionado ? agricultorSelecionado.nome_completo : 'Produtor Rural';
    const propriedade = agricultorSelecionado ? agricultorSelecionado.nome_propriedade : '';
    const cidadeUf = agricultorSelecionado && agricultorSelecionado.endereco
      ? `${agricultorSelecionado.endereco.municipio}/${agricultorSelecionado.endereco.uf}`
      : '';
    const cpfCnpj = agricultorSelecionado ? agricultorSelecionado.cpf_cnpj : '';
    const chavePix = agricultorSelecionado ? agricultorSelecionado.chave_pix : '';

    const novoCalculo: CalculoNaRoca = {
      id: calculoId,
      numero_ticket: ticketId,
      data: paraISO(dataPesagem) || hojeISO(),
      fornecedor_id: agricultorSelecionado.id,
      fornecedor_nome: nomeAgricultor,
      fornecedor_propriedade: propriedade,
      fornecedor_cidade_uf: cidadeUf,
      fornecedor_cpf_cnpj: cpfCnpj,
      fornecedor_chave_pix: chavePix,
      fornecedor_tipo: 'AGRICULTOR',
      local_pesagem: localAutomatico,
      pesador_responsavel: pesadorResponsavel,
      preco_por_kg: precoKg,
      preco_por_tonelada: precoKg * 1000,
      sacos: sacosForm,
      total_sacos: totaisForm.totalSacos,
      peso_total_kg: totaisForm.pesoTotal,
      peso_medio_saco_kg: totaisForm.pesoMedio,
      valor_total_estimado: totaisForm.valorTotal,
      peso_bruto_kg: totaisForm.pesoBruto,
      desconto_percentual: totaisForm.descontoPct || undefined,
      desconto_tara_kg: totaisForm.descontoTara || undefined,
      desconto_kg: totaisForm.desconto,
      motivo_desconto: totaisForm.desconto > 0 ? (motivoDesconto.trim() || undefined) : undefined,
      observacoes: observacoes.trim() || undefined,
      pedido_compra_id: pedidoId,
      situacao_pagamento: 'PENDENTE_DEFINICAO',
      criado_em: new Date().toISOString()
    };

    criarCalculoNaRocaELancarPedidoCompra(novoCalculo);
    setCalculos(carregarCalculosNaRoca());
    setModalNovo(false);

    sessionStorage.setItem('abrir_definicao_pagamento_pedido_id', pedidoId);
    if (onNavigate) {
      onNavigate('pedidos_compra');
    } else {
      setMensagemAviso(`Pesagem na Roça salva com sucesso! Pedido de Compra gerado.`);
      setTimeout(() => setMensagemAviso(null), 8000);
      setModalPagamento(novoCalculo);
      setDataPagamentoOuVenc(new Date().toLocaleDateString('pt-BR'));
      setVencimentoSaldo(somarDias(hojeISO(), 30));
      setObsPagamento('');
      setAnexoPagamento(null);
    }
  };

  // Confirmar definição de pagamento
  const handleSalvarDefinicaoPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPagamento) return;

    const temSaldo = tipoPagamentoForm === 'ADIANTAMENTO_PARCIAL' &&
      modalPagamento.valor_total_estimado - (parseFloat(valorAdiantado.replace(',', '.')) || 0) > 0.009;
    if (temSaldo && !paraISO(vencimentoSaldo)) {
      alert('Informe o vencimento do saldo restante.');
      return;
    }

    const res = definirPagamentoCalculoRoca(modalPagamento.id, {
      tipo: tipoPagamentoForm,
      forma_pagamento: formaPagamentoEscolhida,
      data_pagamento_ou_vencimento: dataPagamentoOuVenc,
      data_vencimento_saldo: temSaldo ? vencimentoSaldo : undefined,
      valor_pago:
        tipoPagamentoForm === 'ADIANTAMENTO_PARCIAL'
          ? parseFloat(valorAdiantado.replace(',', '.')) || 0
          : modalPagamento.valor_total_estimado,
      saldo_restante:
        tipoPagamentoForm === 'ADIANTAMENTO_PARCIAL'
          ? Math.max(0, modalPagamento.valor_total_estimado - (parseFloat(valorAdiantado.replace(',', '.')) || 0))
          : 0,
      conta_bancaria: contaBancaria,
      observacao: obsPagamento
    });

    if (res.sucesso) {
      let mensagem = res.mensagem;
      if (anexoPagamento) {
        const anexo = adicionarComprovante(modalPagamento.id, anexoPagamento);
        mensagem = anexo.sucesso ? `${mensagem} Comprovante anexado.` : `${mensagem} ATENÇÃO: ${anexo.mensagem}`;
        if (!anexo.sucesso) alert(anexo.mensagem);
      }
      setCalculos(carregarCalculosNaRoca());
      setModalPagamento(null);
      setAnexoPagamento(null);
      setMensagemAviso(mensagem);
      setTimeout(() => setMensagemAviso(null), 7000);
    } else {
      alert(res.mensagem);
    }
  };

  // Excluir pesagem
  const handleExcluirCalculo = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Deseja realmente excluir este registro de pesagem na roça? O pedido de compra gerado (se ainda não pago) também será removido.')) {
      const res = excluirCalculoNaRoca(id);
      setCalculos(carregarCalculosNaRoca());
      if (!res.sucesso) alert(res.mensagem);
      setMensagemAviso(res.mensagem);
      setTimeout(() => setMensagemAviso(null), 6000);
    }
  };

  // =========================================================================
  // EXPORTAÇÕES 100% CONFIÁVEIS PARA A4 (PDF VETORIAL E PNG)
  // =========================================================================

  // Exportar PNG via html2canvas com cores seguras
  const exportarPNG = async () => {
    if (!folhaTicketRef.current || !ticketModal) return;
    try {
      setExportando(true);
      const canvas = await html2canvas(folhaTicketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Pesagem_Roca_${ticketModal.numero_ticket.replace(/[/\\?%*:|"<>]/g, '-')}.png`;
      link.href = imgData;
      link.click();
      setMensagemAviso('Imagem PNG gerada com sucesso para compartilhamento!');
      setTimeout(() => setMensagemAviso(null), 4000);
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
      // Fallback amigável
      alert('Não foi possível gerar o PNG pelo navegador. Use o botão Exportar PDF ou Imprimir.');
    } finally {
      setExportando(false);
    }
  };

  // Exportar PDF oficial em formato A4 perfeito (Vetor via jsPDF - funciona sempre)
  const exportarPDF = async () => {
    if (!ticketModal) return;
    try {
      setExportando(true);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const precoKg = ticketModal.preco_por_kg || 0;
      const verdeEscuro: [number, number, number] = [6, 78, 59]; // #064e3b
      const cinzaTexto: [number, number, number] = [71, 85, 105];
      const pretoTexto: [number, number, number] = [15, 23, 42];

      // Faixa Superior
      doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      doc.rect(14, 12, 182, 1.5, 'F');

      // Cabeçalho da Empresa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      doc.text(EMPRESA.razao.toUpperCase(), 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
      doc.text('Indústria & Comércio de Féculas e Farinhas de Mandioca', 14, 25);
      doc.text(`CNPJ: ${EMPRESA.cnpj} • ${EMPRESA.endereco} • ${EMPRESA.telefone}`, 14, 29);

      // Caixa do Ticket
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
      doc.text('TICKET DE PESAGEM NA ROÇA', 196, 18, { align: 'right' });

      doc.setFontSize(14);
      doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      doc.text(ticketModal.numero_ticket, 196, 24, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(pretoTexto[0], pretoTexto[1], pretoTexto[2]);
      doc.text(`Data: ${formatarDataBR(ticketModal.data)}`, 196, 29, { align: 'right' });

      // Linha divisória
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 32, 196, 32);

      // Caixa de Informações do Agricultor & Condições
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 35, 182, 27, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, 35, 182, 27, 2, 2, 'D');

      // Coluna 1 da caixa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PRODUTOR RURAL (AGRICULTOR):', 18, 41);

      doc.setFontSize(10);
      doc.setTextColor(pretoTexto[0], pretoTexto[1], pretoTexto[2]);
      doc.text(ticketModal.fornecedor_nome, 18, 46);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      if (ticketModal.fornecedor_propriedade) {
        doc.text(`Propriedade: ${ticketModal.fornecedor_propriedade}`, 18, 50.5);
      }
      doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
      doc.text(`Local: ${ticketModal.local_pesagem}`, 18, 55);
      if (ticketModal.fornecedor_chave_pix) {
        doc.text(`Chave PIX: ${ticketModal.fornecedor_chave_pix}`, 18, 59);
      }

      // Coluna 2 da caixa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('CONDIÇÕES DA COMPRA:', 115, 41);

      doc.setFontSize(9);
      doc.setTextColor(pretoTexto[0], pretoTexto[1], pretoTexto[2]);
      doc.text(`Preço Pago por KG: R$ ${precoKg.toFixed(2)}/kg`, 115, 46);
      doc.text(`Preço por Tonelada: R$ ${(precoKg * 1000).toFixed(2)}/Ton`, 115, 50.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
      const statusTxt =
        ticketModal.situacao_pagamento === 'JA_PAGO'
          ? 'Já Pago no Ato da Roça'
          : ticketModal.situacao_pagamento === 'A_PAGAR'
          ? 'A Pagar (Programado)'
          : 'Pendente de Definição';
      doc.text(`Situação: ${statusTxt}`, 115, 55);
      doc.text(`Pesador Resp.: ${ticketModal.pesador_responsavel || 'Equipe Campo'}`, 115, 59);

      // Título da Relação de Sacos em Modo Lista
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(pretoTexto[0], pretoTexto[1], pretoTexto[2]);
      doc.text(`RELAÇÃO DE PESAGEM SACO A SACO (${ticketModal.total_sacos} sacos)`, 14, 68);

      let currentY = 71;
      const alturaLinha = 5.8;

      const desenharCabecalhoTabela = (y: number) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.line(14, y + 5.5, 196, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Saco', 18, y + 3.8);
        doc.text('Peso Aferido (kg)', 90, y + 3.8, { align: 'right' });
        doc.text('Preço Pago (kg)', 140, y + 3.8, { align: 'right' });
        doc.text('Valor do Saco (R$)', 192, y + 3.8, { align: 'right' });
      };

      desenharCabecalhoTabela(currentY);
      currentY += 6;

      // Desenhar itens em lista em linhas horizontais completas (como no Nova Pesagem)
      ticketModal.sacos.forEach((saco, idx) => {
        if (currentY > 265) {
          doc.addPage();
          // Faixa e cabeçalho na nova página
          doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
          doc.rect(14, 12, 182, 1.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
          doc.text(`${EMPRESA.razao.toUpperCase()} - Romaneio ${ticketModal.numero_ticket} (Continuação)`, 14, 20);
          currentY = 26;
          desenharCabecalhoTabela(currentY);
          currentY += 6;
        }

        // Fundo zebrado
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, currentY - 1, 182, alturaLinha, 'F');
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY + alturaLinha - 1, 196, currentY + alturaLinha - 1);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(pretoTexto[0], pretoTexto[1], pretoTexto[2]);
        doc.text(`Saco ${saco.numero}`, 18, currentY + 3);

        const pesoFmt = (saco.peso_kg || 0).toFixed(3).replace('.', ',');
        doc.text(`${pesoFmt} kg`, 90, currentY + 3, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
        doc.text(`R$ ${precoKg.toFixed(2)}/kg`, 140, currentY + 3, { align: 'right' });

        const valorSaco = saco.peso_kg * precoKg;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
        doc.text(`R$ ${valorSaco.toFixed(2).replace('.', ',')}`, 192, currentY + 3, { align: 'right' });

        currentY += alturaLinha;
      });

      // Se não couber o resumo dos totais na página atual, adiciona página
      if (currentY + 45 > 280) {
        doc.addPage();
        doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
        doc.rect(14, 12, 182, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
        doc.text(`${EMPRESA.razao.toUpperCase()} - Romaneio ${ticketModal.numero_ticket} (Totais)`, 14, 20);
        currentY = 26;
      } else {
        currentY += 4;
      }

      // Caixa de Resumo dos Totais (Fundo Verde Escuro)
      doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      doc.roundedRect(14, currentY, 182, 16, 2, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(167, 243, 208); // verde claro
      const pesosPdf = pesosDoCalculo(ticketModal);
      const fmtKgPdf = (v: number) => `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg`;
      doc.text('SACOS:', 18, currentY + 5.5);
      doc.text('PESO BRUTO:', 42, currentY + 5.5);
      doc.text('DESCONTO:', 78, currentY + 5.5);
      doc.text('PESO LÍQUIDO:', 112, currentY + 5.5);
      doc.text('VALOR TOTAL DA CARGA:', 190, currentY + 5.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`${ticketModal.total_sacos}`, 18, currentY + 12);
      doc.text(fmtKgPdf(pesosPdf.bruto), 42, currentY + 12);
      doc.setTextColor(252, 211, 77);
      doc.text(`- ${fmtKgPdf(pesosPdf.desconto)}`, 78, currentY + 12);
      doc.setTextColor(255, 255, 255);
      doc.text(fmtKgPdf(pesosPdf.liquido), 112, currentY + 12);

      doc.setFontSize(12);
      doc.setTextColor(190, 242, 100); // lime
      doc.text(
        (ticketModal.valor_total_estimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        190,
        currentY + 12,
        { align: 'right' }
      );

      if (pesosPdf.desconto > 0 && descricaoDesconto(ticketModal)) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
        doc.text(`Desconto aplicado: ${descricaoDesconto(ticketModal)}. Valor calculado sobre o peso líquido.`, 14, currentY + 20);
      }

      // Assinaturas
      const assinaturasY = currentY + 28;
      doc.setDrawColor(148, 163, 184);
      doc.line(25, assinaturasY, 90, assinaturasY);
      doc.line(120, assinaturasY, 185, assinaturasY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(pretoTexto[0], pretoTexto[1], pretoTexto[2]);
      doc.text(ticketModal.fornecedor_nome, 57.5, assinaturasY + 4, { align: 'center' });
      doc.text(ticketModal.pesador_responsavel || EMPRESA.razao, 152.5, assinaturasY + 4, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(cinzaTexto[0], cinzaTexto[1], cinzaTexto[2]);
      doc.text('Produtor Rural (Agricultor)', 57.5, assinaturasY + 7.5, { align: 'center' });
      doc.text('Balança / Conferência de Campo', 152.5, assinaturasY + 7.5, { align: 'center' });

      // Salva o PDF
      doc.save(`Romaneio_Roca_${ticketModal.numero_ticket.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`);
      setMensagemAviso('Documento PDF A4 gerado com sucesso!');
      setTimeout(() => setMensagemAviso(null), 4000);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Houve um erro ao gerar o PDF. Verifique os dados e tente novamente.');
    } finally {
      setExportando(false);
    }
  };

  // Filtragem dos cálculos por busca, mês e ano
  const calculosFiltrados = useMemo(() => {
    return calculos.filter(c => {
      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        c.fornecedor_nome.toLowerCase().includes(termo) ||
        c.numero_ticket.toLowerCase().includes(termo) ||
        (c.fornecedor_propriedade && c.fornecedor_propriedade.toLowerCase().includes(termo)) ||
        c.local_pesagem.toLowerCase().includes(termo);

      let matchData = true;
      if (filtroMes !== 'TODOS' || filtroAno !== 'TODOS') {
        const info = extrairMesEAno(c.data);
        if (info) {
          if (filtroMes !== 'TODOS' && info.mes !== parseInt(filtroMes, 10)) {
            matchData = false;
          }
          if (filtroAno !== 'TODOS' && info.ano !== parseInt(filtroAno, 10)) {
            matchData = false;
          }
        }
      }

      return matchBusca && matchData;
    });
  }, [calculos, busca, filtroMes, filtroAno]);

  // Status real (lê o financeiro: título baixado em Financeiro → A Pagar aparece como pago aqui)
  const { linhas: linhasExtrato, comComprovante } = useExtratoRoca(calculosFiltrados);
  const extratoPorId = useMemo(() => new Map(linhasExtrato.map(l => [l.calculo.id, l])), [linhasExtrato]);

  // Métricas gerais (Card 'Sacos Pesados' foi retirado conforme solicitação)
  const metricas = useMemo(() => {
    const totalPesagens = calculosFiltrados.length;
    const pesoTotalKg = calculosFiltrados.reduce((acc, c) => acc + c.peso_total_kg, 0);
    const valorTotal = calculosFiltrados.reduce((acc, c) => acc + c.valor_total_estimado, 0);
    const pendentes = calculosFiltrados.filter(c => c.situacao_pagamento === 'PENDENTE_DEFINICAO').length;
    return {
      totalPesagens,
      pesoTotalKg,
      valorTotal,
      pendentes
    };
  }, [calculosFiltrados]);

  const abrirDefinirPagamento = (item: CalculoNaRoca) => {
    setModalPagamento(item);
    setDataPagamentoOuVenc(new Date().toLocaleDateString('pt-BR'));
    setVencimentoSaldo(somarDias(hojeISO(), 30));
    setObsPagamento('');
    setAnexoPagamento(null);
  };

  // Situação de pagamento (mesma regra de antes; só a apresentação mudou)
  const situacaoPagamento = (item: CalculoNaRoca, grande = false) => {
    const status = extratoPorId.get(item.id)?.status;
    if (item.situacao_pagamento !== 'PENDENTE_DEFINICAO' && status === 'PAGO') {
      return <StatusChip tom="pago">{item.situacao_pagamento === 'JA_PAGO' ? 'Pago no ato' : 'Pago'}</StatusChip>;
    }
    if (item.situacao_pagamento !== 'PENDENTE_DEFINICAO' && status === 'VENCIDO') {
      return <StatusChip tom="vencido">Vencido</StatusChip>;
    }
    if (item.situacao_pagamento === 'JA_PAGO') return <StatusChip tom="pago">Pago no ato</StatusChip>;
    if (item.situacao_pagamento === 'A_PAGAR') return <StatusChip tom="producao">A pagar (programado)</StatusChip>;
    if (item.situacao_pagamento === 'ADIANTAMENTO_PARCIAL') return <StatusChip tom="producao">Adiantamento parcial</StatusChip>;
    return (
      <button
        type="button"
        onClick={() => abrirDefinirPagamento(item)}
        className={`inline-flex items-center justify-center gap-1 rounded-[5px] bg-st-aguardando-bg text-st-aguardando font-semibold hover:brightness-95 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-ouro ${
          grande ? 'h-10 px-3 text-[12.5px] w-full' : 'h-7 px-2.5 text-[12px]'
        }`}
        title="Definir se já pagou ou se é a pagar"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Definir pagamento
      </button>
    );
  };

  const kgBR = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  const filtroDataAtivo = filtroMes !== 'TODOS' || filtroAno !== 'TODOS';

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-papel-2 overflow-hidden text-tinta">

      <div className="mx-auto w-full max-w-[1700px] shrink-0">
        <CabecalhoPagina
          titulo="Cálculo na roça"
          resumo={
            metricas.totalPesagens === 0 ? (
              'Nenhuma pesagem no período.'
            ) : (
              <>
                {metricas.totalPesagens} {metricas.totalPesagens === 1 ? 'pesagem' : 'pesagens'} · {(metricas.pesoTotalKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t · {metricas.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                {metricas.pendentes > 0 && (
                  <span className="text-st-aguardando font-semibold"> · {metricas.pendentes} sem pagamento definido</span>
                )}
              </>
            )
          }
          acoes={
            <BotaoPrimario onClick={abrirModalNovo} className="w-full sm:w-auto h-10 sm:h-9">
              <Plus className="w-4 h-4" />
              Nova pesagem
            </BotaoPrimario>
          }
        />

        {mensagemAviso && (
          <div className="mx-4 sm:mx-6 mb-3 pl-3 pr-1 py-1 bg-st-pago-bg rounded-md text-st-pago text-[12.5px] font-semibold flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{mensagemAviso}</span>
            </div>
            <button onClick={() => setMensagemAviso(null)} className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-md hover:bg-st-pago/10 cursor-pointer" aria-label="Fechar aviso">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <BarraFiltros>
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar agricultor, lote ou local" className="w-full md:w-80" />
          <div className="flex items-center gap-2 w-full md:w-auto">
            <SeletorFiltro value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} aria-label="Mês" className="flex-1 md:flex-none">
              <option value="TODOS">Todos os meses</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </SeletorFiltro>
            <SeletorFiltro value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} aria-label="Ano" className="flex-1 md:flex-none">
              <option value="TODOS">Todos os anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano.toString()}>{ano}</option>
              ))}
            </SeletorFiltro>
            {filtroDataAtivo && (
              <BotaoSecundario
                onClick={() => {
                  setFiltroMes('TODOS');
                  setFiltroAno('TODOS');
                }}
                className="h-8 px-2.5 shrink-0"
                title="Limpar filtro de mês e ano"
              >
                Limpar
              </BotaoSecundario>
            )}
          </div>
        </BarraFiltros>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
          {calculosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              <EstadoVazio
                titulo={calculos.length === 0 ? 'Nenhuma pesagem lançada' : 'Nada encontrado'}
                texto={
                  calculos.length === 0
                    ? 'Lance a pesagem da mandioca saco por saco na roça; o valor do agricultor sai do peso líquido × preço por kg.'
                    : 'Troque o mês/ano ou limpe a busca.'
                }
                acao={calculos.length === 0 ? <BotaoPrimario onClick={abrirModalNovo}><Plus className="w-4 h-4" />Nova pesagem</BotaoPrimario> : undefined}
              />
            </div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {calculosFiltrados.map(item => {
                  const pesos = pesosDoCalculo(item);
                  return (
                    <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                      <button type="button" onClick={() => setTicketModal(item)} className="w-full text-left">
                        <div className="text-[11.5px] text-cinza tabular-nums">
                          {item.numero_ticket} · {formatarDataBR(item.data)} · {item.total_sacos} sacos
                        </div>
                        <div className="text-[14px] font-bold text-tinta truncate">{item.fornecedor_nome}</div>
                        <div className="text-[11.5px] text-cinza truncate">
                          {[item.fornecedor_propriedade, item.fornecedor_cidade_uf].filter(Boolean).join(' · ')}
                        </div>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-[11.5px] text-cinza tabular-nums">
                            {kgBR(item.peso_total_kg)} kg × R$ {item.preco_por_kg.toFixed(2)}
                            {pesos.desconto > 0 && <span className="text-st-aguardando"> (−{kgBR(pesos.desconto)})</span>}
                          </span>
                          <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">
                            {item.valor_total_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex-1 min-w-0 [&>span]:h-10 [&>span]:w-full [&>span]:justify-center">{situacaoPagamento(item, true)}</div>
                        <button
                          type="button"
                          onClick={() => setComprovantesDe(item)}
                          className={`w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-md border ${
                            comComprovante.has(item.id) ? 'bg-eno-800 text-white border-eno-800' : 'border-linha-forte text-tinta-2'
                          }`}
                          aria-label={comComprovante.has(item.id) ? 'Ver comprovante de pagamento' : 'Anexar comprovante de pagamento'}
                        >
                          <FileCheck className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTicketModal(item)}
                          className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-md border border-linha-forte text-tinta-2"
                          aria-label={`Ver ticket ${item.numero_ticket}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* A partir de sm: tabela densa */}
              <TabelaDados className="hidden sm:block">
                <thead className={tabela.thead}>
                  <tr>
                    <Th>Ticket</Th>
                    <Th>Data</Th>
                    <Th>Agricultor</Th>
                    <Th numero>Preço/kg</Th>
                    <Th numero>Sacos</Th>
                    <Th numero>Peso líquido</Th>
                    <Th numero>Total</Th>
                    <Th>Pagamento</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {calculosFiltrados.map(item => {
                    const pesos = pesosDoCalculo(item);
                    return (
                      <tr key={item.id} className={tabela.tr}>
                        <Td className="font-semibold text-tinta tabular-nums whitespace-nowrap">{item.numero_ticket}</Td>
                        <Td className="tabular-nums whitespace-nowrap">{formatarDataBR(item.data)}</Td>
                        <Td className="max-w-[260px]">
                          <div className="font-semibold text-tinta truncate">{item.fornecedor_nome}</div>
                          <div className="text-[11.5px] text-cinza truncate">
                            {[item.fornecedor_propriedade, item.fornecedor_cidade_uf].filter(Boolean).join(' · ')}
                          </div>
                        </Td>
                        <Td numero>R$ {item.preco_por_kg.toFixed(2)}</Td>
                        <Td numero>{item.total_sacos}</Td>
                        <Td numero>
                          <div className="font-semibold text-tinta">{kgBR(item.peso_total_kg)} kg</div>
                          {pesos.desconto > 0 && (
                            <div className="text-[11px] text-st-aguardando" title={descricaoDesconto(item)}>
                              bruto {pesos.bruto.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} − {pesos.desconto.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                            </div>
                          )}
                        </Td>
                        <Td numero>
                          <span className="font-bold text-tinta text-[13.5px]">
                            {item.valor_total_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap">{situacaoPagamento(item)}</Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setComprovantesDe(item)}
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-[5px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
                                comComprovante.has(item.id) ? 'bg-eno-800 hover:bg-eno-900 text-white' : 'text-cinza hover:bg-papel-3 hover:text-tinta-2'
                              }`}
                              title={comComprovante.has(item.id) ? 'Ver / baixar comprovante de pagamento' : 'Anexar comprovante de pagamento'}
                              aria-label="Comprovante de pagamento"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTicketModal(item)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Ver romaneio / ticket de pesagem"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ticket
                            </button>
                          </div>
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

      {/* ========================================================================= */}
      {/* 5. MODAL NOVA PESAGEM DE MANDIOCA (AGRICULTOR, DATA, LOCAL AUTO, LISTA)    */}
      {/* ========================================================================= */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-5xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-eno-950 border border-eno-700 flex items-center justify-center text-ouro-claro">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Nova Pesagem de Mandioca na Roça (Saco a Saco)
                  </h3>
                  <p className="text-[11px] text-cinza">
                    Lançamento de pesagem individual na colheita • {EMPRESA.razao}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovo(false)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSalvarCalculo} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              
              {/* DADOS DO AGRICULTOR, DATA E LOCAL AUTOMÁTICO */}
              <div className="p-4 rounded-md bg-papel-2 border border-linha space-y-3">
                <span className="font-bold text-tinta uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-eno-700" />
                  1. Dados do Agricultor & Negociação
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Agricultor (Apenas Agricultor) */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-tinta-2 mb-1">
                      Agricultor (Produtor Rural) *
                    </label>
                    <select
                      value={parceiroId}
                      onChange={(e) => setParceiroId(e.target.value)}
                      className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 text-tinta font-bold focus:outline-none focus:border-eno-700 cursor-pointer shadow-xs"
                    >
                      {agricultores.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nome_completo} ({a.nome_propriedade} - {a.endereco.municipio}/{a.endereco.uf})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data da Pesagem (Apenas Data - Horário retirado) */}
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Data da Pesagem *</label>
                    <input
                      type="text"
                      required
                      value={dataPesagem}
                      onChange={(e) => setDataPesagem(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700 shadow-xs"
                    />
                  </div>

                  {/* Local da Roça (Automático da Propriedade do Agricultor) */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-tinta-2 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-eno-700" />
                        Local da Pesagem (Propriedade do Agricultor)
                      </span>
                      <span className="text-[10px] text-eno-700 font-bold uppercase bg-eno-50 px-2 py-0.5 rounded border border-eno-100">
                        Automático
                      </span>
                    </label>
                    <div className="w-full bg-papel-3/60 border border-linha rounded-lg px-3 py-2 text-tinta font-medium flex items-center gap-2">
                      <span className="font-bold text-eno-800">{localAutomatico}</span>
                    </div>
                  </div>

                  {/* Preço por KG */}
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Preço Pago (R$/KG) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cinza font-bold">R$</span>
                      <input
                        type="text"
                        required
                        value={precoPorKg}
                        onChange={(e) => setPrecoPorKg(e.target.value)}
                        placeholder="0.62"
                        className="w-full pl-9 pr-3 py-2 bg-papel border border-linha-forte rounded-lg tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700 shadow-xs"
                      />
                    </div>
                    <span className="text-[10px] text-cinza tabular-nums mt-0.5 block">
                      = R$ {( (parseFloat(precoPorKg.replace(',', '.')) || 0) * 1000 ).toFixed(2)} por Tonelada
                    </span>
                  </div>
                </div>
              </div>

              {/* ÁREA DE LANÇAMENTO SACO A SACO (COM LISTA, EDIÇÃO E EXCLUSÃO) */}
              <div className="p-4 rounded-md bg-papel border-2 border-eno-700/20 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-linha">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4.5 h-4.5 text-eno-800" />
                    <div>
                      <h4 className="font-extrabold text-sm text-tinta uppercase tracking-wide">
                        2. Lançamento dos Pesos Saco a Saco
                      </h4>
                      <p className="text-[11px] text-cinza font-medium">
                        Até 3 casas decimais (ex: 50.850 kg). Digite o peso e aperte <kbd className="px-1.5 py-0.5 bg-papel-3/60 border border-linha-forte rounded tabular-nums text-[10px] text-tinta-2">ENTER</kbd> para inserir.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdicionarLotePadrao(50.0, 5)}
                      className="px-3 py-1.5 rounded-lg bg-eno-50 hover:bg-eno-100 text-eno-800 text-xs font-bold transition-colors cursor-pointer border border-eno-100"
                      title="Adiciona 5 sacos em torno de 50kg para agilizar"
                    >
                      + 5 Sacos Rápidos (~50kg)
                    </button>

                    {sacosForm.length > 0 && (
                      <button
                        type="button"
                        onClick={handleLimparSacos}
                        className="px-3 py-1.5 rounded-lg bg-papel-3/60 hover:bg-st-vencido-bg text-tinta-2 hover:text-st-vencido text-xs font-bold transition-colors cursor-pointer"
                      >
                        Limpar Todos
                      </button>
                    )}
                  </div>
                </div>

                {/* Input de Pesagem (até 3 casas após a vírgula) */}
                <div className="flex items-center gap-3 p-3 bg-papel-2 rounded-md border border-linha">
                  <div className="flex-1 max-w-sm">
                    <label className="block text-[11px] font-bold text-tinta-2 mb-1">
                      Peso do Saco #{sacosForm.length + 1} (em KG - até 3 casas decimais):
                    </label>
                    <div className="relative">
                      <input
                        ref={inputSacoRef}
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="200"
                        value={pesoSacoInput}
                        onChange={(e) => setPesoSacoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdicionarSaco();
                          }
                        }}
                        placeholder="Ex: 51.345"
                        className="w-full px-3.5 py-2 rounded-md border-2 border-eno-700 bg-papel tabular-nums font-extrabold text-tinta text-base focus:outline-none focus:ring-2 focus:ring-eno-700/20 shadow-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 tabular-nums font-bold text-xs text-cinza">
                        KG
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdicionarSaco()}
                    className="mt-5 px-5 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Adicionar Saco #{sacosForm.length + 1}</span>
                  </button>

                  <span className="mt-5 text-cinza text-xs hidden sm:inline">ou pressione <strong>ENTER</strong></span>
                </div>

                {/* RELAÇÃO DE SACOS EM MODO LISTA COM EDITAR E EXCLUIR */}
                <div className="rounded-md border border-linha overflow-hidden bg-papel">
                  <div className="bg-papel-3/60 px-4 py-2 border-b border-linha flex items-center justify-between text-[11px] font-bold text-tinta-2 uppercase tracking-wider">
                    <div className="w-20">Saco</div>
                    <div className="w-32 text-right">Peso (kg)</div>
                    <div className="w-32 text-right">Preço Pago (kg)</div>
                    <div className="w-32 text-right">Valor do Saco</div>
                    <div className="w-24 text-center">Ações</div>
                  </div>

                  <div className="max-h-[240px] overflow-y-auto divide-y divide-linha">
                    {sacosForm.length === 0 ? (
                      <div className="p-8 text-center bg-papel-2 text-cinza">
                        <Scale className="w-8 h-8 mx-auto text-cinza-claro mb-1.5" />
                        <p className="font-bold text-tinta-2">Nenhum saco adicionado ainda.</p>
                        <p className="text-[11px] text-cinza">Digite o peso acima para ir montando a lista saco por saco.</p>
                      </div>
                    ) : (
                      sacosForm.map((saco) => {
                        const precoKg = parseFloat(precoPorKg.replace(',', '.')) || 0;
                        const valorSaco = saco.peso_kg * precoKg;
                        const emEdicao = editandoSacoNumero === saco.numero;

                        return (
                          <div
                            key={saco.numero}
                            className={`px-4 py-2 flex items-center justify-between transition-colors ${
                              emEdicao ? 'bg-st-aguardando-bg/80' : 'hover:bg-papel-2/80'
                            }`}
                          >
                            {/* Número do Saco */}
                            <div className="w-20 font-bold text-tinta tabular-nums flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-papel-3/60 border border-linha text-xs">
                                Saco {saco.numero}
                              </span>
                            </div>

                            {/* Peso (kg) com edição inline */}
                            <div className="w-32 text-right tabular-nums font-bold">
                              {emEdicao ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="text"
                                    value={editandoPesoInput}
                                    onChange={(e) => setEditandoPesoInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSalvarEdicaoSaco(saco.numero);
                                      } else if (e.key === 'Escape') {
                                        handleCancelarEdicaoSaco();
                                      }
                                    }}
                                    className="w-20 px-2 py-1 bg-papel border-2 border-ouro rounded text-right font-bold text-xs"
                                    autoFocus
                                  />
                                  <span className="text-[10px] text-cinza">kg</span>
                                </div>
                              ) : (
                                <span className="text-tinta text-xs">
                                  {saco.peso_kg.toFixed(3).replace('.', ',')} kg
                                </span>
                              )}
                            </div>

                            {/* Preço Pago kg */}
                            <div className="w-32 text-right tabular-nums text-tinta-2 text-xs">
                              R$ {precoKg.toFixed(2)}/kg
                            </div>

                            {/* Valor do Saco */}
                            <div className="w-32 text-right tabular-nums font-bold text-eno-800 text-xs">
                              R$ {valorSaco.toFixed(2).replace('.', ',')}
                            </div>

                            {/* Ações (Editar e Deletar Linha) */}
                            <div className="w-24 flex items-center justify-center gap-1">
                              {emEdicao ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSalvarEdicaoSaco(saco.numero)}
                                    className="p-1 rounded bg-eno-600 hover:bg-eno-700 text-white cursor-pointer"
                                    title="Confirmar alteração"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelarEdicaoSaco}
                                    className="p-1 rounded bg-linha hover:bg-linha-forte text-tinta-2 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleIniciarEdicaoSaco(saco.numero, saco.peso_kg)}
                                    className="p-1.5 rounded-lg bg-papel-3/60 hover:bg-st-aguardando-bg text-tinta-2 hover:text-st-aguardando transition-colors cursor-pointer"
                                    title="Editar o peso deste saco"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoverSaco(saco.numero)}
                                    className="p-1.5 rounded-lg bg-papel-3/60 hover:bg-st-vencido-bg text-tinta-2 hover:text-st-vencido transition-colors cursor-pointer"
                                    title="Deletar este saco"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* DESCONTO NA PESAGEM (CASCA / TERRA / IMPUREZA / TARA) */}
                <div className="p-3 rounded-md bg-st-aguardando-bg/70 border border-ouro-claro/60 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-4 text-[11px] font-bold text-st-aguardando uppercase tracking-wider">
                    Desconto na pesagem (opcional) — o valor é calculado sobre o peso líquido
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-st-aguardando mb-1">% de desconto</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={descontoPctInput}
                        onChange={(e) => setDescontoPctInput(e.target.value)}
                        placeholder="Ex: 3"
                        className="w-full pl-3 pr-7 py-2 bg-papel border border-ouro rounded-lg tabular-nums font-bold text-tinta focus:outline-none focus:border-ouro"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-st-aguardando font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-st-aguardando mb-1">Tara / desconto em kg</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={descontoTaraInput}
                        onChange={(e) => setDescontoTaraInput(e.target.value)}
                        placeholder="Ex: 15"
                        className="w-full pl-3 pr-8 py-2 bg-papel border border-ouro rounded-lg tabular-nums font-bold text-tinta focus:outline-none focus:border-ouro"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-st-aguardando font-bold text-[10px]">KG</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-st-aguardando mb-1">Motivo</label>
                    <input
                      type="text"
                      value={motivoDesconto}
                      onChange={(e) => setMotivoDesconto(e.target.value)}
                      placeholder="Ex: casca, terra, impureza, tara dos sacos"
                      list="motivos-desconto-roca"
                      className="w-full bg-papel border border-ouro rounded-lg px-3 py-2 text-tinta focus:outline-none focus:border-ouro"
                    />
                    <datalist id="motivos-desconto-roca">
                      <option value="Casca" />
                      <option value="Terra" />
                      <option value="Impureza" />
                      <option value="Tara dos sacos" />
                      <option value="Casca e terra" />
                    </datalist>
                  </div>
                </div>

                {/* PAINEL DE TOTAIS EM TEMPO REAL */}
                <div className="p-4 rounded-md bg-eno-950 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] text-ouro-claro font-bold uppercase tracking-wider block">Total de Sacos:</span>
                      <strong className="text-lg font-extrabold tabular-nums text-white">{totaisForm.totalSacos} sacos</strong>
                    </div>

                    <div className="h-8 w-px bg-eno-800" />

                    <div>
                      <span className="text-[10px] text-ouro-claro font-bold uppercase tracking-wider block">Peso Bruto:</span>
                      <strong className="text-lg font-extrabold tabular-nums text-white">
                        {totaisForm.pesoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg
                      </strong>
                    </div>

                    <div className="h-8 w-px bg-eno-800" />

                    <div>
                      <span className="text-[10px] text-ouro-claro font-bold uppercase tracking-wider block">Desconto:</span>
                      <strong className="text-lg font-extrabold tabular-nums text-ouro-claro">
                        - {totaisForm.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg
                      </strong>
                    </div>

                    <div className="h-8 w-px bg-eno-800" />

                    <div>
                      <span className="text-[10px] text-ouro-claro font-bold uppercase tracking-wider block">Peso Líquido:</span>
                      <strong className="text-lg font-extrabold tabular-nums text-white">
                        {totaisForm.pesoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg
                        <span className="text-xs font-normal text-ouro-claro ml-1.5">
                          ({(totaisForm.pesoTotal / 1000).toFixed(3)} Ton)
                        </span>
                      </strong>
                    </div>

                    <div className="h-8 w-px bg-eno-800 hidden sm:block" />

                    <div className="hidden sm:block">
                      <span className="text-[10px] text-ouro-claro font-bold uppercase tracking-wider block">Média por Saco:</span>
                      <strong className="text-sm font-bold tabular-nums text-eno-100">
                        {totaisForm.pesoMedio.toFixed(3).replace('.', ',')} kg/saco
                      </strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-ouro-claro font-bold uppercase tracking-wider block">Valor Total Estimado da Carga:</span>
                    <strong className="text-xl font-extrabold tabular-nums text-ouro-claro">
                      {totaisForm.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="block font-bold text-tinta-2 mb-1">Observações da Carga na Roça (Opcional)</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Mandioca fresca colhida hoje, descarrego direto no lavador..."
                  className="w-full bg-papel-2 border border-linha rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:border-eno-700"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-linha flex items-center justify-between max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-5 py-2.5 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={sacosForm.length === 0}
                  className="px-6 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Salvar Pesagem & Gerar Pedido de Compra</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL VISUALIZAR FOLHA DE PESAGEM / TICKET (TAMANHO A4, MODO LISTA)    */}
      {/* ========================================================================= */}
      {ticketModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-4xl sm:max-w-5xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo de Controles */}
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-ouro-claro" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Romaneio & Ticket da Roça - {ticketModal.numero_ticket}
                  </h3>
                  <p className="text-[11px] text-cinza">
                    Formato Padrão A4 • Relação em Modo Lista com Pesos e Valores
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportarPNG}
                  disabled={exportando}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-eno-700 hover:bg-eno-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Baixar imagem PNG para envio por WhatsApp"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar PNG</span>
                </button>

                <button
                  onClick={exportarPDF}
                  disabled={exportando}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-papel text-tinta hover:bg-papel-3/60 text-xs font-bold transition-colors cursor-pointer shadow-xs border border-linha-forte"
                  title="Baixar documento PDF oficial tamanho A4"
                >
                  <Printer className="w-3.5 h-3.5 text-eno-800" />
                  <span>Exportar PDF (A4)</span>
                </button>

                <button
                  onClick={() => setTicketModal(null)}
                  className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ÁREA DO DOCUMENTO FORMATADO EM TAMANHO A4 (794px x 1123px proporção) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-linha flex justify-center">
              <div
                ref={folhaTicketRef}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  width: '100%',
                  maxWidth: '794px',
                  minHeight: '1000px',
                  boxSizing: 'border-box'
                }}
                className="p-8 sm:p-10 rounded-md shadow-xl border border-linha-forte space-y-5"
              >
                {/* CABEÇALHO DO TICKET */}
                <div style={{ borderBottom: '2px solid #064e3b', paddingBottom: '16px' }} className="flex items-start justify-between">
                  <div>
                    <h1 style={{ color: '#064e3b', fontWeight: 900, fontSize: '22px', margin: 0 }}>
                      {EMPRESA.razao.toUpperCase()}
                    </h1>
                    <p style={{ color: '#475569', fontSize: '12px', fontWeight: 600, margin: '2px 0 0 0' }}>
                      Indústria & Comércio de Féculas e Farinhas de Mandioca
                    </p>
                    <p style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace', margin: '2px 0 0 0' }}>
                      CNPJ: {EMPRESA.cnpj} • {EMPRESA.endereco} • {EMPRESA.telefone}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      Ticket de Pesagem na Roça
                    </span>
                    <strong style={{ color: '#064e3b', fontSize: '18px', fontFamily: 'monospace', fontWeight: 900 }}>
                      {ticketModal.numero_ticket}
                    </strong>
                    <div style={{ color: '#334155', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                      Data: {formatarDataBR(ticketModal.data)}
                    </div>
                  </div>
                </div>

                {/* DADOS DO AGRICULTOR E DA ROÇA */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '16px',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      Produtor Rural (Agricultor)
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                      {ticketModal.fornecedor_nome}
                    </strong>
                    {ticketModal.fornecedor_propriedade && (
                      <p style={{ color: '#064e3b', fontWeight: 600, margin: '2px 0 0 0' }}>
                        {ticketModal.fornecedor_propriedade}
                      </p>
                    )}
                    <p style={{ color: '#64748b', fontFamily: 'monospace', margin: '2px 0 0 0', fontSize: '11px' }}>
                      {ticketModal.fornecedor_cpf_cnpj} • {ticketModal.fornecedor_cidade_uf}
                    </p>
                    {ticketModal.fornecedor_chave_pix && (
                      <p style={{ color: '#475569', fontFamily: 'monospace', margin: '2px 0 0 0', fontSize: '11px' }}>
                        Chave PIX: {ticketModal.fornecedor_chave_pix}
                      </p>
                    )}
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      Local da Roça / Condições
                    </span>
                    <strong style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                      {ticketModal.local_pesagem}
                    </strong>
                    <p style={{ color: '#334155', margin: '3px 0 0 0', fontWeight: 500 }}>
                      Preço Pago: <strong>R$ {ticketModal.preco_por_kg.toFixed(2)}/kg</strong> (R$ {ticketModal.preco_por_tonelada.toFixed(2)}/Ton)
                    </p>
                    <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '11px' }}>
                      Pesador Resp.: {ticketModal.pesador_responsavel}
                    </p>
                    <p style={{ color: '#064e3b', margin: '2px 0 0 0', fontSize: '11px', fontWeight: 700 }}>
                      Situação: {ticketModal.situacao_pagamento === 'JA_PAGO' ? 'Já Pago no Ato da Roça' : ticketModal.situacao_pagamento === 'A_PAGAR' ? 'A Pagar (Programado)' : 'Pendente de Definição'}
                    </p>
                  </div>
                </div>

                {/* RELAÇÃO DE PESAGEM SACO A SACO EM MODO LISTA EM LINHAS COMO NO NOVA PESAGEM */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
                      Relação de Pesagem Saco a Saco ({ticketModal.total_sacos} sacos)
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                      Média: {ticketModal.peso_medio_saco_kg.toFixed(3).replace('.', ',')} kg/saco
                    </span>
                  </div>

                  {/* TABELA EM LINHAS HORIZONTAIS COMO O NOVA PESAGEM */}
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#f1f5f9',
                        padding: '8px 16px',
                        borderBottom: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#334155',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      <div style={{ width: '100px' }}>Saco</div>
                      <div style={{ width: '140px', textAlign: 'right' }}>Peso Aferido (kg)</div>
                      <div style={{ width: '140px', textAlign: 'right' }}>Preço Pago (kg)</div>
                      <div style={{ width: '150px', textAlign: 'right' }}>Valor do Saco</div>
                    </div>

                    <div>
                      {ticketModal.sacos.map((saco, idx) => {
                        const precoKg = ticketModal.preco_por_kg || 0;
                        const valorSaco = saco.peso_kg * precoKg;
                        const zebrado = idx % 2 === 1;

                        return (
                          <div
                            key={saco.numero}
                            style={{
                              padding: '8px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: zebrado ? '#f8fafc' : '#ffffff',
                              borderBottom: idx < ticketModal.sacos.length - 1 ? '1px solid #f1f5f9' : 'none',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}
                          >
                            <div style={{ width: '100px', fontWeight: 700, color: '#0f172a' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                Saco {saco.numero}
                              </span>
                            </div>
                            <div style={{ width: '140px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              {saco.peso_kg.toFixed(3).replace('.', ',')} kg
                            </div>
                            <div style={{ width: '140px', textAlign: 'right', color: '#475569' }}>
                              R$ {precoKg.toFixed(2)}/kg
                            </div>
                            <div style={{ width: '150px', textAlign: 'right', fontWeight: 800, color: '#064e3b' }}>
                              R$ {valorSaco.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RESUMO DOS TOTAIS (CAIXA VERDE OFICIAL) */}
                <div
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#ffffff',
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', display: 'block' }}>
                        Total de Sacos:
                      </span>
                      <strong style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' }}>
                        {ticketModal.total_sacos} sacos
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', display: 'block' }}>
                        Peso Bruto:
                      </span>
                      <strong style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' }}>
                        {pesosDoCalculo(ticketModal).bruto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', display: 'block' }}>
                        Desconto{descricaoDesconto(ticketModal) ? ` (${descricaoDesconto(ticketModal)})` : ''}:
                      </span>
                      <strong style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: '#fcd34d' }}>
                        - {pesosDoCalculo(ticketModal).desconto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', display: 'block' }}>
                        Peso Líquido Total:
                      </span>
                      <strong style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' }}>
                        {ticketModal.peso_total_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg{' '}
                        <span style={{ fontSize: '12px', fontWeight: 400, color: '#a7f3d0' }}>
                          ({(ticketModal.peso_total_kg / 1000).toFixed(3)} Ton)
                        </span>
                      </strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', display: 'block' }}>
                      Valor Total da Carga:
                    </span>
                    <strong style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#bef264' }}>
                      {ticketModal.valor_total_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                </div>

                {ticketModal.observacoes && (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '11px'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Observações:
                    </span>
                    <p style={{ color: '#475569', margin: 0 }}>{ticketModal.observacoes}</p>
                  </div>
                )}

                {/* ASSINATURAS */}
                <div style={{ paddingTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '32px', textAlign: 'center', fontSize: '11px' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                    <strong style={{ color: '#0f172a', display: 'block' }}>{ticketModal.fornecedor_nome}</strong>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>Produtor Rural (Agricultor)</span>
                  </div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                    <strong style={{ color: '#0f172a', display: 'block' }}>{ticketModal.pesador_responsavel}</strong>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>{EMPRESA.razao} (Balança/Campo)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL DEFINIR PAGAMENTO                                                */}
      {/* ========================================================================= */}
      {modalPagamento && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-3xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Header */}
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ouro-escuro/20 text-st-aguardando border border-ouro/40 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Definir Situação do Pagamento da Compra na Roça
                  </h3>
                  <p className="text-[11px] text-cinza">
                    Lote {modalPagamento.numero_ticket} • Agricultor: {modalPagamento.fornecedor_nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalPagamento(null)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Form */}
            <form onSubmit={handleSalvarDefinicaoPagamento} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              
              {/* Card de Resumo da Compra */}
              <div className="p-4 rounded-md bg-papel-2 border border-linha flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cinza uppercase">Agricultor</span>
                  <div className="font-bold text-sm text-tinta">{modalPagamento.fornecedor_nome}</div>
                  <div className="text-[11px] text-cinza">{modalPagamento.fornecedor_propriedade} • {modalPagamento.local_pesagem}</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-cinza uppercase">Valor Total da Carga</span>
                  <div className="text-lg font-extrabold tabular-nums text-eno-800">
                    {modalPagamento.valor_total_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] text-cinza tabular-nums">
                    {modalPagamento.total_sacos} sacos • {modalPagamento.peso_total_kg.toLocaleString('pt-BR')} kg líquidos
                    {pesosDoCalculo(modalPagamento).desconto > 0 && ` (bruto ${pesosDoCalculo(modalPagamento).bruto.toLocaleString('pt-BR')} kg)`}
                  </div>
                </div>
              </div>

              {/* Escolha do Tipo de Pagamento */}
              <div>
                <label className="block font-bold text-tinta-2 mb-2">Qual foi a situação desta negociação?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    onClick={() => setTipoPagamentoForm('JA_PAGO')}
                    className={`p-3.5 rounded-md border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      tipoPagamentoForm === 'JA_PAGO'
                        ? 'border-eno-600 bg-eno-50 text-eno-800 font-bold shadow-xs'
                        : 'border-linha hover:border-linha-forte bg-papel text-tinta-2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">1. Já Pago no Ato</span>
                      <CheckCircle2 className={`w-4 h-4 ${tipoPagamentoForm === 'JA_PAGO' ? 'text-eno-700' : 'text-cinza-claro'}`} />
                    </div>
                    <p className="text-[10px] text-cinza font-normal">
                      Pago na hora (PIX/Dinheiro). Lança despesa quitada no financeiro.
                    </p>
                  </label>

                  <label
                    onClick={() => setTipoPagamentoForm('A_PAGAR')}
                    className={`p-3.5 rounded-md border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      tipoPagamentoForm === 'A_PAGAR'
                        ? 'border-st-producao/30 bg-st-producao-bg text-st-producao font-bold shadow-xs'
                        : 'border-linha hover:border-linha-forte bg-papel text-tinta-2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">2. A Pagar (Programado)</span>
                      <Clock className={`w-4 h-4 ${tipoPagamentoForm === 'A_PAGAR' ? 'text-st-producao' : 'text-cinza-claro'}`} />
                    </div>
                    <p className="text-[10px] text-cinza font-normal">
                      Acertar depois com o produtor. Lança título no Contas a Pagar.
                    </p>
                  </label>

                  <label
                    onClick={() => setTipoPagamentoForm('ADIANTAMENTO_PARCIAL')}
                    className={`p-3.5 rounded-md border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      tipoPagamentoForm === 'ADIANTAMENTO_PARCIAL'
                        ? 'border-st-producao/30 bg-st-producao-bg text-st-producao font-bold shadow-xs'
                        : 'border-linha hover:border-linha-forte bg-papel text-tinta-2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">3. Adiantamento Parcial</span>
                      <CreditCard className={`w-4 h-4 ${tipoPagamentoForm === 'ADIANTAMENTO_PARCIAL' ? 'text-st-producao' : 'text-cinza-claro'}`} />
                    </div>
                    <p className="text-[10px] text-cinza font-normal">
                      Pagou uma parte agora e o saldo restante fica a pagar no financeiro.
                    </p>
                  </label>
                </div>
              </div>

              {/* Detalhes conforme a escolha */}
              <div className="p-4 rounded-md bg-papel-2 border border-linha grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {tipoPagamentoForm === 'ADIANTAMENTO_PARCIAL' && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-3 p-3 bg-st-producao-bg/70 border border-st-producao/30 rounded-md">
                    <div>
                      <label className="block font-bold text-st-producao mb-1">Valor Pago no Ato (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={valorAdiantado}
                        onChange={(e) => setValorAdiantado(e.target.value)}
                        placeholder="Ex: 500.00"
                        className="w-full bg-papel border border-st-producao/30 rounded-lg px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-st-producao mb-1">Saldo Restante a Pagar</label>
                      <div className="w-full bg-papel border border-st-producao/30 rounded-lg px-3 py-2 tabular-nums font-extrabold text-st-producao">
                        {Math.max(0, modalPagamento.valor_total_estimado - (parseFloat(valorAdiantado.replace(',', '.')) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                    {modalPagamento.valor_total_estimado - (parseFloat(valorAdiantado.replace(',', '.')) || 0) > 0.009 && (
                      <div className="col-span-2">
                        <label className="block font-bold text-st-producao mb-1">Vencimento do saldo</label>
                        <input
                          type="date"
                          required
                          value={vencimentoSaldo}
                          onChange={(e) => setVencimentoSaldo(e.target.value)}
                          className="w-full bg-papel border border-st-producao/30 rounded-lg px-3 py-2 tabular-nums text-tinta focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Forma de Pagamento</label>
                  <select
                    value={formaPagamentoEscolhida}
                    onChange={(e) => setFormaPagamentoEscolhida(e.target.value)}
                    className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 font-medium text-tinta focus:outline-none focus:border-eno-700 cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">
                    {tipoPagamentoForm === 'A_PAGAR' ? 'Data Prevista de Vencimento' : 'Data do Pagamento'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dataPagamentoOuVenc}
                    onChange={(e) => setDataPagamentoOuVenc(e.target.value)}
                    className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 tabular-nums text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-tinta-2 mb-1">Conta Bancária de Origem</label>
                  <input
                    type="text"
                    value={contaBancaria}
                    onChange={(e) => setContaBancaria(e.target.value)}
                    className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-tinta-2 mb-1">Observações do Acerto / Recibo</label>
                  <input
                    type="text"
                    value={obsPagamento}
                    onChange={(e) => setObsPagamento(e.target.value)}
                    placeholder="Ex: Comprovante enviado via WhatsApp para o produtor..."
                    className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>

                {tipoPagamentoForm !== 'A_PAGAR' && (
                  <div className="sm:col-span-2">
                    <CampoAnexoComprovante arquivo={anexoPagamento} onChange={setAnexoPagamento} />
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-linha flex items-center justify-between max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setModalPagamento(null)}
                  className="px-5 py-2.5 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-ouro-claro" />
                  <span>Confirmar & Atualizar Financeiro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {comprovantesDe && (
        <ModalComprovantes calculo={comprovantesDe} onFechar={() => setComprovantesDe(null)} permitirRemover permitirAnexar />
      )}

    </div>
  );
}
