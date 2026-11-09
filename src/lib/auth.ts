// Autenticação do Grupo ENO.
// Com o Supabase configurado: login pelo Supabase Auth; perfil e vínculo vêm da tabela perfis;
// criar/alterar/excluir usuários passa pela função do servidor (api/usuarios).
// Sem o Supabase (modo antigo, abaixo): autenticação local no navegador.
//
// - Usuários em localStorage ('grupo_eno_auth_usuarios_v1') com senha em hash PBKDF2-SHA256 + salt aleatório.
// - Sessão em sessionStorage ('grupo_eno_auth_sessao_v1'), válida por 8 horas.
// - Bloqueio de 5 tentativas erradas por 5 minutos.
// Observação: por ser 100% local, quem tem acesso ao navegador com ferramentas de desenvolvedor
// consegue alterar os dados. Quando houver servidor, a autenticação deve ser feita no backend.

import { MODO_NUVEM, supabase, definirLembrarAcesso } from './supabase';
import { envioJaFeitoNeste, existemDadosParaEnviar, enviarDadosDesteNavegador } from './bancoEnvio';
import { iniciarSincronizacaoBanco, pararSincronizacaoBanco, liberarEnvioBanco, enviarPendentesAgora, limparDadosLocais, semPendencias } from './sincronizacao';

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
  if (MODO_NUVEM) return validarNomeUsuario(usuario, usuariosNuvem as UsuarioArmazenado[], ignorarId);
  return validarNomeUsuario(usuario, lerUsuarios(), ignorarId);
}

/** Usuário vinculado a um cadastro (ex.: RCA ou cliente) com o perfil indicado. */
export function obterUsuarioPorVinculo(perfil: PerfilUsuario, vinculoId?: string | null): UsuarioSistema | undefined {
  if (!vinculoId) return undefined;
  if (MODO_NUVEM) return usuariosNuvem.find(x => x.perfil === perfil && x.vinculo_id === vinculoId);
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
  if (MODO_NUVEM) return sessaoNuvem;
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
  if (MODO_NUVEM) {
    sessaoNuvem = null;
    // Ao sair, não deixa dados do sistema guardados no navegador (se houver algo pendente, fica)
    if (semPendencias()) limparDadosLocais();
    supabase?.auth.signOut().catch(() => {});
    window.dispatchEvent(new Event(EVENTO_AUTH_ATUALIZADO));
    return;
  }
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
  if (MODO_NUVEM) return true; // na nuvem, use verificarPrimeiroAcesso()
  return lerUsuarios().length > 0;
}

/** true quando ainda não existe nenhum administrador (tela de primeiro acesso). */
export async function verificarPrimeiroAcesso(): Promise<boolean> {
  if (!MODO_NUVEM) return !existemUsuarios();
  try {
    const r = await chamarApi({ acao: 'estado' }, false);
    return !r.temAdmin;
  } catch {
    return false;
  }
}

/** Primeiro acesso: só funciona quando não há nenhum usuário cadastrado. Já inicia a sessão. */
export async function criarPrimeiroAdministrador(usuario: string, senha: string, nome?: string): Promise<SessaoUsuario> {
  if (MODO_NUVEM) {
    validarSenha(senha);
    const login = validarNomeUsuario(usuario, []);
    await chamarApi({ acao: 'primeiro_admin', usuario: login, senha, nome: (nome || '').trim() || login }, false);
    const r = await autenticar(login, senha);
    if (r.ok === false) throw new Error(r.erro);
    return r.sessao;
  }
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

export async function autenticar(usuario: string, senha: string, lembrar = true): Promise<ResultadoLogin> {
  if (MODO_NUVEM) return autenticarNuvem(usuario, senha, lembrar);
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
  if (MODO_NUVEM) return [...usuariosNuvem];
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
  if (MODO_NUVEM) {
    const usuario = validarNomeUsuario(dados.usuario, usuariosNuvem as UsuarioArmazenado[]);
    const r = await chamarApi({ acao: 'criar', ...dados, usuario });
    return r.usuario as UsuarioSistema;
  }
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

export async function atualizarUsuario(
  id: string,
  dados: Partial<Pick<UsuarioSistema, 'usuario' | 'nome' | 'perfil' | 'vinculo_id' | 'ativo'>>
): Promise<UsuarioSistema> {
  exigirAdmin();
  if (MODO_NUVEM) {
    const atual = usuariosNuvem.find(u => u.id === id);
    const usuario = dados.usuario !== undefined && atual && normalizarUsuario(dados.usuario) !== atual.usuario
      ? validarNomeUsuario(dados.usuario, usuariosNuvem as UsuarioArmazenado[], id)
      : undefined;
    const r = await chamarApi({ acao: 'atualizar', id, ...dados, usuario });
    return r.usuario as UsuarioSistema;
  }
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
  if (MODO_NUVEM) {
    await chamarApi({ acao: 'senha', id, senha: novaSenha });
    return;
  }
  const cred = await gerarCredencial(novaSenha);
  const lista = lerUsuarios();
  const idx = lista.findIndex(u => u.id === id);
  if (idx < 0) throw new Error('Usuário não encontrado.');
  lista[idx] = { ...lista[idx], ...cred };
  gravarUsuarios(lista);
  limparFalhas(lista[idx].usuario);
}

export async function excluirUsuario(id: string): Promise<void> {
  const sessao = exigirAdmin();
  if (MODO_NUVEM) {
    await chamarApi({ acao: 'excluir', id });
    if (sessao.usuario_id === id) encerrarSessao();
    return;
  }
  const lista = lerUsuarios();
  const nova = lista.filter(u => u.id !== id);
  if (nova.length === lista.length) throw new Error('Usuário não encontrado.');
  if (contarAdminsAtivos(nova) === 0) {
    throw new Error('Não é possível remover ou desativar o último administrador ativo.');
  }
  gravarUsuarios(nova);
  if (sessao.usuario_id === id) encerrarSessao();
}

// ---------- banco (Supabase Auth) ----------
// Cada usuário tem uma conta no Supabase Auth com um e-mail interno (usuario@usuarios.grupoeno.app),
// e o perfil fica na tabela perfis. O usuário digita só o nome de usuário; o e-mail é montado.

let sessaoNuvem: SessaoUsuario | null = null;
let usuariosNuvem: UsuarioSistema[] = [];
let carregandoNuvem = false;
export const EVENTO_NUVEM_CARREGANDO = 'grupo_eno_nuvem_carregando';

/** E-mail usado no Supabase para o login: o próprio e-mail, ou usuario@usuarios.grupoeno.app. */
export function emailDoLogin(usuario: string): string {
  const u = normalizarUsuario(usuario);
  return u.includes('@') ? u : `${u}@usuarios.grupoeno.app`;
}

/** Entrou e os dados do perfil ainda estão chegando. */
export function nuvemCarregando(): boolean {
  return carregandoNuvem;
}

function avisarMudanca(): void {
  window.dispatchEvent(new Event(EVENTO_AUTH_ATUALIZADO));
  window.dispatchEvent(new Event(EVENTO_NUVEM_CARREGANDO));
}

/** Chama a função do servidor (api/usuarios), com o token de quem está logado. */
async function chamarApi(corpo: Record<string, unknown>, comLogin = true): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (comLogin) {
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre de novo.');
    headers.Authorization = `Bearer ${token}`;
  }
  let r: Response;
  try {
    r = await fetch('/api/usuarios', { method: 'POST', headers, body: JSON.stringify(corpo) });
  } catch {
    throw new Error('Sem conexão com o servidor. Confira a internet.');
  }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.erro || 'Não foi possível concluir a operação no servidor.');
  return json;
}

/** Lê o perfil de quem está logado. null = conta sem perfil ou desativada. */
async function carregarPerfil(uid: string): Promise<SessaoUsuario | null> {
  const { data, error } = await supabase!.from('perfis').select('*').eq('id', uid).maybeSingle();
  if (error || !data || !data.ativo) return null;
  return {
    usuario_id: uid,
    usuario: String(data.usuario),
    nome: String(data.nome || data.usuario),
    perfil: data.perfil as PerfilUsuario,
    vinculo_id: data.vinculo_id || undefined,
    expira_em: Date.now() + DURACAO_SESSAO_MS,
  };
}

async function carregarUsuariosAdmin(): Promise<void> {
  const { data } = await supabase!.from('perfis').select('*').order('criado_em', { ascending: false });
  usuariosNuvem = (data || []).map(x => ({
    id: String(x.id),
    usuario: String(x.usuario),
    nome: String(x.nome || ''),
    perfil: x.perfil as PerfilUsuario,
    vinculo_id: x.vinculo_id || undefined,
    ativo: x.ativo !== false,
    criado_em: String(x.criado_em || ''),
  }));
}

/**
 * Na primeira entrada do administrador com o banco ligado, pergunta se pode enviar
 * os dados que estão neste navegador. Não apaga nada daqui.
 */
async function perguntarEnvioInicial(): Promise<void> {
  if (envioJaFeitoNeste() || !existemDadosParaEnviar()) return;
  if (sessionStorage.getItem('eno_envio_recusado')) return;
  const enviar = window.confirm(
    'Este computador tem dados guardados que ainda não estão no banco de dados.\n\n' +
    'Enviar agora?\n\n' +
    '(Nada é apagado daqui. Se cancelar, pergunto de novo na próxima vez que entrar.)'
  );
  if (!enviar) {
    sessionStorage.setItem('eno_envio_recusado', '1');
    return;
  }
  const r = await enviarDadosDesteNavegador();
  if (r.erros.length === 0) liberarEnvioBanco();
  window.alert(
    r.erros.length
      ? 'Envio com problemas:\n\n' + r.erros.join('\n') + '\n\nTente de novo ou me avise.'
      : `Envio concluído: ${r.linhas} registros em ${r.tabelas} tabelas.`
  );
}

/** Liga o login do banco (chamar uma vez ao abrir o app). */
export function iniciarAuthNuvem(): void {
  if (!MODO_NUVEM || !supabase) return;
  carregandoNuvem = true;
  avisarMudanca();

  const aplicar = async (uid: string | null) => {
    try {
      if (!uid) {
        sessaoNuvem = null;
        usuariosNuvem = [];
        pararSincronizacaoBanco();
        return;
      }
      const s = await carregarPerfil(uid);
      if (!s) {
        await supabase!.auth.signOut();
        sessaoNuvem = null;
        usuariosNuvem = [];
        window.alert('Usuário sem acesso liberado. Fale com o administrador.');
        return;
      }
      sessaoNuvem = s;
      if (s.perfil === 'ADMIN') {
        await carregarUsuariosAdmin();
        await perguntarEnvioInicial();
      }
      // Sincronização automática. Enquanto o administrador não respondeu o envio inicial, ela espera,
      // para nada subir sem a pergunta.
      const esperaDecisao = s.perfil === 'ADMIN' && existemDadosParaEnviar() && !envioJaFeitoNeste();
      // Ao entrar: envia o que estiver pendente e limpa o navegador; depois o banco preenche tudo.
      // Se o administrador ainda não respondeu o envio inicial, nada é apagado.
      if (!esperaDecisao && (await enviarPendentesAgora())) limparDadosLocais();
      await iniciarSincronizacaoBanco({ somenteBuscar: esperaDecisao });
    } finally {
      carregandoNuvem = false;
      avisarMudanca();
    }
  };

  // Chamado ao abrir a página (sessão guardada) e a cada entrada/saída
  supabase.auth.onAuthStateChange((_evento, session) => {
    // Fora do retorno do evento, para não travar o cliente do Supabase
    window.setTimeout(() => { aplicar(session?.user?.id ?? null); }, 0);
  });
}

const MENSAGENS_LOGIN: Record<string, string> = {
  'Invalid login credentials': ERRO_GENERICO,
  'Email not confirmed': 'Conta sem confirmação. Fale com o administrador.',
};

async function autenticarNuvem(usuario: string, senha: string, lembrar = true): Promise<ResultadoLogin> {
  definirLembrarAcesso(lembrar);
  const { data, error } = await supabase!.auth.signInWithPassword({ email: emailDoLogin(usuario), password: senha });
  if (error || !data.user) {
    const msg = error?.message || '';
    if (/rate|too many/i.test(msg)) return { ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' };
    if (/network|fetch/i.test(msg)) return { ok: false, erro: 'Sem conexão com a internet.' };
    return { ok: false, erro: MENSAGENS_LOGIN[msg] || ERRO_GENERICO };
  }
  const s = await carregarPerfil(data.user.id);
  if (!s) {
    await supabase!.auth.signOut();
    return { ok: false, erro: 'Usuário sem acesso liberado. Fale com o administrador.' };
  }
  sessaoNuvem = s;
  if (s.perfil === 'ADMIN') await carregarUsuariosAdmin();
  avisarMudanca();
  return { ok: true, sessao: s };
}

/**
 * Manda o link para criar uma senha nova. Só funciona para login feito com e-mail real.
 * A resposta é sempre a mesma, para não revelar quais contas existem.
 */
export async function enviarRedefinicaoSenha(usuario: string): Promise<{ ok: boolean; erro?: string }> {
  if (!MODO_NUVEM || !supabase) return { ok: false, erro: 'Recuperação de senha disponível só com o banco ligado.' };
  const u = normalizarUsuario(usuario);
  if (!RE_EMAIL.test(u)) {
    return { ok: false, erro: 'Digite o e-mail de acesso (o mesmo usado para entrar) para receber o link.' };
  }
  await supabase.auth.resetPasswordForEmail(u, { redirectTo: window.location.origin });
  return { ok: true };
}
