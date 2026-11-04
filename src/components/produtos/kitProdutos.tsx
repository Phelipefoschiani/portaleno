import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { tabela } from '../ui/TabelaDados';

/**
 * Peças de tela da frente Produtos (mesmo padrão de src/components/ui):
 * formulário em papel creme, campos de 44px no celular, modais que viram tela cheia
 * no celular com os botões no rodapé fixo, e tabelas que viram cartões.
 */

/** Classes de formulário. No celular: 44px de altura e 16px (sem zoom no iOS). */
export const form = {
  rotulo: 'block text-[12px] font-semibold text-tinta-2 mb-1',
  campo:
    'w-full h-11 sm:h-9 rounded-md border border-linha-forte bg-papel px-3 text-[16px] sm:text-[13px] text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15 disabled:bg-papel-2 disabled:text-cinza',
  campoNumero:
    'w-full h-11 sm:h-9 rounded-md border border-linha-forte bg-papel px-3 text-right tabular-nums text-[16px] sm:text-[13px] font-semibold text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15',
  campoLeitura:
    'w-full h-11 sm:h-9 rounded-md border border-linha bg-papel-2 px-3 text-right tabular-nums text-[16px] sm:text-[13px] font-semibold text-cinza cursor-not-allowed focus:outline-none',
  select:
    'w-full h-11 sm:h-9 rounded-md border border-linha-forte bg-papel px-2.5 text-[16px] sm:text-[13px] text-tinta focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15 cursor-pointer',
  textarea:
    'w-full rounded-md border border-linha-forte bg-papel px-3 py-2 text-[16px] sm:text-[13px] leading-relaxed text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15',
  ajuda: 'mt-1 block text-[11.5px] leading-snug text-cinza tabular-nums',
};

/** Rótulo + campo + ajuda. */
export function Campo({
  rotulo,
  ajuda,
  children,
  className = '',
}: {
  rotulo: React.ReactNode;
  ajuda?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className={form.rotulo}>{rotulo}</label>
      {children}
      {ajuda && <span className={form.ajuda}>{ajuda}</span>}
    </div>
  );
}

/**
 * Modal do sistema. Computador: folha centralizada com cabeçalho verde e filete dourado.
 * Celular: tela cheia, corpo rolando e rodapé fixo com os botões principais.
 * Com `onSubmit`, corpo e rodapé ficam dentro do <form> (o botão submit pode ir no rodapé).
 */
export function ModalFolha({
  titulo,
  subtitulo,
  onFechar,
  children,
  rodape,
  onSubmit,
  acoesTopo,
  largura = 'sm:max-w-3xl',
  corpoClassName = '',
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  onFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  /** Botões extras no topo, ao lado do fechar (ex.: Editar). */
  acoesTopo?: React.ReactNode;
  largura?: string;
  corpoClassName?: string;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', tecla);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflowAntes;
    };
  }, [onFechar]);

  const corpo = (
    <>
      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 ${corpoClassName}`}>{children}</div>
      {rodape && (
        <div className="shrink-0 border-t border-linha bg-papel px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 flex items-center gap-2 sm:justify-end [&>button]:flex-1 sm:[&>button]:flex-none [&>button]:h-11 sm:[&>button]:h-9 [&>button]:whitespace-nowrap [&>button]:px-2.5 sm:[&>button]:px-4">
          {rodape}
        </div>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex bg-eno-950/60 sm:items-start sm:justify-center sm:overflow-y-auto sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`min-w-0 relative flex w-full flex-col overflow-hidden bg-papel-2 h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:my-auto sm:rounded-md sm:border sm:border-eno-900/40 sm:shadow-[0_40px_80px_-24px_rgba(4,32,19,0.6)] ${largura}`}
      >
        <header className="shrink-0 bg-eno-900 text-white">
          <div className="flex items-start gap-3 px-4 pt-3 pb-3 sm:px-6 sm:pt-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] sm:text-[19px] font-extrabold leading-tight tracking-[-0.015em] break-words">{titulo}</h2>
              {subtitulo && <div className="mt-1 text-[12.5px] leading-snug text-white/65 tabular-nums">{subtitulo}</div>}
            </div>
            {acoesTopo && <div className="flex shrink-0 items-center gap-1.5">{acoesTopo}</div>}
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              title="Fechar (Esc)"
              className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-[3px] filete-ouro" aria-hidden />
        </header>

        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-1 min-h-0 flex-col">
            {corpo}
          </form>
        ) : (
          corpo
        )}
      </div>
    </div>
  );
}

/** Botão escuro usado no topo verde do modal (ex.: "Editar"). */
export function BotaoTopo({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 sm:h-8 items-center gap-1.5 rounded-md border border-white/20 px-3 text-[12.5px] font-semibold text-white/90 hover:bg-white/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${className}`}
    >
      {children}
    </button>
  );
}

/** Bloco de formulário dentro do modal: papel, título numerado e conteúdo. */
export function Secao({
  numero,
  titulo,
  contexto,
  acao,
  children,
  className = '',
  semPadding,
}: {
  numero?: string | number;
  titulo: React.ReactNode;
  contexto?: React.ReactNode;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  semPadding?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-md border border-linha bg-papel ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-linha px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-bold text-tinta">
            {numero !== undefined && <span className="mr-1.5 tabular-nums text-ouro-escuro">{numero}</span>}
            {titulo}
          </h3>
          {contexto && <p className="text-[12px] leading-snug text-cinza">{contexto}</p>}
        </div>
        {acao}
      </header>
      <div className={semPadding ? '' : 'p-4 space-y-3'}>{children}</div>
    </section>
  );
}

/** Botão só com ícone. Área de toque de 40px no celular. */
export function BotaoIcone({
  rotulo,
  perigo,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string; perigo?: boolean }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      {...props}
      className={`inline-flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md text-cinza transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro disabled:opacity-40 ${
        perigo ? 'hover:bg-st-vencido-bg hover:text-st-vencido active:bg-st-vencido-bg' : 'hover:bg-papel-3 hover:text-tinta active:bg-papel-3'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Botão de ação dentro dos cartões do celular (40px de altura). */
export function BotaoCartao({
  children,
  primario,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primario?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold cursor-pointer ${
        primario ? 'bg-eno-800 text-white active:bg-eno-900' : 'border border-linha-forte text-tinta-2 active:bg-papel-3'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Aviso dentro do conteúdo, com a cor do significado. */
export function Aviso({
  tom,
  children,
  className = '',
}: {
  tom: 'vencido' | 'aguardando' | 'pago' | 'producao';
  children: React.ReactNode;
  className?: string;
}) {
  const cor = {
    vencido: 'bg-st-vencido-bg text-st-vencido border-st-vencido/20',
    aguardando: 'bg-st-aguardando-bg text-st-aguardando border-st-aguardando/20',
    pago: 'bg-st-pago-bg text-st-pago border-st-pago/20',
    producao: 'bg-st-producao-bg text-st-producao border-st-producao/20',
  }[tom];
  return <div className={`rounded-md border px-3 py-2.5 text-[12.5px] font-medium leading-snug ${cor} ${className}`}>{children}</div>;
}

/** Faixa escura com o número que fecha a conta (ex.: custo final). */
export function FaixaTotal({
  rotulo,
  valor,
  detalhe,
  lado,
  className = '',
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  /** Bloco à direita (ex.: valor por caixa). */
  lado?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-md bg-eno-900 px-4 py-3.5 text-white ${className}`}>
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ouro-claro">{rotulo}</div>
        <div className="mt-1 text-[26px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{valor}</div>
        {detalhe && <div className="mt-1.5 text-[12px] text-white/60 tabular-nums">{detalhe}</div>}
      </div>
      {lado && <div className="tabular-nums sm:text-right">{lado}</div>}
    </div>
  );
}

/** Faixa de números com 3 ou 5 itens (primeiro = destaque). Mesma régua dourada da Visão Geral. */
export function FaixaNumerosProdutos({ children, colunas, className = '' }: { children: React.ReactNode; colunas: 3 | 5; className?: string }) {
  const grade = colunas === 3 ? 'lg:grid-cols-[1.45fr_repeat(2,minmax(0,1fr))]' : 'lg:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))]';
  return (
    <section className={`overflow-hidden rounded-md border border-linha bg-papel ${className}`}>
      <div className="h-[3px] filete-ouro" aria-hidden />
      <div className={`grid grid-cols-2 gap-px bg-linha ${grade}`}>{children}</div>
    </section>
  );
}

export interface ColunaResponsiva {
  rotulo: string;
  numero?: boolean;
  className?: string;
}

/**
 * Tabela de leitura que vira cartões no celular.
 * A primeira coluna é o título do cartão; as demais viram pares rótulo/valor.
 */
export function TabelaResponsiva({
  colunas,
  linhas,
  rodape,
  semMoldura,
  className = '',
}: {
  colunas: ColunaResponsiva[];
  linhas: { chave: React.Key; celulas: React.ReactNode[]; alerta?: boolean }[];
  rodape?: React.ReactNode;
  /** Sem borda própria (quando já está dentro de uma Secao). */
  semMoldura?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden bg-papel ${semMoldura ? '' : 'rounded-md border border-linha'} ${className}`}>
      <ul className="sm:hidden">
        {linhas.map(l => (
          <li key={l.chave} className={`border-b border-linha px-3.5 py-3 last:border-b-0 ${l.alerta ? 'bg-st-vencido-bg/50' : ''}`}>
            <div className="text-[14px] font-bold text-tinta">{l.celulas[0]}</div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {colunas.slice(1).map((c, i) => (
                <div key={c.rotulo} className="min-w-0">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-cinza">{c.rotulo}</dt>
                  <dd className={`text-[13px] text-tinta-2 ${c.numero ? 'tabular-nums font-semibold' : ''}`}>{l.celulas[i + 1]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
        {rodape && <li className="border-t border-linha-forte bg-papel-2 px-3.5 py-2.5 text-[12.5px]">{rodape}</li>}
      </ul>
      <div className="hidden sm:block overflow-x-auto">
        <table className={tabela.table}>
          <thead className={tabela.thead}>
            <tr>
              {colunas.map(c => (
                <th key={c.rotulo} className={`${tabela.th} ${c.numero ? 'text-right' : ''} ${c.className || ''}`}>
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.chave} className={`${tabela.tr} ${l.alerta ? 'bg-st-vencido-bg/50' : ''}`}>
                {l.celulas.map((cel, i) => (
                  <td
                    key={i}
                    className={`${tabela.td} ${i === 0 ? 'font-semibold text-tinta' : ''} ${colunas[i]?.numero ? 'text-right tabular-nums whitespace-nowrap' : ''}`}
                  >
                    {cel}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rodape && <div className="border-t border-linha-forte bg-papel-2 px-3 py-2 text-[12.5px]">{rodape}</div>}
      </div>
    </div>
  );
}

/** Moeda pt-BR (atalho usado nas telas de Produtos). */
export const brl = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
