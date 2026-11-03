import React from 'react';

interface Props {
  titulo: string;
  /** Uma linha curta com o resumo da tela (números reais). */
  resumo?: React.ReactNode;
  /** Ação principal (e no máximo uma secundária) à direita. */
  acoes?: React.ReactNode;
  /** Conteúdo extra abaixo (ex.: abas de situação do portal). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão das telas internas: título forte, resumo de uma linha e a ação principal.
 * Sem caixa: fica sobre o papel da área de trabalho.
 */
export function CabecalhoPagina({ titulo, resumo, acoes, children, className = '' }: Props) {
  return (
    <header className={`shrink-0 px-4 sm:px-6 pt-5 pb-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] leading-[1.05] text-tinta">{titulo}</h1>
          {resumo && <div className="mt-1.5 text-[13px] text-cinza tabular-nums">{resumo}</div>}
        </div>
        {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
      </div>
      {children}
    </header>
  );
}

/** Botão primário (verde-escuro). Um por área. */
export function BotaoPrimario({ children, className = '', type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-eno-800 text-white text-[13px] font-semibold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] hover:bg-eno-900 active:translate-y-px transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/** Botão secundário (contorno discreto). */
export function BotaoSecundario({ children, className = '', type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md border border-linha-forte bg-papel text-tinta-2 text-[13px] font-semibold hover:bg-papel-3 hover:text-tinta transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
