import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Calendar,
  Building2,
  Trash2,
  X,
  Save
} from 'lucide-react';
import {
  TituloPagar,
  carregarTitulosPagar,
  salvarTitulosPagar,
  statusEfetivoPagar,
  dataNoMesAtual,
  somarValores,
  formatarMoeda,
  registrarBaixaNoCaixa
} from '../../data/financeiroData';
import { hojeISO, somarDias, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroAPagar({ onNavigate }: Props) {
  const [titulos, setTitulos] = useState<TituloPagar[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal Novo
  const [modalNovo, setModalNovo] = useState(false);
  const [formData, setFormData] = useState({
    numero_documento: '',
    favorecido_nome: '',
    tipo_favorecido: 'Agricultor' as TituloPagar['tipo_favorecido'],
    categoria: 'Mandioca / Matéria-Prima' as TituloPagar['categoria'],
    valor: 0,
    data_emissao: hojeISO(),
    data_vencimento: '',
    forma_pagamento: 'PIX',
    chave_pix: '',
    observacoes: ''
  });

  // Status VENCIDO é calculado na exibição (não pago + vencimento anterior a hoje)
  const recarregar = () => {
    const lista = carregarTitulosPagar()
      .map(t => ({ ...t, status: statusEfetivoPagar(t) }))
      .sort((a, b) => compararDatas(a.data_vencimento, b.data_vencimento));
    setTitulos(lista);
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('financeiro_updated', handleUpdate);
    return () => window.removeEventListener('financeiro_updated', handleUpdate);
  }, []);

  const metricas = useMemo(() => {
    const pendentes = titulos.filter(t => t.status !== 'PAGO');
    const aPagar = somarValores(pendentes, t => t.valor);
    const pagoMes = somarValores(
      titulos.filter(t => t.status === 'PAGO' && dataNoMesAtual(t.data_pagamento)),
      t => t.valor
    );
    const qtdAPagar = pendentes.length;
    const qtdVencidos = titulos.filter(t => t.status === 'VENCIDO').length;

    return { aPagar, pagoMes, qtdAPagar, qtdVencidos };
  }, [titulos]);

  const titulosFiltrados = useMemo(() => {
    return titulos.filter(t => {
      const match =
        (t.favorecido_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (t.numero_documento || '').toLowerCase().includes(busca.toLowerCase()) ||
        (t.categoria || '').toLowerCase().includes(busca.toLowerCase());

      if (!match) return false;
      if (filtroStatus !== 'TODOS' && t.status !== filtroStatus) return false;
      return true;
    });
  }, [titulos, busca, filtroStatus]);

  const handlePagarTitulo = (id: string, doc: string) => {
    if (confirm(`Confirmar liquidação do pagamento ${doc}?`)) {
      // Atualiza a partir do armazenamento (sem gravar o status calculado de exibição)
      const armazenados = carregarTitulosPagar();
      const alvo = armazenados.find(t => t.id === id);
      if (!alvo || alvo.status === 'PAGO') return;
      const atualizados: TituloPagar[] = armazenados.map(t =>
        t.id === id ? { ...t, status: 'PAGO' as const, data_pagamento: hojeISO() } : t
      );
      salvarTitulosPagar(atualizados);
      // Saída do caixa (uma única vez por título)
      registrarBaixaNoCaixa(`pagar:${id}`, -alvo.valor);
    }
  };

  const handleCopiarPix = (pix: string, id: string) => {
    navigator.clipboard.writeText(pix);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formData.valor > 0)) {
      alert('Informe um valor maior que zero.');
      return;
    }
    const novo: TituloPagar = {
      id: `pag_${Date.now()}`,
      ...formData,
      data_emissao: paraISO(formData.data_emissao) || hojeISO(),
      data_vencimento: paraISO(formData.data_vencimento),
      status: 'A_PAGAR'
    };
    salvarTitulosPagar([novo, ...carregarTitulosPagar()]);
    setModalNovo(false);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO FINANCEIRO */}
      <FinanceiroNavTabs activeTab="financeiro_a_pagar" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Contas a Pagar</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {metricas.qtdAPagar} pendentes
              </span>
              {metricas.qtdVencidos > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 font-mono">
                  {metricas.qtdVencidos} vencidos
                </span>
              )}
            </h1>
          </div>

          <button
            onClick={() => {
              setFormData({
                numero_documento: `PAG-${Math.floor(1000 + Math.random() * 9000)}`,
                favorecido_nome: '',
                tipo_favorecido: 'Agricultor',
                categoria: 'Mandioca / Matéria-Prima',
                valor: 0,
                data_emissao: hojeISO(),
                data_vencimento: somarDias(hojeISO(), 7),
                forma_pagamento: 'PIX',
                chave_pix: '',
                observacoes: ''
              });
              setModalNovo(true);
            }}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl
              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
              shadow-xs transition-all cursor-pointer
            "
          >
            <Plus className="w-4 h-4" />
            <span>Novo Título a Pagar</span>
          </button>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Total a Liquidar:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {formatarMoeda(metricas.aPagar)}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Pago no Mês:</span>
            <span className="font-mono font-bold text-emerald-700">
              {formatarMoeda(metricas.pagoMes)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Favorecido, Documento ou Categoria..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="A_PAGAR">A Pagar</option>
          <option value="VENCIDO">Vencidos</option>
          <option value="PAGO">Pagos / Liquidados</option>
        </select>
      </div>

      {/* 4. TABELA LIMPA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Favorecido & Documento</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Valor a Pagar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {titulosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum título a pagar encontrado.
                  </td>
                </tr>
              ) : (
                titulosFiltrados.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{item.favorecido_nome}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.numero_documento} • {item.tipo_favorecido}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.categoria}
                        {item.chave_pix && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                              PIX: {item.chave_pix}
                            </span>
                            <button
                              onClick={() => handleCopiarPix(item.chave_pix!, item.id)}
                              className="p-0.5 hover:text-slate-900 text-slate-400 cursor-pointer"
                              title="Copiar Chave PIX"
                            >
                              {copiadoId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-800">{formatarDataBR(item.data_vencimento)}</div>
                        <div className="text-[10px] text-slate-400 font-sans">Emitido em {formatarDataBR(item.data_emissao)}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        {formatarMoeda(item.valor)}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === 'PAGO' ? (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span className="font-medium">Pago</span>
                          </div>
                        ) : item.status === 'VENCIDO' ? (
                          <div className="flex items-center gap-1.5 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            <span className="font-medium">Vencido</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="font-medium">Aguardando Pagamento</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {item.status !== 'PAGO' ? (
                          <button
                            onClick={() => handlePagarTitulo(item.id, item.numero_documento)}
                            className="
                              inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
                              shadow-2xs transition-colors cursor-pointer
                            "
                            title="Confirmar Pagamento Realizado"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Confirmar Pagamento</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Pago em {formatarDataBR(item.data_pagamento)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL NOVO TÍTULO A PAGAR (AMPLO E HORIZONTAL) */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl sm:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Lançar Título a Pagar</h3>
                  <p className="text-[11px] text-slate-400">Contas a pagar e obrigações com parceiros</p>
                </div>
              </div>
              <button onClick={() => setModalNovo(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovo} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nº Documento / Pedido</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_documento}
                    onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                    placeholder="Ex: NF 1042 / PED-982"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor do Título (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.valor || ''}
                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Favorecido (Agricultor ou Fornecedor)</label>
                  <input
                    type="text"
                    required
                    value={formData.favorecido_nome}
                    onChange={(e) => setFormData({ ...formData, favorecido_nome: e.target.value })}
                    placeholder="Nome do produtor rural ou razão social da empresa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria de Custo</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                    <option value="Lenha & Biomassa">Lenha & Biomassa</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Energia / Concessionárias">Energia / Concessionárias</option>
                    <option value="Manutenção Mecânica">Manutenção Mecânica</option>
                    <option value="Fretes">Fretes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={paraISO(formData.data_vencimento)}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <input
                    type="text"
                    value={formData.forma_pagamento}
                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                    placeholder="Boleto Bancário / TED / PIX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chave PIX (Opcional)</label>
                  <input
                    type="text"
                    value={formData.chave_pix}
                    onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                    placeholder="CNPJ, CPF, Telefone ou E-mail"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Gravar Título</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
