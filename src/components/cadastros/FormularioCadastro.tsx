import React from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import './cadastros.css';

/**
 * Moldura dos formulários de cadastro.
 * Computador: ocupa a área de trabalho (cabeçalho, corpo rolável, rodapé com as ações).
 * Celular: tela cheia por cima do menu, campos com 44px e o botão Salvar fixo no rodapé.
 */
export function FormularioCadastro({
  onSubmit,
  onCancelar,
  onLimpar,
  titulo,
  subtitulo,
  extra,
  rotuloSalvar,
  rotuloCancelar = 'Cancelar',
  salvando,
  children,
  className = '',
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancelar: () => void;
  /** Botão Limpar: zera o formulário e apaga o rascunho salvo. */
  onLimpar?: () => void;
  titulo: string;
  subtitulo?: React.ReactNode;
  /** Controle curto ao lado do título (ex.: "Cadastro ativo"). */
  extra?: React.ReactNode;
  rotuloSalvar: string;
  rotuloCancelar?: string;
  salvando?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`form-cadastro fixed inset-0 z-[60] bg-papel-2 flex flex-col sm:static sm:z-auto sm:flex-1 sm:min-h-0 sm:h-full w-full overflow-hidden ${className}`}
    >
      {/* Cabeçalho */}
      <div className="shrink-0 bg-papel border-b border-linha">
        <div className="h-[3px] filete-ouro sm:hidden" aria-hidden />
        <div className="flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3">
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex items-center justify-center gap-1.5 h-10 w-10 sm:w-auto sm:h-9 sm:px-3 rounded-md border border-linha-forte bg-papel text-tinta-2 text-[13px] font-semibold hover:bg-papel-3 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-ouro"
            aria-label="Voltar para a lista"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] sm:text-[22px] font-extrabold tracking-[-0.02em] leading-tight text-tinta truncate">{titulo}</h2>
            {subtitulo && <p className="text-[12px] text-cinza truncate">{subtitulo}</p>}
          </div>
          {extra && <div className="hidden sm:flex items-center gap-2 shrink-0">{extra}</div>}
        </div>
        {extra && <div className="sm:hidden px-3 pb-2.5 flex items-center gap-2">{extra}</div>}
      </div>

      {/* Corpo (as seções do formulário rolam aqui) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>

      {/* Rodapé com as ações: fixo no celular, à direita no computador */}
      <div
        className="shrink-0 bg-papel border-t border-linha px-3 sm:px-6 py-2.5 flex items-center gap-2 sm:justify-end"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      >
        {onLimpar && (
          <button
            type="button"
            onClick={() => { if (window.confirm('Limpar todo o formulário? Os dados digitados serão apagados.')) onLimpar(); }}
            className="h-11 sm:h-9 px-4 rounded-md text-st-vencido text-[13px] font-semibold hover:bg-st-vencido-bg transition-colors cursor-pointer mr-auto focus-visible:outline-2 focus-visible:outline-ouro"
          >
            Limpar
          </button>
        )}
        <button
          type="button"
          onClick={onCancelar}
          className="h-11 sm:h-9 px-4 rounded-md border border-linha-forte bg-papel text-tinta-2 text-[13px] font-semibold hover:bg-papel-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
        >
          {rotuloCancelar}
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 px-5 rounded-md bg-eno-800 text-white text-[13.5px] font-semibold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] hover:bg-eno-900 active:translate-y-px transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando…' : rotuloSalvar}
        </button>
      </div>
    </form>
  );
}

/**
 * Formulário em janela (cadastros curtos). Celular: tela cheia com Salvar fixo no rodapé.
 * Computador: janela centralizada.
 */
export function ModalCadastro({
  onSubmit,
  onFechar,
  titulo,
  subtitulo,
  rotuloSalvar,
  salvando,
  largura = 'max-w-3xl',
  children,
  rodapeExtra,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onFechar: () => void;
  titulo: string;
  subtitulo?: React.ReactNode;
  rotuloSalvar: string;
  salvando?: boolean;
  largura?: string;
  children: React.ReactNode;
  /** Ação secundária à esquerda do rodapé (ex.: excluir). */
  rodapeExtra?: React.ReactNode;
}) {
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-[60] bg-eno-950/60 flex justify-center items-stretch sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <form
        onSubmit={onSubmit}
        className={`min-w-0 form-cadastro relative w-full ${largura} bg-papel-2 sm:rounded-md border border-linha flex flex-col h-dvh sm:h-auto sm:max-h-[calc(100dvh-3rem)] overflow-hidden shadow-[0_24px_60px_-20px_rgba(4,32,19,0.6)]`}
      >
        <div className="h-[3px] filete-ouro shrink-0" aria-hidden />
        <div className="shrink-0 bg-papel border-b border-linha flex items-center gap-3 px-4 sm:px-6 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-tinta truncate">{titulo}</h2>
            {subtitulo && <p className="text-[12px] text-cinza truncate">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-10 h-10 inline-flex items-center justify-center rounded-md text-cinza hover:text-tinta hover:bg-papel-3 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-ouro"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        <div
          className="shrink-0 bg-papel border-t border-linha px-4 sm:px-6 py-2.5 flex items-center gap-2 sm:justify-end"
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
        >
          {rodapeExtra && <div className="mr-auto">{rodapeExtra}</div>}
          <button
            type="button"
            onClick={onFechar}
            className="h-11 sm:h-9 px-4 rounded-md border border-linha-forte bg-papel text-tinta-2 text-[13px] font-semibold hover:bg-papel-3 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 px-5 rounded-md bg-eno-800 text-white text-[13.5px] font-semibold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] hover:bg-eno-900 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro"
          >
            <Save className="w-4 h-4" />
            {salvando ? 'Salvando…' : rotuloSalvar}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Rótulo e campo padrão dos formulários de cadastro. */
export const campoCadastro =
  'w-full h-11 sm:h-9 rounded-md border border-linha-forte bg-papel px-3 text-[14px] sm:text-[13px] text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15';
export const rotuloCadastro = 'block text-[11.5px] font-semibold text-tinta-2 mb-1';

/** Interruptor "Cadastro ativo" do cabeçalho do formulário. */
export function ChaveAtivo({ ativo, onChange, rotulo = 'Ativo' }: { ativo: boolean; onChange: (v: boolean) => void; rotulo?: string }) {
  return (
    <label className="inline-flex items-center gap-2 h-10 sm:h-9 px-3 rounded-md border border-linha-forte bg-papel cursor-pointer select-none">
      <input type="checkbox" checked={ativo} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-eno-700" />
      <span className="text-[13px] font-semibold text-tinta">{rotulo}</span>
    </label>
  );
}

/** Botão de ação de linha (ícone) com área de toque de 40px. */
export function BotaoLinha({
  children,
  rotulo,
  onClick,
  perigo,
  className = '',
}: {
  children: React.ReactNode;
  rotulo: string;
  onClick: () => void;
  perigo?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={rotulo}
      aria-label={rotulo}
      className={`inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-md text-cinza transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
        perigo ? 'hover:text-st-vencido hover:bg-st-vencido-bg' : 'hover:text-tinta hover:bg-papel-3'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Botão com texto para os cartões do celular (área de toque 40px). */
export function BotaoCartao({
  children,
  onClick,
  primario,
  perigo,
  className = '',
  rotulo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primario?: boolean;
  perigo?: boolean;
  className?: string;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md text-[12.5px] font-semibold transition-colors cursor-pointer ${
        primario
          ? 'bg-eno-800 text-white active:bg-eno-900'
          : perigo
            ? 'border border-linha-forte text-cinza active:bg-st-vencido-bg active:text-st-vencido'
            : 'border border-linha-forte text-tinta-2 active:bg-papel-3'
      } ${className}`}
    >
      {children}
    </button>
  );
}
