import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { 
  LayoutDashboard, 
  LogOut,
  Building2,
  Users,
  Briefcase,
  Box,
  ShoppingCart,
  Factory,
  CreditCard,
  ReceiptText,
  HandCoins,
  Target,
  BarChart4,
  Settings,
  LifeBuoy,
  FileText,
  Layers,
  ChefHat
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

  const isSupport = user?.perfil === 'suporte';

  const categories = [
    {
      title: isSupport ? '' : 'Principal',
      items: user?.perfil === 'suporte' ? [
        { id: 'suporte', label: 'Portal Suporte', icon: LifeBuoy }
      ] : [
        { id: 'dashboard', label: 'INÍCIO', icon: LayoutDashboard },
        ...(user?.perfil === 'empana' ? [
          { id: 'clientes', label: 'CLIENTES', icon: Users }
        ] : [
          ...(user?.perfil === 'producao' ? [
            { id: 'producao', label: 'PRODUÇÃO / INÍCIO', icon: LayoutDashboard },
            { id: 'despesas', label: 'DESPESAS', icon: CreditCard }
          ] : [
            ...(empresa === 'estancia' ? [
              { id: 'clientes', label: 'CLIENTES', icon: Users },
              { id: 'fornecedores', label: 'FORNECEDORES', icon: Briefcase },
              { id: 'produtos', label: 'PRODUTOS', icon: Box },
              { id: 'pedidos', label: 'ORÇAMENTOS / PEDIDOS', icon: ShoppingCart },
              { id: 'producao', label: 'FABRICAÇÃO / PRODUÇÃO', icon: Factory },
              { id: 'despesas', label: 'DESPESAS', icon: CreditCard },
              { id: 'controle-nf', label: 'CONTROLE DE NF', icon: ReceiptText },
              { id: 'a-receber', label: 'A RECEBER', icon: HandCoins },
              { id: 'objetivo', label: 'OBJETIVO DO MÊS', icon: Target },
              { id: 'dre', label: 'DRE - DEMONSTRAÇÃO', icon: BarChart4 },
              ...(user?.perfil === 'gerente' ? [
                { id: 'configuracoes', label: 'CONFIGURAÇÕES', icon: Settings },
                { id: 'eventos', label: 'EVENTOS DO SISTEMA', icon: FileText },
                { id: 'chamados', label: 'CHAMADOS / SUPORTE', icon: LifeBuoy } 
              ] : [])
            ] : empresa === 'empana' ? [
              { id: 'clientes', label: 'CLIENTES', icon: Users },
              ...(user?.perfil === 'gerente' ? [
                { id: 'configuracoes-empana', label: 'CONFIGURAÇÕES', icon: Settings }
              ] : [])
            ] : empresa === 'tempera' ? [
              { id: 'clientes', label: 'CLIENTES', icon: Users },
              { id: 'produtos-tempera', label: 'PRODUTOS', icon: Box },
              { id: 'receitas-tempera', label: 'RECEITAS', icon: ChefHat },
              { id: 'custos-tempera', label: 'CUSTOS', icon: CreditCard },
              { id: 'pedidos-tempera', label: 'PEDIDOS', icon: ShoppingCart },
              { id: 'lotes-tempera', label: 'LOTES', icon: Layers },
              { id: 'a-receber-tempera', label: 'A RECEBER', icon: HandCoins },
              { id: 'a-pagar-tempera', label: 'A PAGAR', icon: ReceiptText },
            ] : [])
          ])
        ])
      ]
    }
  ];

  const getIconColor = (id: string, active: boolean) => {
    if (active) return isSupport ? 'text-black' : 'text-primary';
    
    if (id.includes('produto')) return 'text-green-400 group-hover:text-green-300';
    if (id.includes('lote')) return 'text-teal-400 group-hover:text-teal-300';
    if (id.includes('custo') || id.includes('despesa') || id.includes('pagar')) return 'text-rose-400 group-hover:text-rose-300';
    if (id.includes('pedido') || id.includes('nf')) return 'text-amber-400 group-hover:text-amber-300';
    if (id.includes('receber')) return 'text-emerald-400 group-hover:text-emerald-300';
    if (id.includes('cliente') || id.includes('fornecedor')) return 'text-purple-400 group-hover:text-purple-300';
    if (id.includes('producao')) return 'text-orange-400 group-hover:text-orange-300';
    if (id.includes('objetivo')) return 'text-indigo-400 group-hover:text-indigo-300';
    if (id.includes('dre')) return 'text-blue-400 group-hover:text-blue-300';
    if (id.includes('config')) return 'text-slate-400 group-hover:text-slate-300';
    if (id === 'dashboard') return 'text-sky-400 group-hover:text-sky-300';
    
    return isSupport ? 'text-gray-500 group-hover:text-white' : 'text-white/70 group-hover:text-white';
  };

  return (
    <div className={`w-72 h-screen sticky top-0 flex flex-col shadow-2xl z-20 hide-on-print ${
      isSupport ? 'bg-black text-white' : 'bg-primary text-white'
    }`}>
      <div className={`p-8 border-b ${isSupport ? 'border-gray-800' : 'border-secondary/30'}`}>
        {!isSupport ? (
          <>
          <div className="flex items-center gap-2 justify-center">
            <span className="text-3xl font-black tracking-tighter text-white">Grupo</span>
            <span className="text-3xl font-black tracking-tighter text-white">ENO</span>
          </div>
            
            {user?.perfil === 'producao' ? (
              <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 px-3.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-accent/90">
                <Building2 size={16} className="text-accent" />
                <span>Estância Nova Olinda</span>
              </div>
            ) : user?.perfil === 'empana' ? (
              <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 px-3.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-accent/90">
                <Building2 size={16} className="text-accent" />
                <span>RCA</span>
              </div>
            ) : (user?.perfil === 'rca' || user?.perfil === 'RCA') ? (
              <div className="mt-6 flex items-center gap-2 bg-white/5 p-2 px-3.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-accent/90">
                <Building2 size={16} className="text-accent" />
                <span>Tempera e Empana</span>
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
                  <option value="empana" className="text-gray-900">RCA</option>
                  <option value="bigorna" className="text-gray-900">Bigorna</option>
                  <option value="tempera" className="text-gray-900">Tempera e Empana</option>
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <LifeBuoy className="text-white" size={28} />
            <span className="text-lg font-black tracking-tighter uppercase">Suporte</span>
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      activeTab === item.id 
                        ? (isSupport ? 'bg-white text-black font-bold shadow-lg' : 'bg-accent text-primary font-bold shadow-lg')
                        : (isSupport ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-white/90 font-medium hover:bg-white/10 hover:text-white')
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                      activeTab === item.id 
                        ? (isSupport ? 'bg-black/10' : 'bg-primary/10')
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}>
                      <item.icon size={16} className={getIconColor(item.id, activeTab === item.id)} />
                    </div>
                    <span className="text-xs tracking-wider flex-1 text-left">{item.label}</span>
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

      <div className={`p-4 border-t bg-primary/50 ${isSupport ? 'border-gray-800 bg-black/50' : 'border-secondary/30 bg-primary/50'}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all font-bold shadow-md ${
            isSupport ? 'bg-red-900/60 text-red-300 hover:bg-red-800 hover:text-white' : 'bg-red-600 text-white hover:bg-red-500 hover:shadow-red-600/30'
          }`}
        >
          <LogOut size={18} />
          <span className="text-sm">Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
