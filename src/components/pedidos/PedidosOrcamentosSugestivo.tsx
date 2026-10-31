import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Building2,
  User,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  Trash2,
  Printer,
  Sparkles,
  X,
  Save,
  Check,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  Share2,
  FileDown,
  Layers,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import {
  PedidoVenda,
  carregarPedidosVenda,
  salvarPedidosVenda,
  moverPedidoEtapa,
  CLIENTES_LOOKUP,
  RCAS_LOOKUP,
  PRODUTOS_VENDA_DISPONIVEIS,
  obterProdutosVendaDisponiveis,
  obterClientesDisponiveis
} from '../../data/pedidosVendaData';
import {
  carregarTabelasPreco
} from '../../data/produtosData';
import { criarCenarioTesteNovoUsuario } from '../../data/sistemaReset';
import { PedidosNavTabs } from './PedidosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function PedidosOrcamentosSugestivo({ onNavigate }: Props) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS');
  const [filtroSubtipo, setFiltroSubtipo] = useState<'TODOS' | 'Orçamento' | 'Pedido Sugestivo' | 'Pedido'>('TODOS');

  // Modal Novo / Proposta Comercial
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<PedidoVenda | null>(null);

  // Clientes e Produtos de venda carregados dinamicamente dos cadastros
  const [clientesDisponiveis, setClientesDisponiveis] = useState(() => obterClientesDisponiveis());
  const [produtosDisponiveis, setProdutosDisponiveis] = useState(() => obterProdutosVendaDisponiveis());
  const [tabelasDisponiveis, setTabelasDisponiveis] = useState(() => carregarTabelasPreco());

  // Form State
  const [subtipoForm, setSubtipoForm] = useState<'Orçamento' | 'Pedido Sugestivo' | 'Pedido'>('Orçamento');
  const [modoLancamentoForm, setModoLancamentoForm] = useState<'FARDO' | 'UNITARIO'>('FARDO');
  const [clienteIdForm, setClienteIdForm] = useState(() => obterClientesDisponiveis()[0]?.id || '');
  const [tabelaIdForm, setTabelaIdForm] = useState('');
  const [rcaIdForm, setRcaIdForm] = useState(RCAS_LOOKUP[0].id);
  const [tipoFreteForm, setTipoFreteForm] = useState<'FOB (Retira na Fábrica)' | 'CIF (Entrega Grupo ENO)'>('CIF (Entrega Grupo ENO)');
  const [prazoPagamentoForm, setPrazoPagamentoForm] = useState('Boleto Bancário 28 Dias');
  const [diasValidadeForm, setDiasValidadeForm] = useState('7');
  const [observacoesForm, setObservacoesForm] = useState('');

  // Controle de visualização e exportação do documento
  const [tipoDocumentoVisualizacao, setTipoDocumentoVisualizacao] = useState<
    'Orçamento' | 'Pedido Sugestivo' | 'Pedido'
  >('Orçamento');
  const [modoExibicao, setModoExibicao] = useState<'FARDO' | 'UNITARIO'>('FARDO');
  const [zoomDocumento, setZoomDocumento] = useState<number>(100);
  const [gerandoExportacao, setGerandoExportacao] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Itens do Form
  const [itensForm, setItensForm] = useState<Array<{
    produtoId: string;
    tipoEmbalagem: 'Saco 25kg' | 'Big Bag 1000kg' | 'Fardo 10x1kg' | 'Caixa' | 'Granel' | string;
    quantidade: number;
    precoUnitario: number;
    unidadesPorFardo?: number;
  }>>(() => {
    const list = obterProdutosVendaDisponiveis();
    const prod0 = list[0];
    if (!prod0) {
      return [];
    }
    return [
      {
        produtoId: prod0.id,
        tipoEmbalagem: prod0.tipo_embalagem,
        quantidade: 100,
        precoUnitario: prod0.preco_unitario,
        unidadesPorFardo: prod0.unidades_por_fardo || 10
      }
    ];
  });

  // Carregar pedidos, produtos e clientes
  const recarregar = () => {
    const todos = carregarPedidosVenda();
    setPedidos(todos.filter(p => p.etapa === 'ORCAMENTO'));
    const prods = obterProdutosVendaDisponiveis();
    const clis = obterClientesDisponiveis();
    const tabs = carregarTabelasPreco();
    setProdutosDisponiveis(prods);
    setClientesDisponiveis(clis);
    setTabelasDisponiveis(tabs);
    if (clis.length > 0 && !clienteIdForm) {
      setClienteIdForm(clis[0].id);
    }
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener('produtos_updated', handleUpdate);
    window.addEventListener('clientes_updated', handleUpdate);
    window.addEventListener('tabelas_preco_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    return () => {
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener('produtos_updated', handleUpdate);
      window.removeEventListener('clientes_updated', handleUpdate);
      window.removeEventListener('tabelas_preco_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  const produtosFiltradosPorTabela = useMemo(() => {
    if (!tabelaIdForm) return [];
    const tab = tabelasDisponiveis.find(t => t.id === tabelaIdForm);
    if (!tab || !tab.produtos_ids) return [];
    return produtosDisponiveis.filter(p => tab.produtos_ids?.includes(p.id)).map(p => {
      const desconto = tab.desconto_padrao_percentual || 0;
      const precoUnit = p.preco_unitario * (1 - desconto / 100);
      const precoAvulso = (p.preco_unitario_avulso || 0) * (1 - desconto / 100);
      return {
        ...p,
        preco_unitario: precoUnit,
        preco_unitario_avulso: precoAvulso
      };
    });
  }, [tabelaIdForm, tabelasDisponiveis, produtosDisponiveis]);

  // Quando abrir o modal de detalhes (Visualizador de Documento)
  const abrirVisualizacao = (pedido: PedidoVenda) => {
    setModalDetalhes(pedido);
    setZoomDocumento(100);
    if (pedido.subtipo_venda) {
      setTipoDocumentoVisualizacao(pedido.subtipo_venda);
    } else if (pedido.origem === 'Sugestão Reposição') {
      setTipoDocumentoVisualizacao('Pedido Sugestivo');
    } else if (pedido.tipo === 'PEDIDO_VENDA') {
      setTipoDocumentoVisualizacao('Pedido');
    } else {
      setTipoDocumentoVisualizacao('Orçamento');
    }
    setModoExibicao(pedido.modo_exibicao_padrao || 'FARDO');
  };

  // Helper para obter valores calculados por Fardo vs Unitário
  const calcularValoresItem = (it: any, modo: 'FARDO' | 'UNITARIO') => {
    const prod = produtosDisponiveis.find(p => p.id === it.produto_id) || PRODUTOS_VENDA_DISPONIVEIS.find(p => p.id === it.produto_id);
    const fator = it.unidades_por_fardo || prod?.unidades_por_fardo || (it.tipo_embalagem === 'Fardo 10x1kg' ? 10 : it.tipo_embalagem === 'Caixa' ? 10 : 25);

    if (modo === 'UNITARIO') {
      const qtdUnit = it.quantidade * fator;
      const precoUnit = it.preco_unitario / fator;
      const unidadeNome = it.tipo_embalagem === 'Fardo 10x1kg' ? 'pct 1kg' : it.tipo_embalagem === 'Caixa' ? 'unid' : 'kg';
      return {
        apresentacao: `${it.tipo_embalagem} (${fator} ${unidadeNome})`,
        quantidade: qtdUnit,
        unidadeRotulo: unidadeNome,
        preco: precoUnit,
        subtotal: it.subtotal
      };
    } else {
      const unidadeNome = it.tipo_embalagem.includes('Fardo') ? 'fardos' : it.tipo_embalagem.includes('Caixa') ? 'caixas' : 'sacos';
      return {
        apresentacao: it.tipo_embalagem,
        quantidade: it.quantidade,
        unidadeRotulo: unidadeNome,
        preco: it.preco_unitario,
        subtotal: it.subtotal
      };
    }
  };

  // Exportar Excel (.csv compatível com Microsoft Excel e acentuação brasileira)
  const exportarExcel = (pedido: PedidoVenda) => {
    const separador = ';';
    let csv = '\uFEFF'; // BOM UTF-8 para abrir perfeitamente no Excel
    csv += `GRUPO ENO AGROINDUSTRIAL - ${tipoDocumentoVisualizacao.toUpperCase()} (${modoExibicao === 'FARDO' ? 'MODO FARDO' : 'MODO UNITÁRIO'})\n`;
    csv += `Número Documento${separador}${pedido.numero_pedido}\n`;
    csv += `Tipo de Documento${separador}${tipoDocumentoVisualizacao}\n`;
    csv += `Apresentação de Valores${separador}${modoExibicao === 'FARDO' ? 'Fardo / Embalagem Agrupada' : 'Unitário (Kg / Pacote Individual)'}\n`;
    csv += `Cliente${separador}${pedido.cliente_nome}\n`;
    csv += `CNPJ/CPF${separador}${pedido.cliente_cnpj_cpf}\n`;
    csv += `Cidade/UF${separador}${pedido.cliente_cidade_uf}\n`;
    csv += `RCA Responsável${separador}${pedido.rca_nome}\n`;
    csv += `Data Emissão${separador}${pedido.data_emissao}\n`;
    csv += `Condição de Frete${separador}${pedido.tipo_frete}\n`;
    csv += `Prazo de Pagamento${separador}${pedido.prazo_pagamento}\n\n`;

    // Tabela de itens conforme modo
    if (modoExibicao === 'FARDO') {
      csv += `Item${separador}Embalagem${separador}Qtd (Fardos/Sacos)${separador}Preço por Fardo (R$)${separador}Subtotal (R$)\n`;
      pedido.itens.forEach(it => {
        csv += `"${it.produto_nome}"${separador}"${it.tipo_embalagem}"${separador}${it.quantidade}${separador}${it.preco_unitario.toFixed(2).replace('.', ',')}${separador}${it.subtotal.toFixed(2).replace('.', ',')}\n`;
      });
    } else {
      csv += `Item${separador}Apresentação${separador}Qtd (Unidades/Kg)${separador}Preço Unitário (R$)${separador}Subtotal (R$)\n`;
      pedido.itens.forEach(it => {
        const valores = calcularValoresItem(it, 'UNITARIO');
        csv += `"${it.produto_nome}"${separador}"${valores.apresentacao}"${separador}${valores.quantidade}${separador}${valores.preco.toFixed(2).replace('.', ',')}${separador}${valores.subtotal.toFixed(2).replace('.', ',')}\n`;
      });
    }

    csv += `\nTOTAL GERAL${separador}${separador}${(pedido.peso_total_kg / 1000).toFixed(2).replace('.', ',')} Ton${separador}${separador}R$ ${pedido.valor_total.toFixed(2).replace('.', ',')}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const modoTag = modoExibicao === 'FARDO' ? 'Fardo' : 'Unitario';
    const nomeArquivo = `${tipoDocumentoVisualizacao.replace(/\s+/g, '_')}_${pedido.numero_pedido}_${modoTag}.csv`;
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar Imagem PNG
  const exportarPNG = async (pedido: PedidoVenda) => {
    if (!printRef.current) return;
    try {
      setGerandoExportacao(true);
      const zoomSalvo = zoomDocumento;
      if (zoomDocumento !== 100) {
        setZoomDocumento(100);
        await new Promise(r => setTimeout(r, 60));
      }

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      if (zoomSalvo !== 100) {
        setZoomDocumento(zoomSalvo);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const modoTag = modoExibicao === 'FARDO' ? 'Fardo' : 'Unitario';
      const nomeArquivo = `${tipoDocumentoVisualizacao.replace(/\s+/g, '_')}_${pedido.numero_pedido}_${modoTag}.png`;
      link.download = nomeArquivo;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar PNG:', err);
    } finally {
      setGerandoExportacao(false);
    }
  };

  // Exportar Documento PDF Oficial A4
  const exportarPDF = async (pedido: PedidoVenda) => {
    if (!printRef.current) return;
    try {
      setGerandoExportacao(true);
      const zoomSalvo = zoomDocumento;
      if (zoomDocumento !== 100) {
        setZoomDocumento(100);
        await new Promise(r => setTimeout(r, 60));
      }

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      if (zoomSalvo !== 100) {
        setZoomDocumento(zoomSalvo);
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 210; // largura A4 mm
      const pageHeight = 297; // altura A4 mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let position = 0;
        let heightLeft = imgHeight;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      const modoTag = modoExibicao === 'FARDO' ? 'Fardo' : 'Unitario';
      const nomeArquivo = `${tipoDocumentoVisualizacao.replace(/\s+/g, '_')}_${pedido.numero_pedido}_${modoTag}.pdf`;
      pdf.save(nomeArquivo);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGerandoExportacao(false);
    }
  };

  // Métricas
  const metricas = useMemo(() => {
    const total = pedidos.length;
    const valorTotal = pedidos.reduce((acc, p) => acc + p.valor_total, 0);
    const volumeTotalKg = pedidos.reduce((acc, p) => acc + p.peso_total_kg, 0);
    const orcamentos = pedidos.filter(p => !p.subtipo_venda || p.subtipo_venda === 'Orçamento').length;
    const sugestivos = pedidos.filter(p => p.subtipo_venda === 'Pedido Sugestivo' || p.origem === 'Sugestão Reposição').length;
    const pedidosVenda = pedidos.filter(p => p.subtipo_venda === 'Pedido' || p.tipo === 'PEDIDO_VENDA').length;

    return { total, valorTotal, volumeTotalKg, orcamentos, sugestivos, pedidosVenda };
  }, [pedidos]);

  // Filtros
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const matchBusca =
        p.numero_pedido.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.rca_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_cidade_uf.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;
      if (filtroOrigem !== 'TODAS' && p.origem !== filtroOrigem) return false;

      if (filtroSubtipo !== 'TODOS') {
        if (filtroSubtipo === 'Pedido Sugestivo') {
          if (p.subtipo_venda !== 'Pedido Sugestivo' && p.origem !== 'Sugestão Reposição') return false;
        } else if (filtroSubtipo === 'Orçamento') {
          if (p.subtipo_venda && p.subtipo_venda !== 'Orçamento') return false;
          if (!p.subtipo_venda && p.origem === 'Sugestão Reposição') return false;
        } else if (filtroSubtipo === 'Pedido') {
          if (p.subtipo_venda !== 'Pedido' && p.tipo !== 'PEDIDO_VENDA') return false;
        }
      }

      return true;
    });
  }, [pedidos, busca, filtroOrigem, filtroSubtipo]);

  const handleAddItem = () => {
    if (!tabelaIdForm) {
      alert('Por favor, selecione primeiro uma Tabela de Preço para carregar os produtos e preços permitidos.');
      return;
    }
    const defaultProd = produtosFiltradosPorTabela[0];
    if (!defaultProd) {
      alert('Esta tabela de preços não possui produtos vinculados ou disponíveis.');
      return;
    }
    setItensForm([
      ...itensForm,
      {
        produtoId: defaultProd.id,
        tipoEmbalagem: defaultProd.tipo_embalagem,
        quantidade: 100,
        precoUnitario: modoLancamentoForm === 'FARDO' ? defaultProd.preco_unitario : (defaultProd.preco_unitario_avulso || defaultProd.preco_unitario / (defaultProd.unidades_por_fardo || 1)),
        unidadesPorFardo: defaultProd.unidades_por_fardo || 10
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (itensForm.length <= 1) return;
    setItensForm(itensForm.filter((_, i) => i !== index));
  };

  // Salvar novo registro de venda (Orçamento, Sugestivo ou Pedido)
  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteIdForm) {
      alert('Selecione um cliente para prosseguir com a venda ou orçamento.');
      return;
    }

    if (!tabelaIdForm) {
      alert('Selecione uma Tabela de Preço válida para prosseguir.');
      return;
    }

    if (itensForm.length === 0 || !itensForm[0].produtoId) {
      alert('Adicione pelo menos um produto à proposta para salvar.');
      return;
    }
    const clienteSel = CLIENTES_LOOKUP.find(c => c.id === clienteIdForm) || CLIENTES_LOOKUP[0];
    const rcaSel = RCAS_LOOKUP.find(r => r.id === rcaIdForm) || RCAS_LOOKUP[0];

    const dataHoje = new Date();
    const dataHojeStr = dataHoje.toISOString().split('T')[0];
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + (parseInt(diasValidadeForm) || 7));
    const dataValidadeStr = dataValidade.toISOString().split('T')[0];

    const itensMapeados = itensForm.map(it => {
      const prod = produtosFiltradosPorTabela.find(p => p.id === it.produtoId) || produtosDisponiveis.find(p => p.id === it.produtoId);
      if (!prod) return null;
      const fator = it.unidadesPorFardo || prod.unidades_por_fardo || (it.tipoEmbalagem === 'Fardo 10x1kg' ? 10 : it.tipoEmbalagem === 'Caixa' ? 10 : 25);
      
      let qtdReal = it.quantidade;
      let precoReal = it.precoUnitario;

      // Se lançado em unitário, normaliza quantidade para base de fardo
      if (modoLancamentoForm === 'UNITARIO') {
        qtdReal = Math.max(1, Math.round(it.quantidade / fator));
        precoReal = it.precoUnitario * fator;
      }

      const pesoTotal = qtdReal * prod.peso_unitario_kg;
      const subtotal = qtdReal * precoReal;

      return {
        produto_id: prod.id,
        produto_nome: prod.nome,
        tipo_embalagem: it.tipoEmbalagem || prod.tipo_embalagem,
        quantidade: qtdReal,
        peso_unitario_kg: prod.peso_unitario_kg,
        peso_total_kg: pesoTotal,
        preco_unitario: precoReal,
        subtotal,
        unidades_por_fardo: fator
      };
    }).filter(Boolean) as any[];

    const valorTotal = itensMapeados.reduce((acc, i) => acc + i.subtotal, 0);
    const pesoTotal = itensMapeados.reduce((acc, i) => acc + i.peso_total_kg, 0);
    const comissaoValor = (valorTotal * 2.5) / 100;

    const prefixo = subtipoForm === 'Orçamento' ? 'ORC' : subtipoForm === 'Pedido Sugestivo' ? 'SUG' : 'PED';
    const novoNum = `${prefixo}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const tabelaSel = tabelasDisponiveis.find(t => t.id === tabelaIdForm);

    const novoRegistro: PedidoVenda & { tabela_id?: string; tabela_nome?: string } = {
      id: `ped_venda_${Date.now()}`,
      numero_pedido: novoNum,
      tipo: subtipoForm === 'Pedido' ? 'PEDIDO_VENDA' : 'ORCAMENTO',
      etapa: 'ORCAMENTO',
      subtipo_venda: subtipoForm,
      modo_exibicao_padrao: modoLancamentoForm,
      tabela_id: tabelaIdForm,
      tabela_nome: tabelaSel?.nome,
      cliente_id: clienteSel.id,
      cliente_nome: clienteSel.nome,
      cliente_cnpj_cpf: clienteSel.cnpj,
      cliente_cidade_uf: clienteSel.cidade_uf,
      cliente_limite_credito: clienteSel.limite_credito,
      cliente_status_credito: clienteSel.status_credito,
      rca_id: rcaSel.id,
      rca_nome: rcaSel.nome,
      comissao_percentual: 2.5,
      comissao_valor: comissaoValor,
      data_emissao: dataHojeStr,
      data_validade_orcamento: dataValidadeStr,
      data_previsao_entrega: dataValidadeStr,
      itens: itensMapeados,
      peso_total_kg: pesoTotal,
      valor_total: valorTotal,
      forma_pagamento: 'Boleto Bancário',
      prazo_pagamento: prazoPagamentoForm,
      tipo_frete: tipoFreteForm,
      origem: subtipoForm === 'Pedido Sugestivo' ? 'Sugestão Reposição' : 'RCA',
      observacoes: observacoesForm
    };

    const todosAtuais = carregarPedidosVenda();
    const atualizados = [novoRegistro, ...todosAtuais];
    salvarPedidosVenda(atualizados);
    setModalNovo(false);
  };

  // Ação Rápida: Aprovar e Enviar para Produção
  const handleAprovarParaProducao = (pedidoId: string, numero: string) => {
    if (confirm(`Aprovar a venda / proposta ${numero} e enviar diretamente para a FILA DE PRODUÇÃO?`)) {
      moverPedidoEtapa(pedidoId, 'EM_PRODUCAO');
      if (onNavigate) onNavigate('pedidos_em_producao');
    }
  };

  // Excluir Proposta / Venda
  const handleExcluir = (pedidoId: string) => {
    if (confirm('Deseja realmente remover esta venda/cotação?')) {
      const todos = carregarPedidosVenda();
      const filtrados = todos.filter(p => p.id !== pedidoId);
      salvarPedidosVenda(filtrados);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE ESTEIRA UNIFICADA */}
      <PedidosNavTabs activeTab="pedidos_orcamentos_sugestivo" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA COM NOME "VENDAS" */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Vendas</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {metricas.total} propostas ativas
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubtipoForm('Orçamento');
                setModoLancamentoForm('FARDO');
                setModalNovo(true);
              }}
              className="
                flex items-center gap-2 px-4 py-2 rounded-xl
                bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
                shadow-xs transition-all cursor-pointer
              "
            >
              <Plus className="w-4 h-4" />
              <span>Nova Venda / Proposta</span>
            </button>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Total em Negociação:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {metricas.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Volume Físico:</span>
            <span className="font-mono font-bold text-slate-900">
              {(metricas.volumeTotalKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Toneladas
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Orçamentos:</span>
            <span className="font-mono font-bold text-emerald-800">
              {metricas.orcamentos}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Pedidos Sugestivos:</span>
            <span className="font-mono font-bold text-amber-700">
              {metricas.sugestivos}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Pedidos de Venda:</span>
            <span className="font-mono font-bold text-blue-700">
              {metricas.pedidosVenda}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS DE TIPO (ORÇAMENTO / SUGESTIVO / PEDIDO) */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Pílulas de filtro por tipo de venda */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFiltroSubtipo('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filtroSubtipo === 'TODOS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todas as Vendas ({metricas.total})
          </button>
          <button
            onClick={() => setFiltroSubtipo('Orçamento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filtroSubtipo === 'Orçamento'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Orçamentos ({metricas.orcamentos})
          </button>
          <button
            onClick={() => setFiltroSubtipo('Pedido Sugestivo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filtroSubtipo === 'Pedido Sugestivo'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Pedidos Sugestivos ({metricas.sugestivos})
          </button>
          <button
            onClick={() => setFiltroSubtipo('Pedido')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filtroSubtipo === 'Pedido'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Pedidos de Venda ({metricas.pedidosVenda})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-56 sm:w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar Venda, Cliente, RCA..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
            />
          </div>

          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
          >
            <option value="TODAS">Todas as Origens</option>
            <option value="RCA">RCA</option>
            <option value="Venda Direta">Venda Direta</option>
            <option value="Sugestão Reposição">Sugestão de Reposição</option>
            <option value="Portal Portfólio VIP">Portal VIP</option>
          </select>
        </div>
      </div>

      {/* 4. TABELA COM ACESSO DIRETO AO VISUALIZADOR PELO OLHO / LINHA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Venda / Proposta</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente / Praça</th>
                <th className="py-3 px-4">RCA</th>
                <th className="py-3 px-4">Produtos / Volume</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Validade</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-6 text-center">
                    <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-200">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Modo Novo Usuário - Sistema Limpo para Teste</h3>
                        <p className="text-slate-500 text-xs mt-1">
                          Nenhuma proposta ou venda cadastrada ainda. Você pode formular um novo orçamento do zero ou criar um cenário de teste com 1 clique!
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubtipoForm('Orçamento');
                            setModoLancamentoForm('FARDO');
                            setModalNovo(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Nova Venda / Proposta</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((item) => {
                  const itensResumo = item.itens.map(i => `${i.quantidade}x ${i.tipo_embalagem}`).join(' + ');
                  const subtipoLabel = item.subtipo_venda || (item.origem === 'Sugestão Reposição' ? 'Pedido Sugestivo' : item.tipo === 'PEDIDO_VENDA' ? 'Pedido' : 'Orçamento');
                  
                  return (
                    <tr
                      key={item.id}
                      onClick={() => abrirVisualizacao(item)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                      title="Clique para abrir o visualizador oficial do documento"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-emerald-900">
                          {item.numero_pedido}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${item.origem === 'Sugestão Reposição' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                          <span className="text-[10px] text-slate-400 font-medium">{item.origem}</span>
                        </div>
                      </td>

                      {/* Tipo do Documento */}
                      <td className="py-3.5 px-4">
                        {subtipoLabel === 'Pedido Sugestivo' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Pedido Sugestivo
                          </span>
                        ) : subtipoLabel === 'Pedido' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Pedido de Venda
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Orçamento
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400">{item.cliente_cidade_uf}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {item.rca_nome}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-xs" title={itensResumo}>
                          {itensResumo}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {(item.peso_total_kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">{item.prazo_pagamento}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.data_validade_orcamento?.split('-').reverse().join('/') || '-'}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAprovarParaProducao(item.id, item.numero_pedido)}
                            className="
                              flex items-center gap-1 px-3 py-1.5 rounded-lg
                              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
                              shadow-2xs transition-colors cursor-pointer
                            "
                            title="Aprovar e Enviar para Produção"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Aprovar</span>
                          </button>

                          {/* BOTÃO DO OLHO: VER / EXPORTAR */}
                          <button
                            onClick={() => abrirVisualizacao(item)}
                            className="
                              flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                              bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300
                              font-bold text-xs transition-colors cursor-pointer shadow-2xs
                            "
                            title="Abrir o visualizador do documento para ver antes de exportar"
                          >
                            <Eye className="w-4 h-4 text-emerald-800" />
                            <span>Ver / Exportar</span>
                          </button>

                          <button
                            onClick={() => handleExcluir(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Excluir"
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
      </div>

      {/* 5. MODAL NOVA VENDA / PROPOSTA COMERCIAL */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Nova Venda / Proposta Comercial
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cadastre um novo Orçamento, Pedido Sugestivo ou Pedido de Venda.
                  </p>
                </div>
              </div>
              <button onClick={() => setModalNovo(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovo} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Escolha do Tipo de Documento e Modo de Lançamento */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Documento Comercial *</label>
                  <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSubtipoForm('Orçamento')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        subtipoForm === 'Orçamento'
                          ? 'bg-emerald-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Orçamento Comercial
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtipoForm('Pedido Sugestivo')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        subtipoForm === 'Pedido Sugestivo'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pedido Sugestivo (Reposição)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtipoForm('Pedido')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        subtipoForm === 'Pedido'
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pedido de Venda
                    </button>
                  </div>
                </div>

                {/* Alternador de Modo de Preenchimento: Fardo vs Unitário */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preenchimento de Itens</label>
                  <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setModoLancamentoForm('FARDO')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        modoLancamentoForm === 'FARDO'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Lançar valores em Fardos ou Embalagens"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Por Fardo / Saco</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoLancamentoForm('UNITARIO')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        modoLancamentoForm === 'UNITARIO'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Lançar valores por Unidade ou Kg individual"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Por Unitário / Kg</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Verificação se existem produtos cadastrados */}
              {produtosDisponiveis.length === 0 && (
                <div className="p-3.5 bg-orange-50 border-2 border-orange-300 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Package className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-orange-900 text-xs">⚠️ Nenhum Produto Cadastrado no Catálogo!</h4>
                      <p className="text-orange-800 text-[11px] mt-0.5">
                        Não há produtos no catálogo da fábrica. Cadastre seus produtos acabados antes de formular orçamentos ou vendas.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setModalNovo(false);
                        onNavigate?.('produtos_estoque_cadastro');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Cadastrar Produto no Estoque</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        criarCenarioTesteNovoUsuario();
                        recarregar();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-orange-300 hover:bg-orange-100 text-orange-900 font-bold text-xs transition-colors cursor-pointer"
                    >
                      ⚡ Inserir Produto de Teste (Sem Custo e Sem Receita)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente Solicitante *</label>
                  {clientesDisponiveis.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Falta Cadastrar Cliente!</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setModalNovo(false);
                            onNavigate?.('cadastro_clientes');
                          }}
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer"
                        >
                          + Cadastrar Cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            criarCenarioTesteNovoUsuario();
                            recarregar();
                          }}
                          className="px-2 py-1 rounded bg-white border border-amber-300 text-amber-900 font-bold text-[10px] cursor-pointer"
                        >
                          ⚡ Teste Rápido
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={clienteIdForm}
                      onChange={(e) => setClienteIdForm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      {clientesDisponiveis.map(c => (
                        <option key={c.id} value={c.id}>{c.nome} ({c.cidade_uf})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tabela de Preço *</label>
                  {tabelasDisponiveis.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Falta Cadastrar Tabela!</span>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={tabelaIdForm}
                      onChange={(e) => setTabelaIdForm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="">-- Selecione a Tabela --</option>
                      {tabelasDisponiveis.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.nome} ({tab.codigo})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RCA Responsável *</label>
                  <select
                    value={rcaIdForm}
                    onChange={(e) => setRcaIdForm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    {RCAS_LOOKUP.map(r => (
                      <option key={r.id} value={r.id}>{r.nome} - {r.regiao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Frete</label>
                  <select
                    value={tipoFreteForm}
                    onChange={(e) => setTipoFreteForm(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="CIF (Entrega Grupo ENO)">CIF (Entrega Grupo ENO)</option>
                    <option value="FOB (Retira na Fábrica)">FOB (Retira na Fábrica)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prazo de Pagamento</label>
                  <input
                    type="text"
                    value={prazoPagamentoForm}
                    onChange={(e) => setPrazoPagamentoForm(e.target.value)}
                    placeholder="Ex: Boleto Bancário 28 Dias"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Itens */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Itens da Venda ({modoLancamentoForm === 'FARDO' ? 'Preço e Qtd por Fardo/Embalagem' : 'Preço e Qtd por Unitário/Kg'})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {itensForm.length === 0 ? (
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500 text-center text-xs font-medium">
                      Nenhum item adicionado. Clique no botão acima para escolher produtos.
                    </div>
                  ) : (
                    itensForm.map((item, idx) => {
                      const prod = produtosDisponiveis.find(p => p.id === item.produtoId) || PRODUTOS_VENDA_DISPONIVEIS.find(p => p.id === item.produtoId);
                      const faltaReceita = prod && !prod.receita_id;
                      const faltaCusto = prod && (!prod.custo_total || prod.custo_total <= 0);

                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex-1 min-w-[200px]">
                              <select
                                value={item.produtoId}
                                onChange={(e) => {
                                  const newProd = produtosFiltradosPorTabela.find(p => p.id === e.target.value);
                                  const updated = [...itensForm];
                                  updated[idx].produtoId = e.target.value;
                                  if (newProd) {
                                    updated[idx].tipoEmbalagem = newProd.tipo_embalagem;
                                    updated[idx].unidadesPorFardo = newProd.unidades_por_fardo || 10;
                                    if (modoLancamentoForm === 'FARDO') {
                                      updated[idx].precoUnitario = newProd.preco_unitario;
                                    } else {
                                      updated[idx].precoUnitario = newProd.preco_unitario_avulso || (newProd.preco_unitario / (newProd.unidades_por_fardo || 1));
                                    }
                                  }
                                  setItensForm(updated);
                                }}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs cursor-pointer font-medium"
                              >
                                <option value="">-- Selecione o Produto --</option>
                                {produtosFiltradosPorTabela.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome} ({p.tipo_embalagem || 'Un'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="w-36">
                              <select
                                value={item.tipoEmbalagem}
                                onChange={(e) => {
                                  const updated = [...itensForm];
                                  updated[idx].tipoEmbalagem = e.target.value as any;
                                  setItensForm(updated);
                                }}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs cursor-pointer font-semibold text-slate-700"
                                title="Apresentação (Fardo, Caixa, Saco, Big Bag)"
                              >
                                <option value="Saco 25kg">Saco 25kg</option>
                                <option value="Big Bag 1000kg">Big Bag 1000kg</option>
                                <option value="Fardo 10x1kg">Fardo 10x1kg</option>
                                <option value="Caixa">Caixa</option>
                                <option value="Granel">Granel</option>
                              </select>
                            </div>

                            <div className="w-24">
                              <label className="text-[10px] text-slate-400 block -mb-0.5">
                                {modoLancamentoForm === 'FARDO' ? 'Qtd (Fardos)' : 'Qtd (Unid/Kg)'}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const updated = [...itensForm];
                                  updated[idx].quantidade = parseInt(e.target.value) || 1;
                                  setItensForm(updated);
                                }}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center font-bold"
                              />
                            </div>

                            <div className="w-28">
                              <label className="text-[10px] text-slate-400 block -mb-0.5">
                                {modoLancamentoForm === 'FARDO' ? 'Preço Fardo' : 'Preço Unitário'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.precoUnitario}
                                onChange={(e) => {
                                  const updated = [...itensForm];
                                  updated[idx].precoUnitario = parseFloat(e.target.value) || 0;
                                  setItensForm(updated);
                                }}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center font-mono font-bold"
                              />
                            </div>

                            <div className="w-28 text-right font-mono font-bold text-slate-900">
                              {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>

                            {itensForm.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 hover:text-red-600 text-slate-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* AVISOS ESPECÍFICOS DE FALTA DE RECEITA E DE FALTA DE CUSTO */}
                          {faltaReceita && (
                            <div className="p-2 bg-amber-100/90 border border-amber-300 rounded-md text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>
                                  <strong>⚠️ Sem Receita / Ficha Técnica:</strong> Este produto não tem fórmula de matéria-prima vinculada. A fábrica não saberá quais insumos baixar do estoque ao produzir.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalNovo(false);
                                  onNavigate?.('produtos_receita');
                                }}
                                className="px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
                              >
                                Configurar Receita
                              </button>
                            </div>
                          )}

                          {faltaCusto && (
                            <div className="p-2 bg-orange-100/90 border border-orange-300 rounded-md text-[11px] text-orange-900 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-700 shrink-0" />
                                <span>
                                  <strong>⚠️ Sem Custo de Produção:</strong> Custo industrial não apurado. O produto pode ser orçado pelo preço informado, mas o CMV e a margem bruta ficarão zerados.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalNovo(false);
                                  onNavigate?.('produtos_configurar_custo');
                                }}
                                className="px-2 py-0.5 rounded bg-orange-700 hover:bg-orange-800 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
                              >
                                Configurar Custo
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* DIAGNÓSTICO E CHECKLIST DA VENDA */}
              {(() => {
                const temAlgumaFaltaReceita = itensForm.some(it => {
                  const p = produtosDisponiveis.find(x => x.id === it.produtoId);
                  return p && !p.receita_id;
                });
                const temAlgumaFaltaCusto = itensForm.some(it => {
                  const p = produtosDisponiveis.find(x => x.id === it.produtoId);
                  return p && (!p.custo_total || p.custo_total <= 0);
                });

                return (
                  <div className="p-3 bg-slate-900 text-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs border border-slate-800">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-white uppercase text-[10px] tracking-wider">Status do Pedido:</span>
                      <span className={clienteIdForm ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {clienteIdForm ? '✓ Cliente OK' : '❌ Falta Cliente'}
                      </span>
                      <span className={temAlgumaFaltaReceita ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {temAlgumaFaltaReceita ? '⚠️ Receita Pendente' : '✓ Receita OK'}
                      </span>
                      <span className={temAlgumaFaltaCusto ? 'text-orange-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {temAlgumaFaltaCusto ? '⚠️ Custo Pendente' : '✓ Custo OK'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      {temAlgumaFaltaReceita || temAlgumaFaltaCusto
                        ? 'Você pode salvar como orçamento. O sistema emitirá alertas quando enviado para produção.'
                        : 'Apuração comercial e técnica completa!'}
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações da Proposta Comercial</label>
                <textarea
                  rows={2}
                  value={observacoesForm}
                  onChange={(e) => setObservacoesForm(e.target.value)}
                  placeholder="Ex: Tabela especial negociada, frete CIF programado para entrega semanal..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar {subtipoForm}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL VISUALIZADOR DE DOCUMENTO COMERCIAL (PRÉVIA OFICIAL ANTES DE EXPORTAR) */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xs p-2 sm:p-4 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-6xl xl:max-w-7xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)]">
            
            {/* 1. TOPO: TÍTULO DO VISUALIZADOR E CONTROLES DE ZOOM */}
            <div className="bg-slate-950 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <span>Visualizador de Documento Comercial</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Prévia Oficial
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Confira a formatação da folha, cabeçalhos, produtos e totais antes de exportar em PDF ou PNG.
                  </p>
                </div>
              </div>

              {/* Controles de Zoom da Folha */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setZoomDocumento(prev => Math.max(70, prev - 10))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-200 w-10 text-center font-bold">
                    {zoomDocumento}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomDocumento(prev => Math.min(130, prev + 10))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomDocumento(100)}
                    className="text-[10px] text-slate-400 hover:text-emerald-400 px-1 py-0.5 rounded cursor-pointer font-semibold"
                    title="Ajustar para 100%"
                  >
                    100%
                  </button>
                </div>

                <button
                  onClick={() => setModalDetalhes(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Fechar visualizador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. BARRA DE CONFIGURAÇÃO RÁPIDA: NOME DO DOCUMENTO & FARDO/UNITÁRIO */}
            <div className="bg-slate-900 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0 text-xs">
              
              {/* Escolha do Nome do Documento */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                  Nome do Documento:
                </span>
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTipoDocumentoVisualizacao('Orçamento')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoDocumentoVisualizacao === 'Orçamento'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Orçamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDocumentoVisualizacao('Pedido Sugestivo')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoDocumentoVisualizacao === 'Pedido Sugestivo'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pedido Sugestivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDocumentoVisualizacao('Pedido')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoDocumentoVisualizacao === 'Pedido'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pedido de Venda
                  </button>
                </div>
              </div>

              {/* Escolha de Unitário vs Fardo */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                  Tabela de Valores:
                </span>
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModoExibicao('FARDO')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      modoExibicao === 'FARDO'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Exibir quantidades e preços calculados por Fardo / Embalagem agrupada"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Modo Fardo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoExibicao('UNITARIO')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      modoExibicao === 'UNITARIO'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Exibir quantidades e preços calculados por Unidade / Kg individual"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Modo Unitário</span>
                  </button>
                </div>
              </div>

            </div>

            {/* 3. ÁREA DE PRÉVIA ESTILO MESA DE TRABALHO COM FOLHA A4 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/80 flex justify-center items-start">
              <div
                style={{
                  transform: zoomDocumento !== 100 ? `scale(${zoomDocumento / 100})` : undefined,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease'
                }}
                className="w-full flex justify-center"
              >
                {/* FOLHA DO DOCUMENTO CAPTURÁVEL */}
                <div
                  ref={printRef}
                  className="bg-white shadow-2xl rounded-sm border border-slate-300 w-full max-w-[820px] p-8 sm:p-10 text-slate-800 font-sans space-y-4 text-xs"
                >
                  {/* Cabeçalho Oficial do Grupo ENO */}
                  <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-900 text-emerald-200 font-black text-lg flex items-center justify-center shadow-xs">
                        ENO
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-emerald-950 tracking-tight leading-tight">
                          GRUPO ENO AGROINDUSTRIAL
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-600">
                          Indústria e Comércio de Féculas, Polvilhos e Amidos Especiais
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          CNPJ: 45.981.234/0001-90 • Inscr. Est.: 908.12345-67 • Paranavaí / PR
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Rodovia PR-218, Km 14 • Fone: (44) 3421-9000 • comercial@grupoeno.com.br
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-3.5 py-1 rounded text-white font-black text-xs tracking-wider uppercase shadow-2xs ${
                        tipoDocumentoVisualizacao === 'Orçamento'
                          ? 'bg-emerald-900'
                          : tipoDocumentoVisualizacao === 'Pedido Sugestivo'
                          ? 'bg-amber-600'
                          : 'bg-blue-700'
                      }`}>
                        {tipoDocumentoVisualizacao === 'Orçamento'
                          ? 'ORÇAMENTO COMERCIAL'
                          : tipoDocumentoVisualizacao === 'Pedido Sugestivo'
                          ? 'PEDIDO SUGESTIVO'
                          : 'PEDIDO DE VENDA'}
                      </span>
                      <div className="text-sm font-mono font-black text-slate-800 mt-1">
                        Nº {modalDetalhes.numero_pedido}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Emissão: {modalDetalhes.data_emissao.split('-').reverse().join('/')}
                        {modalDetalhes.data_validade_orcamento && (
                          <span className="ml-2 font-bold text-slate-700">
                            • Validade: {modalDetalhes.data_validade_orcamento.split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dados do Cliente e Condições Comerciais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Destinatário / Cliente
                      </span>
                      <div className="font-black text-slate-900 text-sm">{modalDetalhes.cliente_nome}</div>
                      <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                        CNPJ/CPF: {modalDetalhes.cliente_cnpj_cpf}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Cidade/UF: {modalDetalhes.cliente_cidade_uf}
                      </div>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Condições Comerciais
                      </span>
                      <div className="font-bold text-slate-800 text-xs">
                        RCA Responsável: {modalDetalhes.rca_nome}
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Condição de Frete: <strong>{modalDetalhes.tipo_frete}</strong>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Prazo de Pagamento: <strong>{modalDetalhes.prazo_pagamento}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Faixa Informativa da Apresentação */}
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-100 rounded-lg text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      {modoExibicao === 'FARDO' ? (
                        <>
                          <Package className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Valores apresentados em <strong>Fardo / Embalagem Agrupada</strong></span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5 text-blue-700" />
                          <span>Valores apresentados em <strong>Preço e Quantidade Unitária (Kg / Pacote)</strong></span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {modalDetalhes.itens.length} {modalDetalhes.itens.length === 1 ? 'item' : 'itens'} cotados
                    </span>
                  </div>

                  {/* Tabela de Produtos */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3.5">Item / Descrição do Produto</th>
                          <th className="py-2.5 px-2.5 text-center">
                            {modoExibicao === 'FARDO' ? 'Embalagem' : 'Apresentação'}
                          </th>
                          <th className="py-2.5 px-2.5 text-center">
                            {modoExibicao === 'FARDO' ? 'Qtd (Fardos/Sacos)' : 'Qtd (Unid/Kg)'}
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            {modoExibicao === 'FARDO' ? 'Preço Fardo' : 'Preço Unitário'}
                          </th>
                          <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {modalDetalhes.itens.map((it, idx) => {
                          const valores = calcularValoresItem(it, modoExibicao);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                                {it.produto_nome}
                              </td>
                              <td className="py-2.5 px-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                                  modoExibicao === 'FARDO' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                                }`}>
                                  {valores.apresentacao}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900">
                                {valores.quantidade.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-sans">{valores.unidadeRotulo}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {valores.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                                {valores.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totais do Documento */}
                  <div className="flex items-center justify-between p-4 bg-emerald-950/[0.04] border border-emerald-900/20 rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Peso Total Aferido
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {(modalDetalhes.peso_total_kg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} Ton ({modalDetalhes.peso_total_kg.toLocaleString('pt-BR')} kg)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Valor Total da Operação
                      </span>
                      <span className="font-mono text-xl font-black text-emerald-950">
                        {modalDetalhes.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Observações */}
                  {modalDetalhes.observacoes && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <strong className="text-slate-800">Observações Comerciais:</strong> {modalDetalhes.observacoes}
                    </div>
                  )}

                  {/* Assinaturas & Validação Comercial */}
                  <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                    <div>
                      <div className="border-b border-slate-300 pb-1 mb-1 font-mono text-slate-700">
                        {modalDetalhes.cliente_nome}
                      </div>
                      <span>De Acordo do Cliente / Comprador</span>
                    </div>

                    <div>
                      <div className="border-b border-slate-300 pb-1 mb-1 font-mono text-slate-700">
                        {modalDetalhes.rca_nome} (Grupo ENO)
                      </div>
                      <span>Aprovação Comercial / RCA Responsável</span>
                    </div>
                  </div>

                  {/* Rodapé Oficial do Documento */}
                  <div className="text-[9px] text-slate-400 text-center pt-2">
                    Documento comercial emitido para fins de negociação e programação industrial • Grupo ENO Agroindustrial • Paranavaí / PR
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BARRA DE EXPORTAÇÃO INFERIOR */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Exportar PNG */}
                <button
                  onClick={() => exportarPNG(modalDetalhes)}
                  disabled={gerandoExportacao}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  title="Exportar imagem PNG de alta resolução para enviar no WhatsApp"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{gerandoExportacao ? 'Gerando...' : 'Exportar PNG (WhatsApp)'}</span>
                </button>

                {/* Exportar PDF */}
                <button
                  onClick={() => exportarPDF(modalDetalhes)}
                  disabled={gerandoExportacao}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  title="Exportar documento PDF oficial formatado em folha A4"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{gerandoExportacao ? 'Gerando...' : 'Exportar PDF (A4)'}</span>
                </button>

                {/* Exportar Excel */}
                <button
                  onClick={() => exportarExcel(modalDetalhes)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  title="Exportar planilha formatada para Excel (.csv)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar Excel</span>
                </button>

                {/* Imprimir */}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700"
                  title="Imprimir documento"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Imprimir</span>
                </button>
              </div>

              {/* Botão de Enviar Direto para Em Produção */}
              <button
                onClick={() => {
                  handleAprovarParaProducao(modalDetalhes.id, modalDetalhes.numero_pedido);
                  setModalDetalhes(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all hover:scale-102"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar & Mandar p/ Produção</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
