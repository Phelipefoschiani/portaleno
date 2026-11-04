import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle2, Edit2, Trash2, Save, Check, Eye, Printer, Copy, AlertCircle, Download, FileText } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip, TomStatus } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, BotaoTopo, Secao, Campo, form, BotaoIcone, BotaoCartao, Aviso } from './kitProdutos';
import {
  TabelaPreco,
  carregarTabelasPreco,
  salvarTabelasPreco,
  carregarEstoqueProdutos,
  ProdutoEstoque
} from '../../data/produtosData';
import {
  calcularPrecoNaTabela,
  camposDePreco,
  MostrarPrecoTabela,
  OPCOES_MOSTRAR_PRECO,
  mostraAcondicionamento,
  mostraUnitario,
  nomeMostrarPreco,
  tabelaPrecoAtiva
} from '../../data/precosData';
import { formatarMoeda } from '../../data/financeiroData';
import { formatarDataBR, hojeISO } from '../../lib/datas';
import { ProdutosNavTabs } from './ProdutosNavTabs';
import { CampoPrecoTabela } from './CampoPrecoTabela';
import { gerarPdfTabelaPreco, LinhaTabelaPrecoPdf } from '../../lib/pdfTabelaPreco';

interface Props {
  onNavigate?: (tabId: string) => void;
}

const pesoTexto = (p: ProdutoEstoque) =>
  Number(p.peso_unitario_kg) > 0
    ? Number(p.peso_unitario_kg) < 1
      ? `${(Number(p.peso_unitario_kg) * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g`
      : `${Number(p.peso_unitario_kg).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`
    : '';

const ordenarProdutos = (lista: ProdutoEstoque[]) =>
  [...lista].sort(
    (a, b) =>
      String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-BR') ||
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );

export function ProdutosTabelaPreco({ onNavigate }: Props) {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>(() => carregarTabelasPreco());
  const [busca, setBusca] = useState('');

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [tabelaEmEdicao, setTabelaEmEdicao] = useState<TabelaPreco | null>(null);
  const [tabelaVisualizar, setTabelaVisualizar] = useState<TabelaPreco | null>(null);
  const [buscaProdutoForm, setBuscaProdutoForm] = useState('');

  // Toast e Cópia
  const [toastMsg, setToastMsg] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [mostrarCustos, setMostrarCustos] = useState(false);

  // Todos os produtos cadastrados (a grade da tabela lista todos; sem valor = não vendido)
  const [produtosEstoque, setProdutosEstoque] = useState<ProdutoEstoque[]>(() => carregarEstoqueProdutos());

  const dispararToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const handleAtualizacao = () => {
      setTabelas(carregarTabelasPreco());
      setProdutosEstoque(carregarEstoqueProdutos());
    };
    window.addEventListener('tabelas_preco_updated', handleAtualizacao);
    window.addEventListener('produtos_updated', handleAtualizacao);
    return () => {
      window.removeEventListener('tabelas_preco_updated', handleAtualizacao);
      window.removeEventListener('produtos_updated', handleAtualizacao);
    };
  }, []);

  const formVazio = () => ({
    codigo: `TAB-${Date.now().toString().slice(-4)}`,
    nome: '',
    tipo: 'Atacado / Distribuidor' as TabelaPreco['tipo'],
    mostrar_preco: 'AMBOS' as MostrarPrecoTabela,
    precos_fixos: {} as Record<string, number>,
    prazo_padrao: 'Boleto Bancário 28 Dias',
    frete_tipo: 'CIF (Entrega Grupo ENO)' as TabelaPreco['frete_tipo'],
    vigencia_inicio: formatarDataBR(hojeISO()),
    vigencia_fim: `31/12/${new Date().getFullYear()}`,
    status: 'VIGENTE' as TabelaPreco['status']
  });

  const [formData, setFormData] = useState(formVazio);

  const tabelasFiltradas = tabelas.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    t.tipo.toLowerCase().includes(busca.toLowerCase())
  );

  // Produtos que não têm preço em nenhuma tabela ativa (não podem ser vendidos)
  const produtosSemTabela = useMemo(() => {
    const ativas = tabelas.filter(tabelaPrecoAtiva);
    return produtosEstoque.filter(p => !ativas.some(t => calcularPrecoNaTabela(p, t).na_tabela));
  }, [tabelas, produtosEstoque]);

  const handleAbrirNova = () => {
    setTabelaEmEdicao(null);
    setBuscaProdutoForm('');
    setFormData(formVazio());
    setModalFormAberto(true);
  };

  const handleAbrirEdicao = (tabela: TabelaPreco) => {
    setTabelaEmEdicao(tabela);
    setBuscaProdutoForm('');
    setFormData({
      codigo: tabela.codigo,
      nome: tabela.nome,
      tipo: tabela.tipo,
      mostrar_preco: tabela.mostrar_preco || 'AMBOS',
      precos_fixos: { ...(tabela.precos_fixos || {}) },
      prazo_padrao: tabela.prazo_padrao,
      frete_tipo: tabela.frete_tipo,
      vigencia_inicio: tabela.vigencia_inicio,
      vigencia_fim: tabela.vigencia_fim,
      status: tabela.status
    });
    if (tabelaVisualizar) setTabelaVisualizar(null);
    setModalFormAberto(true);
  };

  // Prévia com os dados do formulário (antes de salvar)
  const previaNoForm = (prod: ProdutoEstoque) => calcularPrecoNaTabela(prod, { precos_fixos: formData.precos_fixos });

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('O nome da tabela é obrigatório.');
      return;
    }

    // Só valem preços de produtos que existem
    const idsProdutos = new Set(produtosEstoque.map(p => p.id));
    const precos: Record<string, number> = {};
    Object.entries(formData.precos_fixos).forEach(([id, v]) => {
      if (idsProdutos.has(id)) precos[id] = Number(v) || 0;
    });
    const campos = camposDePreco(precos);

    if ((campos.produtos_ids || []).length === 0 &&
      !window.confirm('Nenhum produto tem preço nesta tabela, então nada poderá ser vendido por ela. Salvar mesmo assim?')) {
      return;
    }

    const negativos = produtosEstoque.filter(p => previaNoForm(p).margem_negativa);
    if (negativos.length > 0 && !window.confirm(`Atenção: margem líquida negativa em ${negativos.map(p => p.nome).join(', ')}. Salvar mesmo assim?`)) {
      return;
    }

    const dadosTabela = {
      codigo: formData.codigo,
      nome: formData.nome,
      tipo: formData.tipo,
      mostrar_preco: formData.mostrar_preco,
      prazo_padrao: formData.prazo_padrao,
      frete_tipo: formData.frete_tipo,
      vigencia_inicio: formData.vigencia_inicio,
      vigencia_fim: formData.vigencia_fim,
      status: formData.status,
      ...campos
    };

    if (tabelaEmEdicao) {
      const atualizadas = tabelas.map(t => {
        if (t.id !== tabelaEmEdicao.id) return t;
        const { ajuste_percentual, margem_percentual, desconto_padrao_percentual, ...resto } = t;
        return { ...resto, ...dadosTabela };
      });
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      dispararToast(`Tabela "${formData.nome}" atualizada com sucesso!`);
    } else {
      const nova: TabelaPreco = {
        id: `tab_${Date.now()}`,
        ...dadosTabela
      };
      const atualizadas = [nova, ...tabelas];
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      dispararToast(`Nova tabela de preços "${formData.nome}" criada com sucesso!`);
    }

    setModalFormAberto(false);
  };

  const handleExcluir = (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a tabela "${nome}"?`)) {
      const atualizadas = tabelas.filter(t => t.id !== id);
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      if (tabelaVisualizar?.id === id) setTabelaVisualizar(null);
      dispararToast(`Tabela de preços "${nome}" excluída.`);
    }
  };

  // Produtos com valor na tabela (os vendidos por ela)
  const produtosDaTabelaPreco = (tab: TabelaPreco) =>
    ordenarProdutos(produtosEstoque.filter(p => calcularPrecoNaTabela(p, tab).na_tabela));

  const textoVigencia = (tab: TabelaPreco) =>
    `${tab.vigencia_inicio ? formatarDataBR(tab.vigencia_inicio) : '-'} a ${tab.vigencia_fim ? formatarDataBR(tab.vigencia_fim) : 'sem término'}`;

  // Linhas do documento (tela e PDF usam a mesma fonte)
  const linhasDocumento = (tab: TabelaPreco): LinhaTabelaPrecoPdf[] =>
    produtosDaTabelaPreco(tab).map(p => {
      const calc = calcularPrecoNaTabela(p, tab);
      return {
        categoria: p.categoria || 'Sem categoria',
        nome: p.nome,
        codigo: p.codigo,
        peso: pesoTexto(p),
        acondicionamento: calc.unidades > 1 ? `${calc.tipo_acondicionamento} c/ ${calc.unidades} un` : 'Unidade avulsa',
        preco: calc.preco,
        precoAcondicionamento: calc.preco_acondicionamento,
        rotuloAcondicionamento: calc.unidades > 1 ? String(calc.tipo_acondicionamento) : 'Unidade'
      };
    });

  const montarPdf = (tab: TabelaPreco) =>
    gerarPdfTabelaPreco({
      nome: tab.nome,
      codigo: tab.codigo,
      segmento: tab.tipo,
      vigencia: textoVigencia(tab),
      pagamento: tab.prazo_padrao,
      frete: tab.frete_tipo,
      mostrarUnitario: mostraUnitario(tab),
      mostrarAcondicionamento: mostraAcondicionamento(tab),
      linhas: linhasDocumento(tab)
    });

  // Prévia A4 no visualizador = o mesmo PDF que é baixado
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!tabelaVisualizar) return;
    let url: string | null = null;
    let cancelado = false;
    setPdfPreviewUrl(null);
    montarPdf(tabelaVisualizar).then(doc => {
      if (cancelado) return;
      url = URL.createObjectURL(doc.output('blob'));
      setPdfPreviewUrl(url);
    });
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [tabelaVisualizar]);

  const [gerandoPdf, setGerandoPdf] = useState(false);
  const handlePdf = async (tab: TabelaPreco, acao: 'baixar' | 'imprimir') => {
    setGerandoPdf(true);
    try {
      const doc = await montarPdf(tab);
      if (acao === 'baixar') {
        const slug = tab.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
        doc.save(`tabela-preco-${slug}-${hojeISO()}.pdf`);
      } else {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      }
    } catch (e) {
      dispararToast('Não foi possível gerar o PDF.');
    } finally {
      setGerandoPdf(false);
    }
  };

  // Copiar resumo formatado para WhatsApp ou texto (respeita "Mostrar preço" da tabela)
  const handleCopiarTabela = (tab: TabelaPreco) => {
    let texto = `*GRUPO ENO - TABELA DE PREÇOS OFICIAL*\n`;
    texto += `*Tabela:* ${tab.nome} (${tab.codigo})\n`;
    texto += `*Condição:* ${tab.prazo_padrao} | Frete: ${tab.frete_tipo}\n`;
    texto += `*Vigência:* ${textoVigencia(tab)}\n\n`;
    texto += `*PRODUTOS & PREÇOS:*\n`;

    const produtosDaTabela = produtosDaTabelaPreco(tab);
    if (produtosDaTabela.length === 0) texto += `(Nenhum produto com preço nesta tabela)\n`;
    produtosDaTabela.forEach(p => {
      const calc = calcularPrecoNaTabela(p, tab);
      const peso = pesoTexto(p);
      texto += `• *${p.nome}*${peso ? ` (${peso})` : ''}\n`;
      const partes: string[] = [];
      if (mostraUnitario(tab) || calc.unidades <= 1) partes.push(`Unidade: ${formatarMoeda(calc.preco)}`);
      if (mostraAcondicionamento(tab) && calc.unidades > 1) {
        partes.push(`${calc.tipo_acondicionamento} c/ ${calc.unidades}: ${formatarMoeda(calc.preco_acondicionamento)}`);
      }
      texto += `  ${partes.join(' | ')}\n`;
    });

    texto += `\n*Observações:* Pedidos sujeitos a confirmação de estoque e crédito.\nContato Comercial: (44) 3639-8200`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const produtosNoForm = useMemo(() => {
    const q = buscaProdutoForm.trim().toLowerCase();
    const lista = ordenarProdutos(produtosEstoque);
    if (!q) return lista;
    return lista.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      String(p.codigo || '').toLowerCase().includes(q) ||
      String(p.categoria || '').toLowerCase().includes(q)
    );
  }, [produtosEstoque, buscaProdutoForm]);

  const comPrecoNoForm = produtosEstoque.filter(p => Number(formData.precos_fixos[p.id]) > 0).length;

  const situacaoTabela = (t: TabelaPreco): { tom: TomStatus; rotulo: string } => {
    const ativa = tabelaPrecoAtiva(t);
    if (t.status === 'ARQUIVADA') return { tom: 'neutro', rotulo: 'Arquivada' };
    if (ativa) return { tom: 'pago', rotulo: 'Vigente' };
    if (t.status === 'PROGRAMADA') return { tom: 'producao', rotulo: 'Programada' };
    return { tom: 'aguardando', rotulo: 'Fora da vigência' };
  };
  const ativas = tabelas.filter(tabelaPrecoAtiva).length;
  const semNenhuma = tabelas.length === 0;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_tabela_preco" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Tabelas de preço"
            resumo={
              semNenhuma ? (
                'Nenhuma tabela cadastrada · produto sem valor em tabela não é vendido'
              ) : (
                <>
                  {ativas} {ativas === 1 ? 'ativa' : 'ativas'} de {tabelas.length} · {produtosEstoque.length} produtos cadastrados
                  {produtosSemTabela.length > 0 ? (
                    <span className="font-semibold text-st-aguardando" title={produtosSemTabela.map(p => p.nome).join(', ')}>
                      {' '}· {produtosSemTabela.length} sem preço em tabela ativa ({produtosSemTabela.slice(0, 2).map(p => p.nome).join(', ')}
                      {produtosSemTabela.length > 2 ? '…' : ''})
                    </span>
                  ) : (
                    produtosEstoque.length > 0 && <span> · todos com preço</span>
                  )}
                </>
              )
            }
            acoes={
              semNenhuma ? undefined : (
                <BotaoPrimario onClick={handleAbrirNova} className="w-full sm:w-auto h-11 sm:h-9">
                  <Plus className="w-4 h-4" />
                  Nova tabela
                </BotaoPrimario>
              )
            }
          />

          {toastMsg && (
            <div className="px-4 sm:px-6 pb-3">
              <Aviso tom="pago" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {toastMsg}
              </Aviso>
            </div>
          )}

          {!semNenhuma && (
            <BarraFiltros>
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar tabela, código ou segmento" className="w-full md:w-80" />
              <span className="hidden md:block text-[12.5px] text-cinza tabular-nums">
                {tabelasFiltradas.length} de {tabelas.length}
              </span>
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-8">
            {tabelasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                {semNenhuma ? (
                  <EstadoVazio
                    titulo="Nenhuma tabela de preço"
                    texto="Cada tabela tem o valor de cada produto, a condição de pagamento e o frete. Produto sem valor na tabela não é vendido por ela."
                    acao={
                      <BotaoPrimario onClick={handleAbrirNova}>
                        <Plus className="w-4 h-4" />
                        Nova tabela
                      </BotaoPrimario>
                    }
                  />
                ) : (
                  <EstadoVazio
                    titulo="Nenhuma tabela encontrada"
                    texto={`Nada com "${busca}". Busque pelo nome, código ou segmento.`}
                    acao={<BotaoSecundario onClick={() => setBusca('')}>Limpar busca</BotaoSecundario>}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <ul className="sm:hidden bg-papel border border-linha rounded-md">
                  {tabelasFiltradas.map(item => {
                    const qtd = produtosEstoque.filter(p => calcularPrecoNaTabela(p, item).na_tabela).length;
                    const negativos = produtosEstoque.filter(p => calcularPrecoNaTabela(p, item).margem_negativa).length;
                    const st = situacaoTabela(item);
                    return (
                      <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-tinta leading-snug">{item.nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">{item.codigo} · {item.tipo}</div>
                          </div>
                          <StatusChip tom={st.tom} className="shrink-0">{st.rotulo}</StatusChip>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div className="min-w-0 text-[12px] text-cinza">
                            <div className="truncate">{item.prazo_padrao} · {item.frete_tipo.split(' ')[0]}</div>
                            <div className="tabular-nums">{textoVigencia(item)}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">
                              {qtd}<span className="text-[12px] font-semibold text-cinza">/{produtosEstoque.length}</span>
                            </div>
                            <div className={`text-[11px] ${negativos > 0 ? 'font-semibold text-st-vencido' : 'text-cinza'}`}>
                              {negativos > 0 ? `${negativos} com margem negativa` : `produtos · ${nomeMostrarPreco(item).toLowerCase()}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2.5">
                          <BotaoCartao primario onClick={() => setTabelaVisualizar(item)}>
                            <Eye className="w-3.5 h-3.5" /> Visualizar
                          </BotaoCartao>
                          <BotaoCartao onClick={() => handleAbrirEdicao(item)}>
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </BotaoCartao>
                          <BotaoIcone rotulo={`Excluir tabela ${item.nome}`} perigo onClick={() => handleExcluir(item.id, item.nome)} className="border border-linha-forte">
                            <Trash2 className="w-4 h-4" />
                          </BotaoIcone>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Computador: tabela */}
                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Tabela</Th>
                      <Th>Segmento</Th>
                      <Th numero>Produtos</Th>
                      <Th>Pagamento</Th>
                      <Th>Frete</Th>
                      <Th>Vigência</Th>
                      <Th>Situação</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelasFiltradas.map(item => {
                      const qtd = produtosEstoque.filter(p => calcularPrecoNaTabela(p, item).na_tabela).length;
                      const negativos = produtosEstoque.filter(p => calcularPrecoNaTabela(p, item).margem_negativa).length;
                      const st = situacaoTabela(item);
                      return (
                        <tr key={item.id} className={tabela.tr}>
                          <Td>
                            <div className="font-semibold text-tinta">{item.nome}</div>
                            <div className="text-[11.5px] text-cinza tabular-nums">{item.codigo}</div>
                          </Td>
                          <Td>{item.tipo}</Td>
                          <Td numero>
                            <div className="font-semibold text-tinta">
                              {qtd}<span className="text-cinza font-normal">/{produtosEstoque.length}</span>
                            </div>
                            <div className={`text-[11px] ${negativos > 0 ? 'font-semibold text-st-vencido' : 'text-cinza'}`}>
                              {negativos > 0 ? `${negativos} com margem negativa` : `mostra ${nomeMostrarPreco(item).toLowerCase()}`}
                            </div>
                          </Td>
                          <Td className="whitespace-nowrap">{item.prazo_padrao}</Td>
                          <Td className="whitespace-nowrap">{item.frete_tipo}</Td>
                          <Td className="whitespace-nowrap tabular-nums text-cinza">{textoVigencia(item)}</Td>
                          <Td>
                            <StatusChip tom={st.tom}>{st.rotulo}</StatusChip>
                          </Td>
                          <Td className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-0.5">
                              <BotaoSecundario onClick={() => setTabelaVisualizar(item)} className="h-8 px-2.5 text-[12.5px] mr-1" title="Ver a tabela em A4 para enviar, imprimir ou baixar em PDF">
                                <Eye className="w-3.5 h-3.5" /> Visualizar
                              </BotaoSecundario>
                              <BotaoIcone rotulo="Editar tabela" onClick={() => handleAbrirEdicao(item)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </BotaoIcone>
                              <BotaoIcone rotulo="Excluir tabela" perigo onClick={() => handleExcluir(item.id, item.nome)}>
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

      {/* MODAL CRIAR / EDITAR TABELA DE PREÇO */}
      {modalFormAberto && (
        <ModalFolha
          titulo={tabelaEmEdicao ? `Editar ${tabelaEmEdicao.nome}` : 'Nova tabela de preço'}
          subtitulo="Condições da tabela e o valor de cada produto. Em branco = não vendido nesta tabela."
          onFechar={() => setModalFormAberto(false)}
          onSubmit={handleSalvar}
          largura="sm:max-w-5xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalFormAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit">
                <Save className="w-4 h-4" />
                {tabelaEmEdicao ? 'Salvar alterações' : 'Criar tabela'}
              </BotaoPrimario>
            </>
          }
        >
          <Secao numero="1" titulo="Condições da tabela">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <Campo rotulo="Nome da tabela *" className="sm:col-span-6">
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Tabela Atacado Mandioca & Féculas - Região Sul"
                  className={form.campo}
                />
              </Campo>
              <Campo rotulo="Código *" className="sm:col-span-3">
                <input type="text" required value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} className={`${form.campo} tabular-nums`} />
              </Campo>
              <Campo rotulo="Status" className="sm:col-span-3">
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as TabelaPreco['status'] })} className={form.select}>
                  <option value="VIGENTE">Vigente</option>
                  <option value="PROGRAMADA">Programada</option>
                  <option value="ARQUIVADA">Arquivada</option>
                </select>
              </Campo>

              <div className="sm:col-span-12">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
                  <span className={form.rotulo}>Mostrar preço</span>
                  <span className="text-[11.5px] text-cinza">Vale para visualizar, imprimir, copiar no WhatsApp e para a venda nesta tabela</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Mostrar preço">
                  {OPCOES_MOSTRAR_PRECO.map(o => {
                    const ativo = formData.mostrar_preco === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() => setFormData({ ...formData, mostrar_preco: o.id })}
                        className={`min-h-11 text-left px-3 py-2 rounded-md border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
                          ativo ? 'bg-eno-800 border-eno-800 text-white' : 'bg-papel border-linha-forte text-tinta-2 hover:bg-papel-3'
                        }`}
                      >
                        <div className="text-[13px] font-semibold">{o.nome}</div>
                        <div className={`text-[11.5px] ${ativo ? 'text-white/70' : 'text-cinza'}`}>{o.descricao}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Campo rotulo="Segmento / canal de venda" className="sm:col-span-6">
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TabelaPreco['tipo'] })} className={form.select}>
                  <option value="Atacado / Distribuidor">Atacado / Distribuidor</option>
                  <option value="Grandes Indústrias (Carga Fechada)">Grandes Indústrias (Carga Fechada)</option>
                  <option value="Varejo / Padarias">Varejo / Padarias</option>
                  <option value="Pagamento à Vista (FOB)">Pagamento à Vista (FOB)</option>
                </select>
              </Campo>
              <Campo rotulo="Frete" className="sm:col-span-6">
                <select value={formData.frete_tipo} onChange={(e) => setFormData({ ...formData, frete_tipo: e.target.value as TabelaPreco['frete_tipo'] })} className={form.select}>
                  <option value="CIF (Entrega Grupo ENO)">CIF (Entrega por conta do Grupo ENO)</option>
                  <option value="FOB (Retira Fábrica)">FOB (Retira na Fábrica pelo Cliente)</option>
                </select>
              </Campo>
              <Campo rotulo="Condição de pagamento padrão" className="sm:col-span-6">
                <input
                  type="text"
                  required
                  value={formData.prazo_padrao}
                  onChange={(e) => setFormData({ ...formData, prazo_padrao: e.target.value })}
                  placeholder="Ex: Boleto 28 Dias ou À Vista Antecipado"
                  className={form.campo}
                />
              </Campo>
              <Campo rotulo="Início da vigência" className="sm:col-span-3">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formData.vigencia_inicio}
                  onChange={(e) => setFormData({ ...formData, vigencia_inicio: e.target.value })}
                  placeholder="DD/MM/AAAA"
                  className={`${form.campo} tabular-nums`}
                />
              </Campo>
              <Campo rotulo="Término da vigência" className="sm:col-span-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.vigencia_fim}
                  onChange={(e) => setFormData({ ...formData, vigencia_fim: e.target.value })}
                  placeholder="DD/MM/AAAA"
                  className={`${form.campo} tabular-nums`}
                />
              </Campo>
            </div>
          </Secao>

          {/* GRADE: TODOS OS PRODUTOS (BRANCO = NÃO VENDIDO NESTA TABELA) */}
          <Secao
            numero="2"
            titulo="Valor de cada produto"
            contexto={
              <span className="tabular-nums">
                <b className="text-tinta">{comPrecoNoForm}</b> de {produtosEstoque.length} com preço · em branco = não vendido nesta tabela
              </span>
            }
            semPadding
            acao={
              produtosEstoque.length > 8 ? (
                <CampoBusca valor={buscaProdutoForm} onChange={setBuscaProdutoForm} placeholder="Filtrar produto ou categoria" className="w-full sm:w-64" />
              ) : undefined
            }
          >
            {produtosEstoque.length === 0 ? (
              <p className="px-4 py-4 text-[12.5px] text-cinza">Nenhum produto cadastrado. Cadastre em Produtos acabados.</p>
            ) : (
              <>
                {/* Celular: um cartão por produto */}
                <ul className="sm:hidden">
                  {produtosNoForm.map(prod => {
                    const calc = previaNoForm(prod);
                    const unitario = Number(formData.precos_fixos[prod.id]) || 0;
                    const alterar = (v: number | undefined) =>
                      setFormData(prev => {
                        const novo = { ...prev.precos_fixos };
                        if (v === undefined) delete novo[prod.id];
                        else novo[prod.id] = v;
                        return { ...prev, precos_fixos: novo };
                      });
                    return (
                      <li key={prod.id} className={`px-4 py-3 border-b border-linha last:border-b-0 ${calc.margem_negativa ? 'bg-st-vencido-bg/50' : ''}`}>
                        <div className={`text-[14px] font-bold leading-snug ${calc.na_tabela ? 'text-tinta' : 'text-cinza'}`}>{prod.nome}</div>
                        <div className="text-[11.5px] text-cinza truncate">
                          {prod.codigo}
                          {prod.categoria && <> · {prod.categoria}</>} · {calc.unidades > 1 ? `${calc.tipo_acondicionamento} c/ ${calc.unidades}` : calc.tipo_acondicionamento}
                        </div>
                        <div className="mt-2">
                          <CampoPrecoTabela
                            unitario={unitario > 0 ? unitario : undefined}
                            unidades={calc.unidades}
                            tipoAcondicionamento={calc.tipo_acondicionamento}
                            mostrarUnitario={formData.mostrar_preco !== 'ACONDICIONAMENTO'}
                            mostrarCaixa={formData.mostrar_preco !== 'UNITARIO'}
                            alerta={calc.margem_negativa}
                            onChange={alterar}
                          />
                        </div>
                        <div className="mt-2 flex items-baseline justify-between gap-2 text-[12px] tabular-nums">
                          <span className="text-cinza">
                            custo {calc.custo > 0 ? formatarMoeda(calc.custo) : '—'} · imp. {calc.na_tabela ? formatarMoeda(calc.impostos_venda) : '—'}
                          </span>
                          {!calc.na_tabela ? (
                            <span className="text-cinza-claro">não vendido</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[13px] font-bold ${calc.margem_negativa ? 'text-st-vencido' : (calc.margem_liquida_percentual ?? 0) < 10 ? 'text-st-aguardando' : 'text-st-pago'}`}>
                              {calc.margem_negativa && <AlertCircle className="w-3.5 h-3.5" />}
                              {formatarMoeda(calc.margem_liquida)}
                              <span className="text-[11px] font-semibold">({(calc.margem_liquida_percentual ?? 0).toFixed(1)}%)</span>
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {produtosNoForm.length === 0 && <li className="px-4 py-5 text-[12.5px] text-cinza">Nenhum produto encontrado para "{buscaProdutoForm}".</li>}
                </ul>

                {/* Computador: grade com cabeçalho fixo */}
                <div className="hidden sm:block max-h-[420px] overflow-y-auto">
                  <table className={tabela.table}>
                    <thead className="sticky top-0 z-10 bg-papel-2 border-b border-linha-forte">
                      <tr>
                        <th className={tabela.th}>Produto</th>
                        <th className={`${tabela.th} w-[250px]`}>Preço na tabela</th>
                        <th className={`${tabela.th} text-right`}>Custo</th>
                        <th className={`${tabela.th} text-right`}>Imp. venda</th>
                        <th className={`${tabela.th} text-right`}>Margem líquida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosNoForm.map(prod => {
                        const calc = previaNoForm(prod);
                        const unitario = Number(formData.precos_fixos[prod.id]) || 0;
                        const alterar = (v: number | undefined) =>
                          setFormData(prev => {
                            const novo = { ...prev.precos_fixos };
                            if (v === undefined) delete novo[prod.id];
                            else novo[prod.id] = v;
                            return { ...prev, precos_fixos: novo };
                          });
                        return (
                          <tr key={prod.id} className={`border-b border-linha last:border-b-0 ${calc.margem_negativa ? 'bg-st-vencido-bg/50' : ''}`}>
                            <td className="py-2 px-3">
                              <div className={`font-semibold ${calc.na_tabela ? 'text-tinta' : 'text-cinza'}`}>{prod.nome}</div>
                              <div className="text-[11px] text-cinza tabular-nums">
                                {prod.codigo}
                                {prod.categoria && <> · {prod.categoria}</>} · {calc.unidades > 1 ? `${calc.tipo_acondicionamento} c/ ${calc.unidades}` : calc.tipo_acondicionamento}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <CampoPrecoTabela
                                unitario={unitario > 0 ? unitario : undefined}
                                unidades={calc.unidades}
                                tipoAcondicionamento={calc.tipo_acondicionamento}
                                mostrarUnitario={formData.mostrar_preco !== 'ACONDICIONAMENTO'}
                                mostrarCaixa={formData.mostrar_preco !== 'UNITARIO'}
                                alerta={calc.margem_negativa}
                                onChange={alterar}
                              />
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-tinta-2">{calc.custo > 0 ? formatarMoeda(calc.custo) : '—'}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-tinta-2">{calc.na_tabela ? formatarMoeda(calc.impostos_venda) : '—'}</td>
                            <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                              {!calc.na_tabela ? (
                                <span className="text-[12px] text-cinza-claro">não vendido</span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 font-bold ${calc.margem_negativa ? 'text-st-vencido' : (calc.margem_liquida_percentual ?? 0) < 10 ? 'text-st-aguardando' : 'text-st-pago'}`}>
                                  {calc.margem_negativa && <AlertCircle className="w-3.5 h-3.5" />}
                                  {formatarMoeda(calc.margem_liquida)}
                                  <span className="text-[11px] font-semibold">({(calc.margem_liquida_percentual ?? 0).toFixed(1)}%)</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {produtosNoForm.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-cinza">Nenhum produto encontrado para "{buscaProdutoForm}".</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="px-4 py-2.5 border-t border-linha text-[11.5px] text-cinza">
              Digite o valor unitário ou o da caixa/fardo (o outro acompanha pela quantidade do acondicionamento do produto). Margem líquida = preço − custo do produto − impostos de venda do produto, por unidade.
            </p>
          </Secao>
        </ModalFolha>
      )}

      {/* MODAL VISUALIZAR (A4 = o mesmo PDF que é baixado) */}
      {tabelaVisualizar && (
        <ModalFolha
          titulo={tabelaVisualizar.nome}
          subtitulo={`${tabelaVisualizar.codigo} · ${tabelaVisualizar.prazo_padrao} · ${textoVigencia(tabelaVisualizar)}`}
          onFechar={() => setTabelaVisualizar(null)}
          largura="sm:max-w-5xl"
          corpoClassName="bg-papel-2 sm:bg-eno-950 flex flex-col"
          acoesTopo={
            <BotaoTopo onClick={() => handleAbrirEdicao(tabelaVisualizar)} title="Editar dados da tabela">
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </BotaoTopo>
          }
          rodape={
            <>
              <span className="hidden sm:block sm:mr-auto">
                <BotaoSecundario onClick={() => setTabelaVisualizar(null)}>Fechar</BotaoSecundario>
              </span>
              <BotaoSecundario onClick={() => handleCopiarTabela(tabelaVisualizar)} title="Copiar texto formatado para enviar no WhatsApp">
                {copiado ? <Check className="w-4 h-4 text-st-pago" /> : <Copy className="w-4 h-4" />}
                <span className="sm:hidden">{copiado ? 'Copiada' : 'WhatsApp'}</span>
                <span className="hidden sm:inline">{copiado ? 'Tabela copiada' : 'Copiar para WhatsApp'}</span>
              </BotaoSecundario>
              <BotaoSecundario onClick={() => handlePdf(tabelaVisualizar, 'imprimir')} disabled={gerandoPdf}>
                <Printer className="w-4 h-4" />
                Imprimir
              </BotaoSecundario>
              <BotaoPrimario onClick={() => handlePdf(tabelaVisualizar, 'baixar')} disabled={gerandoPdf}>
                <Download className="w-4 h-4" />
                {gerandoPdf ? 'Gerando…' : 'Baixar PDF'}
              </BotaoPrimario>
            </>
          }
        >
          {/* Computador: prévia A4 (o próprio PDF) */}
          <div className="hidden sm:flex flex-1 min-h-[68vh]">
            {pdfPreviewUrl ? (
              <iframe src={`${pdfPreviewUrl}#zoom=page-fit&navpanes=0`} title="Prévia A4 da tabela de preços" className="flex-1 w-full rounded-md bg-white" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] font-semibold text-white/70">Gerando prévia A4…</div>
            )}
          </div>

          {/* Celular: o leitor de PDF do navegador não abre dentro da página; mostra a lista e o PDF à parte */}
          <div className="sm:hidden space-y-3">
            {(() => {
              const linhas = linhasDocumento(tabelaVisualizar);
              const verUn = mostraUnitario(tabelaVisualizar);
              const verCx = mostraAcondicionamento(tabelaVisualizar);
              return (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] text-cinza tabular-nums">
                      {linhas.length} {linhas.length === 1 ? 'produto' : 'produtos'} · {tabelaVisualizar.frete_tipo}
                    </span>
                    {pdfPreviewUrl && (
                      <a href={pdfPreviewUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 px-3 rounded-md border border-linha-forte bg-papel text-[12.5px] font-semibold text-eno-700">
                        <FileText className="w-4 h-4" /> Abrir A4
                      </a>
                    )}
                  </div>
                  {linhas.length === 0 ? (
                    <div className="rounded-md border border-linha bg-papel">
                      <EstadoVazio titulo="Nenhum produto com preço" texto="Edite a tabela e digite o valor dos produtos que ela vende." />
                    </div>
                  ) : (
                    <ul className="rounded-md border border-linha bg-papel">
                      {linhas.map((l, i) => (
                        <li key={i} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[14px] font-bold text-tinta leading-snug">{l.nome}</div>
                              <div className="text-[11.5px] text-cinza">{[l.categoria, l.peso, l.acondicionamento].filter(Boolean).map((parte, j) => (
                                <React.Fragment key={j}>{j > 0 && ' · '}<span className="whitespace-nowrap">{parte}</span></React.Fragment>
                              ))}</div>
                            </div>
                            <div className="text-right shrink-0 tabular-nums">
                              {(verUn || l.rotuloAcondicionamento === 'Unidade') && (
                                <div className="text-[16px] font-extrabold text-tinta">{formatarMoeda(l.preco)}<span className="text-[11px] font-semibold text-cinza"> un</span></div>
                              )}
                              {verCx && l.rotuloAcondicionamento !== 'Unidade' && (
                                <div className={`${verUn ? 'text-[12.5px] font-semibold text-tinta-2' : 'text-[16px] font-extrabold text-tinta'}`}>
                                  {formatarMoeda(l.precoAcondicionamento)}<span className="text-[11px] font-semibold text-cinza"> {l.rotuloAcondicionamento.toLowerCase()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              );
            })()}
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
