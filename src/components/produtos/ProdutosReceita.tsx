import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Scale,
  Sparkles,
  Layers,
  Droplets,
  Clock,
  Calculator,
  Eye,
  CheckCircle2,
  Package,
  Boxes,
  Trash2,
  Edit3,
  Copy,
  FileText,
  X,
  Check,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Printer,
  Info,
  ArrowRight
} from 'lucide-react';
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
  const [formTipoEmbalagem, setFormTipoEmbalagem] = useState<'Saco 25kg' | 'Fardo 10x1kg' | 'Pacote 1kg' | 'Big Bag 1000kg' | 'Caixa' | 'Granel'>('Saco 25kg');
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
  const handleMudarTipoEmbalagem = (tipo: 'Saco 25kg' | 'Fardo 10x1kg' | 'Pacote 1kg' | 'Big Bag 1000kg' | 'Caixa' | 'Granel') => {
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

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_receita" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Receitas & Formulações</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {metricasGlobais.total} receitas cadastradas
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalSimulador(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
              title="Simulador de Balança d'Água e Rendimento de Amido"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-800" />
              <span>Simulador de Moagem</span>
            </button>

            <button
              onClick={handleAbrirNovaReceita}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Nova Receita</span>
            </button>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Rendimento Médio:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {metricasGlobais.mediaPacotes} pacotes / batelada
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Custo Médio p/ Pacote:</span>
            <span className="font-mono font-bold text-emerald-900 text-sm">
              {metricasGlobais.mediaCustoPacote.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Insumos Mapeados:</span>
            <span className="font-mono font-bold text-slate-800">
              {metricasGlobais.totalIngredientesDistintos} matérias-primas cadastradas
            </span>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="mx-6 mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3. BARRA DE BUSCA E FILTRO DE EMBALAGEM */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome da receita, código ou matéria-prima..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['TODAS', 'Saco 25kg', 'Fardo 10x1kg', 'Pacote 1kg', 'Big Bag 1000kg'].map(emb => (
            <button
              key={emb}
              onClick={() => setFiltroEmbalagem(emb)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filtroEmbalagem === emb
                  ? 'bg-emerald-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {emb === 'TODAS' ? 'Todas as Embalagens' : emb}
            </button>
          ))}
        </div>
      </div>

      {/* 4. TABELA DE RECEITAS (TUDO EM LINHAS DE UMA TABELA) */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Código / Nome da Receita</th>
                <th className="py-3 px-3">Embalagem</th>
                <th className="py-3 px-3 text-right">Rendimento (Quantos Rende)</th>
                <th className="py-3 px-3 text-right">Peso Unit.</th>
                <th className="py-3 px-3 text-right">Custo Total Insumos</th>
                <th className="py-3 px-3 text-right">Custo Unitário (Produto)</th>
                <th className="py-3 px-4 text-center">Matérias-Primas</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {receitasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma receita cadastrada. Clique em "+ Criar Nova Receita" para começar.
                  </td>
                </tr>
              ) : (
                receitasFiltradas.map((r) => {
                  const rendimentoPacotes = r.rendimento_pacotes || 400;
                  const embalagem = r.tipo_embalagem || 'Saco 25kg';
                  const pesoPacote = r.peso_por_pacote_kg || (embalagem.includes('25kg') ? 25 : embalagem.includes('1000kg') ? 1000 : 1);
                  const pesoTotalTon = ((rendimentoPacotes * pesoPacote) / 1000).toFixed(1);
                  const materias = r.materias_primas || [];
                  const custoTotal = r.custo_total_materias_primas || materias.reduce((acc, m) => acc + (m.custo_total || 0), 0);
                  const custoPorPacote = r.custo_por_pacote || (rendimentoPacotes > 0 ? custoTotal / rendimentoPacotes : 0);
                  const estaExpandida = receitaExpandidaId === r.id;

                  return (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900">{r.nome || r.produto_nome}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                            <span className="font-bold text-emerald-900">{r.codigo}</span>
                            {r.produto_id && (
                              <span className="px-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans font-semibold text-[10px]">
                                Produto: {r.produto_nome}
                              </span>
                            )}
                            {r.data_criacao && (
                              <>
                                <span>•</span>
                                <span>{r.data_criacao}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                            {embalagem}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900">
                          <div>{rendimentoPacotes.toLocaleString('pt-BR')} un</div>
                          <div className="text-[10px] text-slate-400 font-normal">({pesoTotalTon} Ton total)</div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                          {pesoPacote} kg
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                          {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/40">
                          <div className="text-sm">{custoPorPacote.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          <div className="text-[10px] text-emerald-700 font-normal">÷ {rendimentoPacotes} un</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setReceitaExpandidaId(estaExpandida ? null : r.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                            title="Ver matérias-primas e proporção desta receita"
                          >
                            <span>{materias.length} insumos</span>
                            <span className="text-[10px] text-slate-400">{estaExpandida ? '▲' : '▼'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-5 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAbrirDetalhes(r)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Ver ficha técnica e simular"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicarReceita(r)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-600 hover:text-emerald-900 transition-colors cursor-pointer"
                              title="Duplicar receita"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleAbrirEdicao(r)}
                              className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
                              title="Editar receita"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExcluirReceita(r)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Excluir receita"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* LINHA EXPANDIDA COM TABELA DE MATÉRIAS-PRIMAS */}
                      {estaExpandida && (
                        <tr className="bg-slate-50/90 border-y border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                              <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                <span>Matérias-Primas da Receita ({r.nome || r.produto_nome}) — Divisão por {rendimentoPacotes} unidades</span>
                                <span className="font-mono text-emerald-900">Total: {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                                    <th className="py-2 px-3">Matéria-Prima</th>
                                    <th className="py-2 px-3 text-right">Qtd na Receita</th>
                                    <th className="py-2 px-3 text-center">Unidade</th>
                                    <th className="py-2 px-3 text-right">Proporção por Unidade</th>
                                    <th className="py-2 px-3 text-right">Custo Unitário Insumo</th>
                                    <th className="py-2 px-3 text-right">Subtotal na Receita</th>
                                    <th className="py-2 px-3 text-right">Custo por Unidade</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                  {materias.map((m, idx) => {
                                    const propUn = m.quantidade / rendimentoPacotes;
                                    const subtotalMp = m.custo_total || (m.quantidade * (m.custo_unitario || 0));
                                    const custoPorUn = subtotalMp / rendimentoPacotes;
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/60">
                                        <td className="py-2 px-3 font-sans font-bold text-slate-800">{m.materia_prima_nome}</td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-900">{m.quantidade.toLocaleString('pt-BR')}</td>
                                        <td className="py-2 px-3 text-center text-slate-500">{m.unidade_medida}</td>
                                        <td className="py-2 px-3 text-right font-bold text-emerald-900">
                                          {propUn < 0.1 ? propUn.toFixed(3) : propUn.toFixed(2)} {m.unidade_medida} /un
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-600">
                                          {(m.custo_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-800">
                                          {subtotalMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-emerald-950 bg-emerald-50/30">
                                          {custoPorUn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL CRIAR / EDITAR RECEITA (JANELA LIMPA E DIRETA) */}
      {modalReceitaAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {receitaEmEdicao ? `Editar Receita: ${receitaEmEdicao.nome || receitaEmEdicao.produto_nome}` : 'Criar Nova Receita'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina o nome da receita, código, embalagem, rendimento em pacotes e selecione as matérias-primas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalReceitaAberto(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarReceita} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              
              {formErro && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2 font-bold animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formErro}</span>
                </div>
              )}

              {/* 1. DADOS PRINCIPAIS DA RECEITA - LIMPO E DIRETO:
                  - Nome da Receita
                  - Código
                  - Tipo de Embalagem
                  - Quantos Pacotes Rende
                  - Peso Unitário do Pacote
              */}
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Dados da Receita</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (A categoria do produto é atribuída no Produto Acabado, não na receita)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* 1. Nome da Receita */}
                  <div className="sm:col-span-8">
                    <label className="block font-bold text-slate-800 mb-1">
                      Nome da Receita *
                    </label>
                    <input
                      type="text"
                      required
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      placeholder="Ex: Mandioca Gourmet, Fécula Doce Especial, Tapioca..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-2xs placeholder-slate-400"
                    />
                  </div>

                  {/* 2. Código */}
                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={formCodigo}
                      onChange={(e) => setFormCodigo(e.target.value)}
                      placeholder="Ex: REC-001"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
                  {/* 3. Tipo de Embalagem */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Tipo de Embalagem *
                    </label>
                    <select
                      value={formTipoEmbalagem}
                      onChange={(e) => handleMudarTipoEmbalagem(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
                    >
                      <option value="Pacote 1kg">Pacote 1kg</option>
                      <option value="Saco 25kg">Saco 25kg</option>
                      <option value="Fardo 10x1kg">Fardo 10x1kg</option>
                      <option value="Big Bag 1000kg">Big Bag 1.000kg</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Granel">Granel</option>
                    </select>
                  </div>

                  {/* 4. Quantos Pacotes Rende */}
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">
                      Quantos Pacotes Rende *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={formRendimentoPacotes}
                      onChange={(e) => setFormRendimentoPacotes(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 font-mono font-black text-emerald-950 text-sm focus:outline-none focus:border-emerald-700 shadow-xs text-center"
                    />
                    <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 block text-center">
                      Custo total ÷ {formRendimentoPacotes || 0} unidades
                    </span>
                  </div>

                  {/* 5. Peso Unitário do Pacote */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Peso Unitário do Pacote (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={formPesoPorPacoteKg}
                      onChange={(e) => setFormPesoPorPacoteKg(e.target.value)}
                      placeholder="Ex: 1 ou 25"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-2xs text-center"
                    />
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block text-center">
                      Total da batelada: <strong className="text-emerald-900">{calculosFormulario.rendimentoTotalKg.toLocaleString('pt-BR')} kg</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. SELEÇÃO DE MATÉRIAS-PRIMAS: SELECIONA E DEFINE QUANTO USA EM CADA UM */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-emerald-700" />
                      <span>Matérias-Primas Utilizadas (Selecione e informe quanto usa em cada)</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Adicione os insumos necessários para produzir os {formRendimentoPacotes || 0} pacotes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdicionarLinhaMateriaPrima}
                    disabled={materiasPrimasDisponiveis.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Matéria-Prima</span>
                  </button>
                </div>

                {materiasPrimasDisponiveis.length === 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                    <span>Nenhuma matéria-prima cadastrada. Cadastre primeiro em <b>Matéria-Prima</b> para montar a receita.</span>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => { setModalReceitaAberto(false); onNavigate('produtos_materia_prima'); }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-400 font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        Cadastrar Matéria-Prima →
                      </button>
                    )}
                  </div>
                )}

                {/* Tabela de Insumos */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Matéria-Prima / Insumo</th>
                        <th className="py-2.5 px-3 w-32">Quanto Usa (Qtd)</th>
                        <th className="py-2.5 px-3 w-28">Unidade</th>
                        <th className="py-2.5 px-3 w-32 text-right">Custo Unitário</th>
                        <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {formMateriasPrimas.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          {/* Seleção da Matéria-Prima cadastrada (obrigatória) */}
                          <td className="py-2 px-3">
                            <select
                              required
                              value={materiasPrimasDisponiveis.some(mp => mp.id === item.materia_prima_id) ? item.materia_prima_id : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleAtualizarLinhaMateriaPrima(idx, 'materia_prima_id', val);
                                }
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
                            >
                              <option value="">-- Selecione a matéria-prima --</option>
                              {materiasPrimasDisponiveis.map(mp => (
                                <option key={mp.id} value={mp.id}>
                                  {mp.nome} ({mp.unidade_medida} - R$ {mp.custo_medio_unitario.toFixed(2)})
                                </option>
                              ))}
                            </select>
                            {item.materia_prima_id && !materiasPrimasDisponiveis.some(mp => mp.id === item.materia_prima_id) && (
                              <span className="block mt-1 text-[10px] font-bold text-red-600">
                                "{item.materia_prima_nome}" não está cadastrada em Matéria-Prima — selecione uma cadastrada.
                              </span>
                            )}
                          </td>

                          {/* Quanto que usa */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              required
                              value={item.quantidade}
                              onChange={(e) => handleAtualizarLinhaMateriaPrima(idx, 'quantidade', e.target.value)}
                              placeholder="Qtd"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-950 text-right focus:outline-none focus:border-emerald-700"
                            />
                          </td>

                          {/* Unidade */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 text-xs text-center">
                            {item.unidade_medida || '-'}
                          </td>

                          {/* Custo Unitário (vem do cadastro da matéria-prima) */}
                          <td className="py-2 px-3 text-right font-mono text-slate-800">
                            {(item.custo_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Subtotal */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {(item.custo_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Remover */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoverLinhaMateriaPrima(idx)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Remover matéria-prima"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* RESUMO DE CUSTO & RENDIMENTO AUTOMÁTICO */}
                <div className="p-3.5 bg-emerald-950 text-white rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                      Custo Total das Matérias-Primas (Batelada)
                    </span>
                    <span className="font-mono text-lg font-black text-white">
                      {calculosFormulario.custoTotalMateriasPrimas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <span className="text-[10px] text-emerald-200/80 block mt-0.5">
                      Soma total dos insumos utilizados
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                        Rendimento (Divisor)
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        ÷ {calculosFormulario.rendimentoPacotes} {formTipoEmbalagem}s
                      </span>
                      <span className="text-[10px] text-emerald-200/70 block">
                        ({calculosFormulario.rendimentoTotalKg.toLocaleString('pt-BR')} kg total)
                      </span>
                    </div>

                    <div className="text-right bg-emerald-900 px-4 py-2 rounded-xl border border-emerald-700/80 shadow-xs">
                      <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                        Custo Unitário do Produto
                      </span>
                      <span className="font-mono text-lg font-black text-lime-300">
                        {calculosFormulario.custoPorPacote.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-[10px] text-emerald-200 block font-mono">
                        (Custo Receita ÷ {calculosFormulario.rendimentoPacotes} un)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações Opcionais */}
              <details className="text-xs group border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                <summary className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer list-none flex items-center justify-between select-none">
                  <span>+ Observações Técnicas de Processamento (Opcional)</span>
                  <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="pt-2">
                  <textarea
                    rows={2}
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Ex: Seleção de raízes de mesa mais tenras, corte e congelamento IQF imediato."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </details>

              {/* Rodapé do Formulário */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalReceitaAberto(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer text-xs shadow-xs hover:shadow"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{receitaEmEdicao ? 'Salvar Alterações' : 'Salvar Receita'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL FICHA DETALHADA DA RECEITA & SIMULADOR DE ESCALONAMENTO */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Ficha Técnica da Receita: {modalDetalhes.nome || modalDetalhes.produto_nome}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Código: {modalDetalhes.codigo} • Embalagem: {modalDetalhes.tipo_embalagem || 'Saco 25kg'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalDetalhes(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              
              {/* Destaque do Rendimento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rendimento Base</span>
                  <span className="font-mono text-base font-black text-slate-900">
                    {modalDetalhes.rendimento_pacotes} {modalDetalhes.tipo_embalagem || 'pacotes'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Custo p/ Pacote</span>
                  <span className="font-mono text-base font-black text-emerald-900">
                    {(modalDetalhes.custo_por_pacote || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Custo Total Matérias-Primas</span>
                  <span className="font-mono text-base font-black text-slate-900">
                    {(modalDetalhes.custo_total_materias_primas || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {/* Tabela de Matérias-Primas Originais */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Composição de Matérias-Primas da Receita</span>
                  <span className="text-slate-500 font-mono text-[10px]">Batelada Padrão de {modalDetalhes.rendimento_pacotes} pacotes</span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Matéria-Prima</th>
                      <th className="py-2 px-3 text-right">Quantidade Usada</th>
                      <th className="py-2 px-3 text-center">Unidade</th>
                      <th className="py-2 px-3 text-right">Custo Unitário</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {(modalDetalhes.materias_primas || []).map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans font-bold text-slate-800">{m.materia_prima_nome}</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-900">{m.quantidade.toLocaleString('pt-BR')}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{m.unidade_medida}</td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {(m.custo_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {(m.custo_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ESCALONADOR DE PRODUÇÃO */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                  <div>
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-700" />
                      <span>Escalonador de Produção (Simulação de Necessidade de Matéria-Prima)</span>
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Informe quantos pacotes deseja produzir para recalcular a quantidade exata de matéria-prima proporcional.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-700">Pacotes Desejados:</span>
                    <input
                      type="number"
                      min="1"
                      value={simulacaoPacotesDesejados}
                      onChange={(e) => setSimulacaoPacotesDesejados(e.target.value)}
                      className="w-24 bg-white border border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-mono font-black text-emerald-950 text-center"
                    />
                  </div>
                </div>

                {(() => {
                  const pacotesDesejados = parseFloat(simulacaoPacotesDesejados) || 0;
                  const pacotesBase = modalDetalhes.rendimento_pacotes || 400;
                  const fatorMultiplicador = pacotesBase > 0 ? pacotesDesejados / pacotesBase : 1;

                  return (
                    <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-emerald-100/70 text-[10px] font-bold uppercase text-emerald-950 border-b border-emerald-200">
                            <th className="py-2 px-3">Matéria-Prima</th>
                            <th className="py-2 px-3 text-right">Qtd Base ({pacotesBase} un)</th>
                            <th className="py-2 px-3 text-right font-black text-emerald-950">Qtd Necessária ({pacotesDesejados} un)</th>
                            <th className="py-2 px-3 text-center">Unidade</th>
                            <th className="py-2 px-3 text-right">Custo Projetado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100 font-mono">
                          {(modalDetalhes.materias_primas || []).map((m, idx) => {
                            const qtdNecessaria = m.quantidade * fatorMultiplicador;
                            const custoProjetado = (m.custo_total || 0) * fatorMultiplicador;

                            return (
                              <tr key={idx} className="hover:bg-emerald-50/50">
                                <td className="py-2 px-3 font-sans font-bold text-slate-800">{m.materia_prima_nome}</td>
                                <td className="py-2 px-3 text-right text-slate-600">{m.quantidade.toLocaleString('pt-BR')}</td>
                                <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/60">
                                  {qtdNecessaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 px-3 text-center text-slate-500">{m.unidade_medida}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">
                                  {custoProjetado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {modalDetalhes.observacoes_tecnicas && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs">
                  <strong className="block text-slate-900 mb-0.5">Observações Técnicas:</strong>
                  {modalDetalhes.observacoes_tecnicas}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setModalDetalhes(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>Imprimir Ficha da Receita</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL SIMULADOR DE MOAGEM INDUSTRIAL DA BALANÇA D'ÁGUA */}
      {modalSimulador && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl sm:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <span>Simulador de Rendimento Industrial da Mandioca (Balança Hidrostática)</span>
              </h3>
              <button
                onClick={() => setModalSimulador(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Coluna 1: Parâmetros de Entrada */}
                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">
                    1. Dados de Entrada da Moagem
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Carga de Raiz (Ton) *</label>
                      <input
                        type="number"
                        step="1"
                        value={mandiocaSimuladaTon}
                        onChange={(e) => setMandiocaSimuladaTon(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold font-mono text-center text-slate-800 focus:outline-none focus:border-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Balança D'água (% Amido) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={teorAmidoSimulado}
                        onChange={(e) => setTeorAmidoSimulado(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold font-mono text-center text-slate-800 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A balança hidrostática define o rendimento industrial direto. A proporção nominal de extração é ajustada automaticamente.
                  </p>
                </div>

                {/* Coluna 2: Projeção de Saída de Fábrica */}
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <span className="font-bold text-emerald-950 uppercase tracking-wider text-xs block">
                    2. Projeção de Saída de Fábrica Homologada:
                  </span>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-slate-700 font-medium">Fécula Seca Produzida:</span>
                      <strong className="font-mono text-emerald-900 text-base">{feculaEstimadaTon.toFixed(2)} Ton</strong>
                    </div>

                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-slate-700 font-medium">Embalagem em Sacos 25kg:</span>
                      <strong className="font-mono text-slate-900 text-base">{sacos25kgEstimados.toLocaleString('pt-BR')} sacos</strong>
                    </div>

                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-slate-700 font-medium">Bagaço Úmido Gerado (Alimentação Animal):</span>
                      <strong className="font-mono text-slate-700 text-base">{bagacoEstimadoTon.toFixed(1)} Ton</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setModalSimulador(false)}
                className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Concluir Simulação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
