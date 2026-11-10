// Envio único dos dados guardados neste navegador para o banco (Supabase).
// Feito pelo administrador, na primeira vez que entra com o banco ligado.
// Cada chave do sistema vai para a tabela correspondente; listas viram uma linha por registro.
import { supabase } from './supabase';

/** Chave guardada no navegador -> tabela no banco. */
export const TABELAS_DO_SISTEMA: Record<string, string> = {
  grupo_eno_agricultores_v1: 'agricultores',
  grupo_eno_cadastros_provisorios_v1: 'cadastros_provisorios',
  grupo_eno_calculos_roca_v1: 'calculos_roca',
  grupo_eno_categorias_produto_v1: 'categorias_produto',
  grupo_eno_clientes_v1: 'clientes',
  grupo_eno_colaboradores_producao_v1: 'colaboradores_producao',
  grupo_eno_comprovantes_v1: 'comprovantes',
  grupo_eno_custos_v1: 'custos',
  grupo_eno_fichas_tecnicas_v1: 'fichas_tecnicas',
  grupo_eno_financeiro_caixa_baixas_v1: 'financeiro_caixa_baixas',
  grupo_eno_financeiro_caixa_invest_v1: 'financeiro_caixa_invest',
  grupo_eno_financeiro_caixa_movimentos_v1: 'financeiro_caixa_movimentos',
  grupo_eno_financeiro_despesas_v1: 'financeiro_despesas',
  grupo_eno_financeiro_notas_entrada_v1: 'financeiro_notas_entrada',
  grupo_eno_financeiro_notas_saida_v1: 'financeiro_notas_saida',
  grupo_eno_financeiro_pagar_v1: 'financeiro_pagar',
  grupo_eno_financeiro_receber_v1: 'financeiro_receber',
  grupo_eno_financeiro_receitas_v1: 'financeiro_receitas',
  grupo_eno_fornecedores_v1: 'fornecedores',
  grupo_eno_lotes_materia_prima_v1: 'lotes_materia_prima',
  grupo_eno_materia_prima_v1: 'materia_prima',
  grupo_eno_movimentos_mp_v1: 'movimentos_mp',
  grupo_eno_ordens_producao_v1: 'ordens_producao',
  grupo_eno_pedidos_compra_v2: 'pedidos_compra',
  grupo_eno_pedidos_portfolio_v1: 'pedidos_portfolio',
  grupo_eno_pedidos_venda_v1: 'pedidos_venda',
  grupo_eno_produtos_estoque_v1: 'produtos_estoque',
  grupo_eno_rcas_v1: 'rcas',
  grupo_eno_receitas_v1: 'receitas',
  grupo_eno_romaneios_mandioca_v1: 'romaneios_mandioca',
  grupo_eno_sitio_controle_despesas_v3: 'sitio_controle_despesas',
  grupo_eno_tabelas_preco_v1: 'tabelas_preco',
  grupo_eno_vendas_rca_v1: 'vendas_rca',
  grupo_eno_empresa_v1: 'empresa',
};

/** Marca neste navegador que o envio já foi feito (não repete). */
const CHAVE_ENVIO_FEITO = 'eno_envio_banco_v1';
const TAMANHO_LOTE = 500;

export function envioJaFeitoNeste(): boolean {
  try {
    return !!localStorage.getItem(CHAVE_ENVIO_FEITO);
  } catch {
    return false;
  }
}

/** Há algum dado guardado neste navegador para enviar? */
export function existemDadosParaEnviar(): boolean {
  return Object.keys(TABELAS_DO_SISTEMA).some(k => {
    const v = localStorage.getItem(k);
    return !!v && v !== '[]' && v !== '{}' && v !== 'null';
  });
}

/** Linhas (id + dados) de uma chave guardada no navegador. */
function linhasDaChave(valor: unknown): { id: string; dados: unknown }[] {
  if (Array.isArray(valor)) {
    return valor
      .filter(x => x && typeof x === 'object' && (typeof (x as any).id === 'string' || typeof (x as any).id === 'number'))
      .map(x => ({ id: String((x as any).id), dados: x }));
  }
  if (valor && typeof valor === 'object') return [{ id: 'unico', dados: valor }];
  return [];
}

/**
 * Envia tudo o que está neste navegador para o banco.
 * Usa "upsert" (cria ou atualiza pelo id), então pode ser repetido sem duplicar.
 */
export async function enviarDadosDesteNavegador(): Promise<{ linhas: number; tabelas: number; erros: string[] }> {
  if (!supabase) throw new Error('Banco de dados não configurado.');
  const erros: string[] = [];
  let linhas = 0;
  let tabelas = 0;

  for (const [chave, tabela] of Object.entries(TABELAS_DO_SISTEMA)) {
    const bruto = localStorage.getItem(chave);
    if (!bruto) continue;
    let valor: unknown;
    try {
      valor = JSON.parse(bruto);
    } catch {
      erros.push(`${tabela}: dado guardado em formato inválido (não enviado).`);
      continue;
    }
    const registros = linhasDaChave(valor).map(l => ({ id: l.id, dados: l.dados }));
    if (registros.length === 0) continue;

    let ok = true;
    for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
      const lote = registros.slice(i, i + TAMANHO_LOTE);
      const { error } = await supabase.from(tabela).upsert(lote, { onConflict: 'id' });
      if (error) {
        ok = false;
        erros.push(`${tabela}: ${error.message}`);
        break;
      }
    }
    if (ok) {
      tabelas += 1;
      linhas += registros.length;
    }
  }

  // Só marca como feito se nada falhou; se falhou, pode tentar de novo
  if (erros.length === 0) {
    try {
      localStorage.setItem(CHAVE_ENVIO_FEITO, new Date().toISOString());
    } catch {
      /* sem armazenamento: o envio pode ser repetido, sem duplicar */
    }
  }
  return { linhas, tabelas, erros };
}
