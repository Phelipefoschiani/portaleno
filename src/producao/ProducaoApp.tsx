// App da produção: a funcionária escolhe a ordem aberta e informa quantos pacotes saíram.
// Funciona sem internet; o apontamento fica no histórico do celular (enviando ou já enviado) até o escritório lançar na OP.
import { Fragment, useEffect, useState } from 'react';
import { Check, ClipboardList, Lock, Minus, Pencil, Plus, RefreshCw, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import '../index.css';
import {
  ApontamentoApp,
  ConclusaoApp,
  OPApp,
  gravarConclusao,
  gravarPendente,
  listarConclusoes,
  listarHistorico,
  listarOPsLocais,
  listarPendentes,
  novoIdApontamento,
  removerHistorico,
  removerPendente,
} from './banco';
import { iniciarSincronizacao, sincronizarAgora, StatusSync } from './sincronizar';

type Aba = 'PRODUZIR' | 'HISTORICO' | 'CONCLUIDOS';
type Mensagem = { tom: 'ok' | 'erro'; texto: string } | null;

const CHAVE_OPERADOR = 'eno_producao_operador';
const inteiro = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
const numero = (v: number) => v.toLocaleString('pt-BR');
/** Data de hoje no fuso do celular, em AAAA-MM-DD. */
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const kgTexto = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

/** Fardos completos e pacotes soltos a partir de uma quantidade em pacotes. Sem pacotes por fardo, não há conta. */
function fardosDe(pacotes: number, porFardo?: number): { cheios: number; resto: number } | null {
  if (!porFardo || porFardo <= 0) return null;
  return { cheios: Math.floor(pacotes / porFardo), resto: pacotes % porFardo };
}

/** Texto curto: "3 fardos + 2 pacotes", "4 fardos" ou nada (sem conta de fardo). */
function textoFardos(pacotes: number, porFardo?: number): string | null {
  const f = fardosDe(pacotes, porFardo);
  if (!f) return null;
  return f.resto > 0 ? `${f.cheios} fardos + ${f.resto} pacotes` : `${f.cheios} fardos`;
}
const hora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function lerOperador(): string {
  try {
    return localStorage.getItem(CHAVE_OPERADOR) || '';
  } catch {
    return '';
  }
}

function guardarOperador(nome: string): void {
  try {
    localStorage.setItem(CHAVE_OPERADOR, nome);
  } catch {
    /* navegador sem armazenamento: o nome só vale nesta tela */
  }
}

// Alvo do apontamento: a OP escolhida (ou a OP de um apontamento que está sendo editado)
interface Alvo {
  op_id: string;
  op_numero: string;
  produto_nome: string;
  tipo_embalagem?: string;
  restante?: number;
  unidades_por_embalagem?: number;
  peso_unitario_kg?: number;
}

/** Já lançado na OP pelo escritório: não pode mais ser alterado pelo celular. */
const travado = (apt: ApontamentoApp) => !!apt.lancado_em;

export function ProducaoApp() {
  const [aba, setAba] = useState<Aba>('PRODUZIR');
  const [status, setStatus] = useState<StatusSync>({ online: navigator.onLine, pendentes: 0, sincronizando: false });
  const [ops, setOps] = useState<OPApp[]>([]);
  const [fila, setFila] = useState<ApontamentoApp[]>([]);
  const [historico, setHistorico] = useState<ApontamentoApp[]>([]);
  const [conclusoes, setConclusoes] = useState<ConclusaoApp[]>([]);
  const [operador, setOperador] = useState(lerOperador);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  // Folha de apontamento (novo ou edição de um apontamento)
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [editando, setEditando] = useState<ApontamentoApp | null>(null);
  const [pacotes, setPacotes] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erroFolha, setErroFolha] = useState('');
  const [lote, setLote] = useState('');
  const [fabricacao, setFabricacao] = useState('');
  const [validade, setValidade] = useState('');

  const recarregar = async () => {
    setOps(await listarOPsLocais());
    setFila(await listarPendentes());
    setHistorico(await listarHistorico());
    setConclusoes(await listarConclusoes());
  };

  useEffect(() => {
    recarregar();
    const parar = iniciarSincronizacao(s => {
      setStatus(prev => ({ ...prev, ...s }));
      recarregar();
    });
    return parar;
  }, []);

  useEffect(() => {
    if (!mensagem) return;
    const t = window.setTimeout(() => setMensagem(null), 3500);
    return () => window.clearTimeout(t);
  }, [mensagem]);

  const abrirNovo = (op: OPApp) => {
    setAlvo({
      op_id: op.id,
      op_numero: op.numero,
      produto_nome: op.produto_nome,
      tipo_embalagem: op.tipo_embalagem,
      restante: Math.max(0, op.quantidade_planejada_pacotes - op.quantidade_produzida_pacotes),
      unidades_por_embalagem: op.unidades_por_embalagem,
      peso_unitario_kg: op.peso_unitario_kg,
    });
    setEditando(null);
    setPacotes('');
    setObservacao('');
    // Rastreabilidade já vem preenchida: lote da OP (se existir) e fabricação de hoje
    setLote(op.lote || '');
    setFabricacao(hojeLocal());
    setValidade(op.data_validade || '');
    setErroFolha('');
  };

  const abrirEdicao = (apt: ApontamentoApp) => {
    if (travado(apt)) {
      setMensagem({ tom: 'erro', texto: 'Esse apontamento já foi lançado na ordem. Peça para o escritório ajustar.' });
      return;
    }
    const op = ops.find(o => o.id === apt.op_id);
    setAlvo({
      op_id: apt.op_id,
      op_numero: apt.op_numero,
      produto_nome: apt.produto_nome,
      tipo_embalagem: apt.tipo_embalagem,
      unidades_por_embalagem: op?.unidades_por_embalagem,
      peso_unitario_kg: op?.peso_unitario_kg,
    });
    setEditando(apt);
    setPacotes(String(apt.pacotes));
    setObservacao(apt.observacao || '');
    setLote(apt.lote || '');
    setFabricacao(apt.data_fabricacao || hojeLocal());
    setValidade(apt.data_validade || '');
    setErroFolha('');
  };

  const fecharFolha = () => {
    setAlvo(null);
    setEditando(null);
  };

  const salvarApontamento = async () => {
    if (!alvo) return;
    const n = inteiro(pacotes);
    if (n <= 0) {
      setErroFolha('Informe quantos pacotes saíram.');
      return;
    }
    const agora = new Date().toISOString();
    const nomeOperador = operador.trim();
    const item: ApontamentoApp = {
      id: editando ? editando.id : novoIdApontamento(),
      op_id: alvo.op_id,
      op_numero: alvo.op_numero,
      produto_nome: alvo.produto_nome,
      tipo_embalagem: alvo.tipo_embalagem,
      pacotes: n,
      operador: nomeOperador || undefined,
      observacao: observacao.trim() || undefined,
      lote: lote.trim() || undefined,
      data_fabricacao: fabricacao || undefined,
      data_validade: validade || undefined,
      criado_em: editando ? editando.criado_em : agora,
      editado_em: editando ? agora : undefined,
    };
    try {
      // Alteração volta para a fila de envio; a cópia do histórico sai até o envio confirmar
      await gravarPendente(item);
      if (editando) await removerHistorico(item.id);
      guardarOperador(nomeOperador);
      fecharFolha();
      setMensagem({ tom: 'ok', texto: navigator.onLine ? 'Apontamento salvo. Enviando…' : 'Salvo no celular. Envia quando tiver internet.' });
      await recarregar();
      if (navigator.onLine) sincronizarAgora();
    } catch {
      setErroFolha('Não consegui salvar no celular. Tente de novo.');
    }
  };

  /** Apontamento ainda na fila: some direto. Já enviado: vai ao sistema como exclusão (fica registrado). */
  const excluirApontamento = async (apt: ApontamentoApp, enviado: boolean) => {
    if (travado(apt)) {
      setMensagem({ tom: 'erro', texto: 'Esse apontamento já foi lançado na ordem. Peça para o escritório ajustar.' });
      return;
    }
    const texto = `Excluir o apontamento de ${numero(apt.pacotes)} pacotes da ${apt.op_numero}?`;
    if (!window.confirm(enviado ? `${texto}\n\nA exclusão vai para o sistema quando tiver internet.` : texto)) return;
    try {
      if (enviado) {
        await gravarPendente({ ...apt, excluido_em: new Date().toISOString() });
        await removerHistorico(apt.id);
        setMensagem({ tom: 'ok', texto: navigator.onLine ? 'Exclusão salva. Enviando…' : 'Exclusão salva. Envia quando tiver internet.' });
        if (navigator.onLine) sincronizarAgora();
      } else {
        await removerPendente(apt.id);
        setMensagem({ tom: 'ok', texto: 'Apontamento excluído.' });
      }
      await recarregar();
    } catch {
      setMensagem({ tom: 'erro', texto: 'Não consegui excluir no celular. Tente de novo.' });
    }
  };

  /** Pede ao escritório a conclusão da OP: ela sai da lista de abertas e vai para "Concluídos". */
  const concluirOP = async (op: OPApp) => {
    if (fila.some(a => a.op_id === op.id)) {
      setMensagem({ tom: 'erro', texto: `Ainda tem apontamento da ${op.numero} sem enviar. Envie antes de concluir.` });
      return;
    }
    const apontados = op.quantidade_produzida_pacotes;
    const texto =
      `Concluir a ${op.numero} (${op.produto_nome})?\n\n` +
      `Pacotes apontados: ${numero(apontados)}.\n` +
      'A OP sai da lista de abertas. O escritório confirma a conclusão no sistema.';
    if (!window.confirm(texto)) return;
    try {
      await gravarConclusao({
        id: `conc_${op.id}`,
        op_id: op.id,
        op_numero: op.numero,
        produto_nome: op.produto_nome,
        operador: operador.trim() || undefined,
        pacotes_apontados: apontados,
        criado_em: new Date().toISOString(),
        enviada: false,
      });
      setAba('CONCLUIDOS');
      setMensagem({
        tom: 'ok',
        texto: navigator.onLine ? `${op.numero} concluída. Enviando ao escritório…` : `${op.numero} concluída. Envia quando tiver internet.`,
      });
      await recarregar();
      if (navigator.onLine) sincronizarAgora();
    } catch {
      setMensagem({ tom: 'erro', texto: 'Não consegui concluir no celular. Tente de novo.' });
    }
  };

  // OPs já pedidas para conclusão deste celular saem da lista na hora
  const opsVisiveis = ops.filter(op => !conclusoes.some(c => c.op_id === op.id));

  const enviarAgora = async () => {
    const r = await sincronizarAgora();
    setMensagem(r.ok ? { tom: 'ok', texto: 'Tudo enviado.' } : { tom: 'erro', texto: r.erro || 'Não foi possível enviar.' });
    recarregar();
  };

  const pendentes = fila.length;
  const ligado = status.online;
  const enviadosVisiveis = historico;

  // Conta ao vivo: quantos fardos e quantos kg dá a quantidade digitada na folha
  const contaAtual = alvo
    ? {
        fardos: textoFardos(inteiro(pacotes), alvo.unidades_por_embalagem),
        kg: alvo.peso_unitario_kg ? kgTexto(inteiro(pacotes) * alvo.peso_unitario_kg) : null,
      }
    : null;

  return (
    <div className="min-h-dvh w-full bg-eno-900 text-papel pb-28">
      {/* Cabeçalho: estado da conexão sempre visível */}
      <header className="sticky top-0 z-20 bg-eno-900/95 backdrop-blur border-b border-ouro/20">
        <div className="px-4 pt-4 pb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ouro">Produção · Grupo ENO</div>
            <h1 className="text-[26px] leading-tight font-black tracking-tight">O que saiu</h1>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${
                ligado ? 'bg-eno-600/30 text-[#bfe6cc]' : 'bg-st-aguardando/25 text-ouro-claro'
              }`}
            >
              {ligado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {ligado ? 'Com internet' : 'Sem internet'}
            </span>
            {pendentes > 0 && <span className="text-[12px] text-ouro-claro font-semibold">{numero(pendentes)} aguardando envio</span>}
          </div>
        </div>
      </header>

      {mensagem && (
        <div
          role="status"
          className={`mx-4 mt-3 rounded-xl px-4 py-3 text-[14px] font-semibold ${
            mensagem.tom === 'ok' ? 'bg-eno-600/40 text-papel' : 'bg-st-vencido/80 text-papel'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {aba === 'PRODUZIR' && (
        <main className="px-4 pt-4 space-y-4">
          <label className="block">
            <span className="block text-[12px] font-bold uppercase tracking-[0.14em] text-papel/60 mb-1.5">Quem está apontando</span>
            <input
              value={operador}
              onChange={e => setOperador(e.target.value)}
              placeholder="Seu nome"
              className="w-full h-12 rounded-xl bg-papel/10 border border-papel/15 px-4 text-[16px] text-papel placeholder:text-papel/40 focus:outline-none focus:ring-2 focus:ring-ouro"
            />
          </label>

          <div className="flex items-center justify-between pt-1">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-papel/60">Ordens abertas</h2>
            <button
              type="button"
              onClick={enviarAgora}
              disabled={status.sincronizando}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold text-ouro-claro disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status.sincronizando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {opsVisiveis.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-papel/20 px-5 py-8 text-center">
              <ClipboardList className="w-8 h-8 mx-auto text-ouro/70" />
              <p className="mt-3 font-semibold">Nenhuma ordem aberta agora.</p>
              <p className="mt-1 text-[14px] text-papel/65">
                Quando o escritório abrir uma ordem, ela aparece aqui depois que o celular pegar internet.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {opsVisiveis.map(op => {
                const planejado = Math.max(1, op.quantidade_planejada_pacotes);
                const pct = Math.min(100, Math.round((op.quantidade_produzida_pacotes / planejado) * 100));
                const restante = Math.max(0, op.quantidade_planejada_pacotes - op.quantidade_produzida_pacotes);
                const fardosProd = fardosDe(op.quantidade_produzida_pacotes, op.unidades_por_embalagem);
                const fardosPlan = fardosDe(op.quantidade_planejada_pacotes, op.unidades_por_embalagem);
                const textoRestante = textoFardos(restante, op.unidades_por_embalagem);
                const kgProd = op.peso_unitario_kg ? op.quantidade_produzida_pacotes * op.peso_unitario_kg : null;
                const kgPlan = op.peso_unitario_kg ? op.quantidade_planejada_pacotes * op.peso_unitario_kg : null;
                return (
                  <li key={op.id}>
                    <button
                      type="button"
                      onClick={() => abrirNovo(op)}
                      className="group w-full text-left rounded-2xl bg-papel/[0.07] hover:bg-papel/[0.12] active:scale-[0.99] transition-all p-4 border border-papel/10 hover:border-ouro/50 focus-visible:outline-2 focus-visible:outline-ouro"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-mono text-[12px] text-ouro-claro">{op.numero}</div>
                          <div className="mt-0.5 text-[19px] font-extrabold leading-snug">{op.produto_nome}</div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-ouro text-eno-950 text-[13px] font-black px-3 py-2">Apontar</span>
                      </div>
                      <div className="mt-3 h-2.5 w-full rounded-full bg-papel/15 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-ouro-escuro to-ouro-claro" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[13px] tabular-nums">
                        <span className="text-papel/75">
                          {numero(op.quantidade_produzida_pacotes)} de {numero(op.quantidade_planejada_pacotes)} pacotes
                        </span>
                        <span className={restante > 0 ? 'font-bold text-ouro-claro' : 'font-bold text-[#bfe6cc]'}>
                          {restante > 0 ? `faltam ${numero(restante)} pacotes` : 'meta batida'}
                        </span>
                      </div>
                      {(fardosPlan || kgPlan !== null) && (
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-[12.5px] text-papel/70 tabular-nums">
                          <span>
                            {fardosProd && fardosPlan ? `${fardosProd.cheios} de ${fardosPlan.cheios} fardos prontos` : ''}
                            {fardosProd && fardosPlan && kgProd !== null ? ' · ' : ''}
                            {kgProd !== null && kgPlan !== null ? `${kgTexto(kgProd)} de ${kgTexto(kgPlan)}` : ''}
                          </span>
                          {textoRestante && restante > 0 && <span>faltam {textoRestante}</span>}
                        </div>
                      )}
                    </button>
                    {op.do_estoque_pacotes ? (
                      <div className="mt-1.5 px-1 text-[12.5px] text-ouro-claro tabular-nums">
                        {numero(op.do_estoque_pacotes)} pacotes já vieram do estoque
                      </div>
                    ) : null}
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => concluirOP(op)}
                        className="h-10 px-4 rounded-lg border border-ouro/50 text-[14px] font-bold text-ouro-claro"
                      >
                        Concluir OP
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      )}

      {aba === 'HISTORICO' && (
        <main className="px-4 pt-4 space-y-6">
          {/* Aguardando envio */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-papel/60">Aguardando envio</h2>
              {pendentes > 0 && (
                <button
                  type="button"
                  onClick={enviarAgora}
                  disabled={status.sincronizando || !ligado}
                  className="h-10 px-4 rounded-lg bg-ouro text-eno-950 text-[14px] font-black disabled:opacity-40"
                >
                  {status.sincronizando ? 'Enviando…' : 'Enviar agora'}
                </button>
              )}
            </div>

            {status.ultimoErro && pendentes > 0 && (
              <p className="text-[13px] text-ouro-claro">Ainda não enviou: {status.ultimoErro}. Tenta de novo sozinho.</p>
            )}

            {fila.length === 0 ? (
              <p className="text-[14px] text-papel/65">Nada aguardando envio.</p>
            ) : (
              <ul className="space-y-3">
                {fila.map(apt => (
                  <Fragment key={apt.id}>
                    <CartaoApontamento
                      apt={apt}
                      situacao={apt.excluido_em ? 'EXCLUSAO_PENDENTE' : 'AGUARDANDO'}
                      onEditar={() => abrirEdicao(apt)}
                      onExcluir={() => excluirApontamento(apt, false)}
                    />
                  </Fragment>
                ))}
              </ul>
            )}
          </section>

          {/* Já enviados: ficam aqui para consulta e ajuste, enquanto o escritório não lançar */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-papel/60">Já enviados</h2>
            {enviadosVisiveis.length === 0 ? (
              <p className="text-[14px] text-papel/65">Nenhum apontamento enviado ainda. Quem aponta aparece aqui depois que o celular pegar internet.</p>
            ) : (
              <ul className="space-y-3">
                {enviadosVisiveis.map(apt => (
                  <Fragment key={apt.id}>
                    <CartaoApontamento
                      apt={apt}
                      situacao={travado(apt) ? 'LANCADO' : 'NO_SISTEMA'}
                      onEditar={() => abrirEdicao(apt)}
                      onExcluir={() => excluirApontamento(apt, true)}
                    />
                  </Fragment>
                ))}
              </ul>
            )}
          </section>

        </main>
      )}

      {aba === 'CONCLUIDOS' && (
        <main className="px-4 pt-4 space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-papel/60">Ordens concluídas</h2>
          {conclusoes.length === 0 ? (
            <p className="text-[14px] text-papel/65">Nenhuma ordem concluída ainda. Quando a produção concluir uma OP, ela aparece aqui.</p>
          ) : (
            <ul className="space-y-3">
              {conclusoes.map(c => {
                const situacao = c.concluido_em
                  ? { texto: 'Concluída no sistema', classe: 'bg-eno-600/30 text-[#bfe6cc]' }
                  : c.enviada
                    ? { texto: 'Enviada ao escritório', classe: 'bg-papel/15 text-papel/80' }
                    : { texto: 'Aguardando envio', classe: 'bg-st-aguardando/25 text-ouro-claro' };
                return (
                  <li key={c.id} className="rounded-2xl bg-papel/[0.07] border border-papel/10 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${situacao.classe}`}>
                        {c.concluido_em && <Check className="w-3 h-3" />}
                        {situacao.texto}
                      </span>
                      <span className="text-[12px] text-papel/55">{hora(c.criado_em)}</span>
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] text-ouro-claro">{c.op_numero}</div>
                        <div className="font-extrabold leading-snug">{c.produto_nome}</div>
                        {c.operador && <div className="mt-1 text-[13px] text-papel/70">{c.operador}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[26px] font-black tabular-nums leading-none">{numero(c.pacotes_apontados)}</div>
                        <div className="text-[12px] text-papel/65">pacotes apontados</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      )}

      {/* Barra de abas no rodapé, ao alcance do polegar */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-eno-950 border-t border-ouro/20 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3">
          {(
            [
              ['PRODUZIR', 'Produzir'],
              ['HISTORICO', pendentes > 0 ? `Histórico (${numero(pendentes)})` : 'Histórico'],
              ['CONCLUIDOS', 'Concluídos'],
            ] as [Aba, string][]
          ).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`h-16 text-[15px] font-bold transition-colors ${
                aba === id ? 'text-ouro bg-ouro/10' : 'text-papel/55'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </nav>

      {/* Folha de apontamento */}
      {alvo && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={fecharFolha}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Apontar produção"
            onClick={e => e.stopPropagation()}
            className="w-full max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-papel text-eno-950 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-eno-900/20" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[12px] text-st-aguardando">{alvo.op_numero}</div>
                <div className="text-[21px] font-black leading-tight">{alvo.produto_nome}</div>
                {alvo.restante !== undefined && (
                  <div className="mt-1 text-[13px] text-eno-700 font-semibold">
                    {alvo.restante > 0
                      ? `Faltam ${numero(alvo.restante)} pacotes${textoFardos(alvo.restante, alvo.unidades_por_embalagem) ? ` (${textoFardos(alvo.restante, alvo.unidades_por_embalagem)})` : ''} para a meta`
                      : 'Meta já batida'}
                  </div>
                )}
              </div>
              <button type="button" onClick={fecharFolha} aria-label="Fechar" className="h-10 w-10 shrink-0 rounded-full bg-eno-900/5 grid place-items-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6">
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-eno-700 text-center">
                Quantos pacotes saíram
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  aria-label="Diminuir"
                  onClick={() => setPacotes(String(Math.max(0, inteiro(pacotes) - 1)))}
                  className="h-16 w-16 shrink-0 rounded-2xl bg-eno-900/10 grid place-items-center active:scale-95"
                >
                  <Minus className="w-7 h-7" />
                </button>
                <input
                  value={pacotes}
                  onChange={e => setPacotes(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label="Quantidade produzida"
                  className="min-w-0 flex-1 h-20 bg-transparent text-center text-[56px] font-black tabular-nums tracking-tight focus:outline-none placeholder:text-eno-900/25"
                />
                <button
                  type="button"
                  aria-label="Aumentar"
                  onClick={() => setPacotes(String(inteiro(pacotes) + 1))}
                  className="h-16 w-16 shrink-0 rounded-2xl bg-eno-900 text-ouro grid place-items-center active:scale-95"
                >
                  <Plus className="w-7 h-7" />
                </button>
              </div>
              <div className="mt-3 flex justify-center gap-2">
                {[10, 50, 100].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setPacotes(String(inteiro(pacotes) + q))}
                    className="h-10 px-4 rounded-full border border-eno-900/20 text-[14px] font-bold"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-[13px] font-bold text-eno-800 mb-1.5">Lote</span>
                <input
                  value={lote}
                  onChange={e => setLote(e.target.value)}
                  placeholder="Ex.: 2611A"
                  className="w-full h-12 rounded-xl border border-eno-900/20 bg-white px-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-eno-600"
                />
              </label>
              <label className="block">
                <span className="block text-[13px] font-bold text-eno-800 mb-1.5">Fabricação</span>
                <input
                  type="date"
                  value={fabricacao}
                  onChange={e => setFabricacao(e.target.value)}
                  className="w-full h-12 rounded-xl border border-eno-900/20 bg-white px-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-eno-600"
                />
              </label>
              <label className="block">
                <span className="block text-[13px] font-bold text-eno-800 mb-1.5">Validade</span>
                <input
                  type="date"
                  value={validade}
                  onChange={e => setValidade(e.target.value)}
                  className="w-full h-12 rounded-xl border border-eno-900/20 bg-white px-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-eno-600"
                />
              </label>
            </div>
            <p className="mt-1.5 text-[12px] text-eno-700">Deixe a validade em branco para o sistema calcular pelo produto.</p>

            {contaAtual && (
              <div className="mt-4 rounded-xl bg-eno-900/5 px-4 py-3 text-center text-[14px] font-semibold text-eno-800 tabular-nums">
                {[contaAtual.fardos, contaAtual.kg].filter(Boolean).join(' · ') || 'Digite a quantidade de pacotes'}
              </div>
            )}

            <label className="mt-6 block">
              <span className="block text-[13px] font-bold text-eno-800 mb-1.5">Observação (opcional)</span>
              <textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                rows={2}
                placeholder="Ex.: saco rasgado, troca de lote"
                className="w-full rounded-xl border border-eno-900/20 bg-white px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-eno-600"
              />
            </label>

            {erroFolha && <p className="mt-3 text-[14px] font-semibold text-st-vencido">{erroFolha}</p>}

            <div className="mt-6 grid grid-cols-[1fr_2fr] gap-3">
              <button type="button" onClick={fecharFolha} className="h-14 rounded-2xl border border-eno-900/20 font-bold">
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarApontamento}
                className="h-14 rounded-2xl bg-eno-800 text-papel font-black text-[17px] active:scale-[0.99]"
              >
                {editando ? 'Salvar alteração' : 'Salvar apontamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SituacaoCartao = 'AGUARDANDO' | 'EXCLUSAO_PENDENTE' | 'NO_SISTEMA' | 'LANCADO' | 'EXCLUIDO';

const ROTULO_SITUACAO: Record<SituacaoCartao, { texto: string; classe: string }> = {
  AGUARDANDO: { texto: 'Aguardando envio', classe: 'bg-st-aguardando/25 text-ouro-claro' },
  EXCLUSAO_PENDENTE: { texto: 'Exclusão aguardando envio', classe: 'bg-st-aguardando/25 text-ouro-claro' },
  NO_SISTEMA: { texto: 'Enviado', classe: 'bg-eno-600/30 text-[#bfe6cc]' },
  LANCADO: { texto: 'Lançado na OP', classe: 'bg-papel/15 text-papel/80' },
  EXCLUIDO: { texto: 'Excluído', classe: 'bg-papel/10 text-papel/55' },
};

function CartaoApontamento({
  apt,
  situacao,
  onEditar,
  onExcluir,
}: {
  apt: ApontamentoApp;
  situacao: SituacaoCartao;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const muted = situacao === 'EXCLUIDO';
  const mostrarAcoes = situacao === 'AGUARDANDO' || situacao === 'NO_SISTEMA';
  const rot = ROTULO_SITUACAO[situacao];
  return (
    <li className={`rounded-2xl border border-papel/10 p-4 ${muted ? 'bg-papel/[0.03] opacity-70' : 'bg-papel/[0.07]'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${rot.classe}`}>
          {situacao === 'LANCADO' && <Lock className="w-3 h-3" />}
          {situacao === 'NO_SISTEMA' && <Check className="w-3 h-3" />}
          {rot.texto}
        </span>
        <span className="text-[12px] text-papel/55">{hora(apt.criado_em)}</span>
      </div>
      <div className="flex items-start justify-between gap-3 mt-2">
        <div className="min-w-0">
          <div className="font-mono text-[12px] text-ouro-claro">{apt.op_numero}</div>
          <div className="font-extrabold leading-snug">{apt.produto_nome}</div>
          <div className="mt-1 text-[13px] text-papel/70">
            {apt.operador ? `${apt.operador} · ` : ''}
            {apt.editado_em ? 'editado' : ''}
          </div>
          {apt.observacao && <div className="mt-1 text-[13px] text-papel/80">“{apt.observacao}”</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-[26px] font-black tabular-nums leading-none ${muted ? 'line-through' : ''}`}>{numero(apt.pacotes)}</div>
          <div className="text-[12px] text-papel/65">pacotes</div>
        </div>
      </div>
      {mostrarAcoes && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onEditar}
            className="h-10 px-3 rounded-lg bg-papel/10 text-[14px] font-semibold inline-flex items-center gap-1.5"
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button
            type="button"
            onClick={onExcluir}
            className="h-10 px-3 rounded-lg bg-papel/10 text-[14px] font-semibold text-[#f2b8a8] inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>
      )}
    </li>
  );
}
