import React, { useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { PaginaInstitucional } from '../../App';
import { GrupoEnoLogo } from './GrupoEnoLogo';

interface HeaderInstitucionalProps {
  paginaAtual: PaginaInstitucional | 'HOME';
  onNavigate: (destino: 'HOME' | PaginaInstitucional) => void;
  onOpenPortal: () => void;
}

export function HeaderInstitucional({ paginaAtual, onNavigate, onOpenPortal }: HeaderInstitucionalProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: PaginaInstitucional | 'HOME'; label: string }[] = [
    { id: 'HOME', label: 'Início' },
    { id: 'PROPOSITO', label: 'Nosso Propósito' },
    { id: 'NEGOCIOS', label: 'Nossos Negócios' },
    { id: 'SUSTENTABILIDADE', label: 'Sustentabilidade' },
    { id: 'TRABALHE', label: 'Trabalhe Conosco' },
  ];

  return (
    <header className="relative w-full bg-gradient-to-b from-neutral-900 via-black to-neutral-950 backdrop-blur-2xl text-white border-b border-neutral-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),inset_0_-1px_0_0_rgba(255,255,255,0.08)] sticky top-0 z-50 shadow-2xl shadow-black/60 transition-all overflow-hidden">
      
      {/* 1. Reflexo de vidro especular fino 3D na linha de cima */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none z-30" />
      <div className="absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-white/[0.15] via-white/[0.04] to-transparent pointer-events-none z-10" />

      <div className="relative z-20 w-full h-20 flex items-stretch justify-between pl-5 sm:pl-8 lg:pl-12 pr-0">
        
        {/* Esquerda: Logo + Menus de Navegação com espaçamento generoso */}
        <div className="flex items-center gap-10 lg:gap-14 py-3">
          {/* Logo Grupo ENO com margem de respiro */}
          <div 
            className="cursor-pointer shrink-0 transition-transform duration-200 hover:scale-[1.02] mr-2 lg:mr-4" 
            onClick={() => onNavigate('HOME')}
          >
            <GrupoEnoLogo variant="dark" size="md" />
          </div>

          {/* Nav Links Desktop - Fonte Maior e Mais Nítida, separados por divisória branca */}
          <nav className="hidden xl:flex items-center gap-5 lg:gap-6 text-base lg:text-[17px] font-bold text-slate-100">
            {navItems.map((item, index) => {
              const ativo = paginaAtual === item.id;
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && (
                    <div 
                      className="h-5 w-[1px] bg-white/30 shrink-0 self-center" 
                      aria-hidden="true" 
                    />
                  )}
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`transition-all duration-150 cursor-pointer px-1 py-1 tracking-tight ${
                      ativo
                        ? 'text-emerald-400 font-extrabold border-b-2 border-emerald-400 scale-[1.02]'
                        : 'hover:text-white hover:scale-[1.02]'
                    }`}
                  >
                    {item.label}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Direita: Botão ACESSO AO PORTAL */}
        <div className="flex items-stretch h-full">
          <button
            onClick={onOpenPortal}
            className="
              relative group overflow-hidden
              h-full px-6 sm:px-9
              flex items-center gap-3
              bg-transparent hover:bg-white/[0.08] active:bg-black/20
              text-white text-xs sm:text-[13px] font-extrabold tracking-wider uppercase
              transition-all duration-200 cursor-pointer shrink-0
              border-l border-white/20
            "
            title="Acesso ao Portal"
          >
            {/* Linha de reflexo superior do botão */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent pointer-events-none" />

            {/* Brilho e reflexo de luz varrendo o botão no hover */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

            {/* Ícone de Usuário sem quadrado em volta */}
            <User className="w-4 h-4 text-white stroke-[2.2] shrink-0 group-hover:scale-110 group-hover:text-emerald-300 transition-all duration-200" />

            <span className="whitespace-nowrap font-black tracking-wider group-hover:text-emerald-300 transition-colors">
              ACESSO AO PORTAL
            </span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden px-4 sm:px-5 flex items-center justify-center bg-transparent hover:bg-white/10 text-white transition-colors cursor-pointer border-l border-white/20"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-neutral-950 border-t border-neutral-800 px-6 py-6 space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left py-2 text-base font-bold ${
                paginaAtual === item.id ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
