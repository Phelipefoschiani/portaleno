// Armazenamento do app da roça no próprio aparelho (IndexedDB): funciona sem internet.
// Duas gavetas: "agricultores" (cópia para usar offline) e "pendentes" (fila a enviar ao banco).

const NOME_BANCO = 'eno_roca';
const VERSAO = 1;
const GAVETA_AGRICULTORES = 'agricultores';
const GAVETA_PENDENTES = 'pendentes';

export type TipoPendente = 'PESAGEM' | 'AGRICULTOR';

export interface Pendente {
  id: string;
  tipo: TipoPendente;
  dados: unknown;
  criado_em: string;
  tentativas: number;
  ultimo_erro?: string;
}

let conexao: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (!conexao) {
    conexao = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOME_BANCO, VERSAO);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(GAVETA_AGRICULTORES)) db.createObjectStore(GAVETA_AGRICULTORES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(GAVETA_PENDENTES)) db.createObjectStore(GAVETA_PENDENTES, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return conexao;
}

function requisicao<T>(gaveta: string, modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrir().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(gaveta, modo);
        const req = fn(tx.objectStore(gaveta));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

// ---------- Agricultores (cópia local) ----------

export async function listarAgricultoresLocais<T = unknown>(): Promise<T[]> {
  return (await requisicao<T[]>(GAVETA_AGRICULTORES, 'readonly', s => s.getAll())) as T[];
}

/** Troca a cópia local pela lista vinda do banco (mantém os cadastrados aqui que ainda não subiram). */
export async function substituirAgricultoresLocais<T extends { id: string }>(lista: T[]): Promise<void> {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GAVETA_AGRICULTORES, 'readwrite');
    const store = tx.objectStore(GAVETA_AGRICULTORES);
    store.clear();
    lista.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function gravarAgricultorLocal<T extends { id: string }>(item: T): Promise<void> {
  await requisicao(GAVETA_AGRICULTORES, 'readwrite', s => s.put(item));
}

export async function removerAgricultorLocal(id: string): Promise<void> {
  await requisicao(GAVETA_AGRICULTORES, 'readwrite', s => s.delete(id));
}

// ---------- Pendentes (fila de envio) ----------

export async function enfileirar(tipo: TipoPendente, dados: unknown, idFixo?: string): Promise<Pendente> {
  const id = idFixo || `${tipo === 'PESAGEM' ? 'pes' : 'agr'}_app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: Pendente = { id, tipo, dados, criado_em: new Date().toISOString(), tentativas: 0 };
  await requisicao(GAVETA_PENDENTES, 'readwrite', s => s.put(item));
  return item;
}

export async function listarPendentes(): Promise<Pendente[]> {
  const lista = (await requisicao<Pendente[]>(GAVETA_PENDENTES, 'readonly', s => s.getAll())) as Pendente[];
  return lista.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

export async function marcarErro(item: Pendente, erro: string): Promise<void> {
  await requisicao(GAVETA_PENDENTES, 'readwrite', s => s.put({ ...item, tentativas: item.tentativas + 1, ultimo_erro: erro }));
}

export async function removerPendente(id: string): Promise<void> {
  await requisicao(GAVETA_PENDENTES, 'readwrite', s => s.delete(id));
}
