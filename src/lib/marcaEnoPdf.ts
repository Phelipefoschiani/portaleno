// Peças visuais da marca para PDFs feitos com jsPDF:
// - faixa do topo renderizada em canvas (degradê suave + brilho dourado + pontilhado), igual à tela
// - logo PNG com transparência (sem fundo branco)

import type { jsPDF } from 'jspdf';
import { EMPRESA } from './empresa';

// Logo reduzido mantendo a transparência
export async function carregarLogoPng(lado = 260): Promise<{ dataUrl: string; proporcao: number } | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(lado / img.width, lado / img.height);
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL('image/png'), proporcao: w / h });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = EMPRESA.logo;
  });
}

// Fundo da faixa da marca (mesmo desenho do CSS da tela), em alta resolução
function fundoFaixa(larguraMm: number, alturaMm: number): string {
  const pxPorMm = 8;
  const w = Math.round(larguraMm * pxPorMm);
  const h = Math.round(alturaMm * pxPorMm);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // linear-gradient(100deg, #042013 0%, #0b3d24 70%, #13502f 100%)
  const ang = (100 * Math.PI) / 180;
  const dx = Math.sin(ang);
  const dy = -Math.cos(ang);
  const meio = Math.abs(w * dx) / 2 + Math.abs(h * dy) / 2;
  const lin = ctx.createLinearGradient(w / 2 - dx * meio, h / 2 - dy * meio, w / 2 + dx * meio, h / 2 + dy * meio);
  lin.addColorStop(0, '#042013');
  lin.addColorStop(0.7, '#0b3d24');
  lin.addColorStop(1, '#13502f');
  ctx.fillStyle = lin;
  ctx.fillRect(0, 0, w, h);

  // Brilho dourado no canto superior direito
  const r = h * 1.4;
  const rad = ctx.createRadialGradient(w - h * 0.35, -h * 0.25, 0, w - h * 0.35, -h * 0.25, r);
  rad.addColorStop(0, 'rgba(201,162,74,0.30)');
  rad.addColorStop(0.65, 'rgba(201,162,74,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  // Pontilhado discreto
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const passo = 10 * (pxPorMm / 3.78);
  for (let y = passo / 2; y < h; y += passo) {
    for (let x = passo / 2; x < w; x += passo) {
      ctx.fillRect(x, y, 1.6, 1.6);
    }
  }
  return canvas.toDataURL('image/jpeg', 0.92);
}

// Filete dourado em degradê (#9c7a2e → #e2c27a → #9c7a2e)
function fileteDourado(larguraMm: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(larguraMm * 8);
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, canvas.width, 0);
  g.addColorStop(0, '#9c7a2e');
  g.addColorStop(0.5, '#e2c27a');
  g.addColorStop(1, '#9c7a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.95);
}

export interface FaixaMarcaPdf {
  rotulo: string; // ex.: 'TABELA DE PREÇOS'
  titulo: string; // ex.: nome da tabela / 'PEDIDO Nº 0001'
  subtitulo: string; // ex.: 'Código ... · Emitida em ...'
}

// Desenha a faixa completa da marca no topo da página atual. Retorna o Y logo abaixo do filete.
export function desenharFaixaMarca(doc: jsPDF, dados: FaixaMarcaPdf, logo: { dataUrl: string; proporcao: number } | null): number {
  const L = doc.internal.pageSize.getWidth();
  const M = 14;
  const altura = 46;
  doc.addImage(fundoFaixa(L, altura), 'JPEG', 0, 0, L, altura, 'faixa_marca', 'FAST');
  doc.addImage(fileteDourado(L), 'JPEG', 0, altura, L, 1.1, 'filete_marca', 'FAST');

  let xTexto = M;
  if (logo) {
    const alt = 22;
    const larg = alt * logo.proporcao;
    doc.addImage(logo.dataUrl, 'PNG', M, 9, larg, alt, 'logo_marca', 'FAST');
    xTexto = M + larg + 5;
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(EMPRESA.nome, xTexto, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(167, 214, 186);
  doc.text(EMPRESA.subtitulo, xTexto, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(201, 162, 74);
  doc.text(dados.rotulo.split('').join(' '), L - M, 14, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(dados.titulo.length > 22 ? 15 : 20);
  doc.text(dados.titulo.toUpperCase(), L - M, 24, { align: 'right', maxWidth: 100 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(167, 214, 186);
  doc.text(dados.subtitulo, L - M, 31, { align: 'right' });

  doc.setFontSize(6.8);
  doc.setTextColor(138, 186, 158);
  doc.text(`${EMPRESA.endereco}  ·  CNPJ ${EMPRESA.cnpj}  ·  ${EMPRESA.telefone}  ·  ${EMPRESA.email}`, M, 41.5);
  return altura + 1.1;
}
