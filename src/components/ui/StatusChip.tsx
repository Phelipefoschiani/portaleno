import React from 'react';

/** Tons com significado fixo. Não usar cor de status como enfeite. */
export type TomStatus = 'vencido' | 'pago' | 'aguardando' | 'producao' | 'neutro';

const TONS: Record<TomStatus, string> = {
  vencido: 'bg-st-vencido-bg text-st-vencido',
  pago: 'bg-st-pago-bg text-st-pago',
  aguardando: 'bg-st-aguardando-bg text-st-aguardando',
  producao: 'bg-st-producao-bg text-st-producao',
  neutro: 'bg-papel-3/70 text-tinta-2',
};

const PONTO: Record<TomStatus, string> = {
  vencido: 'bg-st-vencido',
  pago: 'bg-st-pago',
  aguardando: 'bg-ouro-escuro',
  producao: 'bg-st-producao',
  neutro: 'bg-cinza-claro',
};

/** Etiqueta de situação: ponto + texto curto, cantos discretos. */
export function StatusChip({ tom, children, className = '' }: { tom: TomStatus; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-[3px] text-[11px] font-semibold leading-tight whitespace-nowrap ${TONS[tom]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${PONTO[tom]}`} aria-hidden />
      {children}
    </span>
  );
}

/** Ponto de status isolado (para listas densas). */
export function PontoStatus({ tom }: { tom: TomStatus }) {
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${PONTO[tom]}`} aria-hidden />;
}
