import React, { useState } from 'react';
import { GrupoEnoLogo } from './GrupoEnoLogo';
import { HeaderInstitucional } from './HeaderInstitucional';
import { HeroBanner } from './HeroBanner';
import { HomeModal } from './HomeModals';

interface LandingPageProps {
  onOpenPortal: () => void;
  onNavigateDirect?: (destino: 'ADMIN' | 'AGRICULTOR' | 'RCA' | 'PRODUCAO' | 'SITIO' | 'PROPOSITO' | 'NEGOCIOS' | 'FORNECEDORES' | 'TRABALHE' | 'SUSTENTABILIDADE' | 'CONTATO') => void;
}

export function LandingPage({ onOpenPortal, onNavigateDirect }: LandingPageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'CONTATO' | 'TRABALHE' | 'PROPOSITO' | 'SUSTENTABILIDADE' | 'INFO'>('CONTATO');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');

  const abrirModal = (
    type: 'CONTATO' | 'TRABALHE' | 'PROPOSITO' | 'SUSTENTABILIDADE' | 'INFO',
    title?: string,
    subtitle?: string
  ) => {
    setModalType(type);
    setModalTitle(title || '');
    setModalSubtitle(subtitle || '');
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen w-full bg-[#f9fbfa] text-slate-800 flex flex-col justify-between font-sans selection:bg-emerald-600 selection:text-white md:overflow-hidden overflow-x-hidden">
      
      {/* 1. HEADER / TOP NAVBAR UNIFICADO */}
      <HeaderInstitucional
        paginaAtual="HOME"
        onNavigate={(dest) => {
          if (dest === 'HOME') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            onNavigateDirect?.(dest);
          }
        }}
        onOpenPortal={onOpenPortal}
      />

      {/* 2. HERO SECTION - BANNER PANORÂMICO 100% LARGURA */}
      <section className="w-full flex-1 flex items-center justify-center shrink-0">
        <HeroBanner />
      </section>

      {/* 3. FOOTER MINIMALISTA CENTRALIZADO */}
      <footer className="w-full bg-black text-slate-400 border-t border-neutral-800 py-4 px-4 sm:px-6 shrink-0">
        <div className="max-w-[1440px] mx-auto flex flex-col items-center justify-center text-center gap-2.5">
          <div className="flex items-center justify-center">
            <GrupoEnoLogo variant="dark" size="md" />
          </div>
          <div className="text-slate-400 text-center text-xs">
            © {new Date().getFullYear()} Grupo ENO. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Modal Interativo para Links e Formulários */}
      <HomeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        title={modalTitle}
        subtitle={modalSubtitle}
        onOpenPortal={onOpenPortal}
      />

    </div>
  );
}
