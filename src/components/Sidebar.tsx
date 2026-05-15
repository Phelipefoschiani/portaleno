import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  History, 
  Wallet, 
  Percent, 
  LogOut,
  Package,
  Calculator,
  Warehouse,
  Factory,
  BarChart3,
  TrendingUp,
  Settings,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
  };

  const getCategories = () => {
    if (user?.perfil === 'gerente') {
      return [
        {
          title: 'Principal',
          items: [{ id: 'dashboard', label: 'Início', icon: LayoutDashboard }]
        },
        {
          title: 'Vendas',
          items: [
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
            { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
            { id: 'notas-fiscais', label: 'Notas Fiscais', icon: Receipt },
          ]
        },
        {
          title: 'Produção',
          items: [
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'producao', label: 'Produção', icon: Factory },
          ]
        },
        {
          title: 'Financeiro',
          items: [
            { id: 'despesas', label: 'Despesas', icon: Wallet },
            { id: 'comissoes', label: 'Comissões', icon: Percent },
            { id: 'dre', label: 'DRE', icon: TrendingUp },
            { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
            { id: 'financeiro-pessoal', label: 'Meu Financeiro', icon: CreditCard },
            { id: 'configuracoes', label: 'Ajustes', icon: Settings },
          ]
        }
      ];
    }

    if (user?.perfil === 'producao') {
      return [
        {
          title: 'Operacional',
          items: [
            { id: 'producao', label: 'Centro de Produção', icon: Factory },
            { id: 'despesas', label: 'Lançar Despesas', icon: Wallet },
          ]
        }
      ];
    }

    // Default: Representante
    return [
      {
        title: 'Principal',
        items: [{ id: 'dashboard', label: 'Meu Início', icon: LayoutDashboard }]
      },
      {
        title: 'Vendas',
        items: [
          { id: 'clientes', label: 'Clientes', icon: Users },
          { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
          { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
          { id: 'notas-fiscais', label: 'Notas', icon: Receipt },
        ]
      },
      {
        title: 'Financeiro',
        items: [
          { id: 'despesas', label: 'Despesas Pessoais', icon: Wallet },
          { id: 'comissoes', label: 'Minhas Comissões', icon: Percent },
        ]
      }
    ];
  };

  const categories = getCategories();

  return (
    <div className="w-72 bg-primary text-white h-screen sticky top-0 flex flex-col shadow-2xl z-20 hide-on-print">
      <div className="p-8 border-b border-secondary/30">
        <h2 className="text-2xl font-bold tracking-tighter">GRUPO</h2>
        <h3 className="text-lg font-light text-accent/80 tracking-widest -mt-1 uppercase text-xs opacity-70">ENO</h3>
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
                    <span className="text-sm">{item.label}</span>
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
