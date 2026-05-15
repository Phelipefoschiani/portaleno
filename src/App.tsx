/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import { Menu } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Pedidos from './components/Pedidos';
import Orcamentos from './components/Orcamentos';
import NotasFiscais from './components/NotasFiscais';
import Despesas from './components/Despesas';
import Comissoes from './components/Comissoes';
import Produtos from './components/Produtos';
import Producao from './components/Producao';
import Estoque from './components/Estoque';
import DRE from './components/DRE';
import Relatorios from './components/Relatorios';
import FinanceiroPessoal from './components/FinanceiroPessoal';
import Configuracoes from './components/Configuracoes';
import { GlobalStateProvider } from './GlobalStateContext';
import { AnimatePresence, motion } from 'motion/react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set default tab for production profile if current tab is dashboard
  React.useEffect(() => {
    if (user?.perfil === 'producao' && activeTab === 'dashboard') {
      setActiveTab('producao');
    }
  }, [user, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        if (user?.perfil === 'producao') return <Producao />;
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'clientes': return <Clientes />;
      case 'pedidos': return <Pedidos />;
      case 'orcamentos': return <Orcamentos />;
      case 'notas-fiscais': return <NotasFiscais />;
      case 'despesas': return <Despesas />;
      case 'comissoes': return <Comissoes />;
      case 'produtos': return <Produtos />;
      case 'estoque': return <Estoque />;
      case 'producao': return <Producao />;
      case 'dre': return <DRE />;
      case 'relatorios': return <Relatorios />;
      case 'financeiro-pessoal': return <FinanceiroPessoal />;
      case 'configuracoes': return <Configuracoes />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background print:block print:bg-white relative">
      <div className={`fixed inset-0 bg-primary/40 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setSidebarOpen(false)} />
      
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />
      </div>

      <main className="flex-1 overflow-auto print:overflow-visible print:bg-white">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm hide-on-print">
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
        <div className="p-4 lg:p-8 print:p-0">
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
