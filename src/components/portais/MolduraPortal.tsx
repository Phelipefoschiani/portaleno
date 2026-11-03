import React from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import { EMPRESA } from '../../lib/empresa';

/**
 * Moldura dos portais externos (RCA, Cliente, Agricultor): mesma barra verde do painel,
 * faixa creme com a conta + abas, conteúdo sobre o papel.
 * No celular as abas vão para a barra inferior (ao alcance do polegar).
 */

export interface AbaPortal<T extends string> {
  id: T;
  rotulo: string;
  /** Rótulo curto da barra inferior do celular. */
  curto?: string;
  Icone: React.ComponentType<{ className?: string }>;
  /** Número que pede atenção (ex.: pedidos aguardando). */
  badge?: number;
}

interface Props<T extends string> {
  /** Ex.: "Portal do Cliente" */
  portal: string;
  /** Nome da conta (cliente, RCA, produtor). */
  conta?: string;
  /** Linha curta ao lado da conta (cidade, código). */
  contexto?: string;
  onVoltar: () => void;
  /** Administrador "visualizando como" volta ao painel; os demais saem. */
  ehAdmin?: boolean;
  /** Seletor "visualizar como" (só administrador). */
  seletorAdmin?: React.ReactNode;
  abas?: AbaPortal<T>[];
  abaAtiva?: T;
  onAba?: (id: T) => void;
  /** Ação principal do portal (vai ao centro da barra inferior no celular). */
  acao?: { rotulo: string; curto?: string; Icone: React.ComponentType<{ className?: string }>; onClick: () => void; disabled?: boolean };
  children: React.ReactNode;
}

export function MolduraPortal<T extends string>({
  portal,
  conta,
  contexto,
  onVoltar,
  ehAdmin,
  seletorAdmin,
  abas = [],
  abaAtiva,
  onAba,
  acao,
  children,
}: Props<T>) {
  const temBarraInferior = abas.length > 1;
  // Barra inferior: abas com a ação no meio
  const meio = Math.ceil(abas.length / 2);
  const itensInferior: (AbaPortal<T> | 'acao')[] = acao ? [...abas.slice(0, meio), 'acao', ...abas.slice(meio)] : abas;

  return (
    <div className="min-h-dvh bg-papel-2 text-tinta flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 shrink-0">
        <div className="bg-[linear-gradient(100deg,#042013_0%,#0b3d24_100%)] text-white">
          <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-3 sm:px-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={EMPRESA.logo} alt="" className="h-8 w-8 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] shrink-0" />
              <span className="leading-none min-w-0">
                <span className="block text-[15px] font-extrabold tracking-[-0.01em]">Grupo ENO</span>
                <span className="block mt-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-ouro truncate">{portal}</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2 min-w-0">
              {seletorAdmin && <div className="hidden md:block min-w-0">{seletorAdmin}</div>}
              <button
                type="button"
                onClick={onVoltar}
                className="inline-flex items-center gap-1.5 h-10 sm:h-9 px-3 rounded-md border border-white/20 text-[13px] font-semibold text-white/85 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro shrink-0"
              >
                {ehAdmin ? <ArrowLeft className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                {ehAdmin ? 'Painel' : 'Sair'}
              </button>
            </div>
          </div>
        </div>

        {/* Faixa da conta + abas (desktop) */}
        <div className={`bg-papel border-b border-linha ${abas.length === 0 && !seletorAdmin ? 'hidden md:block' : ''}`}>
          <div className="mx-auto flex w-full max-w-[1280px] flex-col md:flex-row md:items-stretch md:h-11 px-3 sm:px-5">
            <div className="flex items-center gap-1.5 min-h-10 py-1.5 md:py-0 md:pr-5 md:mr-1 md:border-r md:border-linha text-[12.5px] min-w-0">
              <span className="font-bold text-tinta truncate">{conta || portal}</span>
              {contexto && <span className="text-cinza truncate">· {contexto}</span>}
            </div>
            {abas.length > 0 && (
              <nav className="hidden md:flex items-stretch" aria-label="Seções do portal">
                {abas.map(a => {
                  const sel = a.id === abaAtiva;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onAba?.(a.id)}
                      aria-current={sel ? 'page' : undefined}
                      className={`relative shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 text-[13px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ouro ${
                        sel ? 'font-bold text-tinta' : 'font-medium text-cinza hover:text-tinta'
                      }`}
                    >
                      {a.rotulo}
                      {!!a.badge && <span className="tabular-nums text-[11.5px] font-bold text-st-aguardando">{a.badge}</span>}
                      {sel && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-eno-800" aria-hidden />}
                    </button>
                  );
                })}
              </nav>
            )}
            {acao && (
              <div className="hidden md:flex items-center ml-auto">
                <button
                  type="button"
                  onClick={acao.onClick}
                  disabled={acao.disabled}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-eno-800 text-white text-[13px] font-semibold hover:bg-eno-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <acao.Icone className="w-4 h-4" />
                  {acao.rotulo}
                </button>
              </div>
            )}
            {seletorAdmin && <div className="md:hidden pb-2">{seletorAdmin}</div>}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full mx-auto max-w-[1280px] ${temBarraInferior ? 'pb-24 md:pb-8' : 'pb-8'}`}>{children}</main>

      {/* Barra inferior (celular e tablet estreito) */}
      {temBarraInferior && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-eno-900 border-t border-white/10 flex items-stretch"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Seções do portal"
        >
          {itensInferior.map(item => {
            if (item === 'acao' && acao) {
              return (
                <button
                  key="__acao"
                  type="button"
                  onClick={acao.onClick}
                  disabled={acao.disabled}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-bold text-ouro-claro disabled:opacity-40 cursor-pointer"
                >
                  <span className="w-10 h-10 rounded-md bg-ouro text-eno-900 flex items-center justify-center shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
                    <acao.Icone className="w-5 h-5" />
                  </span>
                  <span>{acao.curto || acao.rotulo}</span>
                </button>
              );
            }
            const a = item as AbaPortal<T>;
            const sel = a.id === abaAtiva;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onAba?.(a.id)}
                aria-current={sel ? 'page' : undefined}
                className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 min-h-[60px] py-2 text-[10.5px] font-semibold transition-colors cursor-pointer ${sel ? 'text-white' : 'text-white/55'}`}
              >
                {sel && <span className="absolute top-0 inset-x-5 h-[3px] rounded-b-sm filete-ouro" aria-hidden />}
                <span className="relative">
                  <a.Icone className="w-5 h-5" />
                  {!!a.badge && (
                    <span className="absolute -top-1.5 -right-3 min-w-[17px] h-[17px] px-1 rounded-full bg-ouro text-[10px] font-extrabold text-eno-900 flex items-center justify-center tabular-nums">{a.badge}</span>
                  )}
                </span>
                <span className="truncate max-w-full px-1">{a.curto || a.rotulo}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** Seletor "visualizar como" do administrador (mesmo visual nos três portais). */
export function SeletorAdminPortal({
  valor,
  onChange,
  vazio,
  opcoes,
}: {
  valor: string;
  onChange: (v: string) => void;
  vazio: string;
  opcoes: { id: string; rotulo: string }[];
}) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">Visualizar como (somente administrador)</span>
      <select
        value={valor}
        onChange={e => onChange(e.target.value)}
        title="Visualizar como (somente administrador)"
        className="w-full md:w-auto md:max-w-[260px] h-10 md:h-8 rounded-md border border-linha-forte md:border-white/20 bg-papel md:bg-white/[0.06] px-2.5 text-[13px] font-medium text-tinta md:text-white cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-ouro"
      >
        <option value="" className="text-tinta">{vazio}</option>
        {opcoes.map(o => (
          <option key={o.id} value={o.id} className="text-tinta">{o.rotulo}</option>
        ))}
      </select>
    </label>
  );
}
