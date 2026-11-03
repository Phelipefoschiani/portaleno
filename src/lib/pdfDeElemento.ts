// Gera um PDF A4 a partir de um elemento da tela (documento visualizado), capturando-o INTEIRO
// mesmo dentro de área com rolagem/zoom, e quebrando as páginas entre linhas (nunca no meio de um item).

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const A4_L = 210;
const A4_A = 297;
const MARGEM = 8; // mm (topo e base de cada página)

export async function gerarPdfDeElemento(elemento: HTMLElement): Promise<jsPDF> {
  // Cor do papel da folha: as margens do PDF ficam da mesma cor (sem faixa branca em volta)
  const corPapel = getComputedStyle(elemento).backgroundColor || '#ffffff';
  const rgbPapel = (corPapel.match(/\d+/g) || ['255', '255', '255']).slice(0, 3).map(Number) as [number, number, number];
  const largura = elemento.scrollWidth;
  const altura = elemento.scrollHeight;
  const escala = 2;

  const canvas = await html2canvas(elemento, {
    scale: escala,
    useCORS: true,
    backgroundColor: corPapel,
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

  // Bloco de fechamento (totais, assinaturas, rodapé): marcado com data-pdf-final, vai sempre
  // ao pé da última página — nunca solto no meio da folha
  const blocoFinal = elemento.querySelector('[data-pdf-final]') as HTMLElement | null;
  const inicioFinal = blocoFinal ? Math.round(blocoFinal.getBoundingClientRect().top - topoElemento) : altura;
  const alturaConteudo = blocoFinal && inicioFinal > 0 ? inicioFinal : altura;
  const alturaFinal = altura - alturaConteudo;

  const recortar = (de: number, ate: number): string | null => {
    const fatia = document.createElement('canvas');
    fatia.width = canvas.width;
    fatia.height = Math.max(1, Math.ceil((ate - de) * escala));
    const ctx = fatia.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = corPapel;
    ctx.fillRect(0, 0, fatia.width, fatia.height);
    ctx.drawImage(canvas, 0, Math.floor(de * escala), canvas.width, fatia.height, 0, 0, fatia.width, fatia.height);
    return fatia.toDataURL('image/jpeg', 0.9);
  };
  const novaPaginaPapel = (primeira: boolean) => {
    if (!primeira) pdf.addPage();
    pdf.setFillColor(...rgbPapel);
    pdf.rect(0, 0, A4_L, A4_A, 'F');
  };

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  let inicio = 0;
  let pagina = 0;
  let ocupadoUltimaMm = 0; // até onde a última página já está preenchida (mm)
  while (inicio < alturaConteudo - 1) {
    // 1ª página encosta no topo (a faixa da marca começa na borda); as demais têm margem
    const topoMm = pagina === 0 ? 0 : MARGEM;
    const limite = inicio + (A4_A - topoMm - MARGEM) * pxPorMm;
    let fim = alturaConteudo;
    if (limite < alturaConteudo) {
      const candidatos = quebrasOrdenadas.filter(p => p > inicio + alturaUtilPx * 0.4 && p <= limite);
      fim = candidatos.length ? candidatos[candidatos.length - 1] : limite;
    }
    const img = recortar(inicio, fim);
    if (!img) break;
    novaPaginaPapel(pagina === 0);
    const alturaMm = (fim - inicio) / pxPorMm;
    pdf.addImage(img, 'JPEG', 0, topoMm, A4_L, alturaMm, undefined, 'FAST');
    ocupadoUltimaMm = topoMm + alturaMm;
    inicio = fim;
    pagina++;
  }

  if (alturaFinal > 1) {
    const img = recortar(alturaConteudo, altura);
    const alturaFinalMm = alturaFinal / pxPorMm;
    // Cabe no pé da última página? senão vai para uma página nova, também no pé
    if (pagina === 0 || ocupadoUltimaMm + alturaFinalMm > A4_A - MARGEM) {
      novaPaginaPapel(pagina === 0);
      pagina++;
    }
    if (img) pdf.addImage(img, 'JPEG', 0, A4_A - MARGEM - alturaFinalMm, A4_L, alturaFinalMm, undefined, 'FAST');
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
