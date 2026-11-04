// Máscaras e lista de estados dos cadastros (CPF, CNPJ, Inscrição Estadual e UF).

/** Todos os estados brasileiros (UF) e o Distrito Federal, em ordem alfabética de sigla. */
export const ESTADOS_UF: { uf: string; nome: string }[] = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' }, { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' }, { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' }, { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' }, { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' }, { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
];

const soDigitos = (v: string) => v.replace(/\D/g, '');

/** CPF: 000.000.000-00 (aceita digitação parcial). */
export function mascaraCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** CNPJ: 00.000.000/0000-00 (aceita digitação parcial). */
export function mascaraCnpj(valor: string): string {
  const d = soDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * CPF ou CNPJ conforme a quantidade de números digitados: até 11 vira CPF;
 * a partir do 12º número passa a ser CNPJ.
 */
export function mascaraCpfCnpj(valor: string): string {
  const d = soDigitos(valor);
  return d.length <= 11 ? mascaraCpf(d) : mascaraCnpj(d);
}

/**
 * Inscrição estadual: os pontos e traço variam por estado, então a máscara segue a quantidade
 * de números (ex.: PR 10 dígitos, SP 12 dígitos, MG 13 dígitos). Texto como "ISENTO" é mantido.
 */
export function mascaraInscricaoEstadual(valor: string): string {
  if (/[a-zA-Z]/.test(valor)) return valor.toUpperCase();
  const d = soDigitos(valor).slice(0, 14);
  if (d.length <= 9) return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
  if (d.length === 10) return d.replace(/^(\d{3})(\d{5})(\d)/, '$1.$2-$3');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3-$4');
  if (d.length === 12) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d)/, '$1.$2.$3.$4');
  if (d.length === 13) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4');
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}
