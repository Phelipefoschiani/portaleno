import React from 'react';
import { GrupoEnoLogo } from './home/GrupoEnoLogo';

/**
 * FooterMinimal - Grupo ENO v13
 * Rodapé minimalista com a logo e a mensagem de todos os direitos reservados totalmente centralizados.
 */
export function FooterMinimal() {
  return (
    <footer id="contato" className="relative z-30 w-full bg-black text-slate-400 border-t border-neutral-800 shadow-inner">
      <div className="mx-auto w-full max-w-7xl px-6 py-6 sm:py-8 flex flex-col items-center justify-center text-center gap-3">
        
        {/* Logo Centralizada */}
        <div className="flex items-center justify-center">
          <GrupoEnoLogo variant="dark" size="sm" />
        </div>

        {/* Mensagem de Todos os Direitos Reservados Centralizada */}
        <div className="text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} Grupo ENO. Todos os direitos reservados.
        </div>

      </div>
    </footer>
  );
}
