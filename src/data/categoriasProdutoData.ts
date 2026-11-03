// Categorias de produto acabado (também são os "grupos de produto" da comissão por grupo).
// Lista persistida em 'grupo_eno_categorias_produto_v1'. Semeada com as categorias já usadas pelos
// produtos; categorias de produtos que não estejam na lista são incorporadas na leitura.
// Excluir uma categoria com produtos move esses produtos para "Sem categoria".

import type { ProdutoEstoque } from './produtosData';
import { salvarEstoqueProdutos } from './produtosData';
import { carregarRcas, salvarRcas } from './cadastrosData';

export const CATEGORIA_SEM_CATEGORIA = 'Sem categoria';
export const EVENTO_CATEGORIAS_PRODUTO = 'categorias_produto_updated';

const STORAGE_KEY_CATEGORIAS = 'grupo_eno_categorias_produto_v1';
const STORAGE_KEY_PRODUTOS = 'grupo_eno_produtos_estoque_v1';

/** Chave de comparação: sem acentos, sem maiúsculas e sem espaços extras. */
export function chaveCategoria(nome: string): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function limparNome(nome: string): string {
  return String(nome || '').trim().replace(/\s+/g, ' ');
}

function lerProdutosBruto(): ProdutoEstoque[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUTOS);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function ordenar(lista: string[]): string[] {
  return [...lista].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function gravar(lista: string[], notificar = true): void {
  localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(ordenar(lista)));
  if (notificar) window.dispatchEvent(new Event(EVENTO_CATEGORIAS_PRODUTO));
}

/** Lista de categorias (ordem alfabética). Inclui as categorias em uso pelos produtos. */
export function carregarCategoriasProduto(): string[] {
  if (typeof window === 'undefined') return [];
  let lista: string[] = [];
  let existia = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIAS);
    if (raw !== null) {
      existia = true;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) lista = parsed.map(c => limparNome(String(c))).filter(Boolean);
    }
  } catch {
    lista = [];
  }
  const chaves = new Set(lista.map(chaveCategoria));
  let alterou = !existia;
  lerProdutosBruto().forEach(p => {
    const nome = limparNome(String(p.categoria || ''));
    if (!nome || chaves.has(chaveCategoria(nome))) return;
    chaves.add(chaveCategoria(nome));
    lista.push(nome);
    alterou = true;
  });
  // Grava sem disparar evento (a leitura não pode gerar laço de atualização nas telas)
  if (alterou) gravar(lista, false);
  return ordenar(lista);
}

/** Nome já existente equivalente (ignorando maiúsculas/acentos), ou null. */
export function encontrarCategoria(nome: string, lista = carregarCategoriasProduto()): string | null {
  const k = chaveCategoria(nome);
  return lista.find(c => chaveCategoria(c) === k) || null;
}

/** Cria a categoria. Se já existir equivalente, devolve o nome existente sem duplicar. */
export function criarCategoriaProduto(nome: string): { nome?: string; erro?: string; jaExistia?: boolean } {
  const limpo = limparNome(nome);
  if (!limpo) return { erro: 'Informe o nome da categoria.' };
  const lista = carregarCategoriasProduto();
  const existente = encontrarCategoria(limpo, lista);
  if (existente) return { nome: existente, jaExistia: true };
  gravar([...lista, limpo]);
  return { nome: limpo };
}

export function contarProdutosDaCategoria(nome: string): number {
  const k = chaveCategoria(nome);
  return lerProdutosBruto().filter(p => chaveCategoria(String(p.categoria || '')) === k).length;
}

/**
 * Exclui a categoria. Produtos dela vão para "Sem categoria" (criada se faltar).
 * "Sem categoria" só pode ser excluída sem produtos.
 */
export function excluirCategoriaProduto(nome: string): { movidos: number; erro?: string } {
  const k = chaveCategoria(nome);
  const ehSemCategoria = k === chaveCategoria(CATEGORIA_SEM_CATEGORIA);
  const produtos = lerProdutosBruto();
  const daCategoria = produtos.filter(p => chaveCategoria(String(p.categoria || '')) === k);
  if (ehSemCategoria && daCategoria.length > 0) {
    return { movidos: 0, erro: `"${CATEGORIA_SEM_CATEGORIA}" ainda tem ${daCategoria.length} produto(s). Mova-os para outra categoria antes de excluir.` };
  }
  let lista = carregarCategoriasProduto().filter(c => chaveCategoria(c) !== k);
  if (daCategoria.length > 0) {
    if (!encontrarCategoria(CATEGORIA_SEM_CATEGORIA, lista)) lista = [...lista, CATEGORIA_SEM_CATEGORIA];
    const destino = encontrarCategoria(CATEGORIA_SEM_CATEGORIA, lista) || CATEGORIA_SEM_CATEGORIA;
    salvarEstoqueProdutos(
      produtos.map(p => (chaveCategoria(String(p.categoria || '')) === k ? { ...p, categoria: destino } : p))
    );
  }
  gravar(lista);
  return { movidos: daCategoria.length };
}

/** Renomeia a categoria, os produtos que a usam e as comissões por grupo dos RCAs. */
export function renomearCategoriaProduto(atual: string, novo: string): { nome?: string; erro?: string } {
  const limpo = limparNome(novo);
  if (!limpo) return { erro: 'Informe o novo nome.' };
  const lista = carregarCategoriasProduto();
  const kAtual = chaveCategoria(atual);
  const conflito = lista.find(c => chaveCategoria(c) === chaveCategoria(limpo) && chaveCategoria(c) !== kAtual);
  if (conflito) return { erro: `Já existe a categoria "${conflito}".` };
  const produtos = lerProdutosBruto();
  if (produtos.some(p => chaveCategoria(String(p.categoria || '')) === kAtual)) {
    salvarEstoqueProdutos(
      produtos.map(p => (chaveCategoria(String(p.categoria || '')) === kAtual ? { ...p, categoria: limpo } : p))
    );
  }
  const rcas = carregarRcas();
  const usaGrupo = (g: { grupo_id: string; grupo_nome: string }) =>
    chaveCategoria(g.grupo_id) === kAtual || chaveCategoria(g.grupo_nome) === kAtual;
  if (rcas.some(r => (r.comissoes_por_grupo || []).some(usaGrupo))) {
    salvarRcas(rcas.map(r => ({
      ...r,
      comissoes_por_grupo: (r.comissoes_por_grupo || []).map(g => (usaGrupo(g) ? { ...g, grupo_id: limpo, grupo_nome: limpo } : g))
    })));
  }
  gravar([...lista.filter(c => chaveCategoria(c) !== kAtual), limpo]);
  return { nome: limpo };
}
