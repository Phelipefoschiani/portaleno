import React, { useMemo, useState } from 'react';
import { Tractor, Timer, Receipt, ArrowRight } from 'lucide-react';
import { compararDatas } from '../../lib/datas';
import {
  ROTULO_CATEGORIA,
  ROTULO_COMBUSTIVEL,
  gastoPorCategoria,
  metricasMaquinas,
  movimentoDe,
  chaveMes,
  numSitio
} from '../../data/sitioControleData';
import { PropsAba, MedidorTanque, BotaoAcao, moeda, fmtNum, rotuloMes } from './ui';
import { ListaLancamentos } from './ListaLancamentos';
import { FormAbastecimento } from './AbaCombustivel';
import { FormApontamento } from './AbaHoras';
import { FormDespesa } from './AbaDespesas';
import { IconeMaquina } from './AbaMaquinas';

export function AbaPainel({ estado, mes, aplicar, irPara }: PropsAba) {
  const [modal, setModal] = useState<null | 'ABASTECER' | 'HORAS' | 'DESPESA'>(null);
  const porCategoria = useMemo(() => gastoPorCategoria(estado, mes), [estado, mes]);
  const totalMes = porCategoria.reduce((a, c) => a + c.valor, 0);
  const maiorCat = porCategoria[0]?.valor || 0;
  const metricas = useMemo(() => metricasMaquinas(estado, mes).filter(m => m.maquina.ativo || m.horasMes > 0), [estado, mes]);
  const horasMes = metricas.reduce((a, m) => a + m.horasMes, 0);
  const maiorHoras = Math.max(0, ...metricas.map(m => m.horasMes));

  const doMes = useMemo(
    () => estado.despesas.filter(d => chaveMes(d.data) === mes).sort((a, b) => compararDatas(b.data, a.data)),
    [estado.despesas, mes]
  );
  const litrosConsumidosMes = doMes
    .filter(d => ['ABASTECIMENTO', 'POSTO'].includes(movimentoDe(d)))
    .reduce((a, d) => a + numSitio(d.quantidade), 0);
  const aPagarMes = doMes.filter(d => d.situacao === 'A_PAGAR').reduce((a, d) => a + numSitio(d.valorTotal), 0);

  return (
    <div className="space-y-5">
      {/* Faixa principal: gasto do mês + tanques */}
      <section className="relative overflow-hidden rounded-3xl bg-[#022013] text-white">
        <div className="pointer-events-none absolute -left-20 -top-24 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 w-80 h-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 p-5 sm:p-7">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">Gasto do sítio · {rotuloMes(mes)}</div>
            <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight tabular-nums bg-gradient-to-r from-white via-emerald-100 to-lime-200 bg-clip-text text-transparent">
              {moeda(totalMes)}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70 tabular-nums">
              <span>
                <strong className="text-white">{fmtNum(horasMes, 1)} h</strong> de máquina
              </span>
              <span>
                <strong className="text-white">{fmtNum(litrosConsumidosMes, 0)} L</strong> abastecidos
              </span>
              {aPagarMes > 0 && (
                <span>
                  <strong className="text-red-300">{moeda(aPagarMes)}</strong> a pagar
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:border-l lg:border-white/10 lg:pl-6">
            {estado.tanques.map(t => (
              <button key={t.combustivel} type="button" onClick={() => irPara?.('COMBUSTIVEL')} className="text-left cursor-pointer">
                <MedidorTanque
                  compacto
                  rotulo={ROTULO_COMBUSTIVEL[t.combustivel]}
                  saldo={t.saldoLitros}
                  capacidade={t.capacidadeLitros}
                  tom={t.combustivel === 'DIESEL' ? 'diesel' : 'gasolina'}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Ações rápidas do campo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BotaoAcao onClick={() => setModal('ABASTECER')} tom="sky" icone={<Tractor className="w-5 h-5" />} titulo="Abastecer" sub="Do tanque ou no posto" />
        <BotaoAcao onClick={() => setModal('HORAS')} icone={<Timer className="w-5 h-5" />} titulo="Apontar horas" sub="Uso da máquina no dia" />
        <BotaoAcao onClick={() => setModal('DESPESA')} tom="amber" icone={<Receipt className="w-5 h-5" />} titulo="Lançar despesa" sub="Peças, diárias, insumos…" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gasto por categoria */}
        <section className="rounded-3xl bg-white border border-slate-200 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Por categoria</h2>
            <button type="button" onClick={() => irPara?.('DESPESAS')} className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer">
              Despesas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {porCategoria.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">Nenhum gasto lançado em {rotuloMes(mes)}.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {porCategoria.map(c => (
                <li key={c.categoria}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700">{ROTULO_CATEGORIA[c.categoria]}</span>
                    <span className="font-black tabular-nums text-slate-900">
                      {moeda(c.valor)}
                      <span className="ml-2 text-xs font-bold text-slate-400">{totalMes > 0 ? Math.round((c.valor / totalMes) * 100) : 0}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.categoria.startsWith('COMBUSTIVEL') ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-700 to-emerald-500'}`}
                      style={{ width: `${maiorCat > 0 ? (c.valor / maiorCat) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Horas por máquina */}
        <section className="rounded-3xl bg-white border border-slate-200 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Horas por máquina</h2>
            <button type="button" onClick={() => irPara?.('HORAS')} className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer">
              Horas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {metricas.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">
              Nenhuma máquina cadastrada.{' '}
              <button type="button" onClick={() => irPara?.('MAQUINAS')} className="font-bold text-emerald-800 underline cursor-pointer">
                Cadastrar
              </button>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {metricas.map(m => (
                <li key={m.maquina.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                    <IconeMaquina tipo={m.maquina.tipo} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-bold text-slate-800 truncate">{m.maquina.nome}</span>
                      <span className="font-black tabular-nums text-slate-900 shrink-0">{fmtNum(m.horasMes, 1)} h</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${maiorHoras > 0 ? (m.horasMes / maiorHoras) * 100 : 0}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
                      {m.maquina.medidor === 'HODOMETRO'
                        ? m.kmPorLitro !== null
                          ? `${fmtNum(m.kmPorLitro, 1)} km/L`
                          : 'km/L sem leituras'
                        : m.consumoLh !== null
                        ? `${fmtNum(m.consumoLh, 1)} L/h`
                        : 'L/h sem dados'}
                      {m.custoPorHora !== null ? ` · ${moeda(m.custoPorHora)}/h de combustível` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Últimos lançamentos */}
      <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Últimos lançamentos</h2>
        </div>
        <div className="border-t border-slate-100">
          <ListaLancamentos itens={doMes.slice(0, 8)} vazio={`Nada lançado em ${rotuloMes(mes)}.`} />
        </div>
      </section>

      {modal === 'ABASTECER' && <FormAbastecimento estado={estado} aplicar={aplicar} onFechar={() => setModal(null)} />}
      {modal === 'HORAS' && <FormApontamento estado={estado} aplicar={aplicar} onFechar={() => setModal(null)} />}
      {modal === 'DESPESA' && <FormDespesa estado={estado} aplicar={aplicar} onFechar={() => setModal(null)} />}
    </div>
  );
}
