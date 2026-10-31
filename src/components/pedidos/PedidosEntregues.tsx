import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCheck,
  Search,
  CheckCircle2,
  DollarSign,
  Package,
  RotateCcw,
  Calendar,
  Eye,
  X,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import {
  PedidoVenda,
  carregarPedidosVenda,
  salvarPedidosVenda
} from '../../data/pedidosVendaData';
import { PedidosNavTabs } from './PedidosNavTabs';
import { limparEstadoProducaoFaturamento } from '../../data/pedidosVendaData';
import { hojeISO, somarDias, formatarDataBR } from '../../lib/datas';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function PedidosEntregues({ onNavigate }: Props) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [modalDetalhes, setModalDetalhes] = useState<PedidoVenda | null>(null);

  const recarregar = () => {
    const todos = carregarPedidosVenda();
    setPedidos(todos.filter(p => p.etapa === 'ENTREGUE'));
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    return () => window.removeEventListener('pedidos_venda_updated', handleUpdate);
  }, []);

  // Métricas
  const metricas = useMemo(() => {
    const total = pedidos.length;
    const valorTotal = pedidos.reduce((acc, p) => acc + p.valor_total, 0);
    const volumeTotalKg = pedidos.reduce((acc, p) => acc + p.peso_total_kg, 0);

    return { total, valorTotal, volumeTotalKg };
  }, [pedidos]);

  // Filtros
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const match =
        p.numero_pedido.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.nota_fiscal?.numero.includes(busca) ||
        p.cliente_cidade_uf.toLowerCase().includes(busca.toLowerCase());
      return match;
    });
  }, [pedidos, busca]);

  // Ação Rápida: Repetir Pedido (cria um novo orçamento idêntico)
  const handleRepetirPedido = (pedidoOrigem: PedidoVenda) => {
    if (confirm(`Duplicar este pedido e gerar uma nova cotação para ${pedidoOrigem.cliente_nome}?`)) {
      const dataHojeStr = hojeISO();
      const dataValidadeStr = somarDias(dataHojeStr, 7);

      // Copia só os dados comerciais: todo estado de produção/faturamento/entrega é limpo
      const novoOrcamento: PedidoVenda = {
        ...limparEstadoProducaoFaturamento(pedidoOrigem),
        id: `ped_venda_${Date.now()}`,
        numero_pedido: `ORC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        tipo: 'ORCAMENTO',
        etapa: 'ORCAMENTO',
        comissao_valor: pedidoOrigem.comissao_valor,
        data_emissao: dataHojeStr,
        data_validade_orcamento: dataValidadeStr,
        data_previsao_entrega: dataValidadeStr,
        data_inicio_producao: undefined,
        data_conclusao_producao: undefined,
        data_faturamento: undefined,
        data_entrega_realizada: undefined,
        nota_fiscal: undefined,
        origem: 'Sugestão Reposição',
        subtipo_venda: 'Pedido Sugestivo',
        observacoes: `Recompra baseada no pedido anterior ${pedidoOrigem.numero_pedido}`
      };

      const todos = carregarPedidosVenda();
      salvarPedidosVenda([novoOrcamento, ...todos]);
      if (onNavigate) onNavigate('pedidos_orcamentos_sugestivo');
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE ESTEIRA UNIFICADA */}
      <PedidosNavTabs activeTab="pedidos_entregues" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Pedidos Entregues</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {metricas.total} finalizados
              </span>
            </h1>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Faturamento Concluído:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {metricas.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Volume Total Entregue:</span>
            <span className="font-mono font-bold text-slate-900">
              {(metricas.volumeTotalKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Toneladas
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Pedido, NF-e, Cliente..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>
      </div>

      {/* 4. TABELA LIMPA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Pedido & NF-e</th>
                <th className="py-3 px-4">Cliente / Praça</th>
                <th className="py-3 px-4">Data de Entrega</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum pedido entregue encontrado.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900">
                          {item.numero_pedido}
                        </div>
                        {item.nota_fiscal && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            NF-e {item.nota_fiscal.numero}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400">{item.cliente_cidade_uf}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {formatarDataBR(item.data_entrega_realizada || item.data_previsao_entrega)}
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-sans mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Recebido</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          {(item.peso_total_kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.itens.reduce((acc, i) => acc + i.quantidade, 0)} unidades
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          {item.prazo_pagamento}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRepetirPedido(item)}
                            className="
                              flex items-center gap-1 px-3 py-1.5 rounded-lg
                              bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs
                              border border-slate-300 transition-colors cursor-pointer
                            "
                            title="Gerar Nova Cotação Replicando este Pedido"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Repetir</span>
                          </button>

                          <button
                            onClick={() => setModalDetalhes(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* 5. MODAL DETALHES DO PEDIDO ENTREGUE (AMPLO E HORIZONTAL) */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white">Comprovante de Entrega - Pedido {modalDetalhes.numero_pedido}</h3>
              <button onClick={() => setModalDetalhes(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* Coluna 1: Dados do Cliente e Documento */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block mb-1">
                    Dados da Entrega
                  </span>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Cliente:</span>
                    <strong className="text-slate-900 font-bold">{modalDetalhes.cliente_nome}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Entregue em:</span>
                    <span className="font-mono text-slate-700 font-bold">{modalDetalhes.data_entrega_realizada}</span>
                  </div>
                  {modalDetalhes.nota_fiscal && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                      <span className="text-slate-500 font-medium">Documento Fiscal:</span>
                      <span className="font-mono text-emerald-900 font-bold">NF-e {modalDetalhes.nota_fiscal.numero}</span>
                    </div>
                  )}
                  {modalDetalhes.lote_producao && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                      <span className="text-slate-500 font-medium">Lote de Produção:</span>
                      <span className="font-mono text-emerald-900 font-bold">{modalDetalhes.lote_producao}</span>
                    </div>
                  )}
                  {modalDetalhes.data_vencimento && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                      <span className="text-slate-500 font-medium">Data de Vencimento:</span>
                      <span className="font-mono text-slate-800 font-bold">{modalDetalhes.data_vencimento}</span>
                    </div>
                  )}
                  {modalDetalhes.nota_fiscal?.arquivo_anexado && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                      <span className="text-slate-500 font-medium">Arquivo Guardado:</span>
                      <span className="font-mono text-emerald-800 font-bold text-[11px] truncate max-w-[200px]">{modalDetalhes.nota_fiscal.arquivo_anexado}</span>
                    </div>
                  )}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-xs">Total Liquidado:</span>
                    <span className="font-mono font-black text-lg text-emerald-900">
                      {modalDetalhes.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Coluna 2: Itens Entregues */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block mb-1">
                    Itens Entregues e Conferidos
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {modalDetalhes.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-200/80">
                        <div>
                          <strong className="text-slate-800">{it.produto_nome}</strong>
                          <div className="text-slate-500 font-mono text-[11px]">{it.quantidade}x {it.tipo_embalagem}</div>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {it.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>Imprimir Recibo</span>
              </button>

              <button
                onClick={() => {
                  handleRepetirPedido(modalDetalhes);
                  setModalDetalhes(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Repetir Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
