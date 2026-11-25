// Folha A4 com as metas de representantes, para mandar a eles.
import { jsPDF } from 'jspdf';
import { EMPRESA } from './empresa';
import { hojeISO, formatarDataBR } from './datas';
import {
  MetaVenda,
  realizadoMeta,
  realizadoDaParteDoCliente,
  rotuloEscopo,
  rotuloModoDistribuicao,
  rotuloUnidade,
} from '../data/metasData';
import { PedidoVenda } from '../data/pedidosVendaData';
import { ProdutoEstoque } from '../data/produtosData';

export interface RepresentanteMeta {
  id: string;
  nome: string;
  metas: MetaVenda[];
}

const fmt = (m: Pick<MetaVenda, 'unidade'>, v: number) =>
  m.unidade === 'VALOR'
    ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;

const VERDE: [number, number, number] = [6, 78, 59];
const CINZA: [number, number, number] = [100, 116, 139];

/** Uma página A4 por representante (ou uma só, se houver um). */
export function gerarPdfMetas(
  representantes: RepresentanteMeta[],
  pedidos: PedidoVenda[],
  produtos: ProdutoEstoque[]
): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const hoje = hojeISO();

  representantes.forEach((rep, indice) => {
    if (indice > 0) pdf.addPage();
    let y = 16;

    // Cabeçalho com a logo
    pdf.addImage(EMPRESA.logo, 'PNG', 14, y - 2, 20, 17.4);
    pdf.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(EMPRESA.razao.toUpperCase(), 38, y + 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
    pdf.text(`CNPJ: ${EMPRESA.cnpj} • ${EMPRESA.endereco} • ${EMPRESA.telefone}`, 38, y + 10);
    y += 24;

    pdf.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
    pdf.rect(14, y, 182, 0.8, 'F');
    y += 10;

    pdf.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Metas de venda', 14, y);
    y += 8;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Representante: ${rep.nome}`, 14, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
    pdf.text(`Emitido em ${formatarDataBR(hoje)}`, 14, y);
    y += 10;

    // Tabela
    // Colunas: Meta (14–84) | Período (86–126) | Valor da meta (148) | Realizado (178) | % (194)
    const colunas = [
      { t: 'Meta', x: 14 },
      { t: 'Período', x: 86 },
      { t: 'Meta', x: 148, dir: true },
      { t: 'Realizado', x: 178, dir: true },
      { t: '%', x: 195, dir: true },
    ];
    pdf.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
    pdf.rect(14, y - 5, 182, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    colunas.forEach(c => pdf.text(c.t, c.x, y, c.dir ? { align: 'right' } : undefined));
    y += 7;

    const metas = [...rep.metas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (metas.length === 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Nenhuma meta cadastrada para este representante.', 14, y + 4);
    }
    metas.forEach((m, i) => {
      if (y > 265) {
        pdf.addPage();
        y = 20;
      }
      const realizado = realizadoMeta(m, pedidos, produtos);
      const pct = m.valor_meta > 0 ? Math.min(100, (realizado / m.valor_meta) * 100) : 0;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const nomeLinhas = pdf.splitTextToSize(`${rotuloEscopo(m)} · ${rotuloUnidade(m.unidade)}`, 68) as string[];
      const periodo = pdf.splitTextToSize(`${formatarDataBR(m.inicio)} a ${formatarDataBR(m.fim)}`, 38) as string[];
      const altura = Math.max(nomeLinhas.length, periodo.length) * 4.2 + 3;
      if (i % 2 === 1) {
        pdf.setFillColor(243, 244, 246);
        pdf.rect(14, y - 4.5, 182, altura, 'F');
      }
      pdf.text(nomeLinhas, 14, y);
      pdf.text(periodo, 86, y);
      pdf.text(fmt(m, m.valor_meta), 148, y, { align: 'right' });
      pdf.text(fmt(m, realizado), 178, y, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${pct.toFixed(0)}%`, 195, y, { align: 'right' });
      y += altura;

      // Parte de cada cliente, abaixo da meta do representante (mesmas colunas, recuo na coluna Meta)
      (m.distribuicao || []).filter(d => d.valor > 0).forEach(d => {
        if (y > 265) {
          pdf.addPage();
          y = 20;
        }
        const parte = realizadoDaParteDoCliente(m, d, pedidos, produtos);
        const pctParte = parte.alvo > 0 ? Math.min(100, (parte.realizado / parte.alvo) * 100) : 0;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
        const nomeCliente = pdf.splitTextToSize(`- ${d.cliente_nome} · ${rotuloModoDistribuicao(d)}`, 62) as string[];
        pdf.text(nomeCliente, 20, y);
        pdf.text(fmt({ unidade: parte.unidade }, parte.alvo), 148, y, { align: 'right' });
        pdf.text(fmt({ unidade: parte.unidade }, parte.realizado), 178, y, { align: 'right' });
        pdf.text(`${pctParte.toFixed(0)}%`, 195, y, { align: 'right' });
        y += Math.max(1, nomeCliente.length) * 4 + 1.5;
      });
    });

    // Resumo
    y += 6;
    if (metas.length > 0) {
      const alvo = metas.filter(m => m.fim >= hoje);
      if (alvo.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
        pdf.text('Os valores consideram pedidos faturados ou entregues no período de cada meta.', 14, y);
      }
    }
  });

  return pdf;
}
