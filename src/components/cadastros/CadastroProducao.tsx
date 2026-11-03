import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Phone, 
  Calendar, 
  Clock, 
  Briefcase, 
  Building2, 
  Save, 
  X, 
  Filter, 
  Sparkles,
  HardHat,
  Factory,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  carregarColaboradoresProducao,
  salvarColaboradoresProducao,
  EVENTO_CADASTROS_ATUALIZADOS,
  ColaboradorProducao,
} from '../../data/cadastrosData';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca, SeletorFiltro } from '../ui/BarraFiltros';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalCadastro, BotaoLinha, BotaoCartao, campoCadastro, rotuloCadastro } from './FormularioCadastro';
import { ListaCadastro } from './ListaCadastro';

// Tipo e persistência centralizados em cadastrosData
export type { ColaboradorProducao } from '../../data/cadastrosData';

/** @deprecated dados de exemplo removidos; os colaboradores ficam no armazenamento local */
export const COLABORADORES_PRODUCAO_INICIAIS: ColaboradorProducao[] = [];

export const SETORES_PRODUCAO = [
  'Lavagem e Recepção',
  'Ralação e Moagem',
  'Secagem e Amido',
  'Ensaque e Expedição',
  'Caldeira e Utilidades',
  'Laboratório e Qualidade',
  'Manutenção Mecânica'
];

export function CadastroProducao() {
  const [colaboradores, setColaboradores] = useListaPersistida<ColaboradorProducao>(carregarColaboradoresProducao, salvarColaboradoresProducao, EVENTO_CADASTROS_ATUALIZADOS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO' | 'FERIAS'>('TODOS');
  const [setorFilter, setSetorFilter] = useState<string>('TODOS');

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<ColaboradorProducao | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    matricula: string;
    nome_completo: string;
    cargo: string;
    setor: string;
    cpf: string;
    telefone: string;
    status: 'ATIVO' | 'INATIVO' | 'FERIAS';
    observacoes: string;
  }>({
    matricula: '',
    nome_completo: '',
    cargo: '',
    setor: 'Ralação e Moagem',
    cpf: '',
    telefone: '',
    status: 'ATIVO',
    observacoes: ''
  });

  // Métricas
  const metricas = useMemo(() => {
    const total = colaboradores.length;
    const ativos = colaboradores.filter(c => c.status === 'ATIVO').length;
    const ferias = colaboradores.filter(c => c.status === 'FERIAS').length;
    const inativos = colaboradores.filter(c => c.status === 'INATIVO').length;
    return { total, ativos, ferias, inativos };
  }, [colaboradores]);

  // Lista Filtrada
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter(c => {
      const matchText = 
        c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.setor.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchText) return false;
      if (statusFilter !== 'TODOS' && c.status !== statusFilter) return false;
      if (setorFilter !== 'TODOS' && c.setor !== setorFilter) return false;

      return true;
    });
  }, [colaboradores, searchTerm, statusFilter, setorFilter]);

  // Abrir modal novo
  const handleAbrirNovo = () => {
    const proximaMatriculaNum = 100 + colaboradores.length + 1;
    setFormData({
      matricula: `PRD-${proximaMatriculaNum}`,
      nome_completo: '',
      cargo: '',
      setor: 'Ralação e Moagem',
      cpf: '',
      telefone: '',
      status: 'ATIVO',
      observacoes: ''
    });
    setModoEdicao(null);
    setModalAberto(true);
  };

  // Abrir modal edição
  const handleAbrirEdicao = (colab: ColaboradorProducao) => {
    setModoEdicao(colab);
    setFormData({
      matricula: colab.matricula,
      nome_completo: colab.nome_completo,
      cargo: colab.cargo,
      setor: colab.setor,
      cpf: colab.cpf,
      telefone: colab.telefone,
      status: colab.status,
      observacoes: colab.observacoes || ''
    });
    setModalAberto(true);
  };

  // Salvar
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo.trim() || !formData.cargo.trim()) {
      alert('Por favor, preencha o Nome Completo e o Cargo do colaborador.');
      return;
    }

    if (modoEdicao) {
      setColaboradores(prev => prev.map(c => {
        if (c.id === modoEdicao.id) {
          return {
            ...c,
            ...formData
          };
        }
        return c;
      }));
    } else {
      const novoColab: ColaboradorProducao = {
        id: `prd_${Date.now()}`,
        ...formData
      };
      setColaboradores(prev => [novoColab, ...prev]);
    }

    setModalAberto(false);
  };

  // Alternar Status rápido
  const handleToggleStatus = (id: string) => {
    setColaboradores(prev => prev.map(c => {
      if (c.id === id) {
        const proximoStatus = c.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        return { ...c, status: proximoStatus };
      }
      return c;
    }));
  };

  // Excluir
  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente remover este colaborador do cadastro de produção?')) {
      setColaboradores(prev => prev.filter(c => c.id !== id));
    }
  };

  const tomStatus = (s: ColaboradorProducao['status']) => (s === 'ATIVO' ? 'pago' : s === 'FERIAS' ? 'aguardando' : 'vencido') as 'pago' | 'aguardando' | 'vencido';
  const rotuloStatus = (s: ColaboradorProducao['status']) => (s === 'ATIVO' ? 'Ativo' : s === 'FERIAS' ? 'Férias' : 'Inativo');

  return (
    <div className="relative h-full w-full min-h-0 flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Equipe de produção"
          resumo={
            metricas.total === 0
              ? 'Nenhum colaborador cadastrado'
              : `${metricas.total} ${metricas.total === 1 ? 'colaborador' : 'colaboradores'} · ${metricas.ativos} em operação${metricas.ferias ? ` · ${metricas.ferias} de férias` : ''}${metricas.inativos ? ` · ${metricas.inativos} inativos` : ''}`
          }
          acoes={
            metricas.total === 0 ? undefined : (
              <BotaoPrimario onClick={handleAbrirNovo} className="w-full sm:w-auto h-10 sm:h-9">
                <Plus className="w-4 h-4" /> Novo colaborador
              </BotaoPrimario>
            )
          }
        />
        {metricas.total > 0 && (
          <BarraFiltros>
            <Segmentado<'TODOS' | 'ATIVO' | 'INATIVO' | 'FERIAS'>
              rotuloAria="Situação"
              valor={statusFilter}
              onChange={setStatusFilter}
              opcoes={[
                { valor: 'TODOS', rotulo: 'Todos', contagem: metricas.total },
                { valor: 'ATIVO', rotulo: 'Ativos', contagem: metricas.ativos },
                { valor: 'FERIAS', rotulo: 'Férias', contagem: metricas.ferias },
                { valor: 'INATIVO', rotulo: 'Inativos', contagem: metricas.inativos },
              ]}
            />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <CampoBusca valor={searchTerm} onChange={setSearchTerm} placeholder="Buscar nome, matrícula ou cargo" className="flex-1 md:flex-none md:w-72 [&_input]:h-10 sm:[&_input]:h-8" />
              <SeletorFiltro value={setorFilter} onChange={(e) => setSetorFilter(e.target.value)} aria-label="Setor" className="h-10 sm:h-8 max-w-[44%] md:max-w-none">
                <option value="TODOS">Todos os setores</option>
                {SETORES_PRODUCAO.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </SeletorFiltro>
            </div>
          </BarraFiltros>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
          {colaboradoresFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              {metricas.total === 0 ? (
                <EstadoVazio
                  titulo="Nenhum colaborador cadastrado"
                  texto="Cadastre quem trabalha na linha de produção: matrícula, função e setor. Eles aparecem nas ordens de produção."
                  acao={<BotaoPrimario onClick={handleAbrirNovo} className="h-10 sm:h-9"><Plus className="w-4 h-4" /> Novo colaborador</BotaoPrimario>}
                />
              ) : (
                <EstadoVazio
                  titulo="Nenhum colaborador com esses filtros"
                  texto="Confira a busca, a situação e o setor."
                  acao={<BotaoSecundario onClick={() => { setSearchTerm(''); setStatusFilter('TODOS'); setSetorFilter('TODOS'); }}>Limpar filtros</BotaoSecundario>}
                />
              )}
            </div>
          ) : (
            <ListaCadastro<ColaboradorProducao>
              itens={colaboradoresFiltrados}
              chave={c => c.id}
              cartao={c => ({
                sobre: `${c.matricula} · ${c.setor}`,
                titulo: c.nome_completo,
                subtitulo: c.cargo,
                status: <StatusChip tom={tomStatus(c.status)}>{rotuloStatus(c.status)}</StatusChip>,
                detalhes: [c.telefone],
              })}
              acoesCartao={c => (
                <>
                  <BotaoCartao onClick={() => handleAbrirEdicao(c)} className="flex-1"><Edit2 className="w-3.5 h-3.5" /> Editar</BotaoCartao>
                  <BotaoCartao onClick={() => handleToggleStatus(c.id)} className="flex-1">{c.status === 'ATIVO' ? 'Inativar' : 'Ativar'}</BotaoCartao>
                  <BotaoCartao perigo onClick={() => handleExcluir(c.id)} rotulo={`Excluir ${c.nome_completo}`} className="w-10 !px-0"><Trash2 className="w-4 h-4" /></BotaoCartao>
                </>
              )}
              colunas={[
                { titulo: 'Matrícula', className: 'tabular-nums whitespace-nowrap', render: c => c.matricula },
                {
                  titulo: 'Colaborador',
                  render: c => (
                    <>
                      <div className="font-semibold text-tinta">{c.nome_completo}</div>
                      {c.cpf && <div className="text-[11.5px] text-cinza tabular-nums">CPF {c.cpf}</div>}
                    </>
                  ),
                },
                { titulo: 'Função', render: c => c.cargo },
                { titulo: 'Setor', render: c => c.setor },
                { titulo: 'Telefone', className: 'tabular-nums whitespace-nowrap', render: c => c.telefone || '—' },
                {
                  titulo: 'Situação',
                  centro: true,
                  render: c => (
                    <button type="button" onClick={() => handleToggleStatus(c.id)} className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ouro" title="Clique para alternar a situação">
                      <StatusChip tom={tomStatus(c.status)}>{rotuloStatus(c.status)}</StatusChip>
                    </button>
                  ),
                },
              ]}
              acoesLinha={c => (
                <>
                  <BotaoLinha rotulo="Editar colaborador" onClick={() => handleAbrirEdicao(c)}><Edit2 className="w-4 h-4" /></BotaoLinha>
                  <BotaoLinha perigo rotulo="Excluir colaborador" onClick={() => handleExcluir(c.id)}><Trash2 className="w-4 h-4" /></BotaoLinha>
                </>
              )}
            />
          )}
        </div>
      </div>

      {/* Novo / editar colaborador */}
      {modalAberto && (
        <ModalCadastro
          onSubmit={handleSalvar}
          onFechar={() => setModalAberto(false)}
          titulo={modoEdicao ? modoEdicao.nome_completo : 'Novo colaborador'}
          subtitulo={modoEdicao ? 'Editar colaborador da produção' : 'Matrícula, função e setor na linha de produção'}
          rotuloSalvar={modoEdicao ? 'Salvar alterações' : 'Cadastrar colaborador'}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={rotuloCadastro}>Matrícula *</label>
              <input type="text" required value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} placeholder="Ex: PRD-109" className={`${campoCadastro} tabular-nums`} />
            </div>
            <div className="sm:col-span-2">
              <label className={rotuloCadastro}>Nome completo *</label>
              <input type="text" required value={formData.nome_completo} onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })} placeholder="Ex: João Ferreira da Silva" className={campoCadastro} />
            </div>
            <div>
              <label className={rotuloCadastro}>Cargo / função *</label>
              <input type="text" required value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} placeholder="Ex: Operador de máquinas" className={campoCadastro} />
            </div>
            <div>
              <label className={rotuloCadastro}>Setor</label>
              <select value={formData.setor} onChange={(e) => setFormData({ ...formData, setor: e.target.value })} className={`${campoCadastro} cursor-pointer`}>
                {SETORES_PRODUCAO.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotuloCadastro}>CPF</label>
              <input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" className={`${campoCadastro} tabular-nums`} />
            </div>
            <div>
              <label className={rotuloCadastro}>Telefone / WhatsApp</label>
              <input type="text" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" className={`${campoCadastro} tabular-nums`} />
            </div>
            <div>
              <label className={rotuloCadastro}>Situação</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className={`${campoCadastro} cursor-pointer`}>
                <option value="ATIVO">Ativo</option>
                <option value="FERIAS">Em férias</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={rotuloCadastro}>Observações</label>
              <textarea
                rows={2}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Treinamentos, certificados de segurança (NR) ou outras anotações"
                className="w-full rounded-md border border-linha-forte bg-papel p-2.5 text-[14px] sm:text-[13px] text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15"
              />
            </div>
          </div>
        </ModalCadastro>
      )}
    </div>
  );
}
