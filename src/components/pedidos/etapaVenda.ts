import type { PedidoVenda } from '../../data/pedidosVendaData';
import type { TomStatus } from '../ui/StatusChip';

// Rótulo e tom de status da etapa do pedido de venda (mesmo significado em todas as telas)
export const ROTULO_ETAPA_VENDA: Record<PedidoVenda['etapa'], string> = {
  ORCAMENTO: 'Aguardando aprovação',
  EM_PRODUCAO: 'Em produção',
  A_FATURAR: 'A faturar',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
};

export const TOM_ETAPA_VENDA: Record<PedidoVenda['etapa'], TomStatus> = {
  ORCAMENTO: 'aguardando',
  EM_PRODUCAO: 'producao',
  A_FATURAR: 'aguardando',
  FATURADO: 'pago',
  ENTREGUE: 'neutro',
};
