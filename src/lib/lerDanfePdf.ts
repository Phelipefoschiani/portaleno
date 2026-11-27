// Leitura do PDF da nota (DANFE): tira o texto do PDF e acha chave de acesso, número, série,
// data de emissão, valor total e placa. A chave é a fonte mais segura: número e série saem dela.
// PDF escaneado (só imagem) não tem texto; aí volta vazio e o usuário digita.

export interface DadosDanfe {
  chave?: string;
  numero?: string;
  serie?: string;
  data_emissao?: string; // AAAA-MM-DD
  valor_total?: number;
  placa?: string;
  transportadora?: string;
}

/** Extrai o texto de todas as páginas do PDF (pdf.js carregado só quando precisa). */
async function textoDoPdf(arquivo: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arquivo) }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    partes.push(conteudo.items.map(it => ('str' in it ? it.str : '')).join('\n'));
  }
  return partes.join('\n');
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** "1.820,00" -> 1820 */
const numeroBR = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0;

/** Valor logo depois de um rótulo (procura nas linhas seguintes). */
function valorDepoisDe(linhas: string[], rotulo: RegExp): number | undefined {
  for (let i = 0; i < linhas.length; i++) {
    if (!rotulo.test(linhas[i])) continue;
    for (let j = i; j < Math.min(linhas.length, i + 6); j++) {
      const m = linhas[j].match(/\d{1,3}(?:\.\d{3})*,\d{2}/);
      if (m) return numeroBR(m[0]);
    }
  }
  return undefined;
}

// Linhas que são rótulos do DANFE, não o valor
const ROTULOS = /^(FRETE|CODIGO|PLACA|CNPJ|CPF|ENDERECO|MUNICIPIO|UF|INSCRICAO|QUANTIDADE|ESPECIE|MARCA|PESO|RAZAO|NOME)/;

/** Texto logo depois de um rótulo (primeira linha não vazia que não é outro rótulo). */
function textoDepoisDe(linhas: string[], rotulo: RegExp, inicio = 0): string | undefined {
  for (let i = inicio; i < linhas.length; i++) {
    if (!rotulo.test(linhas[i])) continue;
    const resto = linhas[i].replace(rotulo, '').replace(/^[\s:/-]+/, '').trim();
    if (resto.length > 2) return resto;
    for (let j = i + 1; j < Math.min(linhas.length, i + 4); j++) {
      const t = linhas[j].trim();
      if (t.length > 2 && !ROTULOS.test(semAcento(t).toUpperCase())) return t;
    }
  }
  return undefined;
}

/** Interpreta o texto de um DANFE. Exportada para testes. */
export function interpretarTextoDanfe(texto: string): DadosDanfe {
  const d: DadosDanfe = {};
  const linhas = texto.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const plano = semAcento(texto).toUpperCase();

  // Chave de acesso: 44 dígitos, muitas vezes em blocos de 4 separados por espaço
  const candidatos = texto.match(/(?:\d[\s.]?){44}/g) || [];
  for (const c of candidatos) {
    const so = c.replace(/\D/g, '');
    if (so.length === 44 && so.slice(20, 22) === '55') {
      d.chave = so;
      break;
    }
  }
  if (!d.chave) {
    const so = (texto.replace(/[^\d\n]/g, '').match(/\d{44}/) || [])[0];
    if (so) d.chave = so;
  }
  if (d.chave) {
    d.serie = String(Number(d.chave.slice(22, 25)));
    d.numero = String(Number(d.chave.slice(25, 34)));
  }

  // Data de emissão: data logo após "EMISSAO"; sem rótulo, a primeira data do documento
  const idxEmissao = linhas.findIndex(l => /DATA\s*(DA|DE)?\s*EMISS/i.test(semAcento(l)));
  const procurarData = (de: number) => {
    for (let i = de; i < Math.min(linhas.length, de + 6); i++) {
      const m = linhas[i].match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    }
    return undefined;
  };
  d.data_emissao = (idxEmissao >= 0 ? procurarData(idxEmissao) : undefined) || procurarData(0);

  // Valor total da nota
  d.valor_total = valorDepoisDe(linhas.map(l => semAcento(l).toUpperCase()), /VALOR\s+TOTAL\s+DA\s+NOTA|V\.?\s*TOTAL\s+DA\s+NOTA|VALOR\s+TOTAL\s+DA\s+NF/);

  // Transportadora e placa: bloco "TRANSPORTADOR / VOLUMES TRANSPORTADOS"
  const idxTransp = linhas.findIndex(l => /TRANSPORTADOR/i.test(semAcento(l)));
  if (idxTransp >= 0) {
    const trecho = linhas.slice(idxTransp, idxTransp + 40);
    const nome = textoDepoisDe(trecho.map(semAcento), /RAZAO\s+SOCIAL|NOME\s*\/\s*RAZAO/i);
    if (nome && !/FRETE|CODIGO|ANTT|PLACA/i.test(nome)) d.transportadora = nome;
    const placa = trecho.join(' ').toUpperCase().match(/\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/);
    if (placa) d.placa = placa[0].replace('-', '');
  }
  if (!d.placa) {
    const m = plano.match(/PLACA[^A-Z0-9]{0,20}([A-Z]{3}-?\d[A-Z0-9]\d{2})/);
    if (m) d.placa = m[1].replace('-', '');
  }
  return d;
}

/** Lê o PDF da nota. Se o PDF não tiver texto, tenta pelo menos o número no nome do arquivo ("NF 7573570 ..."). */
export async function lerDanfePdf(arquivo: File): Promise<DadosDanfe> {
  let dados: DadosDanfe = {};
  try {
    dados = interpretarTextoDanfe(await textoDoPdf(await arquivo.arrayBuffer()));
  } catch (err) {
    console.error('Erro ao ler o PDF da nota:', err);
  }
  if (!dados.numero) {
    const m = arquivo.name.match(/NF[\s._-]*(?:E[\s._-]*)?(\d{3,9})/i);
    if (m) dados.numero = String(Number(m[1]));
  }
  if (!dados.data_emissao) {
    // Data no nome do arquivo: "19112026", "19-11-2026" ou "19.11.2026" (dia, mês, ano)
    const m = arquivo.name.match(/(?:^|\D)(\d{2})[-._]?(\d{2})[-._]?(20\d{2})(?:\D|$)/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31 && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
      dados.data_emissao = `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  return dados;
}
