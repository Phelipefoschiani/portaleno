import React, { useMemo, useState } from 'react';
import { Fuel, Tractor, MapPin, Settings2 } from 'lucide-react';
import { hojeISO, somarDias, compararDatas } from '../../lib/datas';
import {
  ControleSitioCompleto,
  DespesaSitio,
  TipoCombustivel,
  SituacaoPagamento,
  COMBUSTIVEIS,
  COMBUSTIVEIS_TANQUE,
  ROTULO_COMBUSTIVEL,
  registrarCompraCombustivel,
  registrarAbastecimento,
  ajustarCapacidadeTanque,
  custoMedioLitro,
  leituraAtual,
  tanqueDe,
  movimentoDe,
  chaveMes,
  numSitio
} from '../../data/sitioControleData';
import {
  PropsAba,
  Folha,
  Campo,
  Segmentado,
  ErroBox,
  BlocoPagamento,
  MedidorTanque,
  BotaoAcao,
  inputCls,
  moeda,
  fmtNum,
  rotuloMes
} from './ui';
import { ListaLancamentos } from './ListaLancamentos';

type Aplicar = (novo: ControleSitioCompleto, lancamento?: DespesaSitio) => boolean;

// ============================================================
// Compra / entrada no tanque
// ============================================================

export function FormCompra({
  estado,
  aplicar,
  onFechar,
  combustivelInicial = 'DIESEL'
}: {
  estado: ControleSitioCompleto;
  aplicar: Aplicar;
  onFechar: () => void;
  combustivelInicial?: TipoCombustivel;
}) {
  const [f, setF] = useState({
    data: hojeISO(),
    combustivel: combustivelInicial,
    litros: '',
    valorTotal: '',
    fornecedor: '',
    numeroNF: '',
    formaPagamento: 'PIX',
    situacao: 'PAGO' as SituacaoPagamento,
    vencimento: somarDias(hojeISO(), 30),
    observacao: ''
  });
  const [erro, setErro] = useState<string | null>(null);
  const tanque = tanqueDe(estado, f.combustivel);
  const litros = numSitio(f.litros);
  const total = numSitio(f.valorTotal);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = registrarCompraCombustivel(estado, { ...f, litros, valorTotal: total });
    if (!r.ok) return setErro(r.erro);
    if (!aplicar(r.estado, r.lancamento)) return; // sem saldo no caixa: mantém o formulário aberto
    onFechar();
  };

  return (
    <Folha
      titulo="Entrada de combustível"
      subtitulo="Compra que enche o tanque do sítio"
      icone={<Fuel className="w-6 h-6" />}
      onFechar={onFechar}
      onSubmit={enviar}
      rotuloConfirmar="Registrar compra"
    >
      <Campo rotulo="Combustível">
        <Segmentado<TipoCombustivel>
          valor={f.combustivel}
          onChange={v => setF({ ...f, combustivel: v })}
          opcoes={COMBUSTIVEIS_TANQUE.map(c => ({ valor: c, rotulo: ROTULO_COMBUSTIVEL[c] }))}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Litros">
          <input inputMode="decimal" type="number" step="any" min="0" required className={inputCls} value={f.litros} onChange={e => setF({ ...f, litros: e.target.value })} />
        </Campo>
        <Campo rotulo="Valor total (R$)" dica={litros > 0 && total > 0 ? `${moeda(total / litros)} por litro` : undefined}>
          <input inputMode="decimal" type="number" step="0.01" min="0" required className={inputCls} value={f.valorTotal} onChange={e => setF({ ...f, valorTotal: e.target.value })} />
        </Campo>
      </div>
      {tanque && (
        <div className="rounded-2xl bg-emerald-950 text-white px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Saldo depois</div>
            <div className="text-xl font-black tabular-nums">{fmtNum(tanque.saldoLitros + litros, 0)} L</div>
          </div>
          <div className="text-right text-xs text-emerald-200/80 tabular-nums">
            agora {fmtNum(tanque.saldoLitros, 0)} L<br />
            cabem {fmtNum(Math.max(0, tanque.capacidadeLitros - tanque.saldoLitros), 0)} L
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data">
          <input type="date" required className={inputCls} value={f.data} onChange={e => setF({ ...f, data: e.target.value })} />
        </Campo>
        <Campo rotulo="Nota fiscal (opcional)">
          <input className={inputCls} value={f.numeroNF} onChange={e => setF({ ...f, numeroNF: e.target.value })} placeholder="Nº da NF" />
        </Campo>
      </div>
      <Campo rotulo="Fornecedor / distribuidora">
        <input className={inputCls} value={f.fornecedor} onChange={e => setF({ ...f, fornecedor: e.target.value })} placeholder="Ex.: Posto Rota do Agro" />
      </Campo>
      <BlocoPagamento
        forma={f.formaPagamento}
        situacao={f.situacao}
        vencimento={f.vencimento}
        onChange={p =>
          setF({
            ...f,
            formaPagamento: p.forma ?? f.formaPagamento,
            situacao: p.situacao ?? f.situacao,
            vencimento: p.vencimento ?? f.vencimento
          })
        }
      />
      <ErroBox erro={erro} />
    </Folha>
  );
}

// ============================================================
// Abastecimento de máquina (tanque ou posto)
// ============================================================

export function FormAbastecimento({
  estado,
  aplicar,
  onFechar,
  origemInicial = 'TANQUE'
}: {
  estado: ControleSitioCompleto;
  aplicar: Aplicar;
  onFechar: () => void;
  origemInicial?: 'TANQUE' | 'POSTO';
}) {
  const ativas = estado.maquinas.filter(m => m.ativo);
  const primeira = ativas[0];
  const [f, setF] = useState({
    origem: origemInicial,
    data: hojeISO(),
    maquinaId: primeira?.id || '',
    combustivel: (primeira?.combustivel || 'DIESEL') as TipoCombustivel,
    litros: '',
    leitura: '',
    operador: '',
    observacao: '',
    valorTotal: '',
    posto: '',
    numeroNF: '',
    formaPagamento: 'PIX',
    situacao: 'PAGO' as SituacaoPagamento,
    vencimento: somarDias(hojeISO(), 30)
  });
  const [erro, setErro] = useState<string | null>(null);
  const maq = estado.maquinas.find(m => m.id === f.maquinaId);
  const litros = numSitio(f.litros);
  const tanque = tanqueDe(estado, f.combustivel);
  const custoL = custoMedioLitro(estado, f.combustivel);
  const ultimaLeitura = maq ? leituraAtual(estado, maq.id) : 0;
  const un = maq?.medidor === 'HODOMETRO' ? 'km' : 'h';
  const semTanque = f.origem === 'TANQUE' && !tanque;

  const escolherMaquina = (id: string) => {
    const m = estado.maquinas.find(x => x.id === id);
    setF({ ...f, maquinaId: id, combustivel: m?.combustivel || f.combustivel });
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = registrarAbastecimento(estado, {
      ...f,
      litros,
      leitura: numSitio(f.leitura),
      valorTotal: numSitio(f.valorTotal)
    });
    if (!r.ok) return setErro(r.erro);
    if (!aplicar(r.estado, r.lancamento)) return; // sem saldo no caixa: mantém o formulário aberto
    onFechar();
  };

  if (ativas.length === 0) {
    return (
      <Folha titulo="Abastecer máquina" icone={<Tractor className="w-6 h-6" />} onFechar={onFechar} onSubmit={e => { e.preventDefault(); onFechar(); }} rotuloConfirmar="Entendi">
        <p className="text-sm text-slate-600">Cadastre antes a máquina na aba <strong>Máquinas</strong> (trator, caminhonete, roçadeira…).</p>
      </Folha>
    );
  }

  return (
    <Folha
      titulo={f.origem === 'TANQUE' ? 'Abastecer do tanque' : 'Abasteceu no posto'}
      subtitulo={f.origem === 'TANQUE' ? 'Sai do saldo do tanque do sítio' : 'Vira despesa; não mexe no tanque'}
      icone={f.origem === 'TANQUE' ? <Tractor className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
      onFechar={onFechar}
      onSubmit={enviar}
      rotuloConfirmar="Registrar abastecimento"
      corConfirmar="sky"
    >
      <Segmentado<'TANQUE' | 'POSTO'>
        cor="sky"
        valor={f.origem}
        onChange={v => setF({ ...f, origem: v })}
        opcoes={[
          { valor: 'TANQUE', rotulo: 'Do tanque do sítio' },
          { valor: 'POSTO', rotulo: 'Direto no posto' }
        ]}
      />
      <Campo rotulo="Máquina">
        <select className={inputCls} value={f.maquinaId} onChange={e => escolherMaquina(e.target.value)}>
          {ativas.map(m => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Combustível">
        <Segmentado<TipoCombustivel>
          cor="sky"
          valor={f.combustivel}
          onChange={v => setF({ ...f, combustivel: v })}
          opcoes={(f.origem === 'TANQUE' ? COMBUSTIVEIS_TANQUE : COMBUSTIVEIS).map(c => ({ valor: c, rotulo: ROTULO_COMBUSTIVEL[c] }))}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Litros">
          <input inputMode="decimal" type="number" step="any" min="0" required className={inputCls} value={f.litros} onChange={e => setF({ ...f, litros: e.target.value })} />
        </Campo>
        <Campo
          rotulo={maq?.medidor === 'HODOMETRO' ? 'Hodômetro (km)' : 'Horímetro (h)'}
          dica={ultimaLeitura > 0 ? `Última: ${fmtNum(ultimaLeitura, 1)} ${un}` : 'Opcional'}
        >
          <input inputMode="decimal" type="number" step="any" min="0" className={inputCls} value={f.leitura} onChange={e => setF({ ...f, leitura: e.target.value })} />
        </Campo>
      </div>

      {f.origem === 'TANQUE' ? (
        semTanque ? (
          <ErroBox erro={`Não há tanque de ${ROTULO_COMBUSTIVEL[f.combustivel]} no sítio. Use "Direto no posto".`} />
        ) : (
          tanque && (
            <div className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-3 ${litros > tanque.saldoLitros ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-sky-950 text-white'}`}>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-70">Saldo depois</div>
                <div className="text-xl font-black tabular-nums">
                  {litros > tanque.saldoLitros ? 'Saldo insuficiente' : `${fmtNum(tanque.saldoLitros - litros, 0)} L`}
                </div>
              </div>
              <div className="text-right text-xs opacity-75 tabular-nums">
                tanque {fmtNum(tanque.saldoLitros, 0)} L<br />
                {custoL > 0 ? `custo médio ${moeda(custoL)}/L` : 'sem compras p/ custo'}
              </div>
            </div>
          )
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Valor pago (R$)" dica={litros > 0 && numSitio(f.valorTotal) > 0 ? `${moeda(numSitio(f.valorTotal) / litros)}/L` : undefined}>
              <input inputMode="decimal" type="number" step="0.01" min="0" required className={inputCls} value={f.valorTotal} onChange={e => setF({ ...f, valorTotal: e.target.value })} />
            </Campo>
            <Campo rotulo="Posto">
              <input className={inputCls} value={f.posto} onChange={e => setF({ ...f, posto: e.target.value })} placeholder="Nome do posto" />
            </Campo>
          </div>
          <Campo rotulo="Nota / cupom (opcional)">
            <input className={inputCls} value={f.numeroNF} onChange={e => setF({ ...f, numeroNF: e.target.value })} />
          </Campo>
          <BlocoPagamento
            forma={f.formaPagamento}
            situacao={f.situacao}
            vencimento={f.vencimento}
            onChange={p =>
              setF({
                ...f,
                formaPagamento: p.forma ?? f.formaPagamento,
                situacao: p.situacao ?? f.situacao,
                vencimento: p.vencimento ?? f.vencimento
              })
            }
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data">
          <input type="date" required className={inputCls} value={f.data} onChange={e => setF({ ...f, data: e.target.value })} />
        </Campo>
        <Campo rotulo="Operador">
          <input className={inputCls} value={f.operador} onChange={e => setF({ ...f, operador: e.target.value })} placeholder="Quem abasteceu" />
        </Campo>
      </div>
      <Campo rotulo="Observação">
        <input className={inputCls} value={f.observacao} onChange={e => setF({ ...f, observacao: e.target.value })} placeholder="Opcional" />
      </Campo>
      <ErroBox erro={erro} />
    </Folha>
  );
}

// ============================================================
// Ajuste de capacidade
// ============================================================

function FormCapacidade({ estado, aplicar, onFechar }: { estado: ControleSitioCompleto; aplicar: Aplicar; onFechar: () => void }) {
  const [caps, setCaps] = useState<Record<string, string>>(() =>
    Object.fromEntries(estado.tanques.map(t => [t.combustivel, String(t.capacidadeLitros)]))
  );
  const [erro, setErro] = useState<string | null>(null);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    let atual = estado;
    for (const t of estado.tanques) {
      const r = ajustarCapacidadeTanque(atual, t.combustivel, numSitio(caps[t.combustivel]));
      if (!r.ok) return setErro(`${ROTULO_COMBUSTIVEL[t.combustivel]}: ${r.erro}`);
      atual = r.estado;
    }
    aplicar(atual);
    onFechar();
  };
  return (
    <Folha titulo="Capacidade dos tanques" icone={<Settings2 className="w-6 h-6" />} onFechar={onFechar} onSubmit={enviar} rotuloConfirmar="Salvar">
      {estado.tanques.map(t => (
        <div key={t.combustivel}>
          <Campo rotulo={`Tanque de ${ROTULO_COMBUSTIVEL[t.combustivel]} (L)`} dica={`Saldo atual ${fmtNum(t.saldoLitros, 0)} L`}>
            <input inputMode="numeric" type="number" min="1" step="any" className={inputCls} value={caps[t.combustivel] || ''} onChange={e => setCaps({ ...caps, [t.combustivel]: e.target.value })} />
          </Campo>
        </div>
      ))}
      <ErroBox erro={erro} />
    </Folha>
  );
}

// ============================================================
// Aba
// ============================================================

type Filtro = 'TODOS' | 'COMPRA' | 'ABASTECIMENTO' | 'POSTO';

export function AbaCombustivel({ estado, mes, aplicar }: PropsAba) {
  const [modal, setModal] = useState<null | 'COMPRA' | 'TANQUE' | 'POSTO' | 'CAPACIDADE'>(null);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const doMes = useMemo(
    () =>
      estado.despesas
        .filter(d => movimentoDe(d) !== 'DESPESA' && chaveMes(d.data) === mes)
        .sort((a, b) => compararDatas(b.data, a.data)),
    [estado.despesas, mes]
  );
  const lista = filtro === 'TODOS' ? doMes : doMes.filter(d => movimentoDe(d) === filtro);

  const resumo = useMemo(() => {
    const r = { compradoL: 0, compradoR$: 0, consumidoL: 0, postoL: 0, postoR$: 0 };
    doMes.forEach(d => {
      const mov = movimentoDe(d);
      if (mov === 'COMPRA') {
        r.compradoL += numSitio(d.quantidade);
        r.compradoR$ += numSitio(d.valorTotal);
      } else if (mov === 'ABASTECIMENTO') r.consumidoL += numSitio(d.quantidade);
      else if (mov === 'POSTO') {
        r.postoL += numSitio(d.quantidade);
        r.postoR$ += numSitio(d.valorTotal);
      }
    });
    return r;
  }, [doMes]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-[#022013] text-white p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 -top-20 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">Tanques do sítio</div>
          <button type="button" onClick={() => setModal('CAPACIDADE')} className="text-xs font-bold text-emerald-200 hover:text-white flex items-center gap-1 cursor-pointer">
            <Settings2 className="w-4 h-4" /> Capacidade
          </button>
        </div>
        <div className="relative mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {estado.tanques.map(t => (
            <div key={t.combustivel}>
              <MedidorTanque
                rotulo={ROTULO_COMBUSTIVEL[t.combustivel]}
                saldo={t.saldoLitros}
                capacidade={t.capacidadeLitros}
                tom={t.combustivel === 'DIESEL' ? 'diesel' : 'gasolina'}
              />
              <div className="mt-2 text-xs text-white/55 tabular-nums">
                custo médio {custoMedioLitro(estado, t.combustivel) > 0 ? `${moeda(custoMedioLitro(estado, t.combustivel))}/L` : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BotaoAcao onClick={() => setModal('TANQUE')} tom="sky" icone={<Tractor className="w-5 h-5" />} titulo="Abastecer máquina" sub="Tirar do tanque" />
        <BotaoAcao onClick={() => setModal('COMPRA')} icone={<Fuel className="w-5 h-5" />} titulo="Entrada no tanque" sub="Compra de diesel/gasolina" />
        <BotaoAcao onClick={() => setModal('POSTO')} tom="claro" icone={<MapPin className="w-5 h-5" />} titulo="Abasteceu no posto" sub="Fora do tanque, vira despesa" />
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Movimento de {rotuloMes(mes)}</h2>
            <div className="text-xs text-slate-500 tabular-nums">
              entrou <strong className="text-emerald-800">{fmtNum(resumo.compradoL, 0)} L</strong> ({moeda(resumo.compradoR$)}) · saiu{' '}
              <strong className="text-sky-800">{fmtNum(resumo.consumidoL, 0)} L</strong> · posto{' '}
              <strong className="text-orange-700">{fmtNum(resumo.postoL, 0)} L</strong> ({moeda(resumo.postoR$)})
            </div>
          </div>
          <div className="mt-3">
            <Segmentado<Filtro>
              valor={filtro}
              onChange={setFiltro}
              opcoes={[
                { valor: 'TODOS', rotulo: 'Tudo' },
                { valor: 'ABASTECIMENTO', rotulo: 'Abastecimentos' },
                { valor: 'COMPRA', rotulo: 'Compras' },
                { valor: 'POSTO', rotulo: 'Posto' }
              ]}
            />
          </div>
        </div>
        <div className="border-t border-slate-100">
          <ListaLancamentos itens={lista} vazio="Nenhum movimento de combustível neste mês." />
        </div>
      </section>

      {modal === 'COMPRA' && <FormCompra estado={estado} aplicar={aplicar} onFechar={() => setModal(null)} />}
      {(modal === 'TANQUE' || modal === 'POSTO') && (
        <FormAbastecimento estado={estado} aplicar={aplicar} origemInicial={modal} onFechar={() => setModal(null)} />
      )}
      {modal === 'CAPACIDADE' && <FormCapacidade estado={estado} aplicar={aplicar} onFechar={() => setModal(null)} />}
    </div>
  );
}
