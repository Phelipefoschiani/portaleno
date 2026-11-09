import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calculator, Eye, CheckCircle2, Trash2, Edit3, Copy, Check, AlertCircle, Printer, ChevronDown } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, Secao, Campo, form, BotaoIcone, BotaoCartao, Aviso, FaixaTotal, FaixaNumerosProdutos, TabelaResponsiva, brl } from './kitProdutos';
import {
  ReceitaIndustrial,
  ItemMateriaPrimaReceita,
  MateriaPrimaEstoque,
  carregarReceitas,
  salvarReceitas,
  carregarMateriaPrima,
  carregarEstoqueProdutos,
  salvarEstoqueProdutos
} from '../../data/produtosData';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosReceita({ onNavigate }: Props) {
  const [receitas, setReceitas] = useState<ReceitaIndustrial[]>([]);
  const [materiasPrimasDisponiveis, setMateriasPrimasDisponiveis] = useState<MateriaPrimaEstoque[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroEmbalagem, setFiltroEmbalagem] = useState<string>('TODAS');

  // Modal de Criar / Editar Receita
  const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
  const [receitaEmEdicao, setReceitaEmEdicao] = useState<ReceitaIndustrial | null>(null);

  // Form State da Receita - ESTRUTURA LIMPA:
  // 1. Nome da Receita
  // 2. Código
  // 3. Tipo de Embalagem
  // 4. Quantos Pacotes Rende
  // 5. Peso Unitário do Pacote
  // 6. Matérias-Primas e quantidades
  // 7. Observações Técnicas
  const [formNome, setFormNome] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formTipoEmbalagem, setFormTipoEmbalagem] = useState<string>('Saco 25kg');
  // Nova embalagem: nome e peso por pacote informados pelo usuário
  const [novaEmbalagem, setNovaEmbalagem] = useState<{ aberto: boolean; nome: string; peso: string }>({ aberto: false, nome: '', peso: '' });
  const [formRendimentoPacotes, setFormRendimentoPacotes] = useState('');
  const [formPesoPorPacoteKg, setFormPesoPorPacoteKg] = useState('25');
  const [formMateriasPrimas, setFormMateriasPrimas] = useState<ItemMateriaPrimaReceita[]>([]);
  const [formTempoHoras, setFormTempoHoras] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formErro, setFormErro] = useState<string | null>(null);

  // Modal de Detalhes / Ficha da Receita & Simulador de Proporção
  const [modalDetalhes, setModalDetalhes] = useState<ReceitaIndustrial | null>(null);
  const [simulacaoPacotesDesejados, setSimulacaoPacotesDesejados] = useState<string>('400');
  const [receitaExpandidaId, setReceitaExpandidaId] = useState<string | null>(null);

  // Modal Simulador de Moagem Hidrostática (Balança d'água)
  const [modalSimulador, setModalSimulador] = useState(false);
  const [mandiocaSimuladaTon, setMandiocaSimuladaTon] = useState('30');
  const [teorAmidoSimulado, setTeorAmidoSimulado] = useState('26.5');

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const recarregarDados = () => {
    setReceitas(carregarReceitas());
    setMateriasPrimasDisponiveis(carregarMateriaPrima());
  };

  useEffect(() => {
    recarregarDados();
    const handleUpdate = () => recarregarDados();
    window.addEventListener('receitas_updated', handleUpdate);
    window.addEventListener('produtos_updated', handleUpdate);
    return () => {
      window.removeEventListener('receitas_updated', handleUpdate);
      window.removeEventListener('produtos_updated', handleUpdate);
    };
  }, []);

  const dispararToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Atualiza peso por pacote automaticamente ao mudar o tipo de embalagem
  const EMBALAGENS_PADRAO = ['Pacote 1kg', 'Saco 25kg', 'Fardo 10x1kg', 'Big Bag 1000kg', 'Caixa', 'Granel'];
  // Padrão + embalagens criadas pelo usuário (vindas das receitas salvas)
  const opcoesEmbalagem = useMemo(() => {
    const extras = Array.from(new Set(receitas.map(r => r.tipo_embalagem).filter((t): t is string => !!t && !EMBALAGENS_PADRAO.includes(t))));
    if (formTipoEmbalagem && !EMBALAGENS_PADRAO.includes(formTipoEmbalagem) && !extras.includes(formTipoEmbalagem)) extras.push(formTipoEmbalagem);
    return [...EMBALAGENS_PADRAO, ...extras];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitas, formTipoEmbalagem]);

  const confirmarNovaEmbalagem = () => {
    const nome = novaEmbalagem.nome.trim();
    const peso = parseFloat(String(novaEmbalagem.peso).replace(',', '.'));
    if (!nome) { alert('Informe o nome da embalagem (ex.: Pacote 500g).'); return; }
    if (!(peso > 0)) { alert('Informe o peso de cada pacote em kg (ex.: 0,5).'); return; }
    setFormTipoEmbalagem(nome);
    setFormPesoPorPacoteKg(String(peso));
    setNovaEmbalagem({ aberto: false, nome: '', peso: '' });
  };

  const handleMudarTipoEmbalagem = (tipo: string) => {
    setFormTipoEmbalagem(tipo);
    if (tipo === 'Saco 25kg') setFormPesoPorPacoteKg('25');
    else if (tipo === 'Big Bag 1000kg') setFormPesoPorPacoteKg('1000');
    else if (tipo === 'Fardo 10x1kg') setFormPesoPorPacoteKg('10');
    else if (tipo === 'Pacote 1kg') setFormPesoPorPacoteKg('1');
    else if (tipo === 'Caixa') setFormPesoPorPacoteKg('12');
  };

  // Abrir Modal de Criação de Nova Receita
  const handleAbrirNovaReceita = () => {
    setReceitaEmEdicao(null);
    setFormNome('');
    const proxNum = receitas.length + 1;
    setFormCodigo(`REC-ENO-${String(proxNum).padStart(2, '0')}`);
    setFormTipoEmbalagem('Pacote 1kg');
    setFormRendimentoPacotes('');
    setFormPesoPorPacoteKg('1');
    setFormTempoHoras('');
    setFormObservacoes('');
    setFormErro(null);

    // Linha limpa inicial de matéria-prima para selecionar e informar quanto usa
    const primeiro = materiasPrimasDisponiveis[0];
    const itensIniciais: ItemMateriaPrimaReceita[] = primeiro ? [
      {
        materia_prima_id: primeiro.id,
        materia_prima_nome: primeiro.nome,
        quantidade: 1,
        unidade_medida: primeiro.unidade_medida,
        custo_unitario: primeiro.custo_medio_unitario,
        custo_total: primeiro.custo_medio_unitario
      }
    ] : [];

    setFormMateriasPrimas(itensIniciais);
    setModalReceitaAberto(true);
  };

  // Abrir Modal de Edição de Receita Existente
  const handleAbrirEdicao = (rec: ReceitaIndustrial) => {
    setReceitaEmEdicao(rec);
    setFormNome(rec.nome || rec.produto_nome);
    setFormCodigo(rec.codigo);
    setFormTipoEmbalagem((rec.tipo_embalagem as any) || 'Saco 25kg');
    setFormRendimentoPacotes(String(rec.rendimento_pacotes || 400));
    setFormPesoPorPacoteKg(String(rec.peso_por_pacote_kg || 25));
    setFormMateriasPrimas(rec.materias_primas || []);
    setFormTempoHoras(rec.tempo_processamento_horas ? String(rec.tempo_processamento_horas) : '');
    setFormObservacoes(rec.observacoes_tecnicas || '');
    setFormErro(null);
    setModalReceitaAberto(true);
  };

  // Duplicar Receita Existente
  const handleDuplicarReceita = (rec: ReceitaIndustrial) => {
    const nova: ReceitaIndustrial = {
      ...rec,
      id: `rec_${Date.now()}`,
      produto_id: undefined, // cópia nasce sem produto vinculado
      codigo: `REC-CPY-${Math.floor(100 + Math.random() * 900)}`,
      nome: `${rec.nome || rec.produto_nome} (Cópia)`,
      data_criacao: new Date().toLocaleDateString('pt-BR')
    };
    const novasReceitas = [nova, ...receitas];
    salvarReceitas(novasReceitas);
    setReceitas(novasReceitas);
    dispararToast(`Receita duplicada como "${nova.nome}"!`);
  };

  // Excluir Receita
  const handleExcluirReceita = (rec: ReceitaIndustrial) => {
    const vinculados = carregarEstoqueProdutos().filter(p => p.receita_id === rec.id);
    const aviso = vinculados.length > 0
      ? `\n\nATENÇÃO: ${vinculados.length} produto(s) usam esta receita (${vinculados.map(p => p.nome).join(', ')}). Eles ficarão sem receita e precisarão de uma nova receita na próxima edição.`
      : '';
    if (confirm(`Deseja realmente excluir a receita "${rec.nome || rec.produto_nome}"?${aviso}`)) {
      const novas = receitas.filter(r => r.id !== rec.id);
      salvarReceitas(novas);
      // Produtos que usavam esta receita perdem o vínculo (sem receita_id órfão)
      salvarEstoqueProdutos(carregarEstoqueProdutos());
      setReceitas(novas);
      dispararToast('Receita removida com sucesso.');
    }
  };

  // Adicionar Nova Linha de Matéria-Prima no Formulário
  const handleAdicionarLinhaMateriaPrima = () => {
    // A receita só usa matérias-primas já cadastradas (não cria matéria-prima aqui)
    if (materiasPrimasDisponiveis.length === 0) return;
    const novaLinha: ItemMateriaPrimaReceita = {
      materia_prima_id: '',
      materia_prima_nome: '',
      quantidade: 1,
      unidade_medida: '',
      custo_unitario: 0,
      custo_total: 0
    };
    setFormMateriasPrimas([...formMateriasPrimas, novaLinha]);
  };

  // Atualizar Linha de Matéria-Prima
  const handleAtualizarLinhaMateriaPrima = (
    index: number,
    campo: keyof ItemMateriaPrimaReceita,
    valor: any
  ) => {
    const atualizados = [...formMateriasPrimas];
    const linha = { ...atualizados[index], [campo]: valor };

    if (campo === 'materia_prima_id') {
      const mpEncontrada = materiasPrimasDisponiveis.find(m => m.id === valor);
      if (mpEncontrada) {
        linha.materia_prima_nome = mpEncontrada.nome;
        linha.unidade_medida = mpEncontrada.unidade_medida;
        linha.custo_unitario = mpEncontrada.custo_medio_unitario;
        linha.custo_total = (linha.quantidade || 0) * mpEncontrada.custo_medio_unitario;
      }
    } else if (campo === 'quantidade' || campo === 'custo_unitario') {
      const qtd = campo === 'quantidade' ? parseFloat(valor) || 0 : linha.quantidade || 0;
      const custo = campo === 'custo_unitario' ? parseFloat(valor) || 0 : linha.custo_unitario || 0;
      linha.custo_total = qtd * custo;
    }

    atualizados[index] = linha;
    setFormMateriasPrimas(atualizados);
  };

  // Remover Linha de Matéria-Prima
  const handleRemoverLinhaMateriaPrima = (index: number) => {
    const atualizados = formMateriasPrimas.filter((_, idx) => idx !== index);
    setFormMateriasPrimas(atualizados);
  };

  // Cálculos do Formulário da Receita em Tempo Real
  const calculosFormulario = useMemo(() => {
    const rendimentoPacotes = parseFloat(formRendimentoPacotes) || 0;
    const pesoPorPacote = parseFloat(formPesoPorPacoteKg) || 0;
    const rendimentoTotalKg = rendimentoPacotes * pesoPorPacote;

    const custoTotalMateriasPrimas = formMateriasPrimas.reduce(
      (acc, item) => acc + (item.custo_total || 0),
      0
    );

    const custoPorPacote = rendimentoPacotes > 0 
      ? custoTotalMateriasPrimas / rendimentoPacotes 
      : 0;

    const custoPorKg = rendimentoTotalKg > 0 
      ? custoTotalMateriasPrimas / rendimentoTotalKg 
      : 0;

    // Acha a matéria-prima de raiz de mandioca se houver
    const itemRaiz = formMateriasPrimas.find(m => 
      m.materia_prima_nome.toLowerCase().includes('mandioca') || 
      m.materia_prima_nome.toLowerCase().includes('raiz')
    );
    const kgMandiocaTotal = itemRaiz 
      ? (itemRaiz.unidade_medida === 'TON' ? itemRaiz.quantidade * 1000 : itemRaiz.quantidade) 
      : 0;

    const fatorConversaoRaiz = (rendimentoTotalKg > 0 && kgMandiocaTotal > 0)
      ? (kgMandiocaTotal / rendimentoTotalKg)
      : 3.77;

    return {
      rendimentoPacotes,
      pesoPorPacote,
      rendimentoTotalKg,
      custoTotalMateriasPrimas,
      custoPorPacote,
      custoPorKg,
      fatorConversaoRaiz,
      temRaiz: rendimentoTotalKg > 0 && kgMandiocaTotal > 0
    };
  }, [formRendimentoPacotes, formPesoPorPacoteKg, formMateriasPrimas]);

  // Salvar Receita (Criar ou Atualizar)
  const handleSalvarReceita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormErro('Informe o nome da receita.');
      return;
    }

    const pacotes = parseFloat(formRendimentoPacotes) || 0;
    if (pacotes <= 0) {
      setFormErro('Informe quantos pacotes rende a receita (valor maior que zero).');
      return;
    }

    if (formMateriasPrimas.length === 0) {
      setFormErro('Adicione ao menos uma matéria-prima utilizada na receita.');
      return;
    }

    // Só matérias-primas cadastradas em Produtos → Matéria-Prima
    const idsCadastrados = new Set(materiasPrimasDisponiveis.map(m => m.id));
    if (formMateriasPrimas.some(item => !idsCadastrados.has(item.materia_prima_id))) {
      setFormErro('Selecione apenas matérias-primas cadastradas em Matéria-Prima. Remova as linhas sem matéria-prima selecionada.');
      return;
    }
    if (formMateriasPrimas.some(item => !(Number(item.quantidade) > 0))) {
      setFormErro('Informe a quantidade usada de cada matéria-prima (maior que zero).');
      return;
    }

    const novaReceita: ReceitaIndustrial = {
      id: receitaEmEdicao ? receitaEmEdicao.id : `rec_${Date.now()}`,
      codigo: formCodigo.trim() || `REC-${Date.now().toString().slice(-4)}`,
      nome: formNome.trim(),
      // Vínculo com o produto acabado é gravado pelo cadastro de produtos (mantém ao editar)
      produto_id: receitaEmEdicao?.produto_id,
      produto_nome: receitaEmEdicao?.produto_id ? (receitaEmEdicao.produto_nome || formNome.trim()) : formNome.trim(),
      tipo_embalagem: formTipoEmbalagem,
      rendimento_pacotes: pacotes,
      peso_por_pacote_kg: calculosFormulario.pesoPorPacote,
      rendimento_total_kg: calculosFormulario.rendimentoTotalKg,
      materias_primas: formMateriasPrimas,
      custo_total_materias_primas: calculosFormulario.custoTotalMateriasPrimas,
      custo_por_pacote: calculosFormulario.custoPorPacote,
      tempo_processamento_horas: parseFloat(formTempoHoras) || undefined,
      observacoes_tecnicas: formObservacoes.trim() || undefined,
      data_criacao: receitaEmEdicao?.data_criacao || new Date().toLocaleDateString('pt-BR'),
      // Parâmetros técnicos: só o fator real da mandioca (quando a receita tem raiz); demais mantidos se já existiam
      rendimento_amido_percentual: receitaEmEdicao?.rendimento_amido_percentual,
      kg_mandioca_por_kg_produto: calculosFormulario.temRaiz ? calculosFormulario.fatorConversaoRaiz : undefined,
      agua_m3_por_ton: receitaEmEdicao?.agua_m3_por_ton,
      perda_destopo_casca_percentual: receitaEmEdicao?.perda_destopo_casca_percentual,
      bagaço_umido_gerado_kg: receitaEmEdicao?.bagaço_umido_gerado_kg
    };

    let listaAtualizada: ReceitaIndustrial[];
    if (receitaEmEdicao) {
      listaAtualizada = receitas.map(r => r.id === receitaEmEdicao.id ? novaReceita : r);
      dispararToast(`Receita "${novaReceita.nome}" atualizada com sucesso!`);
    } else {
      listaAtualizada = [novaReceita, ...receitas];
      dispararToast(`Receita "${novaReceita.nome}" cadastrada com sucesso!`);
    }

    salvarReceitas(listaAtualizada);
    setReceitas(listaAtualizada);
    setModalReceitaAberto(false);
  };

  // Abrir Ficha de Detalhes da Receita
  const handleAbrirDetalhes = (rec: ReceitaIndustrial) => {
    setModalDetalhes(rec);
    setSimulacaoPacotesDesejados(String(rec.rendimento_pacotes || 400));
  };

  // Filtros
  const receitasFiltradas = useMemo(() => {
    return receitas.filter(r => {
      const matchBusca =
        (r.nome && r.nome.toLowerCase().includes(busca.toLowerCase())) ||
        r.produto_nome.toLowerCase().includes(busca.toLowerCase()) ||
        r.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        (r.materias_primas && r.materias_primas.some(m => m.materia_prima_nome.toLowerCase().includes(busca.toLowerCase())));

      const matchEmb = filtroEmbalagem === 'TODAS' || r.tipo_embalagem === filtroEmbalagem;
      return matchBusca && matchEmb;
    });
  }, [receitas, busca, filtroEmbalagem]);

  // Métricas Globais
  const metricasGlobais = useMemo(() => {
    const total = receitas.length;
    const mediaPacotes = total > 0 
      ? Math.round(receitas.reduce((acc, r) => acc + (r.rendimento_pacotes || 0), 0) / total)
      : 0;

    const mediaCustoPacote = total > 0
      ? receitas.reduce((acc, r) => acc + (r.custo_por_pacote || 0), 0) / total
      : 0;

    const totalIngredientesDistintos = new Set(
      receitas.flatMap(r => (r.materias_primas || []).map(m => m.materia_prima_nome))
    ).size;

    return { total, mediaPacotes, mediaCustoPacote, totalIngredientesDistintos };
  }, [receitas]);

  // Cálculos do simulador de moagem da balança d'água
  const tonMandioca = parseFloat(mandiocaSimuladaTon) || 0;
  const teorAmido = parseFloat(teorAmidoSimulado) || 0;
  const feculaEstimadaTon = (tonMandioca * teorAmido) / 100;
  const sacos25kgEstimados = Math.floor((feculaEstimadaTon * 1000) / 25);
  const bagacoEstimadoTon = (tonMandioca * 0.71);

  const semNenhuma = receitas.length === 0;
  const qtdBR = (n: number, casas = 2) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });
  const proporcao = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: n < 0.1 ? 3 : 2, maximumFractionDigits: n < 0.1 ? 3 : 2 });

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_receita" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Receitas"
            resumo={
              semNenhuma ? (
                'Nenhuma receita cadastrada'
              ) : (
                <>
                  {metricasGlobais.total} {metricasGlobais.total === 1 ? 'receita' : 'receitas'} · rendimento médio {metricasGlobais.mediaPacotes.toLocaleString('pt-BR')} pacotes · custo médio {brl(metricasGlobais.mediaCustoPacote)} por pacote · {metricasGlobais.totalIngredientesDistintos} matérias-primas em uso
                </>
              )
            }
            acoes={
              <>
                <BotaoSecundario onClick={() => setModalSimulador(true)} className="flex-1 sm:flex-none h-11 sm:h-9" title="Simulador de balança d'água e rendimento de amido">
                  <Calculator className="w-4 h-4" />
                  <span className="sm:hidden">Simulador</span>
                  <span className="hidden sm:inline">Simulador de moagem</span>
                </BotaoSecundario>
                {!semNenhuma && (
                  <BotaoPrimario onClick={handleAbrirNovaReceita} className="flex-1 sm:flex-none h-11 sm:h-9">
                    <Plus className="w-4 h-4" />
                    Nova receita
                  </BotaoPrimario>
                )}
              </>
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
              <Segmentado<string>
                rotuloAria="Embalagem"
                valor={filtroEmbalagem}
                onChange={setFiltroEmbalagem}
                opcoes={['TODAS', 'Saco 25kg', 'Fardo 10x1kg', 'Pacote 1kg', 'Big Bag 1000kg'].map(emb => ({
                  valor: emb,
                  rotulo: emb === 'TODAS' ? 'Todas' : emb,
                  contagem: emb === 'TODAS' ? receitas.length : receitas.filter(r => r.tipo_embalagem === emb).length,
                }))}
              />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar receita, código ou matéria-prima" className="w-full md:w-80" />
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-8">
            {receitasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                {semNenhuma ? (
                  <EstadoVazio
                    titulo="Nenhuma receita"
                    texto="A receita diz quanto de cada matéria-prima entra numa batelada e quantos pacotes ela rende. O custo do produto acabado vem daqui."
                    acao={
                      <BotaoPrimario onClick={handleAbrirNovaReceita}>
                        <Plus className="w-4 h-4" />
                        Nova receita
                      </BotaoPrimario>
                    }
                  />
                ) : (
                  <EstadoVazio
                    titulo="Nenhuma receita com esses filtros"
                    texto="Mude a embalagem ou a busca para ver as outras receitas."
                    acao={<BotaoSecundario onClick={() => { setBusca(''); setFiltroEmbalagem('TODAS'); }}>Limpar filtros</BotaoSecundario>}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <ul className="sm:hidden bg-papel border border-linha rounded-md">
                  {receitasFiltradas.map(r => {
                    const rendimentoPacotes = r.rendimento_pacotes || 400;
                    const embalagem = r.tipo_embalagem || 'Saco 25kg';
                    const pesoPacote = r.peso_por_pacote_kg || (embalagem.includes('25kg') ? 25 : embalagem.includes('1000kg') ? 1000 : 1);
                    const pesoTotalTon = ((rendimentoPacotes * pesoPacote) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
                    const materias = r.materias_primas || [];
                    const custoTotal = r.custo_total_materias_primas || materias.reduce((acc, m) => acc + (m.custo_total || 0), 0);
                    const custoPorPacote = r.custo_por_pacote || (rendimentoPacotes > 0 ? custoTotal / rendimentoPacotes : 0);
                    const aberta = receitaExpandidaId === r.id;
                    return (
                      <li key={r.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                        <div className="text-[14px] font-bold text-tinta leading-snug">{r.nome || r.produto_nome}</div>
                        <div className="text-[11.5px] text-cinza truncate">
                          {r.codigo} · {embalagem}
                          {r.produto_id && <> · produto {r.produto_nome}</>}
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div className="text-[12px] text-cinza tabular-nums">
                            <span className="font-semibold text-tinta-2">{rendimentoPacotes.toLocaleString('pt-BR')} un</span> · {pesoPacote} kg cada · {pesoTotalTon} t
                            <div>receita {brl(custoTotal)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{brl(custoPorPacote)}</div>
                            <div className="text-[11px] text-cinza">por unidade</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReceitaExpandidaId(aberta ? null : r.id)}
                          aria-expanded={aberta}
                          className="mt-2 inline-flex h-10 items-center gap-1 text-[12.5px] font-semibold text-eno-700 cursor-pointer"
                        >
                          {materias.length} {materias.length === 1 ? 'matéria-prima' : 'matérias-primas'}
                          <ChevronDown className={`w-4 h-4 transition-transform ${aberta ? 'rotate-180' : ''}`} />
                        </button>
                        {aberta && (
                          <ul className="mb-1 rounded-md border border-linha bg-papel-2">
                            {materias.map((m, idx) => {
                              const subtotalMp = m.custo_total || (m.quantidade * (m.custo_unitario || 0));
                              return (
                                <li key={idx} className="flex items-baseline justify-between gap-3 px-3 py-2 border-b border-linha last:border-b-0 text-[12.5px]">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-tinta truncate">{m.materia_prima_nome}</div>
                                    <div className="text-[11.5px] text-cinza tabular-nums">
                                      {m.quantidade.toLocaleString('pt-BR')} {m.unidade_medida} · {proporcao(m.quantidade / rendimentoPacotes)} {m.unidade_medida}/un
                                    </div>
                                  </div>
                                  <div className="text-right tabular-nums shrink-0">
                                    <div className="font-semibold text-tinta">{brl(subtotalMp / rendimentoPacotes)}</div>
                                    <div className="text-[11px] text-cinza">{brl(subtotalMp)} total</div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="flex gap-2 mt-2">
                          <BotaoCartao primario onClick={() => handleAbrirDetalhes(r)}>
                            <Eye className="w-3.5 h-3.5" /> Ficha
                          </BotaoCartao>
                          <BotaoCartao onClick={() => handleAbrirEdicao(r)}>
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </BotaoCartao>
                          <BotaoIcone rotulo="Duplicar receita" onClick={() => handleDuplicarReceita(r)} className="border border-linha-forte">
                            <Copy className="w-4 h-4" />
                          </BotaoIcone>
                          <BotaoIcone rotulo="Excluir receita" perigo onClick={() => handleExcluirReceita(r)} className="border border-linha-forte">
                            <Trash2 className="w-4 h-4" />
                          </BotaoIcone>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Computador: tabela densa com linha expansível */}
                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Receita</Th>
                      <Th>Embalagem</Th>
                      <Th numero>Rendimento</Th>
                      <Th numero>Peso un.</Th>
                      <Th numero>Custo da receita</Th>
                      <Th numero>Custo por unidade</Th>
                      <Th>Matérias-primas</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitasFiltradas.map(r => {
                      const rendimentoPacotes = r.rendimento_pacotes || 400;
                      const embalagem = r.tipo_embalagem || 'Saco 25kg';
                      const pesoPacote = r.peso_por_pacote_kg || (embalagem.includes('25kg') ? 25 : embalagem.includes('1000kg') ? 1000 : 1);
                      const pesoTotalTon = ((rendimentoPacotes * pesoPacote) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
                      const materias = r.materias_primas || [];
                      const custoTotal = r.custo_total_materias_primas || materias.reduce((acc, m) => acc + (m.custo_total || 0), 0);
                      const custoPorPacote = r.custo_por_pacote || (rendimentoPacotes > 0 ? custoTotal / rendimentoPacotes : 0);
                      const estaExpandida = receitaExpandidaId === r.id;
                      return (
                        <React.Fragment key={r.id}>
                          <tr className={`${tabela.tr} ${estaExpandida ? 'bg-papel-3/40' : ''}`}>
                            <Td className="max-w-[340px]">
                              <div className="font-semibold text-tinta">{r.nome || r.produto_nome}</div>
                              <div className="text-[11.5px] text-cinza tabular-nums truncate">
                                {r.codigo}
                                {r.produto_id && <> · produto {r.produto_nome}</>}
                                {r.data_criacao && <> · {r.data_criacao}</>}
                              </div>
                            </Td>
                            <Td className="whitespace-nowrap">{embalagem}</Td>
                            <Td numero>
                              <div className="font-semibold text-tinta">{rendimentoPacotes.toLocaleString('pt-BR')} un</div>
                              <div className="text-[11px] text-cinza">{pesoTotalTon} t no total</div>
                            </Td>
                            <Td numero>{pesoPacote.toLocaleString('pt-BR')} kg</Td>
                            <Td numero>{brl(custoTotal)}</Td>
                            <Td numero>
                              <div className="font-bold text-tinta text-[13.5px]">{brl(custoPorPacote)}</div>
                              <div className="text-[11px] text-cinza">÷ {rendimentoPacotes} un</div>
                            </Td>
                            <Td>
                              <button
                                type="button"
                                onClick={() => setReceitaExpandidaId(estaExpandida ? null : r.id)}
                                aria-expanded={estaExpandida}
                                className="inline-flex items-center gap-1 h-8 px-2 -ml-2 rounded-md text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer"
                                title="Ver matérias-primas e proporção desta receita"
                              >
                                {materias.length} {materias.length === 1 ? 'insumo' : 'insumos'}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${estaExpandida ? 'rotate-180' : ''}`} />
                              </button>
                            </Td>
                            <Td className="text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-0.5">
                                <BotaoIcone rotulo="Ver ficha e simular" onClick={() => handleAbrirDetalhes(r)}>
                                  <Eye className="w-3.5 h-3.5" />
                                </BotaoIcone>
                                <BotaoIcone rotulo="Duplicar receita" onClick={() => handleDuplicarReceita(r)}>
                                  <Copy className="w-3.5 h-3.5" />
                                </BotaoIcone>
                                <BotaoIcone rotulo="Editar receita" onClick={() => handleAbrirEdicao(r)}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </BotaoIcone>
                                <BotaoIcone rotulo="Excluir receita" perigo onClick={() => handleExcluirReceita(r)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </BotaoIcone>
                              </div>
                            </Td>
                          </tr>

                          {estaExpandida && (
                            <tr className="border-b border-linha bg-papel-2">
                              <td colSpan={8} className="px-3 py-3">
                                <div className="rounded-md border border-linha bg-papel overflow-hidden">
                                  <table className={tabela.table}>
                                    <thead className="border-b border-linha">
                                      <tr>
                                        <th className={tabela.th}>Matéria-prima</th>
                                        <th className={`${tabela.th} text-right`}>Na receita</th>
                                        <th className={`${tabela.th} text-right`}>Por unidade</th>
                                        <th className={`${tabela.th} text-right`}>Custo unitário</th>
                                        <th className={`${tabela.th} text-right`}>Subtotal</th>
                                        <th className={`${tabela.th} text-right`}>Custo por unidade</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {materias.map((m, idx) => {
                                        const subtotalMp = m.custo_total || (m.quantidade * (m.custo_unitario || 0));
                                        return (
                                          <tr key={idx} className="border-b border-linha last:border-b-0">
                                            <td className="py-2 px-3 font-semibold text-tinta">{m.materia_prima_nome}</td>
                                            <td className="py-2 px-3 text-right tabular-nums">{m.quantidade.toLocaleString('pt-BR')} {m.unidade_medida}</td>
                                            <td className="py-2 px-3 text-right tabular-nums">{proporcao(m.quantidade / rendimentoPacotes)} {m.unidade_medida}</td>
                                            <td className="py-2 px-3 text-right tabular-nums">{brl(m.custo_unitario || 0)}</td>
                                            <td className="py-2 px-3 text-right tabular-nums">{brl(subtotalMp)}</td>
                                            <td className="py-2 px-3 text-right tabular-nums font-bold text-tinta">{brl(subtotalMp / rendimentoPacotes)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </TabelaDados>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CRIAR / EDITAR RECEITA */}
      {modalReceitaAberto && (
        <ModalFolha
          titulo={receitaEmEdicao ? `Editar ${receitaEmEdicao.nome || receitaEmEdicao.produto_nome}` : 'Nova receita'}
          subtitulo="Nome, embalagem, quanto rende e quanto de cada matéria-prima entra na batelada."
          onFechar={() => setModalReceitaAberto(false)}
          onSubmit={handleSalvarReceita}
          largura="sm:max-w-5xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalReceitaAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit">
                <Check className="w-4 h-4" />
                {receitaEmEdicao ? 'Salvar alterações' : 'Salvar receita'}
              </BotaoPrimario>
            </>
          }
        >
          {formErro && (
            <Aviso tom="vencido" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formErro}
            </Aviso>
          )}

          <Secao numero="1" titulo="Dados da receita" contexto="A categoria do produto é escolhida no produto acabado, não na receita.">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <Campo rotulo="Nome da receita *" className="sm:col-span-8">
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Mandioca Gourmet, Fécula Doce Especial, Tapioca..."
                  className={form.campo}
                />
              </Campo>
              <Campo rotulo="Código *" className="sm:col-span-4">
                <input type="text" required value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} placeholder="Ex: REC-001" className={`${form.campo} tabular-nums`} />
              </Campo>
              <Campo rotulo="Quanto rende *" className="sm:col-span-4" ajuda={`Custo total ÷ ${formRendimentoPacotes || 0} unidades`}>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  step="1"
                  value={formRendimentoPacotes}
                  onChange={(e) => setFormRendimentoPacotes(e.target.value)}
                  placeholder="Ex: 500"
                  className={form.campoNumero}
                />
              </Campo>
              <Campo rotulo="Peso de cada unidade (kg) *" className="sm:col-span-4" ajuda={`Batelada: ${calculosFormulario.rendimentoTotalKg.toLocaleString('pt-BR')} kg`}>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="0.01"
                  step="any"
                  value={formPesoPorPacoteKg}
                  onChange={(e) => setFormPesoPorPacoteKg(e.target.value)}
                  placeholder="Ex: 1 ou 25"
                  className={form.campoNumero}
                />
              </Campo>
            </div>
          </Secao>

          <Secao
            numero="2"
            titulo="Matérias-primas"
            contexto={`Quanto de cada insumo entra para produzir os ${formRendimentoPacotes || 0} pacotes.`}
            semPadding
            acao={
              <button
                type="button"
                onClick={handleAdicionarLinhaMateriaPrima}
                disabled={materiasPrimasDisponiveis.length === 0}
                className="inline-flex items-center gap-1 h-10 sm:h-8 px-3 rounded-md border border-linha-forte bg-papel text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar matéria-prima
              </button>
            }
          >
            {materiasPrimasDisponiveis.length === 0 && (
              <div className="p-4 pb-0">
                <Aviso tom="aguardando" className="flex flex-wrap items-center justify-between gap-2">
                  <span>Nenhuma matéria-prima cadastrada. Cadastre primeiro em <b>Matéria-prima</b> para montar a receita.</span>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => { setModalReceitaAberto(false); onNavigate('produtos_materia_prima'); }}
                      className="h-10 sm:h-8 px-3 rounded-md border border-st-aguardando/30 bg-papel font-semibold cursor-pointer"
                    >
                      Cadastrar matéria-prima
                    </button>
                  )}
                </Aviso>
              </div>
            )}

            {/* Cabeçalho das colunas (computador) */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_120px_64px_110px_110px_40px] gap-x-3 px-4 py-2 border-b border-linha bg-papel-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">
              <span>Matéria-prima</span>
              <span className="text-right">Quanto usa</span>
              <span>Unid.</span>
              <span className="text-right">Custo un.</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>
            {formMateriasPrimas.length === 0 ? (
              <p className="px-4 py-4 text-[12.5px] text-cinza">Nenhuma matéria-prima na receita ainda.</p>
            ) : (
              <ul>
                {formMateriasPrimas.map((item, idx) => {
                  const naoCadastrada = item.materia_prima_id && !materiasPrimasDisponiveis.some(mp => mp.id === item.materia_prima_id);
                  return (
                    <li
                      key={idx}
                      className="grid grid-cols-6 sm:grid-cols-[minmax(0,1fr)_120px_64px_110px_110px_40px] gap-x-3 gap-y-2 items-center px-4 py-3 sm:py-2 border-b border-linha last:border-b-0"
                    >
                      <div className="col-span-5 sm:col-span-1 min-w-0">
                        <select
                          required
                          aria-label="Matéria-prima"
                          value={materiasPrimasDisponiveis.some(mp => mp.id === item.materia_prima_id) ? item.materia_prima_id : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleAtualizarLinhaMateriaPrima(idx, 'materia_prima_id', val);
                          }}
                          className={form.select}
                        >
                          <option value="">Selecione a matéria-prima</option>
                          {materiasPrimasDisponiveis.map(mp => (
                            <option key={mp.id} value={mp.id}>
                              {mp.nome} ({mp.unidade_medida} - R$ {mp.custo_medio_unitario.toFixed(2)})
                            </option>
                          ))}
                        </select>
                        {naoCadastrada && (
                          <span className="block mt-1 text-[11.5px] font-semibold text-st-vencido">
                            "{item.materia_prima_nome}" não está cadastrada em Matéria-prima. Selecione uma cadastrada.
                          </span>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end sm:order-last">
                        <BotaoIcone rotulo="Remover matéria-prima" perigo onClick={() => handleRemoverLinhaMateriaPrima(idx)}>
                          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </BotaoIcone>
                      </div>
                      <label className="col-span-3 sm:col-span-1 block">
                        <span className="sm:hidden block text-[11px] font-semibold text-cinza mb-0.5">Quanto usa</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0.001"
                          required
                          value={item.quantidade}
                          onChange={(e) => handleAtualizarLinhaMateriaPrima(idx, 'quantidade', e.target.value)}
                          placeholder="Qtd"
                          className={form.campoNumero}
                        />
                      </label>
                      <div className="col-span-3 sm:col-span-1 text-[13px] font-semibold text-tinta-2">
                        <span className="sm:hidden block text-[11px] font-semibold text-cinza mb-0.5">Unidade</span>
                        {item.unidade_medida || '—'}
                      </div>
                      <div className="col-span-3 sm:col-span-1 text-[13px] tabular-nums sm:text-right text-tinta-2">
                        <span className="sm:hidden block text-[11px] font-semibold text-cinza mb-0.5">Custo unitário</span>
                        {brl(item.custo_unitario || 0)}
                      </div>
                      <div className="col-span-3 sm:col-span-1 text-[13px] tabular-nums text-right font-bold text-tinta">
                        <span className="sm:hidden block text-[11px] font-semibold text-cinza mb-0.5">Subtotal</span>
                        {brl(item.custo_total || 0)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="p-4 pt-3 border-t border-linha">
              <FaixaTotal
                rotulo="Custo por unidade do produto"
                valor={brl(calculosFormulario.custoPorPacote)}
                detalhe={`Custo da receita ÷ ${calculosFormulario.rendimentoPacotes} un`}
                lado={
                  <>
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/55">Custo da batelada</div>
                    <div className="mt-1 text-[16px] font-bold">{brl(calculosFormulario.custoTotalMateriasPrimas)}</div>
                    <div className="text-[11.5px] text-white/60">
                      ÷ {calculosFormulario.rendimentoPacotes} {formTipoEmbalagem} · {calculosFormulario.rendimentoTotalKg.toLocaleString('pt-BR')} kg
                    </div>
                  </>
                }
              />
            </div>
          </Secao>

          <details className="group rounded-md border border-linha bg-papel">
            <summary className="flex min-h-11 items-center justify-between gap-2 px-4 text-[13px] font-semibold text-tinta-2 cursor-pointer list-none select-none">
              Observações técnicas de processamento (opcional)
              <ChevronDown className="w-4 h-4 text-cinza transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4">
              <textarea
                rows={3}
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                placeholder="Ex: Seleção de raízes de mesa mais tenras, corte e congelamento IQF imediato."
                className={form.textarea}
              />
            </div>
          </details>
        </ModalFolha>
      )}

      {/* MODAL FICHA DA RECEITA + ESCALONADOR */}
      {modalDetalhes && (
        <ModalFolha
          titulo={modalDetalhes.nome || modalDetalhes.produto_nome}
          subtitulo={`Ficha da receita · ${modalDetalhes.codigo} · ${modalDetalhes.tipo_embalagem || 'Saco 25kg'}`}
          onFechar={() => setModalDetalhes(null)}
          largura="sm:max-w-4xl"
          corpoClassName="space-y-4"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalDetalhes(null)}>Fechar</BotaoSecundario>
              <BotaoPrimario onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                Imprimir ficha
              </BotaoPrimario>
            </>
          }
        >
          <FaixaNumerosProdutos colunas={3}>
            <CardNumero destaque rotulo="Custo por pacote" unidade="R$" unidadeAntes valor={(modalDetalhes.custo_por_pacote || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            <CardNumero rotulo="Rendimento" valor={(modalDetalhes.rendimento_pacotes || 0).toLocaleString('pt-BR')} unidade={modalDetalhes.tipo_embalagem || 'pacotes'} />
            <CardNumero rotulo="Custo das matérias-primas" unidade="R$" unidadeAntes valor={(modalDetalhes.custo_total_materias_primas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
          </FaixaNumerosProdutos>

          <Secao titulo="Composição" contexto={`Batelada padrão de ${modalDetalhes.rendimento_pacotes} pacotes`} semPadding>
            <TabelaResponsiva
              semMoldura
              colunas={[{ rotulo: 'Matéria-prima' }, { rotulo: 'Quantidade', numero: true }, { rotulo: 'Custo unitário', numero: true }, { rotulo: 'Subtotal', numero: true }]}
              linhas={(modalDetalhes.materias_primas || []).map((m, idx) => ({
                chave: idx,
                celulas: [
                  m.materia_prima_nome,
                  `${m.quantidade.toLocaleString('pt-BR')} ${m.unidade_medida}`,
                  brl(m.custo_unitario || 0),
                  <span className="font-bold text-tinta">{brl(m.custo_total || 0)}</span>,
                ],
              }))}
            />
          </Secao>

          {(() => {
            const pacotesDesejados = parseFloat(simulacaoPacotesDesejados) || 0;
            const pacotesBase = modalDetalhes.rendimento_pacotes || 400;
            const fatorMultiplicador = pacotesBase > 0 ? pacotesDesejados / pacotesBase : 1;
            return (
              <Secao
                titulo="Escalonador de produção"
                contexto="Quantos pacotes você quer produzir? A matéria-prima é recalculada na mesma proporção."
                semPadding
              >
                <div className="p-4 border-b border-linha">
                  <Campo rotulo="Pacotes desejados" className="sm:max-w-[220px]">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={simulacaoPacotesDesejados}
                      onChange={(e) => setSimulacaoPacotesDesejados(e.target.value)}
                      className={form.campoNumero}
                    />
                  </Campo>
                </div>
                <TabelaResponsiva
                  semMoldura
                  colunas={[
                    { rotulo: 'Matéria-prima' },
                    { rotulo: `Base (${pacotesBase} un)`, numero: true },
                    { rotulo: `Necessário (${pacotesDesejados} un)`, numero: true },
                    { rotulo: 'Custo projetado', numero: true },
                  ]}
                  linhas={(modalDetalhes.materias_primas || []).map((m, idx) => ({
                    chave: idx,
                    celulas: [
                      m.materia_prima_nome,
                      `${m.quantidade.toLocaleString('pt-BR')} ${m.unidade_medida}`,
                      <span className="font-bold text-tinta">{qtdBR(m.quantidade * fatorMultiplicador)} {m.unidade_medida}</span>,
                      brl((m.custo_total || 0) * fatorMultiplicador),
                    ],
                  }))}
                />
              </Secao>
            );
          })()}

          {modalDetalhes.observacoes_tecnicas && (
            <div className="rounded-md border border-linha bg-papel px-4 py-3 text-[13px] text-tinta-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-cinza mb-1">Observações técnicas</div>
              {modalDetalhes.observacoes_tecnicas}
            </div>
          )}
        </ModalFolha>
      )}

      {/* MODAL SIMULADOR DE MOAGEM (BALANÇA D'ÁGUA) */}
      {modalSimulador && (
        <ModalFolha
          titulo="Simulador de moagem"
          subtitulo="Rendimento industrial da mandioca pela balança hidrostática"
          onFechar={() => setModalSimulador(false)}
          largura="sm:max-w-3xl"
          rodape={
            <BotaoPrimario onClick={() => setModalSimulador(false)}>
              <Check className="w-4 h-4" />
              Concluir simulação
            </BotaoPrimario>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <Secao titulo="Entrada da moagem">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo rotulo="Carga de raiz (t) *">
                  <input type="number" inputMode="decimal" step="1" value={mandiocaSimuladaTon} onChange={(e) => setMandiocaSimuladaTon(e.target.value)} className={form.campoNumero} />
                </Campo>
                <Campo rotulo="Balança d'água (% amido) *">
                  <input type="number" inputMode="decimal" step="0.1" value={teorAmidoSimulado} onChange={(e) => setTeorAmidoSimulado(e.target.value)} className={form.campoNumero} />
                </Campo>
              </div>
              <p className="text-[12px] leading-relaxed text-cinza">
                A balança hidrostática define o rendimento industrial direto. A proporção nominal de extração é ajustada automaticamente.
              </p>
            </Secao>

            <section className="rounded-md bg-eno-900 text-white overflow-hidden">
              <div className="h-[3px] filete-ouro" aria-hidden />
              <div className="px-4 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ouro-claro">Saída prevista da fábrica</div>
              <dl className="px-4 pb-3">
                <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-white/10">
                  <dt className="text-[13px] text-white/75">Fécula seca produzida</dt>
                  <dd className="text-[24px] font-extrabold tracking-[-0.02em] tabular-nums">
                    {feculaEstimadaTon.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[13px] font-semibold text-white/60">t</span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-white/10">
                  <dt className="text-[13px] text-white/75">Em sacos de 25 kg</dt>
                  <dd className="text-[18px] font-bold tabular-nums">{sacos25kgEstimados.toLocaleString('pt-BR')} <span className="text-[12px] font-semibold text-white/60">sacos</span></dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-[13px] text-white/75">Bagaço úmido (ração animal)</dt>
                  <dd className="text-[18px] font-bold tabular-nums">{bagacoEstimadoTon.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[12px] font-semibold text-white/60">t</span></dd>
                </div>
              </dl>
            </section>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
