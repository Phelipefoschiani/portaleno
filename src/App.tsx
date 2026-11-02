import React, { useState, useEffect, useCallback } from 'react';
import { LoginModal, DestinoAcesso } from './components/LoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { PortalAgricultor } from './components/portais/PortalAgricultor';
import { PortalRCA } from './components/portais/PortalRCA';
import { PortalConvidadoExclusivo } from './components/portfolio/PortalConvidadoExclusivo';
import { PortalControleSitio } from './components/portais/PortalControleSitio';
import { PortalProducao } from './components/producao/PortalProducao';
import { LandingPage } from './components/home/LandingPage';
import { PaginaPropósito } from './components/pages/PaginaPropósito';
import { PaginaNegocios } from './components/pages/PaginaNegocios';
import { PaginaFornecedores } from './components/pages/PaginaFornecedores';
import { PaginaTrabalhe } from './components/pages/PaginaTrabalhe';
import { PaginaSustentabilidade } from './components/pages/PaginaSustentabilidade';
import { PaginaContato } from './components/pages/PaginaContato';
import { executarLimpezaInicialSeNecessario } from './data/sistemaReset';
import {
  carregarCadastrosProvisorios,
  EVENTO_CADASTROS_ATUALIZADOS,
} from './data/cadastrosData';
import type { CadastroProvisorio } from './data/portfolioData';
import {
  obterSessao,
  encerrarSessao,
  podeAcessar,
  SessaoUsuario,
  EVENTO_AUTH_ATUALIZADO,
} from './lib/auth';

export type PaginaInstitucional = 'PROPOSITO' | 'NEGOCIOS' | 'FORNECEDORES' | 'TRABALHE' | 'SUSTENTABILIDADE' | 'CONTATO';

const PORTAIS: DestinoAcesso[] = ['ADMIN', 'AGRICULTOR', 'RCA', 'PROVISORIO', 'PRODUCAO', 'SITIO'];
const ehPortal = (t: string): t is DestinoAcesso => (PORTAIS as string[]).includes(t);

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Sessão autenticada (restaurada do sessionStorage ao recarregar, se ainda válida)
  const [sessao, setSessao] = useState<SessaoUsuario | null>(() => obterSessao());

  // Controle de rota / tela dedicada ativa (com sessão válida, reabre o portal do usuário)
  const [telaAtiva, setTelaAtiva] = useState<'HOME' | DestinoAcesso | PaginaInstitucional>(
    () => obterSessao()?.perfil || 'HOME'
  );

  // Portal desejado antes do login (aberto após autenticar, se o perfil permitir)
  const [destinoPendente, setDestinoPendente] = useState<DestinoAcesso | null>(null);

  useEffect(() => {
    // Limpeza única dos dados fictícios antigos (preserva usuários 'grupo_eno_auth_*')
    if (executarLimpezaInicialSeNecessario()) {
      window.location.reload();
      return;
    }
  }, []);

  // Mantém a sessão em dia (expiração de 8h, usuário desativado/alterado pelo admin)
  useEffect(() => {
    const atualizar = () => setSessao(obterSessao());
    window.addEventListener(EVENTO_AUTH_ATUALIZADO, atualizar);
    window.addEventListener('storage', atualizar);
    const timer = window.setInterval(atualizar, 60 * 1000);
    return () => {
      window.removeEventListener(EVENTO_AUTH_ATUALIZADO, atualizar);
      window.removeEventListener('storage', atualizar);
      window.clearInterval(timer);
    };
  }, []);

  // Sem sessão (ou sem permissão) nenhum portal fica aberto
  useEffect(() => {
    if (ehPortal(telaAtiva) && !podeAcessar(sessao, telaAtiva)) {
      setTelaAtiva('HOME');
    }
  }, [sessao, telaAtiva]);

  // Cadastros provisórios (Portal VIP), lidos do armazenamento
  const [cadastrosProvisorios, setCadastrosProvisorios] = useState<CadastroProvisorio[]>(() => carregarCadastrosProvisorios());
  useEffect(() => {
    const h = () => setCadastrosProvisorios(carregarCadastrosProvisorios());
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, h);
    return () => window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, h);
  }, []);
  const [cadastroVipAdminId, setCadastroVipAdminId] = useState<string>('');

  const handleLoginSuccess = (destino: DestinoAcesso) => {
    const s = obterSessao();
    setSessao(s);
    const alvo = destinoPendente && podeAcessar(s, destinoPendente) ? destinoPendente : destino;
    setDestinoPendente(null);
    setTelaAtiva(podeAcessar(s, alvo) ? alvo : 'HOME');
  };

  const handleVoltarHome = () => {
    setTelaAtiva('HOME');
  };

  // Sair/voltar de qualquer portal encerra a sessão
  const handleSair = useCallback(() => {
    encerrarSessao();
    setSessao(null);
    setTelaAtiva('HOME');
  }, []);

  // Já logado: volta direto ao portal do usuário; senão abre o login
  const abrirLogin = () => {
    const s = obterSessao();
    if (s) {
      setSessao(s);
      setTelaAtiva(s.perfil);
      return;
    }
    setIsLoginOpen(true);
  };

  // Navegação direta da Landing Page: portal só com sessão e perfil compatível
  const handleNavigateDirect = (destino: string) => {
    if (ehPortal(destino)) {
      if (podeAcessar(sessao, destino)) {
        setTelaAtiva(destino);
      } else {
        setDestinoPendente(destino);
        setIsLoginOpen(true);
      }
      return;
    }
    setTelaAtiva(destino as PaginaInstitucional);
  };

  const autorizado = (d: DestinoAcesso) => podeAcessar(sessao, d);
  const ehAdmin = sessao?.perfil === 'ADMIN';

  // Cadastro do Portal VIP: o vínculo da sessão; o ADMIN pode escolher qual visualizar
  const cadastroVipId = ehAdmin ? cadastroVipAdminId : (sessao?.vinculo_id || '');
  const cadastroVip = cadastrosProvisorios.find(c => c.id === cadastroVipId);

  // Renderizador principal com LoginModal sempre disponível em qualquer tela
  return (
    <>
      {telaAtiva === 'PROPOSITO' && (
        <PaginaPropósito onVoltar={handleVoltarHome} onNavigatePortal={abrirLogin} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'NEGOCIOS' && (
        <PaginaNegocios onVoltar={handleVoltarHome} onNavigatePortal={abrirLogin} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'FORNECEDORES' && (
        <PaginaFornecedores onVoltar={handleVoltarHome} onNavigatePortal={abrirLogin} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'TRABALHE' && (
        <PaginaTrabalhe onVoltar={handleVoltarHome} onNavigatePortal={abrirLogin} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'SUSTENTABILIDADE' && (
        <PaginaSustentabilidade onVoltar={handleVoltarHome} onNavigatePortal={abrirLogin} onNavigate={setTelaAtiva} />
      )}
      {telaAtiva === 'CONTATO' && (
        <PaginaContato onVoltar={handleVoltarHome} onNavigatePortal={abrirLogin} onNavigate={setTelaAtiva} />
      )}

      {/* 1. Portal dos Agricultores (Fornecedores de Mandioca) */}
      {telaAtiva === 'AGRICULTOR' && autorizado('AGRICULTOR') && (
        <PortalAgricultor
          onVoltar={handleSair}
          agricultorId={sessao?.perfil === 'AGRICULTOR' ? sessao.vinculo_id : undefined}
          permitirSelecaoAdmin={ehAdmin}
        />
      )}

      {/* 2. Portal do RCA (Representante Comercial Autônomo) */}
      {telaAtiva === 'RCA' && autorizado('RCA') && (
        <PortalRCA
          onVoltar={handleSair}
          rcaId={sessao?.perfil === 'RCA' ? sessao.vinculo_id : undefined}
          permitirSelecaoAdmin={ehAdmin}
        />
      )}

      {/* 3. Portal do Cadastro Provisório (Portfólio / VIP) */}
      {telaAtiva === 'PROVISORIO' && autorizado('PROVISORIO') && (
        <div className="min-h-screen bg-[#02130b] text-white flex flex-col">
          {ehAdmin && (
            <div className="bg-amber-500/10 border-b border-amber-400/40 px-4 py-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-amber-200">Administrador · visualizar cadastro:</span>
              <select
                value={cadastroVipId}
                onChange={e => setCadastroVipAdminId(e.target.value)}
                className="bg-[#041d13] border border-amber-400/40 text-amber-100 rounded-lg px-2 py-1 font-bold"
              >
                <option value="">Escolha um cadastro provisório</option>
                {cadastrosProvisorios.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_convidado} · {c.empresa_solicitante}</option>
                ))}
              </select>
            </div>
          )}
          {cadastroVip ? (
            <React.Fragment key={cadastroVip.id}>
              <PortalConvidadoExclusivo
                cadastro={cadastroVip}
                onVoltar={handleSair}
                onNovoPedidoRealizado={() => setCadastrosProvisorios(carregarCadastrosProvisorios())}
              />
            </React.Fragment>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <h2 className="text-xl font-black text-white">Usuário sem cadastro provisório vinculado</h2>
              <p className="text-sm text-emerald-200/80 max-w-md">
                {ehAdmin
                  ? 'Selecione um cadastro provisório acima para visualizar o portal.'
                  : 'Peça ao administrador para vincular seu usuário a um cadastro provisório em "Usuários e Acessos".'}
              </p>
              <button
                onClick={handleSair}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold text-white cursor-pointer"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Cadastro Produção (Página dedicada para a equipe da fábrica) */}
      {telaAtiva === 'PRODUCAO' && autorizado('PRODUCAO') && (
        <div className="min-h-screen bg-[#f4f8f5] flex flex-col">
          <header className="bg-[#022013] text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSair}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                ← Sair
              </button>
              <div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Grupo ENO · Chão de Fábrica</div>
                <h1 className="text-base sm:text-lg font-black text-white">Produção: Ordens e Colaboradores</h1>
              </div>
            </div>
          </header>
          <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <PortalProducao />
          </div>
        </div>
      )}

      {/* 5. Cadastro Controle do Sítio (Mandiocultura & Talhões) */}
      {telaAtiva === 'SITIO' && autorizado('SITIO') && <PortalControleSitio onVoltar={handleSair} />}

      {/* 6. Painel Geral Administrativo (Visão Geral, Pedidos, Produtos, Financeiro, etc.) */}
      {telaAtiva === 'ADMIN' && autorizado('ADMIN') && <AdminDashboard onLogout={handleSair} />}

      {/* TELA INICIAL (Landing Page Corporativa) */}
      {(telaAtiva === 'HOME' || (ehPortal(telaAtiva) && !autorizado(telaAtiva))) && (
        <LandingPage
          onOpenPortal={abrirLogin}
          onNavigateDirect={handleNavigateDirect}
        />
      )}

      {/* Modal de Autenticação (Globalmente Disponível em Todas as Páginas) */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setDestinoPendente(null);
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
