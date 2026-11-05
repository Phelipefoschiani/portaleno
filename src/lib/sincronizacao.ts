// Sincronização automática entre os navegadores e o banco (Supabase).
//
// Como funciona:
// - Cada chave do sistema tem uma tabela no banco. Cada registro vira uma linha (id + dados).
// - Quando algo muda neste navegador, a chave fica "pendente" e é enviada em seguida.
// - Periodicamente (e ao voltar para a janela), o sistema busca o que mudou no banco e atualiza o navegador.
// - Um "retrato" (snapshot) guarda o que foi confirmado pelo banco, para saber o que mudou de verdade
//   e para detectar exclusões feitas em outro aparelho.
// - Nunca apaga dados locais que ainda não foram enviados: essas chaves ficam pendentes.
import { supabase } from './supabase';
import { TABELAS_DO_SISTEMA } from './bancoEnvio';

const CHAVE_SNAPSHOT = 'eno_sync_snapshot_v1';
const CHAVE_PENDENTES = 'eno_sync_pendentes_v1';
const INTERVALO_BUSCA_MS = 60_000;
const ATRASO_ENVIO_MS = 800;
const TAMANHO_LOTE = 500;
const PAGINA = 1000;

// Eventos que as telas escutam para se atualizarem
const EVENTOS_TELAS = [
  'pedidos_venda_updated', 'pedidos_compra_updated', 'calculos_roca_updated', 'financeiro_updated', 'produtos_updated',
  'receitas_updated', 'fichas_tecnicas_updated', 'tabelas_preco_updated', 'categorias_produto_updated', 'clientes_updated',
  'cadastros_updated', 'comprovantes_updated', 'sitio_controle_despesas_updated', 'lotes_materia_prima_updated',
  'ordens_producao_updated', 'sistema_reset_updated', 'cadastros_provisorios_updated',
];

type Snapshot = Record<string, Record<string, string>>; // chave -> (id -> assinatura)

let ligada = false;
// Envio para o banco só depois da confirmação do administrador; a busca do banco sempre acontece
let podeEnviar = true;
let aplicandoRemoto = false;
let timerEnvio: number | null = null;
let timerBusca: number | null = null;
let buscando = false;
let enviando = false;
const CHAVE_DO_SISTEMA = new Set(Object.keys(TABELAS_DO_SISTEMA));

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

function gravarLocal(chave: string, valor: unknown): void {
  aplicandoRemoto = true;
  try {
    if (valor === null || valor === undefined) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } finally {
    aplicandoRemoto = false;
  }
}

function lerSnapshot(): Snapshot {
  return lerJson<Snapshot>(CHAVE_SNAPSHOT, {});
}

function gravarSnapshot(s: Snapshot): void {
  try {
    localStorage.setItem(CHAVE_SNAPSHOT, JSON.stringify(s));
  } catch {
    /* sem espaço: a próxima busca refaz a comparação */
  }
}

function pendentes(): Set<string> {
  return new Set(lerJson<string[]>(CHAVE_PENDENTES, []));
}

function gravarPendentes(p: Set<string>): void {
  try {
    localStorage.setItem(CHAVE_PENDENTES, JSON.stringify([...p]));
  } catch {
    /* ignora */
  }
}

function marcarPendente(chave: string): void {
  const p = pendentes();
  p.add(chave);
  gravarPendentes(p);
}

function desmarcarPendente(chave: string): void {
  const p = pendentes();
  p.delete(chave);
  gravarPendentes(p);
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

function avisarTelas(): void {
  EVENTOS_TELAS.forEach(e => window.dispatchEvent(new Event(e)));
}

// ---------- envio: navegador -> banco ----------

async function enviarChave(chave: string): Promise<void> {
  const tabela = TABELAS_DO_SISTEMA[chave];
  if (!tabela || !supabase) return;
  const valor = lerJson<unknown>(chave, null);
  const atuais = registrosDe(valor);
  const snap = lerSnapshot();
  const anterior = snap[chave] || {};

  const novo: Record<string, string> = {};
  const alterados: { id: string; dados: any; atualizado_em: string }[] = [];
  const agora = new Date().toISOString();
  for (const r of atuais) {
    const assinatura = hash(JSON.stringify(r.dados));
    novo[r.id] = assinatura;
    if (anterior[r.id] !== assinatura) alterados.push({ id: r.id, dados: r.dados, atualizado_em: agora });
  }
  const removidos = Object.keys(anterior).filter(id => !(id in novo));

  for (let i = 0; i < alterados.length; i += TAMANHO_LOTE) {
    const { error } = await supabase.from(tabela).upsert(alterados.slice(i, i + TAMANHO_LOTE), { onConflict: 'id' });
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
  for (let i = 0; i < removidos.length; i += TAMANHO_LOTE) {
    const { error } = await supabase.from(tabela).delete().in('id', removidos.slice(i, i + TAMANHO_LOTE));
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }

  snap[chave] = novo;
  gravarSnapshot(snap);
  desmarcarPendente(chave);
}

async function enviarPendentes(): Promise<void> {
  if (!ligada || !podeEnviar || enviando || !supabase) return;
  enviando = true;
  try {
    for (const chave of [...pendentes()]) {
      try {
        await enviarChave(chave);
      } catch (e) {
        // Fica pendente e tenta de novo na próxima rodada (ex.: sem permissão para esta tabela)
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
    enviarPendentes();
  }, ATRASO_ENVIO_MS);
}

// ---------- busca: banco -> navegador ----------

async function buscarTudo(tabela: string): Promise<{ id: string; dados: any }[] | null> {
  const linhas: { id: string; dados: any }[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase!
      .from(tabela)
      .select('id, dados, atualizado_em')
      .order('atualizado_em', { ascending: false })
      .range(de, de + PAGINA - 1);
    if (error) return null; // sem permissão ou tabela indisponível: não mexe no navegador
    linhas.push(...(data || []).map((r: any) => ({ id: String(r.id), dados: r.dados })));
    if (!data || data.length < PAGINA) break;
  }
  return linhas;
}

async function buscarChave(chave: string): Promise<boolean> {
  const tabela = TABELAS_DO_SISTEMA[chave];
  if (!tabela || !supabase) return false;
  // Com alteração local ainda não enviada, o navegador manda primeiro (não sobrescreve)
  if (pendentes().has(chave)) return false;

  const remotas = await buscarTudo(tabela);
  if (remotas === null) return false;

  const snap = lerSnapshot();
  const jaSincronizada = !!snap[chave];
  const locais = registrosDe(lerJson<unknown>(chave, null));
  const ehObjeto = remotas.some(r => r.id === 'unico') || locais.some(r => r.id === 'unico');

  if (ehObjeto) {
    // Dado único (ex.: configuração de caixa): se houver valor aqui, ele prevalece
    if (locais.length > 0) {
      if (!remotas.length || JSON.stringify(remotas[0].dados) !== JSON.stringify(locais[0].dados)) marcarPendente(chave);
    } else if (remotas.length > 0) {
      gravarLocal(chave, remotas[0].dados);
      snap[chave] = { unico: hash(JSON.stringify(remotas[0].dados)) };
      gravarSnapshot(snap);
      return true;
    }
    if (!pendentes().has(chave) && locais.length > 0) {
      snap[chave] = { unico: hash(JSON.stringify(locais[0].dados)) };
      gravarSnapshot(snap);
    }
    return false;
  }

  if (!jaSincronizada) {
    // Primeira vez: junta o que está nos dois lados e não apaga nada daqui.
    // O que só existe aqui vai para o banco no próximo envio (fica pendente).
    const idsRemotos = new Set(remotas.map(r => r.id));
    const idsLocais = new Set(locais.map(r => r.id));
    const soAqui = locais.filter(r => !idsRemotos.has(r.id));
    const soLa = remotas.filter(r => !idsLocais.has(r.id));
    if (soAqui.length > 0) marcarPendente(chave);
    let mudou = false;
    if (soLa.length > 0) {
      const atualLista = lerJson<unknown[]>(chave, []);
      gravarLocal(chave, [...soLa.map(r => r.dados), ...(Array.isArray(atualLista) ? atualLista : [])]);
      mudou = true;
    }
    if (!pendentes().has(chave)) {
      const agoraLista = registrosDe(lerJson<unknown>(chave, null));
      snap[chave] = Object.fromEntries(agoraLista.map(r => [r.id, hash(JSON.stringify(r.dados))]));
      gravarSnapshot(snap);
    }
    return mudou;
  }

  // Já sincronizada: o banco manda (não há alteração pendente aqui)
  if (remotas.length === 0 && Object.keys(snap[chave] || {}).length === 0) return false;
  const novoValor = remotas.map(r => r.dados);
  const atual = lerJson<unknown>(chave, null);
  if (JSON.stringify(atual) === JSON.stringify(novoValor)) return false;
  gravarLocal(chave, novoValor);
  snap[chave] = Object.fromEntries(remotas.map(r => [r.id, hash(JSON.stringify(r.dados))]));
  gravarSnapshot(snap);
  return true;
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

/** Acompanha as gravações feitas pelas telas para mandar ao banco. */
function acompanharGravacoes(): void {
  const proto = Storage.prototype;
  const setOriginal = proto.setItem;
  const removeOriginal = proto.removeItem;
  proto.setItem = function (this: Storage, k: string, v: string) {
    setOriginal.call(this, k, v);
    if (this === window.localStorage && ligada && !aplicandoRemoto && CHAVE_DO_SISTEMA.has(k)) {
      marcarPendente(k);
      agendarEnvio();
    }
  };
  proto.removeItem = function (this: Storage, k: string) {
    removeOriginal.call(this, k);
    if (this === window.localStorage && ligada && !aplicandoRemoto && CHAVE_DO_SISTEMA.has(k)) {
      marcarPendente(k);
      agendarEnvio();
    }
  };
}

let acompanhando = false;

/** Liga a sincronização (depois do login). Com somenteBuscar, só recebe do banco até a confirmação. */
export async function iniciarSincronizacaoBanco(opcoes?: { somenteBuscar?: boolean }): Promise<void> {
  if (!supabase || ligada) return;
  if (!acompanhando) {
    acompanharGravacoes();
    acompanhando = true;
  }
  ligada = true;
  podeEnviar = !opcoes?.somenteBuscar;
  window.addEventListener('focus', buscarTudoDoBanco);
  timerBusca = window.setInterval(buscarTudoDoBanco, INTERVALO_BUSCA_MS);
  // Espera a primeira busca (com limite de tempo), para a tela só abrir com os dados do banco
  const primeira = (async () => {
    if (podeEnviar) await enviarPendentes();
    await buscarTudoDoBanco();
  })();
  await Promise.race([primeira, new Promise<void>(r => window.setTimeout(r, 15_000))]);
}

/** Depois da confirmação do administrador: libera o envio e começa a enviar o que estiver pendente. */
export function liberarEnvioBanco(): void {
  podeEnviar = true;
  if (!ligada) iniciarSincronizacaoBanco();
  else enviarPendentes().then(buscarTudoDoBanco);
}

/** Desliga a sincronização (ao sair). Não apaga nada. */
export function pararSincronizacaoBanco(): void {
  ligada = false;
  window.removeEventListener('focus', buscarTudoDoBanco);
  if (timerBusca !== null) window.clearInterval(timerBusca);
  timerBusca = null;
  if (timerEnvio !== null) window.clearTimeout(timerEnvio);
  timerEnvio = null;
}
