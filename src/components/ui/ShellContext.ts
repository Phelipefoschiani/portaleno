import { createContext, useContext } from 'react';

/**
 * true quando a tela está dentro do shell administrativo, que já mostra
 * breadcrumb + submenu da seção. As abas antigas de cada módulo
 * (PedidosNavTabs, ProdutosNavTabs, FinanceiroNavTabs) se escondem nesse caso.
 */
export const DentroDoShell = createContext(false);
export const useDentroDoShell = () => useContext(DentroDoShell);
