// Armazenamento do app da produção no próprio aparelho (IndexedDB próprio, separado do app da roça).
// Três gavetas: "ops" (cópia das ordens de produção abertas), "pendentes" (apontamentos ainda não enviados)
// e "historico" (apontamentos já enviados, guardados no celular para consulta e ajuste).

const NOME_BANCO = 'eno_producao';
const VERSAO = 3;
const GAVETA_OPS = 'ops';
const GAVETA_PENDENTES = 'pendentes';
const GAVETA_HISTORICO = 'historico';
const GAVETA_CONCLUSOES = 'conclusoes';

/** Pedido de conclusão de uma OP feito pela produção. Vai ao escritório, que conclui no sistema. */
export interface ConclusaoApp {
  id: string;
  op_id: string;
  op_numero: string;
  produto_nome: string;
  operador?: string;
  /** Pacotes apontados na OP no momento do pedido (informativo). */
  pacotes_apontados: number;
  criado_em: string;
  /** Já foi enviada ao banco? (controle só deste celular) */
  enviada?: boolean;
  /** Preenchido quando o escritório concluiu a OP no sistema (vem do banco). */
  concluido_em?: string;
}

/** Ordem de produção como o app precisa dela (subconjunto do que está no banco). */
export interface OPApp {
  id: string;
  numero: string;
  produto_nome: string;
  tipo_embalagem?: string;
  status: 'PLANEJADA' | 'EM_PRODUCAO' | 'CONCLUIDA' | 'CANCELADA';
  /** Quantidades da OP são sempre em PACOTES (unidades). */
  quantidade_planejada_pacotes: number;
  quantidade_produzida_pacotes: number;
  /** Rastreabilidade atual da OP (lote, fabricação e validade). */
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
  /** Pacotes que já vieram do estoque quando a OP foi criada (entram como feitos). */
  do_estoque_pacotes?: number;
  /** Pacotes que cabem em cada fardo/caixa (para mostrar fardos prontos). */
  unidades_por_embalagem?: number;
  /** Peso de cada pacote, em kg (para mostrar o total de kg). */
  peso_unitario_kg?: number;
}

/** Apontamento feito na produção. A quantidade é sempre em pacotes. */
export interface ApontamentoApp {
  id: string;
  op_id: string;
  op_numero: string;
  produto_nome: string;
  tipo_embalagem?: string;
  pacotes: number;
  operador?: string;
  observacao?: string;
  /** Rastreabilidade informada na produção (AAAA-MM-DD). Vazio: o sistema usa o padrão. */
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
  criado_em: string;
  editado_em?: string;
  /** Linhas de pedido de conclusão também passam pela tabela; estas têm tipo 'CONCLUSAO'. */
  tipo?: 'APONTAMENTO' | 'CONCLUSAO';
  /** Preenchido quando a pessoa exclui um apontamento já enviado: o envio apaga do banco. */
  excluido_em?: string;
  /** Preenchido pelo escritório quando o apontamento é lançado na OP (vem do banco). */
  lancado_em?: string;
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
        if (!db.objectStoreNames.contains(GAVETA_HISTORICO)) db.createObjectStore(GAVETA_HISTORICO, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(GAVETA_CONCLUSOES)) db.createObjectStore(GAVETA_CONCLUSOES, { keyPath: 'id' });
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

// ---------- Fila de envio (ainda não chegou ao sistema) ----------

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

// ---------- Histórico (já enviados: consulta, ajuste enquanto não for lançado) ----------

export async function gravarHistorico(item: ApontamentoApp): Promise<void> {
  await requisicao(GAVETA_HISTORICO, 'readwrite', s => s.put(item));
}

export async function listarHistorico(): Promise<ApontamentoApp[]> {
  const lista = await requisicao<ApontamentoApp[]>(GAVETA_HISTORICO, 'readonly', s => s.getAll());
  return lista.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

export async function removerHistorico(id: string): Promise<void> {
  await requisicao(GAVETA_HISTORICO, 'readwrite', s => s.delete(id));
}

/** Troca o histórico local pela lista vinda do banco (apontamentos de todos os celulares). */
export async function substituirHistorico(lista: ApontamentoApp[]): Promise<void> {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GAVETA_HISTORICO, 'readwrite');
    const store = tx.objectStore(GAVETA_HISTORICO);
    store.clear();
    lista.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Conclusões pedidas pela produção ----------

export async function gravarConclusao(item: ConclusaoApp): Promise<void> {
  await requisicao(GAVETA_CONCLUSOES, 'readwrite', s => s.put(item));
}

export async function listarConclusoes(): Promise<ConclusaoApp[]> {
  const lista = await requisicao<ConclusaoApp[]>(GAVETA_CONCLUSOES, 'readonly', s => s.getAll());
  return lista.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

/** Troca a lista local pela do banco, mantendo as que este celular ainda não enviou. */
export async function substituirConclusoes(lista: ConclusaoApp[]): Promise<void> {
  const db = await abrir();
  const atuais = await listarConclusoes();
  const naoEnviadas = atuais.filter(c => !c.enviada);
  const ids = new Set(lista.map(c => c.id));
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GAVETA_CONCLUSOES, 'readwrite');
    const store = tx.objectStore(GAVETA_CONCLUSOES);
    store.clear();
    lista.forEach(item => store.put(item));
    naoEnviadas.filter(c => !ids.has(c.id)).forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function marcarConclusaoEnviada(id: string): Promise<void> {
  const atual = (await listarConclusoes()).find(c => c.id === id);
  if (atual) await gravarConclusao({ ...atual, enviada: true });
}
