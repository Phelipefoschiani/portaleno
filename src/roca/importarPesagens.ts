// Lado do administrador: traz as pesagens feitas no app da roça e cria os cálculos na roça
// (com o pedido de compra), igual à tela de Cálculo na roça. Só apaga do banco depois de criar.
import { supabase } from '../lib/supabase';
import {
  CalculoNaRoca,
  carregarCalculosNaRoca,
  criarCalculoNaRocaELancarPedidoCompra,
  proximoNumeroTicketRoca,
} from '../data/calculoRocaData';
import { PesagemRoca } from './calculo';
import { TABELA_PESAGENS_APP } from './sincronizar';

/** Converte a pesagem do app no cálculo que o sistema já usa. */
function paraCalculo(p: PesagemRoca & { id: string }, numeroTicket: string): CalculoNaRoca {
  return {
    id: `roca_${p.id}`,
    numero_ticket: numeroTicket,
    data: p.data,
    hora: new Date(p.criado_em).toTimeString().slice(0, 5),
    fornecedor_id: p.agricultor_id,
    fornecedor_nome: p.agricultor_nome,
    fornecedor_propriedade: p.agricultor_propriedade,
    fornecedor_cidade_uf: p.agricultor_cidade_uf,
    fornecedor_cpf_cnpj: p.agricultor_cpf_cnpj,
    fornecedor_chave_pix: p.agricultor_chave_pix,
    fornecedor_tipo: 'AGRICULTOR',
    local_pesagem: p.local_pesagem,
    pesador_responsavel: p.pesador_responsavel,
    preco_por_kg: p.preco_por_kg,
    preco_por_tonelada: p.preco_por_kg * 1000,
    sacos: p.sacos,
    total_sacos: p.sacos.length,
    peso_total_kg: p.peso_liquido_kg,
    peso_medio_saco_kg: p.sacos.length > 0 ? parseFloat((p.peso_bruto_kg / p.sacos.length).toFixed(3)) : 0,
    valor_total_estimado: p.valor_total,
    peso_bruto_kg: p.peso_bruto_kg,
    desconto_percentual: p.desconto_percentual || undefined,
    desconto_tara_kg: p.desconto_tara_kg || undefined,
    desconto_kg: p.desconto_kg,
    motivo_desconto: p.motivo_desconto,
    observacoes: p.observacoes,
    pedido_compra_id: `ped_roca_${p.id}`,
    situacao_pagamento: 'PENDENTE_DEFINICAO',
    criado_em: p.criado_em,
  };
}

/** Puxa as pesagens do app, cria os cálculos que ainda não existem e apaga as linhas importadas. */
export async function importarPesagensDoApp(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.from(TABELA_PESAGENS_APP).select('id, dados');
  if (error || !data || data.length === 0) return 0;

  let importadas = 0;
  for (const linha of data) {
    const pesagem = { ...(linha.dados as PesagemRoca), id: linha.id as string };
    const jaExiste = carregarCalculosNaRoca().some(c => c.id === `roca_${pesagem.id}`);
    if (!jaExiste) {
      const ticket = proximoNumeroTicketRoca(carregarCalculosNaRoca());
      criarCalculoNaRocaELancarPedidoCompra(paraCalculo(pesagem, ticket));
      importadas += 1;
    }
    const { error: erroApagar } = await supabase.from(TABELA_PESAGENS_APP).delete().eq('id', linha.id);
    if (erroApagar) console.error('Pesagem importada, mas não apagou do banco:', erroApagar.message);
  }
  if (importadas > 0) window.dispatchEvent(new Event('calculos_roca_updated'));
  return importadas;
}
