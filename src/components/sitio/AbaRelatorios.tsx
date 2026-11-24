import React, { useMemo } from 'react';
import { chaveMes, DespesaSitio } from '../../data/sitioControleData';
import { formatarDataBR } from '../../lib/datas';
import { PropsAba, moeda, rotuloMes } from './ui';

const SEM_REGISTRO = 'Sem registro (lançado antes do controle de usuários)';

interface LinhaUso {
  usuario: string;
  lancamentosMes: number;
  lancamentosTotal: number;
  edicoesMes: number;
  edicoesTotal: number;
  valorLancadoMes: number;
  valorLancadoTotal: number;
}

interface Evento {
  quando: string; // ISO
  usuario: string;
  tipo: 'LANÇOU' | 'EDITOU';
  descricao: string;
  valor: number;
  data: string;
}

/** Quem lançou e quem editou, por usuário, no mês escolhido e no total. */
export function AbaRelatorios({ estado, mes }: PropsAba) {
  const despesas: DespesaSitio[] = estado.despesas || [];

  const linhas = useMemo<LinhaUso[]>(() => {
    const mapa = new Map<string, LinhaUso>();
    const pegar = (usuario: string) => {
      if (!mapa.has(usuario)) {
        mapa.set(usuario, {
          usuario,
          lancamentosMes: 0,
          lancamentosTotal: 0,
          edicoesMes: 0,
          edicoesTotal: 0,
          valorLancadoMes: 0,
          valorLancadoTotal: 0,
        });
      }
      return mapa.get(usuario)!;
    };
    despesas.forEach(d => {
      const noMes = chaveMes(d.data) === mes;
      const quemLancou = d.lancado_por || d.responsavel || SEM_REGISTRO;
      const lancadoEm = (d.lancado_em || '').slice(0, 7);
      const linhaL = pegar(quemLancou);
      linhaL.lancamentosTotal += 1;
      linhaL.valorLancadoTotal += Number(d.valorTotal) || 0;
      // "No mês" conta pelo mês em que o lançamento foi feito (ou pela data do lançamento, se não houver registro)
      if (lancadoEm ? lancadoEm === mes : noMes) {
        linhaL.lancamentosMes += 1;
        linhaL.valorLancadoMes += Number(d.valorTotal) || 0;
      }
      if (d.editado_por) {
        const linhaE = pegar(d.editado_por);
        linhaE.edicoesTotal += 1;
        if ((d.editado_em || '').slice(0, 7) === mes) linhaE.edicoesMes += 1;
      }
    });
    return Array.from(mapa.values()).sort((a, b) => b.lancamentosTotal + b.edicoesTotal - (a.lancamentosTotal + a.edicoesTotal));
  }, [despesas, mes]);

  // Atividade recente: cada lançamento e cada edição, do mais novo para o mais antigo
  const atividade = useMemo<Evento[]>(() => {
    const eventos: Evento[] = [];
    despesas.forEach(d => {
      const usuarioL = d.lancado_por || d.responsavel || SEM_REGISTRO;
      if (d.lancado_em || d.lancado_por) {
        eventos.push({
          quando: d.lancado_em || d.data,
          usuario: usuarioL,
          tipo: 'LANÇOU',
          descricao: d.nomeDespesa,
          valor: Number(d.valorTotal) || 0,
          data: d.data,
        });
      }
      if (d.editado_por && d.editado_em) {
        eventos.push({
          quando: d.editado_em,
          usuario: d.editado_por,
          tipo: 'EDITOU',
          descricao: d.nomeDespesa,
          valor: Number(d.valorTotal) || 0,
          data: d.data,
        });
      }
    });
    return eventos.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 40);
  }, [despesas]);

  const totalMes = linhas.reduce((a, l) => a + l.lancamentosMes, 0);
  const totalEdicoesMes = linhas.reduce((a, l) => a + l.edicoesMes, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-papel border border-linha p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-cinza">Relatório de uso</div>
            <h2 className="text-xl font-black text-tinta">{rotuloMes(mes)}</h2>
          </div>
          <div className="text-sm text-cinza">
            <strong className="text-tinta">{totalMes}</strong> lançamentos · <strong className="text-tinta">{totalEdicoesMes}</strong> edições neste mês
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-cinza border-b border-linha">
                <th className="py-2 pr-3">Usuário</th>
                <th className="py-2 px-3 text-right">Lançou (mês)</th>
                <th className="py-2 px-3 text-right">Lançou (total)</th>
                <th className="py-2 px-3 text-right">Valor lançado (mês)</th>
                <th className="py-2 px-3 text-right">Editou (mês)</th>
                <th className="py-2 pl-3 text-right">Editou (total)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-cinza">Nenhum lançamento ainda.</td></tr>
              )}
              {linhas.map(l => (
                <tr key={l.usuario} className="border-b border-linha/60">
                  <td className="py-2.5 pr-3 font-semibold">{l.usuario}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{l.lancamentosMes}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{l.lancamentosTotal}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{moeda(l.valorLancadoMes)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{l.edicoesMes}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">{l.edicoesTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-cinza">
          O uso é registrado a partir de agora: lançamentos e edições de cada usuário. Lançamentos antigos aparecem como "sem registro".
        </p>
      </div>

      <div className="rounded-3xl bg-papel border border-linha p-5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-cinza mb-3">Atividade recente</div>
        {atividade.length === 0 ? (
          <div className="text-sm text-cinza">Nenhuma atividade registrada ainda.</div>
        ) : (
          <ul className="divide-y divide-linha/60">
            {atividade.map((e, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold">{e.usuario}</span>{' '}
                  <span className={e.tipo === 'LANÇOU' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {e.tipo === 'LANÇOU' ? 'lançou' : 'editou'}
                  </span>{' '}
                  <span className="truncate">{e.descricao}</span>
                  <div className="text-[11px] text-cinza">
                    {formatarDataBR(e.quando.slice(0, 10))} · referente a {formatarDataBR(e.data)}
                  </div>
                </div>
                <div className="font-bold tabular-nums whitespace-nowrap">{moeda(e.valor)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
