import React from 'react';
import { HeaderInstitucional } from '../home/HeaderInstitucional';
import { FooterMinimal } from '../FooterMinimal';
import { PaginaInstitucional } from '../../App';

interface PaginaSustentabilidadeProps {
  onVoltar: () => void;
  onNavigatePortal: () => void;
  onNavigate?: (destino: 'HOME' | PaginaInstitucional) => void;
}

export function PaginaSustentabilidade({ onVoltar, onNavigatePortal, onNavigate }: PaginaSustentabilidadeProps) {
  return (
    <div className="min-h-screen md:h-screen md:max-h-screen w-full bg-[#f9fbfa] text-slate-900 flex flex-col justify-between font-sans selection:bg-emerald-600 selection:text-white md:overflow-hidden overflow-x-hidden">
      <HeaderInstitucional
        paginaAtual="SUSTENTABILIDADE"
        onNavigate={onNavigate || (() => onVoltar())}
        onOpenPortal={onNavigatePortal}
      />

      {/* Hero / Banner Assimétrico Ecológico */}
      <section className="relative w-full bg-[#f4f7f5] overflow-hidden border-b border-slate-200/80 shadow-sm flex-1 flex items-center justify-center shrink-0">
        <div className="relative w-full max-w-[1440px] mx-auto min-h-[440px] sm:min-h-[500px] lg:min-h-[540px] flex flex-col lg:flex-row items-stretch">
          
          <div className="w-full lg:w-[50%] bg-gradient-to-r from-white via-white/98 to-white/90 px-8 sm:px-12 lg:px-16 py-12 lg:py-20 flex flex-col justify-center z-20">
            <div className="inline-block mb-3">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                COMPROMISSO VERDE & ESG
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
              Práticas responsáveis <br />
              no campo e na <br />
              <span className="text-[#004e2e]">agroindústria.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed font-medium">
              Unimos alta eficiência industrial e preservação ambiental através de economia circular, tratamento avançado de recursos e respeito à biodiversidade regional.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#004e2e] animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Desenvolvimento Sustentável Certificado</span>
              </div>
            </div>
          </div>

          <div className="relative lg:flex-1 h-[300px] lg:h-auto overflow-hidden z-10">
            <img
              src="/assets/hero/transporte.jpg"
              alt="Sustentabilidade e Logística Verde Grupo ENO"
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </div>
  );
}
