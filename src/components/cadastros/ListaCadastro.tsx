import React from 'react';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';

export interface ColunaCadastro<T> {
  titulo: string;
  numero?: boolean;
  centro?: boolean;
  className?: string;
  render: (item: T) => React.ReactNode;
}

export interface CartaoCadastro {
  /** Linha pequena acima do título (código, tipo). */
  sobre?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  /** Situação à direita do título. */
  status?: React.ReactNode;
  /** Linhas extras de detalhe. */
  detalhes?: React.ReactNode[];
}

/**
 * Lista padrão dos cadastros: cartões no celular, tabela densa a partir de sm.
 * Mesmo desenho da lista de Vendas.
 */
export function ListaCadastro<T>({
  itens,
  chave,
  colunas,
  cartao,
  acoesCartao,
  acoesLinha,
}: {
  itens: T[];
  chave: (item: T) => string;
  colunas: ColunaCadastro<T>[];
  cartao: (item: T) => CartaoCadastro;
  acoesCartao?: (item: T) => React.ReactNode;
  acoesLinha?: (item: T) => React.ReactNode;
}) {
  return (
    <>
      {/* Celular: cartões */}
      <ul className="sm:hidden bg-papel border border-linha rounded-md">
        {itens.map(item => {
          const c = cartao(item);
          return (
            <li key={chave(item)} className="px-3.5 py-3 border-b border-linha last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {c.sobre && <div className="text-[11.5px] text-cinza tabular-nums truncate">{c.sobre}</div>}
                  <div className="text-[14px] font-bold text-tinta leading-snug line-clamp-2">{c.titulo}</div>
                  {c.subtitulo && <div className="text-[11.5px] text-cinza truncate tabular-nums">{c.subtitulo}</div>}
                </div>
                {c.status && <div className="shrink-0">{c.status}</div>}
              </div>
              {c.detalhes && c.detalhes.filter(Boolean).length > 0 && (
                <div className="mt-1.5 space-y-0.5 text-[12px] text-tinta-2 tabular-nums">
                  {c.detalhes.filter(Boolean).map((d, i) => (
                    <div key={i} className="truncate">{d}</div>
                  ))}
                </div>
              )}
              {acoesCartao && <div className="flex gap-2 mt-2.5">{acoesCartao(item)}</div>}
            </li>
          );
        })}
      </ul>

      {/* A partir de sm: tabela densa */}
      <TabelaDados className="hidden sm:block">
        <thead className={tabela.thead}>
          <tr>
            {colunas.map(col => (
              <React.Fragment key={col.titulo}>
                <Th numero={col.numero} className={col.centro ? 'text-center' : ''}>{col.titulo}</Th>
              </React.Fragment>
            ))}
            {acoesLinha && <Th className="text-right">Ações</Th>}
          </tr>
        </thead>
        <tbody>
          {itens.map(item => (
            <tr key={chave(item)} className={tabela.tr}>
              {colunas.map(col => (
                <React.Fragment key={col.titulo}>
                  <Td numero={col.numero} className={`${col.centro ? 'text-center' : ''} ${col.className || ''}`}>
                    {col.render(item)}
                  </Td>
                </React.Fragment>
              ))}
              {acoesLinha && <Td className="text-right whitespace-nowrap">{acoesLinha(item)}</Td>}
            </tr>
          ))}
        </tbody>
      </TabelaDados>
    </>
  );
}

/** Link de ação de linha com texto (ex.: "Compras"). */
export function LinkLinha({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 hover:text-eno-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
    >
      {children}
    </button>
  );
}
