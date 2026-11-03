import React, { useEffect, useMemo, useState } from 'react';
import { Painel } from '../ui/Painel';
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

  // Sem alerta: a Visão Geral já mostra "Tudo em dia" nas pendências
  if (total === 0) return null;

  const valorClasse = (critico: boolean) =>
    `shrink-0 text-[12px] font-semibold tabular-nums ${critico ? 'text-st-vencido' : 'text-st-aguardando'}`;

  const Coluna = ({ titulo, qtd, destino, children }: { titulo: string; qtd: number; destino: string; children: React.ReactNode }) => (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onNavigate(destino)}
        className="w-full flex items-baseline justify-between gap-2 pb-1.5 mb-1 border-b border-linha text-left cursor-pointer group"
      >
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza group-hover:text-eno-700">{titulo}</span>
        <span className="text-[12px] tabular-nums text-cinza">{qtd}</span>
      </button>
      {qtd === 0 ? <div className="py-1.5 text-[12.5px] text-cinza-claro">Nenhum.</div> : children}
    </div>
  );

  return (
    <Painel titulo="Estoque e produção" contexto="itens abaixo do mínimo e faltas das OPs">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-5">
        <Coluna titulo="Produtos acabados" qtd={dados.produtos.length} destino="produtos_estoque_cadastro">
          {dados.produtos.slice(0, 6).map(({ p, status }) => (
            <div key={p.id} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
              <span className="truncate text-tinta">{p.nome}</span>
              <span className={valorClasse(status === 'CRITICO')}>
                {fmt(p.estoque_atual_kg)} <span className="text-cinza font-normal">/ {fmt(p.estoque_minimo_kg)} kg</span>
              </span>
            </div>
          ))}
        </Coluna>

        <Coluna titulo="Matéria-prima" qtd={dados.materias.length} destino="produtos_materia_prima">
          {dados.materias.slice(0, 6).map(({ m, status }) => (
            <div key={m.id} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
              <span className="truncate text-tinta">{m.nome}</span>
              <span className={valorClasse(status === 'CRITICO')}>
                {fmt(m.estoque_atual)} <span className="text-cinza font-normal">/ {fmt(m.estoque_minimo)} {m.unidade_medida}</span>
              </span>
            </div>
          ))}
        </Coluna>

        <Coluna titulo="OPs com falta de matéria-prima" qtd={dados.opsFalta.length} destino="pedidos_ordens_producao">
          {dados.opsFalta.slice(0, 6).map(({ o, faltas }) => (
            <div key={o.id} className="py-1.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-tinta font-semibold">{o.numero} · {o.produto_nome}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-cinza">{fmt(o.quantidade_planejada_pacotes)} pct</span>
              </div>
              <div className="text-[12px] text-st-vencido">
                Falta {faltas.map(f => `${fmt(f.falta)} ${f.unidade} de ${f.materia_prima_nome}`).join(' · ')}
              </div>
            </div>
          ))}
        </Coluna>
      </div>
    </Painel>
  );
}
