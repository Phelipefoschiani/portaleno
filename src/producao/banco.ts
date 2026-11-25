// Armazenamento do app da produção no próprio aparelho (IndexedDB próprio, separado do app da roça).
// Duas gavetas: "ops" (cópia das ordens de produção abertas) e "pendentes" (apontamentos ainda não enviados).

const NOME_BANCO = 'eno_producao';
const VERSAO = 1;
const GAVETA_OPS = 'ops';
const GAVETA_PENDENTES = 'pendentes';

/** Ordem de produção como o app precisa dela (subconjunto do que está no banco). */
export interface OPApp {
  id: string;
  numero: string;
  produto_nome: string;
  tipo_embalagem?: string;
  status: 'PLANEJADA' | 'EM_PRODUCAO' | 'CONCLUIDA' | 'CANCELADA';
  quantidade_planejada_pacotes: number;
  quantidade_produzida_pacotes: number;
}

/** Apontamento feito na produção. Fica na fila até o banco confirmar. */
export interface ApontamentoApp {
  id: string;
  op_id: string;
  op_numero: string;
  produto_nome: string;
  tipo_embalagem?: string;
  pacotes: number;
  operador?: string;
  observacao?: string;
  criado_em: string;
  editado_em?: string;
}

let conexao: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (!conexao) {
    conexao = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOME_BANCO, VERSAO);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(GAVETA_OPS)) db.createObjectStore(GAVETA_OPS, { keyPath: 'id' });
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

// ---------- Ordens abertas (cópia local) ----------

export async function listarOPsLocais(): Promise<OPApp[]> {
  const lista = await requisicao<OPApp[]>(GAVETA_OPS, 'readonly', s => s.getAll());
  return lista.sort((a, b) => a.numero.localeCompare(b.numero));
}

/** Troca a cópia local pela lista vinda do banco. */
export async function substituirOPsLocais(lista: OPApp[]): Promise<void> {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GAVETA_OPS, 'readwrite');
    const store = tx.objectStore(GAVETA_OPS);
    store.clear();
    lista.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Fila de apontamentos ----------

export function novoIdApontamento(): string {
  return `apt_app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function gravarPendente(item: ApontamentoApp): Promise<void> {
  await requisicao(GAVETA_PENDENTES, 'readwrite', s => s.put(item));
}

export async function listarPendentes(): Promise<ApontamentoApp[]> {
  const lista = await requisicao<ApontamentoApp[]>(GAVETA_PENDENTES, 'readonly', s => s.getAll());
  return lista.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

export async function removerPendente(id: string): Promise<void> {
  await requisicao(GAVETA_PENDENTES, 'readwrite', s => s.delete(id));
}
