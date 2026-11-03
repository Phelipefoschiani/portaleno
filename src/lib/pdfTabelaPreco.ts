// Gera a Tabela de Preços em PDF (A4, desenhada em vetor com jsPDF: texto nítido e paginação por linha).
// Mesmo desenho da visualização na tela: faixa verde-escura com filete dourado, produtos por categoria.

import { jsPDF } from 'jspdf';

// Mesmo logo usado no site (public/logo.jpg)
const logoUrl = '/logo.jpg?v=3';

export interface LinhaTabelaPrecoPdf {
  categoria: string;
  nome: string;
  codigo: string;
  peso: string;
  acondicionamento: string; // ex.: 'Caixa c/ 12 un'
  preco: number; // unitário
  precoAcondicionamento: number;
  rotuloAcondicionamento: string; // ex.: 'Caixa'
}

export interface DadosTabelaPrecoPdf {
  nome: string;
  codigo: string;
  segmento: string;
  vigencia: string;
  pagamento: string;
  frete: string;
  mostrarUnitario: boolean;
  mostrarAcondicionamento: boolean;
  linhas: LinhaTabelaPrecoPdf[];
}

// Paleta (mesmos tons da tela)
const VERDE_ESCURO: [number, number, number] = [4, 32, 19];
const VERDE_MEDIO: [number, number, number] = [11, 61, 36];
const VERDE_TEXTO: [number, number, number] = [6, 78, 59];
const DOURADO: [number, number, number] = [201, 162, 74];
const PAPEL: [number, number, number] = [251, 250, 245];
const FAIXA_CATEGORIA: [number, number, number] = [243, 234, 211];
const ZEBRA: [number, number, number] = [246, 243, 234];
const TINTA: [number, number, number] = [23, 30, 26];
const CINZA: [number, number, number] = [110, 116, 112];

const EMPRESA = {
  nome: 'GRUPO ENO',
  subtitulo: 'Agroindústria · Fecularia & Mandioca Gourmet',
  contato: 'Rodovia PR-482, km 14  ·  CNPJ 14.882.910/0001-44  ·  (44) 3639-8200  ·  comercial@grupoeno.com.br'
};

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Carrega o logo já reduzido (240px) para o PDF ficar leve
async function carregarLogo(): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const lado = 240;
        const canvas = document.createElement('canvas');
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lado, lado);
        const escala = Math.min(lado / img.width, lado / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

export async function gerarPdfTabelaPreco(dados: DadosTabelaPrecoPdf): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 210;
  const A = 297;
  const M = 14; // margem lateral
  const logo = await carregarLogo();
  const emitida = new Date().toLocaleDateString('pt-BR');

  // Colunas
  const colPrecoCx = L - M;
  const colPrecoUn = dados.mostrarAcondicionamento ? L - M - 46 : L - M;
  const colPeso = M + 72;

  const fundoPapel = () => {
    doc.setFillColor(...PAPEL);
    doc.rect(0, 0, L, A, 'F');
  };

  const cabecalhoCompleto = () => {
    // Faixa verde em degradê (faixas finas do escuro para o médio)
    const altura = 46;
    const passos = 24;
    for (let i = 0; i < passos; i++) {
      const t = i / (passos - 1);
      doc.setFillColor(
        Math.round(VERDE_ESCURO[0] + (VERDE_MEDIO[0] - VERDE_ESCURO[0]) * t),
        Math.round(VERDE_ESCURO[1] + (VERDE_MEDIO[1] - VERDE_ESCURO[1]) * t),
        Math.round(VERDE_ESCURO[2] + (VERDE_MEDIO[2] - VERDE_ESCURO[2]) * t)
      );
      doc.rect((L / passos) * i, 0, L / passos + 0.3, altura, 'F');
    }
    doc.setFillColor(...DOURADO);
    doc.rect(0, altura, L, 1.2, 'F');

    // Selo do logo
    if (logo) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M, 10, 26, 26, 3, 3, 'F');
      try { doc.addImage(logo, 'JPEG', M + 2, 12, 22, 22); } catch (e) { /* sem logo */ }
    }
    const xTexto = logo ? M + 32 : M;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text(EMPRESA.nome, xTexto, 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(167, 214, 186);
    doc.text(EMPRESA.subtitulo, xTexto, 27);

    // Lado direito: nome da tabela
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...DOURADO);
    doc.text('T A B E L A   D E   P R E Ç O S', L - M, 15, { align: 'right' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(dados.nome.length > 22 ? 15 : 20);
    doc.text(dados.nome.toUpperCase(), L - M, 25, { align: 'right', maxWidth: 95 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(167, 214, 186);
    doc.text(`Código ${dados.codigo}  ·  Emitida em ${emitida}`, L - M, 32, { align: 'right' });

    // Linha de contato dentro da faixa
    doc.setFontSize(6.8);
    doc.setTextColor(138, 186, 158);
    doc.text(EMPRESA.contato, M, 41.5);

    // Faixa de condições
    const yInfo = 53;
    const blocos: [string, string][] = [
      ['VIGÊNCIA', dados.vigencia],
      ['PAGAMENTO', dados.pagamento || '-'],
      ['FRETE', dados.frete || '-'],
      ['SEGMENTO', dados.segmento || '-']
    ];
    const larg = (L - 2 * M) / blocos.length;
    blocos.forEach(([rotulo, valor], i) => {
      const x = M + larg * i;
      if (i > 0) {
        doc.setDrawColor(221, 214, 196);
        doc.setLineWidth(0.2);
        doc.line(x - 3, yInfo - 3, x - 3, yInfo + 8);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...CINZA);
      doc.text(rotulo, x, yInfo);
      doc.setFontSize(9);
      doc.setTextColor(...TINTA);
      doc.text(doc.splitTextToSize(valor, larg - 6)[0] || '-', x, yInfo + 5.5);
    });
    return 66;
  };

  const cabecalhoContinuacao = () => {
    doc.setFillColor(...VERDE_ESCURO);
    doc.rect(0, 0, L, 16, 'F');
    doc.setFillColor(...DOURADO);
    doc.rect(0, 16, L, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${EMPRESA.nome}  ·  Tabela ${dados.nome}`, M, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(167, 214, 186);
    doc.text(`Código ${dados.codigo}  ·  continuação`, L - M, 10, { align: 'right' });
    return 24;
  };

  const cabecalhoColunas = (y: number) => {
    doc.setFillColor(...VERDE_MEDIO);
    doc.roundedRect(M, y, L - 2 * M, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('PRODUTO', M + 4, y + 5.2);
    doc.text('PESO / EMBALAGEM', colPeso, y + 5.2);
    if (dados.mostrarUnitario) doc.text('PREÇO UNITÁRIO', colPrecoUn - 3, y + 5.2, { align: 'right' });
    if (dados.mostrarAcondicionamento) doc.text('PREÇO CAIXA / FARDO', colPrecoCx - 3, y + 5.2, { align: 'right' });
    return y + 11;
  };

  const LIMITE = A - 26;
  fundoPapel();
  let y = cabecalhoColunas(cabecalhoCompleto());

  const novaPagina = () => {
    doc.addPage();
    fundoPapel();
    y = cabecalhoColunas(cabecalhoContinuacao());
  };

  if (dados.linhas.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...CINZA);
    doc.text('Nenhum produto com preço nesta tabela.', L / 2, y + 12, { align: 'center' });
    y += 20;
  }

  // Agrupa por categoria mantendo a ordem recebida
  const grupos = new Map<string, LinhaTabelaPrecoPdf[]>();
  dados.linhas.forEach(l => {
    const cat = l.categoria || 'Sem categoria';
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat)!.push(l);
  });

  grupos.forEach((linhas, categoria) => {
    if (y + 7 + 10 > LIMITE) novaPagina();
    doc.setFillColor(...FAIXA_CATEGORIA);
    doc.rect(M, y, L - 2 * M, 6.5, 'F');
    doc.setFillColor(...DOURADO);
    doc.rect(M, y, 1.2, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...VERDE_TEXTO);
    doc.text(categoria.toUpperCase(), M + 4, y + 4.4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CINZA);
    doc.text(`${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'}`, L - M - 3, y + 4.4, { align: 'right' });
    y += 7.5;

    linhas.forEach((l, idx) => {
      const alturaLinha = 10.5;
      if (y + alturaLinha > LIMITE) novaPagina();
      if (idx % 2 === 1) {
        doc.setFillColor(...ZEBRA);
        doc.rect(M, y, L - 2 * M, alturaLinha, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...TINTA);
      doc.text(doc.splitTextToSize(l.nome, colPeso - M - 8)[0], M + 4, y + 4.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...CINZA);
      doc.text(l.codigo, M + 4, y + 8.3);

      doc.setFontSize(8.3);
      doc.setTextColor(...TINTA);
      doc.text([l.peso, l.acondicionamento].filter(Boolean).join('  ·  '), colPeso, y + 6.3);

      if (dados.mostrarUnitario) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...VERDE_TEXTO);
        doc.text(moeda(l.preco), colPrecoUn - 3, y + 6.4, { align: 'right' });
      }
      if (dados.mostrarAcondicionamento) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...TINTA);
        doc.text(moeda(l.precoAcondicionamento), colPrecoCx - 3, y + 5.6, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...CINZA);
        doc.text(`por ${l.rotuloAcondicionamento.toLowerCase()}`, colPrecoCx - 3, y + 9, { align: 'right' });
      }
      doc.setDrawColor(230, 225, 210);
      doc.setLineWidth(0.15);
      doc.line(M, y + alturaLinha, L - M, y + alturaLinha);
      y += alturaLinha;
    });
    y += 3;
  });

  // Condições comerciais (dados reais da tabela)
  const condicoes = [
    'Valores em reais (R$), válidos durante a vigência indicada no topo.',
    `Pagamento: ${dados.pagamento || 'a combinar'}.  Frete: ${dados.frete || 'a combinar'}.`,
    'Pedidos sujeitos à análise de crédito e à disponibilidade de estoque.'
  ];
  const alturaCond = 8 + condicoes.length * 4.6;
  if (y + alturaCond + 4 > LIMITE) novaPagina();
  y += 3;
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 30, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...VERDE_TEXTO);
  doc.text('CONDIÇÕES COMERCIAIS', M, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TINTA);
  condicoes.forEach((c, i) => doc.text(`·  ${c}`, M, y + 10 + i * 4.6));

  // Rodapé com paginação em todas as páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(221, 214, 196);
    doc.setLineWidth(0.2);
    doc.line(M, A - 14, L - M, A - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    const qtd = dados.linhas.length;
    doc.text(`Grupo ENO Agroindustrial  ·  Tabela ${dados.nome} (${dados.codigo})  ·  ${qtd} ${qtd === 1 ? 'produto' : 'produtos'}`, M, A - 9);
    doc.text(`Página ${p} de ${total}`, L - M, A - 9, { align: 'right' });
  }

  return doc;
}
