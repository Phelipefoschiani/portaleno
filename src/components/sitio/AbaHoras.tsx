import React, { useMemo, useState } from 'react';
import { Timer, Trash2, AlertTriangle } from 'lucide-react';
import { hojeISO, compararDatas, formatarDataBR } from '../../lib/datas';
import {
  ControleSitioCompleto,
  DespesaSitio,
  ATIVIDADES_SUGERIDAS,
  registrarApontamento,
  excluirApontamento,
  leituraAtual,
  metricasMaquinas,
  chaveMes,
  numSitio
} from '../../data/sitioControleData';
import { PropsAba, Folha, Campo, Segmentado, ErroBox, BotaoAcao, inputCls, moeda, fmtNum, rotuloMes } from './ui';

type Aplicar = (novo: ControleSitioCompleto, lancamento?: DespesaSitio) => boolean;

export function FormApontamento({ estado, aplicar, onFechar }: { estado: ControleSitioCompleto; aplicar: Aplicar; onFechar: () => void }) {
  const ativas = estado.maquinas.filter(m => m.ativo);
  const primeira = ativas[0];
  const [f, setF] = useState({
    data: hojeISO(),
    maquinaId: primeira?.id || '',
    modo: 'HORIMETRO' as 'HORIMETRO' | 'HORAS',
    horimetroInicial: primeira ? String(leituraAtual(estado, primeira.id) || '') : '',
    horimetroFinal: '',
    horas: '',
    operador: '',
    atividade: '',
    talhao: '',
    observacao: ''
  });
  const [erro, setErro] = useState<string | null>(null);

  const ini = numSitio(f.horimetroInicial);
  const fim = numSitio(f.horimetroFinal);
  const finalMenor = f.modo === 'HORIMETRO' && f.horimetroFinal !== '' && fim < ini;
  const horasCalc = f.modo === 'HORIMETRO' ? (fim > ini ? fim - ini : 0) : numSitio(f.horas);

  const escolherMaquina = (id: string) => {
    setF({ ...f, maquinaId: id, horimetroInicial: String(leituraAtual(estado, id) || '') });
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = registrarApontamento(estado, {
      ...f,
      horimetroInicial: ini,
      horimetroFinal: fim,
      horas: numSitio(f.horas)
    });
    if (!r.ok) return setErro(r.erro);
    aplicar(r.estado);
    onFechar();
  };

  if (ativas.length === 0) {
    return (
      <Folha titulo="Apontar horas" icone={<Timer className="w-6 h-6" />} onFechar={onFechar} onSubmit={e => { e.preventDefault(); onFechar(); }} rotuloConfirmar="Entendi">
        <p className="text-sm text-tinta-2">Cadastre antes a máquina na aba <strong>Máquinas</strong>.</p>
      </Folha>
    );
  }

  return (
    <Folha titulo="Apontar horas de máquina" subtitulo="Uso do dia: horímetro ou horas trabalhadas" icone={<Timer className="w-6 h-6" />} onFechar={onFechar} onSubmit={enviar} rotuloConfirmar="Salvar apontamento">
      <Campo rotulo="Máquina">
        <select className={inputCls} value={f.maquinaId} onChange={e => escolherMaquina(e.target.value)}>
          {ativas.map(m => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Segmentado<'HORIMETRO' | 'HORAS'>
        valor={f.modo}
        onChange={v => setF({ ...f, modo: v })}
        opcoes={[
          { valor: 'HORIMETRO', rotulo: 'Pelo horímetro' },
          { valor: 'HORAS', rotulo: 'Só as horas' }
        ]}
      />
      {f.modo === 'HORIMETRO' ? (
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Horímetro início">
            <input inputMode="decimal" type="number" step="any" min="0" className={inputCls} value={f.horimetroInicial} onChange={e => setF({ ...f, horimetroInicial: e.target.value })} />
          </Campo>
          <Campo rotulo="Horímetro fim">
            <input
              inputMode="decimal"
              type="number"
              step="any"
              min="0"
              required
              className={`${inputCls} ${finalMenor ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
              value={f.horimetroFinal}
              onChange={e => setF({ ...f, horimetroFinal: e.target.value })}
            />
          </Campo>
        </div>
      ) : (
        <Campo rotulo="Horas trabalhadas">
          <input inputMode="decimal" type="number" step="0.1" min="0" required className={inputCls} value={f.horas} onChange={e => setF({ ...f, horas: e.target.value })} />
        </Campo>
      )}
      {finalMenor ? (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Horímetro final menor que o inicial. Confira a leitura no painel da máquina.
        </div>
      ) : (
        horasCalc > 0 && (
          <div className="rounded-2xl bg-emerald-950 text-white px-4 py-3 flex items-baseline justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Trabalhou</span>
            <span className="text-2xl font-black tabular-nums">{fmtNum(horasCalc, 1)} h</span>
          </div>
        )
      )}
      <Campo rotulo="Atividade">
        <input className={inputCls} list="sitio-atividades" required value={f.atividade} onChange={e => setF({ ...f, atividade: e.target.value })} placeholder="Ex.: Gradagem" />
        <datalist id="sitio-atividades">
          {ATIVIDADES_SUGERIDAS.map(a => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </Campo>
      <div className="flex flex-wrap gap-1.5 -mt-1">
        {ATIVIDADES_SUGERIDAS.slice(0, 6).map(a => (
          <button
            key={a}
            type="button"
            onClick={() => setF({ ...f, atividade: a })}
            className={`min-h-9 px-3 rounded-lg text-xs font-bold border cursor-pointer ${f.atividade === a ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-papel text-tinta-2 border-linha-forte'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Talhão / área">
          <input className={inputCls} value={f.talhao} onChange={e => setF({ ...f, talhao: e.target.value })} placeholder="Opcional" />
        </Campo>
        <Campo rotulo="Data">
          <input type="date" required className={inputCls} value={f.data} onChange={e => setF({ ...f, data: e.target.value })} />
        </Campo>
      </div>
      <Campo rotulo="Operador">
        <input className={inputCls} value={f.operador} onChange={e => setF({ ...f, operador: e.target.value })} placeholder="Quem operou" />
      </Campo>
      <Campo rotulo="Observação">
        <input className={inputCls} value={f.observacao} onChange={e => setF({ ...f, observacao: e.target.value })} placeholder="Opcional" />
      </Campo>
      <ErroBox erro={erro} />
    </Folha>
  );
}

export function AbaHoras({ estado, mes, aplicar }: PropsAba) {
  const [aberto, setAberto] = useState(false);
  const [filtroMaquina, setFiltroMaquina] = useState('TODAS');
  const metricas = useMemo(() => metricasMaquinas(estado, mes), [estado, mes]);
  const nomeMaq = (id: string) => estado.maquinas.find(m => m.id === id)?.nome || 'Máquina removida';

  const apontamentosMes = useMemo(
    () =>
      estado.apontamentos
        .filter(a => chaveMes(a.data) === mes && (filtroMaquina === 'TODAS' || a.maquinaId === filtroMaquina))
        .sort((a, b) => compararDatas(b.data, a.data)),
    [estado.apontamentos, mes, filtroMaquina]
  );
  const totalHorasMes = metricas.reduce((a, m) => a + m.horasMes, 0);

  const excluir = (id: string) => {
    if (!window.confirm('Excluir este apontamento de horas?')) return;
    aplicar(excluirApontamento(estado, id));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-stretch">
        <BotaoAcao onClick={() => setAberto(true)} icone={<Timer className="w-5 h-5" />} titulo="Apontar horas" sub="Horímetro início/fim ou horas do dia" />
        <div className="rounded-2xl bg-eno-900 text-white px-5 py-3 flex items-center justify-between sm:justify-end gap-4">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">{rotuloMes(mes)}</span>
          <span className="text-3xl font-black tabular-nums tracking-tight">
            {fmtNum(totalHorasMes, 1)}
            <span className="text-base text-white/60 ml-1">h</span>
          </span>
        </div>
      </div>

      {metricas.length === 0 ? (
        <div className="rounded-3xl bg-papel border border-linha p-6 text-sm text-cinza text-center">
          Nenhuma máquina cadastrada. Cadastre na aba Máquinas para apontar horas.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {metricas
            .filter(m => m.maquina.ativo || m.horasTotal > 0)
            .map(m => (
              <article key={m.maquina.id} className="relative overflow-hidden rounded-3xl bg-papel border border-linha p-5">
                <div className="pointer-events-none absolute -right-8 -top-10 w-32 h-32 rounded-full bg-emerald-100/70 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-black text-tinta truncate">{m.maquina.nome}</h3>
                    <div className="text-xs text-cinza tabular-nums">
                      {m.maquina.medidor === 'HODOMETRO' ? 'Hodômetro' : 'Horímetro'} {fmtNum(m.leituraAtual, 1)}
                      {!m.maquina.ativo && ' · inativa'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black tabular-nums tracking-tight text-emerald-900 leading-none">{fmtNum(m.horasMes, 1)}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cinza-claro mt-1">h no mês</div>
                  </div>
                </div>
                <dl className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-papel-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-cinza-claro">Total</dt>
                    <dd className="font-black tabular-nums text-tinta">{fmtNum(m.horasTotal, 1)} h</dd>
                  </div>
                  <div className="rounded-xl bg-papel-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-cinza-claro">{m.maquina.medidor === 'HODOMETRO' ? 'km/L' : 'L/h'}</dt>
                    <dd className="font-black tabular-nums text-tinta">
                      {m.maquina.medidor === 'HODOMETRO'
                        ? m.kmPorLitro !== null
                          ? fmtNum(m.kmPorLitro, 1)
                          : '—'
                        : m.consumoLh !== null
                        ? fmtNum(m.consumoLh, 1)
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-papel-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-cinza-claro">R$/h</dt>
                    <dd className="font-black tabular-nums text-tinta text-sm leading-6">{m.custoPorHora !== null ? moeda(m.custoPorHora) : '—'}</dd>
                  </div>
                </dl>
                <p className="relative mt-2 text-[11px] text-cinza-claro tabular-nums">
                  {fmtNum(m.litrosTotal, 0)} L abastecidos no total · {fmtNum(m.litrosMes, 0)} L no mês
                </p>
              </article>
            ))}
        </section>
      )}

      <section className="rounded-3xl bg-papel border border-linha overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-tight text-tinta">Apontamentos de {rotuloMes(mes)}</h2>
          <select className={`${inputCls} sm:w-60 h-11`} value={filtroMaquina} onChange={e => setFiltroMaquina(e.target.value)}>
            <option value="TODAS">Todas as máquinas</option>
            {estado.maquinas.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        {apontamentosMes.length === 0 ? (
          <p className="py-8 text-center text-sm text-cinza border-t border-linha">Nenhuma hora apontada neste mês.</p>
        ) : (
          <ul className="divide-y divide-linha border-t border-linha">
            {apontamentosMes.map(a => (
              <li key={a.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                <div className="w-12 shrink-0 text-center">
                  <div className="text-lg font-black leading-none tabular-nums">{formatarDataBR(a.data).slice(0, 2)}</div>
                  <div className="text-[10px] font-bold uppercase text-cinza-claro tabular-nums">{formatarDataBR(a.data).slice(3, 5)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-tinta truncate">
                    {nomeMaq(a.maquinaId)} · {a.atividade}
                    {a.talhao ? ` · ${a.talhao}` : ''}
                  </div>
                  <div className="text-xs text-cinza truncate tabular-nums">
                    {a.horimetroFinal !== undefined && a.horimetroFinal !== null
                      ? `${fmtNum(a.horimetroInicial, 1)} → ${fmtNum(a.horimetroFinal, 1)}`
                      : 'horas informadas'}
                    {a.operador ? ` · ${a.operador}` : ''}
                  </div>
                </div>
                <div className="text-lg font-black tabular-nums text-emerald-900 shrink-0">{fmtNum(a.horas, 1)} h</div>
                <button
                  type="button"
                  onClick={() => excluir(a.id)}
                  aria-label="Excluir apontamento"
                  className="w-10 h-10 shrink-0 rounded-xl text-cinza-claro hover:text-red-700 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {aberto && <FormApontamento estado={estado} aplicar={aplicar} onFechar={() => setAberto(false)} />}
    </div>
  );
}
