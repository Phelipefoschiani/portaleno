import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Users,
  Download,
  Printer,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Factory,
  Receipt,
  Truck,
  FileSpreadsheet,
  PieChart,
  Boxes,
  ShieldCheck,
  Search,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell
} from 'recharts';
import {
  PedidoVenda,
  carregarPedidosVenda
} from '../../data/pedidosVendaData';
import { converterQuantidade, normalizarUnidade } from '../../data/produtosData';
import { hojeISO } from '../../lib/datas';
import {
  PedidoCompraGeral,
  carregarPedidosCompra
} from '../../data/mockStore';
import { PedidosNavTabs } from './PedidosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

type TipoRelatorio =
  | 'EXECUTIVO'
  | 'COMPRAS'
  | 'ORCAMENTOS'
  | 'PRODUCAO'
  | 'FATURAMENTO'
  | 'ENTREGAS'
  | 'MIX_PRODUTOS';

export function PedidosRelatorios({ onNavigate }: Props) {
  const [pedidosVenda, setPedidosVenda] = useState<PedidoVenda[]>([]);
  const [pedidosCompra, setPedidosCompra] = useState<PedidoCompraGeral[]>([]);
  const [relatorioAtivo, setRelatorioAtivo] = useState<TipoRelatorio>('EXECUTIVO');
  const [filtroPeriodo, setFiltroPeriodo] = useState('SAFRA_ATUAL');
  const [filtroRca, setFiltroRca] = useState<string>('TODOS');
  const [buscaTabela, setBuscaTabela] = useState('');

  const recarregar = () => {
    setPedidosVenda(carregarPedidosVenda());
    setPedidosCompra(carregarPedidosCompra());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener('pedidos_compra_updated', handleUpdate);
    return () => {
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener('pedidos_compra_updated', handleUpdate);
    };
  }, []);

  // 1. DADOS DE COMPRAS
  const metricasCompras = useMemo(() => {
    const totalCompras = pedidosCompra.reduce((acc, p) => acc + p.valor_total, 0);
    const totalAConfirmar = pedidosCompra.filter(p => p.status_pedido === 'A Confirmar');
    const totalConfirmadas = pedidosCompra.filter(p => p.status_pedido === 'Confirmado' || p.status_pedido === 'Pago');
    
    // Categorias de compra
    const porCategoria = {
      mandioca: pedidosCompra.filter(p => p.categoria === 'Mandioca / Matéria-Prima').reduce((acc, p) => acc + p.valor_total, 0),
      embalagens: pedidosCompra.filter(p => p.categoria === 'Embalagens').reduce((acc, p) => acc + p.valor_total, 0),
      insumos: pedidosCompra.filter(p => p.categoria === 'Químicos & Laboratório' || p.categoria === 'Insumos Agrícolas').reduce((acc, p) => acc + p.valor_total, 0),
      outros: pedidosCompra.filter(p => !['Mandioca / Matéria-Prima', 'Embalagens', 'Químicos & Laboratório', 'Insumos Agrícolas'].includes(p.categoria)).reduce((acc, p) => acc + p.valor_total, 0)
    };

    const volumeMandiocaKg = pedidosCompra
      .filter(p => p.categoria === 'Mandioca / Matéria-Prima' && ['KG', 'TON'].includes(normalizarUnidade(p.unidade_medida)))
      .reduce((acc, p) => acc + (converterQuantidade(p.quantidade, p.unidade_medida, 'KG') || 0), 0);

    const refugoDestopoKg = pedidosCompra
      .filter(p => p.residuo_destopo_casca_kg !== undefined)
      .reduce((acc, p) => acc + (p.residuo_destopo_casca_kg || 0), 0);

    return {
      totalCompras,
      qtdTotal: pedidosCompra.length,
      qtdAConfirmar: totalAConfirmar.length,
      valorAConfirmar: totalAConfirmar.reduce((acc, p) => acc + p.valor_total, 0),
      qtdConfirmadas: totalConfirmadas.length,
      valorConfirmadas: totalConfirmadas.reduce((acc, p) => acc + p.valor_total, 0),
      porCategoria,
      volumeMandiocaKg,
      refugoDestopoKg
    };
  }, [pedidosCompra]);

  // 2. DADOS DE VENDAS & ESTEIRA
  const metricasVendas = useMemo(() => {
    const orcamentos = pedidosVenda.filter(p => p.etapa === 'ORCAMENTO');
    const producao = pedidosVenda.filter(p => p.etapa === 'EM_PRODUCAO');
    const aFaturar = pedidosVenda.filter(p => p.etapa === 'A_FATURAR');
    const faturados = pedidosVenda.filter(p => p.etapa === 'FATURADO');
    const entregues = pedidosVenda.filter(p => p.etapa === 'ENTREGUE');

    const faturamentoTotalRealizado = [...faturados, ...entregues].reduce((acc, p) => acc + (p.valor_faturado || p.valor_total), 0);
    const volumeTotalRealizadoKg = [...faturados, ...entregues].reduce((acc, p) => acc + p.peso_total_kg, 0);
    const saldoAFaturar = aFaturar.reduce((acc, p) => acc + p.valor_total, 0);
    const saldoEmProducao = producao.reduce((acc, p) => acc + p.valor_total, 0);
    const valorEmOrcamentos = orcamentos.reduce((acc, p) => acc + p.valor_total, 0);

    const totalFunil = orcamentos.length + producao.length + aFaturar.length + faturados.length + entregues.length;
    const taxaConversao = totalFunil > 0
      ? Math.round(((producao.length + aFaturar.length + faturados.length + entregues.length) / totalFunil) * 100)
      : 0;
    const valorFaturados = faturados.reduce((acc, p) => acc + (p.valor_faturado || p.valor_total), 0);
    const valorEntregues = entregues.reduce((acc, p) => acc + (p.valor_faturado || p.valor_total), 0);

    return {
      totalPedidos: pedidosVenda.length,
      faturamentoTotalRealizado,
      volumeTotalRealizadoKg,
      saldoAFaturar,
      saldoEmProducao,
      valorEmOrcamentos,
      taxaConversao,
      valorFaturados,
      valorEntregues,
      contagens: {
        orcamentos: orcamentos.length,
        producao: producao.length,
        aFaturar: aFaturar.length,
        faturados: faturados.length,
        entregues: entregues.length
      }
    };
  }, [pedidosVenda]);

  // Mix de Produtos
  const mixProdutos = useMemo(() => {
    const mapa = new Map<string, { nome: string; quantidade: number; valorTotal: number; pesoKg: number }>();

    pedidosVenda.forEach(p => {
      p.itens.forEach(it => {
        const itemAtual = mapa.get(it.produto_nome) || {
          nome: it.produto_nome,
          quantidade: 0,
          valorTotal: 0,
          pesoKg: 0
        };
        itemAtual.quantidade += it.quantidade;
        itemAtual.valorTotal += it.subtotal;
        itemAtual.pesoKg += it.peso_total_kg;
        mapa.set(it.produto_nome, itemAtual);
      });
    });

    return Array.from(mapa.values()).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [pedidosVenda]);

  // Gráfico de Compras por Categoria
  const dadosGraficoCompras = useMemo(() => {
    return [
      { name: 'Mandioca (Matéria-Prima)', valor: metricasCompras.porCategoria.mandioca, fill: '#064e3b' },
      { name: 'Insumos Industriais', valor: metricasCompras.porCategoria.insumos, fill: '#0284c7' },
      { name: 'Embalagens & Sacaria', valor: metricasCompras.porCategoria.embalagens, fill: '#d97706' },
      { name: 'Outras Despesas / Manut.', valor: metricasCompras.porCategoria.outros, fill: '#64748b' }
    ];
  }, [metricasCompras]);

  // Gráfico do Funil de Pedidos
  const dadosGraficoFunil = useMemo(() => {
    return [
      { etapa: 'Orçamentos', quantidade: metricasVendas.contagens.orcamentos, valor: metricasVendas.valorEmOrcamentos },
      { etapa: 'Em Produção', quantidade: metricasVendas.contagens.producao, valor: metricasVendas.saldoEmProducao },
      { etapa: 'A Faturar', quantidade: metricasVendas.contagens.aFaturar, valor: metricasVendas.saldoAFaturar },
      { etapa: 'Faturados / Em Rota', quantidade: metricasVendas.contagens.faturados, valor: metricasVendas.valorFaturados },
      { etapa: 'Entregues', quantidade: metricasVendas.contagens.entregues, valor: metricasVendas.valorEntregues }
    ];
  }, [metricasVendas]);

  // Exportar Relatório Ativo em CSV
  const handleExportarCsv = () => {
    let cabecalho = '';
    let linhas = '';

    if (relatorioAtivo === 'COMPRAS') {
      cabecalho = 'Data,Item/Produto,Categoria,Parceiro/Fornecedor,Local_Compra,Comprador,Quantidade,Unidade,Valor_Unitario,Valor_Total,Status\n';
      linhas = pedidosCompra.map(p => 
        `"${p.data}","${p.item_descricao}","${p.categoria}","${p.agricultor_nome || p.fornecedor_nome}","${p.local_compra || ''}","${p.comprador_nome || ''}",${p.quantidade},"${p.unidade_medida}",${p.valor_unitario},${p.valor_total},"${p.status_pedido}"`
      ).join('\n');
    } else {
      cabecalho = 'Pedido,Etapa,Cliente,CNPJ,RCA,Data,Volume_Ton,Valor_Total,Forma_Pagamento,NF_Numero,Data_Entrega\n';
      linhas = pedidosVenda.map(p => 
        `"${p.numero_pedido}","${p.etapa}","${p.cliente_nome}","${p.cliente_cnpj_cpf}","${p.rca_nome}","${p.data_emissao}",${(p.peso_total_kg / 1000).toFixed(2)},${p.valor_total.toFixed(2)},"${p.prazo_pagamento}","${p.nota_fiscal?.numero || ''}","${p.data_entrega_realizada || ''}"`
      ).join('\n');
    }

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${relatorioAtivo.toLowerCase()}_grupo_eno_${hojeISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-y-auto">
      
      {/* 1. NAVEGAÇÃO DE ESTEIRA UNIFICADA */}
      <PedidosNavTabs activeTab="pedidos_relatorios" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Central de Relatórios • Menu Pedidos</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                Consolidado Grupo ENO
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Relatórios integrados de Compras, Orçamentos, Produção, Faturamento e Entregas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportarCsv}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel / CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS DO MENU DE RELATÓRIOS */}
        <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs overflow-x-auto">
          {[
            { id: 'EXECUTIVO', label: 'Visão Geral & Funil', icon: TrendingUp },
            { id: 'COMPRAS', label: 'Pedidos de Compra & Matéria-Prima', icon: ShoppingCart },
            { id: 'ORCAMENTOS', label: 'Orçamentos & Cotações', icon: FileSpreadsheet },
            { id: 'PRODUCAO', label: 'Produção Diária & Lotes', icon: Factory },
            { id: 'FATURAMENTO', label: 'Faturamento & NF-e', icon: Receipt },
            { id: 'ENTREGAS', label: 'Logística & Entregas', icon: Truck },
            { id: 'MIX_PRODUTOS', label: 'Curva ABC & Mix', icon: Boxes }
          ].map(tab => {
            const Icon = tab.icon;
            const ativo = relatorioAtivo === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRelatorioAtivo(tab.id as TipoRelatorio)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer
                  ${ativo
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTEÚDO DINÂMICO CONFORME A SUB-TAB SELECIONADA */}
      <div className="p-6 space-y-6">

        {/* A. VISÃO GERAL & FUNIL */}
        {relatorioAtivo === 'EXECUTIVO' && (
          <div className="space-y-6">
            {/* CARDS DE RESUMO EXECUTIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Comprado (Custos)</span>
                <span className="text-xl font-black font-mono text-slate-900 block mt-1">
                  {metricasCompras.totalCompras.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                  {metricasCompras.qtdTotal} pedidos de suprimentos e mandioca
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Realizado (Vendas)</span>
                <span className="text-xl font-black font-mono text-emerald-900 block mt-1">
                  {metricasVendas.faturamentoTotalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  {(metricasVendas.volumeTotalRealizadoKg / 1000).toLocaleString('pt-BR')} Ton despachadas
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Pendente a Faturar</span>
                <span className="text-xl font-black font-mono text-amber-700 block mt-1">
                  {metricasVendas.saldoAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  {metricasVendas.contagens.aFaturar} cargas prontas na fábrica
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Conversão do Funil</span>
                <span className="text-xl font-black font-mono text-slate-900 block mt-1">
                  {metricasVendas.taxaConversao}%
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                  Cotações convertidas em pedidos
                </span>
              </div>
            </div>

            {/* GRÁFICO DO FUNIL DA ESTEIRA */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Esteira Completa do Menu Pedidos</h3>
                  <p className="text-xs text-slate-400">Distribuição de valores em R$ por etapa do fluxo comercial e produtivo.</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoFunil}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                    <Tooltip
                      formatter={(val: any) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="valor" name="Volume Financeiro (R$)" fill="#064e3b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* B. RELATÓRIO DE PEDIDOS DE COMPRA */}
        {relatorioAtivo === 'COMPRAS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Mandioca (Matéria-Prima)</span>
                <span className="text-lg font-black font-mono text-emerald-950 mt-1 block">
                  {metricasCompras.porCategoria.mandioca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-slate-500">{(metricasCompras.volumeMandiocaKg / 1000).toLocaleString('pt-BR')} Ton moídas</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Resíduo / Destopo / Casca</span>
                <span className="text-lg font-black font-mono text-amber-800 mt-1 block">
                  {(metricasCompras.refugoDestopoKg / 1000).toLocaleString('pt-BR')} Ton
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">Aproveitamento fabril e coprodutos</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Insumos & Sacaria</span>
                <span className="text-lg font-black font-mono text-sky-900 mt-1 block">
                  {(metricasCompras.porCategoria.insumos + metricasCompras.porCategoria.embalagens).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-slate-500">Embalagens, aditivos e produtos químicos</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Compras a Confirmar</span>
                <span className="text-lg font-black font-mono text-amber-700 mt-1 block">
                  {metricasCompras.valorAConfirmar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-amber-700 font-bold">{metricasCompras.qtdAConfirmar} pedidos pendentes</span>
              </div>
            </div>

            {/* TABELA DE COMPRAS */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Histórico de Compras por Categoria</h3>
                <span className="text-xs font-mono font-bold text-slate-500">{pedidosCompra.length} registros</span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Item / Produto</th>
                    <th className="py-2.5 px-4">Categoria</th>
                    <th className="py-2.5 px-4">Fornecedor / Agricultor</th>
                    <th className="py-2.5 px-4">Onde Comprou / Local</th>
                    <th className="py-2.5 px-4 font-mono text-right">Valor Total</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosCompra.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-600">{p.data}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{p.item_descricao}</td>
                      <td className="py-2.5 px-4 text-slate-700">{p.categoria}</td>
                      <td className="py-2.5 px-4 text-slate-800">{p.agricultor_nome || p.fornecedor_nome}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.local_compra || 'Sede'}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-right text-slate-900">
                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status_pedido === 'A Confirmar'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.status_pedido}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* C. RELATÓRIO DE PRODUÇÃO */}
        {relatorioAtivo === 'PRODUCAO' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Rastreabilidade Fabril & Lotes</h3>
              <p className="text-xs text-slate-400 mb-4">Controle diário de lotes gerados, embalagens e datas de vencimento.</p>
              
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Pedido</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Lote Fabril</th>
                    <th className="py-2.5 px-4">Data Fabricação</th>
                    <th className="py-2.5 px-4">Data Vencimento</th>
                    <th className="py-2.5 px-4 font-mono text-center">Volume (Ton)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pedidosVenda.filter(p => p.lote_producao || p.etapa === 'EM_PRODUCAO').map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900 font-sans">{p.numero_pedido}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-700">{p.cliente_nome}</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-900">{p.lote_producao || 'LOT-2026-F01'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.data_fabricacao || p.data_emissao}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.data_vencimento || '15/09/2028'}</td>
                      <td className="py-2.5 px-4 text-center font-bold">{(p.peso_total_kg / 1000).toFixed(1)} Ton</td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.etapa === 'EM_PRODUCAO' ? 'Em Ensaque' : 'Concluído'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* D. RELATÓRIO DE FATURAMENTO & NF-E */}
        {relatorioAtivo === 'FATURAMENTO' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Faturado</span>
                <span className="text-xl font-black font-mono text-emerald-950 mt-1 block">
                  {metricasVendas.faturamentoTotalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-slate-500">Notas emitidas e transmitidas</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">A Faturar (Pendente)</span>
                <span className="text-xl font-black font-mono text-amber-700 mt-1 block">
                  {metricasVendas.saldoAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-slate-500">Pronto para emissão/importação</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Volume Faturado</span>
                <span className="text-xl font-black font-mono text-slate-900 mt-1 block">
                  {(metricasVendas.volumeTotalRealizadoKg / 1000).toLocaleString('pt-BR')} Ton
                </span>
                <span className="text-[11px] text-slate-500">Fécula, amidos e derivados</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Espelho de Notas Fiscais Emitidas e Importadas</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">NF-e</th>
                    <th className="py-2.5 px-4">Pedido</th>
                    <th className="py-2.5 px-4">Destinatário</th>
                    <th className="py-2.5 px-4">Data Emissão</th>
                    <th className="py-2.5 px-4">Transportadora</th>
                    <th className="py-2.5 px-4 font-mono text-right">Valor NF-e</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosVenda.filter(p => p.nota_fiscal).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-900">NF-e {p.nota_fiscal?.numero}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{p.numero_pedido}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{p.cliente_nome}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{p.nota_fiscal?.data_emissao}</td>
                      <td className="py-2.5 px-4 text-slate-700">{p.transportadora || 'Frota Grupo ENO'}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-right text-slate-900">
                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* E. RELATÓRIO DE ENTREGAS & LOGÍSTICA */}
        {relatorioAtivo === 'ENTREGAS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Controle de Entregas & Canhotos</h3>
              <p className="text-xs text-slate-400 mb-4">Acompanhamento das programações de entrega e confirmações de recebimento pelo cliente.</p>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Pedido</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Data Programada</th>
                    <th className="py-2.5 px-4">Data Entrega</th>
                    <th className="py-2.5 px-4">Motorista / Transportadora</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pedidosVenda.filter(p => p.etapa === 'FATURADO' || p.etapa === 'ENTREGUE').map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold font-sans text-slate-900">{p.numero_pedido}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-700">{p.cliente_nome}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.programacao_entrega?.data_programada || p.data_previsao_entrega}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-bold">{p.data_entrega_realizada || 'Em trânsito'}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-700">
                        {p.programacao_entrega?.motorista || p.motorista_nome || 'Sebastião Antunes'} ({p.transportadora || 'Própria'})
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.etapa === 'ENTREGUE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.etapa === 'ENTREGUE' ? 'Entregue • Canhoto OK' : 'Programado em Rota'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* F. ORÇAMENTOS E COTAÇÕES */}
        {relatorioAtivo === 'ORCAMENTOS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Cotações & Orçamentos Sugestivos</h3>
              <p className="text-xs text-slate-400 mb-4">Propostas emitidas, prazos de validade e apresentações comerciais (Fardos, Caixas, Sacos e Big Bags).</p>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Orçamento</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Emissão</th>
                    <th className="py-2.5 px-4">RCA</th>
                    <th className="py-2.5 px-4">Itens & Embalagem</th>
                    <th className="py-2.5 px-4 font-mono text-right">Valor Total</th>
                    <th className="py-2.5 px-4 text-center">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosVenda.filter(p => p.etapa === 'ORCAMENTO' || p.origem === 'Sugestão Reposição').map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{p.numero_pedido}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{p.cliente_nome}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{p.data_emissao}</td>
                      <td className="py-2.5 px-4 text-slate-700">{p.rca_nome}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {p.itens.map(i => `${i.quantidade}x ${i.tipo_embalagem}`).join(', ')}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-right text-slate-900">
                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.origem || 'Cotação Padrão'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* G. MIX DE PRODUTOS & CURVA ABC */}
        {relatorioAtivo === 'MIX_PRODUTOS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Curva ABC de Produtos & Faturamento</h3>
              <p className="text-xs text-slate-400 mb-4">Classificação por faturamento gerado e volume físico movimentado.</p>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="py-2.5 px-4 text-center">Unidades</th>
                    <th className="py-2.5 px-4 text-center">Peso Físico</th>
                    <th className="py-2.5 px-4 font-mono text-right">Faturamento Total</th>
                    <th className="py-2.5 px-4 text-right">Participação %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {mixProdutos.map((p, idx) => {
                    const perc = metricasVendas.faturamentoTotalRealizado > 0
                      ? (p.valorTotal / metricasVendas.faturamentoTotalRealizado) * 100
                      : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{p.nome}</td>
                        <td className="py-2.5 px-4 text-center text-slate-700">{p.quantidade.toLocaleString('pt-BR')} un</td>
                        <td className="py-2.5 px-4 text-center text-slate-700">{(p.pesoKg / 1000).toFixed(1)} Ton</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {p.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-800">{perc.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
