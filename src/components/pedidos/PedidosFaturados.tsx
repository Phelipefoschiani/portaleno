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
import { formatarDataBR } from '../../lib/datas';

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
    setTransportadoraEntregaInput(p.programacao_entrega?.transportadora || p.transportadora || 'TransVale Rodoviário');
    setMotoristaEntregaInput(p.programacao_entrega?.motorista || p.motorista_nome || 'Sebastião Antunes');
    setTelefoneMotoristaInput(p.programacao_entrega?.telefone_motorista || '(14) 99872-3321');
    setPlacaEntregaInput(p.programacao_entrega?.placa || p.placa_veiculo || 'BRA-2E19');
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

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE ESTEIRA UNIFICADA */}
      <PedidosNavTabs activeTab="pedidos_faturados" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Faturados & Em Trânsito</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {metricas.total} em rota
              </span>
            </h1>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Faturamento em Rota:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {metricas.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Volume Despachado:</span>
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
                <th className="py-3 px-4">Cliente / Destino</th>
                <th className="py-3 px-4">Transporte & Placa</th>
                <th className="py-3 px-4">Programação da Entrega</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum pedido faturado em trânsito.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((item) => {
                  const programada = item.programacao_entrega?.data_programada;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900">
                          {item.numero_pedido}
                        </div>
                        {item.nota_fiscal && (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-800 font-bold">
                                NF nº {item.nota_fiscal.numero}
                              </span>
                              <button
                                onClick={() => handleCopiarChave(item.nota_fiscal!.chave_acesso, item.id)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Copiar Chave de Acesso"
                              >
                                {copiadoId === item.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {item.nota_fiscal.arquivo_anexado && (
                              <span className="text-[10px] text-emerald-800 font-mono font-medium truncate max-w-[160px]" title={item.nota_fiscal.arquivo_anexado}>
                                📎 {item.nota_fiscal.arquivo_anexado}
                              </span>
                            )}
                          </div>
                        )}
                        {item.lote_producao && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Lote: {item.lote_producao}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400">{item.cliente_cidade_uf}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{item.transportadora || 'Frota do Cliente'}</div>
                        {item.placa_veiculo && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {item.placa_veiculo} {item.motorista_nome && `• ${item.motorista_nome}`}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {programada ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CalendarDays className="w-3 h-3 text-emerald-700" />
                              <span>{programada}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {item.programacao_entrega?.motorista || 'Motorista alocado'}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAbrirProgramar(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 cursor-pointer transition-colors"
                          >
                            <Calendar className="w-3 h-3 text-amber-600" />
                            <span>Programar Entrega</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          {(item.peso_total_kg / 1000).toLocaleString('pt-BR')} Ton
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirProgramar(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Programar / Ajustar Logística de Entrega"
                          >
                            <CalendarDays className="w-4 h-4 text-emerald-800" />
                          </button>

                          <button
                            onClick={() => handleConfirmarEntrega(item.id, item.numero_pedido)}
                            className="
                              flex items-center gap-1 px-3 py-1.5 rounded-lg
                              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
                              shadow-2xs transition-colors cursor-pointer
                            "
                            title="Assinalar e Confirmar Entrega Realizada"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Assinalar Entrega</span>
                          </button>

                          <button
                            onClick={() => setModalNf(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Ver Espelho da Nota"
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

      {/* 5. MODAL ESPELHO DA NF-E (AMPLO E HORIZONTAL) */}
      {modalNf && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white">Espelho Fiscal - NF-e {modalNf.nota_fiscal?.numero}</h3>
              <button onClick={() => setModalNf(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Chave de Acesso (44 Dígitos):</span>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px] select-all break-all text-slate-800">
                      {modalNf.nota_fiscal?.chave_acesso}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block font-medium">Número / Série:</span>
                      <strong className="text-slate-800 font-mono text-xs">{modalNf.nota_fiscal?.numero} / Série {modalNf.nota_fiscal?.serie}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Data de Emissão:</span>
                      <strong className="text-slate-800 font-mono text-xs">{modalNf.nota_fiscal?.data_emissao}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block font-medium">Lote de Produção:</span>
                      <strong className="text-emerald-900 font-mono text-xs">{modalNf.lote_producao || 'Lote Padrão'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Vencimento:</span>
                      <strong className="text-slate-800 font-mono text-xs">{modalNf.data_vencimento ? formatarDataBR(modalNf.data_vencimento) : '2 anos'}</strong>
                    </div>
                  </div>

                  {modalNf.nota_fiscal?.arquivo_anexado && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs gap-2">
                      <div className="truncate">
                        <span className="text-slate-500 font-medium block text-[10px]">Arquivo Fiscal Guardado:</span>
                        <strong className="text-emerald-900 font-mono text-xs truncate block">{modalNf.nota_fiscal.arquivo_anexado}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBaixarArquivoFiscal(modalNf.nota_fiscal!)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs transition-colors"
                        title="Baixar ou visualizar arquivo fiscal arquivado"
                      >
                        Baixar Arquivo
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Total Faturado:</span>
                    <span className="font-mono font-black text-lg text-emerald-900">
                      {modalNf.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block mb-1">Itens da Carga Faturada</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {modalNf.itens.map((it, idx) => (
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
                <span>Imprimir Danfe</span>
              </button>

              <button
                onClick={() => {
                  handleConfirmarEntrega(modalNf.id, modalNf.numero_pedido);
                  setModalNf(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Programação de Entrega - {modalProgramar.numero_pedido}</h3>
              </div>
              <button onClick={() => setModalProgramar(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarProgramacao} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* Coluna 1: Dados do Pedido */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block mb-1">Dados da Carga</span>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Cliente:</span>
                    <strong className="text-slate-900 font-bold">{modalProgramar.cliente_nome}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Destino:</span>
                    <span className="text-slate-700 font-medium">{modalProgramar.cliente_cidade_uf}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 font-medium">Peso Total & Valor:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(modalProgramar.peso_total_kg / 1000).toLocaleString('pt-BR')} Ton • {modalProgramar.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Coluna 2: Formulário de Agendamento */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">Agendamento & Motorista</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Data da Programação <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={dataProgramadaInput}
                        onChange={(e) => setDataProgramadaInput(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Janela de Horário</label>
                      <select
                        value={janelaHorarioInput}
                        onChange={(e) => setJanelaHorarioInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                      >
                        <option value="Manhã (08:00 - 12:00)">Manhã (08:00 - 12:00)</option>
                        <option value="Tarde (13:00 - 17:00)">Tarde (13:00 - 17:00)</option>
                        <option value="Comercial (08:00 - 18:00)">Comercial (08:00 - 18:00)</option>
                        <option value="Madrugada / Primeiro Horário">Madrugada / Primeiro Horário</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transportadora Responsável</label>
                    <input
                      type="text"
                      value={transportadoraEntregaInput}
                      onChange={(e) => setTransportadoraEntregaInput(e.target.value)}
                      placeholder="Transportadora ou Frota Própria"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome do Motorista</label>
                      <input
                        type="text"
                        value={motoristaEntregaInput}
                        onChange={(e) => setMotoristaEntregaInput(e.target.value)}
                        placeholder="Motorista"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Placa do Veículo / Carreta</label>
                      <input
                        type="text"
                        value={placaEntregaInput}
                        onChange={(e) => setPlacaEntregaInput(e.target.value.toUpperCase())}
                        placeholder="ABC-1D23"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold uppercase focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalProgramar(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
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
