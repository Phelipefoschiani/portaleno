// Gera um PDF A4 a partir de um elemento da tela (documento visualizado), capturando-o INTEIRO
// mesmo dentro de área com rolagem/zoom, e quebrando as páginas entre linhas (nunca no meio de um item).

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const A4_L = 210;
const A4_A = 297;
const MARGEM = 8; // mm (topo e base de cada página)

export async function gerarPdfDeElemento(elemento: HTMLElement): Promise<jsPDF> {
  const largura = elemento.scrollWidth;
  const altura = elemento.scrollHeight;
  const escala = 2;

  const canvas = await html2canvas(elemento, {
    scale: escala,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: largura,
    height: altura,
    windowWidth: Math.max(document.documentElement.clientWidth, largura + 40),
    windowHeight: Math.max(document.documentElement.clientHeight, altura + 40),
    scrollX: 0,
    scrollY: 0,
    onclone: (doc, clone) => {
      // Sem zoom, sem limite de altura e sem rolagem no clone: o documento sai completo
      let no: HTMLElement | null = clone;
      while (no && no !== doc.body) {
        no.style.transform = 'none';
        no.style.maxHeight = 'none';
        no.style.overflow = 'visible';
        no = no.parentElement;
      }
      clone.style.boxShadow = 'none';
    }
  });

  // Pontos seguros de quebra: fim de cada linha de tabela e de cada bloco direto do documento
  const topoElemento = elemento.getBoundingClientRect().top;
  const pontos = new Set<number>([altura]);
  elemento.querySelectorAll('tr, :scope > *').forEach(n => {
    const r = (n as HTMLElement).getBoundingClientRect();
    if (r.height > 0) pontos.add(Math.round(r.bottom - topoElemento));
  });
  const quebrasOrdenadas = [...pontos].filter(p => p > 0 && p <= altura).sort((a, b) => a - b);

  const pxPorMm = largura / A4_L;
  const alturaUtilPx = (A4_A - 2 * MARGEM) * pxPorMm;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  let inicio = 0;
  let pagina = 0;
  while (inicio < altura - 1) {
    const limite = inicio + alturaUtilPx;
    let fim = altura;
    if (limite < altura) {
      const candidatos = quebrasOrdenadas.filter(p => p > inicio + alturaUtilPx * 0.4 && p <= limite);
      fim = candidatos.length ? candidatos[candidatos.length - 1] : limite;
    }

    const fatia = document.createElement('canvas');
    fatia.width = canvas.width;
    fatia.height = Math.ceil((fim - inicio) * escala);
    const ctx = fatia.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, fatia.width, fatia.height);
    ctx.drawImage(canvas, 0, Math.floor(inicio * escala), canvas.width, fatia.height, 0, 0, fatia.width, fatia.height);

    if (pagina > 0) pdf.addPage();
    const alturaMm = (fim - inicio) / pxPorMm;
    pdf.addImage(fatia.toDataURL('image/jpeg', 0.9), 'JPEG', 0, MARGEM, A4_L, alturaMm, undefined, 'FAST');
    inicio = fim;
    pagina++;
  }

  const total = pdf.getNumberOfPages();
  if (total > 1) {
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Página ${p} de ${total}`, A4_L - 10, A4_A - 3.5, { align: 'right' });
    }
  }
  return pdf;
}
