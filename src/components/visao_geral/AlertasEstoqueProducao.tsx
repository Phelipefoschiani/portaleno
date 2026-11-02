import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package, Boxes, ClipboardList, ChevronRight, CheckCircle2 } from 'lucide-react';
import {
  carregarEstoqueProdutos,
  carregarMateriaPrima,
  calcularStatusProduto,
  calcularStatusMateriaPrima
} from '../../data/produtosData';
import {
  carregarOrdensProducao,
  necessidadeMateriaPrimaOP,
  EVENTO_OPS
} from '../../data/ordensProducaoData';

interface Props {
  onNavigate: (pageId: string) => void;
}

const fmt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Alertas de estoque mínimo (produtos e matérias-primas) e OPs abertas com falta de matéria-prima
export function AlertasEstoqueProducao({ onNavigate }: Props) {
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = ['produtos_updated', EVENTO_OPS, 'pedidos_venda_updated', 'sistema_reset_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);

  const dados = useMemo(() => {
    const produtos = carregarEstoqueProdutos()
      .map(p => ({ p, status: calcularStatusProduto(p.estoque_atual_kg, p.estoque_minimo_kg) }))
      .filter(x => x.status !== 'EM_ESTOQUE' && (Number(x.p.estoque_minimo_kg) || 0) > 0)
      .sort((a, b) => (a.status === 'CRITICO' ? -1 : 1) - (b.status === 'CRITICO' ? -1 : 1));
    const materias = carregarMateriaPrima()
      .map(m => ({ m, status: calcularStatusMateriaPrima(m.estoque_atual, m.estoque_minimo) }))
      .filter(x => x.status !== 'NORMAL' && (Number(x.m.estoque_minimo) || 0) > 0)
      .sort((a, b) => (a.status === 'CRITICO' ? -1 : 1) - (b.status === 'CRITICO' ? -1 : 1));
    const opsFalta = carregarOrdensProducao()
      .filter(o => o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO')
      .map(o => ({ o, faltas: necessidadeMateriaPrimaOP(o, 'RESTANTE').filter(c => c.falta > 0) }))
      .filter(x => x.faltas.length > 0);
    return { produtos, materias, opsFalta };
  }, [versao]);

  const total = dados.produtos.length + dados.materias.length + dados.opsFalta.length;

  const badge = (critico: boolean) =>
    critico
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <AlertTriangle className={`w-4 h-4 ${total > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          <span>Alertas de Estoque e Produção</span>
          {total > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px]">{total}</span>}
        </h2>
      </div>

      {total === 0 ? (
        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Nenhum produto ou matéria-prima abaixo do mínimo e nenhuma OP com falta de matéria-prima.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <button onClick={() => onNavigate('produtos_estoque_cadastro')} className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-emerald-800 cursor-pointer">
              <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-emerald-700" /> Produtos abaixo do mínimo ({dados.produtos.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {dados.produtos.length === 0 && <div className="text-slate-400">Nenhum.</div>}
            {dados.produtos.slice(0, 6).map(({ p, status }) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="truncate font-semibold text-slate-800">{p.nome}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded border font-mono text-[10px] font-bold ${badge(status === 'CRITICO')}`}>
                  {fmt(p.estoque_atual_kg)} / {fmt(p.estoque_minimo_kg)} kg
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <button onClick={() => onNavigate('produtos_materia_prima')} className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-emerald-800 cursor-pointer">
              <span className="flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5 text-emerald-700" /> Matérias-primas abaixo do mínimo ({dados.materias.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {dados.materias.length === 0 && <div className="text-slate-400">Nenhuma.</div>}
            {dados.materias.slice(0, 6).map(({ m, status }) => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="truncate font-semibold text-slate-800">{m.nome}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded border font-mono text-[10px] font-bold ${badge(status === 'CRITICO')}`}>
                  {fmt(m.estoque_atual)} / {fmt(m.estoque_minimo)} {m.unidade_medida}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <button onClick={() => onNavigate('pedidos_ordens_producao')} className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-emerald-800 cursor-pointer">
              <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-emerald-700" /> OPs com falta de matéria-prima ({dados.opsFalta.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {dados.opsFalta.length === 0 && <div className="text-slate-400">Nenhuma.</div>}
            {dados.opsFalta.slice(0, 6).map(({ o, faltas }) => (
              <div key={o.id} className="p-1.5 rounded-lg bg-red-50/60 border border-red-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-800">{o.numero} · {o.produto_nome}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">{fmt(o.quantidade_planejada_pacotes)} pct</span>
                </div>
                <div className="text-[10px] text-red-700 font-semibold">
                  Falta: {faltas.map(f => `${fmt(f.falta)} ${f.unidade} ${f.materia_prima_nome}`).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
