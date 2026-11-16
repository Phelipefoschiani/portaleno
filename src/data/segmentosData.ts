// Segmentos / canais de venda das tabelas de preço (lista editável pelo administrador).
// Cada tabela guarda o nome do segmento; renomear um segmento atualiza as tabelas que o usam.

export interface SegmentoVenda {
  id: string;
  nome: string;
}

const STORAGE_KEY_SEGMENTOS = 'grupo_eno_segmentos_venda_v1';

export const SEGMENTOS_INICIAIS: SegmentoVenda[] = [
  { id: 'seg_atacado', nome: 'Atacado / Distribuidor' },
  { id: 'seg_varejo', nome: 'Varejo / Padarias' },
  { id: 'seg_grandes', nome: 'Grandes Indústrias (Carga Fechada)' },
  { id: 'seg_fob', nome: 'Pagamento à Vista (FOB)' },
];

export function carregarSegmentosVenda(): SegmentoVenda[] {
  if (typeof window === 'undefined') return SEGMENTOS_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEGMENTOS);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY_SEGMENTOS, JSON.stringify(SEGMENTOS_INICIAIS));
      return SEGMENTOS_INICIAIS;
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return SEGMENTOS_INICIAIS;
  }
}

export function salvarSegmentosVenda(lista: SegmentoVenda[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SEGMENTOS, JSON.stringify(lista));
  window.dispatchEvent(new Event('segmentos_venda_updated'));
}
