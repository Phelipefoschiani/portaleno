// Envio dos apontamentos da produção e atualização das ordens abertas. Só roda quando há internet.
import { supabase } from '../lib/supabase';
import {
  listarPendentes,
  removerPendente,
  substituirOPsLocais,
  gravarHistorico,
  substituirHistorico,
  listarConclusoes,
  substituirConclusoes,
  marcarConclusaoEnviada,
  OPApp,
  ApontamentoApp,
  ConclusaoApp,
} from './banco';

export const TABELA_OPS = 'ordens_producao';
export const TABELA_APONTAMENTOS = 'apontamentos_producao_app';
/** Quantos apontamentos mais recentes o celular guarda para consulta. */
const LIMITE_HISTORICO = 500;

export interface StatusSync {
  online: boolean;
  pendentes: number;
  sincronizando: boolean;
  ultimoErro?: string;
  ultimaSincronizacao?: string;
}

/** Baixa só as ordens abertas (PLANEJADA e EM_PRODUCAO) e guarda no aparelho. */
async function puxarOPs(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const { data, error } = await supabase
    .from(TABELA_OPS)
    .select('id, dados')
    .filter('dados->>status', 'in', '("PLANEJADA","EM_PRODUCAO")');
  if (error) return error.message;
  const abertas = (data || []).map(l => l.dados as OPApp).filter(o => !!o && !!o.id);
  await substituirOPsLocais(abertas);
  return undefined;
}

/**
 * Envia a fila. Cada apontamento só sai da fila depois que o banco confirma, e passa para o histórico do celular.
 * Se o escritório já lançou um apontamento na OP, a alteração do celular não o sobrescreve.
 */
async function enviarFila(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const fila: ApontamentoApp[] = await listarPendentes();
  for (const item of fila) {
    const { data: atual, error: erroLeitura } = await supabase
      .from(TABELA_APONTAMENTOS)
      .select('dados')
      .eq('id', item.id)
      .maybeSingle();
    if (erroLeitura) return erroLeitura.message; // sem internet ou banco fora: tenta de novo no próximo ciclo

    const lancadoNoBanco = (atual?.dados as ApontamentoApp | undefined)?.lancado_em;
    if (lancadoNoBanco) {
      // Já lançado na OP: não reenvia nem apaga (senão o lançamento sumiria ou poderia duplicar)
      await gravarHistorico({ ...item, lancado_em: lancadoNoBanco, excluido_em: undefined });
      await removerPendente(item.id);
      continue;
    }

    if (item.excluido_em) {
      // Exclusão: apaga de vez do banco e sai do celular
      const { error } = await supabase.from(TABELA_APONTAMENTOS).delete().eq('id', item.id);
      if (error) return error.message;
      await removerPendente(item.id);
      continue;
    }

    const { error } = await supabase
      .from(TABELA_APONTAMENTOS)
      .upsert({ id: item.id, dados: item, atualizado_em: new Date().toISOString() }, { onConflict: 'id' });
    if (error) return error.message;
    await gravarHistorico(item);
    await removerPendente(item.id);
  }
  return undefined;
}

/**
 * Baixa o histórico de todos os apontamentos (de todos os celulares), com o que já foi lançado na OP.
 * Os que ainda estão na fila deste celular ficam de fora aqui, porque a fila tem a versão mais nova.
 */
async function atualizarHistorico(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const { data, error } = await supabase
    .from(TABELA_APONTAMENTOS)
    .select('id, dados')
    .order('atualizado_em', { ascending: false })
    .limit(LIMITE_HISTORICO);
  if (error) return error.message;
  const naFila = new Set((await listarPendentes()).map(p => p.id));
  const lista = (data || [])
    .map(l => l.dados as ApontamentoApp | null)
    .filter((a): a is ApontamentoApp => !!a && !!a.id && a.tipo !== 'CONCLUSAO' && !naFila.has(a.id));
  await substituirHistorico(lista);
  return undefined;
}

/** Envia os pedidos de conclusão feitos neste celular (ficam no banco até o escritório concluir a OP). */
async function enviarConclusoes(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const pendentes = (await listarConclusoes()).filter(c => !c.enviada);
  for (const c of pendentes) {
    const { error } = await supabase
      .from(TABELA_APONTAMENTOS)
      .upsert({ id: c.id, dados: { ...c, tipo: 'CONCLUSAO', enviada: undefined }, atualizado_em: new Date().toISOString() }, { onConflict: 'id' });
    if (error) return error.message;
    await marcarConclusaoEnviada(c.id);
  }
  return undefined;
}

/** Baixa os pedidos de conclusão de todos os celulares e o que o escritório já concluiu. */
async function atualizarConclusoes(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const { data, error } = await supabase
    .from(TABELA_APONTAMENTOS)
    .select('id, dados')
    .filter('dados->>tipo', 'eq', 'CONCLUSAO')
    .order('atualizado_em', { ascending: false })
    .limit(LIMITE_HISTORICO);
  if (error) return error.message;
  const lista = (data || []).map(l => l.dados as ConclusaoApp).filter(c => !!c && !!c.id);
  await substituirConclusoes(lista.map(c => ({ ...c, enviada: true })));
  return undefined;
}

export async function sincronizarAgora(): Promise<{ ok: boolean; erro?: string }> {
  if (!navigator.onLine) return { ok: false, erro: 'Sem internet.' };
  const erroEnvio = await enviarFila();
  if (erroEnvio) return { ok: false, erro: erroEnvio };
  const erroConclusoesEnvio = await enviarConclusoes();
  if (erroConclusoesEnvio) return { ok: false, erro: erroConclusoesEnvio };
  const erroOPs = await puxarOPs();
  if (erroOPs) return { ok: false, erro: erroOPs };
  const erroHistorico = await atualizarHistorico();
  if (erroHistorico) return { ok: false, erro: erroHistorico };
  const erroConclusoes = await atualizarConclusoes();
  if (erroConclusoes) return { ok: false, erro: erroConclusoes };
  return { ok: true };
}

/** Liga a sincronização: ao abrir, ao voltar a internet e a cada 60 segundos. */
export function iniciarSincronizacao(onStatus: (s: Partial<StatusSync>) => void): () => void {
  let ativo = true;
  const ciclo = async () => {
    if (!ativo) return;
    onStatus({ sincronizando: true });
    const r = await sincronizarAgora().catch(e => ({ ok: false, erro: e instanceof Error ? e.message : 'Falha ao sincronizar.' }));
    const pendentes = (await listarPendentes()).length;
    onStatus({
      sincronizando: false,
      pendentes,
      ultimoErro: r.ok ? undefined : r.erro,
      ultimaSincronizacao: r.ok ? new Date().toISOString() : undefined,
    });
  };
  const aoMudarConexao = () => onStatus({ online: navigator.onLine });
  const aoVoltar = () => {
    aoMudarConexao();
    ciclo();
  };
  window.addEventListener('online', aoVoltar);
  window.addEventListener('offline', aoMudarConexao);
  const timer = window.setInterval(ciclo, 60_000);
  onStatus({ online: navigator.onLine });
  ciclo();
  return () => {
    ativo = false;
    window.clearInterval(timer);
    window.removeEventListener('online', aoVoltar);
    window.removeEventListener('offline', aoMudarConexao);
  };
}
