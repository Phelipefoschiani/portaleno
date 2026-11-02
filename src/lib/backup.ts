// Backup em arquivo (.json) de todos os dados do sistema guardados no navegador.
// Inclui todas as chaves 'grupo_eno_*' EXCETO 'grupo_eno_auth_*' (usuários, senhas e sessão).
// A restauração substitui os dados atuais e a página é recarregada em seguida.

import {
  listarChavesDeDados,
  ehChaveDeDados,
  ehFlagDeControle,
  marcarLimpezaInicialConcluida,
  KEY_ULTIMO_BACKUP
} from '../data/sistemaReset';
import { hojeISO, parseData } from './datas';

const ASSINATURA_BACKUP = 'grupo-eno-backup';
const VERSAO_BACKUP = 1;
export const DIAS_LEMBRETE_BACKUP = 7;

export interface ArquivoBackup {
  sistema: typeof ASSINATURA_BACKUP;
  versao: number;
  gerado_em: string; // ISO
  total_chaves: number;
  chaves: Record<string, string>; // valor bruto exatamente como está no localStorage
}

/** Data (ISO) do último backup baixado neste navegador, ou null. */
export function obterDataUltimoBackup(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_ULTIMO_BACKUP);
}

/** Dias desde o último backup (null se nunca foi feito). */
export function diasDesdeUltimoBackup(): number | null {
  const d = parseData(obterDataUltimoBackup());
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function backupAtrasado(): boolean {
  const dias = diasDesdeUltimoBackup();
  return dias === null || dias >= DIAS_LEMBRETE_BACKUP;
}

/** Monta o conteúdo do backup (sem as chaves de login/sessão). */
export function gerarBackup(): ArquivoBackup {
  const chaves: Record<string, string> = {};
  for (const chave of listarChavesDeDados()) {
    if (chave === KEY_ULTIMO_BACKUP) continue;
    const valor = localStorage.getItem(chave);
    if (valor !== null) chaves[chave] = valor;
  }
  return {
    sistema: ASSINATURA_BACKUP,
    versao: VERSAO_BACKUP,
    gerado_em: new Date().toISOString(),
    total_chaves: Object.keys(chaves).length,
    chaves
  };
}

/** Baixa o arquivo grupo-eno-backup-AAAA-MM-DD.json e registra a data do último backup. */
export function baixarBackup(): { nomeArquivo: string; totalChaves: number } {
  const backup = gerarBackup();
  const nomeArquivo = `grupo-eno-backup-${hojeISO()}.json`;
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  localStorage.setItem(KEY_ULTIMO_BACKUP, backup.gerado_em);
  return { nomeArquivo, totalChaves: backup.total_chaves };
}

/** Lê e valida o arquivo de backup. Lança erro com mensagem amigável se o formato for inválido. */
export async function lerArquivoBackup(arquivo: File): Promise<ArquivoBackup> {
  let texto: string;
  try {
    texto = await arquivo.text();
  } catch (e) {
    throw new Error('Não foi possível ler o arquivo selecionado.');
  }
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch (e) {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const obj = dados as Partial<ArquivoBackup> | null;
  if (!obj || typeof obj !== 'object' || obj.sistema !== ASSINATURA_BACKUP) {
    throw new Error('Este arquivo não é um backup do sistema Grupo ENO.');
  }
  if (typeof obj.versao !== 'number' || obj.versao > VERSAO_BACKUP) {
    throw new Error('Versão de backup não suportada por esta versão do sistema.');
  }
  if (!obj.chaves || typeof obj.chaves !== 'object' || Array.isArray(obj.chaves)) {
    throw new Error('Backup sem dados (campo "chaves" ausente ou inválido).');
  }
  const chaves: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj.chaves)) {
    if (!ehChaveDeDados(k)) continue; // ignora chaves fora do sistema e de login/sessão
    if (typeof v !== 'string') throw new Error(`Valor inválido no backup para "${k}".`);
    chaves[k] = v;
  }
  if (Object.keys(chaves).length === 0) throw new Error('O backup não contém dados do sistema.');
  return {
    sistema: ASSINATURA_BACKUP,
    versao: obj.versao,
    gerado_em: typeof obj.gerado_em === 'string' ? obj.gerado_em : '',
    total_chaves: Object.keys(chaves).length,
    chaves
  };
}

/**
 * Substitui os dados atuais pelos do backup (login/sessão nunca são tocados).
 * Em caso de falha (ex.: falta de espaço), desfaz e volta aos dados anteriores.
 * Não recarrega a página: quem chama faz o window.location.reload().
 */
export function restaurarBackup(backup: ArquivoBackup): void {
  const anteriores: Record<string, string> = {};
  for (const chave of listarChavesDeDados()) {
    const v = localStorage.getItem(chave);
    if (v !== null) anteriores[chave] = v;
  }
  const apagarDados = () => {
    for (const chave of listarChavesDeDados()) {
      if (!ehFlagDeControle(chave)) localStorage.removeItem(chave);
    }
  };
  try {
    apagarDados();
    for (const [k, v] of Object.entries(backup.chaves)) {
      if (k === KEY_ULTIMO_BACKUP) continue;
      localStorage.setItem(k, v);
    }
    marcarLimpezaInicialConcluida();
  } catch (e) {
    try {
      apagarDados();
      for (const [k, v] of Object.entries(anteriores)) localStorage.setItem(k, v);
    } catch (e2) {
      console.error('Falha ao desfazer a restauração do backup:', e2);
    }
    throw new Error('Não foi possível restaurar o backup (espaço insuficiente no navegador?). Os dados anteriores foram mantidos.');
  }
}
