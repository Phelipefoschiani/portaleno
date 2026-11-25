// Envio dos apontamentos da produção e atualização das ordens abertas. Só roda quando há internet.
import { supabase } from '../lib/supabase';
import { listarPendentes, removerPendente, substituirOPsLocais, OPApp, ApontamentoApp } from './banco';

export const TABELA_OPS = 'ordens_producao';
export const TABELA_APONTAMENTOS = 'apontamentos_producao_app';

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

/** Envia a fila. Cada apontamento só sai da fila depois que o banco confirma. */
async function enviarFila(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const fila: ApontamentoApp[] = await listarPendentes();
  for (const item of fila) {
    const { error } = await supabase.from(TABELA_APONTAMENTOS).upsert({ id: item.id, dados: item }, { onConflict: 'id' });
    if (error) return error.message; // sem internet ou banco fora: tenta de novo no próximo ciclo
    await removerPendente(item.id);
  }
  return undefined;
}

export async function sincronizarAgora(): Promise<{ ok: boolean; erro?: string }> {
  if (!navigator.onLine) return { ok: false, erro: 'Sem internet.' };
  const erroEnvio = await enviarFila();
  if (erroEnvio) return { ok: false, erro: erroEnvio };
  const erroOPs = await puxarOPs();
  if (erroOPs) return { ok: false, erro: erroOPs };
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
