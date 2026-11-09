// Códigos do sistema: pedido = ANO-RCA-CLIENTE-SEQUENCIAL (ex.: 2026-MAR-CL0007-0001)

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Sigla de 3 letras do RCA (primeiras letras do primeiro nome). Venda direta (sem RCA) = VD. */
export function siglaRca(rca?: { nome_completo?: string; nome_fantasia?: string } | null): string {
  if (!rca) return 'VD';
  const nome = semAcento(rca.nome_fantasia || rca.nome_completo || '').toUpperCase().replace(/[^A-Z ]/g, '').trim();
  if (!nome) return 'VD';
  return nome.split(/\s+/)[0].slice(0, 3).padEnd(3, 'X');
}

/** Código do cliente (CL0001...). Clientes antigos sem código aparecem como CL????. */
export function codigoCliente(cliente?: { codigo_cliente?: string } | null): string {
  return cliente?.codigo_cliente || 'CL????';
}

/** Próximo código de cliente, a partir dos códigos já existentes. */
export function proximoCodigoCliente(clientes: { codigo_cliente?: string }[]): string {
  const maior = clientes.reduce((m, c) => {
    const n = Number(String(c.codigo_cliente || '').replace(/\D/g, '')) || 0;
    return Math.max(m, n);
  }, 0);
  return `CL${String(maior + 1).padStart(4, '0')}`;
}

/** Próximo número de pedido do ano: sequencial dentro do ano, somando todos os pedidos já existentes. */
export function proximoNumeroPedido(
  ano: number,
  sigla: string,
  codCliente: string,
  pedidos: { numero_pedido?: string }[]
): string {
  const doAno = pedidos.filter(p => String(p.numero_pedido || '').startsWith(`${ano}-`)).length;
  return `${ano}-${sigla}-${codCliente}-${String(doAno + 1).padStart(4, '0')}`;
}
