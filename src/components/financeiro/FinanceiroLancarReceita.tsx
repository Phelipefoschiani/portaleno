import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Calendar,
  Building2,
  Trash2,
  X,
  CheckCircle2,
  Sparkles,
  PieChart,
  Wallet
} from 'lucide-react';
import {
  LancamentoReceita,
  carregarReceitasExtras,
  salvarReceitasExtras,
  somarValores,
  formatarMoeda,
  registrarBaixaNoCaixa,
  estornarBaixaNoCaixa
} from '../../data/financeiroData';
import { hojeISO, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

const ORIGENS_RECEITA = [
  'Venda de Resíduo/Bagaço Úmido',
  'Venda de Cascas/Destopo',
  'Rendimento de Aplicação Financeira',
  'Bonificação/Reembolso',
  'Outras Receitas'
] as const;

export function FinanceiroLancarReceita({ onNavigate }: Props) {
  const ordenar = (lista: LancamentoReceita[]) => [...lista].sort((a, b) => compararDatas(b.data, a.data));
  const [receitas, setReceitas] = useState<LancamentoReceita[]>(() => ordenar(carregarReceitasExtras()));
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS');
  const [modalNovo, setModalNovo] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    data: hojeISO(),
    origem: 'Venda de Resíduo/Bagaço Úmido' as typeof ORIGENS_RECEITA[number],
    comprador_origem: '',
    descricao: '',
    valor: '',
    conta_creditada: '',
    forma_recebimento: ''
  });

  useEffect(() => {
    const handleUpdate = () => {
      setReceitas(ordenar(carregarReceitasExtras()));
    };
    handleUpdate();
    window.addEventListener('financeiro_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    return () => {
      window.removeEventListener('financeiro_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  const receitasFiltradas = receitas.filter((item) => {
    const matchBusca =
      (item.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      (item.comprador_origem || '').toLowerCase().includes(busca.toLowerCase()) ||
      (item.conta_creditada || '').toLowerCase().includes(busca.toLowerCase());
    const matchOrigem = filtroOrigem === 'TODAS' || item.origem === filtroOrigem;
    return matchBusca && matchOrigem;
  });

  // Métricas
  const totalReceitas = somarValores(receitas, r => r.valor);
  const receitasSubprodutos = somarValores(
    receitas.filter((r) => (r.origem || '').includes('Bagaço') || (r.origem || '').includes('Cascas')),
    r => r.valor
  );
  const rendimentosAplicacoes = somarValores(
    receitas.filter((r) => (r.origem || '').includes('Aplicação')),
    r => r.valor
  );

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.comprador_origem || !formData.valor) return;
    const valor = parseFloat(String(formData.valor).replace(',', '.')) || 0;
    if (valor <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    const novoLancamento: LancamentoReceita = {
      id: `rec_extra_${Date.now()}`,
      data: paraISO(formData.data) || hojeISO(),
      origem: formData.origem,
      comprador_origem: formData.comprador_origem,
      descricao: formData.descricao || `${formData.origem} - ${formData.comprador_origem}`,
      valor,
      conta_creditada: formData.conta_creditada,
      forma_recebimento: formData.forma_recebimento
    };

    const atualizadas = [novoLancamento, ...carregarReceitasExtras()];
    setReceitas(ordenar(atualizadas));
    salvarReceitasExtras(atualizadas);
    // Receita lançada já foi recebida: entra no caixa uma única vez
    registrarBaixaNoCaixa(`receita:${novoLancamento.id}`, novoLancamento.valor, { descricao: novoLancamento.descricao, data: novoLancamento.data });
    setModalNovo(false);
    setFormData({
      data: hojeISO(),
      origem: 'Venda de Resíduo/Bagaço Úmido',
      comprador_origem: '',
      descricao: '',
      valor: '',
      conta_creditada: '',
      forma_recebimento: ''
    });
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente estornar este lançamento de receita?')) {
      const atualizadas = carregarReceitasExtras().filter((r) => r.id !== id);
      setReceitas(ordenar(atualizadas));
      salvarReceitasExtras(atualizadas);
      // Estorno: retira do caixa o que esta receita havia somado
      estornarBaixaNoCaixa(`receita:${id}`);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO FINANCEIRO */}
      <FinanceiroNavTabs activeTab="financeiro_lancar_receita" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Lançamento de Receitas & Subprodutos</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                {receitas.length} entradas
              </span>
            </h1>
          </div>

          <button
            onClick={() => setModalNovo(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar Nova Receita</span>
          </button>
        </div>

        {/* 3. BARRA HORIZONTAL DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Receitas Extras</div>
              <div className="text-sm font-black text-emerald-900 font-mono">
                {formatarMoeda(totalReceitas)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subprodutos (Bagaço / Cascas)</div>
              <div className="text-sm font-black text-amber-900 font-mono">
                {formatarMoeda(receitasSubprodutos)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <TrendingUp className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rendimentos Financeiros</div>
              <div className="text-sm font-black text-blue-900 font-mono">
                {formatarMoeda(rendimentosAplicacoes)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BARRA DE BUSCA E FILTROS */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição, comprador ou conta..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
          <span className="text-slate-500 font-semibold text-[11px] mr-1">Origem:</span>
          {['TODAS', ...ORIGENS_RECEITA].map((origem) => (
            <button
              key={origem}
              onClick={() => setFiltroOrigem(origem)}
              className={`px-2.5 py-1 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                filtroOrigem === origem
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {origem === 'TODAS' ? 'Todas as Fontes' : origem}
            </button>
          ))}
        </div>
      </div>

      {/* 5. TABELA LIMPA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Data</th>
                <th className="py-3 px-4">Origem / Categoria</th>
                <th className="py-3 px-4">Pagador / Destino</th>
                <th className="py-3 px-4">Descrição do Lançamento</th>
                <th className="py-3 px-4">Conta Creditada & Forma</th>
                <th className="py-3 px-4 text-right">Valor Líquido</th>
                <th className="py-3 px-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {receitasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum lançamento de receita encontrado.
                  </td>
                </tr>
              ) : (
                receitasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {formatarDataBR(item.data)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.origem.includes('Bagaço')
                          ? 'bg-amber-100 text-amber-900 border border-amber-200/60'
                          : item.origem.includes('Cascas')
                          ? 'bg-orange-100 text-orange-900 border border-orange-200/60'
                          : item.origem.includes('Aplicação')
                          ? 'bg-blue-100 text-blue-900 border border-blue-200/60'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200/60'
                      }`}>
                        {item.origem}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.comprador_origem}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium max-w-xs truncate">
                      {item.descricao}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{item.conta_creditada}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{item.forma_recebimento}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                      + {formatarMoeda(item.valor)}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleExcluir(item.id)}
                        title="Estornar lançamento"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO LANÇAMENTO DE RECEITA (AMPLO E HORIZONTAL) */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Lançar Nova Receita / Subproduto
                  </h3>
                  <p className="text-[11px] text-slate-400">Venda de fécula, farinha, bagaço úmido, casca ou receitas financeiras</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovo(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Data do Recebimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={paraISO(formData.data)}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Origem / Categoria *
                  </label>
                  <select
                    value={formData.origem}
                    onChange={(e) => setFormData({ ...formData, origem: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer"
                  >
                    {ORIGENS_RECEITA.map((orig) => (
                      <option key={orig} value={orig}>{orig}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Valor Recebido (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Forma de Recebimento
                  </label>
                  <select
                    value={formData.forma_recebimento}
                    onChange={(e) => setFormData({ ...formData, forma_recebimento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer font-medium"
                  >
                    <option value="PIX à Vista">PIX à Vista</option>
                    <option value="Transferência TED">Transferência TED</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Depósito em Dinheiro">Depósito em Dinheiro</option>
                    <option value="Crédito em Conta">Crédito em Conta</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Comprador / Pagador / Fonte *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.comprador_origem}
                    onChange={(e) => setFormData({ ...formData, comprador_origem: e.target.value })}
                    placeholder="Ex: Confinamento Santa Luzia (Gado de Corte)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Conta Bancária Creditada
                  </label>
                  <select
                    value={formData.conta_creditada}
                    onChange={(e) => setFormData({ ...formData, conta_creditada: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer font-medium"
                  >
                    <option value="Banco do Brasil - Conta Movimento">Banco do Brasil - Conta Movimento (Ag. 0048 / CC 18492-1)</option>
                    <option value="Itaú Unibanco - Conta Giro">Itaú Unibanco - Conta Giro (Ag. 1892 / CC 09123-5)</option>
                    <option value="Sicoob Agro - Cooperativa">Sicoob Agro - Cooperativa (Ag. 4310 / CC 33019-9)</option>
                    <option value="Conta Aplicação Automática">Conta Aplicação Automática (Liquidez Diária)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Descrição dos Itens / Tonelagem / Detalhes
                  </label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: 24 Ton de bagaço úmido prensado carregado a granel"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
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
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer shadow-sm transition-all"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
