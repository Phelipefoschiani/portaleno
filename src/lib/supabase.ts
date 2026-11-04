// Conexão do navegador com o Supabase (banco de dados do Grupo ENO).
// Usa só a chave pública: ela é feita para ficar no navegador. A chave secreta fica
// apenas no servidor (api/), nunca aqui.
import { createClient } from '@supabase/supabase-js';

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true quando o site foi compilado com a conexão ao Supabase configurada. */
export const SUPABASE_CONFIGURADO = !!URL_SUPABASE && !!CHAVE_PUBLICA;

export const supabase = SUPABASE_CONFIGURADO
  ? createClient(URL_SUPABASE!, CHAVE_PUBLICA!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'eno_auth' },
    })
  : null;

/** Login e usuários pelo Supabase (ligado quando as variáveis estão configuradas). */
export const MODO_NUVEM = SUPABASE_CONFIGURADO;
