// Leitura do XML da NF-e (modelo 55), no navegador, sem serviço externo.
// Aceita o XML da nota (NFe) ou o "processado" (nfeProc, com o protocolo de autorização).

export interface LoteItemNFe {
  lote: string;
  quantidade?: number;
  data_fabricacao?: string; // AAAA-MM-DD
  data_validade?: string; // AAAA-MM-DD
}

export interface ItemNFe {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  lotes: LoteItemNFe[];
}

export interface DuplicataNFe {
  numero: string;
  vencimento: string; // AAAA-MM-DD
  valor: number;
}

export interface DadosNFe {
  numero: string;
  serie: string;
  chave: string;
  data_emissao: string; // AAAA-MM-DD
  natureza: string;
  emitente: { documento: string; nome: string };
  destinatario: { documento: string; nome: string };
  valor_total: number;
  peso_liquido_kg: number;
  peso_bruto_kg: number;
  transportadora: string;
  placa: string;
  protocolo: string; // nº do protocolo de autorização (só no XML processado)
  status_codigo: string; // cStat (100 = autorizada)
  status_texto: string;
  itens: ItemNFe[];
  duplicatas: DuplicataNFe[];
}

const soDigitos = (v?: string | null) => String(v || '').replace(/\D/g, '');
const num = (v?: string | null) => {
  const n = parseFloat(String(v || '').trim());
  return isNaN(n) ? 0 : n;
};
// Datas do XML vêm em "2026-11-03T10:15:00-03:00" ou "2026-11-03": pega só o dia, sem fuso
const dia = (v?: string | null) => {
  const m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
};

function primeiro(el: Element | Document | null | undefined, tag: string): Element | null {
  if (!el) return null;
  return el.getElementsByTagName(tag)[0] || null;
}
function texto(el: Element | Document | null | undefined, tag: string): string {
  return (primeiro(el, tag)?.textContent || '').trim();
}

/** Confere a chave de acesso: 44 dígitos e dígito verificador (módulo 11). */
export function chaveNFeValida(chave: string): boolean {
  const c = soDigitos(chave);
  if (c.length !== 44) return false;
  let peso = 2;
  let soma = 0;
  for (let i = 42; i >= 0; i--) {
    soma += Number(c[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(c[43]);
}

/** Lê o XML da NF-e. Lança erro com mensagem amigável quando o arquivo não é uma NF-e. */
export function lerNFeXml(conteudo: string): DadosNFe {
  const doc = new DOMParser().parseFromString(conteudo, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('O arquivo não é um XML válido.');
  const inf = primeiro(doc, 'infNFe');
  if (!inf) throw new Error('Este XML não é de uma NF-e (não tem o bloco infNFe).');

  const ide = primeiro(inf, 'ide');
  const emit = primeiro(inf, 'emit');
  const dest = primeiro(inf, 'dest');
  const total = primeiro(inf, 'ICMSTot');
  const transp = primeiro(inf, 'transp');
  const prot = primeiro(doc, 'infProt');

  const chave = soDigitos(texto(prot, 'chNFe')) || soDigitos(inf.getAttribute('Id'));

  // Peso: soma dos volumes (uma nota pode ter vários)
  let pesoL = 0;
  let pesoB = 0;
  Array.from(transp?.getElementsByTagName('vol') || []).forEach(v => {
    pesoL += num(texto(v, 'pesoL'));
    pesoB += num(texto(v, 'pesoB'));
  });

  const itens: ItemNFe[] = Array.from(inf.getElementsByTagName('det')).map(det => {
    const prod = primeiro(det, 'prod');
    return {
      codigo: texto(prod, 'cProd'),
      descricao: texto(prod, 'xProd'),
      quantidade: num(texto(prod, 'qCom')),
      unidade: texto(prod, 'uCom'),
      valor_unitario: num(texto(prod, 'vUnCom')),
      valor_total: num(texto(prod, 'vProd')),
      lotes: Array.from(prod?.getElementsByTagName('rastro') || []).map(r => ({
        lote: texto(r, 'nLote'),
        quantidade: num(texto(r, 'qLote')) || undefined,
        data_fabricacao: dia(texto(r, 'dFab')) || undefined,
        data_validade: dia(texto(r, 'dVal')) || undefined
      }))
    };
  });

  const duplicatas: DuplicataNFe[] = Array.from(inf.getElementsByTagName('dup')).map(d => ({
    numero: texto(d, 'nDup'),
    vencimento: dia(texto(d, 'dVenc')),
    valor: num(texto(d, 'vDup'))
  }));

  return {
    numero: String(parseInt(texto(ide, 'nNF'), 10) || texto(ide, 'nNF')),
    serie: texto(ide, 'serie') || '1',
    chave,
    data_emissao: dia(texto(ide, 'dhEmi') || texto(ide, 'dEmi')),
    natureza: texto(ide, 'natOp'),
    emitente: { documento: soDigitos(texto(emit, 'CNPJ') || texto(emit, 'CPF')), nome: texto(emit, 'xFant') || texto(emit, 'xNome') },
    destinatario: { documento: soDigitos(texto(dest, 'CNPJ') || texto(dest, 'CPF')), nome: texto(dest, 'xNome') },
    valor_total: num(texto(total, 'vNF')),
    peso_liquido_kg: pesoL,
    peso_bruto_kg: pesoB,
    transportadora: texto(primeiro(transp, 'transporta'), 'xNome'),
    placa: texto(primeiro(transp, 'veicTransp'), 'placa').toUpperCase(),
    protocolo: texto(prot, 'nProt'),
    status_codigo: texto(prot, 'cStat'),
    status_texto: texto(prot, 'xMotivo'),
    itens,
    duplicatas
  };
}

/** Situação da nota pelo protocolo: autorizada (100/150), sem protocolo (XML não processado) ou outra. */
export function situacaoNFe(d: Pick<DadosNFe, 'status_codigo' | 'status_texto'>): 'AUTORIZADA' | 'SEM_PROTOCOLO' | 'OUTRA' {
  if (!d.status_codigo) return 'SEM_PROTOCOLO';
  return d.status_codigo === '100' || d.status_codigo === '150' ? 'AUTORIZADA' : 'OUTRA';
}

export const formatarDocumento = (doc: string) => {
  const d = soDigitos(doc);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return doc;
};

export const mesmoDocumento = (a?: string, b?: string) => !!soDigitos(a) && soDigitos(a) === soDigitos(b);
