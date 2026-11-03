import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import { Plus, Eye, Edit2, Trash2, Printer, CheckCircle2, Copy, Check, Save, PlusCircle } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, BotaoTopo, Secao, Campo, form, BotaoIcone, BotaoCartao, Aviso } from './kitProdutos';
import {
  FichaTecnica,
  ItemFichaTecnica,
  FICHAS_TECNICAS_INICIAIS,
  carregarFichasTecnicas,
  salvarFichasTecnicas,
  carregarEstoqueProdutos,
  carregarReceitas,
  assinaturaComposicaoReceita,
  consumoPorPacoteDaReceita,
  ReceitaIndustrial
} from '../../data/produtosData';
import { RefreshCw } from 'lucide-react';

const fmtQtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });

// Itens da ficha gerados a partir da composição da receita (MP, quantidade por pacote e por batelada)
function itensDaReceita(rec?: ReceitaIndustrial): ItemFichaTecnica[] {
  if (!rec) return [];
  return consumoPorPacoteDaReceita(rec).map(c => ({
    item_nome: c.materia_prima_nome,
    quantidade: `${fmtQtd(c.quantidade_por_pacote)} ${c.unidade_medida}/pacote (${fmtQtd(c.quantidade_receita)} ${c.unidade_medida} na batelada de ${rec.rendimento_pacotes})`,
    origem: 'RECEITA' as const,
    materia_prima_id: c.materia_prima_id
  }));
}
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

// Normaliza itens garantindo que mesmo fichas antigas tenham o array dinâmico
function normalizarFichas(fichas: FichaTecnica[]): FichaTecnica[] {
  return fichas.map(f => {
    if (f.itens_especificacao && Array.isArray(f.itens_especificacao) && f.itens_especificacao.length > 0) {
      return f;
    }
    const itens: ItemFichaTecnica[] = [];
    if (f.umidade_maxima_percentual) itens.push({ item_nome: 'Umidade Máxima', quantidade: `${f.umidade_maxima_percentual}%` });
    if (f.ph_faixa) itens.push({ item_nome: 'Faixa de pH', quantidade: f.ph_faixa });
    if (f.acidez_maxima_cm3) itens.push({ item_nome: 'Acidez Titulável', quantidade: `${f.acidez_maxima_cm3} cm³` });
    if (f.cinzas_maximas_percentual) itens.push({ item_nome: 'Teor de Cinzas', quantidade: `${f.cinzas_maximas_percentual}%` });
    if (f.viscosidade_brookfield_cp) itens.push({ item_nome: 'Viscosidade Brookfield', quantidade: `${f.viscosidade_brookfield_cp} cP` });
    if (f.prazo_validade_meses) itens.push({ item_nome: 'Prazo de Validade', quantidade: `${f.prazo_validade_meses} meses` });
    if (itens.length === 0) {
      itens.push({ item_nome: 'Item Principal', quantidade: '100%' });
    }
    return { ...f, itens_especificacao: itens };
  });
}

export function ProdutosFichaTecnica({ onNavigate }: Props) {
  const [fichas, setFichas] = useState<FichaTecnica[]>(() => normalizarFichas(carregarFichasTecnicas()));
  const [busca, setBusca] = useState('');
  const [produtosEstoque, setProdutosEstoque] = useState(() => carregarEstoqueProdutos());
  const [receitas, setReceitas] = useState<ReceitaIndustrial[]>(() => carregarReceitas());
  const [formReceitaId, setFormReceitaId] = useState('');
  const [formAssinatura, setFormAssinatura] = useState('');
  const [formValidadeMeses, setFormValidadeMeses] = useState<number>(24);

  const receitaDoProduto = (produtoId: string) => {
    const prod = produtosEstoque.find(p => p.id === produtoId);
    return prod?.receita_id ? receitas.find(r => r.id === prod.receita_id) : undefined;
  };

  // Substitui os itens vindos da receita, mantendo os itens livres preenchidos
  const aplicarItensDaReceita = (produtoId: string, itensAtuais: ItemFichaTecnica[]) => {
    const rec = receitaDoProduto(produtoId);
    const livres = itensAtuais.filter(it => it.origem !== 'RECEITA' && (it.item_nome.trim() !== '' || it.quantidade.trim() !== ''));
    const daReceita = itensDaReceita(rec);
    setFormReceitaId(rec?.id || '');
    setFormAssinatura(assinaturaComposicaoReceita(rec));
    const novos = [...daReceita, ...livres];
    setFormItens(novos.length > 0 ? novos : [{ item_nome: '', quantidade: '' }]);
  };

  const fichaDesatualizada = (f: FichaTecnica) => {
    if (!f.produto_id) return false;
    const rec = receitaDoProduto(f.produto_id);
    if (!rec) return false;
    return f.receita_id !== rec.id || (f.receita_assinatura || '') !== assinaturaComposicaoReceita(rec);
  };
  
  // Modais
  const [fichaVisualizar, setFichaVisualizar] = useState<FichaTecnica | null>(null);
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [fichaEmEdicao, setFichaEmEdicao] = useState<FichaTecnica | null>(null);
  
  // Toast & Copiar
  const [toastMsg, setToastMsg] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Form State: Dinâmico sem espaços fixos forçados!
  const [formProdutoId, setFormProdutoId] = useState('');
  const [formProdutoNome, setFormProdutoNome] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formRegistroMapa, setFormRegistroMapa] = useState('');
  
  // A pessoa adiciona as coisas que quer e a quantidade que quer!
  const [formItens, setFormItens] = useState<ItemFichaTecnica[]>([
    { item_nome: '', quantidade: '' }
  ]);

  const dispararToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const handleAtualizacao = () => {
      setFichas(normalizarFichas(carregarFichasTecnicas()));
      setProdutosEstoque(carregarEstoqueProdutos());
      setReceitas(carregarReceitas());
    };
    window.addEventListener('fichas_tecnicas_updated', handleAtualizacao);
    window.addEventListener('produtos_updated', handleAtualizacao);
    window.addEventListener('receitas_updated', handleAtualizacao);
    return () => {
      window.removeEventListener('fichas_tecnicas_updated', handleAtualizacao);
      window.removeEventListener('produtos_updated', handleAtualizacao);
      window.removeEventListener('receitas_updated', handleAtualizacao);
    };
  }, []);

  const fichasFiltradas = fichas.filter(f =>
    f.produto_nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.codigo && f.codigo.toLowerCase().includes(busca.toLowerCase())) ||
    (f.registro_sif_mapa && f.registro_sif_mapa.toLowerCase().includes(busca.toLowerCase())) ||
    (f.itens_especificacao && f.itens_especificacao.some(it => it.item_nome.toLowerCase().includes(busca.toLowerCase())))
  );

  // Adicionar uma nova linha de item livre
  const handleAdicionarItemLinha = () => {
    setFormItens([...formItens, { item_nome: '', quantidade: '' }]);
  };

  // Atualizar campo de uma linha
  const handleAtualizarItemLinha = (idx: number, campo: keyof ItemFichaTecnica, valor: string) => {
    const novos = [...formItens];
    novos[idx] = { ...novos[idx], [campo]: valor };
    setFormItens(novos);
  };

  // Remover uma linha
  const handleRemoverItemLinha = (idx: number) => {
    if (formItens.length === 1) {
      setFormItens([{ item_nome: '', quantidade: '' }]);
      return;
    }
    setFormItens(formItens.filter((_, i) => i !== idx));
  };

  // Abrir Modal para Nova Ficha
  const handleAbrirNova = () => {
    setFichaEmEdicao(null);
    setFormProdutoId('');
    setFormProdutoNome('');
    setFormCodigo(`FT-${Date.now().toString().slice(-4)}`);
    setFormDescricao('');
    setFormRegistroMapa('SIF nº 0048/2024');
    setFormReceitaId('');
    setFormAssinatura('');
    setFormValidadeMeses(24);
    // Inicia com linhas livres para o usuário colocar o que quiser e a quantidade que quiser
    setFormItens([
      { item_nome: '', quantidade: '' },
      { item_nome: '', quantidade: '' }
    ]);
    setModalFormAberto(true);
  };

  // Abrir Modal para Editar Ficha
  const handleAbrirEdicao = (ficha: FichaTecnica) => {
    setFichaEmEdicao(ficha);
    setFormProdutoId(ficha.produto_id || '');
    setFormProdutoNome(ficha.produto_nome);
    setFormCodigo(ficha.codigo || `FT-${Date.now().toString().slice(-4)}`);
    setFormDescricao(ficha.descricao_padrao || '');
    setFormRegistroMapa(ficha.registro_sif_mapa || '');
    setFormReceitaId(ficha.receita_id || '');
    setFormAssinatura(ficha.receita_assinatura || '');
    setFormValidadeMeses(Number(ficha.prazo_validade_meses) || 24);
    
    // Se a ficha já tem itens, carrega eles; senão, cria uma linha vazia
    if (ficha.itens_especificacao && ficha.itens_especificacao.length > 0) {
      setFormItens(ficha.itens_especificacao.map(it => ({ ...it })));
    } else {
      setFormItens([{ item_nome: '', quantidade: '' }]);
    }

    if (fichaVisualizar) setFichaVisualizar(null);
    setModalFormAberto(true);
  };

  // Salvar (Criar ou Editar)
  const handleSalvarFicha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProdutoNome.trim()) return;

    // Filtra apenas itens preenchidos
    const itensValidos = formItens.filter(it => it.item_nome.trim() !== '' || it.quantidade.trim() !== '');

    if (itensValidos.length === 0) {
      alert('Por favor, adicione ao menos um item com sua quantidade.');
      return;
    }

    if (fichaEmEdicao) {
      const atualizadas = fichas.map(f => {
        if (f.id === fichaEmEdicao.id) {
          return {
            ...f,
            produto_id: formProdutoId,
            produto_nome: formProdutoNome,
            codigo: formCodigo,
            descricao_padrao: formDescricao,
            registro_sif_mapa: formRegistroMapa,
            itens_especificacao: itensValidos,
            receita_id: formReceitaId || undefined,
            receita_assinatura: formAssinatura || undefined,
            prazo_validade_meses: formValidadeMeses > 0 ? formValidadeMeses : undefined
          };
        }
        return f;
      });
      salvarFichasTecnicas(atualizadas);
      setFichas(atualizadas);
      dispararToast(`Ficha técnica de "${formProdutoNome}" atualizada com sucesso!`);
    } else {
      const nova: FichaTecnica = {
        id: `ft_${Date.now()}`,
        produto_id: formProdutoId,
        produto_nome: formProdutoNome,
        codigo: formCodigo,
        descricao_padrao: formDescricao,
        registro_sif_mapa: formRegistroMapa,
        itens_especificacao: itensValidos,
        receita_id: formReceitaId || undefined,
        receita_assinatura: formAssinatura || undefined,
        prazo_validade_meses: formValidadeMeses > 0 ? formValidadeMeses : undefined
      };
      const atualizadas = [nova, ...fichas];
      salvarFichasTecnicas(atualizadas);
      setFichas(atualizadas);
      dispararToast(`Nova ficha técnica de "${formProdutoNome}" incluída com sucesso!`);
    }

    setModalFormAberto(false);
  };

  // Excluir
  const handleExcluir = (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a ficha técnica "${nome}"?`)) {
      const atualizadas = fichas.filter(f => f.id !== id);
      salvarFichasTecnicas(atualizadas);
      setFichas(atualizadas);
      if (fichaVisualizar?.id === id) setFichaVisualizar(null);
      dispararToast(`Ficha técnica "${nome}" excluída.`);
    }
  };

  // Copiar resumo
  const handleCopiarTexto = (f: FichaTecnica) => {
    let texto = `*FICHA TÉCNICA - GRUPO ENO*\n`;
    texto += `*Produto:* ${f.produto_nome}\n`;
    if (f.codigo) texto += `*Código:* ${f.codigo}\n`;
    if (f.registro_sif_mapa) texto += `*Registro:* ${f.registro_sif_mapa}\n`;
    if (f.descricao_padrao) texto += `*Descrição:* ${f.descricao_padrao}\n`;
    texto += `\n*ITENS & QUANTIDADES DEFINIDAS:*\n`;

    (f.itens_especificacao || []).forEach(it => {
      texto += `• ${it.item_nome}: ${it.quantidade}\n`;
    });

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const semNenhuma = fichas.length === 0;
  const desatualizadas = fichas.filter(fichaDesatualizada).length;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_ficha_tecnica" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Fichas técnicas"
            resumo={
              semNenhuma ? (
                'Nenhuma ficha cadastrada'
              ) : (
                <>
                  {fichas.length} {fichas.length === 1 ? 'ficha' : 'fichas'} · itens e quantidades livres, prontas para imprimir ou enviar
                  {desatualizadas > 0 && (
                    <span className="font-semibold text-st-aguardando"> · {desatualizadas} com receita alterada</span>
                  )}
                </>
              )
            }
            acoes={
              semNenhuma ? undefined : (
                <BotaoPrimario onClick={handleAbrirNova} className="w-full sm:w-auto h-11 sm:h-9">
                  <Plus className="w-4 h-4" />
                  Nova ficha técnica
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
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produto, código ou item" className="w-full md:w-80" />
              <span className="hidden md:block text-[12.5px] text-cinza tabular-nums">
                {fichasFiltradas.length} de {fichas.length}
              </span>
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-8">
            {fichasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                {semNenhuma ? (
                  <EstadoVazio
                    titulo="Nenhuma ficha técnica"
                    texto="Escolha o produto e a ficha puxa as matérias-primas da receita. Depois acrescente umidade, validade ou o que quiser."
                    acao={
                      <BotaoPrimario onClick={handleAbrirNova}>
                        <Plus className="w-4 h-4" />
                        Nova ficha técnica
                      </BotaoPrimario>
                    }
                  />
                ) : (
                  <EstadoVazio
                    titulo="Nenhuma ficha encontrada"
                    texto={`Nada com "${busca}". Busque pelo nome do produto, código ou um item da ficha.`}
                    acao={<BotaoSecundario onClick={() => setBusca('')}>Limpar busca</BotaoSecundario>}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <ul className="sm:hidden bg-papel border border-linha rounded-md">
                  {fichasFiltradas.map(f => {
                    const itens = f.itens_especificacao || [];
                    return (
                      <li key={f.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-tinta leading-snug">{f.produto_nome}</div>
                            <div className="text-[11.5px] text-cinza tabular-nums">
                              {f.codigo || f.registro_sif_mapa || 'Sem código'} · {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                            </div>
                          </div>
                          {fichaDesatualizada(f) && <StatusChip tom="aguardando" className="shrink-0">Receita alterada</StatusChip>}
                        </div>
                        {itens.length > 0 && (
                          <dl className="mt-2 space-y-0.5 text-[12.5px]">
                            {itens.slice(0, 3).map((it, idx) => (
                              <div key={idx} className="flex items-baseline justify-between gap-3">
                                <dt className="min-w-0 truncate text-tinta-2">{it.item_nome}</dt>
                                <dd className="shrink-0 font-semibold tabular-nums text-tinta">{it.quantidade}</dd>
                              </div>
                            ))}
                            {itens.length > 3 && <div className="text-[11.5px] text-cinza">+{itens.length - 3} itens</div>}
                          </dl>
                        )}
                        <div className="flex gap-2 mt-2.5">
                          <BotaoCartao primario onClick={() => setFichaVisualizar(f)}>
                            <Eye className="w-3.5 h-3.5" /> Ver ficha
                          </BotaoCartao>
                          <BotaoCartao onClick={() => handleAbrirEdicao(f)}>
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </BotaoCartao>
                          <BotaoIcone rotulo={`Excluir ficha ${f.produto_nome}`} perigo onClick={() => handleExcluir(f.id, f.produto_nome)} className="border border-linha-forte">
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
                      <Th>Produto</Th>
                      <Th>Código</Th>
                      <Th>Itens da ficha</Th>
                      <Th numero>Itens</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichasFiltradas.map(f => {
                      const itens = f.itens_especificacao || [];
                      return (
                        <tr key={f.id} className={tabela.tr}>
                          <Td className="max-w-[320px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-tinta">{f.produto_nome}</span>
                              {fichaDesatualizada(f) && <StatusChip tom="aguardando">Receita alterada</StatusChip>}
                            </div>
                            {f.descricao_padrao && <div className="text-[11.5px] text-cinza truncate">{f.descricao_padrao}</div>}
                          </Td>
                          <Td className="whitespace-nowrap tabular-nums">{f.codigo || f.registro_sif_mapa || '—'}</Td>
                          <Td>
                            <div className="text-[12.5px] text-tinta-2 max-w-xl line-clamp-2">
                              {itens.slice(0, 4).map((it, idx) => (
                                <span key={idx}>
                                  {idx > 0 && <span className="text-cinza-claro"> · </span>}
                                  {it.item_nome} <span className="font-semibold tabular-nums text-tinta">{it.quantidade}</span>
                                </span>
                              ))}
                              {itens.length > 4 && <span className="text-cinza"> · +{itens.length - 4}</span>}
                            </div>
                          </Td>
                          <Td numero>{itens.length}</Td>
                          <Td className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-0.5">
                              <BotaoSecundario onClick={() => setFichaVisualizar(f)} className="h-8 px-2.5 text-[12.5px] mr-1" title="Ver a ficha completa para imprimir ou enviar">
                                <Eye className="w-3.5 h-3.5" /> Ver ficha
                              </BotaoSecundario>
                              <BotaoIcone rotulo="Editar ficha" onClick={() => handleAbrirEdicao(f)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </BotaoIcone>
                              <BotaoIcone rotulo="Excluir ficha" perigo onClick={() => handleExcluir(f.id, f.produto_nome)}>
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

      {/* MODAL INCLUIR / EDITAR FICHA */}
      {modalFormAberto && (
        <ModalFolha
          titulo={fichaEmEdicao ? `Editar ficha · ${fichaEmEdicao.produto_nome}` : 'Nova ficha técnica'}
          subtitulo="Escolha o produto, confira os itens da receita e acrescente o que quiser."
          onFechar={() => setModalFormAberto(false)}
          onSubmit={handleSalvarFicha}
          largura="sm:max-w-4xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalFormAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit">
                <Save className="w-4 h-4" />
                {fichaEmEdicao ? 'Salvar alterações' : 'Salvar ficha'}
              </BotaoPrimario>
            </>
          }
        >
          <Secao titulo="Produto">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <Campo rotulo="Produto do estoque *" className="sm:col-span-8">
                <select
                  required
                  value={formProdutoId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const prod = produtosEstoque.find(p => p.id === selectedId);
                    setFormProdutoId(selectedId);
                    if (prod) setFormProdutoNome(prod.nome);
                    // Preenche automaticamente com as matérias-primas da receita do produto
                    aplicarItensDaReceita(selectedId, formItens);
                  }}
                  className={form.select}
                >
                  <option value="">Selecione um produto</option>
                  {produtosEstoque.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.tipo_embalagem})
                    </option>
                  ))}
                  {formProdutoId === '' && formProdutoNome !== '' && <option value="">{formProdutoNome} (Não vinculado)</option>}
                </select>
              </Campo>
              <Campo rotulo="Código / referência" className="sm:col-span-4">
                <input type="text" value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} placeholder="Ex: FT-001" className={`${form.campo} tabular-nums`} />
              </Campo>
              {(() => {
                const rec = formProdutoId ? receitaDoProduto(formProdutoId) : undefined;
                const desatualizada = !!rec && (formReceitaId !== rec.id || formAssinatura !== assinaturaComposicaoReceita(rec));
                return (
                  <>
                    <div className="sm:col-span-8">
                      <Aviso tom={desatualizada ? 'aguardando' : formProdutoId && rec ? 'pago' : 'producao'} className="flex flex-wrap items-center justify-between gap-2 h-full">
                        <span>
                          {formProdutoId
                            ? rec
                              ? <>Receita <b>{rec.nome || rec.produto_nome}</b>{desatualizada ? ': a composição mudou desde a última atualização da ficha.' : ': itens da composição sincronizados.'}</>
                              : 'Produto sem receita vinculada (cadastre a receita no produto).'
                            : 'Escolha o produto para puxar as matérias-primas da receita.'}
                        </span>
                        {rec && (
                          <button
                            type="button"
                            onClick={() => aplicarItensDaReceita(formProdutoId, formItens)}
                            className={`inline-flex items-center gap-1.5 h-10 sm:h-8 px-3 rounded-md text-[12.5px] font-semibold cursor-pointer ${
                              desatualizada ? 'bg-st-aguardando text-white' : 'border border-st-pago/30 bg-papel text-st-pago'
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Atualizar da receita
                          </button>
                        )}
                      </Aviso>
                    </div>
                    <Campo rotulo="Validade (meses)" className="sm:col-span-4" ajuda="Usado na validade padrão das ordens de produção">
                      <CampoNumero inteiro min={1} value={formValidadeMeses} onChange={(n) => setFormValidadeMeses(n)} className={form.campoNumero} />
                    </Campo>
                  </>
                );
              })()}
              <Campo rotulo="Descrição ou observações" className="sm:col-span-12">
                <textarea
                  rows={2}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Escreva qualquer detalhe ou observação sobre o produto..."
                  className={form.textarea}
                />
              </Campo>
            </div>
          </Secao>

          <Secao
            titulo="Itens e quantidades"
            contexto={`${formItens.filter(it => it.item_nome.trim() !== '').length} preenchidos · especificações, insumos ou propriedades, com a quantidade ou o valor de cada um`}
            semPadding
            acao={
              <button
                type="button"
                onClick={handleAdicionarItemLinha}
                className="inline-flex items-center gap-1 h-10 sm:h-8 px-3 rounded-md border border-linha-forte bg-papel text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar item
              </button>
            }
          >
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_260px_40px] gap-x-3 px-4 py-2 border-b border-linha bg-papel-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">
              <span>Item / especificação</span>
              <span>Quantidade / valor</span>
              <span />
            </div>
            <ul>
              {formItens.map((item, idx) => (
                <li key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_260px_40px] gap-x-3 gap-y-2 items-start px-4 py-3 sm:py-2 border-b border-linha last:border-b-0">
                  <label className="block min-w-0">
                    <span className="sm:hidden block text-[11px] font-semibold text-cinza mb-0.5">
                      Item {idx + 1}
                      {item.origem === 'RECEITA' && <span className="ml-1.5 text-eno-700">· da receita</span>}
                    </span>
                    <input
                      type="text"
                      required
                      value={item.item_nome}
                      onChange={(e) => handleAtualizarItemLinha(idx, 'item_nome', e.target.value)}
                      placeholder={`Ex: ${idx === 0 ? 'Mandioca Selecionada' : idx === 1 ? 'Umidade' : 'Embalagem'}`}
                      className={form.campo}
                    />
                    {item.origem === 'RECEITA' && <span className="hidden sm:block mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-eno-700">da receita</span>}
                  </label>
                  <div className="row-start-1 col-start-2 sm:col-start-3 sm:row-start-auto flex justify-end pt-[18px] sm:pt-0 sm:order-last">
                    <BotaoIcone rotulo="Remover este item" perigo onClick={() => handleRemoverItemLinha(idx)}>
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </BotaoIcone>
                  </div>
                  <label className="block col-span-2 sm:col-span-1">
                    <span className="sm:hidden block text-[11px] font-semibold text-cinza mb-0.5">Quantidade / valor</span>
                    <input
                      type="text"
                      required
                      value={item.quantidade}
                      onChange={(e) => handleAtualizarItemLinha(idx, 'quantidade', e.target.value)}
                      placeholder={`Ex: ${idx === 0 ? '1 kg' : idx === 1 ? '12%' : '1 unidade'}`}
                      className={`${form.campo} tabular-nums`}
                    />
                  </label>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2.5 border-t border-linha">
              <button type="button" onClick={handleAdicionarItemLinha} className="inline-flex items-center gap-1.5 h-10 sm:h-8 text-[12.5px] font-semibold text-eno-700 hover:text-eno-900 cursor-pointer">
                <PlusCircle className="w-4 h-4" />
                Adicionar mais uma linha
              </button>
            </div>
          </Secao>
        </ModalFolha>
      )}

      {/* MODAL VISUALIZAR FICHA (PRONTA PARA IMPRIMIR / PDF / FOTO) */}
      {fichaVisualizar && (
        <ModalFolha
          titulo={fichaVisualizar.produto_nome}
          subtitulo={`Ficha técnica${fichaVisualizar.codigo ? ` · ${fichaVisualizar.codigo}` : ''}`}
          onFechar={() => setFichaVisualizar(null)}
          largura="sm:max-w-4xl"
          corpoClassName="bg-eno-900/[0.06] px-3 sm:px-6"
          acoesTopo={
            <BotaoTopo onClick={() => handleAbrirEdicao(fichaVisualizar)} title="Editar dados da ficha">
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </BotaoTopo>
          }
          rodape={
            <>
              <span className="hidden sm:block sm:mr-auto">
                <BotaoSecundario onClick={() => setFichaVisualizar(null)}>Fechar</BotaoSecundario>
              </span>
              <BotaoSecundario onClick={() => handleCopiarTexto(fichaVisualizar)}>
                {copiado ? <Check className="w-4 h-4 text-st-pago" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado' : 'Copiar texto'}
              </BotaoSecundario>
              <BotaoPrimario onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                Imprimir / PDF
              </BotaoPrimario>
            </>
          }
        >
          {/* Documento imprimível */}
          <article id="laudo-imprimivel" className="mx-auto max-w-[760px] bg-papel border border-linha rounded-md shadow-[0_18px_40px_-24px_rgba(4,32,19,0.45)] overflow-hidden text-tinta">
            <div className="h-[4px] filete-ouro" aria-hidden />
            <header className="px-5 sm:px-8 pt-5 pb-4 border-b-2 border-tinta flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.01em]">GRUPO ENO AGROINDUSTRIAL</div>
                <p className="text-[11.5px] text-cinza leading-snug">Fecularia & Mandioca Gourmet · Rodovia PR-482, km 14 · CNPJ 14.882.910/0001-44</p>
              </div>
              <div className="sm:text-right">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ouro-escuro">Ficha técnica oficial</div>
                {fichaVisualizar.codigo && <div className="text-[12px] text-cinza tabular-nums">Código <b className="text-tinta">{fichaVisualizar.codigo}</b></div>}
              </div>
            </header>

            <div className="px-5 sm:px-8 py-5 space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Produto</div>
                  <h2 className="text-[22px] sm:text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{fichaVisualizar.produto_nome}</h2>
                </div>
                <div className="sm:text-right">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Emissão</div>
                  <div className="text-[13px] font-semibold tabular-nums">{new Date().toLocaleDateString('pt-BR')}</div>
                </div>
              </div>

              {fichaVisualizar.descricao_padrao && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza mb-1">Descrição do produto / processo</div>
                  <p className="text-[13px] leading-relaxed text-tinta-2">{fichaVisualizar.descricao_padrao}</p>
                </div>
              )}

              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza mb-1.5">Especificações, insumos e parâmetros</div>
                <dl className="border-t border-tinta/80">
                  {(fichaVisualizar.itens_especificacao || []).map((it, idx) => (
                    <div key={idx} className="flex items-baseline justify-between gap-4 py-2 border-b border-linha">
                      <dt className="min-w-0 text-[13px] text-tinta-2">{it.item_nome}</dt>
                      <dd className="shrink-0 max-w-[55%] text-right text-[13px] font-bold tabular-nums">{it.quantidade}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <footer className="pt-3 border-t border-linha flex flex-wrap items-center justify-between gap-2 text-[11px] text-cinza">
                <span>Controle de Qualidade · <b className="text-tinta-2">Grupo ENO</b></span>
                <span>Documento emitido eletronicamente pelo Sistema de Gestão Industrial</span>
              </footer>
            </div>
          </article>
        </ModalFolha>
      )}
    </div>
  );
}
