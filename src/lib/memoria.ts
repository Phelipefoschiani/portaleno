// Os dados do sistema ficam na memória desta página, e não no armazenamento do navegador.
// Ao sair ou fechar a página, somem daqui: quem vale é o banco (Supabase).
// As telas continuam lendo e gravando como sempre; por baixo, cada gravação vai para o banco.
// Este módulo precisa ser carregado antes do restante do sistema (ver main.tsx).
import { TABELAS_DO_SISTEMA } from './bancoEnvio';

// Chaves do sistema e da sincronização que ficam só na memória
const CHAVES_SINCRONIZACAO = ['eno_sync_meta_v3', 'eno_sync_snapshot_v1', 'eno_sync_pendentes_v1'];
const memoria = new Map<string, string>();
const ouvintes = new Set<(chave: string) => void>();
const legado = new Map<string, string>(); // dados que estavam no navegador antes desta versão
let legadoChaves: string[] = []; // onde esses dados estão guardados no navegador (apagados só depois do envio)

const emMemoria = (chave: string) => chave in TABELAS_DO_SISTEMA || CHAVES_SINCRONIZACAO.includes(chave);

const proto = Storage.prototype;
const getOriginal = proto.getItem;
const setOriginal = proto.setItem;
const removeOriginal = proto.removeItem;

// Recolhe o que ficou no navegador de versões anteriores. Não apaga agora: só apaga depois de o
// administrador enviar tudo ao banco (ver apagarLegadoDoNavegador), para nada se perder.
for (const chave of Object.keys(TABELAS_DO_SISTEMA)) {
  const valor = getOriginal.call(window.localStorage, chave);
  if (valor !== null) {
    legado.set(chave, valor);
    legadoChaves.push(chave);
  }
}
// Restos da sincronização antiga (não são mais usados)
for (const chave of ['eno_sync_snapshot_v1', 'eno_sync_pendentes_v1']) removeOriginal.call(window.localStorage, chave);

proto.getItem = function (this: Storage, chave: string) {
  if (this === window.localStorage && emMemoria(chave)) return memoria.has(chave) ? memoria.get(chave)! : null;
  return getOriginal.call(this, chave);
};

proto.setItem = function (this: Storage, chave: string, valor: string) {
  if (this === window.localStorage && emMemoria(chave)) {
    memoria.set(chave, String(valor));
    ouvintes.forEach(f => f(chave));
    return;
  }
  setOriginal.call(this, chave, valor);
};

proto.removeItem = function (this: Storage, chave: string) {
  if (this === window.localStorage && emMemoria(chave)) {
    memoria.delete(chave);
    ouvintes.forEach(f => f(chave));
    return;
  }
  removeOriginal.call(this, chave);
};

/** Avisa quando uma chave da memória é gravada ou apagada (a sincronização envia ao banco). */
export function ouvirGravacao(f: (chave: string) => void): void {
  ouvintes.add(f);
}

/** Há dados antigos do navegador, ainda não enviados ao banco? */
export function temLegado(): boolean {
  return legado.size > 0;
}

/** Coloca os dados antigos na memória para o envio ao banco. */
export function importarLegado(): number {
  const n = legado.size;
  legado.forEach((valor, chave) => memoria.set(chave, valor));
  legado.clear();
  return n;
}

/** Depois do envio confirmado: apaga do navegador os dados antigos. */
export function apagarLegadoDoNavegador(): void {
  legadoChaves.forEach(chave => removeOriginal.call(window.localStorage, chave));
  legadoChaves = [];
}

/** Esvazia a memória (ao sair do sistema). */
export function limparMemoria(): void {
  memoria.clear();
  legado.clear();
}
