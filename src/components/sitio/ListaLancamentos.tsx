import React, { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { formatarDataBR } from '../../lib/datas';
import {
  DespesaSitio,
  ROTULO_CATEGORIA,
  ROTULO_COMBUSTIVEL,
  categoriaDe,
  combustivelDoProduto,
  movimentoDe,
  MovimentoSitio
} from '../../data/sitioControleData';
import { moeda, fmtNum } from './ui';

const SELO: Record<MovimentoSitio, { rotulo: string; cls: string }> = {
  COMPRA: { rotulo: 'Compra', cls: 'bg-emerald-100 text-emerald-900' },
  ABASTECIMENTO: { rotulo: 'Abasteceu', cls: 'bg-sky-100 text-sky-900' },
  POSTO: { rotulo: 'Posto', cls: 'bg-orange-100 text-orange-900' },
  DESPESA: { rotulo: 'Despesa', cls: 'bg-amber-100 text-amber-900' }
};

function rotuloLinha(d: DespesaSitio): string {
  const mov = movimentoDe(d);
  if (mov === 'DESPESA') return ROTULO_CATEGORIA[categoriaDe(d)];
  return ROTULO_COMBUSTIVEL[d.combustivel || combustivelDoProduto(d.produto)];
}

export function ListaLancamentos({ itens, vazio }: { itens: DespesaSitio[]; vazio: string }) {
  const [aberto, setAberto] = useState<DespesaSitio | null>(null);

  if (itens.length === 0) return <p className="py-8 text-center text-sm text-slate-500">{vazio}</p>;

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {itens.map(d => {
          const mov = movimentoDe(d);
          const selo = SELO[mov];
          const consumo = mov === 'ABASTECIMENTO';
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setAberto(d)}
                className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-emerald-50/50 transition-colors cursor-pointer"
              >
                <div className="w-12 shrink-0 text-center">
                  <div className="text-lg font-black leading-none tabular-nums text-slate-900">{formatarDataBR(d.data).slice(0, 2)}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tabular-nums">{formatarDataBR(d.data).slice(3, 5)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${selo.cls}`}>{selo.rotulo}</span>
                    <span className="text-[11px] font-bold text-slate-500">{rotuloLinha(d)}</span>
                    {d.situacao === 'A_PAGAR' && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-50 text-red-700">
                        A pagar{d.vencimento ? ` · ${formatarDataBR(d.vencimento).slice(0, 5)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900 truncate">{d.nomeDespesa}</div>
                  {(d.maquinaTrator && d.maquinaTrator !== 'Geral' && mov !== 'COMPRA') || d.responsavel ? (
                    <div className="text-xs text-slate-500 truncate">
                      {[mov !== 'COMPRA' && d.maquinaTrator !== 'Geral' ? d.maquinaTrator : '', d.responsavel].filter(Boolean).join(' · ')}
                    </div>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  {consumo ? (
                    <>
                      <div className="text-sm font-black tabular-nums text-sky-800">−{fmtNum(d.quantidade)} L</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">custo {moeda(d.valorTotal)}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-black tabular-nums text-slate-900">{moeda(d.valorTotal)}</div>
                      {d.unidade === 'L' && <div className="text-[11px] text-slate-400 tabular-nums">{fmtNum(d.quantidade)} L</div>}
                    </>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {aberto && <DetalheLancamento d={aberto} onFechar={() => setAberto(null)} />}
    </>
  );
}

function Linha({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === undefined || v === null || v === '') return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{k}</dt>
      <dd className="text-sm font-semibold text-slate-900 text-right tabular-nums">{v}</dd>
    </div>
  );
}

export function DetalheLancamento({ d, onFechar }: { d: DespesaSitio; onFechar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);

  const mov = movimentoDe(d);
  const nota = d.notaFiscal;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#021a10]/75" onClick={onFechar}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        <div className="sticky top-0 bg-[#022013] text-white px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">{SELO[mov].rotulo}</div>
            <h3 className="text-lg font-black leading-tight">{d.nomeDespesa}</h3>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="text-3xl font-black tracking-tight tabular-nums text-slate-900">{moeda(d.valorTotal)}</div>
          {mov === 'ABASTECIMENTO' && <p className="text-xs text-slate-500 mt-1">Custo pelo preço médio do tanque. Não gera lançamento no financeiro (já entrou na compra).</p>}
          <dl className="mt-3">
            <Linha k="Data" v={formatarDataBR(d.data)} />
            <Linha k="Categoria" v={ROTULO_CATEGORIA[categoriaDe(d)]} />
            <Linha k="Quantidade" v={`${fmtNum(d.quantidade, 2)} ${d.unidade}`} />
            <Linha k="Valor unitário" v={d.unidade === 'L' ? `${moeda(d.valorUnitario)}/L` : undefined} />
            <Linha k="Máquina" v={d.maquinaTrator && d.maquinaTrator !== 'Geral' ? d.maquinaTrator : undefined} />
            <Linha k="Leitura" v={d.leituraMedidor ? fmtNum(d.leituraMedidor, 1) : undefined} />
            <Linha k="Horas (legado)" v={d.horasTrabalhadas ? `${d.horasTrabalhadas} h` : undefined} />
            <Linha k="Operador / resp." v={d.responsavel} />
            <Linha k="Fornecedor" v={d.fornecedor || nota?.emitente} />
            <Linha k="Pagamento" v={d.formaPagamento || nota?.formaPagamento} />
            <Linha k="Situação" v={d.situacao === 'A_PAGAR' ? `A pagar · vence ${formatarDataBR(d.vencimento)}` : d.situacao === 'PAGO' ? 'Pago' : undefined} />
            <Linha k="Observação" v={d.observacao || nota?.observacoes} />
          </dl>
          {nota?.numero && (
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <FileText className="w-4 h-4" /> Nota fiscal
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                NF {nota.numero}
                {nota.serie ? ` · série ${nota.serie}` : ''}
              </div>
              {nota.chaveAcesso && <div className="mt-1 text-[11px] font-mono text-slate-500 break-all">{nota.chaveAcesso}</div>}
              {Array.isArray(nota.itens) && nota.itens.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {nota.itens.map((it, i) => (
                    <li key={i} className="flex justify-between gap-3 text-xs text-slate-700">
                      <span className="truncate">{it.descricao}</span>
                      <span className="tabular-nums font-bold shrink-0">{moeda(it.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
