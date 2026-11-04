import React, { useState, useMemo, useEffect } from 'react';
import { lerRascunho, apagarRascunho, useRascunho } from '../../lib/rascunho';
import { mascaraCpfCnpj, mascaraInscricaoEstadual, ESTADOS_UF } from '../../lib/mascarasCadastro';
import { 
  Search, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Save, 
  ArrowLeft, 
  TrendingUp, 
  Copy, 
  Check, 
  Scale, 
  Tractor, 
  Sprout
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { Agricultor } from '../../data/mockStore';
import {
  carregarAgricultores,
  salvarAgricultores,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { CalculoNaRoca, carregarCalculosNaRoca, pesosDoCalculo } from '../../data/calculoRocaData';
import { ExtratoAgricultor } from '../pedidos/ComprovantesRoca';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { mesReferenciaDe, ultimosMesesReferencia } from '../../lib/mesesReferencia';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { CORES } from '../ui/tokens';
import { FormularioCadastro, ChaveAtivo, BotaoLinha, BotaoCartao } from './FormularioCadastro';
import { ListaCadastro, LinkLinha } from './ListaCadastro';

// Tipos unificados: o cadastro grava exatamente o formato de mockStore (lido pelos outros módulos)
export type { Agricultor } from '../../data/mockStore';

export function CadastroAgricultores() {
  // Persistidos no armazenamento local (cadastrosData) e sincronizados entre telas
  const [agricultores, setAgricultores] = useListaPersistida<Agricultor>(carregarAgricultores, salvarAgricultores, EVENTO_CADASTROS_ATUALIZADOS);
  // Compras de mandioca: única fonte é o Cálculo na Roça (sem lançamento manual de romaneio)
  const [calculosRoca, setCalculosRoca] = useState<CalculoNaRoca[]>(() => carregarCalculosNaRoca());
  useEffect(() => {
    const h = () => setCalculosRoca(carregarCalculosNaRoca());
    window.addEventListener('calculos_roca_updated', h);
    return () => window.removeEventListener('calculos_roca_updated', h);
  }, []);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PF' | 'PJ'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Modo de exibição: 'lista', 'formulario' ou 'historico'
  const [modo, setModo] = useState<'lista' | 'formulario' | 'historico'>('lista');
  const [agricultorSelecionado, setAgricultorSelecionado] = useState<Agricultor | null>(null);

  // Feedback de cópia da chave PIX
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Formulário de Agricultor
  const [formData, setFormData] = useState<{
    tipo_pessoa: 'PF' | 'PJ';
    nome_completo: string;
    nome_propriedade: string;
    cpf_cnpj: string;
    ie_rural: string;
    telefone: string;
    email: string;
    estrada_linha: string;
    comunidade_bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ponto_referencia: string;
    area_hectares: string;
    capacidade_estimada_safra_ton: string;
    chave_pix: string;
    tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
    titular_pix: string;
    banco_nome: string;
    agencia: string;
    conta: string;
    observacoes_financeiras: string;
    ativo: boolean;
  }>({
    tipo_pessoa: 'PF',
    nome_completo: '',
    nome_propriedade: '',
    cpf_cnpj: '',
    ie_rural: '',
    telefone: '',
    email: '',
    estrada_linha: '',
    comunidade_bairro: '',
    municipio: '',
    uf: 'PR',
    cep: '',
    ponto_referencia: '',
    area_hectares: '',
    capacidade_estimada_safra_ton: '',
    chave_pix: '',
    tipo_chave_pix: 'CPF',
    titular_pix: '',
    banco_nome: '',
    agencia: '',
    conta: '',
    observacoes_financeiras: '',
    ativo: true,
  });

  const copiarChavePix = (chave: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => {
      setCopiadoId(null);
    }, 2000);
  };

  // Rascunho: o cadastro novo fica guardado enquanto é preenchido
  useRascunho('agricultores', formData, modo === 'formulario' && !agricultorSelecionado);

  const abrirFormularioNovo = () => {
    setAgricultorSelecionado(null);
    setFormData(lerRascunho<typeof formData>('agricultores') ?? {
      tipo_pessoa: 'PF',
      nome_completo: '',
      nome_propriedade: '',
      cpf_cnpj: '',
      ie_rural: '',
      telefone: '',
      email: '',
      estrada_linha: '',
      comunidade_bairro: '',
      municipio: '',
      uf: 'PR',
      cep: '',
      ponto_referencia: '',
      area_hectares: '',
      capacidade_estimada_safra_ton: '',
      chave_pix: '',
      tipo_chave_pix: 'CPF',
      titular_pix: '',
      banco_nome: '',
      agencia: '',
      conta: '',
      observacoes_financeiras: '',
      ativo: true,
    });
    setModo('formulario');
  };

  const abrirFormularioEdicao = (agr: Agricultor) => {
    setAgricultorSelecionado(agr);
    setFormData({
      tipo_pessoa: agr.tipo_pessoa,
      nome_completo: agr.nome_completo,
      nome_propriedade: agr.nome_propriedade,
      cpf_cnpj: agr.cpf_cnpj,
      ie_rural: agr.ie_rural || '',
      telefone: agr.telefone,
      email: agr.email || '',
      estrada_linha: agr.endereco.estrada_linha,
      comunidade_bairro: agr.endereco.comunidade_bairro,
      municipio: agr.endereco.municipio,
      uf: agr.endereco.uf,
      cep: agr.endereco.cep,
      ponto_referencia: agr.endereco.ponto_referencia || '',
      area_hectares: agr.area_hectares ? String(agr.area_hectares) : '',
      capacidade_estimada_safra_ton: agr.capacidade_estimada_safra_ton ? String(agr.capacidade_estimada_safra_ton) : '',
      chave_pix: agr.chave_pix,
      tipo_chave_pix: agr.tipo_chave_pix,
      titular_pix: agr.titular_pix || '',
      banco_nome: agr.banco_nome || '',
      agencia: agr.agencia || '',
      conta: agr.conta || '',
      observacoes_financeiras: agr.observacoes_financeiras || '',
      ativo: agr.ativo,
    });
    setModo('formulario');
  };

  const abrirHistorico = (agr: Agricultor) => {
    setAgricultorSelecionado(agr);
    setModo('historico');
  };

  const alternarStatusAgricultor = (id: string) => {
    setAgricultores(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a));
  };

  const salvarAgricultor = (e: React.FormEvent) => {
    e.preventDefault();

    if (agricultorSelecionado) {
      setAgricultores(prev => prev.map(a => a.id === agricultorSelecionado.id ? {
        ...a,
        tipo_pessoa: formData.tipo_pessoa,
        nome_completo: formData.nome_completo,
        nome_propriedade: formData.nome_propriedade,
        cpf_cnpj: formData.cpf_cnpj,
        ie_rural: formData.ie_rural,
        telefone: formData.telefone,
        email: formData.email,
        endereco: {
          estrada_linha: formData.estrada_linha,
          comunidade_bairro: formData.comunidade_bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          cep: formData.cep,
          ponto_referencia: formData.ponto_referencia
        },
        area_hectares: formData.area_hectares ? Number(formData.area_hectares) : undefined,
        capacidade_estimada_safra_ton: formData.capacidade_estimada_safra_ton ? Number(formData.capacidade_estimada_safra_ton) : undefined,
        chave_pix: formData.chave_pix,
        tipo_chave_pix: formData.tipo_chave_pix,
        titular_pix: formData.titular_pix || formData.nome_completo,
        banco_nome: formData.banco_nome,
        agencia: formData.agencia,
        conta: formData.conta,
        observacoes_financeiras: formData.observacoes_financeiras,
        ativo: formData.ativo,
      } : a));
    } else {
      const novo: Agricultor = {
        id: `agr_${Date.now()}`,
        empresa_id: 'emp_grupo_eno',
        tipo_pessoa: formData.tipo_pessoa,
        nome_completo: formData.nome_completo,
        nome_propriedade: formData.nome_propriedade,
        cpf_cnpj: formData.cpf_cnpj,
        ie_rural: formData.ie_rural,
        telefone: formData.telefone,
        email: formData.email,
        endereco: {
          estrada_linha: formData.estrada_linha,
          comunidade_bairro: formData.comunidade_bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          cep: formData.cep,
          ponto_referencia: formData.ponto_referencia
        },
        area_hectares: formData.area_hectares ? Number(formData.area_hectares) : undefined,
        capacidade_estimada_safra_ton: formData.capacidade_estimada_safra_ton ? Number(formData.capacidade_estimada_safra_ton) : undefined,
        chave_pix: formData.chave_pix,
        tipo_chave_pix: formData.tipo_chave_pix,
        titular_pix: formData.titular_pix || formData.nome_completo,
        banco_nome: formData.banco_nome,
        agencia: formData.agencia,
        conta: formData.conta,
        observacoes_financeiras: formData.observacoes_financeiras,
        ativo: formData.ativo,
        criado_em: new Date().toISOString(),
      };
      setAgricultores(prev => [novo, ...prev]);
    }

    apagarRascunho('agricultores');
    setModo('lista');
  };

  // Filtragem dos agricultores
  const agricultoresFiltrados = agricultores.filter(agr => {
    const matchBusca = 
      agr.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      agr.nome_propriedade.toLowerCase().includes(busca.toLowerCase()) ||
      agr.cpf_cnpj.includes(busca) ||
      agr.endereco.municipio.toLowerCase().includes(busca.toLowerCase()) ||
      agr.chave_pix.toLowerCase().includes(busca.toLowerCase());

    const matchTipo = filtroTipo === 'TODOS' || agr.tipo_pessoa === filtroTipo;
    const matchStatus = 
      filtroStatus === 'TODOS' || 
      (filtroStatus === 'ATIVOS' && agr.ativo) || 
      (filtroStatus === 'INATIVOS' && !agr.ativo);

    return matchBusca && matchTipo && matchStatus;
  });

  // Compras de mandioca do agricultor = pesagens do Cálculo na Roça (única fonte), por id do agricultor
  const pesagensDoAgricultor = useMemo(() => {
    if (!agricultorSelecionado) return [];
    return calculosRoca.filter(c => c.fornecedor_tipo === 'AGRICULTOR' && c.fornecedor_id === agricultorSelecionado.id);
  }, [agricultorSelecionado, calculosRoca]);

  // DADOS DO GRÁFICO COM AS 3 LINHAS:
  // 1. Mandioca líquida (KG) · 2. Valor total (R$) · 3. Desconto na pesagem (KG: casca/terra/tara)
  const dadosGrafico3Linhas = useMemo(() => {
    const ordemMeses = ultimosMesesReferencia(6);
    const mapa: Record<string, { kgMandioca: number; valorTotal: number; kgResiduo: number }> = Object.fromEntries(
      ordemMeses.map(m => [m, { kgMandioca: 0, valorTotal: 0, kgResiduo: 0 }])
    );

    pesagensDoAgricultor.forEach(c => {
      const mes = mesReferenciaDe(c.data);
      if (mes in mapa) {
        const pesos = pesosDoCalculo(c);
        mapa[mes].kgMandioca += pesos.liquido;
        mapa[mes].valorTotal += Number(c.valor_total_estimado) || 0;
        mapa[mes].kgResiduo += pesos.desconto;
      }
    });

    return ordemMeses.map(mes => ({
      mes,
      kgMandioca: mapa[mes].kgMandioca,
      valorTotal: mapa[mes].valorTotal,
      kgResiduo: mapa[mes].kgResiduo
    }));
  }, [pesagensDoAgricultor]);

  const ativosCount = agricultores.filter(a => a.ativo).length;
  const semPixCount = agricultores.filter(a => a.ativo && !a.chave_pix).length;

  return (
    <div className="flex-1 w-full min-h-0 h-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* ========================================================= */}
      {/* 1. MODO: LISTAGEM DE AGRICULTORES DE MANDIOCA             */}
      {/* ========================================================= */}
      {modo === 'lista' && (
        <>
          <div className="mx-auto w-full max-w-[1700px]">
            <CabecalhoPagina
              titulo="Agricultores"
              resumo={
                agricultores.length === 0
                  ? 'Nenhum produtor de mandioca cadastrado'
                  : <>
                      {agricultores.length} {agricultores.length === 1 ? 'produtor' : 'produtores'} · {ativosCount} {ativosCount === 1 ? 'ativo' : 'ativos'}
                      {semPixCount > 0 && <span className="text-st-aguardando font-semibold"> · {semPixCount} sem chave PIX</span>}
                    </>
              }
              acoes={
                agricultores.length === 0 ? undefined : (
                  <BotaoPrimario onClick={abrirFormularioNovo} className="w-full sm:w-auto h-10 sm:h-9">
                    <Plus className="w-4 h-4" /> Novo agricultor
                  </BotaoPrimario>
                )
              }
            />
            {agricultores.length > 0 && (
              <BarraFiltros>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Segmentado<'TODOS' | 'PF' | 'PJ'>
                    rotuloAria="Tipo de pessoa"
                    valor={filtroTipo as 'TODOS' | 'PF' | 'PJ'}
                    onChange={setFiltroTipo}
                    opcoes={[
                      { valor: 'TODOS', rotulo: 'Todos' },
                      { valor: 'PF', rotulo: 'Pessoas físicas', contagem: agricultores.filter(a => a.tipo_pessoa === 'PF').length },
                      { valor: 'PJ', rotulo: 'Empresas', contagem: agricultores.filter(a => a.tipo_pessoa === 'PJ').length },
                    ]}
                  />
                  <Segmentado<'TODOS' | 'ATIVOS' | 'INATIVOS'>
                    rotuloAria="Situação"
                    valor={filtroStatus as 'TODOS' | 'ATIVOS' | 'INATIVOS'}
                    onChange={setFiltroStatus}
                    opcoes={[
                      { valor: 'TODOS', rotulo: 'Todas' },
                      { valor: 'ATIVOS', rotulo: 'Ativos' },
                      { valor: 'INATIVOS', rotulo: 'Inativos', contagem: agricultores.length - ativosCount },
                    ]}
                  />
                </div>
                <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produtor, propriedade ou cidade" className="w-full md:w-80 [&_input]:h-10 sm:[&_input]:h-8" />
              </BarraFiltros>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
              {agricultoresFiltrados.length === 0 ? (
                <div className="bg-papel border border-linha rounded-md">
                  {agricultores.length === 0 ? (
                    <EstadoVazio
                      titulo="Nenhum agricultor cadastrado"
                      texto="Cadastre os produtores que entregam mandioca. A chave PIX do cadastro é usada para pagar as pesagens do Cálculo na Roça."
                      acao={<BotaoPrimario onClick={abrirFormularioNovo} className="h-10 sm:h-9"><Plus className="w-4 h-4" /> Novo agricultor</BotaoPrimario>}
                    />
                  ) : (
                    <EstadoVazio
                      titulo="Nenhum agricultor com esses filtros"
                      texto="Confira a busca ou volte para Todos."
                      acao={<BotaoSecundario onClick={() => { setBusca(''); setFiltroTipo('TODOS'); setFiltroStatus('TODOS'); }}>Limpar filtros</BotaoSecundario>}
                    />
                  )}
                </div>
              ) : (
                <ListaCadastro<Agricultor>
                  itens={agricultoresFiltrados}
                  chave={a => a.id}
                  cartao={a => ({
                    titulo: a.nome_completo,
                    subtitulo: `${a.nome_propriedade ? `${a.nome_propriedade} · ` : ''}${a.endereco.municipio}/${a.endereco.uf}`,
                    status: <StatusChip tom={a.ativo ? 'pago' : 'vencido'}>{a.ativo ? 'Ativo' : 'Inativo'}</StatusChip>,
                    detalhes: [
                      a.telefone,
                      a.chave_pix
                        ? <>PIX {a.tipo_chave_pix}: <span className="font-semibold text-tinta">{a.chave_pix}</span></>
                        : <span className="text-st-aguardando font-semibold">Sem chave PIX</span>,
                    ],
                  })}
                  acoesCartao={a => (
                    <>
                      <BotaoCartao onClick={() => abrirHistorico(a)} className="flex-1"><Scale className="w-3.5 h-3.5" /> Entregas</BotaoCartao>
                      <BotaoCartao onClick={() => abrirFormularioEdicao(a)} className="flex-1"><Edit2 className="w-3.5 h-3.5" /> Editar</BotaoCartao>
                      {a.chave_pix && (
                        <BotaoCartao onClick={() => copiarChavePix(a.chave_pix, a.id)} rotulo="Copiar chave PIX" className="w-10 !px-0">
                          {copiadoId === a.id ? <Check className="w-4 h-4 text-st-pago" /> : <Copy className="w-4 h-4" />}
                        </BotaoCartao>
                      )}
                    </>
                  )}
                  colunas={[
                    {
                      titulo: 'Produtor',
                      render: a => (
                        <>
                          <div className="font-semibold text-tinta">{a.nome_completo}</div>
                          <div className="text-[11.5px] text-cinza">{a.nome_propriedade || (a.tipo_pessoa === 'PJ' ? 'Empresa' : 'Pessoa física')}</div>
                        </>
                      ),
                    },
                    {
                      titulo: 'CPF / CNPJ',
                      className: 'tabular-nums whitespace-nowrap',
                      render: a => (
                        <>
                          <div>{a.cpf_cnpj}</div>
                          {a.ie_rural && <div className="text-[11.5px] text-cinza">IE {a.ie_rural}</div>}
                        </>
                      ),
                    },
                    {
                      titulo: 'Contato',
                      render: a => (
                        <>
                          <div className="tabular-nums whitespace-nowrap">{a.telefone || '—'}</div>
                          {a.email && <div className="text-[11.5px] text-cinza truncate max-w-[200px]">{a.email}</div>}
                        </>
                      ),
                    },
                    {
                      titulo: 'Localização',
                      render: a => (
                        <>
                          <div className="whitespace-nowrap">{a.endereco.municipio}/{a.endereco.uf}</div>
                          <div className="text-[11.5px] text-cinza truncate max-w-[180px]" title={a.endereco.estrada_linha}>{a.endereco.comunidade_bairro}</div>
                        </>
                      ),
                    },
                    {
                      titulo: 'Chave PIX',
                      render: a => a.chave_pix ? (
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0">
                            <span className="block text-[11px] text-cinza">{a.tipo_chave_pix || 'PIX'}</span>
                            <span className="block tabular-nums truncate max-w-[170px] text-tinta" title={a.chave_pix}>{a.chave_pix}</span>
                          </span>
                          <BotaoLinha rotulo="Copiar chave PIX" onClick={() => copiarChavePix(a.chave_pix, a.id)}>
                            {copiadoId === a.id ? <Check className="w-3.5 h-3.5 text-st-pago" /> : <Copy className="w-3.5 h-3.5" />}
                          </BotaoLinha>
                        </div>
                      ) : (
                        <span className="text-st-aguardando font-semibold">Sem chave</span>
                      ),
                    },
                    {
                      titulo: 'Situação',
                      centro: true,
                      render: a => (
                        <button
                          type="button"
                          onClick={() => alternarStatusAgricultor(a.id)}
                          className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ouro"
                          title={a.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                        >
                          <StatusChip tom={a.ativo ? 'pago' : 'vencido'}>{a.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
                        </button>
                      ),
                    },
                  ]}
                  acoesLinha={a => (
                    <>
                      <LinkLinha onClick={() => abrirHistorico(a)} title="Pesagens do Cálculo na Roça, pagamentos e comprovantes"><Scale className="w-3.5 h-3.5" /> Entregas</LinkLinha>
                      <BotaoLinha rotulo="Editar agricultor" onClick={() => abrirFormularioEdicao(a)}><Edit2 className="w-4 h-4" /></BotaoLinha>
                    </>
                  )}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. MODO: FORMULÁRIO DE CADASTRO / EDIÇÃO                  */}
      {/* ========================================================= */}
      {modo === 'formulario' && (
        <FormularioCadastro
          onSubmit={salvarAgricultor}
          onCancelar={() => setModo('lista')}
          onLimpar={agricultorSelecionado ? undefined : () => { apagarRascunho('agricultores'); abrirFormularioNovo(); }}
          titulo={agricultorSelecionado ? agricultorSelecionado.nome_completo : 'Novo agricultor'}
          subtitulo={agricultorSelecionado ? 'Editar cadastro do produtor' : 'Dados do produtor, da propriedade e chave PIX para pagar a safra'}
          extra={<ChaveAtivo ativo={formData.ativo} onChange={v => setFormData({ ...formData, ativo: v })} rotulo="Produtor ativo" />}
          rotuloSalvar={agricultorSelecionado ? 'Salvar alterações' : 'Cadastrar agricultor'}
        >
          {/* FORMULÁRIO ROLÁVEL */}
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* SEÇÃO 1: DADOS DO PRODUTOR E DA PROPRIEDADE */}
              <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha  space-y-4">
                <div className="pb-3 border-b border-linha flex items-center gap-2 text-tinta font-extrabold text-sm uppercase tracking-wide">
                  <User className="w-4 h-4 text-eno-800" />
                  <span>1. Identificação do Produtor e da Propriedade Rural</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Tipo de Produtor <span className="text-st-vencido">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_pessoa: 'PF' })}
                        className={`py-2 px-3 text-xs font-bold rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          formData.tipo_pessoa === 'PF' 
                            ? 'bg-eno-800 text-white border-eno-800 ' 
                            : 'bg-papel text-tinta-2 border-linha-forte hover:bg-papel-2'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Produtor PF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_pessoa: 'PJ' })}
                        className={`py-2 px-3 text-xs font-bold rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          formData.tipo_pessoa === 'PJ' 
                            ? 'bg-eno-800 text-white border-eno-800 ' 
                            : 'bg-papel text-tinta-2 border-linha-forte hover:bg-papel-2'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Fazenda PJ</span>
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Nome Completo do Produtor / Razão Social <span className="text-st-vencido">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome_completo}
                      onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                      placeholder="Ex: Sebastião Moreira dos Santos"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Nome da Propriedade / Sítio / Fazenda <span className="text-st-vencido">*</span>
                    </label>
                    <div className="relative">
                      <Sprout className="w-4 h-4 text-eno-700 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={formData.nome_propriedade}
                        onChange={(e) => setFormData({ ...formData, nome_propriedade: e.target.value })}
                        placeholder="Ex: Sítio São José"
                        className="w-full pl-9 pr-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      {formData.tipo_pessoa === 'PF' ? 'CPF do Produtor' : 'CNPJ da Agropecuária'} <span className="text-st-vencido">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: mascaraCpfCnpj(e.target.value) })}
                      placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Inscrição Estadual de Produtor Rural (IE)
                    </label>
                    <input
                      type="text"
                      value={formData.ie_rural}
                      onChange={(e) => setFormData({ ...formData, ie_rural: mascaraInscricaoEstadual(e.target.value) })}
                      placeholder="Ex: PR-904.312.11-0"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Telefone / WhatsApp para Contato <span className="text-st-vencido">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(43) 90000-0000"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      E-mail (Opcional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="produtor@email.com"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: LOCALIZAÇÃO RURAL & LOGÍSTICA DE RECOLHIMENTO */}
              <div className="p-4 sm:p-6 rounded-md bg-papel border border-linha  space-y-4">
                <div className="pb-3 border-b border-linha flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-tinta font-extrabold text-sm uppercase tracking-wide">
                    <MapPin className="w-4 h-4 text-eno-800" />
                    <span>2. Localização da Propriedade & Acesso para Caminhões</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Estrada / Linha Rural / Rodovia <span className="text-st-vencido">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.estrada_linha}
                      onChange={(e) => setFormData({ ...formData, estrada_linha: e.target.value })}
                      placeholder="Ex: Estrada Municipal da Água Doce, Km 6"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Comunidade / Bairro Rural <span className="text-st-vencido">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.comunidade_bairro}
                      onChange={(e) => setFormData({ ...formData, comunidade_bairro: e.target.value })}
                      placeholder="Ex: Bairro Água Doce"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Estado (UF) <span className="text-st-vencido">*</span>
                    </label>
                    <select
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-bold bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    >
                      {ESTADOS_UF.map(({ uf }) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Município <span className="text-st-vencido">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.municipio}
                      onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                      placeholder="Ex: Jacarezinho"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      CEP Rural
                    </label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="86400-000"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Ponto de Referência / Como Chegar na Porteira
                    </label>
                    <input
                      type="text"
                      value={formData.ponto_referencia}
                      onChange={(e) => setFormData({ ...formData, ponto_referencia: e.target.value })}
                      placeholder="Ex: Porteira branca à esquerda após a Capela São José"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Área Plantada de Mandioca (Hectares)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.area_hectares}
                      onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                      placeholder="Ex: 24.5 ha"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: DADOS PARA PAGAMENTO & CHAVE PIX */}
              <div className="p-4 sm:p-6 rounded-md bg-eno-50/50 border-2 border-linha-forte/80  space-y-5">
                <div className="pb-3 border-b border-linha-forte flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 text-eno-950 font-extrabold text-sm uppercase tracking-wide">
                    <CreditCard className="w-4.5 h-4.5 text-eno-800" />
                    <span>3. Dados para Pagamento da Safra & Chave PIX</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-eno-950 mb-1.5">
                      Tipo de Chave PIX <span className="text-st-vencido">*</span>
                    </label>
                    <select
                      value={formData.tipo_chave_pix}
                      onChange={(e) => setFormData({ ...formData, tipo_chave_pix: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm font-bold bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    >
                      <option value="CPF">CPF</option>
                      <option value="Celular">Telefone Celular</option>
                      <option value="E-mail">E-mail</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="Aleatória">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-eno-950 mb-1.5">
                      Chave PIX do Agricultor <span className="text-st-vencido">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.chave_pix}
                        onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                        placeholder="Digite o CPF, celular com DDD, e-mail ou chave aleatória"
                        className="w-full px-3.5 py-2.5 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums font-bold bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 pr-16"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] font-extrabold bg-eno-800 text-white px-2 py-0.5 rounded tracking-wider">
                        PIX
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Nome do Titular da Conta PIX
                    </label>
                    <input
                      type="text"
                      value={formData.titular_pix}
                      onChange={(e) => setFormData({ ...formData, titular_pix: e.target.value })}
                      placeholder="Nome completo do titular"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Banco / Cooperativa de Crédito
                    </label>
                    <input
                      type="text"
                      value={formData.banco_nome}
                      onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                      placeholder="Ex: Banco do Brasil / Sicredi / Sicoob"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Agência e Conta (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.conta}
                      onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                      placeholder="Ag. 0000 / CC 00000-0"
                      className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm tabular-nums bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-2 mb-1">
                    Instruções Financeiras & Acordos de Safra
                  </label>
                  <input
                    type="text"
                    value={formData.observacoes_financeiras}
                    onChange={(e) => setFormData({ ...formData, observacoes_financeiras: e.target.value })}
                    placeholder="Ex: Pagamento imediato via PIX após pesagem na balança"
                    className="w-full px-3.5 py-2 rounded-md border border-linha-forte text-xs sm:text-sm font-medium bg-papel focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20"
                  />
                </div>
              </div>

            </div>
          </div>
        </FormularioCadastro>
      )}

      {/* ========================================================= */}
      {/* 3. MODO: HISTÓRICO DE ENTREGAS DE MANDIOCA (ROMANEIOS)    */}
      {/* ========================================================= */}
      {modo === 'historico' && agricultorSelecionado && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <div className="px-4 sm:px-6 pt-3">
            <button
              type="button"
              onClick={() => setModo('lista')}
              className="inline-flex items-center gap-1.5 h-10 sm:h-8 -ml-1 px-1 text-[13px] font-semibold text-eno-700 hover:text-eno-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro rounded"
            >
              <ArrowLeft className="w-4 h-4" /> Agricultores
            </button>
          </div>
          <CabecalhoPagina
            titulo={agricultorSelecionado.nome_completo}
            resumo={[
              agricultorSelecionado.nome_propriedade,
              `${agricultorSelecionado.endereco.municipio}/${agricultorSelecionado.endereco.uf}`,
              agricultorSelecionado.cpf_cnpj,
              agricultorSelecionado.chave_pix ? `PIX ${agricultorSelecionado.chave_pix}` : 'sem chave PIX',
            ].filter(Boolean).join(' · ')}
            className="!pt-1"
            acoes={
              agricultorSelecionado.chave_pix ? (
                <BotaoSecundario onClick={() => copiarChavePix(agricultorSelecionado.chave_pix, 'hist')} className="h-10 sm:h-9">
                  {copiadoId === 'hist' ? <><Check className="w-4 h-4 text-st-pago" /> Chave copiada</> : <><Copy className="w-4 h-4" /> Copiar PIX</>}
                </BotaoSecundario>
              ) : undefined
            }
          >
            <p className="mt-1 text-[12px] text-cinza">As compras de mandioca são lançadas em Pedidos › Cálculo na Roça.</p>
          </CabecalhoPagina>

          {/* CONTEÚDO DO HISTÓRICO */}
          <div className="px-3 sm:px-6 pb-6 space-y-5">
            {/* EXTRATO DAS COMPRAS (PESAGENS DO CÁLCULO NA ROÇA) */}
            <ExtratoAgricultor calculos={pesagensDoAgricultor} permitirRemoverComprovante />

            {/* GRÁFICO COM AS 3 LINHAS */}
            <div className="p-4 sm:p-5 bg-papel rounded-md border border-linha space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h2 className="text-[15px] font-bold tracking-[-0.01em] text-tinta">Mandioca líquida, valor e desconto por mês</h2>
                <span className="text-[12px] text-cinza">últimos 6 meses</span>
              </div>

              {/* Gráfico Recharts com 3 Linhas e Eixo Duplo (KG vs R$) */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico3Linhas} margin={{ top: 15, right: 35, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CORES.linha} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CORES.cinza }} axisLine={false} tickLine={false} />
                    
                    {/* Eixo Esquerdo: Volume em KG */}
                    <YAxis 
                      yAxisId="kg"
                      tick={{ fontSize: 11, fill: CORES.eno700 }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)} t`}
                    />

                    {/* Eixo Direito: Valor em R$ */}
                    <YAxis 
                      yAxisId="valor"
                      orientation="right"
                      tick={{ fontSize: 11, fill: CORES.ouroEscuro }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    />

                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-papel p-4 rounded-md border border-linha  min-w-[240px] space-y-2">
                              <div className="text-sm font-extrabold text-tinta border-b border-linha pb-1.5 flex items-center justify-between">
                                <span>{label}</span>
                                <span className="text-[11px] font-semibold text-cinza bg-papel-2 px-2 py-0.5 rounded-md">Safra</span>
                              </div>
                              <div className="space-y-1.5 pt-0.5">
                                {payload.map((entry, index) => {
                                  const isMandioca = entry.dataKey === 'kgMandioca';
                                  const isValor = entry.dataKey === 'valorTotal';
                                  const isResiduo = entry.dataKey === 'kgResiduo';

                                  const labelText = entry.name;
                                  const valueFormatted = isValor 
                                    ? `R$ ${(entry.value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : `${(entry.value as number).toLocaleString('pt-BR')} KG`;

                                  const textColor = isMandioca ? 'text-eno-800' : isValor ? 'text-tinta-2' : 'text-st-aguardando';
                                  const dotColor = isMandioca ? 'bg-eno-600' : isValor ? 'bg-eno-700' : 'bg-ouro';

                                  return (
                                    <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                      <div className="flex items-center gap-1.5 text-tinta-2 font-bold">
                                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                                        <span>{labelText}:</span>
                                      </div>
                                      <span className={`font-extrabold tabular-nums ${textColor}`}>
                                        {valueFormatted}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />

                    {/* LINHA 1: Mandioca em KG */}
                    <Line 
                      yAxisId="kg"
                      type="monotone" 
                      dataKey="kgMandioca" 
                      name="Mandioca Líquida (KG)"
                      stroke={CORES.eno700} 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: CORES.eno700, strokeWidth: 2, stroke: CORES.papel }} 
                      activeDot={{ r: 6 }} 
                    />

                    {/* LINHA 2: Valor Total em R$ */}
                    <Line 
                      yAxisId="valor"
                      type="monotone" 
                      dataKey="valorTotal" 
                      name="Valor Total (R$)"
                      stroke={CORES.ouroEscuro} 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: CORES.ouroEscuro, strokeWidth: 2, stroke: CORES.papel }} 
                      activeDot={{ r: 6 }} 
                    />

                    {/* LINHA 3: Desconto na pesagem (KG) */}
                    <Line 
                      yAxisId="kg"
                      type="monotone" 
                      dataKey="kgResiduo" 
                      name="Desconto na Pesagem (KG)"
                      stroke={'#a8321f'} 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#a8321f', strokeWidth: 2, stroke: CORES.papel }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda Informativa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-tinta-2 border-t border-linha">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-eno-700 shrink-0"></span>
                  <span><strong>Mandioca (KG):</strong> Peso líquido entregue (bruto − desconto).</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-ouro-escuro shrink-0"></span>
                  <span><strong>Valor Total (R$):</strong> Peso líquido × R$/KG.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-st-vencido shrink-0"></span>
                  <span><strong>Desconto:</strong> Casca, terra, impureza e tara descontadas na pesagem.</span>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}


    </div>
  );
}
