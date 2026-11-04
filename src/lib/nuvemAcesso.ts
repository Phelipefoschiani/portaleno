// O que cada perfil lê e grava na nuvem (Firestore). Espelha o arquivo firestore.rules:
// mudou aqui, muda lá também.
//
// - ADMIN: tudo.
// - Equipe interna (PRODUCAO, SITIO): por chave inteira.
// - Externos (RCA, CLIENTE, AGRICULTOR, PROVISORIO): só os próprios registros, pelo campo de dono
//   gravado em cada documento (_rca, _cliente, _agr, _prov).

import type { PerfilUsuario } from './auth';

export type CampoDono = '_rca' | '_cliente' | '_agr' | '_prov';

const P = (nome: string) => `grupo_eno_${nome}`;

// Campos de dono de cada registro, calculados do próprio registro
export const DONOS: Record<string, Partial<Record<CampoDono, (r: any) => string | undefined>>> = {
  [P('clientes_v1')]: { _rca: r => r.vendedor_id, _cliente: r => r.id },
  [P('pedidos_venda_v1')]: { _rca: r => r.rca_id, _cliente: r => r.cliente_id },
  [P('vendas_rca_v1')]: { _rca: r => r.rca_id, _cliente: r => r.cliente_id },
  [P('rcas_v1')]: { _rca: r => r.id },
  [P('agricultores_v1')]: { _agr: r => r.id },
  [P('calculos_roca_v1')]: { _agr: r => r.fornecedor_id },
  [P('cadastros_provisorios_v1')]: { _prov: r => r.id },
  [P('pedidos_portfolio_v1')]: { _prov: r => r.cadastro_provisorio_id },
};

export interface AcessoPerfil {
  /** Chaves lidas inteiras */
  leitura: string[];
  /** Chaves gravadas inteiras (também lidas) */
  escrita: string[];
  /** Chaves em que só os registros do próprio usuário são lidos e gravados */
  proprios: { chave: string; campo: CampoDono; gravar: boolean }[];
}

const CATALOGO = [P('produtos_estoque_v1'), P('categorias_produto_v1'), P('tabelas_preco_v1')];

export const ACESSO: Record<Exclude<PerfilUsuario, 'ADMIN'>, AcessoPerfil> = {
  PRODUCAO: {
    leitura: [...CATALOGO, P('receitas_v1'), P('fichas_tecnicas_v1'), P('fornecedores_v1'), P('agricultores_v1'), P('financeiro_caixa_baixas_v1'), P('financeiro_caixa_invest_v1'), P('clientes_v1')],
    escrita: [
      P('ordens_producao_v1'), P('lotes_materia_prima_v1'), P('materia_prima_v1'), P('produtos_estoque_v1'), P('movimentos_mp_v1'),
      P('pedidos_venda_v1'), P('pedidos_compra_v2'), P('financeiro_pagar_v1'), P('financeiro_despesas_v1'),
      P('financeiro_notas_entrada_v1'), P('colaboradores_producao_v1'),
    ],
    proprios: [],
  },
  SITIO: {
    leitura: [],
    escrita: [
      P('sitio_controle_despesas_v3'), P('financeiro_despesas_v1'), P('financeiro_pagar_v1'),
      P('financeiro_caixa_baixas_v1'), P('financeiro_caixa_invest_v1'), P('financeiro_caixa_movimentos_v1'),
    ],
    proprios: [],
  },
  RCA: {
    leitura: [...CATALOGO, P('receitas_v1'), P('materia_prima_v1')],
    escrita: [],
    proprios: [
      { chave: P('clientes_v1'), campo: '_rca', gravar: true },
      { chave: P('pedidos_venda_v1'), campo: '_rca', gravar: true },
      { chave: P('vendas_rca_v1'), campo: '_rca', gravar: true },
      { chave: P('rcas_v1'), campo: '_rca', gravar: false },
    ],
  },
  CLIENTE: {
    leitura: [...CATALOGO],
    escrita: [],
    proprios: [
      { chave: P('clientes_v1'), campo: '_cliente', gravar: false },
      { chave: P('pedidos_venda_v1'), campo: '_cliente', gravar: true },
    ],
  },
  AGRICULTOR: {
    leitura: [],
    escrita: [],
    proprios: [
      { chave: P('agricultores_v1'), campo: '_agr', gravar: false },
      { chave: P('calculos_roca_v1'), campo: '_agr', gravar: false },
    ],
  },
  PROVISORIO: {
    leitura: [...CATALOGO],
    escrita: [],
    proprios: [
      { chave: P('cadastros_provisorios_v1'), campo: '_prov', gravar: false },
      { chave: P('pedidos_portfolio_v1'), campo: '_prov', gravar: true },
    ],
  },
};

// Chaves locais que não vão para a nuvem (login, sessão e controles do próprio navegador)
const NAO_SINCRONIZAR = new Set([
  P('modo_limpo_v1'), P('limpeza_v2'), P('limpeza_inicial_v1'), P('ultimo_backup_v1'),
]);

export function ehChaveDaNuvem(chave: string | null): chave is string {
  return !!chave && chave.startsWith('grupo_eno_') && !chave.startsWith('grupo_eno_auth_') && !NAO_SINCRONIZAR.has(chave);
}

export type ModoChave = { modo: 'tudo'; gravar: boolean } | { modo: 'proprios'; campo: CampoDono; gravar: boolean };

/** Como o perfil acessa a chave (null = não acessa). */
export function acessoDaChave(perfil: PerfilUsuario, chave: string): ModoChave | null {
  if (perfil === 'ADMIN') return { modo: 'tudo', gravar: true };
  const a = ACESSO[perfil];
  if (!a) return null;
  if (a.escrita.includes(chave)) return { modo: 'tudo', gravar: true };
  if (a.leitura.includes(chave)) return { modo: 'tudo', gravar: false };
  const p = a.proprios.find(x => x.chave === chave);
  return p ? { modo: 'proprios', campo: p.campo, gravar: p.gravar } : null;
}

/** Chaves que o perfil não-admin acessa (o admin acessa todas as que existirem). */
export function chavesDoPerfil(perfil: Exclude<PerfilUsuario, 'ADMIN'>): string[] {
  const a = ACESSO[perfil];
  return Array.from(new Set([...a.leitura, ...a.escrita, ...a.proprios.map(p => p.chave)]));
}
