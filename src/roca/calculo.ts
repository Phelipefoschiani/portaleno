// Cálculo da pesagem na roça (mesma regra da tela principal, sem depender do resto do sistema).
// Valor = peso LÍQUIDO × preço por kg. Desconto = percentual sobre o bruto + tara (kg).

export interface SacoRoca {
  numero: number;
  peso_kg: number;
}

/** Agricultor como o app guarda (cache offline e cadastro novo). */
export interface AgricultorRoca {
  id: string;
  nome_completo: string;
  nome_propriedade: string;
  cpf_cnpj: string;
  telefone: string;
  chave_pix: string;
  endereco: { municipio: string; uf: string };
  criado_em: string;
  origem_app?: boolean;
}

/** Pesagem feita no app, pronta para virar um cálculo na roça no sistema. */
export interface PesagemRoca {
  id: string;
  data: string; // AAAA-MM-DD
  criado_em: string;
  agricultor_id: string;
  agricultor_nome: string;
  agricultor_propriedade: string;
  agricultor_cidade_uf: string;
  agricultor_cpf_cnpj: string;
  agricultor_chave_pix: string;
  local_pesagem: string;
  pesador_responsavel: string;
  preco_por_kg: number;
  sacos: SacoRoca[];
  desconto_percentual: number;
  desconto_tara_kg: number;
  desconto_kg: number;
  peso_bruto_kg: number;
  peso_liquido_kg: number;
  valor_total: number;
  motivo_desconto?: string;
  observacoes?: string;
}

export function calcularDescontoRoca(pesoBrutoKg: number, percentual: number, taraKg: number): { desconto: number; liquido: number } {
  const bruto = Math.max(0, Number(pesoBrutoKg) || 0);
  const pct = Math.min(100, Math.max(0, Number(percentual) || 0));
  const tara = Math.max(0, Number(taraKg) || 0);
  const desconto = Math.min(bruto, (bruto * pct) / 100 + tara);
  return {
    desconto: parseFloat(desconto.toFixed(3)),
    liquido: parseFloat(Math.max(0, bruto - desconto).toFixed(3)),
  };
}

/** Totais da pesagem em tempo real (mesma conta usada ao salvar). */
export function totaisDaPesagem(sacos: SacoRoca[], precoPorKg: number, pct: number, tara: number) {
  const pesoBruto = parseFloat(sacos.reduce((acc, s) => acc + s.peso_kg, 0).toFixed(3));
  const { desconto, liquido } = calcularDescontoRoca(pesoBruto, pct, tara);
  const valor = parseFloat((liquido * (Number(precoPorKg) || 0)).toFixed(2));
  return {
    totalSacos: sacos.length,
    pesoBruto,
    desconto,
    pesoLiquido: liquido,
    pesoMedio: sacos.length > 0 ? parseFloat((pesoBruto / sacos.length).toFixed(3)) : 0,
    valor,
  };
}
