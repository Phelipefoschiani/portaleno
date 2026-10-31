import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Plus,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  PieChart,
  HardHat
} from 'lucide-react';
import {
  CaixaInvestimento,
  carregarCaixaInvestimento,
  salvarCaixaInvestimento,
  formatarMoeda,
  numeroSeguro
} from '../../data/financeiroData';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroCaixaInvestimento({ onNavigate }: Props) {
  const [caixa, setCaixa] = useState<CaixaInvestimento>(() => carregarCaixaInvestimento());
  const [modalNovoInvest, setModalNovoInvest] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);

  // Form para novo projeto de investimento
  const [formInvest, setFormInvest] = useState({
    titulo: '',
    valor: '',
    categoria: 'Modernização de Maquinário',
    data: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    status: 'PLANEJADO' as 'CONCLUIDO' | 'EM_ANDAMENTO' | 'PLANEJADO'
  });

  // Form para transferência entre fundos
  const [formTransf, setFormTransf] = useState({
    origem: 'saldo_disponivel_industrial' as 'saldo_disponivel_industrial' | 'fundo_reserva_safra' | 'fundo_modernizacao_maquinario',
    destino: 'fundo_reserva_safra' as 'saldo_disponivel_industrial' | 'fundo_reserva_safra' | 'fundo_modernizacao_maquinario',
    valor: ''
  });

  useEffect(() => {
    const handleUpdate = () => {
      setCaixa(carregarCaixaInvestimento());
    };
    handleUpdate();
    window.addEventListener('financeiro_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    return () => {
      window.removeEventListener('financeiro_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  const totalPatrimonioLiquido =
    numeroSeguro(caixa.saldo_disponivel_industrial) +
    numeroSeguro(caixa.fundo_reserva_safra) +
    numeroSeguro(caixa.fundo_modernizacao_maquinario);

  const handleSalvarInvestimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvest.titulo || !formInvest.valor) return;

    const novoProjeto = {
      id: `inv_${Date.now()}`,
      data: formInvest.data,
      titulo: formInvest.titulo,
      valor: numeroSeguro(formInvest.valor),
      categoria: formInvest.categoria,
      status: formInvest.status
    };

    const atualizado: CaixaInvestimento = {
      ...caixa,
      investimentos_recentes: [novoProjeto, ...caixa.investimentos_recentes]
    };

    setCaixa(atualizado);
    salvarCaixaInvestimento(atualizado);
    setModalNovoInvest(false);
    setFormInvest({
      titulo: '',
      valor: '',
      categoria: 'Modernização de Maquinário',
      data: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      status: 'PLANEJADO'
    });
  };

  const handleEfetuarTransferencia = (e: React.FormEvent) => {
    e.preventDefault();
    const v = numeroSeguro(formTransf.valor);
    if (!v || v <= 0) return;
    if (formTransf.origem === formTransf.destino) {
      alert('Origem e destino devem ser diferentes.');
      return;
    }

    if (caixa[formTransf.origem] < v) {
      alert('Saldo insuficiente na conta de origem selecionada.');
      return;
    }

    const atualizado: CaixaInvestimento = {
      ...caixa,
      [formTransf.origem]: caixa[formTransf.origem] - v,
      [formTransf.destino]: caixa[formTransf.destino] + v
    };

    setCaixa(atualizado);
    salvarCaixaInvestimento(atualizado);
    setModalTransferencia(false);
    setFormTransf({
      origem: 'saldo_disponivel_industrial',
      destino: 'fundo_reserva_safra',
      valor: ''
    });
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO FINANCEIRO */}
      <FinanceiroNavTabs activeTab="financeiro_caixa_investimento" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Caixa, Reservas de Safra & Investimentos</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                Patrimônio R$ {(totalPatrimonioLiquido / 1000000).toFixed(2)}M
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalTransferencia(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Manejo entre Fundos</span>
            </button>

            <button
              onClick={() => setModalNovoInvest(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Projeto de Aporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CARDS DE FUNDOS DE CAIXA E RESERVA */}
      <div className="p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Caixa Operacional */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Caixa Operacional Industrial
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-3">
              {formatarMoeda(caixa.saldo_disponivel_industrial)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center justify-between pt-3 border-t border-slate-100">
              <span>Liquidez imediata (D+0)</span>
              <span className="font-semibold text-emerald-700">Contas Movimento</span>
            </div>
          </div>

          {/* Card 2: Fundo de Safra */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Reserva Financeira de Safra
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-950 font-mono mt-3">
              {formatarMoeda(caixa.fundo_reserva_safra)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center justify-between pt-3 border-t border-slate-100">
              <span>Garantia de compra à vista</span>
              <span className="font-semibold text-amber-700">Pico de Moagem</span>
            </div>
          </div>

          {/* Card 3: Modernização de Maquinário */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Fundo de Modernização & CAPEX
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-950 font-mono mt-3">
              {formatarMoeda(caixa.fundo_modernizacao_maquinario)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center justify-between pt-3 border-t border-slate-100">
              <span>Rendimento mensal:</span>
              <span className="font-mono font-bold text-blue-700">
                + {formatarMoeda(caixa.rendimento_mensal_estimado)}/mês
              </span>
            </div>
          </div>

        </div>

        {/* 4. TABELA DE PROJETOS DE INVESTIMENTO & MELHORIAS FABRIS */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Projetos Fabris de Investimento & Aquisição de Bens de Capital
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhamento de expansão fabril, caldeiras, centrífugas e automação da fecularia.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {caixa.investimentos_recentes.length} projetos
            </span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Período / Cronograma</th>
                <th className="py-3 px-4">Projeto / Benfeitoria Industrial</th>
                <th className="py-3 px-4">Categoria de Engenharia</th>
                <th className="py-3 px-4">Aporte Estimado</th>
                <th className="py-3 px-6 text-right">Status do Projeto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {caixa.investimentos_recentes.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-semibold text-slate-700">
                    {inv.data}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {inv.titulo}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {inv.categoria}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                    {formatarMoeda(inv.valor)}
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      inv.status === 'CONCLUIDO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.status === 'EM_ANDAMENTO'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        inv.status === 'CONCLUIDO'
                          ? 'bg-emerald-500'
                          : inv.status === 'EM_ANDAMENTO'
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}></span>
                      {inv.status === 'CONCLUIDO' ? 'Concluído' : inv.status === 'EM_ANDAMENTO' ? 'Em Execução' : 'Planejado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO PROJETO DE INVESTIMENTO (AMPLO E HORIZONTAL) */}
      {modalNovoInvest && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Novo Projeto de Investimento Industrial (CAPEX)
                  </h3>
                  <p className="text-[11px] text-slate-400">Expansão fabril, caldeiras, secadores, automação e sustentabilidade</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoInvest(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarInvestimento} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Título do Projeto de Investimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formInvest.titulo}
                    onChange={(e) => setFormInvest({ ...formInvest, titulo: e.target.value })}
                    placeholder="Ex: Aquisição de Secador Flash Dryer Adicional 20 Ton/h"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Valor Estimado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formInvest.valor}
                    onChange={(e) => setFormInvest({ ...formInvest, valor: e.target.value })}
                    placeholder="150000.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cronograma / Período
                  </label>
                  <input
                    type="text"
                    value={formInvest.data}
                    onChange={(e) => setFormInvest({ ...formInvest, data: e.target.value })}
                    placeholder="Ex: Abril/2026"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Categoria Técnica
                  </label>
                  <select
                    value={formInvest.categoria}
                    onChange={(e) => setFormInvest({ ...formInvest, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer"
                  >
                    <option value="Modernização de Maquinário">Modernização de Maquinário</option>
                    <option value="Eficiência Energética & Vapor">Eficiência Energética & Vapor</option>
                    <option value="Automação Fabril & Pesagem">Automação Fabril & Pesagem</option>
                    <option value="Energia Solar Renovável">Energia Solar Renovável</option>
                    <option value="Armazenamento & Silos">Armazenamento & Silos</option>
                    <option value="Tratamento de Efluentes & Sustentabilidade">Tratamento de Efluentes</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Status Inicial da Execução
                  </label>
                  <select
                    value={formInvest.status}
                    onChange={(e) => setFormInvest({ ...formInvest, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer"
                  >
                    <option value="PLANEJADO">Planejado</option>
                    <option value="EM_ANDAMENTO">Em Execução</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoInvest(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer shadow-sm transition-all"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANEJO / TRANSFERÊNCIA ENTRE FUNDOS (AMPLO E HORIZONTAL) */}
      {modalTransferencia && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl sm:max-w-4xl w-full overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Transferência & Manejo entre Fundos de Caixa
                  </h3>
                  <p className="text-[11px] text-slate-400">Remanejamento interno de recursos financeiros</p>
                </div>
              </div>
              <button
                onClick={() => setModalTransferencia(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEfetuarTransferencia} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Origem do Recurso
                  </label>
                  <select
                    value={formTransf.origem}
                    onChange={(e) => setFormTransf({ ...formTransf, origem: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer"
                  >
                    <option value="saldo_disponivel_industrial">Caixa Industrial (Disp: {formatarMoeda(caixa.saldo_disponivel_industrial)})</option>
                    <option value="fundo_reserva_safra">Reserva de Safra (Disp: {formatarMoeda(caixa.fundo_reserva_safra)})</option>
                    <option value="fundo_modernizacao_maquinario">Modernização CAPEX (Disp: {formatarMoeda(caixa.fundo_modernizacao_maquinario)})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Destino do Recurso
                  </label>
                  <select
                    value={formTransf.destino}
                    onChange={(e) => setFormTransf({ ...formTransf, destino: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer"
                  >
                    <option value="fundo_reserva_safra">Reserva de Safra</option>
                    <option value="saldo_disponivel_industrial">Caixa Operacional Industrial</option>
                    <option value="fundo_modernizacao_maquinario">Modernização / CAPEX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Valor a Transferir (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formTransf.valor}
                    onChange={(e) => setFormTransf({ ...formTransf, valor: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalTransferencia(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer shadow-sm transition-all"
                >
                  Confirmar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
