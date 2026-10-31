import React from 'react';

const DEFAULT_BANNER_URL = '/banner.jpg?v=4';

export function HeroBanner() {
  return (
    <div className="relative w-full bg-[#f9fbfa] text-slate-900 select-none shrink-0 overflow-hidden">
      {/* Container do Banner com transição superior mais profunda e orgânica na foto */}
      <div className="relative w-full overflow-hidden">
        
        {/* Gradiente superior mais suave e profundo para entrar naturalmente na foto sem parecer linear */}
        <div className="absolute inset-x-0 top-0 h-20 sm:h-28 bg-gradient-to-b from-[#f9fbfa] via-[#f9fbfa]/70 to-transparent pointer-events-none z-10" />

        <img
          src={DEFAULT_BANNER_URL}
          alt="Banner Principal Grupo ENO"
          className="w-full h-auto block select-none"
          referrerPolicy="no-referrer"
        />

        {/* Gradiente inferior de esmaecimento (blend com a tela branca/fundo) */}
        <div className="absolute inset-x-0 bottom-0 h-12 sm:h-20 bg-gradient-to-t from-[#f9fbfa] via-[#f9fbfa]/60 to-transparent pointer-events-none z-10" />

      </div>
    </div>
  );
}
