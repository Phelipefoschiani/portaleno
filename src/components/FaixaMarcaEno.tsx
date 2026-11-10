import React from 'react';
import { EMPRESA, linhaContatoEmpresa, empresaAtual } from '../lib/empresa';

interface Props {
  rotulo: string; // ex.: 'Tabela de Preços'
  titulo: string; // ex.: nome da tabela ou 'Nº 0001'
  subtitulo: React.ReactNode;
  destaque?: React.ReactNode; // selo opcional abaixo do título (ex.: tipo do documento)
}

// Faixa de topo dos documentos do Grupo ENO (tabela de preço, pedido/orçamento). Mesmo desenho do PDF.
export function FaixaMarcaEno({ rotulo, titulo, subtitulo, destaque }: Props) {
  return (
    <>
      <div className="relative bg-[linear-gradient(100deg,#042013_0%,#0b3d24_70%,#13502f_100%)] px-6 sm:px-8 pt-6 pb-5 overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.28),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={empresaAtual().logo}
              alt="Grupo ENO"
              className="h-16 w-auto object-contain shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
            />
            <div>
              <div className="text-2xl font-black tracking-tight text-white leading-none">{empresaAtual().nome}</div>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#c9a24a]">{rotulo}</div>
            <div className="text-3xl sm:text-[34px] font-black tracking-tight text-white leading-tight mt-1 uppercase break-words">
              {titulo}
            </div>
            <div className="text-[11px] text-[#a7d6ba] mt-1 tabular-nums">{subtitulo}</div>
            {destaque && <div className="mt-2">{destaque}</div>}
          </div>
        </div>
        <div className="relative mt-4 text-[10px] text-[#8abaa0]">{linhaContatoEmpresa()}</div>
      </div>
      <div className="h-[3px] bg-[linear-gradient(90deg,#9c7a2e,#e2c27a,#9c7a2e)]" />
    </>
  );
}
