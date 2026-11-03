import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import { Plus, Edit2, Trash2, Save, Check, AlertTriangle, ArrowDownUp } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip, TomStatus } from '../ui/StatusChip';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import { formatarMoeda } from '../../data/financeiroData';
import { ModalFolha, Secao, Campo, form, BotaoIcone, BotaoCartao, Aviso, FaixaNumerosProdutos } from './kitProdutos';
import {
  MateriaPrimaEstoque,
  carregarMateriaPrima,
  calcularStatusMateriaPrima,
  salvarMateriaPrima,
  converterQuantidade,
  registrarMovimentoMateriaPrima,
  carregarMovimentosMateriaPrima,
  MovimentoMateriaPrima,
  TipoMovimentoMP
} from '../../data/produtosData';
import {
  carregarFornecedores,
  definirFornecedorDaMateriaPrima,
  ehMandioca,
  EVENTO_CADASTROS_ATUALIZADOS,
  fornecedoresDaMateriaPrima,
  origemDaMateriaPrima,
  SEM_FORNECEDOR
} from '../../data/cadastrosData';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosMateriaPrima({ onNavigate }: Props) {
  const [materias, setMaterias] = useState<MateriaPrimaEstoque[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<MateriaPrimaEstoque | null>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '' as MateriaPrimaEstoque['categoria'] | '',
    unidade_medida: '' as MateriaPrimaEstoque['unidade_medida'] | '',
    estoque_atual: 0,
    estoque_minimo: 0,
    custo_medio_unitario: 0,
    fornecedor_principal: '',
    fornecedor_id: '',
    localizacao_patio: ''
  });

  const recarregar = () => {
    setMaterias(carregarMateriaPrima());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('produtos_updated', handleUpdate);
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleUpdate);
    return () => {
      window.removeEventListener('produtos_updated', handleUpdate);
      window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleUpdate);
    };
  }, []);

  // Métricas
  const metricas = useMemo(() => {
    // Soma toda a raiz em toneladas, qualquer que seja a unidade cadastrada
    const raizTon = parseFloat(materias
      .filter(m => m.categoria === 'Raiz In Natura')
      .reduce((acc, m) => acc + (converterQuantidade(m.estoque_atual, m.unidade_medida, 'TON') ?? 0), 0)
      .toFixed(3));
    const lenhaM3 = materias.find(m => m.categoria === 'Biomassa / Lenha')?.estoque_atual || 0;
    const sacariaUn = materias.find(m => m.codigo === 'MAT-SAC-RAF25')?.estoque_atual || 0;
    const alertas = materias.filter(m => m.status !== 'NORMAL').length;

    return { raizTon, lenhaM3, sacariaUn, alertas };
  }, [materias]);

  const materiasFiltradas = useMemo(() => {
    return materias.filter(m => {
      const match =
        m.nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        origemDaMateriaPrima(m).texto.toLowerCase().includes(busca.toLowerCase());

      if (!match) return false;
      if (filtroCategoria !== 'TODAS' && m.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [materias, busca, filtroCategoria]);

  const handleAbrirNovo = () => {
    setModoEdicao(null);
    setFormData({
      codigo: `MAT-${Date.now().toString().slice(-4)}`,
      nome: '',
      // Sem padrão: o usuário escolhe a categoria e a unidade de cada insumo
      categoria: '',
      unidade_medida: '',
      estoque_atual: 0,
      estoque_minimo: 0,
      custo_medio_unitario: 0,
      fornecedor_principal: '',
      fornecedor_id: '',
      localizacao_patio: ''
    });
    setModalAberto(true);
  };

  const handleAbrirEdicao = (item: MateriaPrimaEstoque) => {
    setModoEdicao(item);
    setFormData({
      codigo: item.codigo,
      nome: item.nome,
      categoria: item.categoria,
      unidade_medida: item.unidade_medida,
      estoque_atual: item.estoque_atual,
      estoque_minimo: item.estoque_minimo,
      custo_medio_unitario: item.custo_medio_unitario,
      fornecedor_principal: item.fornecedor_principal,
      fornecedor_id: fornecedoresDaMateriaPrima(item)[0]?.id || '',
      localizacao_patio: item.localizacao_patio
    });
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoria || !formData.unidade_medida) {
      alert('Selecione a categoria e a unidade de medida do insumo.');
      return;
    }
    // Fornecedor: mandioca vem dos Agricultores; demais, do fornecedor escolhido (ou "Sem fornecedor")
    const { fornecedor_id: fornecedorId, ...semFornecedorId } = formData;
    const mandioca = formData.categoria === 'Raiz In Natura';
    const fornecedorSel = !mandioca && fornecedorId ? carregarFornecedores().find(f => f.id === fornecedorId) : undefined;
    const dados = {
      ...semFornecedorId,
      fornecedor_principal: mandioca ? 'Agricultores' : fornecedorSel ? (fornecedorSel.fantasia || fornecedorSel.razao_nome) : ''
    } as Omit<MateriaPrimaEstoque, 'id' | 'status'>;
    const gravarVinculoFornecedor = (mp: MateriaPrimaEstoque) => {
      if (!ehMandioca(mp)) definirFornecedorDaMateriaPrima(mp, fornecedorId);
    };

    if (modoEdicao) {
      // Troca de unidade: converte saldo, mínimo e custo quando as unidades são compatíveis (ex.: TON -> KG)
      let { estoque_atual, estoque_minimo, custo_medio_unitario } = dados;
      if (modoEdicao.unidade_medida !== dados.unidade_medida) {
        const fator = converterQuantidade(1, modoEdicao.unidade_medida, dados.unidade_medida);
        if (fator) {
          estoque_atual = parseFloat((modoEdicao.estoque_atual * fator).toFixed(4));
          estoque_minimo = parseFloat((dados.estoque_minimo * fator).toFixed(4));
          custo_medio_unitario = parseFloat((dados.custo_medio_unitario / fator).toFixed(6));
        }
      }
      const status = calcularStatusMateriaPrima(estoque_atual, estoque_minimo);
      const atualizados = materias.map(m => {
        if (m.id === modoEdicao.id) {
          return {
            ...m,
            ...dados,
            estoque_atual,
            estoque_minimo,
            custo_medio_unitario,
            status
          };
        }
        return m;
      });
      salvarMateriaPrima(atualizados);
      const salva = atualizados.find(m => m.id === modoEdicao.id);
      if (salva) gravarVinculoFornecedor(salva);
    } else {
      const status = calcularStatusMateriaPrima(dados.estoque_atual, dados.estoque_minimo);
      const novo: MateriaPrimaEstoque = {
        id: `mat_${Date.now()}`,
        ...dados,
        status
      };
      if (novo.estoque_atual > 0) {
        registrarMovimentoMateriaPrima(novo, {
          tipo: 'ENTRADA',
          quantidade: novo.estoque_atual,
          custo_unitario: novo.custo_medio_unitario,
          observacao: 'Saldo inicial no cadastro'
        }, false);
      }
      salvarMateriaPrima([novo, ...materias]);
      gravarVinculoFornecedor(novo);
    }
    setModalAberto(false);
  };

  // Movimentação de estoque (entrada / uso / perda / contagem)
  const [mpMovimentando, setMpMovimentando] = useState<MateriaPrimaEstoque | null>(null);
  const [movTipo, setMovTipo] = useState<TipoMovimentoMP>('ENTRADA');
  const [movQtd, setMovQtd] = useState('');
  const [movCusto, setMovCusto] = useState('');
  const [movData, setMovData] = useState('');
  const [movObs, setMovObs] = useState('');
  const [movErro, setMovErro] = useState<string | null>(null);
  const [historicoMov, setHistoricoMov] = useState<MovimentoMateriaPrima[]>([]);

  const abrirMovimentacao = (item: MateriaPrimaEstoque) => {
    setMpMovimentando(item);
    setMovTipo('ENTRADA');
    setMovQtd('');
    setMovCusto(item.custo_medio_unitario ? item.custo_medio_unitario.toFixed(2) : '');
    setMovData(new Date().toLocaleDateString('sv-SE'));
    setMovObs('');
    setMovErro(null);
    setHistoricoMov(carregarMovimentosMateriaPrima(item.id).slice(0, 30));
  };

  const handleSalvarMovimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpMovimentando) return;
    const atual = carregarMateriaPrima().find(m => m.id === mpMovimentando.id) || mpMovimentando;
    const res = registrarMovimentoMateriaPrima(atual, {
      tipo: movTipo,
      quantidade: parseFloat(movQtd.replace(',', '.')),
      custo_unitario: movTipo === 'ENTRADA' ? parseFloat(movCusto.replace(',', '.')) || undefined : undefined,
      data: movData,
      observacao: movObs
    });
    if (res.erro || !res.materia) {
      setMovErro(res.erro || 'Não foi possível registrar.');
      return;
    }
    setMpMovimentando(null);
  };

  const ROTULO_MOV: Record<TipoMovimentoMP, string> = {
    ENTRADA: 'Entrada / Abastecimento',
    SAIDA: 'Uso / Abertura',
    PERDA: 'Perda / Descarte',
    AJUSTE: 'Contagem (Ajuste)'
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja excluir esta matéria-prima do estoque?')) {
      salvarMateriaPrima(materias.filter(m => m.id !== id));
    }
  };

  const situacao = (item: MateriaPrimaEstoque): { tom: TomStatus; rotulo: string } =>
    item.status === 'NORMAL'
      ? { tom: 'pago', rotulo: 'Normal' }
      : item.status === 'CRITICO'
      ? { tom: 'vencido', rotulo: 'Crítico' }
      : { tom: 'aguardando', rotulo: 'Repor' };
  const qtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const CATEGORIAS_MP: MateriaPrimaEstoque['categoria'][] = ['Raiz In Natura', 'Ingredientes', 'Biomassa / Lenha', 'Embalagens', 'Insumos Industriais'];
  const semNenhuma = materias.length === 0;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_materia_prima" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Matéria-prima"
            resumo={
              semNenhuma ? (
                'Nenhum insumo cadastrado'
              ) : (
                <>
                  {materias.length} {materias.length === 1 ? 'insumo' : 'insumos'}
                  {metricas.alertas > 0 ? (
                    <span className="font-semibold text-st-aguardando"> · {metricas.alertas} precisando reposição</span>
                  ) : (
                    <span> · estoque abastecido</span>
                  )}
                </>
              )
            }
            acoes={
              semNenhuma ? undefined : (
                <BotaoPrimario onClick={handleAbrirNovo} className="w-full sm:w-auto h-11 sm:h-9">
                  <Plus className="w-4 h-4" />
                  Novo insumo
                </BotaoPrimario>
              )
            }
          />

          {!semNenhuma && (
            <div className="px-4 sm:px-6 pb-4">
              <FaixaNumerosProdutos colunas={5}>
                <CardNumero destaque rotulo="Raiz no pátio e silos" valor={metricas.raizTon.toLocaleString('pt-BR')} unidade="t" detalhe="Mandioca in natura, convertida para toneladas" />
                <CardNumero rotulo="Lenha da caldeira" valor={metricas.lenhaM3.toLocaleString('pt-BR')} unidade="m³" detalhe="estéreos" />
                <CardNumero rotulo="Sacos ráfia 25 kg" valor={metricas.sacariaUn.toLocaleString('pt-BR')} unidade="un" />
                <CardNumero
                  rotulo="Repor"
                  valor={metricas.alertas}
                  unidade={metricas.alertas === 1 ? 'insumo' : 'insumos'}
                  detalhe={metricas.alertas > 0 ? 'Abaixo do mínimo' : 'Nenhum abaixo do mínimo'}
                  alerta={metricas.alertas > 0 ? 'aguardando' : undefined}
                />
                <CardNumero rotulo="Insumos" valor={materias.length} unidade="cadastrados" />
              </FaixaNumerosProdutos>
            </div>
          )}

          {!semNenhuma && (
            <BarraFiltros>
              <Segmentado<string>
                rotuloAria="Categoria do insumo"
                valor={filtroCategoria}
                onChange={setFiltroCategoria}
                opcoes={[
                  { valor: 'TODAS', rotulo: 'Todas', contagem: materias.length },
                  ...CATEGORIAS_MP.map(c => ({ valor: c, rotulo: c, contagem: materias.filter(m => m.categoria === c).length })),
                ]}
              />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar insumo, código ou fornecedor" className="w-full md:w-72" />
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-8">
            {materiasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                {semNenhuma ? (
                  <EstadoVazio
                    titulo="Nenhuma matéria-prima"
                    texto="Cadastre a mandioca, as embalagens e os ingredientes. As receitas só usam insumos cadastrados aqui."
                    acao={
                      <BotaoPrimario onClick={handleAbrirNovo}>
                        <Plus className="w-4 h-4" />
                        Novo insumo
                      </BotaoPrimario>
                    }
                  />
                ) : (
                  <EstadoVazio
                    titulo="Nenhum insumo com esses filtros"
                    texto="Mude a categoria ou a busca para ver os outros insumos."
                    acao={<BotaoSecundario onClick={() => { setBusca(''); setFiltroCategoria('TODAS'); }}>Limpar filtros</BotaoSecundario>}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <ul className="sm:hidden bg-papel border border-linha rounded-md">
                  {materiasFiltradas.map(item => {
                    const st = situacao(item);
                    const o = origemDaMateriaPrima(item);
                    return (
                      <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-tinta leading-snug">{item.nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">
                              {item.codigo} · {item.categoria} ·{' '}
                              <span className={o.semFornecedor ? 'font-semibold text-st-aguardando' : ''}>{o.texto}</span>
                            </div>
                          </div>
                          <StatusChip tom={st.tom} className="shrink-0">{st.rotulo}</StatusChip>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">
                              {qtd(item.estoque_atual)} <span className="text-[12px] font-semibold text-cinza">{item.unidade_medida}</span>
                            </div>
                            <div className="text-[11.5px] text-cinza tabular-nums">mínimo {qtd(item.estoque_minimo)} {item.unidade_medida}</div>
                          </div>
                          <div className="text-right text-[12px] text-cinza tabular-nums">
                            <div className="text-[14px] font-semibold text-tinta-2">{formatarMoeda(item.custo_medio_unitario)}</div>
                            por {item.unidade_medida}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2.5">
                          <BotaoCartao primario onClick={() => abrirMovimentacao(item)}>
                            <ArrowDownUp className="w-3.5 h-3.5" /> Movimentar
                          </BotaoCartao>
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
                      <Th>Insumo</Th>
                      <Th>Categoria</Th>
                      <Th>Local</Th>
                      <Th numero>Saldo</Th>
                      <Th numero>Custo médio</Th>
                      <Th>Situação</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiasFiltradas.map(item => {
                      const st = situacao(item);
                      const o = origemDaMateriaPrima(item);
                      return (
                        <tr key={item.id} className={tabela.tr}>
                          <Td className="max-w-[360px]">
                            <div className="font-semibold text-tinta">{item.nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">
                              {item.codigo} · <span className={o.semFornecedor ? 'font-semibold text-st-aguardando' : ''}>{o.texto}</span>
                            </div>
                          </Td>
                          <Td className="whitespace-nowrap">{item.categoria}</Td>
                          <Td className="text-cinza">{item.localizacao_patio || '—'}</Td>
                          <Td numero>
                            <div className="font-semibold text-tinta">
                              {qtd(item.estoque_atual)} <span className="text-[11.5px] font-normal text-cinza">{item.unidade_medida}</span>
                            </div>
                            <div className="text-[11px] text-cinza">mín. {qtd(item.estoque_minimo)}</div>
                          </Td>
                          <Td numero>
                            <span className="font-semibold text-tinta">{formatarMoeda(item.custo_medio_unitario)}</span>
                            <span className="text-[11px] text-cinza"> /{item.unidade_medida}</span>
                          </Td>
                          <Td>
                            <StatusChip tom={st.tom}>{st.rotulo}</StatusChip>
                          </Td>
                          <Td className="text-right">
                            <div className="inline-flex items-center gap-0.5">
                              <BotaoSecundario onClick={() => abrirMovimentacao(item)} className="h-8 px-2.5 text-[12.5px] mr-1" title="Entrada, uso, perda ou contagem do estoque">
                                <ArrowDownUp className="w-3.5 h-3.5" /> Movimentar
                              </BotaoSecundario>
                              <BotaoIcone rotulo="Editar insumo" onClick={() => handleAbrirEdicao(item)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </BotaoIcone>
                              <BotaoIcone rotulo="Excluir insumo" perigo onClick={() => handleExcluir(item.id)}>
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

      {/* MODAL NOVO / EDITAR INSUMO */}
      {modalAberto && (
        <ModalFolha
          titulo={modoEdicao ? `Editar ${modoEdicao.nome}` : 'Novo insumo'}
          subtitulo="Matéria-prima usada nas receitas: unidade, custo médio, fornecedor e local."
          onFechar={() => setModalAberto(false)}
          onSubmit={handleSalvar}
          largura="sm:max-w-4xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit">
                <Save className="w-4 h-4" />
                Salvar insumo
              </BotaoPrimario>
            </>
          }
        >
          <Secao titulo="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <Campo rotulo="Descrição do insumo *" className="sm:col-span-8">
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Raiz de Mandioca In Natura Lavada"
                  className={form.campo}
                />
              </Campo>
              <Campo rotulo="Código *" className="sm:col-span-4">
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className={`${form.campo} tabular-nums`}
                />
              </Campo>
              <Campo rotulo="Categoria *" className="sm:col-span-4">
                <select required value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })} className={form.select}>
                  <option value="">Selecione</option>
                  <option value="Raiz In Natura">Raiz In Natura</option>
                  <option value="Ingredientes">Ingredientes (trigo, sal, temperos...)</option>
                  <option value="Biomassa / Lenha">Biomassa / Lenha</option>
                  <option value="Embalagens">Embalagens</option>
                  <option value="Insumos Industriais">Insumos Industriais</option>
                </select>
              </Campo>
              <Campo
                rotulo="Unidade de medida *"
                className="sm:col-span-4"
                ajuda={
                  modoEdicao && formData.unidade_medida && modoEdicao.unidade_medida !== formData.unidade_medida ? (
                    <span className="font-semibold text-st-aguardando">Saldo, mínimo e custo serão convertidos para a nova unidade quando possível.</span>
                  ) : undefined
                }
              >
                <select required value={formData.unidade_medida} onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value as any })} className={form.select}>
                  <option value="">Selecione</option>
                  <option value="KG">KG (Quilo)</option>
                  <option value="G">G (Grama)</option>
                  <option value="UN">UN (Unidade)</option>
                  <option value="TON">TON (Tonelada)</option>
                  <option value="LITRO">LITRO</option>
                  <option value="ML">ML (Mililitro)</option>
                  <option value="ESTÉREO (m³)">ESTÉREO (m³)</option>
                </select>
              </Campo>
              <Campo rotulo="Fornecedor" className="sm:col-span-4">
                {formData.categoria === 'Raiz In Natura' ? (
                  <div className="flex h-11 sm:h-9 items-center rounded-md border border-eno-100 bg-eno-50 px-3 text-[13px] font-semibold text-eno-700">
                    Agricultores (cadastro de agricultores)
                  </div>
                ) : (
                  <select value={formData.fornecedor_id} onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })} className={form.select}>
                    <option value="">{SEM_FORNECEDOR}</option>
                    {carregarFornecedores().filter(f => f.ativo !== false).map(f => (
                      <option key={f.id} value={f.id}>{f.fantasia || f.razao_nome}</option>
                    ))}
                  </select>
                )}
              </Campo>
            </div>
          </Secao>

          <Secao titulo="Estoque e custo">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <Campo
                rotulo={modoEdicao ? 'Saldo atual' : 'Saldo inicial'}
                className="sm:col-span-3"
                ajuda={modoEdicao ? <>Altere o saldo pelo botão <b>Movimentar</b>.</> : undefined}
              >
                <CampoNumero
                  step="any"
                  min={0}
                  value={formData.estoque_atual}
                  readOnly={!!modoEdicao}
                  onChange={(n) => setFormData({ ...formData, estoque_atual: n })}
                  className={modoEdicao ? form.campoLeitura : form.campoNumero}
                />
              </Campo>
              <Campo rotulo="Custo médio (R$)" className="sm:col-span-3">
                <CampoNumero step="0.01" min={0} value={formData.custo_medio_unitario} onChange={(n) => setFormData({ ...formData, custo_medio_unitario: n })} className={form.campoNumero} />
              </Campo>
              <Campo rotulo="Localização no pátio / silos" className="sm:col-span-6">
                <input
                  type="text"
                  value={formData.localizacao_patio}
                  onChange={(e) => setFormData({ ...formData, localizacao_patio: e.target.value })}
                  placeholder="Ex: Pátio de Descarga & Silos"
                  className={form.campo}
                />
              </Campo>
            </div>
          </Secao>
        </ModalFolha>
      )}

      {/* MODAL: MOVIMENTAR ESTOQUE DO INSUMO */}
      {mpMovimentando && (
        <ModalFolha
          titulo={`Movimentar ${mpMovimentando.nome}`}
          subtitulo={
            <>
              Saldo {qtd(mpMovimentando.estoque_atual)} {mpMovimentando.unidade_medida} · custo médio {formatarMoeda(mpMovimentando.custo_medio_unitario)}/{mpMovimentando.unidade_medida}
            </>
          }
          onFechar={() => setMpMovimentando(null)}
          onSubmit={handleSalvarMovimento}
          largura="sm:max-w-2xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setMpMovimentando(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit">
                <Check className="w-4 h-4" />
                Registrar
              </BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Tipo de movimento">
            {(Object.keys(ROTULO_MOV) as TipoMovimentoMP[]).map(tipo => {
              const ativo = movTipo === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => { setMovTipo(tipo); setMovErro(null); }}
                  className={`min-h-11 px-2.5 py-2 rounded-md border text-[12.5px] font-semibold leading-tight transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
                    ativo ? 'bg-eno-800 border-eno-800 text-white' : 'bg-papel border-linha-forte text-tinta-2 hover:bg-papel-3'
                  }`}
                >
                  {ROTULO_MOV[tipo]}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo rotulo={`${movTipo === 'AJUSTE' ? 'Quantidade contada' : 'Quantidade'} (${mpMovimentando.unidade_medida}) *`}>
              <input type="number" inputMode="decimal" step="any" min="0" required value={movQtd} onChange={(e) => setMovQtd(e.target.value)} className={form.campoNumero} />
            </Campo>
            {movTipo === 'ENTRADA' && (
              <Campo rotulo={`Custo por ${mpMovimentando.unidade_medida} (R$)`}>
                <input type="number" inputMode="decimal" step="any" min="0" value={movCusto} onChange={(e) => setMovCusto(e.target.value)} className={form.campoNumero} />
              </Campo>
            )}
            <Campo rotulo="Data">
              <input type="date" value={movData} onChange={(e) => setMovData(e.target.value)} className={form.campo} />
            </Campo>
          </div>

          <Campo rotulo="Observação">
            <input
              type="text"
              value={movObs}
              onChange={(e) => setMovObs(e.target.value)}
              placeholder={movTipo === 'ENTRADA' ? 'Ex.: NF 1234, fornecedor...' : movTipo === 'SAIDA' ? 'Ex.: abriu 2 sacos para a produção' : movTipo === 'PERDA' ? 'Ex.: saco rasgado, vencido' : 'Ex.: inventário do mês'}
              className={form.campo}
            />
          </Campo>

          {(() => {
            const q = parseFloat(movQtd.replace(',', '.'));
            if (!(q >= 0)) return null;
            const saldo = mpMovimentando.estoque_atual;
            const novo = movTipo === 'ENTRADA' ? saldo + q : movTipo === 'AJUSTE' ? q : saldo - q;
            return (
              <div className={`flex items-baseline justify-between gap-3 rounded-md border px-3.5 py-2.5 ${novo < 0 ? 'bg-st-vencido-bg border-st-vencido/20 text-st-vencido' : 'bg-eno-50 border-eno-100 text-tinta'}`}>
                <span className="text-[12.5px] font-semibold">Saldo após o movimento</span>
                <span className="text-[18px] font-extrabold tabular-nums">
                  {parseFloat(novo.toFixed(4)).toLocaleString('pt-BR')} <span className="text-[12px] font-semibold">{mpMovimentando.unidade_medida}</span>
                </span>
              </div>
            );
          })()}

          {movErro && (
            <Aviso tom="vencido" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {movErro}
            </Aviso>
          )}

          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-cinza mb-2">Histórico de movimentações</h3>
            {historicoMov.length === 0 ? (
              <p className="text-[12.5px] text-cinza">Nenhuma movimentação registrada ainda.</p>
            ) : (
              <ul className="rounded-md border border-linha bg-papel">
                {historicoMov.map(m => {
                  const positivo = m.tipo === 'ENTRADA' || (m.tipo === 'AJUSTE' && m.quantidade >= 0);
                  return (
                    <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2 border-b border-linha last:border-b-0">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-tinta">{ROTULO_MOV[m.tipo]}</div>
                        <div className="text-[11.5px] text-cinza tabular-nums truncate">
                          {m.data.split('-').reverse().join('/')}
                          {m.observacao ? ` · ${m.observacao}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className={`text-[13px] font-bold ${positivo ? 'text-st-pago' : 'text-st-vencido'}`}>
                          {positivo ? '+' : '−'}{Math.abs(m.quantidade).toLocaleString('pt-BR')} {m.unidade_medida}
                        </div>
                        <div className="text-[11px] text-cinza">saldo {m.saldo_posterior.toLocaleString('pt-BR')}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </ModalFolha>
      )}
    </div>
  );
}
