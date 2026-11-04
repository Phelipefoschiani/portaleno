import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { TomStatus } from '../ui/StatusChip';

/**
 * Peças de formulário e modal da frente Financeiro, no padrão papel/tinta.
 * No celular os modais abrem em tela cheia, com os botões num rodapé fixo.
 */

/** Campo de texto/data/select: 44px no celular, 40px a partir de sm. */
export const campo =
  'w-full h-11 sm:h-10 rounded-md border border-linha-forte bg-papel px-3 text-[15px] sm:text-[13.5px] text-tinta tabular-nums placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15 disabled:bg-papel-2 disabled:text-cinza';

/** Área de texto com a mesma pele do campo. */
export const campoArea =
  'w-full min-h-[88px] rounded-md border border-linha-forte bg-papel px-3 py-2.5 text-[15px] sm:text-[13.5px] text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15 resize-y';

export const rotuloCampo = 'block text-[11px] font-bold uppercase tracking-[0.1em] text-cinza mb-1.5';

/** Rótulo + controle + dica opcional. */
export function Campo({
  rotulo,
  dica,
  className = '',
  children,
}: {
  rotulo: React.ReactNode;
  dica?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={rotuloCampo}>{rotulo}</span>
      {children}
      {dica && <span className="block mt-1 text-[11.5px] text-cinza leading-snug">{dica}</span>}
    </label>
  );
}

/** Título de grupo dentro de um formulário. */
export function GrupoForm({ titulo, children, className = '' }: { titulo?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`min-w-0 ${className}`}>
      {titulo && (
        <legend className="w-full mb-3 pb-1.5 border-b border-linha text-[12px] font-bold uppercase tracking-[0.12em] text-tinta-2">
          {titulo}
        </legend>
      )}
      {children}
    </fieldset>
  );
}

/**
 * Modal do Financeiro. Celular: tela cheia, rodapé fixo com botões largos.
 * Desktop: folha central com rolagem interna. Com `onSubmit` vira <form>.
 */
export function ModalFolha({
  titulo,
  subtitulo,
  onFechar,
  onSubmit,
  rodape,
  children,
  largura = 'sm:max-w-3xl',
  zIndex = 'z-[100]',
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  onFechar: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  rodape?: React.ReactNode;
  children: React.ReactNode;
  largura?: string;
  zIndex?: string;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFechar]);

  const corpo = (
    <>
      <div className="h-[3px] filete-ouro shrink-0" aria-hidden />
      <header className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-6 pt-3.5 pb-3 bg-papel border-b border-linha">
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[18px] sm:text-[19px] font-extrabold tracking-[-0.015em] leading-tight text-tinta">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-[12.5px] text-cinza leading-snug tabular-nums">{subtitulo}</p>}
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="shrink-0 -mr-1.5 inline-flex items-center justify-center w-10 h-10 rounded-md text-cinza hover:bg-papel-3 hover:text-tinta transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
        >
          <X className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">{children}</div>
      {rodape && (
        <footer className="shrink-0 bg-papel border-t border-linha px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end [&>button]:w-full sm:[&>button]:w-auto [&>button]:h-11 sm:[&>button]:h-10">
          {rodape}
        </footer>
      )}
    </>
  );

  const casca = `relative flex flex-col w-full min-w-0 h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-3rem)] ${largura} bg-papel-2 sm:rounded-lg sm:border sm:border-linha shadow-[0_30px_80px_-30px_rgba(4,32,19,0.6)] overflow-hidden`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${zIndex} bg-eno-950/60 backdrop-blur-[2px] flex sm:items-center sm:justify-center sm:p-6`}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} className={casca}>
          {corpo}
        </form>
      ) : (
        <div className={casca}>{corpo}</div>
      )}
    </div>
  );
}

/** Botão de ação dentro de cartão/linha (área de toque 40px no celular). */
export const botaoLinha =
  'inline-flex items-center justify-center gap-1.5 h-10 sm:h-8 px-3 rounded-md text-[13px] sm:text-[12.5px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro disabled:opacity-50 disabled:cursor-not-allowed';
export const botaoLinhaPrimario = `${botaoLinha} bg-eno-800 hover:bg-eno-900 text-white`;
export const botaoLinhaSecundario = `${botaoLinha} border border-linha-forte bg-papel text-tinta-2 hover:bg-papel-3`;
export const botaoLinhaIcone =
  'inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-md text-cinza hover:bg-papel-3 hover:text-tinta transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro';
export const botaoLinhaExcluir =
  'inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-md text-cinza-claro hover:bg-st-vencido-bg hover:text-st-vencido transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro';

/** Lista de cartões do celular (a tabela some abaixo de sm). */
export function ListaCartoes({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <ul className={`sm:hidden bg-papel border border-linha rounded-md ${className}`}>{children}</ul>;
}

export function ItemCartao({ children, className = '' }: { children: React.ReactNode; className?: string; key?: React.Key }) {
  return <li className={`px-3.5 py-3 border-b border-linha last:border-b-0 ${className}`}>{children}</li>;
}

/** Situação de título (receber/pagar) com tom fixo. */
export function tomTitulo(status: string): TomStatus {
  if (status === 'PAGO') return 'pago';
  if (status === 'VENCIDO') return 'vencido';
  return 'aguardando';
}

/** Moeda sem o "R$" (para números grandes com unidade separada). */
export function moedaSemSimbolo(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Faixa de números com a quantidade certa de colunas (a FaixaNumeros do sistema
 * assume cinco). Primeiro filho = número principal.
 */
export function FaixaFin({ children, colunas, className = '' }: { children: React.ReactNode; colunas: string; className?: string }) {
  return (
    <section className={`bg-papel border border-linha rounded-md overflow-hidden ${className}`}>
      <div className="h-[3px] filete-ouro" aria-hidden />
      <div className={`grid grid-cols-2 gap-px bg-linha ${colunas}`}>{children}</div>
    </section>
  );
}
