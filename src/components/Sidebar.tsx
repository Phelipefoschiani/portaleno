import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { 
  LayoutDashboard, 
  LogOut,
  Building2,
  Users,
  Package,
  FileText,
  Activity,
  DollarSign,
  Receipt,
  Coins,
  Target,
  TrendingUp,
  Settings
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  empresa: string;
  setEmpresa: (emp: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, empresa, setEmpresa }) => {
  const { logout, user } = useAuth();
  const { usuarios, objetivosEmpresa, metasRepresentantes } = useGlobalState();

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
  };

  // Realignment checker function
  const checkNeedRealignForMonth = (m: number, y: number) => {
    const obj = objetivosEmpresa.find((o) => o.ano === y && o.mes === m);
    const companyGoal = obj ? obj.valor : 0;
    if (companyGoal === 0) return false;

    // Active reps in that exact month/year
    const activeReps = usuarios.filter((u) => {
      if (u.perfil !== 'representante' || !u.ativo) return false;
      if (!u.data_cadastro) return true;
      const [regAno, regMes] = u.data_cadastro.split('-').map(Number);
      if (y > regAno) return true;
      if (y < regAno) return false;
      return m >= regMes;
    });

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

  // Check from May 2026 onwards for year 2026
  let hasRealignForwardNeeded = false;
  if (empresa === 'estancia') {
    for (let m = 5; m <= 12; m++) {
      if (checkNeedRealignForMonth(m, 2026)) {
        hasRealignForwardNeeded = true;
        break;
      }
    }
  }

  const categories = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
        ...(user?.perfil === 'empana' ? [
          { id: 'clientes', label: 'Clientes', icon: Users }
        ] : [
          ...(user?.perfil === 'producao' ? [
            { id: 'producao', label: 'Produção / Início', icon: LayoutDashboard },
            { id: 'despesas', label: 'Despesas', icon: DollarSign }
          ] : [
            ...(empresa === 'estancia' ? [
              { id: 'clientes', label: 'Clientes', icon: Users },
              { id: 'fornecedores', label: 'Fornecedores', icon: Users },
              { id: 'produtos', label: 'Produtos', icon: Package },
              { id: 'pedidos', label: 'Orçamentos / Pedidos', icon: FileText },
              { id: 'producao', label: 'Fabricação / Produção', icon: Activity },
              { id: 'despesas', label: 'Despesas', icon: DollarSign },
              { id: 'controle-nf', label: 'Controle de NF', icon: Receipt },
              { id: 'a-receber', label: 'A Receber', icon: Coins },
              { id: 'objetivo', label: 'Objetivo do Mês', icon: Target },
              { id: 'dre', label: 'DRE - Demonstração', icon: TrendingUp },
              ...(user?.perfil === 'gerente' ? [
                { id: 'configuracoes', label: 'Configurações', icon: Settings },
                { id: 'eventos', label: 'Eventos do Sistema', icon: Activity } 
              ] : [])
            ] : empresa === 'empana' ? [
              { id: 'clientes', label: 'Clientes', icon: Users },
              ...(user?.perfil === 'gerente' ? [
                { id: 'configuracoes-empana', label: 'Configurações', icon: Settings }
              ] : [])
            ] : [])
          ])
        ])
      ]
    }
  ];

  return (
    <div className="w-72 bg-primary text-white h-screen sticky top-0 flex flex-col shadow-2xl z-20 hide-on-print">
      <div className="p-8 border-b border-secondary/30">
        <h2 className="text-2xl font-bold tracking-tighter col-span-1">GRUPO</h2>
        <h3 className="text-lg font-light text-accent/80 tracking-widest -mt-1 uppercase text-xs opacity-70">ENO</h3>
        
        {user?.perfil === 'producao' ? (
          <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 px-3.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-accent/90">
            <Building2 size={16} className="text-accent" />
            <span>Estância Nova Olinda</span>
          </div>
        ) : user?.perfil === 'empana' ? (
          <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 px-3.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-accent/90">
            <Building2 size={16} className="text-accent" />
            <span>Empana Fácil</span>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
            <Building2 size={16} className="text-accent ml-2" />
            <select 
              value={empresa}
              onChange={(e) => {
                setEmpresa(e.target.value);
                if (e.target.value !== 'estancia') {
                  setActiveTab('dashboard');
                }
              }}
              className="bg-transparent text-sm font-bold text-white outline-none w-full cursor-pointer appearance-none py-1"
            >
              <option value="estancia" className="text-gray-900">Estância Nova Olinda</option>
              <option value="sitio" className="text-gray-900">Sítio</option>
              <option value="empana" className="text-gray-900">Empana Fácil</option>
              <option value="bigorna" className="text-gray-900">Bigorna</option>
            </select>
          </div>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {categories.map((category, idx) => (
          <div key={idx} className="mb-6">
            <h4 className="px-4 mb-2 text-[10px] font-bold text-accent/40 uppercase tracking-[0.2em]">
              {category.title}
            </h4>
            <ul className="space-y-1">
              {category.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                      activeTab === item.id 
                        ? 'bg-accent text-primary font-bold shadow-lg' 
                        : 'text-accent/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-primary' : 'text-accent/40 group-hover:text-accent'} />
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    {item.id === 'objetivo' && hasRealignForwardNeeded && (
                      <span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse shrink-0" title="Alinhamento de metas necessário" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-secondary/30 bg-primary/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all font-semibold"
        >
          <LogOut size={18} />
          <span className="text-sm">Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
