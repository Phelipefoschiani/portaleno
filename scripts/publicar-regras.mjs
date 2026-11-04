// Publica o firestore.rules no banco do Grupo ENO, usando a chave do servidor (firebase-admin.json).
// Uso: node scripts/publicar-regras.mjs
import { readFileSync } from 'node:fs';
import { cert } from 'firebase-admin/app';

const config = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const conta = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : JSON.parse(readFileSync('firebase-admin.json', 'utf8'));
const projeto = config.projectId;
const banco = config.firestoreDatabaseId || '(default)';
const fonte = readFileSync('firestore.rules', 'utf8');

const { access_token } = await cert(conta).getAccessToken();
const api = `https://firebaserules.googleapis.com/v1/projects/${projeto}`;
const chamar = async (url, metodo, corpo) => {
  const r = await fetch(url, { method: metodo, headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
};

// 1. Cria o conjunto de regras (a API valida e devolve os erros de sintaxe)
const rs = await chamar(`${api}/rulesets`, 'POST', { source: { files: [{ name: 'firestore.rules', content: fonte }] } });
if (!rs.ok) {
  console.error('Regras recusadas:', JSON.stringify(rs.j, null, 2));
  process.exit(1);
}
const rulesetName = rs.j.name;

// 2. Aponta o banco para as regras novas
const nomeRelease = `projects/${projeto}/releases/cloud.firestore/${banco}`;
let rel = await chamar(`https://firebaserules.googleapis.com/v1/${nomeRelease}`, 'PATCH', { release: { name: nomeRelease, rulesetName } });
if (rel.status === 404) rel = await chamar(`${api}/releases`, 'POST', { name: nomeRelease, rulesetName });
if (!rel.ok) {
  console.error('Não foi possível publicar:', JSON.stringify(rel.j, null, 2));
  process.exit(1);
}
console.log(`Regras publicadas no banco "${banco}" (${rulesetName}).`);
