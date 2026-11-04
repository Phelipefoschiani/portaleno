// Rascunho de cadastro: o formulário de um cadastro NOVO é guardado enquanto é preenchido,
// para voltar do ponto em que parou (mesmo que a página seja trocada ou o sistema fechado).
// A chave começa com "eno_rascunho_" (e não "grupo_eno_"): não entra no backup nem na sincronização.
import { useEffect } from 'react';

const PREFIXO = 'eno_rascunho_';

/** Rascunho salvo de um formulário, ou null. */
export function lerRascunho<T>(nome: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIXO + nome);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Apaga o rascunho (botão Limpar e depois de salvar o cadastro). */
export function apagarRascunho(nome: string): void {
  try {
    localStorage.removeItem(PREFIXO + nome);
  } catch {
    /* navegador sem armazenamento: nada a apagar */
  }
}

/** Guarda o formulário enquanto estiver em "novo cadastro" (ativo = true). */
export function useRascunho<T>(nome: string, valor: T, ativo: boolean): void {
  useEffect(() => {
    if (!ativo) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(PREFIXO + nome, JSON.stringify(valor));
      } catch {
        /* armazenamento cheio: segue sem rascunho */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [nome, valor, ativo]);
}
