// Função do servidor (Vercel) que gerencia os usuários do sistema no Firebase.
// Só ela cria contas, troca senha, muda perfil e exclui: o navegador não tem esse poder.
// Credencial: variável FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço) ou o arquivo
// firebase-admin.json na raiz do projeto (só no computador; fora do Git).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
// Identificação do projeto e do banco (não é segredo; a chave de acesso fica na variável FIREBASE_SERVICE_ACCOUNT)
const config = {
  projectId: 'gen-lang-client-0964317826',
  firestoreDatabaseId: 'ai-studio-grupoeno-f6438af8-17df-4089-9c1f-fe6ed3a0c8e1',
};

type Perfil = 'ADMIN' | 'AGRICULTOR' | 'RCA' | 'PROVISORIO' | 'PRODUCAO' | 'SITIO' | 'CLIENTE';
const PERFIS: Perfil[] = ['ADMIN', 'AGRICULTOR', 'RCA', 'PROVISORIO', 'PRODUCAO', 'SITIO', 'CLIENTE'];
const SENHA_MINIMA = 6;

class ErroUso extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

function credencial(): ServiceAccount {
  const env = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (env) return JSON.parse(env);
  const arquivo = join(process.cwd(), 'firebase-admin.json');
  if (existsSync(arquivo)) return JSON.parse(readFileSync(arquivo, 'utf8'));
  throw new ErroUso('Credencial do Firebase não configurada no servidor (FIREBASE_SERVICE_ACCOUNT ou firebase-admin.json).', 503);
}

function servicos() {
  const app = getApps()[0] || initializeApp({ credential: cert(credencial()), projectId: config.projectId });
  return { auth: getAuth(app), db: getFirestore(app, config.firestoreDatabaseId || '(default)') };
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

async function loginEmUso(db: FirebaseFirestore.Firestore, usuario: string, ignorarUid?: string) {
  const q = await db.collection('usuarios').where('usuario', '==', usuario).get();
  if (q.docs.some(d => d.id !== ignorarUid)) throw new ErroUso('Já existe um usuário com esse login.');
}

async function adminsAtivos(db: FirebaseFirestore.Firestore) {
  const q = await db.collection('usuarios').where('perfil', '==', 'ADMIN').get();
  return q.docs.filter(d => d.data().ativo !== false).map(d => d.id);
}

function publico(uid: string, d: Record<string, any>) {
  return { id: uid, usuario: d.usuario, nome: d.nome, perfil: d.perfil, vinculo_id: d.vinculo_id || undefined, ativo: d.ativo !== false, criado_em: d.criado_em };
}

async function executar(corpo: any, tokenCabecalho?: string) {
  const { auth, db } = servicos();
  const acao = String(corpo?.acao || '');
  const estadoRef = db.collection('sistema').doc('estado');

  if (acao === 'estado') {
    return { temAdmin: !!(await estadoRef.get()).data()?.temAdmin };
  }

  if (acao === 'primeiro_admin') {
    const usuario = validarLogin(corpo.usuario);
    const senha = validarSenha(corpo.senha);
    const nome = String(corpo.nome || usuario).trim() || usuario;
    // Reserva a vaga de primeiro administrador antes de criar a conta (evita dois "primeiros")
    await db.runTransaction(async t => {
      const est = await t.get(estadoRef);
      if (est.data()?.temAdmin) throw new ErroUso('O administrador inicial já foi criado.', 409);
      t.set(estadoRef, { temAdmin: true, em: FieldValue.serverTimestamp() }, { merge: true });
    });
    try {
      const u = await auth.createUser({ email: emailDoLogin(usuario), password: senha, displayName: nome });
      await auth.setCustomUserClaims(u.uid, { perfil: 'ADMIN' });
      await db.collection('usuarios').doc(u.uid).set({ usuario, nome, perfil: 'ADMIN', ativo: true, criado_em: new Date().toISOString() });
    } catch (e) {
      await estadoRef.set({ temAdmin: false }, { merge: true });
      throw e;
    }
    return { ok: true };
  }

  // Daqui para baixo: só administrador logado
  const token = (tokenCabecalho || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new ErroUso('Entre no sistema para continuar.', 401);
  const quem = await auth.verifyIdToken(token, true).catch(() => null);
  if (!quem) throw new ErroUso('Sessão expirada. Entre de novo.', 401);
  const quemDoc = (await db.collection('usuarios').doc(quem.uid).get()).data();
  if (quem.perfil !== 'ADMIN' || !quemDoc || quemDoc.ativo === false) throw new ErroUso('Apenas administradores podem gerenciar usuários.', 403);

  if (acao === 'criar') {
    const usuario = validarLogin(corpo.usuario);
    const senha = validarSenha(corpo.senha);
    const perfil = validarPerfil(corpo.perfil);
    const nome = String(corpo.nome || usuario).trim() || usuario;
    const vinculo_id = corpo.vinculo_id ? String(corpo.vinculo_id) : '';
    const ativo = corpo.ativo !== false;
    await loginEmUso(db, usuario);
    const u = await auth.createUser({ email: emailDoLogin(usuario), password: senha, displayName: nome, disabled: !ativo }).catch((e: any) => {
      if (String(e?.code).includes('email-already-exists')) throw new ErroUso('Já existe uma conta com esse login.');
      throw e;
    });
    await auth.setCustomUserClaims(u.uid, { perfil, ...(vinculo_id ? { vinculo_id } : {}) });
    const dados = { usuario, nome, perfil, vinculo_id: vinculo_id || null, ativo, criado_em: new Date().toISOString() };
    await db.collection('usuarios').doc(u.uid).set(dados);
    return { usuario: publico(u.uid, dados) };
  }

  const uid = String(corpo.id || '');
  const ref = db.collection('usuarios').doc(uid);
  const atual = (await ref.get()).data();
  if (!uid || !atual) throw new ErroUso('Usuário não encontrado.', 404);

  if (acao === 'atualizar') {
    const novo = { ...atual };
    if (corpo.usuario !== undefined && corpo.usuario !== null) {
      const usuario = validarLogin(corpo.usuario);
      if (usuario !== atual.usuario) {
        await loginEmUso(db, usuario, uid);
        await auth.updateUser(uid, { email: emailDoLogin(usuario) });
        novo.usuario = usuario;
      }
    }
    if (corpo.nome !== undefined) novo.nome = String(corpo.nome || '').trim() || novo.usuario;
    if (corpo.perfil !== undefined) novo.perfil = validarPerfil(corpo.perfil);
    if (corpo.vinculo_id !== undefined) novo.vinculo_id = corpo.vinculo_id ? String(corpo.vinculo_id) : null;
    if (corpo.ativo !== undefined) novo.ativo = corpo.ativo !== false;
    if (atual.perfil === 'ADMIN' && (novo.perfil !== 'ADMIN' || !novo.ativo)) {
      const ativos = await adminsAtivos(db);
      if (ativos.filter(id => id !== uid).length === 0) throw new ErroUso('Não é possível remover ou desativar o último administrador ativo.');
    }
    await auth.updateUser(uid, { displayName: novo.nome, disabled: !novo.ativo });
    await auth.setCustomUserClaims(uid, { perfil: novo.perfil, ...(novo.vinculo_id ? { vinculo_id: novo.vinculo_id } : {}) });
    // Mudou perfil, vínculo ou foi desativado: derruba as sessões abertas desse usuário
    if (novo.perfil !== atual.perfil || novo.vinculo_id !== atual.vinculo_id || !novo.ativo) await auth.revokeRefreshTokens(uid);
    await ref.set(novo);
    return { usuario: publico(uid, novo) };
  }

  if (acao === 'senha') {
    await auth.updateUser(uid, { password: validarSenha(corpo.senha) });
    await auth.revokeRefreshTokens(uid);
    return { ok: true };
  }

  if (acao === 'excluir') {
    if (atual.perfil === 'ADMIN') {
      const ativos = await adminsAtivos(db);
      if (ativos.filter(id => id !== uid).length === 0) throw new ErroUso('Não é possível remover ou desativar o último administrador ativo.');
    }
    await auth.deleteUser(uid).catch((e: any) => { if (!String(e?.code).includes('user-not-found')) throw e; });
    await ref.delete();
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
