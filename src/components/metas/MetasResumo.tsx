import { useEffect, useMemo, useState } from 'react';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { carregarEstoqueProdutos, ProdutoEstoque } from '../../data/produtosData';
import { formatarMoeda } from '../../data/financeiroData';
import { hojeISO, formatarDataBR } from '../../lib/datas';
import { EVENTO_METAS, DestinatarioMeta, MetaVenda, metasAtivasDo, realizadoMeta, rotuloEscopo, rotuloUnidade } from '../../data/metasData';

interface Props {
  destinatario: DestinatarioMeta;
  id: string;
}

const fmt = (m: Pick<MetaVenda, 'unidade'>, v: number) =>
  m.unidade === 'VALOR' ? formatarMoeda(v) : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;

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

  return (
    <section className="rounded-lg border border-linha bg-papel p-4">
      <div className="text-[12px] font-bold uppercase tracking-wide text-cinza mb-3">Minhas metas</div>
      <div className="space-y-4">
        {metas.map(m => {
          const realizado = realizadoMeta(m, pedidos, produtos);
          const pct = m.valor_meta > 0 ? Math.min(100, (realizado / m.valor_meta) * 100) : 0;
          const falta = Math.max(0, m.valor_meta - realizado);
          return (
            <div key={m.id}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold truncate">{rotuloEscopo(m)}</div>
                  <div className="text-[12px] text-cinza">{rotuloUnidade(m.unidade)} · até {formatarDataBR(m.fim)}</div>
                </div>
                <div className="font-bold tabular-nums text-[14px]">{pct.toFixed(0)}%</div>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-papel-3 overflow-hidden">
                <div className={`h-full ${pct >= 100 ? 'bg-st-pago' : 'bg-eno-700'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-[12.5px] text-cinza tabular-nums">
                {fmt(m, realizado)} de {fmt(m, m.valor_meta)}{falta > 0 ? ` · faltam ${fmt(m, falta)}` : ' · meta batida'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
