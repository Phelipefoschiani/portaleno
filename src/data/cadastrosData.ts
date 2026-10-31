// Persistência compartilhada dos cadastros de parceiros (agricultores e fornecedores)
// Todas as telas que listam esses parceiros devem ler daqui, nunca de constantes fixas.

import type { Agricultor, Fornecedor } from './mockStore';

export const EVENTO_CADASTROS_ATUALIZADOS = 'cadastros_updated';

const STORAGE_KEY_AGRICULTORES = 'grupo_eno_agricultores_v1';
const STORAGE_KEY_FORNECEDORES = 'grupo_eno_fornecedores_v1';

function lerLista<T>(chave: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function gravarLista<T>(chave: string, lista: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(chave, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO_CADASTROS_ATUALIZADOS));
}

export function carregarAgricultores(): Agricultor[] {
  return lerLista<Agricultor>(STORAGE_KEY_AGRICULTORES);
}

export function salvarAgricultores(lista: Agricultor[]): void {
  gravarLista(STORAGE_KEY_AGRICULTORES, lista);
}

export function carregarFornecedores(): Fornecedor[] {
  return lerLista<Fornecedor>(STORAGE_KEY_FORNECEDORES);
}

export function salvarFornecedores(lista: Fornecedor[]): void {
  gravarLista(STORAGE_KEY_FORNECEDORES, lista);
}
