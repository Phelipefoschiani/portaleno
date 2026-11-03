import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip, TomStatus } from '../ui/StatusChip';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, Secao, Campo, form, BotaoIcone, BotaoCartao, Aviso, FaixaTotal, FaixaNumerosProdutos, TabelaResponsiva } from './kitProdutos';
import {
  ProdutoEstoque,
  ReceitaIndustrial,
  ImpostoProduto,
  carregarEstoqueProdutos,
  salvarEstoqueProdutos,
  carregarReceitas,
  calcularStatusProduto,
  vincularReceitaAoProduto,
  consumoPorPacoteDaReceita,
  calcularImpostosCusto,
  derivarTipoEmbalagem,
  carregarTabelasPreco,
  TabelaPreco
} from '../../data/produtosData';
import { calcularPrecoNaTabela, carregarPrecosDoProduto, salvarPrecosDoProduto } from '../../data/precosData';
import { PrecosProdutoTabelas, tabelasDoCadastroDeProduto } from './PrecosProdutoTabelas';
import { CategoriaProdutoCampo, useCategoriasProduto } from './CategoriaProdutoCampo';
import { formatarMoeda } from '../../data/financeiroData';
import { hojeISO } from '../../lib/datas';

const loteSugerido = () => `LOTE-ENO-${hojeISO().slice(2).replace(/-/g, '')}`;
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosEstoqueCadastro({ onNavigate }: Props) {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [receitas, setReceitas] = useState<ReceitaIndustrial[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');

  // Modal Novo / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<ProdutoEstoque | null>(null);
  // Preço do produto em cada tabela de preço (tabelaId -> preço do pacote)
  const [precosTabelas, setPrecosTabelas] = useState<Record<string, number>>({});
  const categorias = useCategoriasProduto();
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>(() => carregarTabelasPreco());

  // Form State (preço de venda e embalagem primária não ficam no produto: preço vem das tabelas,
  // embalagem é derivada do peso unitário)
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '' as ProdutoEstoque['categoria'],
    peso_unitario_kg: 1,
    estoque_atual_sacos: 0,
    estoque_minimo_kg: 0,
    localizacao_galpao: '',
    lote_recente: loteSugerido(),
    // Vínculo com a Receita e Custos
    receita_id: '',
    receita_nome: '',
    custo_materia_prima: 0,
    impostos: [] as ImpostoProduto[],
    custo_operacional: 0,
    tipo_acondicionamento: 'Caixa' as 'Fardo' | 'Caixa' | 'Saco' | 'Avulso',
    unidades_por_acondicionamento: 10
  });

  const recarregar = () => {
    setProdutos(carregarEstoqueProdutos());
    setReceitas(carregarReceitas());
    setTabelasPreco(carregarTabelasPreco());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('produtos_updated', handleUpdate);
    window.addEventListener('receitas_updated', handleUpdate);
    window.addEventListener('tabelas_preco_updated', handleUpdate);
    return () => {
      window.removeEventListener('produtos_updated', handleUpdate);
      window.removeEventListener('receitas_updated', handleUpdate);
      window.removeEventListener('tabelas_preco_updated', handleUpdate);
    };
  }, []);

  // Preços do produto nas tabelas (lista): faixa de preço e pior margem líquida
  const resumoTabelas = (prod: ProdutoEstoque) => {
    const calcs = tabelasPreco
      .map(t => calcularPrecoNaTabela(prod, t))
      .filter(c => c.na_tabela);
    if (calcs.length === 0) return null;
    const precos = calcs.map(c => c.preco);
    return {
      qtd: calcs.length,
      min: Math.min(...precos),
      max: Math.max(...precos),
      negativas: calcs.filter(c => c.margem_negativa).length
    };
  };

  // Seleção de Receita no formulário (puxa proporção e custo de insumos automaticamente)
  const handleSelecionarReceita = (receitaId: string) => {
    const rec = receitas.find(r => r.id === receitaId);
    if (!rec) {
      setFormData(prev => ({
        ...prev,
        receita_id: '',
        receita_nome: '',
        custo_materia_prima: 0
      }));
      return;
    }

    const custoTotalRec = rec.custo_total_materias_primas || (rec.materias_primas || []).reduce((acc, m) => acc + (m.custo_total || 0), 0);
    const rendimento = rec.rendimento_pacotes && rec.rendimento_pacotes > 0 ? rec.rendimento_pacotes : 1;
    // Pega o custo da receita e divide pela quantidade de unidades que ela rende:
    const custoInsumo = rec.custo_por_pacote && rec.custo_por_pacote > 0 ? rec.custo_por_pacote : (custoTotalRec / rendimento);
    const peso = rec.peso_por_pacote_kg || 1;
    const tipoEmb = (rec.tipo_embalagem as any) || 'Pacote 1kg';
    const acond: 'Fardo' | 'Caixa' | 'Saco' = tipoEmb.includes('Fardo') ? 'Fardo' : tipoEmb.includes('Caixa') ? 'Caixa' : tipoEmb.includes('Saco') ? 'Saco' : 'Caixa';
    const unidades = tipoEmb.includes('Fardo') ? 10 : tipoEmb.includes('Caixa') ? 10 : 1;

    setFormData(prev => ({
      ...prev,
      receita_id: rec.id,
      receita_nome: rec.nome || rec.produto_nome || '',
      nome: prev.nome ? prev.nome : (rec.nome || rec.produto_nome || ''),
      peso_unitario_kg: peso,
      custo_materia_prima: parseFloat(custoInsumo.toFixed(2)),
      tipo_acondicionamento: acond,
      unidades_por_acondicionamento: unidades
    }));
  };

  // Cálculos do formulário em tempo real. Custo = insumos + operacional + impostos de base Custo/Fixo.
  // Impostos de base Venda incidem sobre o preço de cada tabela (margem na seção "Preços nas tabelas").
  const calculosFormulario = useMemo(() => {
    const custoMp = formData.custo_materia_prima || 0;
    const custoOp = formData.custo_operacional || 0;
    const baseCusto = custoMp + custoOp;
    const impostosValor = calcularImpostosCusto(formData.impostos, baseCusto);
    const impostosVenda = formData.impostos.filter(i => i.base === 'Venda');
    const percentualVenda = impostosVenda.filter(i => i.tipo === 'Porcentagem').reduce((a, i) => a + (Number(i.valor) || 0), 0);
    const valorFixoVenda = impostosVenda.filter(i => i.tipo !== 'Porcentagem').reduce((a, i) => a + (Number(i.valor) || 0), 0);
    return {
      custoMp,
      custoOp,
      impostosValor,
      custoTotal: baseCusto + impostosValor,
      percentualVenda,
      valorFixoVenda
    };
  }, [formData]);

  const handleAdicionarImposto = () => {
    const novo: ImpostoProduto = {
      id: `imp_${Date.now()}`,
      nome: 'ICMS',
      base: 'Venda',
      tipo: 'Porcentagem',
      valor: 7.0
    };
    setFormData(prev => ({ ...prev, impostos: [...prev.impostos, novo] }));
  };

  const handleRemoverImposto = (id: string) => {
    setFormData(prev => ({ ...prev, impostos: prev.impostos.filter(i => i.id !== id) }));
  };

  const handleAtualizarImposto = (id: string, campo: keyof ImpostoProduto, valor: any) => {
    setFormData(prev => ({
      ...prev,
      impostos: prev.impostos.map(i => i.id === id ? { ...i, [campo]: valor } : i)
    }));
  };

  // Métricas
  const metricas = useMemo(() => {
    const totalItens = produtos.length;
    const volumeTotalKg = produtos.reduce((acc, p) => acc + p.estoque_atual_kg, 0);
    // A custo: o produto não tem preço próprio (cada tabela tem o seu)
    const valorPatrimonial = produtos.reduce((acc, p) => acc + (Number(p.estoque_atual_sacos) || 0) * (Number(p.custo_total) || 0), 0);
    const criticos = produtos.filter(p => p.status === 'ESTOQUE_BAIXO' || p.status === 'CRITICO').length;

    return { totalItens, volumeTotalKg, valorPatrimonial, criticos };
  }, [produtos]);

  // Filtros
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const match =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        p.localizacao_galpao.toLowerCase().includes(busca.toLowerCase());

      if (!match) return false;
      if (filtroCategoria !== 'TODAS' && p.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [produtos, busca, filtroCategoria]);

  const handleAbrirNovo = () => {
    setModoEdicao(null);
    setPrecosTabelas({});
    // Só receitas com matéria-prima podem originar produto
    const recPadrao = receitas.find(r => (r.materias_primas || []).length > 0);
    const custoMp = recPadrao ? (recPadrao.custo_por_pacote || 0) : 0;
    const tipoEmb = (recPadrao?.tipo_embalagem as any) || 'Pacote 1kg';
    const acond: 'Fardo' | 'Caixa' | 'Saco' = tipoEmb.includes('Fardo') ? 'Fardo' : tipoEmb.includes('Caixa') ? 'Caixa' : tipoEmb.includes('Saco') ? 'Saco' : 'Caixa';
    const unidades = tipoEmb.includes('Fardo') ? 10 : tipoEmb.includes('Caixa') ? 10 : 1;

    setFormData({
      codigo: `PRD-${Date.now().toString().slice(-4)}`,
      nome: recPadrao ? (recPadrao.nome || recPadrao.produto_nome || '') : '',
      categoria: filtroCategoria !== 'TODAS' ? filtroCategoria : categorias.length === 1 ? categorias[0] : '',
      peso_unitario_kg: recPadrao?.peso_por_pacote_kg || 1,
      estoque_atual_sacos: 0,
      estoque_minimo_kg: 0,
      localizacao_galpao: '',
      lote_recente: loteSugerido(),
      receita_id: recPadrao ? recPadrao.id : '',
      receita_nome: recPadrao ? (recPadrao.nome || recPadrao.produto_nome || '') : '',
      custo_materia_prima: parseFloat(custoMp.toFixed(2)),
      impostos: [],
      custo_operacional: 0,
      tipo_acondicionamento: acond,
      unidades_por_acondicionamento: unidades
    });
    setModalAberto(true);
  };

  const handleAbrirEdicao = (prod: ProdutoEstoque) => {
    setModoEdicao(prod);
    setPrecosTabelas(carregarPrecosDoProduto(prod.id));
    setFormData({
      codigo: prod.codigo,
      nome: prod.nome,
      categoria: prod.categoria,
      peso_unitario_kg: prod.peso_unitario_kg,
      estoque_atual_sacos: prod.estoque_atual_sacos,
      estoque_minimo_kg: prod.estoque_minimo_kg,
      localizacao_galpao: prod.localizacao_galpao,
      lote_recente: prod.lote_recente,
      receita_id: prod.receita_id || '',
      receita_nome: prod.receita_nome || '',
      custo_materia_prima: prod.custo_materia_prima || 0,
      impostos: prod.impostos || [],
      custo_operacional: prod.custo_operacional || 0,
      tipo_acondicionamento: (prod.tipo_acondicionamento as any) || 'Caixa',
      unidades_por_acondicionamento: prod.unidades_por_acondicionamento || 10
    });
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formData.unidades_por_acondicionamento >= 1)) {
      alert('Informe quantas unidades vão em cada ' + formData.tipo_acondicionamento.toLowerCase() + ' (mínimo 1).');
      return;
    }
    if (!(formData.peso_unitario_kg > 0)) {
      alert('Informe o peso de cada unidade (kg).');
      return;
    }
    const pesoTotal = formData.estoque_atual_sacos * formData.peso_unitario_kg;
    const status: ProdutoEstoque['status'] = calcularStatusProduto(pesoTotal, formData.estoque_minimo_kg);

    const dadosCusto = {
      receita_id: formData.receita_id || undefined,
      receita_nome: formData.receita_nome || undefined,
      custo_materia_prima: calculosFormulario.custoMp,
      impostos: formData.impostos,
      impostos_valor: parseFloat(calculosFormulario.impostosValor.toFixed(2)),
      custo_operacional: formData.custo_operacional,
      custo_total: parseFloat(calculosFormulario.custoTotal.toFixed(2)),
      tipo_acondicionamento: formData.tipo_acondicionamento,
      unidades_por_acondicionamento: formData.unidades_por_acondicionamento,
      // Embalagem primária derivada do peso (compatibilidade com telas que leem tipo_embalagem)
      tipo_embalagem: derivarTipoEmbalagem(formData.peso_unitario_kg),
      // Preço/margem do produto são legados: o preço vem só das tabelas
      preco_venda_acondicionamento: undefined,
      margem_lucro_percentual: undefined
    };

    if (!String(formData.categoria || '').trim()) {
      alert('Escolha a categoria do produto (ou crie uma no botão +).');
      return;
    }

    // Validação estrita: produto só existe com receita, e a receita precisa ter matéria-prima
    const recVinculada = receitas.find(r => r.id === formData.receita_id);
    if (!formData.receita_id || !recVinculada) {
      alert('Erro: É obrigatório selecionar uma receita válida para o produto.');
      return;
    }
    if ((recVinculada.materias_primas || []).length === 0) {
      alert('Erro: A receita selecionada não tem nenhuma matéria-prima. Cadastre a composição da receita antes de cadastrar o produto.');
      return;
    }
    if (calculosFormulario.custoTotal <= 0) {
      alert('Erro: O produto deve possuir um custo de produção calculado (Ficha Técnica/Receita).');
      return;
    }

    const produtoId = modoEdicao ? modoEdicao.id : `prod_est_${Date.now()}`;

    if (modoEdicao) {
      const atualizados = produtos.map(p => {
        if (p.id === modoEdicao.id) {
          return {
            ...p,
            ...formData,
            ...dadosCusto,
            estoque_atual_kg: pesoTotal,
            status
          };
        }
        return p;
      });
      salvarEstoqueProdutos(atualizados);
    } else {
      const novo: ProdutoEstoque = {
        id: produtoId,
        ...formData,
        preco_unitario_venda: 0,
        ...dadosCusto,
        estoque_atual_kg: pesoTotal,
        status
      };
      salvarEstoqueProdutos([novo, ...produtos]);
    }

    // Vínculo gravado nos dois lados (receita.produto_id) e preços nas tabelas
    vincularReceitaAoProduto(produtoId, formData.nome, formData.receita_id);
    // Tabelas com valor passam a ter o produto; tabelas ativas deixadas em branco deixam de vendê-lo
    salvarPrecosDoProduto(produtoId, precosTabelas, tabelasDoCadastroDeProduto().map(t => t.id));

    setModalAberto(false);
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja excluir este item do cadastro de produtos?')) {
      salvarEstoqueProdutos(produtos.filter(p => p.id !== id));
    }
  };

  const unidadeSaldo = (item: ProdutoEstoque) => {
    const emb = String(item.tipo_embalagem || '');
    return emb.startsWith('Big Bag') ? 'bags' : emb.includes('Caixa') ? 'caixas' : emb.includes('Fardo') ? 'fardos' : emb.startsWith('Saco') ? 'sacos' : 'pacotes';
  };
  const situacao = (item: ProdutoEstoque): { tom: TomStatus; rotulo: string } =>
    item.status === 'EM_ESTOQUE'
      ? { tom: 'pago', rotulo: 'Normal' }
      : item.status === 'CRITICO'
      ? { tom: 'vencido', rotulo: 'Crítico' }
      : { tom: 'aguardando', rotulo: 'Estoque baixo' };
  const acondTexto = (item: ProdutoEstoque) => {
    const acondQtd = item.unidades_por_acondicionamento || 1;
    const acondTipo = item.tipo_acondicionamento || (item.tipo_embalagem.includes('Fardo') ? 'Fardo' : item.tipo_embalagem.includes('Caixa') ? 'Caixa' : 'Saco');
    return `${acondTipo} ${acondQtd > 1 ? `c/ ${acondQtd} un` : 'avulso'}`;
  };
  const faixaPreco = (r: NonNullable<ReturnType<typeof resumoTabelas>>) =>
    r.min === r.max ? formatarMoeda(r.min) : `${formatarMoeda(r.min)} – ${formatarMoeda(r.max)}`;
  const ton = (kg: number) => (kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  const semNenhum = produtos.length === 0;
  const recSelecionada = receitas.find(r => r.id === formData.receita_id);

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_estoque_cadastro" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Produtos acabados"
            resumo={
              semNenhum ? (
                'Nenhum produto cadastrado'
              ) : (
                <>
                  {metricas.totalItens} {metricas.totalItens === 1 ? 'produto' : 'produtos'}
                  {metricas.criticos > 0 && (
                    <span className="font-semibold text-st-aguardando"> · {metricas.criticos} abaixo do mínimo</span>
                  )}
                </>
              )
            }
            acoes={
              semNenhum ? undefined : (
                <BotaoPrimario onClick={handleAbrirNovo} className="w-full sm:w-auto h-11 sm:h-9">
                  <Plus className="w-4 h-4" />
                  Novo produto
                </BotaoPrimario>
              )
            }
          />

          {!semNenhum && (
            <div className="px-4 sm:px-6 pb-4">
              <FaixaNumerosProdutos colunas={3}>
                <CardNumero
                  destaque
                  rotulo="Valor em estoque (a custo)"
                  unidade="R$"
                  unidadeAntes
                  valor={metricas.valorPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  detalhe="Saldo × custo total de cada produto"
                />
                <CardNumero rotulo="Estoque físico" valor={ton(metricas.volumeTotalKg)} unidade="t" detalhe={`${metricas.volumeTotalKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`} />
                <CardNumero
                  rotulo="Abaixo do mínimo"
                  valor={metricas.criticos}
                  unidade={metricas.criticos === 1 ? 'item' : 'itens'}
                  detalhe={metricas.criticos > 0 ? 'Repor estoque' : 'Tudo acima do mínimo'}
                  alerta={metricas.criticos > 0 ? 'aguardando' : undefined}
                />
              </FaixaNumerosProdutos>
            </div>
          )}

          {!semNenhum && (
            <BarraFiltros>
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produto, código ou galpão" className="w-full md:w-80" />
              <SeletorFiltro value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} aria-label="Categoria" className="w-full md:w-auto">
                <option value="TODAS">Todas as categorias</option>
                {categorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </SeletorFiltro>
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-8">
            {produtosFiltrados.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                {semNenhum ? (
                  <EstadoVazio
                    titulo="Nenhum produto acabado"
                    texto="O produto nasce de uma receita com matéria-prima. Cadastre o produto, a embalagem de envio e o preço em cada tabela."
                    acao={
                      <BotaoPrimario onClick={handleAbrirNovo}>
                        <Plus className="w-4 h-4" />
                        Novo produto
                      </BotaoPrimario>
                    }
                  />
                ) : (
                  <EstadoVazio
                    titulo="Nenhum produto com esses filtros"
                    texto="Mude a busca ou a categoria para ver os outros produtos."
                    acao={
                      <BotaoSecundario onClick={() => { setBusca(''); setFiltroCategoria('TODAS'); }}>Limpar filtros</BotaoSecundario>
                    }
                  />
                )}
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <ul className="sm:hidden bg-papel border border-linha rounded-md">
                  {produtosFiltrados.map(item => {
                    const resumo = resumoTabelas(item);
                    const st = situacao(item);
                    const custo = item.custo_total || item.custo_materia_prima || 0;
                    return (
                      <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-tinta leading-snug">{item.nome}</div>
                            <div className="text-[11.5px] text-cinza tabular-nums truncate">
                              {item.codigo} · {item.categoria} · {acondTexto(item)}
                            </div>
                          </div>
                          <StatusChip tom={st.tom} className="shrink-0">{st.rotulo}</StatusChip>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div className="text-[12px] text-cinza tabular-nums">
                            <span className="font-semibold text-tinta-2">
                              {item.estoque_atual_sacos.toLocaleString('pt-BR')} {unidadeSaldo(item)}
                            </span>{' '}
                            · {ton(item.estoque_atual_kg)} t
                            <div>custo {formatarMoeda(custo)}</div>
                          </div>
                          <div className="text-right min-w-0">
                            {resumo ? (
                              <>
                                <div className="text-[16px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{faixaPreco(resumo)}</div>
                                <div className={`text-[11px] tabular-nums ${resumo.negativas > 0 ? 'font-semibold text-st-vencido' : 'text-cinza'}`}>
                                  {resumo.negativas > 0 ? `margem negativa em ${resumo.negativas}` : `em ${resumo.qtd} ${resumo.qtd === 1 ? 'tabela' : 'tabelas'}`}
                                </div>
                              </>
                            ) : (
                              <StatusChip tom="aguardando">Sem preço em tabela</StatusChip>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2.5">
                          <BotaoCartao onClick={() => handleAbrirEdicao(item)}>
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </BotaoCartao>
                          <BotaoIcone rotulo={`Excluir ${item.nome}`} perigo onClick={() => handleExcluir(item.id)} className="border border-linha-forte">
                            <Trash2 className="w-4 h-4" />
                          </BotaoIcone>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Computador: tabela densa */}
                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Produto</Th>
                      <Th>Categoria</Th>
                      <Th>Envio</Th>
                      <Th numero>Custo</Th>
                      <Th numero>Preço nas tabelas</Th>
                      <Th numero>Saldo</Th>
                      <Th>Situação</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(item => {
                      const custoTotalUnit = item.custo_total || item.custo_materia_prima || 0;
                      const resumo = resumoTabelas(item);
                      const st = situacao(item);
                      const consumo = consumoPorPacoteDaReceita(receitas.find(r => r.id === item.receita_id));
                      return (
                        <tr key={item.id} className={`${tabela.tr} group`}>
                          <Td className="max-w-[420px]">
                            <button type="button" onClick={() => handleAbrirEdicao(item)} className="text-left font-semibold text-tinta group-hover:text-eno-700 cursor-pointer">
                              {item.nome}
                            </button>
                            <div className="text-[11.5px] text-cinza tabular-nums">
                              {item.codigo} · {item.tipo_embalagem}
                              {item.receita_nome && <> · receita {item.receita_nome}</>}
                            </div>
                            {consumo.length > 0 && (
                              <div className="text-[11px] text-cinza-claro leading-snug truncate" title={consumo.map(c => `${c.quantidade_por_pacote.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${c.unidade_medida} ${c.materia_prima_nome}`).join(' · ')}>
                                Por pacote: {consumo.map(c => `${c.quantidade_por_pacote.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${c.unidade_medida} ${c.materia_prima_nome}`).join(' · ')}
                              </div>
                            )}
                          </Td>
                          <Td>{item.categoria}</Td>
                          <Td className="whitespace-nowrap">{acondTexto(item)}</Td>
                          <Td numero>
                            <div className="font-semibold text-tinta">{formatarMoeda(custoTotalUnit)}</div>
                            {item.impostos_valor !== undefined && item.impostos_valor > 0 && (
                              <div className="text-[11px] text-cinza">+{formatarMoeda(item.impostos_valor)} imp.</div>
                            )}
                          </Td>
                          <Td numero>
                            {!resumo ? (
                              <StatusChip tom="aguardando">Sem preço em tabela</StatusChip>
                            ) : (
                              <>
                                <div className="font-bold text-tinta text-[13.5px]">{faixaPreco(resumo)}</div>
                                <div className="text-[11px] text-cinza">
                                  em {resumo.qtd} {resumo.qtd === 1 ? 'tabela' : 'tabelas'}
                                  {resumo.negativas > 0 && <span className="ml-1 font-semibold text-st-vencido">· margem negativa em {resumo.negativas}</span>}
                                </div>
                              </>
                            )}
                          </Td>
                          <Td numero>
                            <div className="font-semibold text-tinta">
                              {item.estoque_atual_sacos.toLocaleString('pt-BR')} {unidadeSaldo(item)}
                            </div>
                            <div className="text-[11px] text-cinza">{ton(item.estoque_atual_kg)} t</div>
                          </Td>
                          <Td>
                            <StatusChip tom={st.tom}>{st.rotulo}</StatusChip>
                          </Td>
                          <Td className="text-right">
                            <div className="inline-flex items-center gap-0.5">
                              <BotaoIcone rotulo="Editar produto" onClick={() => handleAbrirEdicao(item)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </BotaoIcone>
                              <BotaoIcone rotulo="Excluir produto" perigo onClick={() => handleExcluir(item.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </BotaoIcone>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TabelaDados>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL NOVO / EDITAR PRODUTO */}
      {modalAberto && (
        <ModalFolha
          titulo={modoEdicao ? `Editar ${formData.nome || 'produto'}` : 'Novo produto acabado'}
          subtitulo="Receita de produção, embalagem de envio, custos e o preço em cada tabela."
          onFechar={() => setModalAberto(false)}
          onSubmit={handleSalvar}
          largura="sm:max-w-5xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit">
                <Save className="w-4 h-4" />
                Salvar produto
              </BotaoPrimario>
            </>
          }
        >
          {/* 1. RECEITA */}
          <Secao numero="1" titulo="Receita de produção" contexto="O custo dos insumos vem da receita: custo da receita ÷ unidades que ela rende.">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <Campo rotulo="Receita base *" className="sm:col-span-8">
                <select value={formData.receita_id} onChange={(e) => handleSelecionarReceita(e.target.value)} className={form.select}>
                  <option value="" disabled>Selecione a receita do produto</option>
                  {receitas.map((rec) => {
                    const semMp = (rec.materias_primas || []).length === 0;
                    return (
                      <option key={rec.id} value={rec.id} disabled={semMp}>
                        {rec.codigo} - {rec.nome || rec.produto_nome} ({rec.rendimento_pacotes} pacotes de {rec.peso_por_pacote_kg || 25}kg){semMp ? ' — sem matéria-prima' : ''}
                      </option>
                    );
                  })}
                </select>
                {!receitas.some(r => (r.materias_primas || []).length > 0) && (
                  <Aviso tom="aguardando" className="mt-2 space-y-2">
                    <p>
                      Para cadastrar um produto é preciso ter uma receita com ao menos 1 matéria-prima.
                      {receitas.length === 0 ? ' Nenhuma receita cadastrada.' : ' Nenhuma receita tem matéria-prima.'}
                    </p>
                    {onNavigate && (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setModalAberto(false); onNavigate('produtos_materia_prima'); }} className="h-10 sm:h-8 px-3 rounded-md border border-st-aguardando/30 bg-papel font-semibold cursor-pointer">
                          Cadastrar matéria-prima
                        </button>
                        <button type="button" onClick={() => { setModalAberto(false); onNavigate('produtos_receita'); }} className="h-10 sm:h-8 px-3 rounded-md border border-st-aguardando/30 bg-papel font-semibold cursor-pointer">
                          Cadastrar receita
                        </button>
                      </div>
                    )}
                  </Aviso>
                )}
              </Campo>

              <div className="sm:col-span-4 rounded-md bg-eno-50 border border-eno-100 px-3.5 py-2.5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Custo dos insumos por unidade</div>
                <div className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums text-tinta">{formatarMoeda(calculosFormulario.custoMp)}</div>
                {(() => {
                  if (!recSelecionada) return <div className="text-[11.5px] text-cinza">escolha a receita</div>;
                  const totalRec = recSelecionada.custo_total_materias_primas || (recSelecionada.materias_primas || []).reduce((acc, m) => acc + (m.custo_total || 0), 0);
                  const rend = recSelecionada.rendimento_pacotes || 1;
                  const un = formData.unidades_por_acondicionamento || 1;
                  return (
                    <div className="text-[11.5px] text-cinza tabular-nums">
                      {formatarMoeda(totalRec)} ÷ {rend} un
                      {un > 1 && <> · {formatarMoeda(calculosFormulario.custoMp * un)} por {formData.tipo_acondicionamento.toLowerCase()} ({un} un)</>}
                    </div>
                  );
                })()}
              </div>
            </div>

            {(() => {
              if (!recSelecionada || !recSelecionada.materias_primas || recSelecionada.materias_primas.length === 0) return null;
              const totalRec = recSelecionada.custo_total_materias_primas || recSelecionada.materias_primas.reduce((acc, m) => acc + (m.custo_total || 0), 0);
              const rend = recSelecionada.rendimento_pacotes || 1;
              return (
                <TabelaResponsiva
                  colunas={[
                    { rotulo: 'Matéria-prima' },
                    { rotulo: 'Na receita', numero: true },
                    { rotulo: 'Por unidade', numero: true },
                    { rotulo: 'Custo na receita', numero: true },
                    { rotulo: 'Custo por unidade', numero: true },
                  ]}
                  linhas={recSelecionada.materias_primas.map((mp, i) => {
                    const propUnitaria = mp.quantidade / rend;
                    const custoTotalMp = mp.custo_total || (mp.quantidade * (mp.custo_unitario || 0));
                    return {
                      chave: i,
                      celulas: [
                        mp.materia_prima_nome,
                        `${mp.quantidade.toLocaleString('pt-BR')} ${mp.unidade_medida}`,
                        `${propUnitaria.toLocaleString('pt-BR', { minimumFractionDigits: propUnitaria < 0.1 ? 3 : 2, maximumFractionDigits: propUnitaria < 0.1 ? 3 : 2 })} ${mp.unidade_medida}`,
                        formatarMoeda(custoTotalMp),
                        <span className="font-bold text-tinta">{formatarMoeda(custoTotalMp / rend)}</span>,
                      ],
                    };
                  })}
                  rodape={
                    <div className="flex flex-wrap justify-between gap-2 tabular-nums">
                      <span className="text-cinza">
                        {rend} {recSelecionada.tipo_embalagem || 'pacotes'} de {recSelecionada.peso_por_pacote_kg || 1} kg
                      </span>
                      <span className="font-semibold text-tinta">
                        {formatarMoeda(totalRec)} ÷ {rend} = {formatarMoeda(calculosFormulario.custoMp)} por unidade
                      </span>
                    </div>
                  }
                />
              );
            })()}
          </Secao>

          {/* 2. IDENTIFICAÇÃO */}
          <Secao numero="2" titulo="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <Campo rotulo="Nome comercial *" className="sm:col-span-6">
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Mandioca Gourmet Palito Congelada (Pacote 1kg)"
                  className={form.campo}
                />
              </Campo>
              <Campo rotulo="Código interno *" className="sm:col-span-3">
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className={`${form.campo} tabular-nums`}
                />
              </Campo>
              <Campo rotulo="Categoria *" className="sm:col-span-3">
                <CategoriaProdutoCampo value={formData.categoria} onChange={(categoria) => setFormData(prev => ({ ...prev, categoria }))} />
              </Campo>
            </div>
          </Secao>

          {/* 3. ACONDICIONAMENTO */}
          <Secao numero="3" titulo="Embalagem de envio" contexto="Como o produto é despachado e cobrado no pedido.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Campo rotulo="Acondicionamento *">
                <select
                  value={formData.tipo_acondicionamento}
                  onChange={(e) => setFormData({ ...formData, tipo_acondicionamento: e.target.value as any })}
                  className={form.select}
                >
                  <option value="Caixa">Caixa</option>
                  <option value="Fardo">Fardo</option>
                  <option value="Saco">Saco</option>
                  <option value="Avulso">Avulso / Granel</option>
                </select>
              </Campo>
              <Campo rotulo="Unidades em cada um *" ajuda={`unidades por ${formData.tipo_acondicionamento.toLowerCase()}`}>
                <CampoNumero
                  inteiro
                  required
                  min={1}
                  value={formData.unidades_por_acondicionamento}
                  onChange={(n) => setFormData({ ...formData, unidades_por_acondicionamento: n })}
                  placeholder="Ex: 10 ou 12"
                  className={form.campoNumero}
                />
              </Campo>
              <Campo
                rotulo="Peso de cada unidade (kg)"
                ajuda={`${derivarTipoEmbalagem(formData.peso_unitario_kg)} · ${(formData.peso_unitario_kg * formData.unidades_por_acondicionamento).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg por ${formData.tipo_acondicionamento.toLowerCase()}`}
              >
                <CampoNumero
                  step="any"
                  min={0}
                  value={formData.peso_unitario_kg}
                  onChange={(n) => setFormData({ ...formData, peso_unitario_kg: n })}
                  className={form.campoNumero}
                />
              </Campo>
            </div>
          </Secao>

          {/* 4. CUSTOS E IMPOSTOS */}
          <Secao
            numero="4"
            titulo="Custos e impostos"
            contexto="O produto não tem preço próprio: o preço de venda fica em cada tabela, logo abaixo."
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Campo rotulo="Custo dos insumos (R$)" ajuda="da receita">
                <CampoNumero
                  step="0.01"
                  min={0}
                  value={formData.custo_materia_prima}
                  onChange={(n) => setFormData({ ...formData, custo_materia_prima: n })}
                  className={form.campoNumero}
                />
              </Campo>
              <Campo rotulo="Custos operacionais (R$)" ajuda="energia, mão de obra">
                <CampoNumero
                  step="0.01"
                  min={0}
                  value={formData.custo_operacional}
                  onChange={(n) => setFormData({ ...formData, custo_operacional: n })}
                  className={form.campoNumero}
                />
              </Campo>
              <div className="rounded-md bg-papel-2 border border-linha px-3.5 py-2.5 text-right">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Custo sem impostos</div>
                <div className="mt-1 text-[20px] font-extrabold tracking-[-0.02em] tabular-nums text-tinta">
                  {formatarMoeda(formData.custo_materia_prima + formData.custo_operacional)}
                </div>
              </div>
            </div>

            {/* Impostos */}
            <div className="rounded-md border border-linha">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-linha bg-papel-2">
                <span className="text-[12.5px] font-bold text-tinta">
                  Impostos e taxas
                  {formData.impostos.length > 0 && <span className="ml-1.5 font-normal text-cinza tabular-nums">{formData.impostos.length}</span>}
                </span>
                <button
                  type="button"
                  onClick={handleAdicionarImposto}
                  className="inline-flex items-center gap-1 h-10 sm:h-8 px-3 rounded-md border border-linha-forte bg-papel text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar imposto
                </button>
              </div>

              {formData.impostos.length === 0 ? (
                <p className="px-3 py-4 text-[12.5px] text-cinza">Nenhum imposto neste produto. ICMS, PIS e similares entram aqui.</p>
              ) : (
                <ul>
                  {formData.impostos.map((imp, n) => (
                    <li key={imp.id} className="grid grid-cols-2 sm:grid-cols-12 gap-x-2 gap-y-3 items-end px-3 py-3 border-b border-linha last:border-b-0">
                      <div className="col-span-2 flex items-center justify-between sm:hidden">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-cinza">Imposto {n + 1}</span>
                        <BotaoIcone rotulo="Remover imposto" perigo onClick={() => handleRemoverImposto(imp.id)}>
                          <Trash2 className="w-4 h-4" />
                        </BotaoIcone>
                      </div>
                      <Campo rotulo="Nome" className="col-span-2 sm:col-span-3">
                        <input type="text" value={imp.nome} onChange={(e) => handleAtualizarImposto(imp.id, 'nome', e.target.value)} className={form.campo} />
                      </Campo>
                      <Campo rotulo="Base de cálculo" className="col-span-2 sm:col-span-2">
                        <select value={imp.base} onChange={(e) => handleAtualizarImposto(imp.id, 'base', e.target.value)} className={form.select}>
                          <option value="Venda">Preço da tabela</option>
                          <option value="Custo">Custo prod.</option>
                          <option value="Fixo">Valor fixo</option>
                        </select>
                      </Campo>
                      <Campo rotulo="Tipo" className="col-span-2 sm:col-span-2">
                        <select value={imp.tipo} onChange={(e) => handleAtualizarImposto(imp.id, 'tipo', e.target.value)} className={form.select}>
                          <option value="Porcentagem">% Porcentagem</option>
                          <option value="Valor">R$ Valor</option>
                        </select>
                      </Campo>
                      <Campo rotulo="Valor / alíquota" className="sm:col-span-2">
                        <CampoNumero step="any" min={0} value={imp.valor} onChange={(n) => handleAtualizarImposto(imp.id, 'valor', n)} className={form.campoNumero} />
                      </Campo>
                      <div className="sm:col-span-2 text-right pb-1 tabular-nums">
                        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-cinza">Impacto</div>
                        {imp.base === 'Venda' ? (
                          <div className="text-[13px] font-bold text-st-aguardando leading-tight">
                            {imp.tipo === 'Porcentagem'
                              ? `${(Number(imp.valor) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
                              : formatarMoeda(Number(imp.valor) || 0)}
                            <span className="block text-[11px] font-normal text-cinza">
                              {imp.tipo === 'Porcentagem' ? 'sobre o preço da tabela' : 'por venda (na margem)'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[13px] font-bold text-tinta leading-tight">
                            {(() => {
                              const baseCusto = formData.custo_materia_prima + formData.custo_operacional;
                              const baseCalc = imp.base === 'Custo' ? baseCusto : 0;
                              const res = imp.tipo === 'Porcentagem' ? (baseCalc * (imp.valor || 0)) / 100 : (imp.valor || 0);
                              return formatarMoeda(res);
                            })()}
                            <span className="block text-[11px] font-normal text-cinza">no custo</span>
                          </div>
                        )}
                      </div>
                      <div className="hidden sm:flex sm:col-span-1 justify-end pb-0.5">
                        <BotaoIcone rotulo="Remover imposto" perigo onClick={() => handleRemoverImposto(imp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </BotaoIcone>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <FaixaTotal
              rotulo="Custo final industrial"
              valor={formatarMoeda(calculosFormulario.custoTotal)}
              detalhe="Insumos + operacional + impostos de custo, por unidade"
              lado={
                <>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/55">Por {formData.tipo_acondicionamento.toLowerCase()}</div>
                  <div className="mt-1 text-[16px] font-bold">{formatarMoeda(calculosFormulario.custoTotal * formData.unidades_por_acondicionamento)}</div>
                </>
              }
            />
          </Secao>

          {/* 5. PREÇOS NAS TABELAS */}
          <Secao numero="5" titulo="Preços nas tabelas" contexto="Em branco = o produto não é vendido naquela tabela.">
            <PrecosProdutoTabelas
              custoUnitario={calculosFormulario.custoTotal}
              impostos={formData.impostos}
              unidades={formData.unidades_por_acondicionamento || 1}
              tipoAcondicionamento={formData.tipo_acondicionamento}
              valor={precosTabelas}
              onChange={setPrecosTabelas}
            />
          </Secao>

          {/* 6. ESTOQUE */}
          <Secao numero="6" titulo="Estoque e localização">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Campo rotulo={`Saldo atual (${formData.tipo_acondicionamento.toLowerCase()}s)`}>
                <CampoNumero inteiro min={0} value={formData.estoque_atual_sacos} onChange={(n) => setFormData({ ...formData, estoque_atual_sacos: n })} className={form.campoNumero} />
              </Campo>
              <Campo rotulo="Estoque mínimo (kg)" ajuda="Abaixo disso o produto aparece como estoque baixo">
                <CampoNumero min={0} value={formData.estoque_minimo_kg} onChange={(n) => setFormData({ ...formData, estoque_minimo_kg: n })} className={form.campoNumero} />
              </Campo>
              <Campo rotulo="Localização no galpão">
                <input
                  type="text"
                  value={formData.localizacao_galpao}
                  onChange={(e) => setFormData({ ...formData, localizacao_galpao: e.target.value })}
                  placeholder="Ex: Galpão C - Setor Congelados"
                  className={form.campo}
                />
              </Campo>
            </div>
          </Secao>
        </ModalFolha>
      )}
    </div>
  );
}
