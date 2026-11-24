// Envio e atualização do app da roça com o banco (Supabase). Só roda quando há internet.
import { supabase } from '../lib/supabase';
import {
  listarPendentes,
  marcarErro,
  removerPendente,
  substituirAgricultoresLocais,
  listarAgricultoresLocais,
  Pendente,
} from './banco';
import { AgricultorRoca } from './calculo';

export const TABELA_PESAGENS_APP = 'pesagens_roca_app';

export interface StatusSync {
  online: boolean;
  pendentes: number;
  sincronizando: boolean;
  ultimoErro?: string;
  ultimaSincronizacao?: string;
}

/** Puxa a lista de agricultores do banco e guarda no aparelho (os cadastrados aqui ainda não enviados continuam). */
async function puxarAgricultores(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from('agricultores').select('id, dados');
  if (error || !data) return;
  const doBanco = data.map(l => l.dados as AgricultorRoca);
  const idsDoBanco = new Set(doBanco.map(a => a.id));
  const locais = (await listarAgricultoresLocais<AgricultorRoca & { _pendente?: boolean }>()) as (AgricultorRoca & { _pendente?: boolean })[];
  const aindaNaoEnviados = locais.filter(a => !idsDoBanco.has(a.id) && a.origem_app);
  await substituirAgricultoresLocais([...doBanco, ...aindaNaoEnviados]);
}

/** Envia tudo que está na fila. Cada item só sai da fila depois de o banco confirmar. */
async function enviarFila(): Promise<string | undefined> {
  if (!supabase) return 'Banco não configurado.';
  const fila: Pendente[] = await listarPendentes();
  let ultimoErro: string | undefined;
  for (const item of fila) {
    const tabela = item.tipo === 'PESAGEM' ? TABELA_PESAGENS_APP : 'agricultores';
    const { error } = await supabase.from(tabela).upsert({ id: item.id, dados: item.dados }, { onConflict: 'id' });
    if (error) {
      ultimoErro = error.message;
      await marcarErro(item, error.message);
      // Sem internet ou banco fora: para aqui e tenta de novo no próximo ciclo
      break;
    }
    await removerPendente(item.id);
  }
  return ultimoErro;
}

/** Ciclo completo: envia o que está pendente e depois atualiza a cópia dos agricultores. */
export async function sincronizarAgora(): Promise<{ ok: boolean; erro?: string }> {
  if (!navigator.onLine) return { ok: false, erro: 'Sem internet.' };
  const erroEnvio = await enviarFila();
  if (erroEnvio) return { ok: false, erro: erroEnvio };
  await puxarAgricultores();
  return { ok: true };
}

/** Liga a sincronização automática: ao abrir, ao voltar a internet e a cada 60 segundos. */
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
