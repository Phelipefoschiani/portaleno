import React, { useState, useEffect, useMemo } from 'react';
import { TABELA_CARTAO } from './tabelaCartao';
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
import { hojeISO, formatarDataBR } from '../../lib/datas';
import { montarVendasComissaoRca, VendaComissaoRCA } from '../../data/cadastrosData';
import { rotuloRegraComissao } from '../../data/comissoesData';
import { formatarMoeda } from '../../data/financeiroData';
import {
  PedidoCompraGeral,
  carregarPedidosCompra
} from '../../data/mockStore';
import { PedidosNavTabs } from './PedidosNavTabs';
import { CORES } from '../ui/tokens';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';

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
  | 'MIX_PRODUTOS'
  | 'COMISSOES';

export function PedidosRelatorios({ onNavigate }: Props) {
  const [pedidosVenda, setPedidosVenda] = useState<PedidoVenda[]>([]);
  const [pedidosCompra, setPedidosCompra] = useState<PedidoCompraGeral[]>([]);
  const [relatorioAtivo, setRelatorioAtivo] = useState<TipoRelatorio>('EXECUTIVO');
  const [filtroPeriodo, setFiltroPeriodo] = useState('SAFRA_ATUAL');
  const [filtroRca, setFiltroRca] = useState<string>('TODOS');
  const [buscaTabela, setBuscaTabela] = useState('');
  const [comissoes, setComissoes] = useState<VendaComissaoRCA[]>([]);

  const recarregar = () => {
    const vendas = carregarPedidosVenda();
    setPedidosVenda(vendas);
    setPedidosCompra(carregarPedidosCompra());
    // Comissões de RCA com o status real do título no Contas a Pagar
    setComissoes(montarVendasComissaoRca(vendas).filter(v => !!v.pedido_id));
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener('pedidos_compra_updated', handleUpdate);
    window.addEventListener('financeiro_updated', handleUpdate);
    return () => {
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener('pedidos_compra_updated', handleUpdate);
      window.removeEventListener('financeiro_updated', handleUpdate);
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

    if (relatorioAtivo === 'COMISSOES') {
      cabecalho = 'Pedido,Data_Faturamento,RCA,Cliente,Regra,Valor_Faturado,Percentual,Comissao,Status_Titulo,Vencimento,Pagamento\n';
      linhas = comissoes.map(c =>
        `"${c.numero_pedido}","${c.data}","${pedidosVenda.find(p => p.id === c.pedido_id)?.rca_nome || c.rca_id}","${c.cliente_nome}","${rotuloRegraComissao(c.tipo_regra_aplicada)}",${c.valor_faturado.toFixed(2)},${c.percentual_comissao},${c.valor_comissao.toFixed(2)},"${c.status_comissao === 'Pago (PIX)' ? 'PAGO' : c.titulo_status || 'SEM_TITULO'}","${c.titulo_vencimento || ''}","${c.data_pagamento_pix || ''}"`
      ).join('\n');
    } else if (relatorioAtivo === 'COMPRAS') {
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
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-y-auto">

      {/* Abas antigas do fluxo: só fora do shell */}
      <PedidosNavTabs activeTab="pedidos_relatorios" onNavigate={onNavigate} />

      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Relatórios"
          resumo={`${pedidosVenda.length} vendas · ${pedidosCompra.length} compras · ${metricasVendas.faturamentoTotalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} faturados`}
          acoes={
            <>
              <BotaoSecundario onClick={handleExportarCsv} className="flex-1 sm:flex-none h-10 sm:h-9">
                <Download className="w-4 h-4" />
                Exportar CSV
              </BotaoSecundario>
              <BotaoPrimario onClick={() => window.print()} className="flex-1 sm:flex-none h-10 sm:h-9">
                <Printer className="w-4 h-4" />
                Imprimir
              </BotaoPrimario>
            </>
          }
        />

        {/* Qual relatório: rola por dentro no celular */}
        <BarraFiltros>
          <Segmentado<TipoRelatorio>
            rotuloAria="Relatório"
            valor={relatorioAtivo}
            onChange={setRelatorioAtivo}
            className="w-full md:w-fit [&>button]:h-9 sm:[&>button]:h-7"
            opcoes={[
              { valor: 'EXECUTIVO', rotulo: 'Visão geral' },
              { valor: 'COMPRAS', rotulo: 'Compras' },
              { valor: 'ORCAMENTOS', rotulo: 'Orçamentos' },
              { valor: 'PRODUCAO', rotulo: 'Produção e lotes' },
              { valor: 'FATURAMENTO', rotulo: 'Faturamento' },
              { valor: 'ENTREGAS', rotulo: 'Entregas' },
              { valor: 'MIX_PRODUTOS', rotulo: 'Curva ABC' },
              { valor: 'COMISSOES', rotulo: 'Comissões' },
            ]}
          />
        </BarraFiltros>
      </div>

      {/* Conteúdo do relatório escolhido */}
      <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6 space-y-6">

        {/* A. VISÃO GERAL & FUNIL */}
        {relatorioAtivo === 'EXECUTIVO' && (
          <div className="space-y-6">
            {/* CARDS DE RESUMO EXECUTIVO */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-linha border border-linha rounded-md overflow-hidden">
              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Total Comprado (Custos)</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-tinta block mt-1">
                  {metricasCompras.totalCompras.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-eno-700 font-semibold mt-0.5 block">
                  {metricasCompras.qtdTotal} pedidos de suprimentos e mandioca
                </span>
              </div>

              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Faturamento Realizado (Vendas)</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-eno-800 block mt-1">
                  {metricasVendas.faturamentoTotalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-cinza font-medium mt-0.5 block">
                  {(metricasVendas.volumeTotalRealizadoKg / 1000).toLocaleString('pt-BR')} Ton despachadas
                </span>
              </div>

              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Saldo Pendente a Faturar</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-st-aguardando block mt-1">
                  {metricasVendas.saldoAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-cinza font-medium mt-0.5 block">
                  {metricasVendas.contagens.aFaturar} cargas prontas na fábrica
                </span>
              </div>

              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Taxa de Conversão do Funil</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-tinta block mt-1">
                  {metricasVendas.taxaConversao}%
                </span>
                <span className="text-[11px] text-eno-700 font-semibold mt-0.5 block">
                  Cotações convertidas em pedidos
                </span>
              </div>
            </div>

            {/* GRÁFICO DO FUNIL DA ESTEIRA */}
            <div className="bg-papel rounded-md border border-linha p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-tinta">Esteira Completa do Menu Pedidos</h3>
                  <p className="text-xs text-cinza">Distribuição de valores em R$ por etapa do fluxo comercial e produtivo.</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoFunil}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CORES.linha} vertical={false} />
                    <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: CORES.cinza }} axisLine={{ stroke: CORES.linha }} />
                    <YAxis tick={{ fontSize: 11, fill: CORES.cinza }} axisLine={{ stroke: CORES.linha }} />
                    <Tooltip
                      formatter={(val: any) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      contentStyle={{ backgroundColor: CORES.eno900, color: '#fff', borderRadius: '6px', border: 'none', fontSize: '11px' }}
                    />
                    <Bar dataKey="valor" name="Volume Financeiro (R$)" fill={CORES.eno700} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* B. RELATÓRIO DE PEDIDOS DE COMPRA */}
        {relatorioAtivo === 'COMPRAS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-linha border border-linha rounded-md overflow-hidden">
              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Mandioca (Matéria-Prima)</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-eno-800 mt-1 block">
                  {metricasCompras.porCategoria.mandioca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-cinza">{(metricasCompras.volumeMandiocaKg / 1000).toLocaleString('pt-BR')} Ton moídas</span>
              </div>

              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Resíduo / Destopo / Casca</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-st-aguardando mt-1 block">
                  {(metricasCompras.refugoDestopoKg / 1000).toLocaleString('pt-BR')} Ton
                </span>
                <span className="text-[10px] text-st-aguardando font-semibold">Aproveitamento fabril e coprodutos</span>
              </div>

              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Insumos & Sacaria</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-st-producao mt-1 block">
                  {(metricasCompras.porCategoria.insumos + metricasCompras.porCategoria.embalagens).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-cinza">Embalagens, aditivos e produtos químicos</span>
              </div>

              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Compras a Confirmar</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-st-aguardando mt-1 block">
                  {metricasCompras.valorAConfirmar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-st-aguardando font-bold">{metricasCompras.qtdAConfirmar} pedidos pendentes</span>
              </div>
            </div>

            {/* TABELA DE COMPRAS */}
            <div className="bg-papel rounded-md border border-linha overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-linha flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-tinta-2">Histórico de Compras por Categoria</h3>
                <span className="text-xs tabular-nums font-bold text-cinza">{pedidosCompra.length} registros</span>
              </div>
              <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                <thead>
                  <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Item / Produto</th>
                    <th className="py-2.5 px-4">Categoria</th>
                    <th className="py-2.5 px-4">Fornecedor / Agricultor</th>
                    <th className="py-2.5 px-4">Onde Comprou / Local</th>
                    <th className="py-2.5 px-4 tabular-nums text-right">Valor Total</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {pedidosCompra.map(p => (
                    <tr key={p.id} className="hover:bg-papel-2">
                      <td data-rotulo="Data" className="py-2.5 px-4 tabular-nums text-tinta-2">{p.data}</td>
                      <td data-rotulo="Item / Produto" className="py-2.5 px-4 font-bold text-tinta">{p.item_descricao}</td>
                      <td data-rotulo="Categoria" className="py-2.5 px-4 text-tinta-2">{p.categoria}</td>
                      <td data-rotulo="Fornecedor / Agricultor" className="py-2.5 px-4 text-tinta">{p.agricultor_nome || p.fornecedor_nome}</td>
                      <td data-rotulo="Onde Comprou / Local" className="py-2.5 px-4 text-tinta-2">{p.local_compra || 'Sede'}</td>
                      <td data-rotulo="Valor Total" className="py-2.5 px-4 tabular-nums font-bold text-right text-tinta">
                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td data-rotulo="Status" className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status_pedido === 'A Confirmar'
                            ? 'bg-st-aguardando-bg text-st-aguardando'
                            : 'bg-eno-100 text-eno-800'
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
            <div className="bg-papel rounded-md border border-linha p-5 shadow-xs">
              <h3 className="font-bold text-sm text-tinta mb-1">Rastreabilidade Fabril & Lotes</h3>
              <p className="text-xs text-cinza mb-4">Controle diário de lotes gerados, embalagens e datas de vencimento.</p>
              
              <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                <thead>
                  <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                    <th className="py-2.5 px-4">Pedido</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Lote Fabril</th>
                    <th className="py-2.5 px-4">Data Fabricação</th>
                    <th className="py-2.5 px-4">Data Vencimento</th>
                    <th className="py-2.5 px-4 tabular-nums text-center">Volume (Ton)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha tabular-nums">
                  {pedidosVenda.filter(p => p.lote_producao || p.etapa === 'EM_PRODUCAO').map(p => (
                    <tr key={p.id} className="hover:bg-papel-2">
                      <td data-rotulo="Pedido" className="py-2.5 px-4 font-bold text-tinta font-sans">{p.numero_pedido}</td>
                      <td data-rotulo="Cliente" className="py-2.5 px-4 font-sans text-tinta-2">{p.cliente_nome}</td>
                      <td data-rotulo="Lote Fabril" className="py-2.5 px-4 font-bold text-eno-800">{p.lote_producao || 'LOT-2026-F01'}</td>
                      <td data-rotulo="Data Fabricação" className="py-2.5 px-4 text-tinta-2">{formatarDataBR(p.data_fabricacao || p.data_emissao)}</td>
                      <td data-rotulo="Data Vencimento" className="py-2.5 px-4 text-tinta-2">{p.data_vencimento ? formatarDataBR(p.data_vencimento) : '-'}</td>
                      <td data-rotulo="Volume (Ton)" className="py-2.5 px-4 text-center font-bold">{(p.peso_total_kg / 1000).toFixed(1)} Ton</td>
                      <td data-rotulo="Status" className="py-2.5 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-eno-100 text-eno-800">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-linha border border-linha rounded-md overflow-hidden">
              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Total Faturado</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-eno-800 mt-1 block">
                  {metricasVendas.faturamentoTotalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-cinza">Notas emitidas e transmitidas</span>
              </div>
              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">A Faturar (Pendente)</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-st-aguardando mt-1 block">
                  {metricasVendas.saldoAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-cinza">Pronto para emissão/importação</span>
              </div>
              <div className="bg-papel px-4 py-3.5 min-w-0">
                <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Volume Faturado</span>
                <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-tinta mt-1 block">
                  {(metricasVendas.volumeTotalRealizadoKg / 1000).toLocaleString('pt-BR')} Ton
                </span>
                <span className="text-[11px] text-cinza">Fécula, amidos e derivados</span>
              </div>
            </div>

            <div className="bg-papel rounded-md border border-linha overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-linha">
                <h3 className="font-bold text-xs uppercase tracking-wider text-tinta-2">Espelho de Notas Fiscais Emitidas e Importadas</h3>
              </div>
              <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                <thead>
                  <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                    <th className="py-2.5 px-4">NF-e</th>
                    <th className="py-2.5 px-4">Pedido</th>
                    <th className="py-2.5 px-4">Destinatário</th>
                    <th className="py-2.5 px-4">Data Emissão</th>
                    <th className="py-2.5 px-4">Transportadora</th>
                    <th className="py-2.5 px-4 tabular-nums text-right">Valor NF-e</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {pedidosVenda.filter(p => p.nota_fiscal).map(p => (
                    <tr key={p.id} className="hover:bg-papel-2">
                      <td data-rotulo="NF-e" className="py-2.5 px-4 tabular-nums font-bold text-eno-800">NF-e {p.nota_fiscal?.numero}</td>
                      <td data-rotulo="Pedido" className="py-2.5 px-4 tabular-nums text-tinta-2">{p.numero_pedido}</td>
                      <td data-rotulo="Destinatário" className="py-2.5 px-4 font-medium text-tinta">{p.cliente_nome}</td>
                      <td data-rotulo="Data Emissão" className="py-2.5 px-4 tabular-nums text-tinta-2">{p.nota_fiscal?.data_emissao}</td>
                      <td data-rotulo="Transportadora" className="py-2.5 px-4 text-tinta-2">{p.transportadora || 'Frota Grupo ENO'}</td>
                      <td data-rotulo="Valor NF-e" className="py-2.5 px-4 tabular-nums font-bold text-right text-tinta">
                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMISSÕES DE RCA (títulos no Contas a Pagar gerados no faturamento) */}
        {relatorioAtivo === 'COMISSOES' && (() => {
          const pagas = comissoes.filter(c => c.status_comissao === 'Pago (PIX)');
          const aPagar = comissoes.filter(c => c.status_comissao !== 'Pago (PIX)');
          const soma = (l: VendaComissaoRCA[]) => l.reduce((acc, c) => acc + c.valor_comissao, 0);
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-linha border border-linha rounded-md overflow-hidden">
                <div className="bg-papel px-4 py-3.5 min-w-0">
                  <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Comissões Geradas</span>
                  <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-tinta mt-1 block">{formatarMoeda(soma(comissoes))}</span>
                  <span className="text-[11px] text-cinza">{comissoes.length} pedido(s) faturado(s) com RCA</span>
                </div>
                <div className="bg-papel px-4 py-3.5 min-w-0">
                  <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">A Pagar aos RCAs</span>
                  <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-st-aguardando mt-1 block">{formatarMoeda(soma(aPagar))}</span>
                  <span className="text-[11px] text-cinza">Títulos em aberto no Contas a Pagar</span>
                </div>
                <div className="bg-papel px-4 py-3.5 min-w-0">
                  <span className="text-[10.5px] font-bold text-cinza uppercase tracking-[0.14em] block">Pagas (PIX)</span>
                  <span className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] tabular-nums truncate text-eno-800 mt-1 block">{formatarMoeda(soma(pagas))}</span>
                  <span className="text-[11px] text-cinza">Baixadas no financeiro</span>
                </div>
              </div>

              <div className="bg-papel rounded-md border border-linha overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-linha">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-tinta-2">Comissões por Pedido Faturado</h3>
                </div>
                <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                  <thead>
                    <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                      <th className="py-2.5 px-4">Pedido</th>
                      <th className="py-2.5 px-4">Faturamento</th>
                      <th className="py-2.5 px-4">RCA / Cliente</th>
                      <th className="py-2.5 px-4">Regra</th>
                      <th className="py-2.5 px-4 text-right">Faturado</th>
                      <th className="py-2.5 px-4 text-right">%</th>
                      <th className="py-2.5 px-4 text-right">Comissão</th>
                      <th className="py-2.5 px-4 text-center">Título</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linha">
                    {comissoes.length === 0 && (
                      <tr><td data-rotulo="Pedido" colSpan={8} className="py-8 text-center text-cinza font-medium">Nenhum pedido faturado com RCA.</td></tr>
                    )}
                    {comissoes.map(c => (
                      <tr key={c.id} className="hover:bg-papel-2">
                        <td data-rotulo="Pedido" className="py-2.5 px-4 tabular-nums font-bold text-tinta">{c.numero_pedido}</td>
                        <td data-rotulo="Faturamento" className="py-2.5 px-4 tabular-nums text-tinta-2">{formatarDataBR(c.data)}</td>
                        <td data-rotulo="RCA / Cliente" className="py-2.5 px-4">
                          <div className="font-bold text-tinta">{pedidosVenda.find(p => p.id === c.pedido_id)?.rca_nome || '-'}</div>
                          <div className="text-[10px] text-cinza">{c.cliente_nome}</div>
                        </td>
                        <td data-rotulo="Regra" className="py-2.5 px-4 text-tinta-2">{rotuloRegraComissao(c.tipo_regra_aplicada)}</td>
                        <td data-rotulo="Faturado" className="py-2.5 px-4 tabular-nums text-right">{formatarMoeda(c.valor_faturado)}</td>
                        <td data-rotulo="%" className="py-2.5 px-4 tabular-nums text-right">{c.percentual_comissao}%</td>
                        <td data-rotulo="Comissão" className="py-2.5 px-4 tabular-nums font-bold text-right text-eno-800">{formatarMoeda(c.valor_comissao)}</td>
                        <td data-rotulo="Título" className="py-2.5 px-4 text-center">
                          {c.status_comissao === 'Pago (PIX)' ? (
                            <span className="text-eno-700 font-bold">Pago {c.data_pagamento_pix ? formatarDataBR(c.data_pagamento_pix) : ''}</span>
                          ) : c.titulo_pagar_id ? (
                            <span className={c.titulo_status === 'VENCIDO' ? 'text-st-vencido font-bold' : 'text-st-aguardando font-bold'}>
                              {c.titulo_status === 'VENCIDO' ? 'Vencido' : 'A pagar'} • {formatarDataBR(c.titulo_vencimento)}
                            </span>
                          ) : (
                            <span className="text-cinza">Sem título</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* E. RELATÓRIO DE ENTREGAS & LOGÍSTICA */}
        {relatorioAtivo === 'ENTREGAS' && (
          <div className="space-y-6">
            <div className="bg-papel rounded-md border border-linha p-5 shadow-xs">
              <h3 className="font-bold text-sm text-tinta mb-1">Controle de Entregas & Canhotos</h3>
              <p className="text-xs text-cinza mb-4">Acompanhamento das programações de entrega e confirmações de recebimento pelo cliente.</p>

              <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                <thead>
                  <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                    <th className="py-2.5 px-4">Pedido</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Data Programada</th>
                    <th className="py-2.5 px-4">Data Entrega</th>
                    <th className="py-2.5 px-4">Motorista / Transportadora</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha tabular-nums">
                  {pedidosVenda.filter(p => p.etapa === 'FATURADO' || p.etapa === 'ENTREGUE').map(p => (
                    <tr key={p.id} className="hover:bg-papel-2">
                      <td data-rotulo="Pedido" className="py-2.5 px-4 font-bold font-sans text-tinta">{p.numero_pedido}</td>
                      <td data-rotulo="Cliente" className="py-2.5 px-4 font-sans text-tinta-2">{p.cliente_nome}</td>
                      <td data-rotulo="Data Programada" className="py-2.5 px-4 text-tinta-2">{p.programacao_entrega?.data_programada || p.data_previsao_entrega}</td>
                      <td data-rotulo="Data Entrega" className="py-2.5 px-4 text-tinta font-bold">{p.data_entrega_realizada || 'Em trânsito'}</td>
                      <td data-rotulo="Motorista / Transportadora" className="py-2.5 px-4 font-sans text-tinta-2">
                        {p.programacao_entrega?.motorista || p.motorista_nome || '-'} ({p.transportadora || 'Própria'})
                      </td>
                      <td data-rotulo="Status" className="py-2.5 px-4 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.etapa === 'ENTREGUE'
                            ? 'bg-eno-100 text-eno-800'
                            : 'bg-st-aguardando-bg text-st-aguardando'
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
            <div className="bg-papel rounded-md border border-linha p-5 shadow-xs">
              <h3 className="font-bold text-sm text-tinta mb-1">Cotações & Orçamentos Sugestivos</h3>
              <p className="text-xs text-cinza mb-4">Propostas emitidas, prazos de validade e apresentações comerciais (Fardos, Caixas, Sacos e Big Bags).</p>

              <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                <thead>
                  <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                    <th className="py-2.5 px-4">Orçamento</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Emissão</th>
                    <th className="py-2.5 px-4">RCA</th>
                    <th className="py-2.5 px-4">Itens & Embalagem</th>
                    <th className="py-2.5 px-4 tabular-nums text-right">Valor Total</th>
                    <th className="py-2.5 px-4 text-center">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {pedidosVenda.filter(p => p.etapa === 'ORCAMENTO' || p.origem === 'Sugestão Reposição').map(p => (
                    <tr key={p.id} className="hover:bg-papel-2">
                      <td data-rotulo="Orçamento" className="py-2.5 px-4 tabular-nums font-bold text-tinta">{p.numero_pedido}</td>
                      <td data-rotulo="Cliente" className="py-2.5 px-4 font-medium text-tinta">{p.cliente_nome}</td>
                      <td data-rotulo="Emissão" className="py-2.5 px-4 tabular-nums text-tinta-2">{p.data_emissao}</td>
                      <td data-rotulo="RCA" className="py-2.5 px-4 text-tinta-2">{p.rca_nome}</td>
                      <td data-rotulo="Itens & Embalagem" className="py-2.5 px-4 text-tinta-2">
                        {p.itens.map(i => `${i.quantidade}x ${i.tipo_embalagem}`).join(', ')}
                      </td>
                      <td data-rotulo="Valor Total" className="py-2.5 px-4 tabular-nums font-bold text-right text-tinta">
                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td data-rotulo="Origem" className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-papel-3/60 text-tinta-2">
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
            <div className="bg-papel rounded-md border border-linha p-5 shadow-xs">
              <h3 className="font-bold text-sm text-tinta mb-1">Curva ABC de Produtos & Faturamento</h3>
              <p className="text-xs text-cinza mb-4">Classificação por faturamento gerado e volume físico movimentado.</p>

              <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left border-collapse text-xs`}>
                <thead>
                  <tr className="bg-papel-2 text-[10px] font-bold uppercase text-cinza border-b border-linha">
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="py-2.5 px-4 text-center">Unidades</th>
                    <th className="py-2.5 px-4 text-center">Peso Físico</th>
                    <th className="py-2.5 px-4 tabular-nums text-right">Faturamento Total</th>
                    <th className="py-2.5 px-4 text-right">Participação %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha tabular-nums">
                  {mixProdutos.map((p, idx) => {
                    const perc = metricasVendas.faturamentoTotalRealizado > 0
                      ? (p.valorTotal / metricasVendas.faturamentoTotalRealizado) * 100
                      : 0;
                    return (
                      <tr key={idx} className="hover:bg-papel-2">
                        <td data-rotulo="Produto" className="py-2.5 px-4 font-sans font-bold text-tinta">{p.nome}</td>
                        <td data-rotulo="Unidades" className="py-2.5 px-4 text-center text-tinta-2">{p.quantidade.toLocaleString('pt-BR')} un</td>
                        <td data-rotulo="Peso Físico" className="py-2.5 px-4 text-center text-tinta-2">{(p.pesoKg / 1000).toFixed(1)} Ton</td>
                        <td data-rotulo="Faturamento Total" className="py-2.5 px-4 text-right font-bold text-tinta">
                          {p.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td data-rotulo="Participação %" className="py-2.5 px-4 text-right font-bold text-eno-800">{perc.toFixed(1)}%</td>
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
