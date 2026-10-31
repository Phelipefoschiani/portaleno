// Pipeline Integrado do Grupo ENO Agroindustrial
// Interliga: Matéria-Prima -> Custo Produto -> Orçamento -> Venda -> Produção -> Despesas -> Financeiro

import {
  carregarMateriaPrima,
  salvarMateriaPrima,
  carregarEstoqueProdutos,
  salvarEstoqueProdutos,
  carregarReceitas,
  calcularStatusMateriaPrima,
  calcularStatusProduto,
  converterQuantidade,
  normalizarUnidade,
  MateriaPrimaEstoque,
  ReceitaIndustrial
} from './produtosData';

import {
  carregarTitulosReceber,
  salvarTitulosReceber,
  carregarTitulosPagar,
  salvarTitulosPagar,
  carregarDespesas,
  salvarDespesas,
  carregarNotasSaida,
  salvarNotasSaida,
  carregarNotasEntrada,
  salvarNotasEntrada,
  carregarReceitasExtras,
  ehDespesaProgramada,
  registrarBaixaNoCaixa,
  TituloReceber,
  TituloPagar,
  DespesaOperacional,
  NotaFiscalSaida,
  NotaFiscalEntrada
} from './financeiroData';

import {
  carregarPedidosVenda,
  PedidoVenda,
  pacotesDoItem
} from './pedidosVendaData';

import { carregarClientes } from './clientesData';

import {
  carregarControleSitio,
  DespesaSitio
} from './sitioControleData';

import { hojeISO, paraISO, somarDias } from '../lib/datas';

// Reexporta utilitários de unidade para quem já importa do pipeline
export { normalizarUnidade, converterQuantidade };

const semAcento = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const ehMandioca = (nome: string) => {
  const n = semAcento(nome);
  return n.includes('mandioca') || n.includes('raiz');
};

const ehSacaria = (nome: string) => {
  const n = semAcento(nome);
  return n.includes('saco') || n.includes('rafia');
};

// Recalcula o status da matéria-prima (regra única)
function comStatusAtualizado(mp: MateriaPrimaEstoque): MateriaPrimaEstoque {
  return { ...mp, status: calcularStatusMateriaPrima(mp.estoque_atual, mp.estoque_minimo) };
}

/**
 * Localiza a matéria-prima cadastrada que corresponde a um item comprado.
 * Ordem: id informado -> nome exato -> nome contido na descrição -> palavras-chave (mandioca, sacaria, lenha).
 */
export function localizarMateriaPrimaCadastrada(
  descricaoItem: string,
  materias: MateriaPrimaEstoque[] = carregarMateriaPrima(),
  materiaPrimaId?: string
): MateriaPrimaEstoque | undefined {
  if (materiaPrimaId) {
    const porId = materias.find(m => m.id === materiaPrimaId);
    if (porId) return porId;
  }
  const desc = semAcento(descricaoItem).trim();
  if (!desc) return undefined;

  const exato = materias.find(m => semAcento(m.nome).trim() === desc);
  if (exato) return exato;

  const contido = materias
    .filter(m => semAcento(m.nome).trim().length >= 3 && desc.includes(semAcento(m.nome).trim()))
    .sort((a, b) => b.nome.length - a.nome.length)[0];
  if (contido) return contido;

  if (desc.includes('mandioca') || desc.includes('raiz')) {
    const mp = materias.find(m => ehMandioca(m.nome));
    if (mp) return mp;
  }
  if (desc.includes('saco') || desc.includes('rafia') || desc.includes('embalag')) {
    const mp = materias.find(m => ehSacaria(m.nome));
    if (mp) return mp;
  }
  if (desc.includes('lenha') || desc.includes('biomassa')) {
    const mp = materias.find(m => semAcento(m.nome).includes('lenha') || semAcento(m.nome).includes('biomassa'));
    if (mp) return mp;
  }
  return undefined;
}

export interface RegistroEntradaMateriaPrima {
  materia_prima_id: string;
  materia_prima_nome: string;
  quantidade: number; // já convertida para a unidade da matéria-prima
  unidade: string;
  valor_total: number;
  nf_entrada_id?: string;
  data: string;
}

/**
 * 1. MATÉRIA-PRIMA: Dá entrada de matéria-prima cadastrada no estoque (com conversão de unidade,
 * custo médio ponderado e status recalculado) e registra a NF de Entrada.
 * Retorna null quando o item não corresponde a uma matéria-prima cadastrada ou a unidade não é conversível.
 * Quem chama é responsável por garantir que a entrada aconteça uma única vez.
 */
export function integrarEntradaMateriaPrima(params: {
  descricaoItem: string;
  quantidade: number;
  unidade: string;
  valorTotal: number;
  fornecedorNome: string;
  fornecedorCpfCnpj?: string;
  tipoParceiro?: 'Agricultor' | 'Fornecedor';
  numeroNF?: string;
  chavePix?: string;
  data?: string;
  materiaPrimaId?: string;
}): RegistroEntradaMateriaPrima | null {
  const data = paraISO(params.data) || hojeISO();
  const materias = carregarMateriaPrima();
  const mp = localizarMateriaPrimaCadastrada(params.descricaoItem, materias, params.materiaPrimaId);
  if (!mp) return null;

  const qtdConvertida = converterQuantidade(Number(params.quantidade) || 0, params.unidade, mp.unidade_medida);
  if (qtdConvertida === null || qtdConvertida <= 0) return null;

  const estoqueAnterior = Math.max(0, Number(mp.estoque_atual) || 0);
  const custoAnterior = Number(mp.custo_medio_unitario) || 0;
  const valor = Number(params.valorTotal) || 0;
  const novoEstoque = parseFloat((estoqueAnterior + qtdConvertida).toFixed(3));
  // Custo médio ponderado: acompanha o preço real pago (ex.: preço da mandioca)
  const novoCusto = valor > 0 && novoEstoque > 0
    ? parseFloat(((estoqueAnterior * custoAnterior + valor) / novoEstoque).toFixed(4))
    : custoAnterior;

  const atualizadas = materias.map(m =>
    m.id === mp.id
      ? comStatusAtualizado({ ...m, estoque_atual: novoEstoque, custo_medio_unitario: novoCusto })
      : m
  );
  salvarMateriaPrima(atualizadas);

  // Registra Nota Fiscal de Entrada
  let nfId: string | undefined;
  try {
    const notasEntrada = carregarNotasEntrada();
    nfId = `nfe_ent_${Date.now()}`;
    const kg = converterQuantidade(Number(params.quantidade) || 0, params.unidade, 'KG');
    const pesoEhMassa = ['KG', 'TON'].includes(normalizarUnidade(params.unidade));
    const novaNfe: NotaFiscalEntrada = {
      id: nfId,
      numero: params.numeroNF || `ENT-${Date.now().toString().slice(-6)}`,
      serie: '1',
      chave_acesso: '',
      parceiro_nome: params.fornecedorNome,
      tipo_parceiro: params.tipoParceiro || (ehMandioca(params.descricaoItem) ? 'Agricultor' : 'Fornecedor'),
      cnpj_cpf: params.fornecedorCpfCnpj || '',
      produto_descricao: params.descricaoItem,
      peso_liquido_kg: pesoEhMassa && kg !== null ? kg : 0,
      valor_total: valor,
      data_emissao: data,
      status_sefaz: 'PROCESSADA'
    };
    notasEntrada.unshift(novaNfe);
    salvarNotasEntrada(notasEntrada);
  } catch (err) {
    console.error('Erro ao integrar NF de entrada:', err);
    nfId = undefined;
  }

  return {
    materia_prima_id: mp.id,
    materia_prima_nome: mp.nome,
    quantidade: qtdConvertida,
    unidade: mp.unidade_medida,
    valor_total: valor,
    nf_entrada_id: nfId,
    data
  };
}

/**
 * Estorna uma entrada de matéria-prima feita anteriormente (ex.: exclusão do pedido de compra).
 */
export function estornarEntradaMateriaPrima(registro?: RegistroEntradaMateriaPrima | null): void {
  if (!registro) return;
  const materias = carregarMateriaPrima();
  const atualizadas = materias.map(m =>
    m.id === registro.materia_prima_id
      ? comStatusAtualizado({
          ...m,
          estoque_atual: Math.max(0, parseFloat(((Number(m.estoque_atual) || 0) - registro.quantidade).toFixed(3)))
        })
      : m
  );
  salvarMateriaPrima(atualizadas);
  if (registro.nf_entrada_id) {
    try {
      salvarNotasEntrada(carregarNotasEntrada().filter(n => n.id !== registro.nf_entrada_id));
    } catch (err) {
      console.error('Erro ao estornar NF de entrada:', err);
    }
  }
}

// Fator kg de mandioca in natura por kg de produto: receita quando existir, 3,7 só como fallback
const FATOR_MANDIOCA_PADRAO = 3.7;

function fatorMandiocaDaReceita(rec?: ReceitaIndustrial): number {
  if (!rec) return FATOR_MANDIOCA_PADRAO;
  const itensMp = rec.materias_primas || [];
  const itemRaiz = itensMp.find(m => ehMandioca(m.materia_prima_nome));
  if (itensMp.length > 0 && !itemRaiz) return 0; // receita sem mandioca não consome mandioca
  if (rec.kg_mandioca_por_kg_produto && rec.kg_mandioca_por_kg_produto > 0) return rec.kg_mandioca_por_kg_produto;
  const rendimentoKg = rec.rendimento_total_kg || (rec.rendimento_pacotes || 0) * (rec.peso_por_pacote_kg || 0);
  if (itemRaiz && rendimentoKg > 0) {
    const kgRaiz = converterQuantidade(itemRaiz.quantidade, itemRaiz.unidade_medida, 'KG');
    if (kgRaiz && kgRaiz > 0) return kgRaiz / rendimentoKg;
  }
  return FATOR_MANDIOCA_PADRAO;
}

/**
 * 2. PRODUÇÃO: Ao finalizar a ordem de produção:
 * - Alimenta o estoque de produtos acabados com o que foi REALMENTE apontado (0 apontado = 0)
 * - Consome a matéria-prima pela receita do produto (mandioca pelo fator da receita; 3,7 só como fallback)
 */
export function integrarConclusaoProducao(pedido: PedidoVenda): void {
  if (pedido.producao_integrada) return;

  const produtos = carregarEstoqueProdutos();
  const receitas = carregarReceitas();
  const materias = carregarMateriaPrima();
  let houveAlteracaoProduto = false;

  const consumo = new Map<string, number>(); // materia_prima_id -> qtd na unidade da MP
  const somarConsumo = (id: string, qtd: number) => consumo.set(id, (consumo.get(id) || 0) + qtd);
  let kgMandiocaConsumida = 0;
  let embalagensSemReceita = 0;

  pedido.itens.forEach(item => {
    const embalagensProduzidas = Number(item.quantidade_produzida) || 0;
    if (embalagensProduzidas <= 0) return;

    const prodIdx = produtos.findIndex(p => p.id === item.produto_id);
    const idx = prodIdx >= 0 ? prodIdx : produtos.findIndex(p => p.nome === item.produto_nome);
    const prod = idx >= 0 ? produtos[idx] : undefined;

    const pacotes = pacotesDoItem(item, embalagensProduzidas);
    const pesoPacote = Number(item.peso_unitario_kg) || Number(prod?.peso_unitario_kg) || 0;
    const pesoKg = pacotes * pesoPacote;

    if (prod) {
      houveAlteracaoProduto = true;
      const novoKg = (Number(prod.estoque_atual_kg) || 0) + pesoKg;
      produtos[idx] = {
        ...prod,
        estoque_atual_sacos: (Number(prod.estoque_atual_sacos) || 0) + pacotes,
        estoque_atual_kg: novoKg,
        lote_recente: item.lote_producao || pedido.lote_producao || prod.lote_recente,
        status: calcularStatusProduto(novoKg, prod.estoque_minimo_kg)
      };
    }

    const rec = prod?.receita_id ? receitas.find(r => r.id === prod.receita_id) : undefined;
    kgMandiocaConsumida += pesoKg * fatorMandiocaDaReceita(rec);

    if (rec && (rec.rendimento_pacotes || 0) > 0 && (rec.materias_primas || []).length > 0) {
      const proporcao = pacotes / rec.rendimento_pacotes;
      rec.materias_primas.forEach(mi => {
        if (ehMandioca(mi.materia_prima_nome)) return; // mandioca já tratada pelo fator
        const mp = materias.find(m => m.id === mi.materia_prima_id);
        if (!mp) return;
        const qtd = converterQuantidade((Number(mi.quantidade) || 0) * proporcao, mi.unidade_medida, mp.unidade_medida);
        if (qtd !== null && qtd > 0) somarConsumo(mp.id, qtd);
      });
    } else {
      embalagensSemReceita += embalagensProduzidas;
    }
  });

  if (houveAlteracaoProduto) {
    salvarEstoqueProdutos(produtos);
  }

  if (kgMandiocaConsumida > 0) {
    const mpMandioca = materias.find(m => ehMandioca(m.nome));
    if (mpMandioca) {
      const qtd = converterQuantidade(kgMandiocaConsumida, 'KG', mpMandioca.unidade_medida);
      if (qtd !== null) somarConsumo(mpMandioca.id, qtd);
    }
  }
  if (embalagensSemReceita > 0) {
    const mpSaco = materias.find(m => ehSacaria(m.nome));
    if (mpSaco) somarConsumo(mpSaco.id, embalagensSemReceita);
  }

  if (consumo.size > 0) {
    const materiasAtualizadas = materias.map(mat => {
      const qtd = consumo.get(mat.id);
      if (!qtd) return mat;
      return comStatusAtualizado({
        ...mat,
        estoque_atual: Math.max(0, parseFloat(((Number(mat.estoque_atual) || 0) - qtd).toFixed(3)))
      });
    });
    salvarMateriaPrima(materiasAtualizadas);
  }
}

/**
 * Extrai os prazos (em dias) de um texto de condição de pagamento.
 * Ex.: "Boleto Bancário 28 Dias" -> [28]; "28/35/42 dias" -> [28, 35, 42]; "À Vista" -> [0]
 */
export function extrairPrazosDias(texto?: string): number[] {
  const t = semAcento(texto || '');
  const numeros = (t.match(/\d+/g) || []).map(Number).filter(n => n >= 0 && n <= 365);
  if (numeros.length > 0) return numeros;
  if (t.includes('vista') || t.includes('antecipad') || t.includes('pix') || t.includes('dinheiro')) return [0];
  return [28];
}

/**
 * 3. FATURAMENTO & VENDA: Ao faturar pedido de venda:
 * - Dá baixa no estoque de produto acabado (em pacotes, multiplicando fardos/caixas)
 * - Gera Contas a Receber pelo valor da NF, com vencimento pelo prazo do pedido/cliente a partir do faturamento
 * - Gera Nota Fiscal de Saída (NF-e)
 */
export function integrarFaturamentoPedidoVenda(pedido: PedidoVenda): void {
  if (pedido.faturamento_integrado) return;
  const dataFaturamento = paraISO(pedido.data_faturamento) || hojeISO();
  const valorNota = Number(pedido.valor_faturado) || Number(pedido.nota_fiscal?.valor_nota) || Number(pedido.valor_total) || 0;

  // 1. Baixa do estoque de produto acabado
  const produtos = carregarEstoqueProdutos();
  let houveBaixa = false;
  let pesoTotalKg = 0;

  pedido.itens.forEach(item => {
    const prodIdx = produtos.findIndex(p => p.id === item.produto_id);
    const idx = prodIdx >= 0 ? prodIdx : produtos.findIndex(p => p.nome === item.produto_nome);
    const prod = idx >= 0 ? produtos[idx] : undefined;
    const pacotes = pacotesDoItem(item);
    const pesoKg = pacotes * (Number(item.peso_unitario_kg) || Number(prod?.peso_unitario_kg) || 0);
    pesoTotalKg += pesoKg;

    if (prod) {
      houveBaixa = true;
      const novoSacos = Math.max(0, (Number(prod.estoque_atual_sacos) || 0) - pacotes);
      const novoKg = Math.max(0, (Number(prod.estoque_atual_kg) || 0) - pesoKg);
      produtos[idx] = {
        ...prod,
        estoque_atual_sacos: novoSacos,
        estoque_atual_kg: novoKg,
        status: calcularStatusProduto(novoKg, prod.estoque_minimo_kg)
      };
    }
  });

  if (houveBaixa) {
    salvarEstoqueProdutos(produtos);
  }

  // 2. Gera Título(s) a Receber no Financeiro
  try {
    const titulosReceber = carregarTitulosReceber();
    const jaExiste = titulosReceber.some(t => t.pedido_venda_id === pedido.id);

    if (!jaExiste && valorNota > 0) {
      const numDocBase = pedido.nota_fiscal?.numero
        ? `FAT-${pedido.nota_fiscal.numero}`
        : `FAT-${pedido.numero_pedido.replace(/\D/g, '')}`;

      const cliente = carregarClientes().find(c => c.id === pedido.cliente_id);
      const prazoTexto = pedido.prazo_pagamento || cliente?.prazo_pagamento_nome || '';
      const prazos = extrairPrazosDias(prazoTexto);
      const n = prazos.length;
      const valorParcela = Math.floor((valorNota / n) * 100) / 100;

      const novos: TituloReceber[] = prazos.map((dias, i) => {
        const valor = i === n - 1 ? parseFloat((valorNota - valorParcela * (n - 1)).toFixed(2)) : valorParcela;
        return {
          id: `rec_auto_${pedido.id}_${i + 1}_${Date.now()}`,
          pedido_venda_id: pedido.id,
          numero_documento: n > 1 ? `${numDocBase}-${i + 1}/${n}` : numDocBase,
          cliente_nome: pedido.cliente_nome,
          cliente_cnpj: pedido.cliente_cnpj_cpf,
          valor,
          data_emissao: dataFaturamento,
          data_vencimento: somarDias(dataFaturamento, dias),
          status: 'EM_ABERTO',
          forma_pagamento: prazoTexto || pedido.forma_pagamento || '',
          banco_emissor: '',
          observacoes: `Faturamento do Pedido ${pedido.numero_pedido}${pedido.lote_producao ? ` | Lote: ${pedido.lote_producao}` : ''}${n > 1 ? ` | Parcela ${i + 1}/${n}` : ''}.`
        };
      });

      salvarTitulosReceber([...novos, ...titulosReceber]);
    }
  } catch (err) {
    console.error('Erro ao gerar contas a receber:', err);
  }

  // 3. Gera Nota Fiscal de Saída (NF-e)
  try {
    const notasSaida = carregarNotasSaida();
    const nfNumero = pedido.nota_fiscal?.numero || pedido.numero_pedido.replace(/\D/g, '');
    const jaExisteNf = notasSaida.some(n =>
      n.id.startsWith(`nfe_sai_auto_${pedido.id}_`) || (!!pedido.nota_fiscal?.numero && n.numero === nfNumero)
    );

    if (!jaExisteNf) {
      const novaNfSaida: NotaFiscalSaida = {
        id: `nfe_sai_auto_${pedido.id}_${Date.now()}`,
        numero: nfNumero,
        serie: pedido.nota_fiscal?.serie || '1',
        chave_acesso: pedido.nota_fiscal?.chave_acesso || '',
        cliente_nome: pedido.cliente_nome,
        cnpj_cpf: pedido.cliente_cnpj_cpf,
        valor_total: valorNota,
        peso_liquido_kg: pesoTotalKg || pedido.peso_total_kg,
        data_emissao: paraISO(pedido.nota_fiscal?.data_emissao) || dataFaturamento,
        status_sefaz: 'AUTORIZADA',
        transportadora: pedido.transportadora || pedido.programacao_entrega?.transportadora || '',
        placa: pedido.placa_veiculo || pedido.programacao_entrega?.placa || ''
      };

      notasSaida.unshift(novaNfSaida);
      salvarNotasSaida(notasSaida);
    }
  } catch (err) {
    console.error('Erro ao gerar NF de saída:', err);
  }
}

/**
 * Infere se a despesa do sítio já foi paga a partir da forma de pagamento da nota.
 */
function despesaSitioJaPaga(formaPagamento?: string): boolean {
  const f = semAcento(formaPagamento || '');
  if (!f) return true;
  if (/vista|pix|dinheiro|especie|cartao|debito|retirada direta/.test(f)) return true;
  if (/boleto|prazo|faturado|a pagar|\d+\s*dias/.test(f)) return false;
  return true;
}

function categoriaSitio(tipo: DespesaSitio['tipo']): string {
  if (tipo === 'COMBUSTIVEL' || tipo === 'LUBRIFICANTE') return 'Combustível & Lubrificantes';
  if (tipo === 'PECA' || tipo === 'MANUTENCAO') return 'Manutenção & Peças';
  return 'Outros';
}

/**
 * 4. SÍTIO & COMBUSTÍVEL: Integra despesas do sítio ao financeiro do Grupo ENO
 * Regra: já pago -> só Despesa paga | a pagar -> só Título a Pagar. Nunca os dois para o mesmo valor.
 * Idempotente: a mesma despesa do sítio não é lançada duas vezes.
 */
export function integrarDespesaSitioAoFinanceiro(
  despesa: DespesaSitio,
  opcoes?: { situacao?: 'PAGO' | 'A_PAGAR'; dataVencimento?: string }
): void {
  try {
    const idDespesa = `desp_sitio_${despesa.id}`;
    const idTitulo = `pag_sitio_${despesa.id}`;
    const despesas = carregarDespesas();
    const titulosPagar = carregarTitulosPagar();
    const jaLancado =
      despesas.some(d => d.id === idDespesa || d.id.startsWith(`${idDespesa}_`)) ||
      titulosPagar.some(t => t.id === idTitulo || t.id.startsWith(`${idTitulo}_`));
    if (jaLancado) return;

    const formaPagamento = despesa.notaFiscal?.formaPagamento || '';
    const pago = opcoes?.situacao ? opcoes.situacao === 'PAGO' : despesaSitioJaPaga(formaPagamento);
    const data = paraISO(despesa.data) || hojeISO();
    const categoria = categoriaSitio(despesa.tipo);

    if (pago) {
      const novaDespesa: DespesaOperacional & Record<string, any> = {
        id: idDespesa,
        tipo_despesa: 'REALIZADA',
        status_despesa: 'PAGO',
        data,
        categoria,
        descricao: `[Controle do Sítio] ${despesa.nomeDespesa} (${despesa.produto}) - ${despesa.quantidade} ${despesa.unidade}`,
        valor: despesa.valorTotal,
        setor: 'Frotas & Logística',
        responsavel: despesa.responsavel,
        forma_pagamento: formaPagamento || 'À Vista',
        comprovante_anexo: true
      };
      salvarDespesas([novaDespesa, ...despesas]);
      registrarBaixaNoCaixa(`despesa:${novaDespesa.id}`, -(Number(novaDespesa.valor) || 0));
    } else {
      const dias = extrairPrazosDias(formaPagamento)[0] || 30;
      const novoPagar: TituloPagar = {
        id: idTitulo,
        numero_documento: despesa.notaFiscal?.numero || `SITIO-${despesa.id}`,
        favorecido_nome: despesa.notaFiscal?.emitente || 'Fornecedor do Sítio',
        tipo_favorecido: 'Fornecedor',
        categoria: categoria as TituloPagar['categoria'],
        valor: despesa.valorTotal,
        data_emissao: data,
        data_vencimento: paraISO(opcoes?.dataVencimento) || somarDias(data, dias),
        status: 'A_PAGAR',
        forma_pagamento: formaPagamento || 'Boleto',
        observacoes: `Operação do Sítio: ${despesa.maquinaTrator} - ${despesa.produto}`
      };
      salvarTitulosPagar([novoPagar, ...titulosPagar]);
    }
  } catch (err) {
    console.error('Erro ao integrar despesa do sítio ao financeiro:', err);
  }
}

// Chave de origem para reconhecer pares legados despesa/título criados juntos (ex.: sítio)
const chaveOrigemSitio = (id: string) =>
  id.startsWith('pag_sitio_') || id.startsWith('desp_sitio_')
    ? id.replace(/^(pag|desp)_sitio_/, '').replace(/_\d{10,}$/, '')
    : '';

/**
 * Indica se um título a pagar já está representado por uma despesa realizada (para não contar duas vezes).
 * Vínculo: titulo.despesa_id, despesa.titulo_pagar_id ou (legado) mesmo pedido de compra e mesmo valor.
 */
export function tituloPagarTemDespesaVinculada(titulo: TituloPagar, despesasRealizadas: DespesaOperacional[]): boolean {
  const t: any = titulo;
  if (t.despesa_id && despesasRealizadas.some(d => d.id === t.despesa_id)) return true;
  if (despesasRealizadas.some((d: any) => d.titulo_pagar_id === titulo.id)) return true;
  if (titulo.pedido_compra_id) {
    const mesmoValor = despesasRealizadas.some((d: any) =>
      d.pedido_compra_id === titulo.pedido_compra_id &&
      Math.abs((Number(d.valor) || 0) - (Number(titulo.valor) || 0)) < 0.01
    );
    if (mesmoValor) return true;
  }
  const chave = chaveOrigemSitio(titulo.id);
  if (chave && despesasRealizadas.some(d => chaveOrigemSitio(d.id) === chave)) return true;
  return false;
}

/**
 * 5. CONSOLIDAÇÃO GERAL: Calcula indicadores consolidados de ponta a ponta
 * - Faturamento = títulos a receber (inclui os gerados por venda) + receitas extras
 * - Despesas = despesas realizadas (sem as PROGRAMADAS) + títulos a pagar sem despesa vinculada
 */
export function obterConsolidadoGeral() {
  const pedidosVenda = carregarPedidosVenda();
  const titulosReceber = carregarTitulosReceber();
  const receitasExtras = carregarReceitasExtras();
  const despesas = carregarDespesas();
  const titulosPagar = carregarTitulosPagar();
  const produtosEstoque = carregarEstoqueProdutos();
  const materiasPrimas = carregarMateriaPrima();
  const controleSitio = carregarControleSitio();

  // Faturamento real (sem dupla contagem)
  const faturamentoTitulos = titulosReceber.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const totalReceitasExtras = receitasExtras.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
  const faturamentoTotal = faturamentoTitulos + totalReceitasExtras;

  // Despesas totais
  const despesasRealizadas = despesas.filter(d => !ehDespesaProgramada(d));
  const totalDespesasOperacionais = despesasRealizadas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const totalContasPagarSemDespesa = titulosPagar
    .filter(t => !tituloPagarTemDespesaVinculada(t, despesasRealizadas))
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const totalDespesas = totalDespesasOperacionais + totalContasPagarSemDespesa;

  // Lucro líquido (considera receitas extras)
  const lucroLiquido = faturamentoTotal - totalDespesas;
  const margemLucroLiquido = faturamentoTotal > 0 ? (lucroLiquido / faturamentoTotal) * 100 : 0;

  // Estoque produtos acabados
  const totalSacosEstoque = produtosEstoque.reduce((acc, p) => acc + (p.estoque_atual_sacos || 0), 0);
  const totalKgEstoque = produtosEstoque.reduce((acc, p) => acc + (p.estoque_atual_kg || 0), 0);
  const valorEstoqueProdutos = produtosEstoque.reduce((acc, p) => acc + ((p.estoque_atual_sacos || 0) * (p.preco_unitario_venda || 0)), 0);

  // Estoque matéria-prima (só unidades de massa entram em toneladas)
  const totalMateriaPrimaTon = materiasPrimas.reduce((acc, m) => {
    if (!['KG', 'TON'].includes(normalizarUnidade(m.unidade_medida))) return acc;
    return acc + (converterQuantidade(m.estoque_atual || 0, m.unidade_medida, 'TON') || 0);
  }, 0);
  const valorEstoqueMateriaPrima = materiasPrimas.reduce((acc, m) => acc + ((m.estoque_atual || 0) * (m.custo_medio_unitario || 0)), 0);

  return {
    faturamentoTotal,
    faturamentoTitulos,
    totalReceitasExtras,
    totalDespesas,
    totalDespesasOperacionais,
    totalContasPagarSemDespesa,
    lucroLiquido,
    margemLucroLiquido,
    totalSacosEstoque,
    totalKgEstoque,
    valorEstoqueProdutos,
    totalMateriaPrimaTon,
    valorEstoqueMateriaPrima,
    totalLitrosCombustivelSitio: controleSitio.totalLitrosDisponivel,
    pedidosEmProducao: pedidosVenda.filter(p => p.etapa === 'EM_PRODUCAO').length,
    pedidosAFaturar: pedidosVenda.filter(p => p.etapa === 'A_FATURAR').length,
    pedidosFaturados: pedidosVenda.filter(p => p.etapa === 'FATURADO').length,
    pedidosEntregues: pedidosVenda.filter(p => p.etapa === 'ENTREGUE').length
  };
}
