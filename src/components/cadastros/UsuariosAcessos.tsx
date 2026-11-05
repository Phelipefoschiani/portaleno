import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyRound,
  Plus,
  Save,
  Trash2,
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit2,
  Download,
  Upload,
  DatabaseBackup,
} from 'lucide-react';
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  redefinirSenha,
  excluirUsuario,
  obterSessao,
  PERFIS_USUARIO,
  PerfilUsuario,
  UsuarioSistema,
  EVENTO_AUTH_ATUALIZADO,
  SENHA_MINIMA,
} from '../../lib/auth';
import {
  carregarAgricultores,
  carregarRcas,
  carregarCadastrosProvisorios,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { carregarClientes } from '../../data/clientesData';
import { enviarDadosDesteNavegador, existemDadosParaEnviar } from '../../lib/bancoEnvio';
import { liberarEnvioBanco } from '../../lib/sincronizacao';
import { MODO_NUVEM } from '../../lib/supabase';
import { formatarDataBR } from '../../lib/datas';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalCadastro, BotaoLinha, BotaoCartao, campoCadastro, rotuloCadastro } from './FormularioCadastro';
import { ListaCadastro, LinkLinha } from './ListaCadastro';
import {
  baixarBackup,
  lerArquivoBackup,
  restaurarBackup,
  obterDataUltimoBackup,
  diasDesdeUltimoBackup,
  backupAtrasado,
  DIAS_LEMBRETE_BACKUP,
} from '../../lib/backup';

const PERFIS_COM_VINCULO: PerfilUsuario[] = ['AGRICULTOR', 'RCA', 'PROVISORIO', 'CLIENTE'];

const ROTULO_VINCULO: Partial<Record<PerfilUsuario, string>> = {
  AGRICULTOR: 'Agricultor vinculado',
  RCA: 'RCA vinculado',
  PROVISORIO: 'Cadastro provisório vinculado',
  CLIENTE: 'Cliente vinculado',
};

type FormUsuario = {
  usuario: string;
  nome: string;
  perfil: PerfilUsuario;
  vinculo_id: string;
  senha: string;
  confirmacao: string;
  ativo: boolean;
};

const FORM_VAZIO: FormUsuario = {
  usuario: '',
  nome: '',
  perfil: 'RCA',
  vinculo_id: '',
  senha: '',
  confirmacao: '',
  ativo: true,
};

/** Área "Usuários e Acessos" do Painel Geral (somente ADMIN). */
export function UsuariosAcessos() {
  const sessao = obterSessao();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>(() => listarUsuarios());
  const [versaoCadastros, setVersaoCadastros] = useState(0);
  const [modal, setModal] = useState<{ modo: 'novo' | 'editar' | 'senha'; usuario?: UsuarioSistema } | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviandoBanco, setEnviandoBanco] = useState(false);

  // Envia o que está guardado neste navegador para o banco (não apaga nada daqui)
  const enviarParaBanco = async () => {
    if (!existemDadosParaEnviar()) {
      window.alert('Não há dados guardados neste navegador para enviar.');
      return;
    }
    if (!window.confirm('Enviar os dados deste navegador para o banco de dados?\n\nOs registros que já existem no banco serão atualizados. Nada é apagado daqui.')) return;
    setEnviandoBanco(true);
    try {
      const r = await enviarDadosDesteNavegador();
      if (r.erros.length === 0) liberarEnvioBanco();
      window.alert(r.erros.length
        ? 'Envio com problemas:\n\n' + r.erros.join('\n')
        : `Envio concluído: ${r.linhas} registros em ${r.tabelas} tabelas.`);
    } finally {
      setEnviandoBanco(false);
    }
  };
  const [salvando, setSalvando] = useState(false);
  // Backup em arquivo
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(() => obterDataUltimoBackup());
  const [restaurando, setRestaurando] = useState(false);
  const inputBackupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const atualizarUsuarios = () => setUsuarios(listarUsuarios());
    const atualizarCadastros = () => setVersaoCadastros(v => v + 1);
    window.addEventListener(EVENTO_AUTH_ATUALIZADO, atualizarUsuarios);
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizarCadastros);
    window.addEventListener('clientes_updated', atualizarCadastros);
    return () => {
      window.removeEventListener(EVENTO_AUTH_ATUALIZADO, atualizarUsuarios);
      window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizarCadastros);
      window.removeEventListener('clientes_updated', atualizarCadastros);
    };
  }, []);

  // Opções de vínculo por perfil (cadastros reais)
  const opcoesVinculo = useMemo(() => {
    const agricultores = carregarAgricultores().map(a => ({ id: a.id, rotulo: `${a.nome_completo}${a.nome_propriedade ? ` · ${a.nome_propriedade}` : ''}` }));
    const rcas = carregarRcas().map(r => ({ id: r.id, rotulo: `${r.codigo_rca} · ${r.nome_fantasia || r.nome_completo}` }));
    const provisorios = carregarCadastrosProvisorios().map(c => ({ id: c.id, rotulo: `${c.nome_convidado} · ${c.empresa_solicitante}` }));
    const clientes = carregarClientes().map(c => ({ id: c.id, rotulo: `${c.fantasia || c.razao_nome}${c.endereco?.municipio ? ` · ${c.endereco.municipio}/${c.endereco.uf}` : ''}` }));
    return { AGRICULTOR: agricultores, RCA: rcas, PROVISORIO: provisorios, CLIENTE: clientes } as Record<string, { id: string; rotulo: string }[]>;
  }, [versaoCadastros]);

  const rotuloVinculo = (u: UsuarioSistema) => {
    if (!PERFIS_COM_VINCULO.includes(u.perfil)) return '—';
    if (!u.vinculo_id) return 'Sem vínculo';
    return opcoesVinculo[u.perfil]?.find(o => o.id === u.vinculo_id)?.rotulo || 'Vínculo removido';
  };

  if (!sessao || sessao.perfil !== 'ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center text-sm font-bold text-st-vencido">
        Acesso restrito a administradores.
      </div>
    );
  }

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setErro('');
    setModal({ modo: 'novo' });
  };

  const abrirEdicao = (u: UsuarioSistema) => {
    setForm({ ...FORM_VAZIO, usuario: u.usuario, nome: u.nome, perfil: u.perfil, vinculo_id: u.vinculo_id || '', ativo: u.ativo });
    setErro('');
    setModal({ modo: 'editar', usuario: u });
  };

  const abrirSenha = (u: UsuarioSistema) => {
    setForm({ ...FORM_VAZIO, usuario: u.usuario, nome: u.nome, perfil: u.perfil });
    setErro('');
    setModal({ modo: 'senha', usuario: u });
  };

  const executar = async (acao: () => Promise<void> | void, mensagem: string) => {
    setErro('');
    setAviso('');
    setSalvando(true);
    try {
      await acao();
      setUsuarios(listarUsuarios());
      setAviso(mensagem);
      setModal(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setSalvando(false);
    }
  };

  const validarSenhaForm = (): boolean => {
    if (form.senha.length < SENHA_MINIMA) {
      setErro(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`);
      return false;
    }
    if (form.senha !== form.confirmacao) {
      setErro('A confirmação não confere com a senha.');
      return false;
    }
    return true;
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    const vinculo = PERFIS_COM_VINCULO.includes(form.perfil) ? form.vinculo_id : '';

    if (modal.modo === 'novo') {
      if (!validarSenhaForm()) return;
      executar(async () => {
        await criarUsuario({
          usuario: form.usuario,
          nome: form.nome,
          perfil: form.perfil,
          vinculo_id: vinculo,
          senha: form.senha,
          ativo: form.ativo,
        });
      }, 'Usuário criado com sucesso.');
    } else if (modal.modo === 'editar' && modal.usuario) {
      const id = modal.usuario.id;
      executar(async () => {
        await atualizarUsuario(id, { usuario: form.usuario, nome: form.nome, perfil: form.perfil, vinculo_id: vinculo, ativo: form.ativo });
      }, 'Usuário atualizado.');
    } else if (modal.modo === 'senha' && modal.usuario) {
      if (!validarSenhaForm()) return;
      const id = modal.usuario.id;
      executar(() => redefinirSenha(id, form.senha), 'Senha redefinida.');
    }
  };

  const alternarAtivo = (u: UsuarioSistema) => {
    executar(async () => { await atualizarUsuario(u.id, { ativo: !u.ativo }); }, u.ativo ? 'Usuário desativado.' : 'Usuário ativado.');
  };

  const handleExcluir = (u: UsuarioSistema) => {
    if (!window.confirm(`Excluir o usuário "${u.usuario}"? Esta ação não pode ser desfeita.`)) return;
    executar(() => excluirUsuario(u.id), 'Usuário excluído.');
  };

  const handleBaixarBackup = () => {
    setErro('');
    try {
      const r = baixarBackup();
      setUltimoBackup(obterDataUltimoBackup());
      setAviso(`Backup gerado: ${r.nomeArquivo} (${r.totalChaves} conjuntos de dados). Guarde o arquivo em local seguro (pen drive, nuvem).`);
    } catch (e) {
      setErro('Não foi possível gerar o backup.');
    }
  };

  const handleRestaurarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setAviso('');
    setRestaurando(true);
    try {
      const backup = await lerArquivoBackup(arquivo);
      const dataBackup = backup.gerado_em ? new Date(backup.gerado_em).toLocaleString('pt-BR') : 'data desconhecida';
      const ok = window.confirm(
        `Restaurar o backup de ${dataBackup} (${backup.total_chaves} conjuntos de dados)?

` +
        'ATENÇÃO: todos os dados atuais do sistema neste navegador serão SUBSTITUÍDOS pelos do arquivo. ' +
        'Usuários e senhas não são alterados. A página será recarregada.'
      );
      if (!ok) return;
      restaurarBackup(backup);
      window.location.reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível restaurar o backup.');
    } finally {
      setRestaurando(false);
    }
  };

  const diasBackup = diasDesdeUltimoBackup();
  const lembreteBackup = backupAtrasado();

  const rotuloPerfil = (p: PerfilUsuario) => PERFIS_USUARIO.find(x => x.id === p)?.rotulo || p;
  const precisaVinculo = PERFIS_COM_VINCULO.includes(form.perfil);

  const ativosUsu = usuarios.filter(u => u.ativo).length;

  return (
    <div className="flex-1 w-full min-h-0 h-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Usuários e acessos"
          resumo={`${usuarios.length} ${usuarios.length === 1 ? 'login' : 'logins'} · ${ativosUsu} ${ativosUsu === 1 ? 'ativo' : 'ativos'} · login de RCA e cliente também pode ser criado no próprio cadastro`}
          acoes={
            <div className="flex flex-wrap gap-2">
              {MODO_NUVEM && (
                <BotaoSecundario onClick={enviarParaBanco} disabled={enviandoBanco} className="w-full sm:w-auto h-10 sm:h-9">
                  {enviandoBanco ? 'Enviando…' : 'Enviar dados deste navegador para o banco'}
                </BotaoSecundario>
              )}
              <BotaoPrimario onClick={abrirNovo} className="w-full sm:w-auto h-10 sm:h-9">
                <Plus className="w-4 h-4" /> Novo usuário
              </BotaoPrimario>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6 space-y-4">
          {(erro && !modal) && (
            <div role="alert" className="flex items-start gap-2 rounded-md bg-st-vencido-bg px-3 py-2.5 text-[13px] font-semibold text-st-vencido">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{erro}</span>
            </div>
          )}
          {aviso && (
            <div role="status" className="flex items-start gap-2 rounded-md bg-st-pago-bg px-3 py-2.5 text-[13px] font-semibold text-st-pago">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /><span>{aviso}</span>
            </div>
          )}

          {usuarios.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              <EstadoVazio titulo="Nenhum usuário cadastrado" texto="Crie os logins de quem acessa o sistema e os portais." />
            </div>
          ) : (
            <ListaCadastro<UsuarioSistema>
              itens={usuarios}
              chave={u => u.id}
              cartao={u => ({
                sobre: rotuloPerfil(u.perfil),
                titulo: <>{u.nome || u.usuario}{u.id === sessao.usuario_id && <span className="text-[12px] font-semibold text-cinza"> (você)</span>}</>,
                subtitulo: u.usuario,
                status: <StatusChip tom={u.ativo ? 'pago' : 'neutro'}>{u.ativo ? 'Ativo' : 'Inativo'}</StatusChip>,
                detalhes: [PERFIS_COM_VINCULO.includes(u.perfil) ? `Vínculo: ${rotuloVinculo(u)}` : null, `Criado em ${formatarDataBR(u.criado_em)}`],
              })}
              acoesCartao={u => (
                <>
                  <BotaoCartao onClick={() => abrirEdicao(u)} className="flex-1"><Edit2 className="w-3.5 h-3.5" /> Editar</BotaoCartao>
                  <BotaoCartao onClick={() => abrirSenha(u)} className="flex-1"><KeyRound className="w-3.5 h-3.5" /> Senha</BotaoCartao>
                  <BotaoCartao onClick={() => alternarAtivo(u)} className="flex-1">{u.ativo ? 'Desativar' : 'Ativar'}</BotaoCartao>
                  <BotaoCartao perigo onClick={() => handleExcluir(u)} rotulo={`Excluir ${u.usuario}`} className="w-10 !px-0"><Trash2 className="w-4 h-4" /></BotaoCartao>
                </>
              )}
              colunas={[
                {
                  titulo: 'Usuário',
                  render: u => (
                    <>
                      <div className="font-semibold text-tinta">{u.nome || u.usuario}</div>
                      <div className="text-[11.5px] text-cinza">{u.usuario}{u.id === sessao.usuario_id ? ' (você)' : ''}</div>
                    </>
                  ),
                },
                { titulo: 'Perfil', render: u => rotuloPerfil(u.perfil) },
                { titulo: 'Vínculo', render: u => <span className={rotuloVinculo(u) === 'Sem vínculo' || rotuloVinculo(u) === 'Vínculo removido' ? 'text-st-aguardando font-semibold' : ''}>{rotuloVinculo(u)}</span> },
                { titulo: 'Situação', render: u => <StatusChip tom={u.ativo ? 'pago' : 'neutro'}>{u.ativo ? 'Ativo' : 'Inativo'}</StatusChip> },
                { titulo: 'Criado em', className: 'tabular-nums whitespace-nowrap text-cinza', render: u => formatarDataBR(u.criado_em) },
              ]}
              acoesLinha={u => (
                <>
                  <BotaoLinha rotulo="Editar perfil e vínculo" onClick={() => abrirEdicao(u)}><Edit2 className="w-4 h-4" /></BotaoLinha>
                  <BotaoLinha rotulo="Redefinir senha" onClick={() => abrirSenha(u)}><KeyRound className="w-4 h-4" /></BotaoLinha>
                  <LinkLinha onClick={() => alternarAtivo(u)}>{u.ativo ? 'Desativar' : 'Ativar'}</LinkLinha>
                  <BotaoLinha perigo rotulo="Excluir usuário" onClick={() => handleExcluir(u)}><Trash2 className="w-4 h-4" /></BotaoLinha>
                </>
              )}
            />
          )}

          {/* BACKUP DOS DADOS (somente ADMIN) */}
          <section className={`rounded-md border bg-papel overflow-hidden ${lembreteBackup ? 'border-st-aguardando/40' : 'border-linha'}`}>
            <div className={`h-[3px] ${lembreteBackup ? 'bg-st-aguardando' : 'filete-ouro'}`} aria-hidden />
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold tracking-[-0.01em] text-tinta">Backup dos dados</h2>
                <p className="mt-1 text-[13px] text-tinta-2 max-w-2xl">
                  Os dados ficam apenas neste navegador. Baixe um arquivo de backup com frequência para não perder nada
                  (limpeza do navegador, troca de computador). Usuários e senhas não entram no backup.
                </p>
                <p className="mt-2 text-[13px] text-cinza tabular-nums">
                  Último backup: <strong className="text-tinta font-semibold">{ultimoBackup ? `${formatarDataBR(ultimoBackup)}${diasBackup !== null ? ` (${diasBackup === 0 ? 'hoje' : diasBackup === 1 ? 'há 1 dia' : `há ${diasBackup} dias`})` : ''}` : 'nunca feito neste navegador'}</strong>
                </p>
                {lembreteBackup && (
                  <p className="mt-1 text-[13px] font-semibold text-st-aguardando flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {ultimoBackup ? `Já se passaram mais de ${DIAS_LEMBRETE_BACKUP} dias desde o último backup. Faça um novo agora.` : 'Recomendado: faça o primeiro backup agora.'}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <BotaoPrimario onClick={handleBaixarBackup} className="h-11 sm:h-9">
                  <Download className="w-4 h-4" /> Baixar backup
                </BotaoPrimario>
                <input ref={inputBackupRef} type="file" accept="application/json,.json" className="hidden" onChange={handleRestaurarBackup} />
                <BotaoSecundario onClick={() => inputBackupRef.current?.click()} disabled={restaurando} className="h-11 sm:h-9">
                  <Upload className="w-4 h-4" /> {restaurando ? 'Lendo arquivo…' : 'Restaurar backup'}
                </BotaoSecundario>
              </div>
            </div>
          </section>
        </div>
      </div>

      {modal && (
        <ModalCadastro
          onSubmit={handleSalvar}
          onFechar={() => setModal(null)}
          titulo={modal.modo === 'novo' ? 'Novo usuário' : modal.modo === 'editar' ? `Editar ${modal.usuario?.usuario}` : 'Redefinir senha'}
          subtitulo={modal.modo === 'senha' ? modal.usuario?.usuario : 'Login, perfil de acesso e vínculo com o cadastro'}
          rotuloSalvar="Salvar"
          salvando={salvando}
          largura="max-w-lg"
        >
          <div className="space-y-3.5">
            {erro && (
              <div role="alert" className="flex items-start gap-2 rounded-md bg-st-vencido-bg px-3 py-2.5 text-[13px] font-semibold text-st-vencido">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{erro}</span>
              </div>
            )}

            {modal.modo !== 'senha' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={rotuloCadastro}>Usuário ou e-mail (login) *</label>
                    <input className={campoCadastro} value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} autoComplete="off" autoCapitalize="none" required />
                  </div>
                  <div>
                    <label className={rotuloCadastro}>Nome</label>
                    <input className={campoCadastro} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={rotuloCadastro}>Perfil de acesso *</label>
                  <select className={`${campoCadastro} cursor-pointer`} value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value as PerfilUsuario, vinculo_id: '' })}>
                    {PERFIS_USUARIO.map(p => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                  </select>
                </div>
                {precisaVinculo && (
                  <div>
                    <label className={rotuloCadastro}>{ROTULO_VINCULO[form.perfil] || 'Vínculo'}</label>
                    <select className={`${campoCadastro} cursor-pointer`} value={form.vinculo_id} onChange={e => setForm({ ...form, vinculo_id: e.target.value })}>
                      <option value="">Sem vínculo (o portal não mostrará dados)</option>
                      {(opcoesVinculo[form.perfil] || []).map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
                    </select>
                    {(opcoesVinculo[form.perfil] || []).length === 0 && (
                      <p className="text-[12px] text-st-aguardando mt-1">Nenhum cadastro disponível. Cadastre primeiro em Cadastros.</p>
                    )}
                  </div>
                )}
                <label className="inline-flex items-center gap-2 min-h-10 text-[13px] font-semibold text-tinta cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 accent-eno-700" />
                  Usuário ativo
                </label>
              </>
            )}

            {(modal.modo === 'novo' || modal.modo === 'senha') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={rotuloCadastro}>{modal.modo === 'senha' ? 'Nova senha *' : 'Senha *'}</label>
                  <input type="password" className={campoCadastro} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} autoComplete="new-password" placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`} />
                </div>
                <div>
                  <label className={rotuloCadastro}>Confirmar senha *</label>
                  <input type="password" className={campoCadastro} value={form.confirmacao} onChange={e => setForm({ ...form, confirmacao: e.target.value })} autoComplete="new-password" />
                </div>
              </div>
            )}
          </div>
        </ModalCadastro>
      )}
    </div>
  );
}
