import React, { useState, useEffect } from 'react';
import { LoginModal, DestinoAcesso } from './components/LoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { PortalAgricultor } from './components/portais/PortalAgricultor';
import { PortalRCA } from './components/portais/PortalRCA';
import { PortalConvidadoExclusivo } from './components/portfolio/PortalConvidadoExclusivo';
import { PortalControleSitio } from './components/portais/PortalControleSitio';
import { CadastroProducao } from './components/cadastros/CadastroProducao';
import { LandingPage } from './components/home/LandingPage';
import { PaginaPropósito } from './components/pages/PaginaPropósito';
import { PaginaNegocios } from './components/pages/PaginaNegocios';
import { PaginaFornecedores } from './components/pages/PaginaFornecedores';
import { PaginaTrabalhe } from './components/pages/PaginaTrabalhe';
import { PaginaSustentabilidade } from './components/pages/PaginaSustentabilidade';
import { PaginaContato } from './components/pages/PaginaContato';
import { CADASTROS_PROVISORIOS_INICIAIS } from './data/portfolioData';
import { testarConexaoFirestore } from './lib/firebase';
import { sincronizarTodasColecoesFirestore } from './lib/firestoreSync';
import {
  carregarEstoqueProdutos,
  carregarMateriaPrima,
  carregarReceitas,
  carregarFichasTecnicas,
  carregarTabelasPreco
} from './data/produtosData';
import { carregarPedidosVenda } from './data/pedidosVendaData';

export type PaginaInstitucional = 'PROPOSITO' | 'NEGOCIOS' | 'FORNECEDORES' | 'TRABALHE' | 'SUSTENTABILIDADE' | 'CONTATO';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  
  // Controle de rota / tela dedicada ativa
  const [telaAtiva, setTelaAtiva] = useState<'HOME' | DestinoAcesso | PaginaInstitucional>('HOME');

  useEffect(() => {
    // Garantia de sistema zerado solicitado pelo usuário
    const jaLimpou = localStorage.getItem('grupo_eno_limpeza_inicial_v1');
    if (!jaLimpou) {
      localStorage.clear();
      localStorage.setItem('grupo_eno_modo_limpo_v1', 'true');
      localStorage.setItem('grupo_eno_limpeza_inicial_v1', 'true');
      window.location.reload();
      return;
    }

    testarConexaoFirestore().then(() => {
      sincronizarTodasColecoesFirestore({
        produtos: carregarEstoqueProdutos(),
        materias: carregarMateriaPrima(),
        receitas: carregarReceitas(),
        fichas: carregarFichasTecnicas(),
        tabelas: carregarTabelasPreco(),
        pedidosVenda: carregarPedidosVenda()
      });
    });
  }, []);

  const handleLoginSuccess = (destino: DestinoAcesso = 'ADMIN') => {
    setTelaAtiva(destino);
  };

  const handleVoltarHome = () => {
    setTelaAtiva('HOME');
  };

  // Renderizador principal com LoginModal sempre disponível em qualquer tela
  return (
    <>
      {telaAtiva === 'PROPOSITO' && (
        <PaginaPropósito onVoltar={handleVoltarHome} onNavigatePortal={() => setIsLoginOpen(true)} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'NEGOCIOS' && (
        <PaginaNegocios onVoltar={handleVoltarHome} onNavigatePortal={() => setIsLoginOpen(true)} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'FORNECEDORES' && (
        <PaginaFornecedores onVoltar={handleVoltarHome} onNavigatePortal={() => setIsLoginOpen(true)} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'TRABALHE' && (
        <PaginaTrabalhe onVoltar={handleVoltarHome} onNavigatePortal={() => setIsLoginOpen(true)} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'SUSTENTABILIDADE' && (
        <PaginaSustentabilidade onVoltar={handleVoltarHome} onNavigatePortal={() => setIsLoginOpen(true)} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'CONTATO' && (
        <PaginaContato onVoltar={handleVoltarHome} onNavigatePortal={() => setIsLoginOpen(true)} onNavigate={setTelaAtiva} />
      )}

      {/* 1. Portal dos Agricultores (Fornecedores de Mandioca) */}
      {telaAtiva === 'AGRICULTOR' && <PortalAgricultor onVoltar={handleVoltarHome} />}

      {/* 2. Portal do RCA (Representante Comercial Autônomo) */}
      {telaAtiva === 'RCA' && <PortalRCA onVoltar={handleVoltarHome} />}

      {/* 3. Portal do Cadastro Provisório (Portfólio / VIP) */}
      {telaAtiva === 'PROVISORIO' && (
        <div className="min-h-screen bg-[#02130b] text-white flex flex-col">
          <PortalConvidadoExclusivo
            cadastro={CADASTROS_PROVISORIOS_INICIAIS[0]}
            onVoltar={handleVoltarHome}
          />
        </div>
      )}

      {/* 4. Cadastro Produção (Página dedicada para a equipe da fábrica) */}
      {telaAtiva === 'PRODUCAO' && (
        <div className="min-h-screen bg-[#f4f8f5] flex flex-col">
          <header className="bg-[#022013] text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handleVoltarHome}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                ← Voltar ao Início
              </button>
              <div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Grupo ENO · Chão de Fábrica</div>
                <h1 className="text-base sm:text-lg font-black text-white">Cadastro e Gestão da Produção</h1>
              </div>
            </div>
          </header>
          <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <CadastroProducao />
          </div>
        </div>
      )}

      {/* 5. Cadastro Controle do Sítio (Mandiocultura & Talhões) */}
      {telaAtiva === 'SITIO' && <PortalControleSitio onVoltar={handleVoltarHome} />}

      {/* 6. Painel Geral Administrativo (Visão Geral, Pedidos, Produtos, Financeiro, etc.) */}
      {telaAtiva === 'ADMIN' && <AdminDashboard onLogout={handleVoltarHome} />}

      {/* TELA INICIAL (Landing Page Corporativa) */}
      {telaAtiva === 'HOME' && (
        <LandingPage
          onOpenPortal={() => setIsLoginOpen(true)}
          onNavigateDirect={(destino) => setTelaAtiva(destino as any)}
        />
      )}

      {/* Modal de Autenticação e Escolha de Portais (Globalmente Disponível em Todas as Páginas) */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
