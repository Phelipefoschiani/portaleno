import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Despesa } from '../types';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  Droplet,
  Truck,
  Briefcase,
  UserCheck,
  User,
  Wrench,
  FileText,
  Gift,
  Sun,
  PiggyBank,
  Shield,
  Sparkles,
  Search,
  Filter,
  Package,
  Clock,
  ArrowDownCircle,
  HelpCircle
} from 'lucide-react';

const CATEGORIA_ICONS: Record<string, any> = {
  "Insumo": Package,
  "Frete": Truck,
  "Materia Prima": Package, // Mandioca or raw material
  "Comissao": TrendingUp,
  "Investimento": TrendingUp,
  "Manutenção": Wrench,
  "Imposto": FileText,
  "Contador": Briefcase,
  "Salário": UserCheck,
  "Prolabore": User,
  "Energia": Zap,
  "Agua": Droplet,
  "Internet": Sparkles,
  "Decimo Terceiro": Gift,
  "Ferias": Sun,
  "Fgts": PiggyBank,
  "Inss": Shield,
  "Diaria": Calendar,
  "Ocasionais": Sparkles,
  "Juros": AlertCircle
};

const CATEGORIAS = [
  "Insumo",
  "Frete",
  "Materia Prima",
  "Comissao",
  "Investimento",
  "Manutenção",
  "Imposto",
  "Contador",
  "Salário",
  "Prolabore",
  "Energia",
  "Agua",
  "Internet",
  "Decimo Terceiro",
  "Ferias",
  "Fgts",
  "Inss",
  "Diaria",
  "Ocasionais",
  "Juros"
];

const MONTHS = [
  { value: 'all', label: 'Todos os Meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

const YEARS = ['2026', '2025', '2024', '2027'];

const P_METHODS = [
  'Pix',
  'Boleto',
  'Dinheiro',
  'Cartão Crédito',
  'Cartão Débito'
];

const formatDateSafe = (dateStr: string) => {
  if (!dateStr) return '---';
  try {
    const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    if (cleanStr.includes("-")) {
      const parts = cleanStr.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const parsed = new Date(cleanStr + "T12:00:00");
    if (isNaN(parsed.getTime())) return '---';
    return parsed.toLocaleDateString('pt-BR');
  } catch (e) {
    return '---';
  }
};

interface DespesasProps {
  empresa?: string;
}

const Despesas: React.FC<DespesasProps> = ({ empresa }) => {
  const { despesas, addDespesa, updateDespesa, deleteDespesa, logEvent } = useGlobalState();
  const { user } = useAuth();

  // Search, Filters & Selection State
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayExpense, setSelectedPayExpense] = useState<Despesa | null>(null);

  // New Expense Form State
  const [newExpForm, setNewExpForm] = useState({
    nome: '',
    categoria: 'Insumo',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    vencimento: new Date().toISOString().split('T')[0],
    tipo_despesa: 'variavel' as 'fixa' | 'variavel',
    repeticao_opcao: 'meses', // 'meses' or 'ano_todo'
    repetir_meses: '2',
    descricao: '',
    comprovante: '' // NEW
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditForm(prev => ({ ...prev, comprovante: reader.result as string }));
        } else {
          setNewExpForm(prev => ({ ...prev, comprovante: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Payment Form State
  const [payForm, setPayForm] = useState({
    forma_pagamento: 'Pix',
    data_pagamento: new Date().toISOString().split('T')[0],
    pago_juros: 'nao', // 'sim' | 'nao'
    valor_juros: '0.00',
    dias_atraso: '0'
  });

  // Flow State for Details & Edit
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<Despesa | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({
    nome: '',
    categoria: 'Insumo',
    valor: '',
    data: '',
    vencimento: '',
    tipo_despesa: 'variavel' as 'fixa' | 'variavel',
    status: 'Em aberto' as 'Em aberto' | 'Pago',
    forma_pagamento: 'Pix' as any,
    data_pagamento: '',
    juros_pago: '0.00',
    dias_atraso: '0',
    comprovante: '' // NEW
  });

  const handleOpenDetailModal = (exp: Despesa) => {
    setSelectedDetailExpense(exp);
    setEditForm({
      nome: exp.descricao,
      categoria: exp.categoria || 'Insumo',
      valor: exp.valor.toString(),
      data: exp.data || '',
      vencimento: exp.vencimento || '',
      tipo_despesa: exp.tipo_despesa || 'variavel',
      status: exp.status || 'Em aberto',
      forma_pagamento: exp.forma_pagamento || 'Pix',
      data_pagamento: exp.data_pagamento || '',
      juros_pago: (exp.juros_pago || 0).toString(),
      dias_atraso: (exp.dias_atraso || 0).toString(),
      comprovante: exp.comprovante || '' // NEW
    });
    setIsEditing(false);
    setIsDetailModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailExpense) return;

    const valorNum = parseFloat(editForm.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return alert('Insira um valor numérico válido.');
    }

    const jurosNum = parseFloat(editForm.juros_pago) || 0;
    const diasAtrasoNum = parseInt(editForm.dias_atraso) || 0;

    updateDespesa(selectedDetailExpense.id, {
      descricao: editForm.nome.trim(),
      categoria: editForm.categoria,
      valor: valorNum,
      data: editForm.data,
      vencimento: editForm.vencimento,
      tipo_despesa: editForm.tipo_despesa,
      status: editForm.status,
      forma_pagamento: editForm.forma_pagamento,
      data_pagamento: editForm.status === 'Pago' ? (editForm.data_pagamento || new Date().toISOString().split('T')[0]) : undefined,
      juros_pago: editForm.status === 'Pago' ? jurosNum : undefined,
      dias_atraso: editForm.status === 'Pago' ? diasAtrasoNum : undefined,
      comprovante: editForm.comprovante || undefined // NEW
    });

    setIsEditing(false);
    setIsDetailModalOpen(false);
    setSelectedDetailExpense(null);
  };

  const incrementMonth = (dateStr: string, increment: number): string => {
    const d = new Date(dateStr + "T12:00:00");
    d.setMonth(d.getMonth() + increment);
    return d.toISOString().split('T')[0];
  };

  // Handle saving new expense
  const handleSaveNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpForm.nome.trim() || !newExpForm.valor) {
      return alert('Por favor, preencha o nome e o valor da despesa.');
    }

    const valorNum = parseFloat(newExpForm.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return alert('Insira um valor numérico válido.');
    }

    // Determine repetition parameters
    const isFixed = newExpForm.tipo_despesa === 'fixa';
    let totalParcelas = 1;
    if (isFixed) {
      if (newExpForm.repeticao_opcao === 'ano_todo') {
        totalParcelas = 12;
      } else {
        totalParcelas = parseInt(newExpForm.repetir_meses) || 12;
      }
    }

    // Generate individual monthly entries if recurring
    for (let i = 0; i < totalParcelas; i++) {
      const entryDate = incrementMonth(newExpForm.data, i);
      const entryVencimento = incrementMonth(newExpForm.vencimento, i);
      
      const descParcela = isFixed 
        ? `${newExpForm.descricao.trim()} (Parcela ${i + 1}/${totalParcelas})`.trim()
        : newExpForm.descricao.trim();

      addDespesa({
        usuario_id: user?.id || '',
        tipo: 'Empresa',
        categoria: newExpForm.categoria,
        data: entryHeuristicFilter(entryDate),
        vencimento: entryHeuristicFilter(entryVencimento),
        valor: valorNum,
        forma_pagamento: 'Boleto', // Default payment method template
        recorrente: isFixed,
        parcelas: totalParcelas,
        parcela_atual: i + 1,
        status: 'Em aberto',
        descricao: newExpForm.nome + (descParcela ? ` - ${descParcela}` : ''),
        tipo_despesa: newExpForm.tipo_despesa,
        comprovante: newExpForm.comprovante || undefined // NEW
      });
    }

    // Reset Form
    setNewExpForm({
      nome: '',
      categoria: 'Insumo',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      vencimento: new Date().toISOString().split('T')[0],
      tipo_despesa: 'variavel',
      repeticao_opcao: 'meses',
      repetir_meses: '2',
      descricao: '',
      comprovante: '' // NEW
    });
    setIsNewModalOpen(false);
    logEvent(`Lançou ${totalParcelas} parcela(s) de despesa: ${newExpForm.nome}`, valorNum * totalParcelas, user?.id, user?.nome);
  };

  // Fallback heuristic for string dates to prevent parsing mismatches
  const entryHeuristicFilter = (str: string): string => {
    return str || new Date().toISOString().split('T')[0];
  };

  // Open pay modal
  const handleOpenPayModal = (exp: Despesa) => {
    setSelectedPayExpense(exp);
    setPayForm({
      forma_pagamento: 'Pix',
      data_pagamento: new Date().toISOString().split('T')[0],
      pago_juros: 'nao',
      valor_juros: '0.00',
      dias_atraso: '0'
    });
    setIsPayModalOpen(true);
  };

  // Submit payment
  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayExpense) return;

    const jurosNum = payForm.pago_juros === 'sim' ? parseFloat(payForm.valor_juros) : 0;
    const diasAtrasoNum = parseInt(payForm.dias_atraso) || 0;

    if (payForm.pago_juros === 'sim' && (isNaN(jurosNum) || jurosNum < 0)) {
      return alert('Insira um valor de juros válido.');
    }

    updateDespesa(selectedPayExpense.id, {
      status: 'Pago',
      forma_pagamento: payForm.forma_pagamento as any,
      data_pagamento: payForm.data_pagamento,
      juros_pago: jurosNum,
      dias_atraso: diasAtrasoNum
    });

    setIsPayModalOpen(false);
    setSelectedPayExpense(null);
  };

  // Filter & calculate expenses list
  const filteredDespesas = useMemo(() => {
    return despesas.filter(d => {
      // 1. Year filter
      const yearOfEntry = d.data ? d.data.substring(0, 4) : '';
      if (selectedYear !== 'all' && yearOfEntry !== selectedYear) return false;

      // 2. Month filter
      const monthOfEntry = d.data ? d.data.substring(5, 7) : '';
      if (selectedMonth !== 'all' && monthOfEntry !== selectedMonth) return false;

      // 3. Category filter
      if (categoryFilter !== 'all' && d.categoria !== categoryFilter) return false;

      // 4. Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // 5. Fixed / Variable filter
      if (typeFilter !== 'all' && d.tipo_despesa !== typeFilter) return false;

      // 6. Text query search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const descMatches = d.descricao && d.descricao.toLowerCase().includes(query);
        const catMatches = d.categoria && d.categoria.toLowerCase().includes(query);
        const idMatches = d.id && d.id.toLowerCase().includes(query);
        if (!descMatches && !catMatches && !idMatches) return false;
      }

      return true;
    });
  }, [despesas, selectedYear, selectedMonth, categoryFilter, statusFilter, typeFilter, searchQuery]);

  // KPIs Calculations
  const kpis = useMemo(() => {
    let total = 0;
    let fixed = 0;
    let variable = 0;
    let paidTotal = 0;
    let unpaidTotal = 0;

    filteredDespesas.forEach(d => {
      total += d.valor;
      if (d.tipo_despesa === 'fixa' || d.recorrente) {
        fixed += d.valor;
      } else {
        variable += d.valor;
      }

      if (d.status === 'Pago' || d.status === 'Paga') {
        paidTotal += d.valor;
      } else {
        unpaidTotal += d.valor;
      }
    });

    return { total, fixed, variable, paidTotal, unpaidTotal };
  }, [filteredDespesas]);

  return (
    <div className="space-y-6">
      {/* HEADER ACTION AREA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Fluxo de Caixa & Despesas</h2>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">Gestão de custos recorrentes, insumos e rastreabilidade financeira</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95"
        >
          <Plus size={16} /> Nova Despesa
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50">
          <Filter size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Filtros de Período & Detalhamento</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* YEAR */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Exercício (Ano)</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
            >
              <option value="all">Todos os Anos</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* MONTH */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Mês de Competência</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Categoria de Custo</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* STATUS */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Status de Quitação</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="Pago">Quitadas (Pagas)</option>
              <option value="Em aberto">Em Aberto</option>
            </select>
          </div>

          {/* TYPE */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Tipo de Despesa</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
            >
              <option value="all">Todos os Tipos</option>
              <option value="fixa">Fixas (Recorrentes)</option>
              <option value="variavel">Variáveis</option>
            </select>
          </div>

          {/* SEARCH FIELD */}
          <div className="flex flex-col">
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Buscar Texto</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: energia, aluguel..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-gray-950 outline-none focus:border-primary hover:border-gray-300 transition-all placeholder-gray-400"
              />
              <Search size={12} className="absolute left-2.5 top-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TOTAL CARD */}
        <div className="bg-slate-900 hover:bg-slate-950 text-white p-6 rounded-[32px] shadow-lg relative overflow-hidden transition-all duration-300 flex flex-col justify-between min-h-[140px] group border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full translate-x-8 -translate-y-8 transform group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black tracking-widest text-[#ef4444] uppercase block">Despesas Totais</span>
              <span className="text-xs font-semibold text-slate-400">Total do período selecionado</span>
            </div>
            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-sans tracking-tight">
              R$ {kpis.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-400">
              <span>Pagas: <strong className="text-emerald-400">R$ {kpis.paidTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong></span>
              <span>Abertas: <strong className="text-amber-400">R$ {kpis.unpaidTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong></span>
            </div>
          </div>
        </div>

        {/* FIXED COST CARD */}
        <div className="bg-white hover:border-gray-200 text-gray-900 p-6 rounded-[32px] shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-300 flex flex-col justify-between min-h-[140px] group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/[0.01] rounded-full translate-x-8 -translate-y-8 transform group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black tracking-widest text-primary uppercase block">Custos Fixos</span>
              <span className="text-xs font-semibold text-gray-400">Despesas fixas recorrentes</span>
            </div>
            <div className="p-2.5 bg-primary/5 text-primary rounded-2xl border border-primary/10">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-sans tracking-tight text-gray-950">
              R$ {kpis.fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 mt-2">
              Composto por aluguéis, contabilidade, salários e assinaturas
            </p>
          </div>
        </div>

        {/* VARIABLE COST CARD */}
        <div className="bg-white hover:border-gray-200 text-gray-900 p-6 rounded-[32px] shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-300 flex flex-col justify-between min-h-[140px] group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/[0.01] rounded-full translate-x-8 -translate-y-8 transform group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black tracking-widest text-orange-600 uppercase block">Custos Variáveis</span>
              <span className="text-xs font-semibold text-gray-400">Variável sobre produção/venda</span>
            </div>
            <div className="p-2.5 bg-orange-600/5 text-orange-600 rounded-2xl border border-orange-600/10">
              <ArrowDownCircle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-sans tracking-tight text-gray-950">
              R$ {kpis.variable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 mt-2">
              Composto por mandioca, comissões, fretes tributos e água/luz
            </p>
          </div>
        </div>
      </div>

      {/* EXPENSES DETAIL TABULATION */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-md font-black text-gray-900">Histórico de Movimentações</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Listando {filteredDespesas.length} de {despesas.length} lançamentos encontrados</p>
          </div>
        </div>

        {filteredDespesas.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <HelpCircle size={32} className="text-gray-300" />
            </div>
            <h4 className="text-lg font-black text-gray-950 leading-tight">Nenhuma Despesa Encontrada</h4>
            <p className="text-xs text-gray-500 font-medium max-w-sm mx-auto mt-1">
              Ajuste as opções de filtro de período, categorias ou faça um novo lançamento de pagamento de despesa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  <th className="py-4 px-6">Identificador / Categoria</th>
                  <th className="py-4 px-6">Lançamento / Nome</th>
                  <th className="py-4 px-6 text-center">Tipo</th>
                  <th className="py-4 px-6">Competência / Vencim.</th>
                  <th className="py-4 px-6 text-right">Valor Líquido</th>
                  <th className="py-4 px-6 text-center">Estado</th>
                  <th className="py-4 px-10 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredDespesas.map((d) => {
                  const IconComp = CATEGORIA_ICONS[d.categoria] || HelpCircle;
                  const isPaid = d.status === 'Pago' || d.status === 'Paga';
                  const cleanVencStr = d.vencimento ? (d.vencimento.includes("T") ? d.vencimento.split("T")[0] : d.vencimento) : '';
                  const isOverdue = !isPaid && cleanVencStr && new Date(cleanVencStr + "T12:00:00") < new Date();

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/35 transition-colors group">
                      {/* CATEGORY ICON & LABEL */}
                      <td className="py-4.5 px-6 font-bold text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border shrink-0 ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : isOverdue 
                                ? 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                                : 'bg-gray-50 text-gray-500 border-gray-200/60'
                          }`}>
                            <IconComp size={15} />
                          </div>
                          <div>
                            <span className="text-gray-950 font-black block leading-none">{d.categoria}</span>
                            <span className="font-mono text-[9px] text-gray-400 tracking-tighter block mt-1">#{d.id.substring(0,8).toUpperCase()}</span>
                          </div>
                        </div>
                      </td>

                      {/* DESCRIPTION / PARCEL */}
                      <td className="py-4.5 px-6 font-semibold max-w-[200px]">
                        <p className="text-gray-900 font-extrabold truncate">{d.descricao}</p>
                        {d.tipo_despesa === 'fixa' && (
                          <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded-md mt-1 inline-block uppercase tracking-wider">
                            Parcela {d.parcela_atual}/{d.parcelas}
                          </span>
                        )}
                        {d.compra_mandioca_id && (
                          <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1 inline-block uppercase tracking-wider">
                            Vínculo Rastreabilidade Fornecedor
                          </span>
                        )}
                      </td>

                      {/* TYPE DESPESA */}
                      <td className="py-4.5 px-6 text-center font-bold">
                        <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-1 rounded-full ${
                          d.tipo_despesa === 'fixa' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {d.tipo_despesa === 'fixa' ? 'Fixa' : 'Variável'}
                        </span>
                      </td>

                      {/* COMPETENCE / OVERDUE DATES */}
                      <td className="py-4.5 px-6 leading-relaxed">
                        <div className="flex flex-col gap-0.5 text-gray-500 font-bold">
                          <span>Comp.: <strong className="text-gray-800">{formatDateSafe(d.data)}</strong></span>
                          <span>Venc.: <strong className={isOverdue ? "text-red-600 animate-pulse" : "text-gray-800"}>
                            {formatDateSafe(d.vencimento)}
                          </strong></span>
                          {isPaid && d.data_pagamento && (
                            <span className="text-[9px] text-emerald-600 block mt-0.5">
                              Pago em: {formatDateSafe(d.data_pagamento)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NET VALUE */}
                      <td className="py-4.5 px-6 text-right font-bold text-gray-900 font-mono text-[13px] tracking-tight">
                        R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {isPaid && d.juros_pago && d.juros_pago > 0 ? (
                          <span className="text-[9px] font-black text-red-600 block" title="Total juros pago">
                            + R$ {d.juros_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Juros)
                          </span>
                        ) : null}
                      </td>

                      {/* STATUS STATE */}
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : isOverdue 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPaid ? (
                            <>
                              <CheckCircle2 size={12} className="shrink-0" />
                              Quitada
                            </>
                          ) : isOverdue ? (
                            <>
                              <AlertCircle size={12} className="shrink-0 animate-ping duration-1000" />
                              Atrasada
                            </>
                          ) : (
                            <>
                              <Clock size={12} className="shrink-0" />
                              Aberto
                            </>
                          )}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4.5 px-10 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid && (
                            <button
                              onClick={() => handleOpenPayModal(d)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1"
                              title="Liquidar Despesa"
                            >
                              <CheckCircle2 size={12} /> Quitar / Pagar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDetailModal(d)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors"
                            title="Ver Detalhes / Editar / Excluir"
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW EXPENSE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto scale-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ef4444] block">Fluxo de Caixa</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">Lançar Nova Despesa</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <Trash2 size={16} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveNewExpense} className="space-y-4">
              {/* DESPESA NAME */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Título da Despesa <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newExpForm.nome}
                  onChange={(e) => setNewExpForm({ ...newExpForm, nome: e.target.value })}
                  placeholder="Ex: Conta mensal de energia"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950 placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* VALUE */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Valor da Despesa (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newExpForm.valor}
                    onChange={(e) => setNewExpForm({ ...newExpForm, valor: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950 placeholder-gray-400 font-mono"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newExpForm.categoria}
                    onChange={(e) => setNewExpForm({ ...newExpForm, categoria: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                  >
                    {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* DATE */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Competência (Data) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={newExpForm.data}
                    onChange={(e) => setNewExpForm({ ...newExpForm, data: e.target.value, vencimento: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                  />
                </div>

                {/* VENCIMENTO */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Prazo Limite (Vencimento) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={newExpForm.vencimento}
                    onChange={(e) => setNewExpForm({ ...newExpForm, vencimento: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                  />
                </div>
              </div>

              {/* TIPO DE CUSTO (FIXO OU VARIAVEL) */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <span className="block text-xs font-black text-gray-400 uppercase tracking-wider">Perfil do Custo</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewExpForm({ ...newExpForm, tipo_despesa: 'variavel' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      newExpForm.tipo_despesa === 'variavel'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Custo Variável
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpForm({ ...newExpForm, tipo_despesa: 'fixa' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      newExpForm.tipo_despesa === 'fixa'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Custo Fixo Recorrente
                  </button>
                </div>

                {/* ADDITIONAL REPETITION LOGIC IF FIXED */}
                {newExpForm.tipo_despesa === 'fixa' && (
                  <div className="pt-3 border-t border-gray-200/50 space-y-3 animate-fadeIn">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Regra de Projeção</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewExpForm({ ...newExpForm, repeticao_opcao: 'meses' })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          newExpForm.repeticao_opcao === 'meses'
                            ? 'bg-primary text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Repetir por Meses
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewExpForm({ ...newExpForm, repeticao_opcao: 'ano_todo' })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          newExpForm.repeticao_opcao === 'ano_todo'
                            ? 'bg-primary text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        title="Projeta por todo o período de 12 meses"
                      >
                        Repetir o Ano Todo
                      </button>
                    </div>

                    {newExpForm.repeticao_opcao === 'meses' && (
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantidade de Meses</label>
                        <select
                          value={newExpForm.repetir_meses}
                          onChange={(e) => setNewExpForm({ ...newExpForm, repetir_meses: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900"
                        >
                          {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(v => <option key={v} value={v}>{v} meses</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OPTIONAL DESCRIPTION */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Descrição Adicional <span className="text-gray-400">(Opcional)</span>
                </label>
                <textarea
                  value={newExpForm.descricao}
                  onChange={(e) => setNewExpForm({ ...newExpForm, descricao: e.target.value })}
                  placeholder="Insira notas explicativas ou detalhes adicionais"
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950 placeholder-gray-400 resize-none font-medium"
                />
              </div>

              {/* FILE UPLOAD (NF / CUPOM FISCAL) */}
              <div className="bg-white border border-gray-100 rounded-3xl p-4.5 space-y-2.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wide">
                  Cupom Fiscal ou Nota Fiscal (PDF ou Imagem)
                </label>
                <div 
                  className="border-2 border-dashed border-gray-200 hover:border-primary/50 rounded-2xl p-4 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-1.5 relative"
                  onClick={() => document.getElementById('new-exp-file-input')?.click()}
                >
                  <input 
                    id="new-exp-file-input" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, false)} 
                  />
                  {newExpForm.comprovante ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-emerald-600 font-extrabold text-xs">✓ Arquivo importado</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
                        {newExpForm.comprovante.startsWith('data:image') ? 'Foto_Cupom.png' : 'Documento_Fiscal.pdf'}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewExpForm(prev => ({ ...prev, comprovante: '' }));
                        }}
                        className="text-red-500 font-bold text-[10px] hover:underline mt-1"
                      >
                        Remover anexo
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileText className="text-gray-300" size={24} />
                      <p className="text-xs font-bold text-gray-500">Clique para selecionar ou arrastar cupom fiscal / NF</p>
                      <p className="text-[10px] text-gray-400">Suporta PDF ou Imagens</p>
                    </>
                  )}
                </div>
              </div>

              {/* SAVE CANCEL ACTIONS */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all border border-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm active:scale-95"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY / LIQUIDATE EXPENSE MODAL */}
      {isPayModalOpen && selectedPayExpense && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto scale-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block">Quitação de Custos</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">Registrar Pagamento</h3>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <Trash2 size={16} className="rotate-45" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-slate-700 font-bold space-y-1.5">
              <span className="text-[9px] font-black text-gray-400 block uppercase tracking-widest mb-1">Resumo do Lançamento</span>
              <p>Nome: <span className="font-extrabold text-gray-950">{selectedPayExpense.descricao}</span></p>
              <p>Categoria: <span className="font-extrabold text-gray-900">{selectedPayExpense.categoria}</span></p>
              <p>Valor Líquido: <span className="font-mono font-black text-gray-950 text-sm">R$ {selectedPayExpense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
              <p>Vencimento Original: <span className="font-extrabold text-gray-900">{formatDateSafe(selectedPayExpense.vencimento)}</span></p>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              {/* DATE OF PAYMENT */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Data de Pagamento <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={payForm.data_pagamento}
                  onChange={(e) => setPayForm({ ...payForm, data_pagamento: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                />
              </div>

              {/* PAYMENT METHOD */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento <span className="text-red-500">*</span>
                </label>
                <select
                  value={payForm.forma_pagamento}
                  onChange={(e) => setPayForm({ ...payForm, forma_pagamento: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                >
                  {P_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* DELAY IN DAYS */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5" title="Se houve atraso, por quantos dias?">
                    Dias de Atraso <span className="text-gray-400">(Se houver)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={payForm.dias_atraso}
                    onChange={(e) => setPayForm({ ...payForm, dias_atraso: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 text-sm font-semibold outline-none focus:border-emerald-500 transition-all text-gray-950 font-mono"
                  />
                </div>

                {/* DID IT HAVE INTEREST? */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Houve Cobrança de Juros?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPayForm({ ...payForm, pago_juros: 'nao', valor_juros: '0.00' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        payForm.pago_juros === 'nao'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayForm({ ...payForm, pago_juros: 'sim' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        payForm.pago_juros === 'sim'
                          ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>
              </div>

              {/* VALUE OF INTEREST - ONLY SHOW IF YES */}
              {payForm.pago_juros === 'sim' && (
                <div className="p-4 bg-rose-50 border border-rose-100/50 rounded-2xl space-y-2 animate-fadeIn">
                  <div className="flex items-start gap-1.5 text-rose-800 text-[10px] font-bold leading-normal">
                    <AlertTriangleSizeAdjust />
                    <span>Será criada automaticamente uma despesa de categoria "Juros" vinculada a este pagamento.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-rose-800 uppercase tracking-wider mb-1">
                      Valor do Juros Pago (R$) <span className="text-[#e11d48]">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={payForm.valor_juros}
                      onChange={(e) => setPayForm({ ...payForm, valor_juros: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white border border-rose-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-rose-500 transition-all text-gray-950 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* CONTROLS */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all border border-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm active:scale-95"
                >
                  Confirmar Quitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETALHES E EDICAO MODAL */}
      {isDetailModalOpen && selectedDetailExpense && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto scale-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ef4444] block">Ficha da Despesa</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  {isEditing ? "Editar Detalhes" : "Visualizar Movimentação"}
                </h3>
                <span className="font-mono text-[9px] text-gray-400 block mt-0.5">#{selectedDetailExpense.id.toUpperCase()}</span>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedDetailExpense(null);
                  setIsEditing(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <Trash2 size={16} className="rotate-45" />
              </button>
            </div>

            {isEditing ? (
              /* IN EDITING MODE */
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* DESPESA NAME */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Título / Notas de Lançamento <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* VALUE */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Valor Líquido (R$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editForm.valor}
                      onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950 font-mono"
                    />
                  </div>

                  {/* CATEGORY */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Categoria <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.categoria}
                      onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                    >
                      {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DATE */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Competência (Data) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={editForm.data}
                      onChange={(e) => setEditForm({ ...editForm, data: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                    />
                  </div>

                  {/* VENCIMENTO */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                      Prazo Limite (Vencimento) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={editForm.vencimento}
                      onChange={(e) => setEditForm({ ...editForm, vencimento: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950"
                    />
                  </div>
                </div>

                {/* COST TYPE TOGGLER */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-wider">Perfil do Custo</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, tipo_despesa: 'variavel' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        editForm.tipo_despesa === 'variavel'
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Custo Variável
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, tipo_despesa: 'fixa' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        editForm.tipo_despesa === 'fixa'
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Custo Fixo Recorrente
                    </button>
                  </div>
                </div>

                {/* STATUS & PAYMENT FORM BLOCK */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-450 uppercase tracking-wider mb-1.5">
                      Estado de Quitação
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, status: 'Em aberto' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          editForm.status === 'Em aberto'
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Aberto
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, status: 'Pago', data_pagamento: editForm.data_pagamento || new Date().toISOString().split('T')[0] })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          editForm.status === 'Pago'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Pago / Quitada
                      </button>
                    </div>
                  </div>

                  {editForm.status === 'Pago' && (
                    <div className="space-y-3 pt-3 border-t border-gray-200/50 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Data Pagamento</label>
                          <input
                            required
                            type="date"
                            value={editForm.data_pagamento}
                            onChange={(e) => setEditForm({ ...editForm, data_pagamento: e.target.value })}
                            className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-450 uppercase tracking-wider mb-1">Forma De Pagamento</label>
                          <select
                            value={editForm.forma_pagamento}
                            onChange={(e) => setEditForm({ ...editForm, forma_pagamento: e.target.value as any })}
                            className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold"
                          >
                            {P_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Dias Atraso</label>
                          <input
                            type="number"
                            min="0"
                            value={editForm.dias_atraso}
                            onChange={(e) => setEditForm({ ...editForm, dias_atraso: e.target.value })}
                            className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Juros Pago (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editForm.juros_pago}
                            onChange={(e) => setEditForm({ ...editForm, juros_pago: e.target.value })}
                            className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* EDIT NF / COMPROVANTE UPLOAD */}
                <div className="bg-white border border-gray-150 rounded-2xl p-4.5 space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wide">
                    Substituir Cupom / Nota Fiscal (PDF ou Imagem)
                  </label>
                  <div 
                    className="border-2 border-dashed border-gray-200 hover:border-primary/50 rounded-xl p-3 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-1.5 relative"
                    onClick={() => document.getElementById('edit-exp-file-input')?.click()}
                  >
                    <input 
                      id="edit-exp-file-input" 
                      type="file" 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, true)} 
                    />
                    {editForm.comprovante ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-emerald-600 font-extrabold text-xs">✓ Comprovante anexado</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
                          {editForm.comprovante.startsWith('data:image') ? 'Foto_Cupom.png' : 'Documento_Fiscal.pdf'}
                        </span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditForm(prev => ({ ...prev, comprovante: '' }));
                          }}
                          className="text-red-500 font-bold text-[10px] hover:underline mt-1"
                        >
                          Remover anexo
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileText className="text-gray-300" size={20} />
                        <p className="text-[11px] font-bold text-gray-500">Clique para anexar cupom / NF</p>
                      </>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all border border-gray-100"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-red-650 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            ) : (
              /* IN VIEW ONLY MODE */
              <div className="space-y-6">
                <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 space-y-4">
                  {/* TITLE DESCRIPTION */}
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Descrição / Título</span>
                    <p className="text-gray-950 font-black text-sm mt-0.5 leading-relaxed">{selectedDetailExpense.descricao}</p>
                  </div>

                  {/* DETAILS GRID */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-bold text-gray-700">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Categoria</span>
                      <span className="text-gray-900 font-extrabold block mt-0.5">{selectedDetailExpense.categoria}</span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Tipo Custo</span>
                      <span className="text-gray-900 font-extrabold block mt-0.5">
                        {selectedDetailExpense.tipo_despesa === 'fixa' ? 'Fixo Recorrente' : 'Custo Variável'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Data Competência</span>
                      <span className="text-gray-900 font-extrabold block mt-0.5">
                        {formatDateSafe(selectedDetailExpense.data)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Vencimento</span>
                      <span className="text-gray-955 font-black block mt-0.5">
                        {formatDateSafe(selectedDetailExpense.vencimento)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Estado</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          selectedDetailExpense.status === 'Pago'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {selectedDetailExpense.status === 'Pago' ? 'Quitada' : 'Em Aberto'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Valor Líquido</span>
                      <span className="text-red-650 font-mono font-black text-[15px] block mt-0.5">
                        R$ {selectedDetailExpense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* IF RECURRING INFO */}
                  {selectedDetailExpense.recorrente && (
                    <div className="pt-3 border-t border-gray-200/50">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Cronograma de Repetições</span>
                      <p className="text-xs font-semibold text-gray-650">
                        Esta é uma parcela de custo recorrente de longo prazo. Parcela atual: <strong>{selectedDetailExpense.parcela_atual}/{selectedDetailExpense.parcelas}</strong>.
                      </p>
                    </div>
                  )}

                  {/* IF LINKED TO MANIOC PURCHASE */}
                  {selectedDetailExpense.compra_mandioca_id && (
                    <div className="pt-3 border-t border-gray-200/50">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Rastreabilidade matéria-prima</span>
                      <p className="text-[10px] font-black text-indigo-750 uppercase">
                        Vínculo automático de faturamento de produtor rural #{selectedDetailExpense.compra_mandioca_id.substring(0,8).toUpperCase()}
                      </p>
                    </div>
                  )}

                  {/* COMPROVANTE / ANEXO DE CUPOM */}
                  {selectedDetailExpense.comprovante ? (
                    <div className="pt-3 border-t border-gray-200/50">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cupom Fiscal / Nota Fiscal (Anexo)</span>
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-primary animate-pulse" />
                          <span className="text-[11px] font-extrabold text-gray-700 truncate max-w-[150px]">
                            {selectedDetailExpense.comprovante.startsWith('data:') ? 'Comprovante_Fiscal' : 'Anexo_Cupom'}
                          </span>
                        </div>
                        <a
                          href={selectedDetailExpense.comprovante}
                          download={selectedDetailExpense.comprovante.startsWith('data:image') ? 'comprovante.png' : 'comprovante.pdf'}
                          className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                          title="Fazer download ou abrir comprovante"
                        >
                          Visualizar
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-gray-200/50">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Anexo / Cupom Fiscal</span>
                      <p className="text-[10px] font-bold text-gray-400 italic">Nenhum cupom ou comprovante anexado.</p>
                    </div>
                  )}
                </div>

                {/* IF PAID SHOW PAYMENT PARTICULARS */}
                {selectedDetailExpense.status === 'Pago' && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4.5 space-y-3.5 text-xs text-emerald-955 font-bold">
                    <span className="text-[9px] font-black tracking-widest text-[#059669] uppercase block">Assinatura de Liquidação</span>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-1.5 font-bold">
                      <div>
                        <span className="text-[#059669] text-[8px] uppercase block tracking-wider">Pago em...</span>
                        <span className="text-gray-905 block mt-0.5">
                          {selectedDetailExpense.data_pagamento ? formatDateSafe(selectedDetailExpense.data_pagamento) : "---"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#059669] text-[8px] uppercase block tracking-wider">Via...</span>
                        <span className="text-gray-905 block mt-0.5">{selectedDetailExpense.forma_pagamento}</span>
                      </div>
                      <div>
                        <span className="text-[#059669] text-[8px] uppercase block tracking-wider">Dias em atraso</span>
                        <span className="text-gray-905 block mt-0.5">{selectedDetailExpense.dias_atraso || 0} dias</span>
                      </div>
                      <div>
                        <span className="text-[#059669] text-[8px] uppercase block tracking-wider">Acréscimo de Juros</span>
                        <span className="text-gray-905 block mt-0.5 font-mono">
                          R$ {(selectedDetailExpense.juros_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROW DELETION AND EDIT BUTTON CONTROLS */}
                <div className="flex gap-2 pt-4 border-t border-gray-150">
                  {user?.perfil !== 'producao' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Deseja realmente excluir este lançamento de despesa?")) {
                          deleteDespesa(selectedDetailExpense.id);
                          logEvent(`Excluiu lançamento de despesa: ${selectedDetailExpense.descricao || 'Sem descrição'}`, selectedDetailExpense.valor, user?.id, user?.nome);
                          setIsDetailModalOpen(false);
                          setSelectedDetailExpense(null);
                        }
                      }}
                      className="px-4 py-3 bg-red-50 hover:bg-red-100 text-[#dc2626] font-black text-xs uppercase tracking-wider rounded-2xl transition-all border border-red-150 flex items-center justify-center gap-1.5"
                      title="Excluir Definitivamente"
                    >
                      <Trash2 size={13} /> Deletar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-955 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Wrench size={13} /> Editar Despesa
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setSelectedDetailExpense(null);
                    }}
                    className="px-5 py-3 bg-gray-150 hover:bg-gray-200 text-gray-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AlertTriangleSizeAdjust = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 shrink-0 mt-0.5">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default Despesas;
