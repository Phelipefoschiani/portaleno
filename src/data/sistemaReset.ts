// Módulo de Gerenciamento de Reset do Sistema e Modo Novo Usuário
// Permite zerar completamente os dados do sistema (tudo fica no localStorage).
// Regra de ouro: NUNCA apagar chaves 'grupo_eno_auth_*' (usuários e sessão).

const PREFIXO_DADOS = 'grupo_eno_';
const PREFIXO_AUTH = 'grupo_eno_auth_';

const KEY_MODO_LIMPO = 'grupo_eno_modo_limpo_v1';
const KEY_LIMPEZA_V2 = 'grupo_eno_limpeza_v2';
const KEY_LIMPEZA_INICIAL_ANTIGA = 'grupo_eno_limpeza_inicial_v1';
// Data do último backup em arquivo (src/lib/backup.ts). Não entra no backup e o reset preserva.
export const KEY_ULTIMO_BACKUP = 'grupo_eno_ultimo_backup_v1';

// Flags de controle que o reset manual preserva (não são dados do usuário)
const FLAGS_CONTROLE = new Set<string>([KEY_MODO_LIMPO, KEY_LIMPEZA_V2, KEY_LIMPEZA_INICIAL_ANTIGA, KEY_ULTIMO_BACKUP]);

/** true para flags de controle internas (preservadas no reset e na restauração de backup). */
export function ehFlagDeControle(chave: string): boolean {
  return FLAGS_CONTROLE.has(chave);
}

/** Garante a flag da limpeza inicial (sem ela o App apagaria tudo na próxima abertura). */
export function marcarLimpezaInicialConcluida(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(KEY_LIMPEZA_V2) === null) localStorage.setItem(KEY_LIMPEZA_V2, 'true');
}

// Cadastros base preservados quando limparTodoOSistema(true)
const CHAVES_CADASTROS_BASE = new Set<string>([
  'grupo_eno_clientes_v1',
  'grupo_eno_produtos_estoque_v1',
  'grupo_eno_materia_prima_v1',
  'grupo_eno_receitas_v1',
  'grupo_eno_fichas_tecnicas_v1',
  'grupo_eno_tabelas_preco_v1',
  'grupo_eno_categorias_produto_v1',
  'grupo_eno_custos_v1',
  'grupo_eno_agricultores_v1',
  'grupo_eno_fornecedores_v1'
]);

// Todos os eventos de atualização usados pelas telas
const EVENTOS_ATUALIZACAO = [
  'pedidos_venda_updated',
  'pedidos_compra_updated',
  'calculos_roca_updated',
  'financeiro_updated',
  'produtos_updated',
  'receitas_updated',
  'fichas_tecnicas_updated',
  'tabelas_preco_updated',
  'categorias_produto_updated',
  'clientes_updated',
  'cadastros_updated',
  'comprovantes_updated',
  'sitio_controle_despesas_updated',
  'sistema_reset_updated'
];

export function isModoLimpoAtivo(): boolean {
  if (typeof window === 'undefined') return true;
  // Se ainda não houver flag definida, assume modo limpo ativo por solicitação do usuário
  const val = localStorage.getItem(KEY_MODO_LIMPO);
  if (val === null) {
    localStorage.setItem(KEY_MODO_LIMPO, 'true');
    return true;
  }
  return val === 'true';
}

export function ehChaveDeDados(chave: string | null): chave is string {
  return !!chave && chave.startsWith(PREFIXO_DADOS) && !chave.startsWith(PREFIXO_AUTH);
}

// Lista as chaves 'grupo_eno_*' existentes (exceto auth). Coleta antes de remover para não pular índices.
export function listarChavesDeDados(): string[] {
  const chaves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (ehChaveDeDados(chave)) chaves.push(chave);
  }
  return chaves;
}

/**
 * Apaga todos os dados do sistema (todas as chaves 'grupo_eno_*', removidas por prefixo),
 * preservando sempre 'grupo_eno_auth_*' e as flags de controle.
 * Com manterCadastrosBase = true, preserva clientes, produtos, receitas, fichas, tabelas,
 * custos, agricultores e fornecedores.
 */
export function limparTodoOSistema(manterCadastrosBase: boolean = false): void {
  if (typeof window === 'undefined') return;

  for (const chave of listarChavesDeDados()) {
    if (FLAGS_CONTROLE.has(chave)) continue;
    if (manterCadastrosBase && CHAVES_CADASTROS_BASE.has(chave)) continue;
    localStorage.removeItem(chave);
  }

  // Marca sistema limpo: os carregadores passam a devolver listas vazias (sem dados de exemplo)
  localStorage.setItem(KEY_MODO_LIMPO, 'true');

  dispatchTodosEventos();
}

/**
 * Limpeza única na primeira abertura após a atualização (contrato com App.tsx).
 * Se a flag 'grupo_eno_limpeza_v2' não existir: remove todas as chaves 'grupo_eno_*'
 * (exceto 'grupo_eno_auth_*'), grava modo limpo + a flag e retorna true (o App recarrega).
 * Se já existir, não faz nada e retorna false.
 */
export function executarLimpezaInicialSeNecessario(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(KEY_LIMPEZA_V2) !== null) return false;

    for (const chave of listarChavesDeDados()) {
      localStorage.removeItem(chave);
    }
    localStorage.setItem(KEY_MODO_LIMPO, 'true');
    localStorage.setItem(KEY_LIMPEZA_V2, 'true');
    return true;
  } catch (e) {
    console.error('Erro na limpeza inicial do sistema:', e);
    return false;
  }
}

function dispatchTodosEventos(): void {
  for (const evento of EVENTOS_ATUALIZACAO) {
    window.dispatchEvent(new Event(evento));
  }
}
