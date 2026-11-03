import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Bloco de conteúdo da área de trabalho: papel com hairline, título e um link de saída opcional.
 * Um recurso de separação só (borda fina) — sem sombra e sem ícone decorativo.
 */
export function Painel({
  titulo,
  contexto,
  link,
  children,
  className = '',
  semPadding,
}: {
  titulo: string;
  /** Texto curto à direita do título (ex.: período). */
  contexto?: React.ReactNode;
  link?: { rotulo: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
  /** Conteúdo encosta nas bordas (listas e tabelas). */
  semPadding?: boolean;
}) {
  return (
    <section className={`bg-papel border border-linha rounded-md min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-linha">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-[15px] font-bold tracking-[-0.01em] text-tinta truncate">{titulo}</h2>
          {contexto && <span className="text-[12px] text-cinza tabular-nums truncate">{contexto}</span>}
        </div>
        {link && (
          <button
            type="button"
            onClick={link.onClick}
            className="shrink-0 inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-eno-700 hover:text-eno-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro rounded"
          >
            {link.rotulo}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className={semPadding ? '' : 'p-4'}>{children}</div>
    </section>
  );
}
