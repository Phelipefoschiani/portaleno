import React, { useState } from "react";
import { useGlobalState } from "../GlobalStateContext";
import { 
  TrendingUp, 
  Target, 
  MapPin, 
  Calendar, 
  Users, 
  User as UserIcon, 
  DollarSign, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle,
  AlertTriangle,
  Award,
  Plus,
  Edit2,
  Settings,
  X
} from "lucide-react";
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface ObjetivoProps {
  empresa?: string;
}

const Objetivo: React.FC<ObjetivoProps> = ({ empresa }) => {
  const { 
    pedidos, 
    usuarios, 
    clientes,
    objetivosEmpresa, 
    metasRepresentantes, 
    saveObjetivoEmpresa, 
    saveMetaRepresentante 
  } = useGlobalState();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-indexed

  // Local editing states
  const [isEditingCompanyGoal, setIsEditingCompanyGoal] = useState<boolean>(false);
  const [companyGoalInput, setCompanyGoalInput] = useState<string>("");

  const [editingRepresentativeId, setEditingRepresentativeId] = useState<string | null>(null);
  const [representativeGoalInput, setRepresentativeGoalInput] = useState<string>("");

  // Representative expansion detail state
  const [selectedRepDetailsId, setSelectedRepDetailsId] = useState<string | null>(null);

  // --- NEW YEAR CONFIGURATION MODAL STATES ---
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configYear, setConfigYear] = useState<number>(selectedYear);
  const [expandedMonthConfig, setExpandedMonthConfig] = useState<number | null>(null);

  // Draft configurations for the modal
  const [draftCompanyGoals, setDraftCompanyGoals] = useState<Record<number, number>>({});
  const [draftRepGoals, setDraftRepGoals] = useState<Record<number, Record<string, number>>>({}); // { monthNum: { repId: valor } }

  // Check if a representative was already registered in a given period
  const isRepActiveInMonthAndYear = (rep: typeof usuarios[0], m: number, y: number) => {
    if (rep.perfil !== "representante" || !rep.ativo) return false;
    if (!rep.data_cadastro) return true;
    const [regAno, regMes] = rep.data_cadastro.split("-").map(Number);
    if (y > regAno) return true;
    if (y < regAno) return false;
    return m >= regMes;
  };

  // Realignment checking helper
  const checkNeedRealignForMonth = (m: number, y: number) => {
    const obj = objetivosEmpresa.find((o) => o.ano === y && o.mes === m);
    const companyGoal = obj ? obj.valor : 0;
    if (companyGoal === 0) return false;

    // Active reps in that exact month/year
    const activeReps = usuarios.filter((u) => isRepActiveInMonthAndYear(u, m, y));
    if (activeReps.length === 0) return false;

    let sumRepMetas = 0;
    let hasRepWithZeroMeta = false;

    for (const rep of activeReps) {
      const rMetaObj = metasRepresentantes.find(
        (met) => met.representante_id === rep.id && met.ano === y && met.mes === m
      );
      const val = rMetaObj ? rMetaObj.valor : 0;
      sumRepMetas += val;
      if (val === 0) {
        hasRepWithZeroMeta = true;
      }
    }

    return hasRepWithZeroMeta || Math.round(sumRepMetas) !== Math.round(companyGoal);
  };

  // Check from May 2026 (or current block date) onwards for year 2026
  let hasRealignForwardNeeded = false;
  if (empresa === "estancia") {
    for (let m = 5; m <= 12; m++) {
      if (checkNeedRealignForMonth(m, 2026)) {
        hasRealignForwardNeeded = true;
        break;
      }
    }
  }

  // Initialize modal local draft states
  const initializeDrafts = (year: number) => {
    const companyDrafts: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      const obj = objetivosEmpresa.find(o => o.ano === year && o.mes === m);
      companyDrafts[m] = obj ? obj.valor : 0;
    }
    setDraftCompanyGoals(companyDrafts);

    const repDrafts: Record<number, Record<string, number>> = {};
    for (let m = 1; m <= 12; m++) {
      repDrafts[m] = {};
      const activeReps = usuarios.filter(u => isRepActiveInMonthAndYear(u, m, year));
      for (const rep of activeReps) {
        const rMeta = metasRepresentantes.find(me => me.representante_id === rep.id && me.ano === year && me.mes === m);
        repDrafts[m][rep.id] = rMeta ? rMeta.valor : 0;
      }
    }
    setDraftRepGoals(repDrafts);
  };

  React.useEffect(() => {
    if (isConfigModalOpen) {
      initializeDrafts(configYear);
    }
  }, [isConfigModalOpen, configYear, objetivosEmpresa, metasRepresentantes]);

  const handleAutoSplit = (m: number) => {
    const monthlyGoal = draftCompanyGoals[m] || 0;
    const activeReps = usuarios.filter((u) => isRepActiveInMonthAndYear(u, m, configYear));
    if (activeReps.length === 0) return;

    const equalShare = Math.round((monthlyGoal / activeReps.length) * 100) / 100;

    setDraftRepGoals((prev) => {
      const updatedMonth = { ...prev[m] };
      for (const rep of activeReps) {
        updatedMonth[rep.id] = equalShare;
      }
      return {
        ...prev,
        [m]: updatedMonth,
      };
    });
  };

  const handleSaveAllConfig = () => {
    for (let m = 1; m <= 12; m++) {
      const val = draftCompanyGoals[m] || 0;
      saveObjetivoEmpresa(configYear, m, val);
    }

    for (let m = 1; m <= 12; m++) {
      const repsObj = draftRepGoals[m] || {};
      Object.entries(repsObj).forEach(([repId, val]) => {
        saveMetaRepresentante(configYear, m, repId, val as number);
      });
    }

    setIsConfigModalOpen(false);
  };

  if (empresa !== "estancia") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Target size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Empresa em Configuração</h2>
        <p className="text-gray-500 max-w-md font-medium">
          O painel de objetivos para esta empresa será configurado em breve. Atualmente, disponível para Estância Nova Olinda.
        </p>
      </div>
    );
  }

  // List of active representatives during the selected Month and Year
  const representantes = usuarios.filter(u => isRepActiveInMonthAndYear(u, selectedMonth, selectedYear));

  // Filter orders by year and month that are "Faturado"
  const getOrdersInMonthYear = (m: number, y: number) => {
    return pedidos.filter(p => {
      if (p.status !== "Faturado") return false;
      const d = new Date(p.data_faturamento || p.data);
      return (d.getMonth() + 1 === m) && (d.getFullYear() === y);
    });
  };

  // Monthly values for chart (all 12 months of selected Year)
  const chartData = MONTHS_NAMES.map((name, index) => {
    const monthNum = index + 1;
    const orders = getOrdersInMonthYear(monthNum, selectedYear);
    const faturamentoTotal = orders.reduce((acc, p) => acc + (p.nf_valor_total || p.valor_total || 0), 0);
    
    // Find objective
    const obj = objetivosEmpresa.find(o => o.ano === selectedYear && o.mes === monthNum);
    const objetivo = obj ? obj.valor : 0;

    return {
      name,
      faturamento: Math.round(faturamentoTotal),
      objetivo: Math.round(objetivo)
    };
  });

  // Current selected month company goal
  const currentCompanyGoalObj = objetivosEmpresa.find(o => o.ano === selectedYear && o.mes === selectedMonth);
  const currentCompanyGoal = currentCompanyGoalObj ? currentCompanyGoalObj.valor : 0; // default standard

  // Current selected month actual sales
  const currentOrders = getOrdersInMonthYear(selectedMonth, selectedYear);
  const currentFaturamento = currentOrders.reduce((acc, p) => acc + (p.nf_valor_total || p.valor_total || 0), 0);

  // Achievement % for company
  const companyAchievementPercent = currentCompanyGoal > 0 ? (currentFaturamento / currentCompanyGoal) * 100 : 0;

  // Handle saving company goal
  const handleSaveCompanyGoal = () => {
    const val = parseFloat(companyGoalInput.replace(/[^\d.-]/g, ''));
    if (!isNaN(val) && val >= 0) {
      saveObjetivoEmpresa(selectedYear, selectedMonth, val);
      setIsEditingCompanyGoal(false);
    }
  };

  // Handle saving representative goal
  const handleSaveRepGoal = (repId: string) => {
    const val = parseFloat(representativeGoalInput.replace(/[^\d.-]/g, ''));
    if (!isNaN(val) && val >= 0) {
      saveMetaRepresentante(selectedYear, selectedMonth, repId, val);
      setEditingRepresentativeId(null);
    }
  };

  // Get individual goal for representative
  const getRepGoal = (repId: string) => {
    const rGoal = metasRepresentantes.find(m => m.representante_id === repId && m.ano === selectedYear && m.mes === selectedMonth);
    return rGoal ? rGoal.valor : 0;
  };

  // Sum of representative goals
  const sumRepGoals = representantes.reduce((sum, r) => sum + getRepGoal(r.id), 0);

  // Representatives statistics rows
  const repsPerformance = representantes.map(r => {
    const meta = getRepGoal(r.id);
    // filter representative's faturado orders for selected month/year
    const repOrders = currentOrders.filter(p => p.representante_id === r.id);
    const faturado = repOrders.reduce((sum, p) => sum + (p.nf_valor_total || p.valor_total || 0), 0);
    const atingidoPercent = meta > 0 ? (faturado / meta) * 100 : 0;

    return {
      ...r,
      meta,
      faturado,
      atingidoPercent,
      ordersCount: repOrders.length
    };
  });

  // Details of sales for expanded representative
  const getDetailsForRep = (repId: string) => {
    const repOrders = currentOrders.filter(p => p.representante_id === repId);
    return repOrders.map(p => {
      const cli = clientes.find(c => c.id === p.cliente_id);
      return {
        id: p.id,
        cliente: cli ? cli.razao_social || cli.nome_fantasia : "Cliente não identificado",
        data: p.data_faturamento || p.data,
        valor: p.nf_valor_total || p.valor_total || 0
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-gray-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-indigo-50 px-3 py-1 rounded-full">
            Performance & Objetivos
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-2">
            Objetivos Mensais da Empresa
          </h2>
          <p className="text-gray-500 font-medium text-xs mt-1">
            Defina as metas faturamento global e distribua as quotas entre os representantes de venda homologados.
          </p>
        </div>

        {/* YEAR & MONTH SELECTOR & CONFIGURATION GEAR BUTTON */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
            <Calendar size={16} className="text-gray-400 ml-2" />
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setEditingRepresentativeId(null);
                setIsEditingCompanyGoal(false);
              }}
              className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer py-1"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>

            <span className="text-gray-300">|</span>

            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setEditingRepresentativeId(null);
                setIsEditingCompanyGoal(false);
              }}
              className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer py-1 pr-2"
            >
              {MONTHS_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setConfigYear(selectedYear);
              setIsConfigModalOpen(true);
            }}
            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition duration-200 flex items-center justify-center shadow-md relative group cursor-pointer"
            title="Configurar metas de meses e representantes"
          >
            <Settings size={18} className="transition-transform group-hover:rotate-45" />
            {hasRealignForwardNeeded && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-bounce" />
            )}
          </button>
        </div>
      </div>

      {hasRealignForwardNeeded && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-[28px] p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-2xs animate-fadeIn">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">
              Realinhamento de Quotas Recomendado
            </h4>
            <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
              O quadro de representantes comerciais possui alterações (Sônia Vendas iniciou atividades comerciais em <strong>maio de 2026</strong>). As metas faturamento para frente precisam ser revistas e distribuídas para que os relatórios e rateios permaneçam exatos. <strong>Clique na engrenagem no topo da tela</strong> para configurar.
            </p>
          </div>
        </div>
      )}

      {/* CHART DUAL-AXIS SUMMARY */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-50 pb-4">
          <div>
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider">
              Objetivo Empresa vs Faturamento ({selectedYear})
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              Comparativo das metas estipuladas e faturamento real liquidado mês a mês
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-indigo-600 rounded" />
              <span className="text-gray-500">Faturamento Realizado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-rose-500" />
              <span className="text-gray-500">Objetivo Lançado</span>
            </div>
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: "#6b7280", fontSize: 10, fontWeight: "bold" }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000) + "k" : val}`}
                tick={{ fill: "#6b7280", fontSize: 10, fontWeight: "bold" }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                formatter={(value: any) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
                contentStyle={{ borderRadius: "16px", borderColor: "#f3f4f6", fontSize: 11, fontWeight: "bold" }}
              />
              <Bar dataKey="faturamento" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={34} />
              <Line dataKey="objetivo" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KEY KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Company Goal KPI card */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-gray-400 text-[9px] font-black uppercase tracking-wider block">Objetivo Global do Mês</span>
              {isEditingCompanyGoal ? (
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="number"
                    value={companyGoalInput}
                    onChange={(e) => setCompanyGoalInput(e.target.value)}
                    placeholder="Ex: 80000"
                    className="bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-lg px-2 py-1 w-28 outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveCompanyGoal}
                    className="bg-indigo-600 text-white text-[10px] uppercase font-black px-2 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Gravar
                  </button>
                  <button
                    onClick={() => setIsEditingCompanyGoal(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-500 text-[10px] uppercase font-black px-2 py-1.5 rounded-lg transition"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-black text-gray-900 font-sans">
                    R$ {currentCompanyGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => {
                      setCompanyGoalInput(currentCompanyGoal.toString());
                      setIsEditingCompanyGoal(true);
                    }}
                    className="text-gray-450 hover:text-indigo-600 transition p-1"
                    title="Editar objetivo corporativo"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Target size={18} />
            </div>
          </div>
          <p className="text-[9px] text-gray-450 mt-4 font-bold">
            Configurado para {MONTHS_NAMES[selectedMonth - 1]} / {selectedYear}
          </p>
        </div>

        {/* Realized/Invoiced KPI */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-gray-450 text-[9px] font-black uppercase tracking-wider block">Faturamento Realizado</span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                R$ {currentFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-300" 
                style={{ width: `${Math.min(100, companyAchievementPercent)}%` }} 
              />
            </div>
            <span className="text-[10px] font-black text-emerald-700 min-w-[32px] text-right">
              {companyAchievementPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Splitting Ratio KPI */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-gray-450 text-[9px] font-black uppercase tracking-wider block">Cotas de Representantes</span>
              <span className="text-xl font-black text-gray-900 mt-1 block">
                R$ {sumRepGoals.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[9px] font-bold">
            <span className="text-gray-450">Distribuição:</span>
            {sumRepGoals === currentCompanyGoal ? (
              <span className="text-emerald-700 uppercase font-bold flex items-center gap-1">
                <CheckCircle size={10} /> 100% Rateado
              </span>
            ) : sumRepGoals > currentCompanyGoal ? (
              <span className="text-amber-650 uppercase font-black flex items-center gap-1">
                <AlertTriangle size={10} /> Superávit + R$ {(sumRepGoals - currentCompanyGoal).toLocaleString("pt-BR")}
              </span>
            ) : (
              <span className="text-blue-600 uppercase font-black">
                Pendente R$ {(currentCompanyGoal - sumRepGoals).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* METAS REPRESENTANTES RATEIO & PERFORMANCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Ratear / Editar quotas de cada representante */}
        <div className="lg:col-span-1 bg-white p-6 rounded-[28px] border border-gray-100 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">
              Planejamento de Quotas
            </h3>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
              Defina a meta individual de cada representante para o rateio do mês.
            </p>
          </div>

          <div className="space-y-3.5 divide-y divide-gray-50 pt-2">
            {repsPerformance.map((rep) => {
              const allocatedPct = currentCompanyGoal > 0 ? (rep.meta / currentCompanyGoal) * 100 : 0;
              const isEditingThisRep = editingRepresentativeId === rep.id;

              return (
                <div key={rep.id} className="pt-3.5 first:pt-0 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-800">{rep.nome}</span>
                    {isEditingThisRep ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={representativeGoalInput}
                          onChange={(e) => setRepresentativeGoalInput(e.target.value)}
                          placeholder="Meta (R$)"
                          className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-950 rounded px-1.5 py-0.5 w-20 outline-none focus:border-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRepGoal(rep.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] px-1.5 py-1 rounded font-black uppercase"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">
                          R$ {rep.meta.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                        </span>
                        <button
                          onClick={() => {
                            setRepresentativeGoalInput(rep.meta.toString());
                            setEditingRepresentativeId(rep.id);
                          }}
                          className="text-gray-400 hover:text-indigo-600 transition p-0.5"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Allocation percentage indicator bar */}
                  <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold">
                    <span>Participação da meta total</span>
                    <span>{allocatedPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-50 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${allocatedPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right columns: Realized breakdown chart/list which expands to detail sales */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[28px] border border-gray-100 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">
              Desempenho da Equipe Comercial
            </h3>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
              Acompanhamento real do alcance do objetivo lançado no período selecionado. Clique no representante para ver as vendas.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {repsPerformance.map((rep) => {
              const isDetailsOpen = selectedRepDetailsId === rep.id;
              const completedStatus = rep.atingidoPercent >= 100;
              const warningStatus = rep.atingidoPercent < 50;

              return (
                <div key={rep.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs transition duration-200">
                  {/* Accordion trigger line wrapper */}
                  <div 
                    onClick={() => setSelectedRepDetailsId(isDetailsOpen ? null : rep.id)}
                    className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/40 hover:bg-gray-50 cursor-pointer select-none transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl shadow-xs">
                        <UserIcon size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-900 block">{rep.nome}</span>
                        <div className="flex items-center gap-4 text-[9px] text-gray-400 font-bold mt-0.5">
                          <span>Objetivo: <strong className="text-gray-700">R$ {rep.meta.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</strong></span>
                          <span>In faturamento: <strong className="text-gray-700">R$ {rep.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex items-center gap-2">
                        {completedStatus ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <Award size={10} /> Meta superada
                          </span>
                        ) : warningStatus ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-rose-800 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                            Alerta de Baixo
                          </span>
                        ) : (
                          <span className="inline-block text-[9px] font-bold text-blue-650 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                            Em andamento
                          </span>
                        )}
                        <span className="text-xs font-black text-gray-900 font-mono">
                          {rep.atingidoPercent.toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="text-gray-350">
                        {isDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Progress gauge bar */}
                  <div className="bg-gray-100 h-1">
                    <div 
                      className={`h-full ${completedStatus ? 'bg-emerald-600' : warningStatus ? 'bg-red-500' : 'bg-blue-600'}`} 
                      style={{ width: `${Math.min(100, rep.atingidoPercent)}%` }}
                    />
                  </div>

                  {/* Accordion sales details list */}
                  {isDetailsOpen && (
                    <div className="bg-white p-4 border-t border-gray-100 animate-fadeIn text-[11px] space-y-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center pb-2 border-b border-gray-50">
                        <span>Clientes Faturados ({rep.ordersCount})</span>
                        <span>Total de Vendas: R$ {rep.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>

                      {rep.ordersCount > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-55 bg-gray-50/50">
                                <th className="py-2 px-2.5">Cliente</th>
                                <th className="py-2 px-2.5">Data Licenciada</th>
                                <th className="py-2 px-2.5 text-right">Valor Faturado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {getDetailsForRep(rep.id).map((ord, oidx) => (
                                <tr key={ord.id + "_" + oidx} className="hover:bg-gray-50/30">
                                  <td className="py-2 px-2.5 font-bold text-gray-800">{ord.cliente}</td>
                                  <td className="py-2 px-2.5 text-gray-500 font-medium">
                                    {new Date(ord.data).toLocaleDateString("pt-BR")}
                                  </td>
                                  <td className="py-2 px-2.5 text-right font-bold text-gray-950 font-sans">
                                    R$ {ord.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-400 py-3 text-center text-xs font-semibold">
                          Nenhuma venda faturada registrada para este representante no período de controle selecionado.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* --- YEAR CONFIGURATION AND PRO-RATA DIRECTIVES MODAL --- */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header of Modal */}
            <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  Gerenciador Anual de Metas
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2">
                  Planejar Metas & Ratear Quotas
                </h3>
                <p className="text-xs text-gray-450 font-semibold mt-1">
                  Configure o Objetivo Global da Empresa para cada mês do ano, e realize o rateio das cotas de vendas entre seus representantes ativos na respectiva data de vigência.
                </p>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition duration-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body of Modal */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
              {/* Year selection at top of modal */}
              <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/40">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-indigo-700 block">Ano de Exercício</span>
                  <span className="text-xs text-indigo-900 font-bold">Configure metas e rateios para o ano selecionado</span>
                </div>
                <select
                  value={configYear}
                  onChange={(e) => setConfigYear(Number(e.target.value))}
                  className="bg-white text-gray-800 text-xs font-black outline-none border border-indigo-200 rounded-xl px-4 py-2 cursor-pointer shadow-3xs focus:border-indigo-500"
                >
                  <option value={2025}>Exercício 2025</option>
                  <option value={2026}>Exercício 2026</option>
                  <option value={2027}>Exercício 2027</option>
                </select>
              </div>

              {/* List of 12 Months */}
              <div className="space-y-4">
                {MONTHS_NAMES.map((mName, idx) => {
                  const mNum = idx + 1;
                  const companyMonthGoal = (draftCompanyGoals[mNum] || 0) as number;
                  
                  // Active representatives in this month (Dynamic start date validation)
                  const repsInMonth = usuarios.filter((u) => isRepActiveInMonthAndYear(u, mNum, configYear));
                  
                  // Calculate sum of drafted representative goals
                  const monthRepGoalsMap = draftRepGoals[mNum] || {};
                  const repsMetaSum = Object.values(monthRepGoalsMap).reduce((sum: number, val: any) => sum + (val || 0), 0) as number;

                  const isExpanded = expandedMonthConfig === mNum;
                  
                  // Realignment status checking for month row
                  let isAligned = true;
                  let hasZeroMeta = false;
                  
                  if (companyMonthGoal > 0 && repsInMonth.length > 0) {
                    for (const rp of repsInMonth) {
                      if ((monthRepGoalsMap[rp.id] || 0) === 0) {
                        hasZeroMeta = true;
                      }
                    }
                    isAligned = !hasZeroMeta && Math.round(repsMetaSum) === Math.round(companyMonthGoal);
                  } else if (companyMonthGoal === 0) {
                    isAligned = true; 
                  }

                  return (
                    <div 
                      key={mNum} 
                      className={`border rounded-2xl transition duration-200 overflow-hidden ${
                        isAligned 
                          ? "border-gray-100 bg-white" 
                          : "border-amber-300/60 bg-amber-50/10 shadow-3xs"
                      }`}
                    >
                      {/* Month Header line */}
                      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isAligned ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                          <div>
                            <h4 className="text-xs font-black text-gray-800">{mName}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-gray-400">Rateio:</span>
                              {repsInMonth.length === 0 ? (
                                <span className="text-[9px] text-gray-400 font-bold uppercase">Sem representantes ativos</span>
                              ) : isAligned ? (
                                <span className="text-[9px] text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60">
                                  100% Rateado
                                </span>
                              ) : (
                                <span className="text-[9px] text-amber-700 font-extrabold uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                                  {hasZeroMeta ? "Cota com R$0" : "Rateio Desalinhado"}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-450 font-bold">
                                (R$ {repsMetaSum.toLocaleString("pt-BR")} de R$ {companyMonthGoal.toLocaleString("pt-BR")})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 text-gray-800 focus-within:border-indigo-500 focus-within:bg-white transition duration-150">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Meta (R$)</span>
                            <input
                              type="number"
                              value={companyMonthGoal === 0 ? "" : companyMonthGoal}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDraftCompanyGoals(prev => ({
                                  ...prev,
                                  [mNum]: val
                                }));
                              }}
                              placeholder="0,00"
                              className="bg-transparent font-black text-xs text-gray-900 outline-none w-24 text-right"
                            />
                          </div>

                          <button
                            onClick={() => setExpandedMonthConfig(isExpanded ? null : mNum)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1 cursor-pointer ${
                              isExpanded 
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200" 
                                : "bg-gray-100 text-gray-700 hover:bg-gray-250"
                            }`}
                          >
                            <span>Ratear</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Reps pro-rata split panel */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-gray-100 p-4 lg:p-6 space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-gray-100">
                            <div>
                              <h5 className="text-[10px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                                <Users size={12} className="text-gray-500" />
                                Quotas para {mName} ({configYear})
                              </h5>
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                Os representantes mostrados são filtrados pela data em que foram cadastrados no sistema. (Sônia Vendas contratada em <strong>maio de 2026</strong>).
                              </p>
                            </div>
                            {companyMonthGoal > 0 && repsInMonth.length > 0 && (
                              <button
                                onClick={() => handleAutoSplit(mNum)}
                                className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-lg hover:bg-indigo-100 transition text-[10px] font-black uppercase tracking-wide cursor-pointer flex items-center gap-1"
                              >
                                Dividir Igualmente
                              </button>
                            )}
                          </div>

                          {repsInMonth.length === 0 ? (
                            <p className="text-gray-400 font-semibold text-xs text-center py-4 bg-white rounded-xl border border-gray-100">
                              Nenhum representante registrou vigência ativa para este período histórico.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {repsInMonth.map((rep) => {
                                const currentRepVal = monthRepGoalsMap[rep.id] || 0;
                                return (
                                  <div key={rep.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-3xs flex justify-between items-center gap-3">
                                    <div>
                                      <span className="text-[11px] font-black text-gray-800 block">{rep.nome}</span>
                                      <span className="text-[9px] text-gray-450 font-bold">
                                        Admissão: {rep.data_cadastro ? rep.data_cadastro.split("-").reverse().join("/") : "Histórico"}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-gray-200 rounded-lg focus-within:border-indigo-400 focus-within:bg-white transition duration-150">
                                      <span className="text-[9px] text-gray-400 font-black">R$</span>
                                      <input
                                        type="number"
                                        value={currentRepVal === 0 ? "" : currentRepVal}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setDraftRepGoals(prev => {
                                            const updatedMonth = { ...prev[mNum] };
                                            updatedMonth[rep.id] = val;
                                            return {
                                              ...prev,
                                              [mNum]: updatedMonth
                                            };
                                          });
                                        }}
                                        placeholder="0"
                                        className="bg-transparent font-black text-xs text-gray-900 outline-none w-20 text-right font-mono"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Individual pro-rata validation info feedback box */}
                          <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold">
                            <span className="text-gray-450 uppercase">Validação do Rateio Comercial</span>
                            {repsMetaSum === companyMonthGoal && companyMonthGoal > 0 ? (
                              <span className="text-emerald-700 uppercase font-extrabold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/65">
                                Alinhado: 100% Rateado
                              </span>
                            ) : repsMetaSum > companyMonthGoal ? (
                              <span className="text-red-700 uppercase font-extrabold bg-red-50 px-2.5 py-1 rounded-md border border-red-100/60">
                                Quotas superam em R$ {(repsMetaSum - companyMonthGoal).toLocaleString("pt-BR")} o objetivo global
                              </span>
                            ) : (
                              <span className="text-amber-700 uppercase font-extrabold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/50">
                                Faltam R$ {(companyMonthGoal - repsMetaSum).toLocaleString("pt-BR")} para distribuir
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer containing Cancel and Save actions */}
            <div className="p-6 lg:p-8 bg-slate-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-xl hover:bg-gray-100 transition duration-150 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAllConfig}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide rounded-xl shadow-md cursor-pointer transition duration-150"
              >
                Gravar Configurações
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Objetivo;
