import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { CabecalhoPagina } from '../ui/CabecalhoPagina';
import { carregarClientes } from '../../data/clientesData';
import { carregarRcas } from '../../data/cadastrosData';
import { carregarEstoqueProdutos, ProdutoEstoque } from '../../data/produtosData';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { formatarMoeda } from '../../data/financeiroData';
import { hojeISO, formatarDataBR } from '../../lib/datas';
import { gerarPdfMetas } from '../../lib/metasPdf';
import {
  carregarMetas,
  salvarMetas,
  EVENTO_METAS,
  DestinatarioMeta,
  DistribuicaoMeta,
  EscopoMeta,
  ModoDistribuicao,
  UnidadeMeta,
  MetaVenda,
  distribuicaoInicial,
  metaDoClienteNaDistribuicao,
  realizadoDaParteDoCliente,
  realizadoMeta,
  rotuloEscopo,
  rotuloModoDistribuicao,
  rotuloUnidade,
} from '../../data/metasData';

const pad = (n: number) => String(n).padStart(2, '0');
const primeiroDiaDoMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};
const ultimoDiaDoMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())}`;
};

const fmtUnidade = (unidade: UnidadeMeta, v: number) =>
  unidade === 'VALOR' ? formatarMoeda(v) : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
const fmtValor = (m: Pick<MetaVenda, 'unidade'>, v: number) => fmtUnidade(m.unidade, v);

const MODOS: [ModoDistribuicao, string][] = [['PERCENTUAL', '% da meta'], ['PESO', 'Kg'], ['VALOR', 'R$']];

const campo = 'h-10 w-full rounded-md border border-linha bg-papel px-3 text-[14px]';
const rotulo = 'block text-[12px] font-bold text-tinta-2 mb-1';

/** Cadastro e acompanhamento das metas de venda (menu Vendas). */
export function MetasVendas() {
  const [metas, setMetas] = useState<MetaVenda[]>([]);
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [rcaPdf, setRcaPdf] = useState('');

  // Folha A4 com as metas do representante (ou uma página por representante, se "todos")
  const gerarA4 = () => {
    if (!rcaPdf) return;
    const escolhidos = rcaPdf === 'TODOS' ? rcas : rcas.filter(r => r.id === rcaPdf);
    const reps = escolhidos
      .map(r => ({
        id: r.id,
        nome: r.nome_fantasia || r.nome_completo,
        metas: metas.filter(m => m.destinatario === 'RCA' && m.destinatario_id === r.id),
      }))
      .filter(r => rcaPdf !== 'TODOS' || r.metas.length > 0);
    if (reps.length === 0) return setErro('Nenhum representante com meta para gerar.');
    const pdf = gerarPdfMetas(reps, pedidos, produtos);
    const nome = rcaPdf === 'TODOS' ? 'representantes' : reps[0].nome.replace(/\s+/g, '_');
    pdf.save(`Metas_${nome}.pdf`);
  };

  // Formulário
  const [destinatario, setDestinatario] = useState<DestinatarioMeta>('CLIENTE');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [escopo, setEscopo] = useState<EscopoMeta>('TOTAL');
  const [escopoValor, setEscopoValor] = useState('');
  const [unidade, setUnidade] = useState<UnidadeMeta>('VALOR');
  const [valorMeta, setValorMeta] = useState('');
  const [inicio, setInicio] = useState(primeiroDiaDoMes());
  const [fim, setFim] = useState(ultimoDiaDoMes());
  // Parte de cada cliente, quando o destinatário é um representante
  const [distribuicaoForm, setDistribuicaoForm] = useState<DistribuicaoMeta[]>([]);

  const recarregar = () => {
    setMetas(carregarMetas());
    setPedidos(carregarPedidosVenda());
    setProdutos(carregarEstoqueProdutos());
  };

  useEffect(() => {
    recarregar();
    const eventos = [EVENTO_METAS, 'pedidos_venda_updated', 'clientes_updated', 'cadastros_updated', 'produtos_updated'];
    eventos.forEach(ev => window.addEventListener(ev, recarregar));
    return () => eventos.forEach(ev => window.removeEventListener(ev, recarregar));
  }, []);

  const clientes = useMemo(() => carregarClientes().filter(c => c.ativo !== false), [metas]);
  const rcas = useMemo(() => carregarRcas(), [metas]);
  const categorias = useMemo(
    () => Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean))).sort(),
    [produtos]
  );

  const nomeDestinatario = (tipo: DestinatarioMeta, id: string) => {
    if (tipo === 'CLIENTE') {
      const c = clientes.find(x => x.id === id);
      return c ? c.fantasia || c.razao_nome : '';
    }
    const r = rcas.find(x => x.id === id);
    return r ? r.nome_fantasia || r.nome_completo : '';
  };

  // Clientes ativos vinculados ao representante (campo vendedor do cliente)
  const clientesDoRca = (rcaId: string) =>
    clientes.filter(c => c.vendedor_id === rcaId).map(c => ({ id: c.id, nome: c.fantasia || c.razao_nome }));

  const limparForm = () => {
    setEditandoId(null);
    setDestinatarioId('');
    setEscopo('TOTAL');
    setEscopoValor('');
    setUnidade('VALOR');
    setValorMeta('');
    setInicio(primeiroDiaDoMes());
    setFim(ultimoDiaDoMes());
    setDistribuicaoForm([]);
    setErro('');
  };

  const editar = (m: MetaVenda) => {
    setEditandoId(m.id);
    setDestinatario(m.destinatario);
    setDestinatarioId(m.destinatario_id);
    setEscopo(m.escopo);
    setEscopoValor(m.escopo_valor || '');
    setUnidade(m.unidade);
    setValorMeta(String(m.valor_meta).replace('.', ','));
    setInicio(m.inicio);
    setFim(m.fim);
    setDistribuicaoForm(m.destinatario === 'RCA' ? distribuicaoInicial(m.distribuicao, clientesDoRca(m.destinatario_id)) : []);
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const valorNumerico = parseFloat(valorMeta.replace(/\./g, '').replace(',', '.')) || 0;
  const somaPercentual = distribuicaoForm
    .filter(d => d.modo === 'PERCENTUAL')
    .reduce((a, d) => a + (Number(d.valor) || 0), 0);

  const alterarParte = (i: number, patch: Partial<DistribuicaoMeta>) =>
    setDistribuicaoForm(lista => lista.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const valor = valorNumerico;
    if (!destinatarioId) return setErro(`Escolha o ${destinatario === 'CLIENTE' ? 'cliente' : 'representante'}.`);
    if (escopo === 'PRODUTO' && !escopoValor) return setErro('Escolha o produto.');
    if (escopo === 'CATEGORIA' && !escopoValor) return setErro('Escolha a categoria.');
    if (valor <= 0) return setErro('Informe o valor da meta.');
    if (!inicio || !fim || inicio > fim) return setErro('Confira o período: o início precisa ser antes do fim.');
    if (destinatario === 'RCA' && somaPercentual > 100) return setErro('A soma das porcentagens dos clientes passa de 100%.');

    const escopoNome =
      escopo === 'PRODUTO' ? produtos.find(p => p.id === escopoValor)?.nome || '' :
      escopo === 'CATEGORIA' ? escopoValor : undefined;

    const dados: MetaVenda = {
      id: editandoId || `meta_${Date.now()}`,
      destinatario,
      destinatario_id: destinatarioId,
      destinatario_nome: nomeDestinatario(destinatario, destinatarioId),
      escopo,
      escopo_valor: escopo === 'TOTAL' ? undefined : escopoValor,
      escopo_nome: escopoNome,
      unidade,
      valor_meta: valor,
      inicio,
      fim,
      criado_em: editandoId ? (metas.find(m => m.id === editandoId)?.criado_em || hojeISO()) : hojeISO(),
      ...(destinatario === 'RCA'
        ? { distribuicao: distribuicaoForm.filter(d => d.valor > 0).map(d => ({ ...d })) }
        : {}),
    };
    const lista = carregarMetas();
    salvarMetas(editandoId ? lista.map(m => (m.id === editandoId ? dados : m)) : [dados, ...lista]);
    limparForm();
  };

  const excluir = (m: MetaVenda) => {
    if (!confirm(`Excluir a meta de ${m.destinatario_nome}?`)) return;
    salvarMetas(carregarMetas().filter(x => x.id !== m.id));
    if (editandoId === m.id) limparForm();
  };

  const listaOrdenada = useMemo(
    () => [...metas].sort((a, b) => b.fim.localeCompare(a.fim) || a.destinatario_nome.localeCompare(b.destinatario_nome)),
    [metas]
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-papel-2 text-tinta">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pb-8">
        <CabecalhoPagina
          titulo="Metas"
          resumo={`${metas.length} ${metas.length === 1 ? 'meta cadastrada' : 'metas cadastradas'} · o realizado conta pedidos faturados ou entregues no período`}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-linha bg-papel p-3">
          <span className="text-[13px] font-bold">Folha A4 para o representante</span>
          <select className="h-10 min-w-[220px] rounded-md border border-linha bg-papel px-3 text-[14px]" value={rcaPdf} onChange={e => setRcaPdf(e.target.value)}>
            <option value="">Escolha...</option>
            <option value="TODOS">Todos os representantes (uma página para cada)</option>
            {rcas.map(r => <option key={r.id} value={r.id}>{r.nome_fantasia || r.nome_completo}</option>)}
          </select>
          <button
            type="button"
            onClick={gerarA4}
            disabled={!rcaPdf}
            className="h-10 px-4 rounded-md bg-eno-800 text-white text-[13px] font-bold disabled:opacity-40"
          >
            Gerar A4 (PDF)
          </button>
        </div>

        <form onSubmit={salvar} className="mt-4 rounded-lg border border-linha bg-papel p-4 space-y-4">
          <div className="text-[13px] font-bold">{editandoId ? 'Editar meta' : 'Nova meta'}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className={rotulo}>Para quem</span>
              <div className="inline-flex rounded-md border border-linha overflow-hidden">
                {(['CLIENTE', 'RCA'] as DestinatarioMeta[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setDestinatario(t); setDestinatarioId(''); setDistribuicaoForm([]); }}
                    className={`h-10 px-4 text-[13px] font-semibold ${destinatario === t ? 'bg-eno-800 text-white' : 'bg-papel'}`}
                  >
                    {t === 'CLIENTE' ? 'Cliente' : 'Representante'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={rotulo}>{destinatario === 'CLIENTE' ? 'Cliente' : 'Representante'}</label>
              <select
                className={campo}
                value={destinatarioId}
                onChange={e => {
                  setDestinatarioId(e.target.value);
                  // Troca de representante: a divisão começa de novo (igual entre os clientes dele)
                  setDistribuicaoForm(destinatario === 'RCA' && e.target.value ? distribuicaoInicial(undefined, clientesDoRca(e.target.value)) : []);
                }}
              >
                <option value="">Escolha...</option>
                {(destinatario === 'CLIENTE' ? clientes.map(c => ({ id: c.id, nome: c.fantasia || c.razao_nome })) : rcas.map(r => ({ id: r.id, nome: r.nome_fantasia || r.nome_completo })))
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>

            <div>
              <span className={rotulo}>Meta sobre</span>
              <div className="inline-flex rounded-md border border-linha overflow-hidden">
                {([['TOTAL', 'Total'], ['PRODUTO', 'Produto'], ['CATEGORIA', 'Categoria']] as [EscopoMeta, string][]).map(([id, nome]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setEscopo(id); setEscopoValor(''); }}
                    className={`h-10 px-4 text-[13px] font-semibold ${escopo === id ? 'bg-eno-800 text-white' : 'bg-papel'}`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>
            {escopo === 'PRODUTO' && (
              <div>
                <label className={rotulo}>Produto</label>
                <select className={campo} value={escopoValor} onChange={e => setEscopoValor(e.target.value)}>
                  <option value="">Escolha...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
            {escopo === 'CATEGORIA' && (
              <div>
                <label className={rotulo}>Categoria</label>
                <select className={campo} value={escopoValor} onChange={e => setEscopoValor(e.target.value)}>
                  <option value="">Escolha...</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div>
              <span className={rotulo}>Medida</span>
              <div className="inline-flex rounded-md border border-linha overflow-hidden">
                {(['VALOR', 'KG'] as UnidadeMeta[]).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnidade(u)}
                    className={`h-10 px-4 text-[13px] font-semibold ${unidade === u ? 'bg-eno-800 text-white' : 'bg-papel'}`}
                  >
                    {rotuloUnidade(u)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={rotulo}>{unidade === 'VALOR' ? 'Valor da meta (R$)' : 'Quantidade da meta (kg)'}</label>
              <input className={campo} inputMode="decimal" value={valorMeta} onChange={e => setValorMeta(e.target.value)} placeholder={unidade === 'VALOR' ? '0,00' : '0'} />
            </div>

            <div>
              <label className={rotulo}>Início</label>
              <input type="date" className={campo} value={inicio} onChange={e => setInicio(e.target.value)} />
            </div>
            <div>
              <label className={rotulo}>Fim</label>
              <input type="date" className={campo} value={fim} onChange={e => setFim(e.target.value)} />
            </div>
          </div>

          {destinatario === 'RCA' && destinatarioId && (
            <div className="rounded-md border border-linha p-3 space-y-3">
              <div>
                <div className="text-[13px] font-bold">Meta de cada cliente deste representante</div>
                <div className="text-[12px] text-cinza">
                  Escolha como cada cliente entra: % da meta, kg ou R$. Quem ficar com zero não tem meta. Cada cliente recebe a meta automaticamente no portal dele.
                </div>
              </div>
              {distribuicaoForm.length === 0 && (
                <div className="text-[13px] text-cinza">
                  Nenhum cliente ativo vinculado a este representante. Vincule o cliente ao representante no cadastro de clientes.
                </div>
              )}
              {distribuicaoForm.map((d, i) => {
                const alvo = metaDoClienteNaDistribuicao({ unidade, valor_meta: valorNumerico }, d);
                return (
                  <div key={d.cliente_id} className="grid grid-cols-[minmax(0,1fr)_120px_120px] sm:grid-cols-[minmax(0,1fr)_130px_140px_minmax(0,1fr)] gap-2 items-center">
                    <div className="min-w-0 truncate text-[13.5px] font-semibold">{d.cliente_nome}</div>
                    <select
                      className="h-10 rounded-md border border-linha bg-papel px-2 text-[13px]"
                      value={d.modo}
                      onChange={e => alterarParte(i, { modo: e.target.value as ModoDistribuicao })}
                      aria-label={`Medida da meta de ${d.cliente_nome}`}
                    >
                      {MODOS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      className="h-10 rounded-md border border-linha bg-papel px-3 text-[14px] tabular-nums"
                      value={d.valor || ''}
                      placeholder="0"
                      onChange={e => alterarParte(i, { valor: Math.max(0, Number(e.target.value) || 0) })}
                      aria-label={`Valor da meta de ${d.cliente_nome}`}
                    />
                    <div className="hidden sm:block text-[12.5px] text-cinza tabular-nums truncate">
                      {d.valor > 0 ? `= ${fmtUnidade(alvo.unidade, alvo.valor)}` : 'sem meta'}
                    </div>
                  </div>
                );
              })}
              {distribuicaoForm.some(d => d.modo === 'PERCENTUAL') && (
                <div className={`text-[12.5px] tabular-nums ${somaPercentual > 100 ? 'text-st-vencido font-bold' : 'text-cinza'}`}>
                  Porcentagens somadas: {somaPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                  {somaPercentual > 100 ? ' · passou de 100%' : ''}
                </div>
              )}
            </div>
          )}

          {erro && <div className="rounded-md bg-st-vencido-bg text-st-vencido text-[13px] px-3 py-2">{erro}</div>}

          <div className="flex gap-2">
            <button type="submit" className="h-10 px-5 rounded-md bg-eno-800 text-white text-[13px] font-bold">
              {editandoId ? 'Salvar alteração' : 'Cadastrar meta'}
            </button>
            {editandoId && (
              <button type="button" onClick={limparForm} className="h-10 px-4 rounded-md border border-linha-forte text-[13px] font-semibold">
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {listaOrdenada.length === 0 && (
            <div className="rounded-lg border border-linha bg-papel p-6 text-center text-cinza text-[14px]">Nenhuma meta cadastrada ainda.</div>
          )}
          {listaOrdenada.map(m => {
            const realizado = realizadoMeta(m, pedidos, produtos);
            const pct = m.valor_meta > 0 ? Math.min(100, (realizado / m.valor_meta) * 100) : 0;
            const falta = Math.max(0, m.valor_meta - realizado);
            return (
              <div key={m.id} className="rounded-lg border border-linha bg-papel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold truncate">{m.destinatario_nome || '(sem nome)'}</div>
                    <div className="text-[12.5px] text-cinza">
                      {m.destinatario === 'CLIENTE' ? 'Cliente' : 'Representante'} · {rotuloEscopo(m)} · {rotuloUnidade(m.unidade)}
                    </div>
                    <div className="text-[12px] text-cinza">Período: {formatarDataBR(m.inicio)} a {formatarDataBR(m.fim)}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => editar(m)} className="h-8 w-8 rounded-md hover:bg-papel-3 flex items-center justify-center" aria-label="Editar meta">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => excluir(m)} className="h-8 w-8 rounded-md hover:bg-st-vencido-bg text-st-vencido flex items-center justify-center" aria-label="Excluir meta">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between text-[13px]">
                  <span>Realizado <strong className="tabular-nums">{fmtValor(m, realizado)}</strong> de {fmtValor(m, m.valor_meta)}</span>
                  <span className="font-bold tabular-nums">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-papel-3 overflow-hidden">
                  <div className={`h-full ${pct >= 100 ? 'bg-st-pago' : 'bg-eno-700'}`} style={{ width: `${pct}%` }} />
                </div>
                {falta > 0 && <div className="mt-1 text-[12px] text-cinza">Faltam {fmtValor(m, falta)}</div>}

                {m.destinatario === 'RCA' && (
                  <div className="mt-3 border-t border-linha pt-3 space-y-3">
                    <div className="text-[12px] font-bold text-tinta-2">Clientes</div>
                    {m.distribuicao === undefined && (
                      <div className="text-[12.5px] text-cinza">Meta sem divisão por cliente. Clique em editar para dividir entre os clientes.</div>
                    )}
                    {m.distribuicao !== undefined && m.distribuicao.every(d => !(d.valor > 0)) && (
                      <div className="text-[12.5px] text-cinza">Nenhum cliente com meta nesta data.</div>
                    )}
                    {(m.distribuicao || []).filter(d => d.valor > 0).map(d => {
                      const parte = realizadoDaParteDoCliente(m, d, pedidos, produtos);
                      const pctParte = parte.alvo > 0 ? Math.min(100, (parte.realizado / parte.alvo) * 100) : 0;
                      return (
                        <div key={d.cliente_id}>
                          <div className="flex items-baseline justify-between gap-2 text-[13px]">
                            <span className="min-w-0 truncate">
                              <strong>{d.cliente_nome}</strong> <span className="text-cinza">· {rotuloModoDistribuicao(d)}</span>
                            </span>
                            <span className="font-bold tabular-nums">{pctParte.toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-papel-3 overflow-hidden">
                            <div className={`h-full ${pctParte >= 100 ? 'bg-st-pago' : 'bg-eno-700'}`} style={{ width: `${pctParte}%` }} />
                          </div>
                          <div className="mt-1 text-[12px] text-cinza tabular-nums">
                            {fmtUnidade(parte.unidade, parte.realizado)} de {fmtUnidade(parte.unidade, parte.alvo)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
