import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import { Menu } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Fornecedores from './components/Fornecedores';
import Produtos from './components/Produtos';
import PedidosOrcamentos from './components/PedidosOrcamentos';
import ProducaoPainel from './components/ProducaoPainel';
import Despesas from './components/Despesas';
import ControleNFs from './components/ControleNFs';
import AReceber from './components/AReceber';
import Objetivo from './components/Objetivo';
import { DRE } from './components/DRE';
import Configuracoes from './components/Configuracoes';
import Eventos from './components/Eventos';
import GrupoEnoLanding from './components/GrupoEnoLanding';
import { GlobalStateProvider } from './GlobalStateContext';
import { AnimatePresence, motion } from 'motion/react';

const getCompanyTheme = (empresa: string) => {
  switch (empresa) {
    case 'bigorna':
      return {
        primary: '#475569', // Slate 600
        secondary: '#64748b', // Slate 500
        accent: '#e2e8f0', // Slate 200
      };
    case 'sitio':
      return {
        primary: '#5c3d2e', // Deep Earth Brown
        secondary: '#8b5a2b', // Light Brown
        accent: '#f5ebe0', // Warm Sand / Cream
      };
    case 'empana':
      return {
        primary: '#c2410c', // Orange 700
        secondary: '#f97316', // Orange 500
        accent: '#ffedd5', // Orange 100
      };
    case 'estancia':
    default:
      return {
        primary: '#1b4332', // Verde Escuro
        secondary: '#40916c', // Verde Claro
        accent: '#d8f3dc', // Verde Claríssimo
      };
  }
};

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showPortal, setShowPortal] = useState(false);
  const [activeTab, setActiveTab ] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [empresa, setEmpresa] = useState('estancia');

  React.useEffect(() => {
    if (user && user.perfil === 'producao' && activeTab === 'dashboard') {
      setActiveTab('producao');
    }
  }, [user, activeTab]);

  React.useEffect(() => {
    if (!user) {
      setShowPortal(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!showPortal && !user) {
    return <GrupoEnoLanding onEnterPortal={() => setShowPortal(true)} isLoggedIn={false} />;
  }

  if (!user) {
    return <LoginPage onBackToSite={() => setShowPortal(false)} />;
  }

  const theme = getCompanyTheme(empresa);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard setActiveTab={setActiveTab} empresa={empresa} />;
      case 'clientes':
        return <Clientes empresa={empresa} />;
      case 'fornecedores':
        return <Fornecedores empresa={empresa} />;
      case 'produtos':
        return <Produtos empresa={empresa} />;
      case 'pedidos':
        return <PedidosOrcamentos empresa={empresa} setActiveTab={setActiveTab} />;
      case 'producao':
        return <ProducaoPainel empresa={empresa} />;
      case 'despesas':
        return <Despesas empresa={empresa} />;
      case 'controle-nf':
        return <ControleNFs empresa={empresa} />;
      case 'a-receber':
        return <AReceber empresa={empresa} />;
      case 'objetivo':
        return <Objetivo empresa={empresa} />;
      case 'dre':
        return <DRE empresa={empresa} />;
      case 'configuracoes':
        return <Configuracoes empresa={empresa} />;
      case 'eventos':
        return <Eventos />;
      default: return <Dashboard setActiveTab={setActiveTab} empresa={empresa} />;
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-background relative transition-colors duration-300"
      style={{
        '--primary': theme.primary,
        '--secondary': theme.secondary,
        '--accent': theme.accent,
      } as React.CSSProperties}
    >
      <div className={`fixed inset-0 bg-primary/40 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setSidebarOpen(false)} />
      
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} empresa={empresa} setEmpresa={setEmpresa} />
      </div>

      <main className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 lg:hidden text-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg lg:text-xl font-semibold text-primary capitalize">
              {activeTab.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user.nome}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{user.perfil}</p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold">
              {user.nome.charAt(0)}
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalStateProvider>
        <AppContent />
      </GlobalStateProvider>
    </AuthProvider>
  );
}
