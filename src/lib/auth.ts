// Autenticação local do Grupo ENO (sistema offline, dados no navegador).
// - Usuários em localStorage ('grupo_eno_auth_usuarios_v1') com senha em hash PBKDF2-SHA256 + salt aleatório.
// - Sessão em sessionStorage ('grupo_eno_auth_sessao_v1'), válida por 8 horas.
// - Bloqueio de 5 tentativas erradas por 5 minutos.
// Observação: por ser 100% local, quem tem acesso ao navegador com ferramentas de desenvolvedor
// consegue alterar os dados. Quando houver servidor, a autenticação deve ser feita no backend.

export type PerfilUsuario = 'ADMIN' | 'AGRICULTOR' | 'RCA' | 'PROVISORIO' | 'PRODUCAO' | 'SITIO' | 'CLIENTE';

export const PERFIS_USUARIO: { id: PerfilUsuario; rotulo: string }[] = [
  { id: 'ADMIN', rotulo: 'Administrador (Painel Geral)' },
  { id: 'AGRICULTOR', rotulo: 'Agricultor (Portal do Produtor)' },
  { id: 'RCA', rotulo: 'RCA (Representante Comercial)' },
  { id: 'PROVISORIO', rotulo: 'Cadastro Provisório (Portfólio VIP)' },
  { id: 'PRODUCAO', rotulo: 'Produção (Chão de Fábrica)' },
  { id: 'SITIO', rotulo: 'Controle do Sítio' },
  { id: 'CLIENTE', rotulo: 'Cliente (Portal do Cliente)' },
];

interface UsuarioArmazenado {
  id: string;
  usuario: string;
  nome: string;
  perfil: PerfilUsuario;
  vinculo_id?: string;
  ativo: boolean;
  criado_em: string;
  senha_hash: string;
  senha_salt: string;
  senha_iteracoes: number;
}

export type UsuarioSistema = Omit<UsuarioArmazenado, 'senha_hash' | 'senha_salt' | 'senha_iteracoes'>;

export interface SessaoUsuario {
  usuario_id: string;
  usuario: string;
  nome: string;
  perfil: PerfilUsuario;
  vinculo_id?: string;
  expira_em: number; // epoch ms
}

export const EVENTO_AUTH_ATUALIZADO = 'grupo_eno_auth_updated';

const KEY_USUARIOS = 'grupo_eno_auth_usuarios_v1';
const KEY_SESSAO = 'grupo_eno_auth_sessao_v1';
const KEY_TENTATIVAS = 'grupo_eno_auth_tentativas_v1';

const ITERACOES_PBKDF2 = 150000;
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 5 * 60 * 1000;
export const SENHA_MINIMA = 6;

const ERRO_GENERICO = 'Usuário ou senha inválidos.';

// ---------- utilitários ----------

function paraBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

function deBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function normalizarUsuario(u: string): string {
  return u.trim().toLowerCase();
}

function comparacaoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derivarHash(senha: string, salt: Uint8Array, iteracoes: number): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iteracoes },
    chave,
    256
  );
  return paraBase64(new Uint8Array(bits));
}

async function gerarCredencial(senha: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivarHash(senha, salt, ITERACOES_PBKDF2);
  return { senha_hash: hash, senha_salt: paraBase64(salt), senha_iteracoes: ITERACOES_PBKDF2 };
}

function gerarId(): string {
  const r = crypto.getRandomValues(new Uint8Array(6));
  return `usr_${Date.now()}_${Array.from(r).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

function lerUsuarios(): UsuarioArmazenado[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_USUARIOS);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravarUsuarios(lista: UsuarioArmazenado[]): void {
  localStorage.setItem(KEY_USUARIOS, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO_AUTH_ATUALIZADO));
}

function publico(u: UsuarioArmazenado): UsuarioSistema {
  const { senha_hash, senha_salt, senha_iteracoes, ...resto } = u;
  return resto;
}

function validarSenha(senha: string): void {
  if (!senha || senha.length < SENHA_MINIMA) {
    throw new Error(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`);
  }
}

const RE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** Login: nome de usuário simples ou e-mail (sempre minúsculo e único na base). */
function validarNomeUsuario(usuario: string, lista: UsuarioArmazenado[], ignorarId?: string): string {
  const u = normalizarUsuario(usuario);
  if (u.length < 3) throw new Error('O usuário deve ter no mínimo 3 caracteres.');
  if (u.includes('@')) {
    if (!RE_EMAIL.test(u)) throw new Error('E-mail de login inválido.');
  } else if (!/^[a-z0-9._-]+$/.test(u)) {
    throw new Error('Use apenas letras, números, ponto, hífen ou sublinhado no usuário (ou um e-mail).');
  }
  if (lista.some(x => x.usuario === u && x.id !== ignorarId)) throw new Error('Já existe um usuário com esse login.');
  return u;
}

/** Valida um login (nome ou e-mail) contra a base atual, sem gravar. Lança erro se inválido/duplicado. */
export function validarLogin(usuario: string, ignorarId?: string): string {
  return validarNomeUsuario(usuario, lerUsuarios(), ignorarId);
}

/** Usuário vinculado a um cadastro (ex.: RCA ou cliente) com o perfil indicado. */
export function obterUsuarioPorVinculo(perfil: PerfilUsuario, vinculoId?: string | null): UsuarioSistema | undefined {
  if (!vinculoId) return undefined;
  const u = lerUsuarios().find(x => x.perfil === perfil && x.vinculo_id === vinculoId);
  return u ? publico(u) : undefined;
}

// ---------- tentativas / bloqueio ----------

type MapaTentativas = Record<string, { falhas: number; bloqueado_ate?: number }>;

function lerTentativas(): MapaTentativas {
  try {
    const raw = localStorage.getItem(KEY_TENTATIVAS);
    const m = raw ? JSON.parse(raw) : {};
    return m && typeof m === 'object' ? m : {};
  } catch {
    return {};
  }
}

function gravarTentativas(m: MapaTentativas): void {
  localStorage.setItem(KEY_TENTATIVAS, JSON.stringify(m));
}

function bloqueioRestanteMs(usuario: string): number {
  const t = lerTentativas()[usuario];
  if (!t?.bloqueado_ate) return 0;
  return Math.max(0, t.bloqueado_ate - Date.now());
}

function registrarFalha(usuario: string): void {
  const m = lerTentativas();
  const atual = m[usuario] || { falhas: 0 };
  if (atual.bloqueado_ate && atual.bloqueado_ate <= Date.now()) {
    atual.falhas = 0;
    atual.bloqueado_ate = undefined;
  }
  atual.falhas += 1;
  if (atual.falhas >= MAX_TENTATIVAS) {
    atual.bloqueado_ate = Date.now() + BLOQUEIO_MS;
    atual.falhas = 0;
  }
  m[usuario] = atual;
  gravarTentativas(m);
}

function limparFalhas(usuario: string): void {
  const m = lerTentativas();
  delete m[usuario];
  gravarTentativas(m);
}

// ---------- sessão ----------

function gravarSessao(u: UsuarioArmazenado): SessaoUsuario {
  const sessao: SessaoUsuario = {
    usuario_id: u.id,
    usuario: u.usuario,
    nome: u.nome,
    perfil: u.perfil,
    vinculo_id: u.vinculo_id,
    expira_em: Date.now() + DURACAO_SESSAO_MS,
  };
  sessionStorage.setItem(KEY_SESSAO, JSON.stringify(sessao));
  window.dispatchEvent(new Event(EVENTO_AUTH_ATUALIZADO));
  return sessao;
}

/** Retorna a sessão válida atual (ou null). Perfil e vínculo vêm sempre do cadastro atual do usuário. */
export function obterSessao(): SessaoUsuario | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY_SESSAO);
    if (!raw) return null;
    const s = JSON.parse(raw) as SessaoUsuario;
    if (!s || typeof s.expira_em !== 'number' || s.expira_em <= Date.now()) {
      sessionStorage.removeItem(KEY_SESSAO);
      return null;
    }
    const u = lerUsuarios().find(x => x.id === s.usuario_id);
    if (!u || !u.ativo) {
      sessionStorage.removeItem(KEY_SESSAO);
      return null;
    }
    return { ...s, usuario: u.usuario, nome: u.nome, perfil: u.perfil, vinculo_id: u.vinculo_id };
  } catch {
    sessionStorage.removeItem(KEY_SESSAO);
    return null;
  }
}

export function encerrarSessao(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY_SESSAO);
  window.dispatchEvent(new Event(EVENTO_AUTH_ATUALIZADO));
}

/** ADMIN acessa todos os portais; os demais perfis só o seu. */
export function podeAcessar(sessao: SessaoUsuario | null, destino: PerfilUsuario): boolean {
  if (!sessao) return false;
  return sessao.perfil === 'ADMIN' || sessao.perfil === destino;
}

function exigirAdmin(): SessaoUsuario {
  const s = obterSessao();
  if (!s || s.perfil !== 'ADMIN') throw new Error('Apenas administradores podem gerenciar usuários.');
  return s;
}

// ---------- API pública ----------

export function existemUsuarios(): boolean {
  return lerUsuarios().length > 0;
}

/** Primeiro acesso: só funciona quando não há nenhum usuário cadastrado. Já inicia a sessão. */
export async function criarPrimeiroAdministrador(usuario: string, senha: string, nome?: string): Promise<SessaoUsuario> {
  if (existemUsuarios()) throw new Error('O administrador inicial já foi criado.');
  validarSenha(senha);
  const u = validarNomeUsuario(usuario, []);
  const cred = await gerarCredencial(senha);
  if (existemUsuarios()) throw new Error('O administrador inicial já foi criado.');
  const novo: UsuarioArmazenado = {
    id: gerarId(),
    usuario: u,
    nome: (nome || '').trim() || u,
    perfil: 'ADMIN',
    ativo: true,
    criado_em: new Date().toISOString(),
    ...cred,
  };
  gravarUsuarios([novo]);
  return gravarSessao(novo);
}

export type ResultadoLogin = { ok: true; sessao: SessaoUsuario } | { ok: false; erro: string };

export async function autenticar(usuario: string, senha: string): Promise<ResultadoLogin> {
  const u = normalizarUsuario(usuario);
  const restante = bloqueioRestanteMs(u);
  if (restante > 0) {
    const min = Math.ceil(restante / 60000);
    return { ok: false, erro: `Muitas tentativas inválidas. Tente novamente em ${min} minuto(s).` };
  }

  const registro = lerUsuarios().find(x => x.usuario === u);
  // Calcula o hash mesmo se o usuário não existir, para não revelar quais usuários existem pelo tempo de resposta
  const salt = registro ? deBase64(registro.senha_salt) : crypto.getRandomValues(new Uint8Array(16));
  const iter = registro?.senha_iteracoes || ITERACOES_PBKDF2;
  const hash = await derivarHash(senha, salt, iter);

  if (!registro || !registro.ativo || !comparacaoConstante(hash, registro.senha_hash)) {
    registrarFalha(u);
    return { ok: false, erro: ERRO_GENERICO };
  }

  limparFalhas(u);
  return { ok: true, sessao: gravarSessao(registro) };
}

export function listarUsuarios(): UsuarioSistema[] {
  return lerUsuarios().map(publico);
}

function contarAdminsAtivos(lista: UsuarioArmazenado[]): number {
  return lista.filter(u => u.perfil === 'ADMIN' && u.ativo).length;
}

export async function criarUsuario(dados: {
  usuario: string;
  nome: string;
  perfil: PerfilUsuario;
  vinculo_id?: string;
  senha: string;
  ativo?: boolean;
}): Promise<UsuarioSistema> {
  exigirAdmin();
  validarSenha(dados.senha);
  const lista = lerUsuarios();
  const u = validarNomeUsuario(dados.usuario, lista);
  const cred = await gerarCredencial(dados.senha);
  const novo: UsuarioArmazenado = {
    id: gerarId(),
    usuario: u,
    nome: dados.nome.trim() || u,
    perfil: dados.perfil,
    vinculo_id: dados.vinculo_id || undefined,
    ativo: dados.ativo ?? true,
    criado_em: new Date().toISOString(),
    ...cred,
  };
  gravarUsuarios([...lerUsuarios(), novo]);
  return publico(novo);
}

export function atualizarUsuario(
  id: string,
  dados: Partial<Pick<UsuarioSistema, 'usuario' | 'nome' | 'perfil' | 'vinculo_id' | 'ativo'>>
): UsuarioSistema {
  exigirAdmin();
  const lista = lerUsuarios();
  const idx = lista.findIndex(u => u.id === id);
  if (idx < 0) throw new Error('Usuário não encontrado.');
  const atual = lista[idx];
  const atualizado: UsuarioArmazenado = {
    ...atual,
    // Login sem alteração não é revalidado (preserva logins antigos fora da regra atual)
    usuario: dados.usuario !== undefined && normalizarUsuario(dados.usuario) !== atual.usuario
      ? validarNomeUsuario(dados.usuario, lista, id)
      : atual.usuario,
    nome: dados.nome !== undefined ? (dados.nome.trim() || atual.usuario) : atual.nome,
    perfil: dados.perfil ?? atual.perfil,
    vinculo_id: dados.vinculo_id !== undefined ? (dados.vinculo_id || undefined) : atual.vinculo_id,
    ativo: dados.ativo ?? atual.ativo,
  };
  const nova = [...lista];
  nova[idx] = atualizado;
  if (contarAdminsAtivos(lista) > 0 && contarAdminsAtivos(nova) === 0) {
    throw new Error('Não é possível remover ou desativar o último administrador ativo.');
  }
  gravarUsuarios(nova);
  return publico(atualizado);
}

export async function redefinirSenha(id: string, novaSenha: string): Promise<void> {
  exigirAdmin();
  validarSenha(novaSenha);
  const cred = await gerarCredencial(novaSenha);
  const lista = lerUsuarios();
  const idx = lista.findIndex(u => u.id === id);
  if (idx < 0) throw new Error('Usuário não encontrado.');
  lista[idx] = { ...lista[idx], ...cred };
  gravarUsuarios(lista);
  limparFalhas(lista[idx].usuario);
}

export function excluirUsuario(id: string): void {
  const sessao = exigirAdmin();
  const lista = lerUsuarios();
  const nova = lista.filter(u => u.id !== id);
  if (nova.length === lista.length) throw new Error('Usuário não encontrado.');
  if (contarAdminsAtivos(nova) === 0) {
    throw new Error('Não é possível remover ou desativar o último administrador ativo.');
  }
  gravarUsuarios(nova);
  if (sessao.usuario_id === id) encerrarSessao();
}
