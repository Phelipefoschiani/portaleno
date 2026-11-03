/**
 * Tabela que vira lista de cartões no celular (< 640px), sem duplicar o JSX.
 * Cada <td> recebe data-rotulo="..." (o rótulo aparece acima do valor no cartão).
 * A primeira célula vira o título do cartão (linha inteira, sem rótulo).
 * A partir de sm volta a ser a tabela densa normal.
 */
export const TABELA_CARTAO = [
  'max-sm:block max-sm:[&_thead]:hidden max-sm:[&_tbody]:block',
  'max-sm:[&_tbody>tr]:grid max-sm:[&_tbody>tr]:grid-cols-2 max-sm:[&_tbody>tr]:gap-x-4 max-sm:[&_tbody>tr]:gap-y-2',
  'max-sm:[&_tbody>tr]:px-3.5 max-sm:[&_tbody>tr]:py-3 max-sm:[&_tbody>tr]:border-b max-sm:[&_tbody>tr]:border-linha',
  'max-sm:[&_td]:p-0 max-sm:[&_td]:text-left max-sm:[&_td]:min-w-0 max-sm:[&_td]:break-words',
  'max-sm:[&_td:first-child]:col-span-2 max-sm:[&_td:first-child]:text-[14px]',
  'max-sm:[&_td]:before:block max-sm:[&_td]:before:content-[attr(data-rotulo)]',
  'max-sm:[&_td]:before:text-[10px] max-sm:[&_td]:before:font-bold max-sm:[&_td]:before:uppercase',
  'max-sm:[&_td]:before:tracking-[0.12em] max-sm:[&_td]:before:text-cinza',
  'max-sm:[&_td:first-child]:before:hidden',
].join(' ');
