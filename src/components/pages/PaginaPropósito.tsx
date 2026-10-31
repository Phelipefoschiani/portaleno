import React from 'react';
import { HeaderInstitucional } from '../home/HeaderInstitucional';
import { FooterMinimal } from '../FooterMinimal';
import { PaginaInstitucional } from '../../App';

interface PaginaPropósitoProps {
  onVoltar: () => void;
  onNavigatePortal: () => void;
  onNavigate?: (destino: 'HOME' | PaginaInstitucional) => void;
}

export function PaginaPropósito({ onVoltar, onNavigatePortal, onNavigate }: PaginaPropósitoProps) {
  return (
    <div className="min-h-screen md:h-screen md:max-h-screen w-full bg-[#f9fbfa] text-slate-900 flex flex-col justify-between font-sans selection:bg-emerald-600 selection:text-white md:overflow-hidden overflow-x-hidden">
      <HeaderInstitucional
        paginaAtual="PROPOSITO"
        onNavigate={onNavigate || (() => onVoltar())}
        onOpenPortal={onNavigatePortal}
      />

      {/* Hero / Banner de Propósito 100% Otimizado */}
      <section className="relative w-full bg-white overflow-hidden border-b border-slate-200/80 shadow-sm flex-1 flex items-center justify-center shrink-0">
        <div className="w-full flex flex-col lg:flex-row items-center lg:items-stretch h-auto lg:h-[540px] xl:h-[600px] overflow-hidden">
          
          {/* Lado Esquerdo: Banner Quadrado com a foto oficial */}
          <div className="w-full lg:w-auto h-[340px] sm:h-[440px] lg:h-full aspect-square shrink-0 relative overflow-hidden bg-slate-100 flex items-center justify-start">
            <img
              src="/proposito-banner.jpg?v=4"
              alt="Nosso Propósito - Grupo ENO"
              className="w-full h-full object-cover object-top select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Lado Direito: Texto maior com mais ênfase, centralizado e flexível com min-w-0 contra estouro */}
          <div className="flex-1 min-w-0 w-full bg-gradient-to-r from-white via-white/98 to-white/90 px-6 sm:px-12 lg:px-16 xl:px-20 py-10 lg:py-0 flex flex-col items-center justify-center text-center z-20">
            <div className="max-w-2xl w-full mx-auto space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] break-words">
                Desenvolver mercados. <br className="hidden sm:inline" />
                <span className="text-[#004e2e] drop-shadow-sm">Conectar oportunidades.</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-slate-700 leading-relaxed font-semibold max-w-xl mx-auto">
                Conectamos produtos, marcas, tecnologia e pessoas para transformar oportunidades em negócios sólidos e construir parcerias duradouras.
              </p>
            </div>
          </div>

        </div>
      </section>

      <FooterMinimal />
    </div>
  );
}
