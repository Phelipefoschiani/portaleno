import { useEffect, useMemo, useState } from 'react';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { carregarEstoqueProdutos, ProdutoEstoque } from '../../data/produtosData';
import { hojeISO, formatarDataBR } from '../../lib/datas';
import { EVENTO_METAS, DestinatarioMeta, MetaVenda, metasAtivasDo, realizadoMeta, rotuloEscopo, rotuloUnidade, formatarValorMeta } from '../../data/metasData';

interface Props {
  destinatario: DestinatarioMeta;
  id: string;
}

const fmt = (m: Pick<MetaVenda, 'unidade'>, v: number) => formatarValorMeta(m.unidade, v);

/** Metas valendo hoje para o cliente ou representante, com o quanto já foi vendido. Não aparece se não houver meta. */
export function MetasResumo({ destinatario, id }: Props) {
  const [versao, setVersao] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setVersao(v => v + 1);
      setPedidos(carregarPedidosVenda());
      setProdutos(carregarEstoqueProdutos());
    };
    atualizar();
    const eventos = [EVENTO_METAS, 'pedidos_venda_updated', 'produtos_updated'];
    eventos.forEach(ev => window.addEventListener(ev, atualizar));
    return () => eventos.forEach(ev => window.removeEventListener(ev, atualizar));
  }, []);

  const metas = useMemo(() => metasAtivasDo(destinatario, id, hojeISO()), [destinatario, id, versao]);

  if (metas.length === 0) return null;

  const hoje = hojeISO();
  const diasAte = (fim: string) =>
    Math.max(0, Math.round((new Date(`${fim}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) / 86400000));
  const itens = metas.map(m => {
    const realizado = realizadoMeta(m, pedidos, produtos);
    const pct = m.valor_meta > 0 ? (realizado / m.valor_meta) * 100 : 0;
    return { m, realizado, pct, falta: Math.max(0, m.valor_meta - realizado), dias: diasAte(m.fim) };
  });
  const batidos = itens.filter(i => i.pct >= 100).length;
  const media = itens.reduce((a, i) => a + Math.min(100, i.pct), 0) / itens.length;
  const nomeCurto = (m: MetaVenda) => (m.escopo === 'TOTAL' ? 'Total de vendas' : m.escopo_nome || rotuloEscopo(m));
  const rotuloTipo = (m: MetaVenda) => (m.escopo === 'PRODUTO' ? 'Produto' : m.escopo === 'CATEGORIA' ? 'Categoria' : 'Geral');

  return (
    <section className="rounded-2xl overflow-hidden border border-eno-800/30 bg-papel shadow-[0_18px_40px_-28px_rgba(4,32,19,0.6)]">
      {/* Faixa de resumo */}
      <div className="relative bg-eno-900 text-papel px-5 py-4 flex flex-wrap items-end justify-between gap-4 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-ouro/20 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ouro-claro">Meus objetivos</div>
          <div className="mt-1 text-[13px] text-papel/70">
            {itens.length} {itens.length === 1 ? 'objetivo valendo' : 'objetivos valendo'}
            {batidos > 0 ? ` · ${batidos} ${batidos === 1 ? 'batido' : 'batidos'}` : ''}
          </div>
        </div>
        <div className="relative text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-papel/50">Média</div>
          <div className="text-[34px] font-black leading-none tracking-tight tabular-nums text-ouro-claro">{media.toFixed(0)}%</div>
        </div>
      </div>

      {/* Um card por objetivo */}
      <div className="grid gap-3 p-3 sm:p-4 sm:grid-cols-2 xl:grid-cols-3 bg-papel-2">
        {itens.map(({ m, realizado, pct, falta, dias }) => {
          const batido = pct >= 100;
          const largura = Math.min(100, pct);
          const urgente = !batido && dias <= 7;
          return (
            <article
              key={m.id}
              className={`group relative rounded-xl border bg-papel p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5 ${
                batido ? 'border-st-pago/50' : 'border-linha'
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 rounded-t-xl ${batido ? 'bg-st-pago' : 'bg-gradient-to-r from-eno-700 via-eno-600 to-ouro'}`} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">
                    {rotuloTipo(m)} · {rotuloUnidade(m.unidade)}
                  </div>
                  <h3 className="mt-1 text-[16px] font-extrabold leading-snug text-tinta">{nomeCurto(m)}</h3>
                </div>
                <div className={`shrink-0 text-[30px] font-black leading-none tracking-tight tabular-nums ${batido ? 'text-st-pago' : 'text-eno-800'}`}>
                  {pct.toFixed(0)}
                  <span className="text-[16px]">%</span>
                </div>
              </div>

              <div className="mt-4 h-2.5 rounded-full bg-papel-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${batido ? 'bg-st-pago' : 'bg-gradient-to-r from-eno-700 to-eno-600'}`}
                  style={{ width: `${largura}%` }}
                />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] tabular-nums">
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Vendido</dt>
                  <dd className="font-bold text-tinta">{fmt(m, realizado)}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Objetivo</dt>
                  <dd className="font-bold text-tinta">{fmt(m, m.valor_meta)}</dd>
                </div>
              </dl>

              <div className="mt-3 pt-3 border-t border-linha flex items-center justify-between gap-2 text-[12px]">
                <span className={`font-bold ${batido ? 'text-st-pago' : 'text-tinta-2'}`}>
                  {batido ? 'Objetivo batido' : `Faltam ${fmt(m, falta)}`}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-bold tabular-nums ${urgente ? 'bg-ouro/25 text-ouro-escuro' : 'bg-papel-3 text-cinza'}`}>
                  {dias === 0 ? 'Termina hoje' : `${dias} ${dias === 1 ? 'dia' : 'dias'} · até ${formatarDataBR(m.fim).slice(0, 5)}`}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
