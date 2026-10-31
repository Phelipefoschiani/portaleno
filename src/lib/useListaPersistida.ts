import { useCallback, useEffect, useRef, useState } from 'react';

type Atualizacao<T> = T[] | ((anterior: T[]) => T[]);

/**
 * Estado de lista sincronizado com o armazenamento local.
 * - Carrega com `carregar()` na montagem e sempre que `evento` (ou 'storage', de outra aba) disparar.
 * - Toda alteração feita pelo setter é gravada com `salvar()`.
 */
export function useListaPersistida<T>(
  carregar: () => T[],
  salvar: (lista: T[]) => void,
  evento: string
): [T[], (atualizacao: Atualizacao<T>) => void] {
  const [lista, setLista] = useState<T[]>(carregar);
  const ref = useRef<T[]>(lista);
  ref.current = lista;

  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  useEffect(() => {
    const recarregar = () => {
      const nova = carregarRef.current();
      ref.current = nova;
      setLista(nova);
    };
    window.addEventListener(evento, recarregar);
    window.addEventListener('storage', recarregar);
    return () => {
      window.removeEventListener(evento, recarregar);
      window.removeEventListener('storage', recarregar);
    };
  }, [evento]);

  const atualizar = useCallback((atualizacao: Atualizacao<T>) => {
    const nova = typeof atualizacao === 'function'
      ? (atualizacao as (anterior: T[]) => T[])(ref.current)
      : atualizacao;
    ref.current = nova;
    setLista(nova);
    salvarRef.current(nova);
  }, []);

  return [lista, atualizar];
}
