import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Search,
  Copy,
  Check,
  Printer,
  Eye,
  X,
  FileText
} from 'lucide-react';
import {
  NotaFiscalSaida,
  carregarNotasSaida,
  formatarMoeda,
  numeroSeguro
} from '../../data/financeiroData';
import { formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroNotasSaida({ onNavigate }: Props) {
  const [notas, setNotas] = useState<NotaFiscalSaida[]>([]);
  const [busca, setBusca] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<NotaFiscalSaida | null>(null);

  // Lê do armazenamento e acompanha atualizações feitas em outras telas
  useEffect(() => {
    const recarregar = () =>
      setNotas([...carregarNotasSaida()].sort((a, b) => compararDatas(b.data_emissao, a.data_emissao)));
    recarregar();
    window.addEventListener('financeiro_updated', recarregar);
    window.addEventListener('sistema_reset_updated', recarregar);
    return () => {
      window.removeEventListener('financeiro_updated', recarregar);
      window.removeEventListener('sistema_reset_updated', recarregar);
    };
  }, []);

  const notasFiltradas = notas.filter(n =>
    String(n.numero || '').includes(busca) ||
    (n.cliente_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (n.chave_acesso || '').includes(busca) ||
    (n.cnpj_cpf || '').includes(busca)
  );

  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO FINANCEIRO */}
      <FinanceiroNavTabs activeTab="financeiro_notas_saida" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Notas Fiscais Eletrônicas de Saída (NF-e)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {notas.length} emitidas
              </span>
            </h1>
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
            placeholder="Buscar por NF-e, Cliente, Chave de Acesso..."
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
                <th className="py-3 px-5">Número / Série</th>
                <th className="py-3 px-4">Destinatário & CNPJ</th>
                <th className="py-3 px-4">Chave de Acesso</th>
                <th className="py-3 px-4">Emissão</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">SEFAZ</th>
                <th className="py-3 px-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {notasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma nota fiscal de saída encontrada.
                  </td>
                </tr>
              )}
              {notasFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                    NF-e {item.numero}
                    <div className="text-[10px] text-slate-400 font-normal">Série {item.serie}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.cliente_nome}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.cnpj_cpf}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600 truncate max-w-xs">{item.chave_acesso}</span>
                      <button
                        onClick={() => handleCopiarChave(item.chave_acesso, item.id)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copiar Chave de Acesso (44 Dígitos)"
                      >
                        {copiadoId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {formatarDataBR(item.data_emissao)}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {formatarMoeda(item.valor_total)}
                    <div className="text-[10px] text-slate-400 font-normal font-sans">
                      {(numeroSeguro(item.peso_liquido_kg) / 1000).toLocaleString('pt-BR')} Ton
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.status_sefaz && item.status_sefaz !== 'AUTORIZADA' ? (
                      <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        <span>{item.status_sefaz === 'CANCELADA' ? 'Cancelada' : 'Inutilizada'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>Autorizada</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => setModalVisualizar(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Ver Espelho Fiscal"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL ESPELHO DA NOTA FISCAL (AMPLO E HORIZONTAL) */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl sm:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Espelho Fiscal da Nota de Saída - NF-e Nº {modalVisualizar.numero}</h3>
              </div>
              <button onClick={() => setModalVisualizar(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">Chave de Acesso SEFAZ (44 Dígitos):</span>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] select-all break-all text-slate-800 font-semibold">
                      {modalVisualizar.chave_acesso}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block font-medium">Destinatário:</span>
                      <strong className="text-slate-900 font-bold text-sm">{modalVisualizar.cliente_nome}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Data de Emissão:</span>
                      <strong className="text-slate-800 font-mono text-sm">{formatarDataBR(modalVisualizar.data_emissao)}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between h-full space-y-3">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resumo Fiscal da Operação</span>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Status da NF-e:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">AUTORIZADA / TRANSMITIDA</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Natureza da Operação:</span>
                      <span className="font-medium text-slate-800">Venda de Produção do Estabelecimento</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-emerald-950 text-white rounded-xl shadow-xs">
                    <span className="font-bold text-emerald-200 text-xs">Valor Total da Nota:</span>
                    <span className="font-mono font-black text-lg text-white">
                      {formatarMoeda(modalVisualizar.valor_total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Imprimir DANFE</span>
              </button>

              <button
                onClick={() => setModalVisualizar(null)}
                className="px-5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
