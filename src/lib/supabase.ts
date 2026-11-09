// Conexão do navegador com o Supabase (banco de dados do Grupo ENO).
// Usa só a chave pública: ela é feita para ficar no navegador. A chave secreta fica
// apenas no servidor (api/), nunca aqui.
import { createClient } from '@supabase/supabase-js';

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true quando o site foi compilado com a conexão ao Supabase configurada. */
export const SUPABASE_CONFIGURADO = !!URL_SUPABASE && !!CHAVE_PUBLICA;

// "Lembrar acesso": marcado = a sessão fica no navegador mesmo depois de fechar; desmarcado = só até fechar.
const CHAVE_LEMBRAR = 'eno_lembrar_acesso';
const armazenamentoSessao = {
  getItem: (k: string) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k: string, v: string) => {
    const lembrar = localStorage.getItem(CHAVE_LEMBRAR) !== '0';
    (lembrar ? localStorage : sessionStorage).setItem(k, v);
    (lembrar ? sessionStorage : localStorage).removeItem(k);
  },
  removeItem: (k: string) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  },
};

/** Define antes do login se a sessão deve ficar guardada depois de fechar o navegador. */
export function definirLembrarAcesso(lembrar: boolean): void {
  try {
    localStorage.setItem(CHAVE_LEMBRAR, lembrar ? '1' : '0');
  } catch {
    /* sem armazenamento: vale o padrão */
  }
}

export const supabase = SUPABASE_CONFIGURADO
  ? createClient(URL_SUPABASE!, CHAVE_PUBLICA!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'eno_auth', storage: armazenamentoSessao },
    })
  : null;

/** Login e usuários pelo Supabase (ligado quando as variáveis estão configuradas). */
export const MODO_NUVEM = SUPABASE_CONFIGURADO;
