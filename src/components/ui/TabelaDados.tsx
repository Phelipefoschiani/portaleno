import React from 'react';

/**
 * Padrão de tabela densa do sistema. Use os componentes ou as classes em `tabela`.
 * Valores monetários e quantidades: <Td numero> (alinhado à direita, tabular-nums).
 */
export const tabela = {
  moldura: 'bg-papel border border-linha rounded-md overflow-hidden',
  table: 'w-full text-left border-collapse text-[13px]',
  thead: 'bg-papel-2 border-b border-linha-forte',
  th: 'py-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza whitespace-nowrap',
  tr: 'border-b border-linha last:border-b-0 hover:bg-papel-3/50 transition-colors',
  td: 'py-2.5 px-3 align-middle text-tinta-2',
};

export function TabelaDados({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${tabela.moldura} ${className}`}>
      <div className="overflow-x-auto">
        <table className={tabela.table}>{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, numero, className = '' }: { children?: React.ReactNode; numero?: boolean; className?: string }) {
  return <th className={`${tabela.th} ${numero ? 'text-right' : ''} ${className}`}>{children}</th>;
}

export function Td({ children, numero, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { numero?: boolean }) {
  return (
    <td {...props} className={`${tabela.td} ${numero ? 'text-right tabular-nums whitespace-nowrap' : ''} ${className}`}>
      {children}
    </td>
  );
}
