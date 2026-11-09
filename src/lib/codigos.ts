// Códigos do sistema:
// - RCA: número de 2 dígitos (01, 02...); venda direta = 00.
// - Cliente: CL + número do RCA (2) + número do cliente dentro do RCA (2). Ex.: CL0702.
// - Pedido: AAMM + código do cliente. Ex.: 2606CL0702. Se o mesmo cliente tiver mais de um pedido no mês: -2, -3...

const pad2 = (n: number) => String(n).padStart(2, '0');
const KEY_RCAS = 'grupo_eno_rcas_v1';
const KEY_CLIENTES = 'grupo_eno_clientes_v1';
const KEY_PEDIDOS = 'grupo_eno_pedidos_venda_v1';

function lerLista(chave: string): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const porCadastro = (a: any, b: any) =>
  String(a.criado_em || '').localeCompare(String(b.criado_em || '')) || String(a.id).localeCompare(String(b.id));

/** Código do cliente já gravado (ou vazio). */
export function codigoDoCliente(clienteId?: string): string {
  return lerLista(KEY_CLIENTES).find(c => c.id === clienteId)?.codigo_cliente || '';
}

/**
 * Atribui os códigos de RCA, cliente e pedido que ainda não estão no formato novo, e reescreve os pedidos.
 * Códigos já atribuídos são mantidos. Grava no navegador (a sincronização envia ao banco).
 */
export function aplicarCodigosNoArmazenamento(): boolean {
  if (typeof window === 'undefined') return false;
  const rcas = lerLista(KEY_RCAS);
  const clientes = lerLista(KEY_CLIENTES);
  const pedidos = lerLista(KEY_PEDIDOS);
  let mudouRcas = false;
  let mudouClientes = false;
  let mudouPedidos = false;

  // 1. RCA: número na ordem de cadastro
  let maiorRca = rcas.reduce((m, r) => Math.max(m, Number(r.numero_rca) || 0), 0);
  [...rcas].sort(porCadastro).forEach(r => {
    if (!(Number(r.numero_rca) > 0)) {
      maiorRca += 1;
      r.numero_rca = maiorRca;
      mudouRcas = true;
    }
  });
  const numeroRcaDo = (vendedorId?: string) => Number(rcas.find(r => r.id === vendedorId)?.numero_rca) || 0;

  // 2. Cliente: CL + RCA + sequência dentro do RCA
  const maiorPorRca = new Map<number, number>();
  clientes.forEach(c => {
    if (c.codigo_cliente_formato === 2) {
      const n = numeroRcaDo(c.vendedor_id);
      const seq = Number(String(c.codigo_cliente).slice(4)) || 0;
      maiorPorRca.set(n, Math.max(maiorPorRca.get(n) || 0, seq));
    }
  });
  [...clientes].sort(porCadastro).forEach(c => {
    if (c.codigo_cliente_formato !== 2) {
      const n = numeroRcaDo(c.vendedor_id);
      const seq = (maiorPorRca.get(n) || 0) + 1;
      maiorPorRca.set(n, seq);
      c.codigo_cliente = `CL${pad2(n)}${pad2(seq)}`;
      c.codigo_cliente_formato = 2;
      mudouClientes = true;
    }
  });

  // 3. Pedido: AAMM + código do cliente (+ -2, -3 para o mesmo cliente no mesmo mês)
  const clientePorId = new Map(clientes.map(c => [c.id, c]));
  const usados = new Map<string, number>();
  [...pedidos]
    .sort((a, b) => String(a.data_emissao || '').localeCompare(String(b.data_emissao || '')) || String(a.id).localeCompare(String(b.id)))
    .forEach(p => {
      const cli = clientePorId.get(p.cliente_id);
      const data = String(p.data_emissao || '').slice(0, 10);
      if (!cli?.codigo_cliente || !data) return;
      const base = `${data.slice(2, 4)}${data.slice(5, 7)}${cli.codigo_cliente}`;
      const n = (usados.get(base) || 0) + 1;
      usados.set(base, n);
      const novo = n === 1 ? base : `${base}-${n}`;
      if (p.numero_pedido !== novo) {
        if (!p.numero_anterior) p.numero_anterior = p.numero_pedido;
        p.numero_pedido = novo;
        mudouPedidos = true;
      }
    });

  if (mudouRcas) {
    localStorage.setItem(KEY_RCAS, JSON.stringify(rcas));
    window.dispatchEvent(new Event('cadastros_updated'));
  }
  if (mudouClientes) {
    localStorage.setItem(KEY_CLIENTES, JSON.stringify(clientes));
    window.dispatchEvent(new Event('clientes_updated'));
  }
  if (mudouPedidos) {
    localStorage.setItem(KEY_PEDIDOS, JSON.stringify(pedidos));
    window.dispatchEvent(new Event('pedidos_venda_updated'));
  }
  return mudouRcas || mudouClientes || mudouPedidos;
}

/** Número de um pedido novo do cliente na data informada (AAMM + código do cliente). */
export function numeroPedidoNovo(dataISO: string, codigoCliente: string, pedidos: { numero_pedido?: string }[]): string {
  const base = `${dataISO.slice(2, 4)}${dataISO.slice(5, 7)}${codigoCliente}`;
  const existentes = pedidos.filter(p => p.numero_pedido === base || String(p.numero_pedido || '').startsWith(`${base}-`)).length;
  return existentes === 0 ? base : `${base}-${existentes + 1}`;
}
