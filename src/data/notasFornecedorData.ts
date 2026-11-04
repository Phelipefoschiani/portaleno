// Nota fiscal do fornecedor (NF-e de entrada) ligada a despesas e compras.
// Guarda os dados da nota na despesa/compra e um registro nas Notas de Entrada, sem repetir a mesma chave.
import { carregarNotasEntrada, salvarNotasEntrada } from './financeiroData';
import type { DadosNFe } from '../lib/nfeXml';
import { hojeISO } from '../lib/datas';

export interface NotaFornecedor {
  numero: string;
  serie: string;
  chave: string; // vazio quando a nota foi só digitada (sem XML)
  data_emissao: string; // AAAA-MM-DD
  emitente_nome: string;
  emitente_documento: string;
  valor: number;
  protocolo?: string;
  importada_xml: boolean;
}

export function notaDoXml(d: DadosNFe): NotaFornecedor {
  return {
    numero: d.numero,
    serie: d.serie || '1',
    chave: d.chave,
    data_emissao: d.data_emissao || hojeISO(),
    emitente_nome: d.emitente.nome,
    emitente_documento: d.emitente.documento,
    valor: d.valor_total,
    protocolo: d.protocolo || undefined,
    importada_xml: true
  };
}

export const textoNota = (n?: NotaFornecedor | null) => (n ? `NF ${n.numero}${n.serie && n.serie !== '1' ? `-${n.serie}` : ''}` : '');

/** Já existe uma nota de entrada com esta chave? Devolve a descrição de onde ela está. */
export function notaEntradaJaGuardada(chave: string): string | null {
  const c = (chave || '').replace(/\D/g, '');
  if (!c) return null;
  const achada = carregarNotasEntrada().find(n => (n.chave_acesso || '').replace(/\D/g, '') === c);
  return achada ? `NF ${achada.numero} de ${achada.parceiro_nome} (${achada.produto_descricao})` : null;
}

/** Registra a nota nas Notas de Entrada (uma vez por chave; nota digitada sem chave entra sempre). */
export function guardarNotaEntrada(
  nota: NotaFornecedor,
  vinculo: { despesa_id?: string; pedido_compra_id?: string; descricao: string; peso_kg?: number }
): void {
  if (nota.chave && notaEntradaJaGuardada(nota.chave)) return;
  const lista = carregarNotasEntrada();
  lista.unshift({
    id: `nfe_ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    numero: nota.numero,
    serie: nota.serie || '1',
    chave_acesso: nota.chave,
    parceiro_nome: nota.emitente_nome,
    tipo_parceiro: 'Fornecedor',
    cnpj_cpf: nota.emitente_documento,
    produto_descricao: vinculo.descricao,
    peso_liquido_kg: vinculo.peso_kg || 0,
    valor_total: nota.valor,
    data_emissao: nota.data_emissao,
    status_sefaz: nota.protocolo ? 'AUTORIZADA' : 'PROCESSADA',
    despesa_id: vinculo.despesa_id,
    pedido_compra_id: vinculo.pedido_compra_id
  });
  salvarNotasEntrada(lista);
}

/** Tira das Notas de Entrada as notas de uma despesa ou compra excluída. */
export function removerNotasEntradaDoVinculo(vinculo: { despesa_id?: string; pedido_compra_id?: string }): void {
  const lista = carregarNotasEntrada();
  const restantes = lista.filter(n =>
    !((vinculo.despesa_id && n.despesa_id === vinculo.despesa_id) || (vinculo.pedido_compra_id && n.pedido_compra_id === vinculo.pedido_compra_id))
  );
  if (restantes.length !== lista.length) salvarNotasEntrada(restantes);
}
