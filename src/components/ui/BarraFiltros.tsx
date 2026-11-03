import React from 'react';
import { Search } from 'lucide-react';

/** Linha única de filtros: segmentado à esquerda, busca e seletores à direita. */
export function BarraFiltros({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`shrink-0 px-4 sm:px-6 pb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between ${className}`}>
      {children}
    </div>
  );
}

export interface OpcaoSegmentado<T extends string> {
  valor: T;
  rotulo: string;
  contagem?: number;
}

/** Controle segmentado (tipo/situação). Rola por dentro no celular, nunca a página. */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  rotuloAria,
  className = '',
}: {
  opcoes: OpcaoSegmentado<T>[];
  valor: T;
  onChange: (v: T) => void;
  rotuloAria: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={rotuloAria} className={`flex max-w-full overflow-x-auto rounded-md border border-linha-forte bg-papel p-0.5 ${className}`}>
      {opcoes.map(o => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(o.valor)}
            className={`shrink-0 whitespace-nowrap h-7 px-3 rounded-[5px] text-[12.5px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
              ativo ? 'bg-eno-800 text-white' : 'text-tinta-2 hover:bg-papel-3'
            }`}
          >
            {o.rotulo}
            {!!o.contagem && (
              <span className={`ml-1.5 tabular-nums font-normal ${ativo ? 'text-white/70' : 'text-cinza'}`}>{o.contagem}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CampoBusca({
  valor,
  onChange,
  placeholder,
  className = '',
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Search className="w-3.5 h-3.5 text-cinza absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 pl-8 pr-2.5 rounded-md border border-linha-forte bg-papel text-[13px] text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15"
      />
    </label>
  );
}

export function SeletorFiltro({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-8 rounded-md border border-linha-forte bg-papel px-2.5 text-[13px] font-medium text-tinta-2 focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15 cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}
