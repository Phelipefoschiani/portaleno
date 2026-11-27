// Abre o arquivo da nota que foi importado no faturamento: PDF abre numa aba nova para ver/imprimir; XML é baixado.
import { carregarPedidosVenda, PedidoVenda } from '../data/pedidosVendaData';

export type NotaDoPedido = NonNullable<PedidoVenda['nota_fiscal']>;

const soDigitos = (s?: string) => (s || '').replace(/\D/g, '');

/** Nota guardada no pedido de venda que corresponde a uma nota de saída (pela chave; sem chave, pelo número). */
export function notaGuardadaDoPedido(chave?: string, numero?: string): NotaDoPedido | undefined {
  const c = soDigitos(chave);
  const n = soDigitos(numero).replace(/^0+/, '');
  const pedidos = carregarPedidosVenda();
  const porChave = c ? pedidos.find(p => soDigitos(p.nota_fiscal?.chave_acesso) === c) : undefined;
  const pedido = porChave || (n ? pedidos.find(p => soDigitos(p.nota_fiscal?.numero).replace(/^0+/, '') === n) : undefined);
  return pedido?.nota_fiscal || undefined;
}

/** data:application/pdf;base64,... -> Blob */
function blobDoDataUrl(dataUrl: string): Blob {
  const [cabecalho, base64] = dataUrl.split(',');
  const tipo = (cabecalho.match(/data:([^;]+)/) || [])[1] || 'application/pdf';
  const bin = atob(base64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** true quando abriu/baixou; false quando a nota não tem o arquivo guardado. */
export function abrirArquivoNota(nf: NotaDoPedido): boolean {
  if (!nf.arquivo_conteudo) return false;
  if (nf.tipo_arquivo === 'PDF' && nf.arquivo_conteudo.startsWith('data:')) {
    const url = URL.createObjectURL(blobDoDataUrl(nf.arquivo_conteudo));
    const aba = window.open(url, '_blank');
    if (!aba) {
      // Bloqueador de pop-up: baixa o arquivo
      const a = document.createElement('a');
      a.href = url;
      a.download = nf.arquivo_anexado || `NF_${nf.numero}.pdf`;
      a.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  }
  const url = URL.createObjectURL(new Blob([nf.arquivo_conteudo], { type: 'text/xml;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nf.arquivo_anexado || `NF_${nf.numero}.xml`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
