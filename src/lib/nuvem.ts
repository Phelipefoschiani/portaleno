// Sincronização dos dados do sistema com o Firestore.
//
// As telas continuam lendo e gravando no localStorage (síncrono, como sempre). Esta camada:
// - ao entrar, baixa da nuvem as chaves que o perfil pode ver e grava no localStorage;
// - escuta a nuvem em tempo real e atualiza o localStorage (e as telas) quando outro aparelho muda algo;
// - percebe cada gravação no localStorage e envia só o que mudou (registro por registro) para a nuvem.
//
// Estrutura no Firestore:
//   dados/{chave}                     -> { modo: 'registros' | 'valor', ordem?: string[], valor?: string }
//   dados/{chave}/registros/{id}      -> { j: JSON do registro, _rca/_cliente/_agr/_prov: dono }
// Listas de objetos com id viram "registros" (duas pessoas mexendo em registros diferentes não se atrapalham);
// o resto (objetos, mapas) fica inteiro em "valor".

import {
  collection, doc, onSnapshot, query, where, writeBatch, getDoc, setDoc, serverTimestamp,
  type Unsubscribe, type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PerfilUsuario } from './auth';
import { acessoDaChave, chavesDoPerfil, ehChaveDaNuvem, DONOS, ACESSO, type ModoChave, type CampoDono } from './nuvemAcesso';

const EVENTOS_TELAS = [
  'pedidos_venda_updated', 'pedidos_compra_updated', 'calculos_roca_updated', 'financeiro_updated', 'produtos_updated',
  'receitas_updated', 'fichas_tecnicas_updated', 'tabelas_preco_updated', 'categorias_produto_updated', 'clientes_updated',
  'cadastros_updated', 'comprovantes_updated', 'sitio_controle_despesas_updated', 'lotes_materia_prima_updated',
  'ordens_producao_updated', 'sistema_reset_updated',
];
export const EVENTO_NUVEM = 'grupo_eno_nuvem_status';

const KEY_SUJAS = 'grupo_eno_auth_nuvem_pendentes'; // chaves alteradas aqui e ainda não confirmadas pela nuvem
const LIMITE_DOC = 900_000; // Firestore aceita até 1 MB por documento
const LIMITE_LOTE = 400;

interface EstadoChave {
  chave: string;
  acesso: ModoChave;
  modo?: 'registros' | 'valor';
  remotos: Map<string, string>; // id -> JSON do registro na nuvem
  emRemoto: Map<string, number>; // id -> quando foi gravado (ordem dos que não estão na lista de ordem)
  ordem: string[];
  valorRemoto?: string;
  metaCarregada: boolean;
  registrosCarregados: boolean;
  timer: number | null;
  unsubs: Unsubscribe[];
}

const estados = new Map<string, EstadoChave>();
let ativo = false;
let perfilAtual: PerfilUsuario | null = null;
let vinculoAtual = '';
let uidAtual = '';
let liberadoEmMassaAte = 0;
let unsubDescoberta: Unsubscribe | null = null;
let eventosTimer: number | null = null;
let erroRecente = '';
let envios = 0;

// ---------- gravação local sem eco ----------
const proto = Storage.prototype;
const setOriginal = proto.setItem;
const removeOriginal = proto.removeItem;
let patchInstalado = false;

function gravarLocal(chave: string, valor: string | null): void {
  if (valor === null) removeOriginal.call(localStorage, chave);
  else setOriginal.call(localStorage, chave, valor);
}

function instalarPatch(): void {
  if (patchInstalado) return;
  patchInstalado = true;
  proto.setItem = function (this: Storage, k: string, v: string) {
    setOriginal.call(this, k, v);
    if (this === window.localStorage && ativo && estados.has(k)) agendarEnvio(k);
  };
  proto.removeItem = function (this: Storage, k: string) {
    removeOriginal.call(this, k);
    if (this === window.localStorage && ativo && estados.has(k)) agendarEnvio(k);
  };
}

function lerSujas(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY_SUJAS) || '[]')); } catch { return new Set(); }
}
function marcarSuja(chave: string, suja: boolean): void {
  const s = lerSujas();
  if (suja) s.add(chave); else s.delete(chave);
  setOriginal.call(localStorage, KEY_SUJAS, JSON.stringify([...s]));
}

function avisarTelas(): void {
  if (eventosTimer !== null) return;
  eventosTimer = window.setTimeout(() => {
    eventosTimer = null;
    EVENTOS_TELAS.forEach(e => window.dispatchEvent(new Event(e)));
  }, 120);
}

function avisarStatus(): void {
  window.dispatchEvent(new Event(EVENTO_NUVEM));
}

export function statusNuvem(): { ativo: boolean; enviando: number; pendentes: number; erro: string } {
  return { ativo, enviando: envios, pendentes: lerSujas().size, erro: erroRecente };
}

/** Restaurar backup / zerar o sistema: libera a exclusão em massa na nuvem por alguns segundos. */
export function liberarAlteracaoEmMassa(): void {
  liberadoEmMassaAte = Date.now() + 15_000;
}

// ---------- utilitários ----------
const idDoc = (id: unknown) => encodeURIComponent(String(id)).replace(/\./g, '%2E');

function viraRegistros(v: unknown): v is { id: string | number }[] {
  if (!Array.isArray(v)) return false;
  const ids = new Set<string>();
  for (const x of v) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
    const id = (x as any).id;
    if ((typeof id !== 'string' && typeof id !== 'number') || id === '') return false;
    const k = String(id);
    if (ids.has(k)) return false;
    ids.add(k);
  }
  return true;
}

// Registro maior que o limite: tira os arquivos embutidos (ficam só neste aparelho)
function caberNoDocumento(json: string): string {
  if (json.length <= LIMITE_DOC) return json;
  const aliviar = (o: any): any => {
    if (typeof o === 'string') return o.length > 50_000 ? '' : o;
    if (Array.isArray(o)) return o.map(aliviar);
    if (o && typeof o === 'object') {
      const r: any = {};
      for (const [k, v] of Object.entries(o)) r[k] = aliviar(v);
      return r;
    }
    return o;
  };
  const leve = JSON.stringify({ ...aliviar(JSON.parse(json)), _arquivo_so_local: true });
  console.warn('[nuvem] registro grande demais: arquivos anexos ficaram só neste aparelho');
  return leve;
}

function donoDoRegistro(chave: string, r: any): Partial<Record<CampoDono, string>> {
  const regras = DONOS[chave];
  if (!regras) return {};
  const out: Partial<Record<CampoDono, string>> = {};
  (Object.keys(regras) as CampoDono[]).forEach(c => {
    const v = regras[c]!(r);
    if (v) out[c] = String(v);
  });
  return out;
}

function ehMeu(est: EstadoChave, r: any): boolean {
  if (est.acesso.modo !== 'proprios') return true;
  return donoDoRegistro(est.chave, r)[est.acesso.campo] === vinculoAtual;
}

// ---------- nuvem -> local ----------
function montarLocal(est: EstadoChave): string | null {
  if (est.modo === 'valor') return est.valorRemoto ?? null;
  const ids = [...est.remotos.keys()];
  const naOrdem = new Set(est.ordem);
  const fora = ids.filter(id => !naOrdem.has(id)).sort((a, b) => (est.emRemoto.get(b) || 0) - (est.emRemoto.get(a) || 0));
  const ordenados = [...fora, ...est.ordem.filter(id => est.remotos.has(id))];
  return `[${ordenados.map(id => est.remotos.get(id)).join(',')}]`;
}

function aplicarRemoto(est: EstadoChave): void {
  if (!est.registrosCarregados || (est.acesso.modo === 'tudo' && !est.metaCarregada)) return;
  // Mudança local esperando envio: o envio vai acontecer e a nuvem devolve o estado final
  if (est.timer !== null || lerSujas().has(est.chave)) {
    agendarEnvio(est.chave, 0);
    return;
  }
  const novo = montarLocal(est);
  if (novo === null) return; // a nuvem ainda não tem esta chave: fica o que está aqui
  const atual = localStorage.getItem(est.chave);
  if (atual === novo) return;
  try {
    if (atual !== null && JSON.stringify(JSON.parse(atual)) === novo) return;
  } catch { /* valor local inválido: substitui */ }
  gravarLocal(est.chave, novo);
  avisarTelas();
}

function ouvirChave(chave: string, acesso: ModoChave): EstadoChave {
  const existente = estados.get(chave);
  if (existente) return existente;
  const est: EstadoChave = {
    chave, acesso, remotos: new Map(), emRemoto: new Map(), ordem: [],
    metaCarregada: acesso.modo === 'proprios', registrosCarregados: false, timer: null, unsubs: [],
  };
  estados.set(chave, est);
  const falhou = (e: Error) => {
    console.warn(`[nuvem] sem acesso a ${chave}:`, e.message);
    est.metaCarregada = true;
    est.registrosCarregados = true;
    marcarPronta();
  };

  if (acesso.modo === 'tudo') {
    est.unsubs.push(onSnapshot(doc(db, 'dados', chave), snap => {
      const d = snap.data() as DocumentData | undefined;
      est.modo = d?.modo;
      est.ordem = Array.isArray(d?.ordem) ? d!.ordem : [];
      est.valorRemoto = typeof d?.valor === 'string' ? d.valor : undefined;
      est.metaCarregada = true;
      aplicarRemoto(est);
      marcarPronta();
    }, falhou));
  } else {
    est.modo = 'registros';
  }

  const ref = collection(db, 'dados', chave, 'registros');
  const q = acesso.modo === 'proprios' ? query(ref, where(acesso.campo, '==', vinculoAtual)) : ref;
  est.unsubs.push(onSnapshot(q, snap => {
    snap.docChanges().forEach(ch => {
      const id = decodeURIComponent(ch.doc.id);
      if (ch.type === 'removed') {
        est.remotos.delete(id);
        est.emRemoto.delete(id);
      } else {
        const d = ch.doc.data();
        est.remotos.set(id, String(d.j));
        est.emRemoto.set(id, d.em?.toMillis?.() || Date.now());
      }
    });
    if (est.remotos.size > 0 && !est.modo) est.modo = 'registros';
    est.registrosCarregados = true;
    aplicarRemoto(est);
    marcarPronta();
  }, falhou));
  return est;
}

// ---------- local -> nuvem ----------
function agendarEnvio(chave: string, espera = 300): void {
  const est = estados.get(chave);
  if (!est || !est.acesso.gravar) return;
  marcarSuja(chave, true);
  if (est.timer !== null) window.clearTimeout(est.timer);
  est.timer = window.setTimeout(() => {
    est.timer = null;
    enviar(est).catch(e => {
      erroRecente = e instanceof Error ? e.message : String(e);
      console.error(`[nuvem] falha ao enviar ${chave}:`, e);
      avisarStatus();
    });
  }, espera);
}

async function enviar(est: EstadoChave): Promise<void> {
  if (!ativo || !est.acesso.gravar) return;
  // Só envia depois de conhecer o que está na nuvem (senão poderia apagar o que não viu)
  if (!est.registrosCarregados || !est.metaCarregada) {
    est.timer = window.setTimeout(() => { est.timer = null; enviar(est); }, 500);
    return;
  }
  const bruto = localStorage.getItem(est.chave);
  let valor: unknown = null;
  try { valor = bruto === null ? null : JSON.parse(bruto); } catch { valor = bruto; }

  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
  const metaRef = doc(db, 'dados', est.chave);
  const podeMeta = est.acesso.modo === 'tudo';
  const listaVazia = valor === null || (Array.isArray(valor) && valor.length === 0);
  const usarRegistros = est.acesso.modo === 'proprios' || (est.modo !== 'valor' && (viraRegistros(valor) || (listaVazia && est.modo === 'registros')));

  if (usarRegistros) {
    const lista = (Array.isArray(valor) ? valor : []).filter(r => ehMeu(est, r)) as any[];
    const vistos = new Set<string>();
    lista.forEach(r => {
      const id = String(r.id);
      vistos.add(id);
      const json = caberNoDocumento(JSON.stringify(r));
      if (est.remotos.get(id) === json) return;
      est.remotos.set(id, json);
      ops.push(b => b.set(doc(db, 'dados', est.chave, 'registros', idDoc(id)), { j: json, ...donoDoRegistro(est.chave, r), em: serverTimestamp(), por: uidAtual }));
    });
    const removidos = [...est.remotos.keys()].filter(id => !vistos.has(id));
    const emMassa = removidos.length >= 10 && removidos.length > est.remotos.size * 0.5;
    if (emMassa && Date.now() > liberadoEmMassaAte) {
      erroRecente = `Exclusão de ${removidos.length} registros em "${est.chave}" bloqueada por segurança. Use Restaurar backup / Zerar sistema se for intencional.`;
      console.warn('[nuvem]', erroRecente);
      avisarStatus();
    } else {
      removidos.forEach(id => {
        est.remotos.delete(id);
        ops.push(b => b.delete(doc(db, 'dados', est.chave, 'registros', idDoc(id))));
      });
    }
    if (podeMeta) {
      const ordem = lista.map(r => String(r.id));
      if (est.modo !== 'registros' || ordem.join('\u0001') !== est.ordem.join('\u0001')) {
        est.modo = 'registros';
        est.ordem = ordem;
        ops.push(b => b.set(metaRef, { modo: 'registros', ordem, valor: null, em: serverTimestamp(), por: uidAtual }));
      }
    }
  } else if (podeMeta) {
    const json = bruto === null ? null : caberNoDocumento(bruto);
    if (json !== (est.valorRemoto ?? null) || est.modo !== 'valor') {
      // Trocou de lista para valor: apaga os registros antigos
      if (est.modo === 'registros') [...est.remotos.keys()].forEach(id => ops.push(b => b.delete(doc(db, 'dados', est.chave, 'registros', idDoc(id)))));
      est.modo = 'valor';
      est.valorRemoto = json ?? undefined;
      ops.push(b => b.set(metaRef, { modo: 'valor', valor: json, ordem: null, em: serverTimestamp(), por: uidAtual }));
    }
  }

  if (ops.length === 0) {
    marcarSuja(est.chave, false);
    return;
  }
  envios++;
  avisarStatus();
  try {
    for (let i = 0; i < ops.length; i += LIMITE_LOTE) {
      const b = writeBatch(db);
      ops.slice(i, i + LIMITE_LOTE).forEach(f => f(b));
      await b.commit();
    }
    if (est.timer === null) marcarSuja(est.chave, false);
    erroRecente = '';
  } finally {
    envios--;
    avisarStatus();
  }
}

// ---------- ciclo de vida ----------
let resolverPronta: (() => void) | null = null;
function marcarPronta(): void {
  if (!resolverPronta) return;
  for (const est of estados.values()) {
    if (!est.registrosCarregados || !est.metaCarregada) return;
  }
  const r = resolverPronta;
  resolverPronta = null;
  r();
}

function todasAsChavesConhecidas(): string[] {
  const s = new Set<string>(Object.keys(DONOS));
  Object.values(ACESSO).forEach(a => [...a.leitura, ...a.escrita, ...a.proprios.map(p => p.chave)].forEach(k => s.add(k)));
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (ehChaveDaNuvem(k)) s.add(k);
  }
  return [...s];
}

/**
 * Liga a sincronização para o usuário logado. Resolve quando os dados chegaram
 * (ou depois de alguns segundos sem internet, seguindo com o que está neste aparelho).
 */
export async function iniciarSincronizacao(params: { uid: string; perfil: PerfilUsuario; vinculo?: string }): Promise<void> {
  pararSincronizacao(false);
  instalarPatch();
  perfilAtual = params.perfil;
  vinculoAtual = params.vinculo || '';
  uidAtual = params.uid;

  // Primeira vez na nuvem: só o administrador envia os dados deste computador.
  // Nenhum dado local é apagado antes de a pergunta ser respondida.
  const estadoRef = doc(db, 'sistema', 'estado');
  let migrado = false;
  try {
    migrado = !!(await getDoc(estadoRef)).data()?.migrado;
  } catch (e) {
    console.warn('[nuvem] não foi possível ler o estado do sistema:', e);
    throw new Error('Sem conexão com o banco de dados. Tente de novo.');
  }
  const temDadosLocais = todasAsChavesConhecidas().some(k => {
    const v = localStorage.getItem(k);
    return !!v && v !== '[]' && v !== '{}';
  });

  if (!migrado) {
    if (params.perfil !== 'ADMIN') {
      throw new Error('O banco de dados ainda não foi iniciado. Peça ao administrador para entrar primeiro.');
    }
    if (temDadosLocais) {
      const enviar = window.confirm('Primeira vez no banco de dados.

Enviar os dados que estão neste computador para o banco?

(Os outros aparelhos passam a ver estes dados.)

Se cancelar, nada é enviado e nada é apagado.');
      if (!enviar) throw new Error('Envio cancelado. Nada foi enviado nem apagado.');
      lerSujas().forEach(k => marcarSuja(k, false));
      todasAsChavesConhecidas().forEach(k => marcarSuja(k, true)); // tudo daqui vence na primeira carga
    }
    await setDoc(estadoRef, { migrado: true, em: serverTimestamp(), por: params.uid }, { merge: true });
  } else if (temDadosLocais && params.perfil !== 'ADMIN') {
    // Aparelho que já usava o sistema sem banco: o que está só aqui não vai para o banco
    const sujas = lerSujas();
    const soAqui = todasAsChavesConhecidas().some(k => !sujas.has(k) && !!localStorage.getItem(k) && localStorage.getItem(k) !== '[]');
    if (soAqui && !window.confirm('Este aparelho tem dados que não estão no banco.

Eles serão substituídos pelos dados do banco. Faça um backup antes.

Continuar?')) {
      throw new Error('Entrada cancelada. Faça o backup deste aparelho e entre de novo.');
    }
    todasAsChavesConhecidas().forEach(k => { if (!sujas.has(k)) gravarLocal(k, null); });
  }

  ativo = true;
  const pronta = new Promise<void>(r => { resolverPronta = r; });
  const chaves = params.perfil === 'ADMIN' ? todasAsChavesConhecidas() : chavesDoPerfil(params.perfil as Exclude<PerfilUsuario, 'ADMIN'>);
  chaves.forEach(k => {
    const a = acessoDaChave(params.perfil, k);
    if (a) ouvirChave(k, a);
  });
  // Administrador: chaves novas criadas em outro aparelho
  if (params.perfil === 'ADMIN') {
    unsubDescoberta = onSnapshot(collection(db, 'dados'), snap => {
      snap.docs.forEach(d => { if (!estados.has(d.id) && ehChaveDaNuvem(d.id)) ouvirChave(d.id, { modo: 'tudo', gravar: true }); });
    }, e => console.warn('[nuvem] descoberta de chaves:', e.message));
  }
  marcarPronta();
  avisarStatus();
  await Promise.race([pronta, new Promise<void>(r => window.setTimeout(r, 12_000))]);
  avisarTelas();
}

/** Desliga a sincronização. Ao sair do sistema, também apaga deste aparelho os dados baixados. */
export function pararSincronizacao(limparLocal = true): void {
  if (unsubDescoberta) { unsubDescoberta(); unsubDescoberta = null; }
  for (const est of estados.values()) {
    est.unsubs.forEach(u => u());
    if (est.timer !== null) {
      window.clearTimeout(est.timer);
      est.timer = null;
      if (ativo) enviar(est).catch(() => {});
    }
  }
  const chaves = [...estados.keys()];
  estados.clear();
  ativo = false;
  resolverPronta = null;
  if (limparLocal && lerSujas().size === 0) chaves.forEach(k => gravarLocal(k, null));
  perfilAtual = null;
  avisarStatus();
}

export function nuvemAtiva(): boolean {
  return ativo;
}

export function perfilSincronizado(): PerfilUsuario | null {
  return perfilAtual;
}
