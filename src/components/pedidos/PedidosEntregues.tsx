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
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
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

  const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const toneladas = (kg: number) => `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* Abas antigas do fluxo: só fora do shell */}
      <PedidosNavTabs activeTab="pedidos_entregues" onNavigate={onNavigate} />

      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Entregues"
          resumo={
            metricas.total === 0
              ? 'Nenhum pedido entregue ainda.'
              : `${metricas.total} ${metricas.total === 1 ? 'pedido entregue' : 'pedidos entregues'} · ${moeda(metricas.valorTotal)} · ${toneladas(metricas.volumeTotalKg)}`
          }
        />
        <BarraFiltros>
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar pedido, NF-e, cliente ou cidade" className="w-full md:w-80" />
        </BarraFiltros>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              <EstadoVazio
                titulo={pedidos.length === 0 ? 'Nenhum pedido entregue' : 'Nada encontrado'}
                texto={
                  pedidos.length === 0
                    ? 'Quando um pedido faturado tiver a entrega confirmada, ele aparece aqui com a opção de repetir a compra.'
                    : 'Confira o número do pedido, da NF-e ou o nome do cliente.'
                }
              />
            </div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {pedidosFiltrados.map(item => (
                  <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                    <button type="button" onClick={() => setModalDetalhes(item)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-cinza tabular-nums">
                            {item.numero_pedido}{item.nota_fiscal ? ` · NF-e ${item.nota_fiscal.numero}` : ''}
                          </div>
                          <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                        </div>
                        <StatusChip tom="pago" className="shrink-0">Entregue</StatusChip>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <span className="text-[11.5px] text-cinza tabular-nums">
                          {formatarDataBR(item.data_entrega_realizada || item.data_previsao_entrega)} · {toneladas(item.peso_total_kg)}
                        </span>
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{moeda(item.valor_total)}</span>
                      </div>
                    </button>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => handleRepetirPedido(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Repetir pedido
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDetalhes(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                      >
                        <Eye className="w-3.5 h-3.5" /> Comprovante
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* A partir de sm: tabela densa */}
              <TabelaDados className="hidden sm:block">
                <thead className={tabela.thead}>
                  <tr>
                    <Th>Pedido</Th>
                    <Th>Cliente</Th>
                    <Th>Entrega</Th>
                    <Th numero>Volume</Th>
                    <Th numero>Valor</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(item => (
                    <tr key={item.id} onClick={() => setModalDetalhes(item)} className={`${tabela.tr} cursor-pointer group`}>
                      <Td>
                        <div className="font-semibold text-tinta tabular-nums whitespace-nowrap group-hover:text-eno-700">{item.numero_pedido}</div>
                        {item.nota_fiscal && <div className="text-[11.5px] text-cinza tabular-nums">NF-e {item.nota_fiscal.numero}</div>}
                      </Td>
                      <Td className="max-w-[280px]">
                        <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                        <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        <div>{formatarDataBR(item.data_entrega_realizada || item.data_previsao_entrega)}</div>
                        <StatusChip tom="pago" className="mt-0.5">Recebido</StatusChip>
                      </Td>
                      <Td numero>
                        <div className="font-semibold text-tinta">{toneladas(item.peso_total_kg)}</div>
                        <div className="text-[11.5px] text-cinza">{item.itens.reduce((acc, i) => acc + i.quantidade, 0)} un.</div>
                      </Td>
                      <Td numero>
                        <div className="font-bold text-tinta text-[13.5px]">{moeda(item.valor_total)}</div>
                        <div className="text-[11.5px] text-cinza font-normal">{item.prazo_pagamento}</div>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleRepetirPedido(item)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[5px] border border-linha-forte text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            title="Gerar nova cotação repetindo este pedido"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Repetir
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalDetalhes(item)}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
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

      {/* 5. MODAL DETALHES DO PEDIDO ENTREGUE (AMPLO E HORIZONTAL) */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-5xl lg:max-w-6xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white">Comprovante de Entrega - Pedido {modalDetalhes.numero_pedido}</h3>
              <button onClick={() => setModalDetalhes(null)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* Coluna 1: Dados do Cliente e Documento */}
                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-2.5">
                  <span className="font-bold text-tinta uppercase tracking-wider text-xs block mb-1">
                    Dados da Entrega
                  </span>
                  <div className="flex justify-between items-center py-1 border-b border-linha/80">
                    <span className="text-cinza font-medium">Cliente:</span>
                    <strong className="text-tinta font-bold">{modalDetalhes.cliente_nome}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-linha/80">
                    <span className="text-cinza font-medium">Entregue em:</span>
                    <span className="tabular-nums text-tinta-2 font-bold">{modalDetalhes.data_entrega_realizada}</span>
                  </div>
                  {modalDetalhes.nota_fiscal && (
                    <div className="flex justify-between items-center py-1 border-b border-linha/80">
                      <span className="text-cinza font-medium">Documento Fiscal:</span>
                      <span className="tabular-nums text-eno-800 font-bold">NF-e {modalDetalhes.nota_fiscal.numero}</span>
                    </div>
                  )}
                  {modalDetalhes.lote_producao && (
                    <div className="flex justify-between items-center py-1 border-b border-linha/80">
                      <span className="text-cinza font-medium">Lote de Produção:</span>
                      <span className="tabular-nums text-eno-800 font-bold">{modalDetalhes.lote_producao}</span>
                    </div>
                  )}
                  {modalDetalhes.data_vencimento && (
                    <div className="flex justify-between items-center py-1 border-b border-linha/80">
                      <span className="text-cinza font-medium">Data de Vencimento:</span>
                      <span className="tabular-nums text-tinta font-bold">{formatarDataBR(modalDetalhes.data_vencimento)}</span>
                    </div>
                  )}
                  {modalDetalhes.nota_fiscal?.arquivo_anexado && (
                    <div className="flex justify-between items-center py-1 border-b border-linha/80">
                      <span className="text-cinza font-medium">Arquivo Guardado:</span>
                      <span className="tabular-nums text-eno-800 font-bold text-[11px] truncate max-w-[200px]">{modalDetalhes.nota_fiscal.arquivo_anexado}</span>
                    </div>
                  )}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="font-bold text-tinta-2 text-xs">Total Liquidado:</span>
                    <span className="tabular-nums font-extrabold text-lg text-eno-800">
                      {modalDetalhes.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Coluna 2: Itens Entregues */}
                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-2">
                  <span className="font-bold text-tinta uppercase tracking-wider text-xs block mb-1">
                    Itens Entregues e Conferidos
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {modalDetalhes.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-papel rounded-md border border-linha/80">
                        <div>
                          <strong className="text-tinta">{it.produto_nome}</strong>
                          <div className="text-cinza tabular-nums text-[11px]">{it.quantidade}x {it.tipo_embalagem}</div>
                        </div>
                        <div className="tabular-nums font-bold text-tinta text-xs">
                          {it.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 bg-papel-2 border-t border-linha flex items-center justify-between shrink-0 gap-2 max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-papel border border-linha-forte text-tinta-2 font-bold hover:bg-papel-3/60 cursor-pointer text-xs shadow-xs"
              >
                <Printer className="w-4 h-4 text-eno-700" />
                <span>Imprimir Recibo</span>
              </button>

              <button
                onClick={() => {
                  handleRepetirPedido(modalDetalhes);
                  setModalDetalhes(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-xs shadow-sm cursor-pointer"
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
