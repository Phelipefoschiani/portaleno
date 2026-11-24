// Comprovante da pesagem para mandar ao agricultor: PDF ou imagem, enviado pelo compartilhamento do celular (WhatsApp incluso).
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { PesagemRoca } from './calculo';

const kg = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
};

function linhasDoComprovante(p: PesagemRoca): { rotulo: string; valor: string }[] {
  const linhas = [
    { rotulo: 'Data', valor: dataBR(p.data) },
    { rotulo: 'Agricultor', valor: p.agricultor_nome },
    { rotulo: 'Propriedade', valor: p.agricultor_propriedade || '-' },
    { rotulo: 'Cidade/UF', valor: p.agricultor_cidade_uf },
    { rotulo: 'Preço por kg', valor: reais(p.preco_por_kg) },
    { rotulo: 'Sacos', valor: String(p.sacos.length) },
    { rotulo: 'Peso bruto', valor: `${kg(p.peso_bruto_kg)} kg` },
  ];
  if (p.desconto_kg > 0) {
    linhas.push({ rotulo: 'Desconto', valor: `${kg(p.desconto_kg)} kg${p.motivo_desconto ? ` (${p.motivo_desconto})` : ''}` });
  }
  linhas.push(
    { rotulo: 'Peso líquido', valor: `${kg(p.peso_liquido_kg)} kg` },
    { rotulo: 'Valor a pagar', valor: reais(p.valor_total) },
    { rotulo: 'Pesador', valor: p.pesador_responsavel || '-' }
  );
  if (p.observacoes) linhas.push({ rotulo: 'Observação', valor: p.observacoes });
  return linhas;
}

/** PDF em A4 com os dados da pesagem e a lista de sacos. */
export function pesagemEmPdf(p: PesagemRoca): Blob {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margem = 15;
  let y = 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Grupo ENO · Pesagem na roça', margem, y);
  y += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  linhasDoComprovante(p).forEach(l => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${l.rotulo}:`, margem, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(l.valor, margem + 40, y, { maxWidth: 140 });
    y += 7;
  });
  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Sacos', margem, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  p.sacos.forEach(s => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(`#${s.numero}  ${kg(s.peso_kg)} kg`, margem, y);
    y += 6;
  });
  return pdf.output('blob');
}

/** Imagem PNG do comprovante (monta uma folha fora da tela e fotografa). */
export async function pesagemEmImagem(p: PesagemRoca): Promise<Blob> {
  const folha = document.createElement('div');
  folha.style.cssText =
    'position:fixed;left:-10000px;top:0;width:640px;background:#ffffff;color:#111827;font-family:Arial,sans-serif;padding:28px;box-sizing:border-box;';
  const linhas = linhasDoComprovante(p)
    .map(
      l =>
        `<tr><td style="padding:6px 0;color:#6b7280;width:150px;font-size:15px">${l.rotulo}</td>` +
        `<td style="padding:6px 0;font-size:15px;font-weight:bold">${escapar(l.valor)}</td></tr>`
    )
    .join('');
  const sacos = p.sacos
    .map(s => `<div style="display:inline-block;width:150px;margin:4px 6px 4px 0;padding:6px 8px;background:#f3f4f6;border-radius:6px;font-size:14px">#${s.numero} · <b>${kg(s.peso_kg)} kg</b></div>`)
    .join('');
  folha.innerHTML =
    `<div style="background:#064e3b;color:#ffffff;padding:14px 16px;border-radius:10px;margin-bottom:16px">` +
    `<div style="font-size:12px;letter-spacing:2px">GRUPO ENO</div><div style="font-size:22px;font-weight:bold">Pesagem na roça</div></div>` +
    `<table style="width:100%;border-collapse:collapse">${linhas}</table>` +
    `<div style="margin-top:14px;font-size:15px;font-weight:bold">Sacos</div><div style="margin-top:6px">${sacos}</div>`;
  document.body.appendChild(folha);
  try {
    const canvas = await html2canvas(folha, { scale: 2, backgroundColor: '#ffffff' });
    return await new Promise<Blob>((ok, falha) => canvas.toBlob(b => (b ? ok(b) : falha(new Error('Não foi possível gerar a imagem.'))), 'image/png'));
  } finally {
    folha.remove();
  }
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

/**
 * Envia o arquivo pelo compartilhamento do celular (escolher WhatsApp).
 * Sem suporte, baixa o arquivo para enviar depois.
 */
export async function compartilharArquivo(blob: Blob, nomeArquivo: string, tipo: string, titulo: string): Promise<'enviado' | 'baixado'> {
  const arquivo = new File([blob], nomeArquivo, { type: tipo });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], title: titulo });
      return 'enviado';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'enviado'; // cancelou a escolha
      throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'baixado';
}
