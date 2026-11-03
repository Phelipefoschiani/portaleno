import React from 'react';

/**
 * Faixa de números principais: uma superfície só, dividida por hairlines,
 * com a régua dourada dos documentos no topo. Nada de cards soltos com ícone.
 * Primeiro filho = número principal (mais largo).
 */
export function FaixaNumeros({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-papel border border-linha rounded-md overflow-hidden ${className}`}>
      <div className="h-[3px] filete-ouro" aria-hidden />
      <div className="grid grid-cols-2 gap-px bg-linha lg:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))]">{children}</div>
    </section>
  );
}

interface CardNumeroProps {
  rotulo: string;
  /** Valor já formatado (sem a unidade). */
  valor: React.ReactNode;
  /** Unidade/moeda exibida menor ao lado do valor (ex.: "R$", "sacos"). */
  unidade?: string;
  unidadeAntes?: boolean;
  detalhe?: React.ReactNode;
  /** Muda só a cor do detalhe quando há algo a resolver. */
  alerta?: 'vencido' | 'aguardando';
  /** Número principal: maior, ocupa a linha inteira no celular. */
  destaque?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CardNumero({ rotulo, valor, unidade, unidadeAntes, detalhe, alerta, destaque, onClick, className = '' }: CardNumeroProps) {
  const corDetalhe =
    alerta === 'vencido' ? 'text-st-vencido font-semibold' : alerta === 'aguardando' ? 'text-st-aguardando font-semibold' : 'text-cinza';
  const unid = unidade && (
    <span className={`${destaque ? 'text-[15px]' : 'text-[12px]'} font-semibold text-cinza tracking-normal`}>{unidade}</span>
  );
  const conteudo = (
    <>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">{rotulo}</div>
      <div
        className={`mt-2 flex items-baseline gap-1 tabular-nums tracking-[-0.02em] text-tinta font-extrabold leading-none ${
          destaque ? 'text-[32px] sm:text-[36px]' : 'text-[21px] sm:text-[23px]'
        }`}
      >
        {unidadeAntes && unid}
        <span className="truncate">{valor}</span>
        {!unidadeAntes && unid}
      </div>
      {detalhe && <div className={`mt-2 text-[12px] tabular-nums truncate ${corDetalhe}`}>{detalhe}</div>}
    </>
  );
  const base = `text-left px-4 sm:px-5 py-4 min-w-0 ${destaque ? 'col-span-2 lg:col-span-1 bg-eno-50' : 'bg-papel'} ${className}`;
  if (!onClick) return <div className={base}>{conteudo}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} cursor-pointer hover:bg-papel-3/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ouro transition-colors`}
    >
      {conteudo}
    </button>
  );
}
