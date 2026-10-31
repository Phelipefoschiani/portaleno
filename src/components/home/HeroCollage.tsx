import React from 'react';

/**
 * HeroCollage - Banner panorâmico idêntico ao oficial do Grupo ENO enviado pelo usuário
 */
export function HeroCollage() {
  return (
    <div className="relative w-full bg-[#f4f7f5] overflow-hidden select-none border-b border-emerald-900/10 shadow-xl">
      {/* Container principal estilo banner panorâmico */}
      <div className="relative w-full max-w-[1440px] mx-auto min-h-[420px] sm:min-h-[480px] lg:min-h-[520px] flex flex-col lg:flex-row items-stretch">
        
        {/* Lado Esquerdo: Bloco de Texto Corporativo */}
        <div className="w-full lg:w-[46%] bg-gradient-to-r from-white via-white/98 to-white/80 lg:bg-gradient-to-r lg:from-white lg:via-white lg:to-transparent px-8 sm:px-12 py-10 lg:py-16 flex flex-col justify-center z-20">
          <div className="inline-block mb-3">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-xs">
              GRUPO ENO
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
            Desenvolvimento <br />
            de Mercados <br />
            <span className="text-[#004e2e]">e Novos Negócios.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed font-normal">
            Conectamos produtos, marcas, tecnologia e pessoas para gerar oportunidades reais e duradouras.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#004e2e] animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ecossistema Agroindustrial Integrado</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Colagem Fotográfica Profissional com iluminação dourada (Empilhadeira, Parceria, Logística) */}
        <div className="absolute inset-0 lg:relative lg:flex-1 grid grid-cols-3 gap-1 p-2 lg:p-0 pointer-events-none opacity-40 lg:opacity-100 z-10">
          {/* Imagem 1: Empilhadeira / Armazém */}
          <div className="relative overflow-hidden h-full">
            <img
              src="/assets/hero/empilhadeira.jpg"
              alt="Armazém e Operação Logística"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"></div>
          </div>

          {/* Imagem 2: Aperto de mãos corporativo */}
          <div className="relative overflow-hidden h-full">
            <img
              src="/assets/hero/aperto_mao.jpg"
              alt="Parceria e Negócios"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"></div>
          </div>

          {/* Imagem 3: Transporte / Caminhão na estrada */}
          <div className="relative overflow-hidden h-full">
            <img
              src="/assets/hero/transporte.jpg"
              alt="Logística e Distribuição"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"></div>
          </div>
        </div>

        {/* Sobreposição de Gradiente para mesclar esquerda e direita perfeitamente */}
        <div className="hidden lg:block absolute inset-y-0 left-[42%] w-[18%] bg-gradient-to-r from-white via-white/50 to-transparent pointer-events-none z-15"></div>
      </div>
    </div>
  );
}


