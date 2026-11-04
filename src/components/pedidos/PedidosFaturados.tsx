import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  CheckCircle2,
  DollarSign,
  Truck,
  Copy,
  Check,
  Calendar,
  Eye,
  X,
  Printer,
  FileText,
  Navigation,
  Clock,
  MapPin,
  CalendarDays,
  Phone
} from 'lucide-react';
import {
  PedidoVenda,
  carregarPedidosVenda,
  salvarPedidosVenda,
  moverPedidoEtapa
} from '../../data/pedidosVendaData';
import { PedidosNavTabs } from './PedidosNavTabs';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { formatarDataBR } from '../../lib/datas';
import { ChaveAcesso } from '../ui/ChaveAcesso';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function PedidosFaturados({ onNavigate }: Props) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalNf, setModalNf] = useState<PedidoVenda | null>(null);
  const [modalProgramar, setModalProgramar] = useState<PedidoVenda | null>(null);

  // Campos de Programação de Entrega
  const [dataProgramadaInput, setDataProgramadaInput] = useState('');
  const [janelaHorarioInput, setJanelaHorarioInput] = useState('Manhã (08:00 - 12:00)');
  const [motoristaEntregaInput, setMotoristaEntregaInput] = useState('');
  const [telefoneMotoristaInput, setTelefoneMotoristaInput] = useState('');
  const [transportadoraEntregaInput, setTransportadoraEntregaInput] = useState('');
  const [placaEntregaInput, setPlacaEntregaInput] = useState('');

  const recarregar = () => {
    const todos = carregarPedidosVenda();
    setPedidos(todos.filter(p => p.etapa === 'FATURADO'));
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
    const programados = pedidos.filter(p => !!p.programacao_entrega?.data_programada).length;

    return { total, valorTotal, volumeTotalKg, programados };
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

  // Copiar chave NF-e
  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // Baixar / Visualizar arquivo fiscal guardado
  const handleBaixarArquivoFiscal = (nf: NonNullable<PedidoVenda['nota_fiscal']>) => {
    if (nf.arquivo_conteudo) {
      if (nf.tipo_arquivo === 'PDF' && nf.arquivo_conteudo.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = nf.arquivo_conteudo;
        a.download = nf.arquivo_anexado || `NF_${nf.numero}.pdf`;
        a.click();
      } else {
        const blob = new Blob([nf.arquivo_conteudo], { type: 'text/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nf.arquivo_anexado || `NF_${nf.numero}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      alert(`Arquivo fiscal guardado no sistema: ${nf.arquivo_anexado || 'NF_' + nf.numero + '.xml'}\n\nChave de Acesso: ${nf.chave_acesso}`);
    }
  };

  // Abrir Modal de Programar Entrega
  const handleAbrirProgramar = (p: PedidoVenda) => {
    setModalProgramar(p);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    setDataProgramadaInput(p.programacao_entrega?.data_programada || amanha.toLocaleDateString('pt-BR'));
    setTransportadoraEntregaInput(p.programacao_entrega?.transportadora || p.transportadora || '');
    setMotoristaEntregaInput(p.programacao_entrega?.motorista || p.motorista_nome || '');
    setTelefoneMotoristaInput(p.programacao_entrega?.telefone_motorista || '(14) 99872-3321');
    setPlacaEntregaInput(p.programacao_entrega?.placa || p.placa_veiculo || '');
  };

  // Salvar Programação de Entrega
  const handleSalvarProgramacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProgramar) return;

    const todos = carregarPedidosVenda();
    const index = todos.findIndex(p => p.id === modalProgramar.id);
    if (index !== -1) {
      todos[index] = {
        ...todos[index],
        transportadora: transportadoraEntregaInput,
        placa_veiculo: placaEntregaInput,
        motorista_nome: motoristaEntregaInput,
        programacao_entrega: {
          data_programada: dataProgramadaInput,
          transportadora: transportadoraEntregaInput,
          motorista: motoristaEntregaInput,
          telefone_motorista: telefoneMotoristaInput,
          placa: placaEntregaInput,
          status_rota: 'EM_TRANSITO'
        }
      };
      salvarPedidosVenda(todos);
    }
    setModalProgramar(null);
  };

  // Confirmar / Assinalar Entrega Realizada
  const handleConfirmarEntrega = (pedidoId: string, numero: string) => {
    if (confirm(`Confirmar e assinalar entrega do pedido ${numero} como entregue ao cliente?`)) {
      moverPedidoEtapa(pedidoId, 'ENTREGUE');
      if (onNavigate) onNavigate('pedidos_entregues');
    }
  };

  const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const toneladas = (kg: number) => `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;
  const semProgramacao = metricas.total - metricas.programados;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* Abas antigas do fluxo: só fora do shell */}
      <PedidosNavTabs activeTab="pedidos_faturados" onNavigate={onNavigate} />

      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Faturados em trânsito"
          resumo={
            metricas.total === 0 ? (
              'Nenhum pedido faturado aguardando entrega.'
            ) : (
              <>
                {metricas.total} em rota · {moeda(metricas.valorTotal)} · {toneladas(metricas.volumeTotalKg)}
                {semProgramacao > 0 && (
                  <span className="text-st-aguardando font-semibold"> · {semProgramacao} sem entrega programada</span>
                )}
              </>
            )
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
                titulo={pedidos.length === 0 ? 'Nenhum pedido em trânsito' : 'Nada encontrado'}
                texto={
                  pedidos.length === 0
                    ? 'Ao guardar a NF-e de um pedido em "A faturar", ele vem para cá para programar a entrega e confirmar o recebimento.'
                    : 'Confira o número do pedido, da NF-e ou o nome do cliente.'
                }
              />
            </div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {pedidosFiltrados.map(item => {
                  const programada = item.programacao_entrega?.data_programada;
                  return (
                    <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                      <button type="button" onClick={() => setModalNf(item)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums">
                              {item.numero_pedido}{item.nota_fiscal ? ` · NF-e ${item.nota_fiscal.numero}` : ''}
                            </div>
                            <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">
                              {item.cliente_cidade_uf} · {item.transportadora || 'Frota do cliente'}{item.placa_veiculo ? ` · ${item.placa_veiculo}` : ''}
                            </div>
                          </div>
                          {programada ? (
                            <StatusChip tom="producao" className="shrink-0">Entrega {formatarDataBR(programada)}</StatusChip>
                          ) : (
                            <StatusChip tom="aguardando" className="shrink-0">Sem programação</StatusChip>
                          )}
                        </div>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-[11.5px] text-cinza tabular-nums">{toneladas(item.peso_total_kg)} · {item.prazo_pagamento}</span>
                          <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{moeda(item.valor_total)}</span>
                        </div>
                      </button>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmarEntrega(item.id, item.numero_pedido)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-eno-800 text-white text-[12.5px] font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" /> Entregue
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAbrirProgramar(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                        >
                          <CalendarDays className="w-3.5 h-3.5" /> {programada ? 'Reprogramar' : 'Programar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalNf(item)}
                          className="w-10 h-10 inline-flex items-center justify-center rounded-md border border-linha-forte text-tinta-2 active:bg-papel-3"
                          aria-label={`Ver nota do pedido ${item.numero_pedido}`}
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
                    <Th>Pedido</Th>
                    <Th>Cliente</Th>
                    <Th>Transporte</Th>
                    <Th>Entrega</Th>
                    <Th numero>Valor</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(item => {
                    const programada = item.programacao_entrega?.data_programada;
                    return (
                      <tr key={item.id} className={tabela.tr}>
                        <Td>
                          <div className="font-semibold text-tinta tabular-nums whitespace-nowrap">{item.numero_pedido}</div>
                          {item.nota_fiscal && (
                            <div className="flex items-center gap-1 text-[11.5px] text-cinza tabular-nums whitespace-nowrap">
                              NF-e {item.nota_fiscal.numero}
                              <button
                                type="button"
                                onClick={() => handleCopiarChave(item.nota_fiscal!.chave_acesso, item.id)}
                                className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-papel-3 text-cinza hover:text-tinta-2 transition-colors cursor-pointer"
                                title="Copiar chave de acesso"
                                aria-label="Copiar chave de acesso"
                              >
                                {copiadoId === item.id ? <Check className="w-3 h-3 text-st-pago" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                          {item.lote_producao && <div className="text-[11px] text-cinza tabular-nums">Lote {item.lote_producao}</div>}
                        </Td>
                        <Td className="max-w-[260px]">
                          <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                        </Td>
                        <Td className="max-w-[220px]">
                          <div className="text-tinta truncate">{item.transportadora || 'Frota do cliente'}</div>
                          {item.placa_veiculo && (
                            <div className="text-[11.5px] text-cinza tabular-nums truncate">
                              {item.placa_veiculo}{item.motorista_nome ? ` · ${item.motorista_nome}` : ''}
                            </div>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {programada ? (
                            <>
                              <StatusChip tom="producao">{formatarDataBR(programada)}</StatusChip>
                              <div className="text-[11px] text-cinza mt-0.5 truncate max-w-[180px]">{item.programacao_entrega?.motorista || 'Motorista alocado'}</div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAbrirProgramar(item)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] bg-st-aguardando-bg text-st-aguardando text-[12px] font-semibold hover:brightness-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Programar entrega
                            </button>
                          )}
                        </Td>
                        <Td numero>
                          <div className="font-bold text-tinta text-[13.5px]">{moeda(item.valor_total)}</div>
                          <div className="text-[11.5px] text-cinza font-normal">{toneladas(item.peso_total_kg)}</div>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmarEntrega(item.id, item.numero_pedido)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[5px] bg-eno-800 hover:bg-eno-900 text-white text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Confirmar que o cliente recebeu"
                            >
                              <Check className="w-3.5 h-3.5" /> Entregue
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirProgramar(item)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-[5px] text-tinta-2 hover:bg-papel-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Programar / ajustar a entrega"
                              aria-label="Programar entrega"
                            >
                              <CalendarDays className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalNf(item)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Ver espelho da nota"
                            >
                              <Eye className="w-3.5 h-3.5" /> NF-e
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

      {/* 5. MODAL ESPELHO DA NF-E (AMPLO E HORIZONTAL) */}
      {modalNf && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-5xl lg:max-w-6xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white">Espelho Fiscal - NF-e {modalNf.nota_fiscal?.numero}</h3>
              <button onClick={() => setModalNf(null)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-3">
                  <div>
                    <span className="text-cinza font-medium block mb-1">Chave de Acesso (44 Dígitos):</span>
                    <div className="p-2.5 bg-papel rounded-md border border-linha tabular-nums text-[11px] select-all break-all text-tinta">
                      <ChaveAcesso chave={modalNf.nota_fiscal?.chave_acesso} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-cinza block font-medium">Número / Série:</span>
                      <strong className="text-tinta tabular-nums text-xs">{modalNf.nota_fiscal?.numero} / Série {modalNf.nota_fiscal?.serie}</strong>
                    </div>
                    <div>
                      <span className="text-cinza block font-medium">Data de Emissão:</span>
                      <strong className="text-tinta tabular-nums text-xs">{modalNf.nota_fiscal?.data_emissao}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-linha">
                    <div>
                      <span className="text-cinza block font-medium">Lote de Produção:</span>
                      <strong className="text-eno-800 tabular-nums text-xs">{modalNf.lote_producao || 'Lote Padrão'}</strong>
                    </div>
                    <div>
                      <span className="text-cinza block font-medium">Vencimento:</span>
                      <strong className="text-tinta tabular-nums text-xs">{modalNf.data_vencimento ? formatarDataBR(modalNf.data_vencimento) : '2 anos'}</strong>
                    </div>
                  </div>

                  {modalNf.nota_fiscal?.arquivo_anexado && (
                    <div className="p-2.5 bg-eno-50 rounded-md border border-eno-100 flex items-center justify-between text-xs gap-2">
                      <div className="truncate">
                        <span className="text-cinza font-medium block text-[10px]">Arquivo Fiscal Guardado:</span>
                        <strong className="text-eno-800 tabular-nums text-xs truncate block">{modalNf.nota_fiscal.arquivo_anexado}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBaixarArquivoFiscal(modalNf.nota_fiscal!)}
                        className="px-2.5 py-1 rounded-lg bg-eno-700 hover:bg-eno-800 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs transition-colors"
                        title="Baixar ou visualizar arquivo fiscal arquivado"
                      >
                        Baixar Arquivo
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-linha flex justify-between items-center">
                    <span className="font-bold text-tinta-2">Total Faturado:</span>
                    <span className="tabular-nums font-extrabold text-lg text-eno-800">
                      {modalNf.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-2">
                  <span className="font-bold text-tinta uppercase tracking-wider text-xs block mb-1">Itens da Carga Faturada</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {modalNf.itens.map((it, idx) => (
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
                <span>Imprimir Danfe</span>
              </button>

              <button
                onClick={() => {
                  handleConfirmarEntrega(modalNf.id, modalNf.numero_pedido);
                  setModalNf(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar Entrega</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL PROGRAMAR LOGÍSTICA DE ENTREGA (AMPLO E HORIZONTAL) */}
      {modalProgramar && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-5xl lg:max-w-6xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-ouro-claro" />
                <h3 className="font-bold text-sm sm:text-base text-white">Programação de Entrega - {modalProgramar.numero_pedido}</h3>
              </div>
              <button onClick={() => setModalProgramar(null)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarProgramacao} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* Coluna 1: Dados do Pedido */}
                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-2">
                  <span className="font-bold text-tinta uppercase tracking-wider text-xs block mb-1">Dados da Carga</span>
                  <div className="flex justify-between items-center py-1 border-b border-linha/80">
                    <span className="text-cinza font-medium">Cliente:</span>
                    <strong className="text-tinta font-bold">{modalProgramar.cliente_nome}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-linha/80">
                    <span className="text-cinza font-medium">Destino:</span>
                    <span className="text-tinta-2 font-medium">{modalProgramar.cliente_cidade_uf}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-cinza font-medium">Peso Total & Valor:</span>
                    <span className="tabular-nums font-bold text-tinta">
                      {(modalProgramar.peso_total_kg / 1000).toLocaleString('pt-BR')} Ton • {modalProgramar.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Coluna 2: Formulário de Agendamento */}
                <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-3">
                  <span className="font-bold text-tinta uppercase tracking-wider text-xs block">Agendamento & Motorista</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-tinta-2 mb-1">Data da Programação <span className="text-st-vencido">*</span></label>
                      <input
                        type="text"
                        required
                        value={dataProgramadaInput}
                        onChange={(e) => setDataProgramadaInput(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full bg-papel border border-linha rounded-lg px-3 py-2 text-tinta font-bold focus:outline-none focus:border-eno-700"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-tinta-2 mb-1">Janela de Horário</label>
                      <select
                        value={janelaHorarioInput}
                        onChange={(e) => setJanelaHorarioInput(e.target.value)}
                        className="w-full bg-papel border border-linha rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700"
                      >
                        <option value="Manhã (08:00 - 12:00)">Manhã (08:00 - 12:00)</option>
                        <option value="Tarde (13:00 - 17:00)">Tarde (13:00 - 17:00)</option>
                        <option value="Comercial (08:00 - 18:00)">Comercial (08:00 - 18:00)</option>
                        <option value="Madrugada / Primeiro Horário">Madrugada / Primeiro Horário</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Transportadora Responsável</label>
                    <input
                      type="text"
                      value={transportadoraEntregaInput}
                      onChange={(e) => setTransportadoraEntregaInput(e.target.value)}
                      placeholder="Transportadora ou Frota Própria"
                      className="w-full bg-papel border border-linha rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-tinta-2 mb-1">Nome do Motorista</label>
                      <input
                        type="text"
                        value={motoristaEntregaInput}
                        onChange={(e) => setMotoristaEntregaInput(e.target.value)}
                        placeholder="Motorista"
                        className="w-full bg-papel border border-linha rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-tinta-2 mb-1">Placa do Veículo / Carreta</label>
                      <input
                        type="text"
                        value={placaEntregaInput}
                        onChange={(e) => setPlacaEntregaInput(e.target.value.toUpperCase())}
                        placeholder="ABC-1D23"
                        className="w-full bg-papel border border-linha rounded-lg px-3 py-2 text-tinta tabular-nums font-bold uppercase focus:outline-none focus:border-eno-700"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-linha flex items-center justify-end gap-3 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setModalProgramar(null)}
                  className="px-5 py-2.5 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Gravar Programação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
