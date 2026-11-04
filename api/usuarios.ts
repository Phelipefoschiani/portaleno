// Função do servidor (Vercel) que gerencia os usuários no Supabase.
// Só ela cria contas, troca senha, muda perfil e exclui: o navegador não tem esse poder.
// Variáveis na Vercel: SUPABASE_URL e SUPABASE_SECRET_KEY (a chave secreta fica só aqui).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Perfil = 'ADMIN' | 'AGRICULTOR' | 'RCA' | 'PROVISORIO' | 'PRODUCAO' | 'SITIO' | 'CLIENTE';
const PERFIS: Perfil[] = ['ADMIN', 'AGRICULTOR', 'RCA', 'PROVISORIO', 'PRODUCAO', 'SITIO', 'CLIENTE'];
const SENHA_MINIMA = 6;

class ErroUso extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

function servidor(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) throw new ErroUso('Banco de dados não configurado no servidor (SUPABASE_URL e SUPABASE_SECRET_KEY).', 503);
  return createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });
}

const RE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
function validarLogin(usuario: unknown): string {
  const u = String(usuario || '').trim().toLowerCase();
  if (u.length < 3) throw new ErroUso('O usuário deve ter no mínimo 3 caracteres.');
  if (u.includes('@') ? !RE_EMAIL.test(u) : !/^[a-z0-9._-]+$/.test(u)) {
    throw new ErroUso('Use apenas letras, números, ponto, hífen ou sublinhado no usuário (ou um e-mail válido).');
  }
  return u;
}
const emailDoLogin = (u: string) => (u.includes('@') ? u : `${u}@usuarios.grupoeno.app`);
function validarSenha(senha: unknown): string {
  const s = String(senha || '');
  if (s.length < SENHA_MINIMA) throw new ErroUso(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`);
  return s;
}
function validarPerfil(p: unknown): Perfil {
  if (!PERFIS.includes(p as Perfil)) throw new ErroUso('Perfil inválido.');
  return p as Perfil;
}

async function loginEmUso(db: SupabaseClient, usuario: string, ignorarId?: string) {
  const { data } = await db.from('perfis').select('id').eq('usuario', usuario);
  if ((data || []).some(r => r.id !== ignorarId)) throw new ErroUso('Já existe um usuário com esse login.');
}

async function contarAdminsAtivos(db: SupabaseClient, exceto?: string): Promise<number> {
  const { data } = await db.from('perfis').select('id').eq('perfil', 'ADMIN').eq('ativo', true);
  return (data || []).filter(r => r.id !== exceto).length;
}

function publico(p: Record<string, any>) {
  return { id: p.id, usuario: p.usuario, nome: p.nome, perfil: p.perfil, vinculo_id: p.vinculo_id || undefined, ativo: p.ativo !== false, criado_em: p.criado_em };
}

async function exigirAdmin(db: SupabaseClient, token: string): Promise<void> {
  if (!token) throw new ErroUso('Entre no sistema para continuar.', 401);
  const { data: u, error } = await db.auth.getUser(token);
  if (error || !u.user) throw new ErroUso('Sessão expirada. Entre de novo.', 401);
  const { data: p } = await db.from('perfis').select('perfil, ativo').eq('id', u.user.id).maybeSingle();
  if (!p || p.perfil !== 'ADMIN' || p.ativo === false) throw new ErroUso('Apenas administradores podem gerenciar usuários.', 403);
}

async function executar(corpo: any, authorization?: string) {
  const db = servidor();
  const acao = String(corpo?.acao || '');

  if (acao === 'estado') {
    const { data } = await db.from('perfis').select('id').eq('perfil', 'ADMIN').limit(1);
    return { temAdmin: (data || []).length > 0 };
  }

  if (acao === 'primeiro_admin') {
    const usuario = validarLogin(corpo.usuario);
    const senha = validarSenha(corpo.senha);
    const nome = String(corpo.nome || usuario).trim() || usuario;
    const { data: existe } = await db.from('perfis').select('id').eq('perfil', 'ADMIN').limit(1);
    if ((existe || []).length > 0) throw new ErroUso('O administrador inicial já foi criado.', 409);
    const { data: criado, error } = await db.auth.admin.createUser({ email: emailDoLogin(usuario), password: senha, email_confirm: true, user_metadata: { nome } });
    if (error || !criado.user) throw new ErroUso(error?.message || 'Não foi possível criar o administrador.');
    const { error: erroPerfil } = await db.from('perfis').insert({ id: criado.user.id, usuario, nome, perfil: 'ADMIN', ativo: true });
    if (erroPerfil) {
      await db.auth.admin.deleteUser(criado.user.id);
      throw new ErroUso(erroPerfil.message);
    }
    return { ok: true };
  }

  // Daqui para baixo: só administrador logado
  await exigirAdmin(db, String(authorization || '').replace(/^Bearer\s+/i, ''));

  if (acao === 'criar') {
    const usuario = validarLogin(corpo.usuario);
    const senha = validarSenha(corpo.senha);
    const perfil = validarPerfil(corpo.perfil);
    const nome = String(corpo.nome || usuario).trim() || usuario;
    const vinculo_id = corpo.vinculo_id ? String(corpo.vinculo_id) : null;
    const ativo = corpo.ativo !== false;
    await loginEmUso(db, usuario);
    const { data: criado, error } = await db.auth.admin.createUser({ email: emailDoLogin(usuario), password: senha, email_confirm: true, user_metadata: { nome } });
    if (error || !criado.user) {
      if (/already|registered|exists/i.test(error?.message || '')) throw new ErroUso('Já existe uma conta com esse login.');
      throw new ErroUso(error?.message || 'Não foi possível criar o usuário.');
    }
    if (!ativo) await db.auth.admin.updateUserById(criado.user.id, { ban_duration: '876000h' });
    const { data: gravado, error: erroPerfil } = await db.from('perfis')
      .insert({ id: criado.user.id, usuario, nome, perfil, vinculo_id, ativo })
      .select('*').single();
    if (erroPerfil) {
      await db.auth.admin.deleteUser(criado.user.id);
      throw new ErroUso(erroPerfil.message);
    }
    return { usuario: publico(gravado) };
  }

  const id = String(corpo.id || '');
  const { data: atual } = await db.from('perfis').select('*').eq('id', id).maybeSingle();
  if (!id || !atual) throw new ErroUso('Usuário não encontrado.', 404);

  if (acao === 'atualizar') {
    const novo: Record<string, any> = { ...atual };
    if (corpo.usuario !== undefined && corpo.usuario !== null) {
      const usuario = validarLogin(corpo.usuario);
      if (usuario !== atual.usuario) {
        await loginEmUso(db, usuario, id);
        const { error } = await db.auth.admin.updateUserById(id, { email: emailDoLogin(usuario) });
        if (error) throw new ErroUso(error.message);
        novo.usuario = usuario;
      }
    }
    if (corpo.nome !== undefined) novo.nome = String(corpo.nome || '').trim() || novo.usuario;
    if (corpo.perfil !== undefined) novo.perfil = validarPerfil(corpo.perfil);
    if (corpo.vinculo_id !== undefined) novo.vinculo_id = corpo.vinculo_id ? String(corpo.vinculo_id) : null;
    if (corpo.ativo !== undefined) novo.ativo = corpo.ativo !== false;
    if (atual.perfil === 'ADMIN' && (novo.perfil !== 'ADMIN' || !novo.ativo)) {
      if ((await contarAdminsAtivos(db, id)) === 0) throw new ErroUso('Não é possível remover ou desativar o último administrador ativo.');
    }
    // Desativar bloqueia o login da conta; ativar libera de novo
    const { error: erroAuth } = await db.auth.admin.updateUserById(id, { ban_duration: novo.ativo ? 'none' : '876000h' });
    if (erroAuth) throw new ErroUso(erroAuth.message);
    const { data: gravado, error } = await db.from('perfis')
      .update({ usuario: novo.usuario, nome: novo.nome, perfil: novo.perfil, vinculo_id: novo.vinculo_id, ativo: novo.ativo })
      .eq('id', id).select('*').single();
    if (error) throw new ErroUso(error.message);
    return { usuario: publico(gravado) };
  }

  if (acao === 'senha') {
    const { error } = await db.auth.admin.updateUserById(id, { password: validarSenha(corpo.senha) });
    if (error) throw new ErroUso(error.message);
    return { ok: true };
  }

  if (acao === 'excluir') {
    if (atual.perfil === 'ADMIN' && (await contarAdminsAtivos(db, id)) === 0) {
      throw new ErroUso('Não é possível remover ou desativar o último administrador ativo.');
    }
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) throw new ErroUso(error.message);
    await db.from('perfis').delete().eq('id', id);
    return { ok: true };
  }

  throw new ErroUso('Ação desconhecida.');
}

// Formato das funções da Vercel (req/res do Node)
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Use POST.' });
    return;
  }
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const resultado = await executar(corpo, req.headers?.authorization);
    res.status(200).json(resultado);
  } catch (e: any) {
    const status = e instanceof ErroUso ? e.status : 500;
    if (status === 500) console.error('[api/usuarios]', e);
    res.status(status).json({ erro: e instanceof ErroUso ? e.message : 'Erro no servidor ao gerenciar usuários.' });
  }
}
