// Condição de pagamento: forma (Boleto, Pix...) + dias digitados livremente.
// Dias aceita um prazo ("28") ou parcelas ("28/35/42"); vazio ou 0 = à vista.

export const FORMAS_PAGAMENTO = [
  'Boleto Bancário',
  'Pix',
  'Transferência Bancária (TED)',
  'Cartão de Crédito',
  'Dinheiro'
];

// Formas que normalmente têm prazo em dias
export const formaComPrazo = (forma: string) => /boleto|cart[aã]o|ted|transfer/i.test(forma || '');

// Limpa o que foi digitado: só números separados por "/" (ex.: "28 / 35, 42" -> "28/35/42")
export function normalizarDias(texto: string): string {
  return (String(texto || '').match(/\d+/g) || [])
    .map(n => String(Math.min(365, Number(n))))
    .join('/');
}

// Texto gravado no cliente/pedido (compatível com a leitura de vencimentos do faturamento)
export function textoCondicao(forma: string, dias: string): string {
  const d = normalizarDias(dias);
  if (!d || d === '0') return `${forma} à vista`;
  const qtd = d.split('/').length;
  return `${forma} ${d} dias${qtd > 1 ? ` (${qtd}x)` : ''}`;
}

// Separa um texto salvo em forma + dias (para reabrir o formulário)
export function lerCondicao(texto?: string, formaPadrao = FORMAS_PAGAMENTO[0]): { forma: string; dias: string } {
  const t = String(texto || '').replace(/\(.*?\)/g, ''); // ignora "(3x)"
  const forma = FORMAS_PAGAMENTO.find(f => t.toLowerCase().includes(f.toLowerCase().split(' ')[0])) || formaPadrao;
  return { forma, dias: /vista/i.test(t) ? '' : normalizarDias(t) };
}
