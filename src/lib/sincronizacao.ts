// Sincronização com o banco (Supabase), no modelo de cópia local:
// - O navegador guarda uma cópia dos dados, para abrir rápido.
// - Ao entrar e a cada minuto: baixa só o que mudou no banco desde a última busca (e as exclusões).
// - Ao gravar algo: envia a mudança ao banco logo em seguida.
// - Se a cópia local tiver algo que o banco ainda não tem, envia.
import { supabase } from './supabase';
import { TABELAS_DO_SISTEMA } from './bancoEnvio';

const CHAVE_META = 'eno_sync_meta_v3';
const CHAVE_DONO = 'eno_cache_usuario';
const ATRASO_ENVIO_MS = 800;
const INTERVALO_BUSCA_MS = 60_000;
const LOTE = 500;
const PAGINA = 1000;

const EVENTOS_TELAS = [
  'pedidos_venda_updated', 'pedidos_compra_updated', 'calculos_roca_updated', 'financeiro_updated', 'produtos_updated',
  'receitas_updated', 'fichas_tecnicas_updated', 'tabelas_preco_updated', 'categorias_produto_updated', 'clientes_updated',
  'cadastros_updated', 'comprovantes_updated', 'sitio_controle_despesas_updated', 'lotes_materia_prima_updated',
  'ordens_producao_updated', 'sistema_reset_updated', 'cadastros_provisorios_updated',
];

type Meta = {
  pend: string[]; // chaves com alteração ainda não enviada
  chaves: Record<string, { ultima?: string; ids?: Record<string, string> }>; // última busca e retrato do que está no banco
};

let ligada = false;
let aplicando = false; // true enquanto a busca grava dados vindos do banco
let instalado = false;
let timerEnvio: number | null = null;
let timerBusca: number | null = null;
let enviando = false;
let buscando = false;

const CHAVES_DO_SISTEMA = new Set(Object.keys(TABELAS_DO_SISTEMA));

// ---------- utilidades ----------

function hash(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + texto.length;
}

function lerJson<T>(chave: string, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}

function lerMeta(): Meta {
  const m = lerJson<Partial<Meta>>(CHAVE_META, {});
  return { pend: Array.isArray(m.pend) ? m.pend : [], chaves: m.chaves || {} };
}

function gravarMeta(m: Meta): void {
  try {
    localStorage.setItem(CHAVE_META, JSON.stringify(m));
  } catch {
    /* ignora */
  }
}

function marcarPendente(chave: string): void {
  const m = lerMeta();
  if (!m.pend.includes(chave)) {
    m.pend.push(chave);
    gravarMeta(m);
  }
}

function desmarcarPendente(m: Meta, chave: string): void {
  m.pend = m.pend.filter(c => c !== chave);
}

/** Registros de uma chave: lista vira uma linha por item; objeto vira a linha 'unico'. */
function registrosDe(valor: unknown): { id: string; dados: any }[] {
  if (Array.isArray(valor)) {
    return valor
      .filter(x => x && typeof x === 'object' && (typeof (x as any).id === 'string' || typeof (x as any).id === 'number'))
      .map(x => ({ id: String((x as any).id), dados: x }));
  }
  if (valor && typeof valor === 'object') return [{ id: 'unico', dados: valor }];
  return [];
}

function gravarDados(chave: string, valor: unknown): void {
  aplicando = true;
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } finally {
    aplicando = false;
  }
}

function avisarTelas(): void {
  EVENTOS_TELAS.forEach(e => window.dispatchEvent(new Event(e)));
}

/** Acompanha as gravações feitas pelas telas (para enviar ao banco). */
function instalarAcompanhamento(): void {
  if (instalado) return;
  instalado = true;
  const proto = Storage.prototype;
  const setOriginal = proto.setItem;
  const removeOriginal = proto.removeItem;
  proto.setItem = function (this: Storage, chave: string, valor: string) {
    setOriginal.call(this, chave, valor);
    if (this === window.localStorage && ligada && !aplicando && CHAVES_DO_SISTEMA.has(chave)) {
      marcarPendente(chave);
      agendarEnvio();
    }
  };
  proto.removeItem = function (this: Storage, chave: string) {
    removeOriginal.call(this, chave);
    if (this === window.localStorage && ligada && !aplicando && CHAVES_DO_SISTEMA.has(chave)) {
      marcarPendente(chave);
      agendarEnvio();
    }
  };
}

// ---------- envio: navegador -> banco ----------

async function enviarChave(chave: string): Promise<void> {
  const tabela = TABELAS_DO_SISTEMA[chave];
  if (!tabela || !supabase) return;
  const atuais = registrosDe(lerJson<unknown>(chave, null));
  const m = lerMeta();
  const anterior = m.chaves[chave]?.ids || {};

  const novo: Record<string, string> = {};
  const alterados: { id: string; dados: any; atualizado_em: string }[] = [];
  for (const r of atuais) {
    const assinatura = hash(JSON.stringify(r.dados));
    novo[r.id] = assinatura;
    if (anterior[r.id] !== assinatura) alterados.push({ id: r.id, dados: r.dados, atualizado_em: new Date().toISOString() });
  }
  const removidos = Object.keys(anterior).filter(id => !(id in novo));

  // Cópia local vazia com registros conhecidos = cópia apagada, não exclusão. Não apaga nada no banco.
  const apagarNoBanco = true; // tudo vem do banco: o que sumiu da tela sumiu do banco
  // Proteção: não apaga muita coisa de uma vez
  const apagarMuito = removidos.length >= 10 && removidos.length > Object.keys(anterior).length / 2;

  for (let i = 0; i < alterados.length; i += LOTE) {
    const { error } = await supabase.from(tabela).upsert(alterados.slice(i, i + LOTE), { onConflict: 'id' });
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
  if (apagarNoBanco && !apagarMuito) {
    for (let i = 0; i < removidos.length; i += LOTE) {
      const { error } = await supabase.from(tabela).delete().in('id', removidos.slice(i, i + LOTE));
      if (error) throw new Error(`${tabela}: ${error.message}`);
    }
  } else if (apagarMuito) {
    console.warn(`[sincronização] ${removidos.length} exclusões em ${tabela} não foram enviadas (proteção). Verifique.`);
  }

  const m2 = lerMeta();
  m2.chaves[chave] = { ...(m2.chaves[chave] || {}), ids: novo };
  desmarcarPendente(m2, chave);
  gravarMeta(m2);
}

async function enviarPendentes(): Promise<void> {
  if (!ligada || enviando || !supabase) return;
  enviando = true;
  try {
    for (const chave of [...lerMeta().pend]) {
      try {
        await enviarChave(chave);
      } catch (e) {
        // Continua pendente e tenta de novo na próxima rodada
        console.warn('[sincronização] não enviou', chave, e instanceof Error ? e.message : e);
      }
    }
  } finally {
    enviando = false;
  }
}

function agendarEnvio(): void {
  if (timerEnvio !== null) window.clearTimeout(timerEnvio);
  timerEnvio = window.setTimeout(() => {
    timerEnvio = null;
    enviarPendentes().then(() => {
      if (lerMeta().pend.length === 0) return;
      if (timerEnvio === null) timerEnvio = window.setTimeout(() => { timerEnvio = null; enviarPendentes(); }, 5000);
    });
  }, ATRASO_ENVIO_MS);
}

// ---------- busca: banco -> navegador ----------

/** Todas as linhas de uma consulta, em páginas. null = erro (sem permissão ou tabela indisponível). */
async function buscarPaginado(montar: (de: number) => any): Promise<any[] | null> {
  const linhas: any[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await montar(de);
    if (error) return null;
    linhas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return linhas;
}

async function buscarChave(chave: string): Promise<boolean> {
  const tabela = TABELAS_DO_SISTEMA[chave];
  if (!tabela || !supabase) return false;
  // Alteração local ainda não enviada: o envio vem antes, então esta chave espera
  if (lerMeta().pend.includes(chave)) return false;

  const inicio = new Date(Date.now() - 2000).toISOString(); // pequena folga para não perder nada
  const info = lerMeta().chaves[chave] || {};

  // 1. Quais ids existem no banco (para saber o que foi excluído)
  const idsLista = await buscarPaginado(de =>
    supabase!.from(tabela).select('id').order('id').range(de, de + PAGINA - 1)
  );
  if (idsLista === null) return false;
  const idsRemotos = new Set(idsLista.map((r: any) => String(r.id)));

  // 2. O que mudou desde a última busca
  let consulta = (de: number) => {
    let q = supabase!.from(tabela).select('id, dados, atualizado_em');
    if (info.ultima) q = q.gt('atualizado_em', info.ultima);
    return q.order('id').range(de, de + PAGINA - 1);
  };
  const mudados = await buscarPaginado(consulta);
  if (mudados === null) return false;

  const locais = registrosDe(lerJson<unknown>(chave, null));
  const ehObjeto = locais.some(r => r.id === 'unico') || mudados.some((r: any) => r.id === 'unico');

  if (ehObjeto) {
    // Dado único (ex.: configuração do caixa): o banco atualiza a cópia se mudou
    const linha = mudados.find((r: any) => r.id === 'unico');
    if (linha && JSON.stringify(linha.dados) !== JSON.stringify(locais[0]?.dados)) {
      gravarDados(chave, linha.dados);
      avisarTelas();
      return true;
    }
    return false;
  }

  // 3. Junta: remove o que foi excluído no banco (só o que já estava no retrato), aplica o que mudou
  const retrato = info.ids || {};
  const mudadosPorId = new Map<string, any>(mudados.map((r: any) => [String(r.id), r.dados]));
  let lista = locais.filter(r => idsRemotos.has(r.id) || !(r.id in retrato)).map(r =>
    mudadosPorId.has(r.id) ? { id: r.id, dados: mudadosPorId.get(r.id) } : r
  );
  const locaisPorId = new Set(lista.map(r => r.id));
  const novos = [...mudadosPorId.entries()].filter(([id]) => !locaisPorId.has(id)).map(([id, dados]) => ({ id, dados }));
  lista = [...novos, ...lista];

  const mudou = JSON.stringify(lista.map(r => r.dados)) !== JSON.stringify(locais.map(r => r.dados));
  if (mudou) {
    gravarDados(chave, lista.map(r => r.dados));
    avisarTelas();
  }

  // 4. Atualiza o retrato e a data da última busca
  const m = lerMeta();
  // Itens só locais continuam pendentes para o envio
  const soLocal = lista.some(r => !idsRemotos.has(r.id));
  if (soLocal && !m.pend.includes(chave)) m.pend.push(chave);
  m.chaves[chave] = {
    ultima: inicio,
    ids: Object.fromEntries(lista.filter(r => idsRemotos.has(r.id)).map(r => [r.id, hash(JSON.stringify(r.dados))])),
  };
  gravarMeta(m);
  return mudou;
}

async function buscarTudoDoBanco(): Promise<void> {
  if (!ligada || buscando || enviando || !supabase) return;
  buscando = true;
  try {
    let mudou = false;
    for (const chave of Object.keys(TABELAS_DO_SISTEMA)) {
      if (await buscarChave(chave)) mudou = true;
    }
    if (mudou) avisarTelas();
  } finally {
    buscando = false;
  }
}

// ---------- ligação ----------

/** Ao entrar com outra pessoa, a cópia do navegador anterior é descartada. */
function garantirCacheDoUsuario(usuarioId: string): void {
  let atual = '';
  try {
    atual = localStorage.getItem(CHAVE_DONO) || '';
  } catch {
    /* ignora */
  }
  if (atual === usuarioId) return;
  for (const chave of Object.keys(TABELAS_DO_SISTEMA)) localStorage.removeItem(chave);
  localStorage.removeItem(CHAVE_META);
  try {
    localStorage.setItem(CHAVE_DONO, usuarioId);
  } catch {
    /* ignora */
  }
}

/** Liga a sincronização: envia o pendente, depois baixa o que mudou. Resolve quando a primeira busca termina. */
export async function iniciarSincronizacaoBanco(usuarioId?: string): Promise<void> {
  if (!supabase || ligada) return;
  if (usuarioId) garantirCacheDoUsuario(usuarioId);
  instalarAcompanhamento();
  ligada = true;
  window.addEventListener('focus', buscarTudoDoBanco);
  timerBusca = window.setInterval(buscarTudoDoBanco, INTERVALO_BUSCA_MS);
  const primeira = (async () => {
    await enviarPendentes();
    await buscarTudoDoBanco();
    await enviarPendentes(); // o que a busca marcou como só-local vai agora
  })();
  await Promise.race([primeira, new Promise<void>(r => window.setTimeout(r, 15_000))]);
}

/** Desliga a sincronização (ao sair). Mantém a cópia do navegador, para a próxima entrada ser rápida. */
export function pararSincronizacaoBanco(): void {
  ligada = false;
  window.removeEventListener('focus', buscarTudoDoBanco);
  if (timerBusca !== null) window.clearInterval(timerBusca);
  timerBusca = null;
  if (timerEnvio !== null) window.clearTimeout(timerEnvio);
  timerEnvio = null;
}

/** Envia o que estiver pendente agora. Resolve true se nada ficou pendente. */
export async function enviarPendentesAgora(): Promise<boolean> {
  await enviarPendentes();
  return lerMeta().pend.length === 0;
}

/** Compatibilidade: o envio já acontece sozinho; esta função só força uma rodada. */
export function liberarEnvioBanco(): void {
  enviarPendentes().then(buscarTudoDoBanco);
}
