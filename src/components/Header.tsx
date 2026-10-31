import React from 'react';

type HeaderProps = {
  onOpenLogin: () => void;
};

/**
 * Header - Grupo ENO v13
 * Faixa de fora a fora (full width) em preto com sombra sobreposta.
 */
export function Header({ onOpenLogin }: HeaderProps) {
  return (
    <header className="w-full bg-black backdrop-blur-md text-white border-b border-neutral-800 shadow-lg shrink-0">
      <div className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
              GRUPO ENO
            </span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase mt-0.5">
              Agroindústria & Mandiocultura
            </span>
          </div>
        </div>

        {/* Action: Acessar o Sistema */}
        <div>
          <button
            onClick={onOpenLogin}
            className="
              inline-flex items-center justify-center gap-2.5
              rounded-xl
              bg-emerald-600 hover:bg-emerald-700
              border border-emerald-600
              px-5 py-2.5 sm:px-6 sm:py-2.5
              text-xs sm:text-sm font-bold text-white
              shadow-sm shadow-emerald-700/20
              transition-all duration-150
              hover:-translate-y-0.5
              active:translate-y-0
              cursor-pointer whitespace-nowrap
            "
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Acessar o Sistema</span>
          </button>
        </div>

      </div>
    </header>
  );
}
