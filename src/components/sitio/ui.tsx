import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { formatarMoeda } from '../../data/financeiroData';
import {
  ControleSitioCompleto,
  DespesaSitio,
  SituacaoPagamento,
  FORMAS_PAGAMENTO,
  numSitio
} from '../../data/sitioControleData';

// ============================================================
// Formatação
// ============================================================

export const moeda = (v: unknown) => formatarMoeda(v);
export const fmtNum = (v: unknown, casas = 1) =>
  numSitio(v).toLocaleString('pt-BR', { maximumFractionDigits: casas });
export const fmtLitros = (v: unknown) => `${fmtNum(v, 1)} L`;

export function rotuloMes(chave: string): string {
  const [a, m] = chave.split('-').map(Number);
  if (!a || !m) return chave;
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${a}`;
}

// ============================================================
// Tipos compartilhados pelas abas
// ============================================================

export interface PropsAba {
  estado: ControleSitioCompleto;
  mes: string;
  /** Grava o novo estado; se houver lançamento com dinheiro, integra ao financeiro. */
  /** Devolve false quando não gravou (ex.: pagamento sem saldo no caixa). */
  aplicar: (novo: ControleSitioCompleto, lancamento?: DespesaSitio) => boolean;
  irPara?: (aba: AbaSitio) => void;
}

export type AbaSitio = 'PAINEL' | 'COMBUSTIVEL' | 'HORAS' | 'DESPESAS' | 'MAQUINAS';

// ============================================================
// Estilos de formulário (alvos grandes para uso no celular)
// ============================================================

export const inputCls =
  'w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[15px] font-semibold text-slate-900 ' +
  'placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 ' +
  'tabular-nums';

export function Campo({
  rotulo,
  dica,
  children,
  className = ''
}: {
  rotulo: string;
  dica?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500 mb-1.5">{rotulo}</span>
      {children}
      {dica && <span className="block mt-1 text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

/** Botões de escolha única grandes (substitui select em opções curtas). */
export function Segmentado<T extends string>({
  valor,
  opcoes,
  onChange,
  cor = 'emerald'
}: {
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onChange: (v: T) => void;
  cor?: 'emerald' | 'amber' | 'sky';
}) {
  const ativo =
    cor === 'amber'
      ? 'bg-amber-600 text-white border-amber-600'
      : cor === 'sky'
      ? 'bg-sky-700 text-white border-sky-700'
      : 'bg-emerald-700 text-white border-emerald-700';
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map(o => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          aria-pressed={valor === o.valor}
          className={`min-h-11 px-4 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
            valor === o.valor ? ativo : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function ErroBox({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold flex items-start gap-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{erro}</span>
    </div>
  );
}

/**
 * Folha de formulário: no celular sobe de baixo ocupando a tela; no desktop vira modal central.
 * Rodapé fixo com o botão principal ao alcance do polegar.
 */
export function Folha({
  titulo,
  subtitulo,
  icone,
  onFechar,
  onSubmit,
  rotuloConfirmar,
  corConfirmar = 'emerald',
  children
}: {
  titulo: string;
  subtitulo?: string;
  icone?: React.ReactNode;
  onFechar: () => void;
  onSubmit: (e: React.FormEvent) => void;
  rotuloConfirmar: string;
  corConfirmar?: 'emerald' | 'amber' | 'sky';
  children: React.ReactNode;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = overflow;
    };
  }, [onFechar]);

  const corBotao =
    corConfirmar === 'amber'
      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-700/30'
      : corConfirmar === 'sky'
      ? 'bg-sky-700 hover:bg-sky-800 shadow-sky-800/30'
      : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-800/30';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#021a10]/75 backdrop-blur-[2px]" onClick={onFechar}>
      <form
        onSubmit={onSubmit}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[94dvh] sm:max-h-[90vh] flex flex-col bg-[#f7faf8] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="relative bg-[#022013] text-white px-5 pt-4 pb-4 shrink-0 overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-16 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/25 sm:hidden" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {icone && <div className="mt-0.5 text-emerald-300 shrink-0">{icone}</div>}
              <div className="min-w-0">
                <h3 className="text-lg font-black tracking-tight leading-tight">{titulo}</h3>
                {subtitulo && <p className="text-xs text-emerald-200/90 mt-0.5">{subtitulo}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">{children}</div>
        <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-white flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onFechar}
            className="h-12 px-5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`flex-1 h-12 rounded-xl text-white font-black text-[15px] shadow-lg transition-colors cursor-pointer ${corBotao}`}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Bloco pagamento: forma + pago/a pagar + vencimento. */
export function BlocoPagamento({
  forma,
  situacao,
  vencimento,
  onChange
}: {
  forma: string;
  situacao: SituacaoPagamento;
  vencimento: string;
  onChange: (p: { forma?: string; situacao?: SituacaoPagamento; vencimento?: string }) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-white border border-slate-200 p-4">
      <Campo rotulo="Situação">
        <Segmentado<SituacaoPagamento>
          valor={situacao}
          onChange={v => onChange({ situacao: v })}
          opcoes={[
            { valor: 'PAGO', rotulo: 'Já paguei' },
            { valor: 'A_PAGAR', rotulo: 'A pagar' }
          ]}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Forma de pagamento">
          <select className={inputCls} value={forma} onChange={e => onChange({ forma: e.target.value })}>
            {FORMAS_PAGAMENTO.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Campo>
        {situacao === 'A_PAGAR' ? (
          <Campo rotulo="Vencimento">
            <input type="date" required className={inputCls} value={vencimento} onChange={e => onChange({ vencimento: e.target.value })} />
          </Campo>
        ) : (
          <div className="self-end pb-3 text-xs text-slate-500">Entra como despesa paga no financeiro.</div>
        )}
      </div>
      {situacao === 'A_PAGAR' && <p className="text-xs text-slate-500">Vai para Contas a Pagar com esse vencimento.</p>}
    </div>
  );
}

/** Coluna de tanque: assinatura visual do portal (nível de combustível em pé). */
export function MedidorTanque({
  rotulo,
  saldo,
  capacidade,
  tom,
  compacto = false
}: {
  rotulo: string;
  saldo: number;
  capacidade: number;
  tom: 'diesel' | 'gasolina';
  compacto?: boolean;
}) {
  const pct = capacidade > 0 ? Math.max(0, Math.min(100, (saldo / capacidade) * 100)) : 0;
  const baixo = pct < 15;
  const liquido =
    tom === 'diesel' ? 'from-amber-400 via-amber-500 to-amber-700' : 'from-lime-300 via-lime-400 to-emerald-600';
  return (
    <div className="flex items-end gap-3">
      <div
        className={`relative ${compacto ? 'w-9 h-20' : 'w-12 h-28'} rounded-xl bg-black/30 ring-1 ring-white/15 overflow-hidden shrink-0`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacidade}
        aria-valuenow={saldo}
        aria-label={`Saldo de ${rotulo}`}
      >
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${liquido} transition-[height] duration-500 ease-out`}
          style={{ height: `${pct}%` }}
        />
        {[25, 50, 75].map(m => (
          <div key={m} className="absolute left-0 w-2 h-px bg-white/40" style={{ bottom: `${m}%` }} />
        ))}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300/90">{rotulo}</div>
        <div className={`${compacto ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-black tracking-tight tabular-nums leading-none mt-1 text-white`}>
          {fmtNum(saldo, 0)}
          <span className="text-base font-bold text-white/60 ml-1">L</span>
        </div>
        <div className={`text-xs mt-1 tabular-nums ${baixo ? 'text-red-300 font-bold' : 'text-white/55'}`}>
          {baixo ? 'Nível baixo · ' : ''}
          {Math.round(pct)}% de {fmtNum(capacidade, 0)} L
        </div>
      </div>
    </div>
  );
}

export function Vazio({ texto, acao }: { texto: string; acao?: React.ReactNode }) {
  return (
    <div className="py-10 px-4 text-center">
      <p className="text-sm text-slate-500">{texto}</p>
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}

/** Botão grande de ação principal de cada aba. */
export function BotaoAcao({
  onClick,
  icone,
  titulo,
  sub,
  tom = 'emerald'
}: {
  onClick: () => void;
  icone: React.ReactNode;
  titulo: string;
  sub?: string;
  tom?: 'emerald' | 'amber' | 'sky' | 'claro';
}) {
  const cls =
    tom === 'amber'
      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-800/25'
      : tom === 'sky'
      ? 'bg-sky-700 hover:bg-sky-800 text-white shadow-sky-900/25'
      : tom === 'claro'
      ? 'bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-200 shadow-emerald-900/5'
      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/25';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full min-h-16 px-4 py-3 rounded-2xl flex items-center gap-3 text-left shadow-lg transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${cls}`}
    >
      <span className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0">{icone}</span>
      <span className="min-w-0">
        <span className="block font-black text-[15px] leading-tight">{titulo}</span>
        {sub && <span className="block text-xs opacity-80 mt-0.5">{sub}</span>}
      </span>
    </button>
  );
}
