import React, { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { hojeISO, somarDias, compararDatas } from '../../lib/datas';
import {
  ControleSitioCompleto,
  DespesaSitio,
  CategoriaDespesaSitio,
  SituacaoPagamento,
  CATEGORIAS_DESPESA,
  ROTULO_CATEGORIA,
  registrarDespesa,
  gastoPorCategoria,
  categoriaDe,
  ehGasto,
  chaveMes,
  numSitio
} from '../../data/sitioControleData';
import { PropsAba, Folha, Campo, ErroBox, BlocoPagamento, BotaoAcao, inputCls, moeda, rotuloMes } from './ui';
import { ListaLancamentos } from './ListaLancamentos';

type Aplicar = (novo: ControleSitioCompleto, lancamento?: DespesaSitio) => void;

export function FormDespesa({ estado, aplicar, onFechar }: { estado: ControleSitioCompleto; aplicar: Aplicar; onFechar: () => void }) {
  const [f, setF] = useState({
    data: hojeISO(),
    categoria: 'PECAS' as CategoriaDespesaSitio,
    descricao: '',
    valorTotal: '',
    maquinaId: '',
    fornecedor: '',
    numeroNF: '',
    formaPagamento: 'PIX',
    situacao: 'PAGO' as SituacaoPagamento,
    vencimento: somarDias(hojeISO(), 30),
    responsavel: '',
    observacao: ''
  });
  const [erro, setErro] = useState<string | null>(null);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = registrarDespesa(estado, { ...f, valorTotal: numSitio(f.valorTotal), maquinaId: f.maquinaId || undefined });
    if (!r.ok) return setErro(r.erro);
    aplicar(r.estado, r.lancamento);
    onFechar();
  };

  return (
    <Folha
      titulo="Lançar despesa"
      subtitulo="Peças, manutenção, diárias, insumos e outros gastos do sítio"
      icone={<Receipt className="w-6 h-6" />}
      onFechar={onFechar}
      onSubmit={enviar}
      rotuloConfirmar="Lançar despesa"
      corConfirmar="amber"
    >
      <Campo rotulo="Categoria">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIAS_DESPESA.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setF({ ...f, categoria: c })}
              aria-pressed={f.categoria === c}
              className={`min-h-11 px-2 rounded-xl border text-xs font-bold leading-tight cursor-pointer transition-colors ${
                f.categoria === c ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {ROTULO_CATEGORIA[c]}
            </button>
          ))}
        </div>
      </Campo>
      <Campo rotulo="Descrição">
        <input
          className={inputCls}
          required
          value={f.descricao}
          onChange={e => setF({ ...f, descricao: e.target.value })}
          placeholder={f.categoria === 'INSUMOS' ? 'Ex.: Calcário 10 t' : f.categoria === 'MAO_DE_OBRA' ? 'Ex.: Diária plantio (3 pessoas)' : 'Ex.: Filtro de óleo'}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Valor (R$)">
          <input inputMode="decimal" type="number" step="0.01" min="0" required className={inputCls} value={f.valorTotal} onChange={e => setF({ ...f, valorTotal: e.target.value })} />
        </Campo>
        <Campo rotulo="Data">
          <input type="date" required className={inputCls} value={f.data} onChange={e => setF({ ...f, data: e.target.value })} />
        </Campo>
      </div>
      <Campo rotulo="Máquina (opcional)">
        <select className={inputCls} value={f.maquinaId} onChange={e => setF({ ...f, maquinaId: e.target.value })}>
          <option value="">Geral do sítio</option>
          {estado.maquinas.map(m => (
            <option key={m.id} value={m.id}>
              {m.nome}
              {m.ativo ? '' : ' (inativa)'}
            </option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Fornecedor">
          <input className={inputCls} value={f.fornecedor} onChange={e => setF({ ...f, fornecedor: e.target.value })} placeholder="Quem recebeu" />
        </Campo>
        <Campo rotulo="Nota (opcional)">
          <input className={inputCls} value={f.numeroNF} onChange={e => setF({ ...f, numeroNF: e.target.value })} />
        </Campo>
      </div>
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
      <Campo rotulo="Responsável">
        <input className={inputCls} value={f.responsavel} onChange={e => setF({ ...f, responsavel: e.target.value })} placeholder="Quem lançou (opcional)" />
      </Campo>
      <ErroBox erro={erro} />
    </Folha>
  );
}

export function AbaDespesas({ estado, mes, aplicar }: PropsAba) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<'TODAS' | CategoriaDespesaSitio>('TODAS');
  const porCategoria = useMemo(() => gastoPorCategoria(estado, mes), [estado, mes]);
  const totalMes = porCategoria.reduce((a, c) => a + c.valor, 0);
  const maior = porCategoria[0]?.valor || 0;

  const lista = useMemo(
    () =>
      estado.despesas
        .filter(d => ehGasto(d) && chaveMes(d.data) === mes && (filtro === 'TODAS' || categoriaDe(d) === filtro))
        .sort((a, b) => compararDatas(b.data, a.data)),
    [estado.despesas, mes, filtro]
  );
  const aPagar = lista.filter(d => d.situacao === 'A_PAGAR').reduce((a, d) => a + numSitio(d.valorTotal), 0);

  return (
    <div className="space-y-5">
      <BotaoAcao onClick={() => setAberto(true)} tom="amber" icone={<Receipt className="w-5 h-5" />} titulo="Lançar despesa" sub="Peças, manutenção, diárias, insumos, energia, frete…" />

      <section className="relative overflow-hidden rounded-3xl bg-[#2a1a06] text-white p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300">Gasto em {rotuloMes(mes)}</div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums mt-1">{moeda(totalMes)}</div>
          </div>
          <div className="text-xs text-amber-100/70">inclui compra de combustível e posto</div>
        </div>
        {porCategoria.length > 0 && (
          <ul className="relative mt-5 space-y-2">
            {porCategoria.map(c => (
              <li key={c.categoria}>
                <button type="button" onClick={() => setFiltro(filtro === c.categoria ? 'TODAS' : c.categoria)} className="w-full text-left cursor-pointer group">
                  <div className="flex justify-between text-sm">
                    <span className={`font-bold ${filtro === c.categoria ? 'text-amber-300' : 'text-white/85 group-hover:text-white'}`}>{ROTULO_CATEGORIA[c.categoria]}</span>
                    <span className="font-black tabular-nums">{moeda(c.valor)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${maior > 0 ? (c.valor / maior) * 100 : 0}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">Lançamentos</h2>
            {aPagar > 0 && <div className="text-xs font-bold text-red-700 tabular-nums">{moeda(aPagar)} a pagar</div>}
          </div>
          <select className={`${inputCls} sm:w-60 h-11`} value={filtro} onChange={e => setFiltro(e.target.value as 'TODAS' | CategoriaDespesaSitio)}>
            <option value="TODAS">Todas as categorias</option>
            <option value="COMBUSTIVEL">{ROTULO_CATEGORIA.COMBUSTIVEL}</option>
            {CATEGORIAS_DESPESA.map(c => (
              <option key={c} value={c}>
                {ROTULO_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="border-t border-slate-100">
          <ListaLancamentos itens={lista} vazio="Nenhuma despesa neste mês." />
        </div>
      </section>

      {aberto && <FormDespesa estado={estado} aplicar={aplicar} onFechar={() => setAberto(false)} />}
    </div>
  );
}
