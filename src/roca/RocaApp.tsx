import { useEffect, useMemo, useState } from 'react';
import { calcularDescontoRoca, totaisDaPesagem, SacoRoca, PesagemRoca } from './calculo';
import {
  listarAgricultoresLocais,
  gravarAgricultorLocal,
  enfileirar,
  listarPendentes,
  Pendente,
} from './banco';
import { iniciarSincronizacao, sincronizarAgora as sincronizar, StatusSync } from './sincronizar';

// Agricultor como fica no banco e no aparelho
interface AgricultorApp {
  id: string;
  empresa_id: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_completo: string;
  nome_propriedade: string;
  cpf_cnpj: string;
  ie_rural: string;
  telefone: string;
  endereco: { estrada_linha: string; comunidade_bairro: string; municipio: string; uf: string; cep: string };
  chave_pix: string;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  titular_pix?: string;
  ativo: boolean;
  criado_em: string;
  origem_app?: boolean;
}

type Aba = 'PESAGEM' | 'AGRICULTORES' | 'PENDENTES';

const CHAVE_PESADOR = 'eno_roca_pesador';
const hoje = () => new Date().toISOString().slice(0, 10);
const kg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;

const campo = 'w-full h-12 rounded-xl border border-stone-300 bg-white px-3 text-[16px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600';
const rotulo = 'block text-[13px] font-bold text-stone-700 mb-1';
const botao = 'h-12 px-5 rounded-xl bg-emerald-800 text-white text-[15px] font-bold active:scale-[0.99] disabled:opacity-50';

export function RocaApp() {
  const [aba, setAba] = useState<Aba>('PESAGEM');
  const [status, setStatus] = useState<StatusSync>({ online: navigator.onLine, pendentes: 0, sincronizando: false });
  const [agricultores, setAgricultores] = useState<AgricultorApp[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [mensagem, setMensagem] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  // Pesagem
  const [agricultorId, setAgricultorId] = useState('');
  const [data, setData] = useState(hoje());
  const [pesador, setPesador] = useState(() => localStorage.getItem(CHAVE_PESADOR) || '');
  const [precoKg, setPrecoKg] = useState('');
  const [pesoSaco, setPesoSaco] = useState('');
  const [sacos, setSacos] = useState<SacoRoca[]>([]);
  const [pctDesconto, setPctDesconto] = useState('');
  const [tara, setTara] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');

  // Cadastro de agricultor
  const [novo, setNovo] = useState({ nome: '', propriedade: '', cpf: '', telefone: '', municipio: '', uf: '', pix: '' });

  const recarregarLocais = async () => {
    setAgricultores((await listarAgricultoresLocais<AgricultorApp>()).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)));
    setPendentes(await listarPendentes());
  };

  useEffect(() => {
    recarregarLocais();
    const parar = iniciarSincronizacao(s => {
      setStatus(prev => ({ ...prev, ...s }));
      recarregarLocais();
    });
    return parar;
  }, []);

  const agricultor = agricultores.find(a => a.id === agricultorId);
  const totais = useMemo(
    () => totaisDaPesagem(sacos, num(precoKg), num(pctDesconto), num(tara)),
    [sacos, precoKg, pctDesconto, tara]
  );
  const temDesconto = totais.desconto > 0;

  const avisar = (tom: 'ok' | 'erro', texto: string) => {
    setMensagem({ tom, texto });
    window.setTimeout(() => setMensagem(null), 6000);
  };

  const adicionarSaco = () => {
    const peso = parseFloat(pesoSaco.replace(',', '.'));
    if (!peso || peso <= 0) return avisar('erro', 'Digite o peso do saco em kg.');
    setSacos(prev => [...prev, { numero: prev.length + 1, peso_kg: parseFloat(peso.toFixed(3)) }]);
    setPesoSaco('');
  };

  const removerSaco = (numero: number) => {
    setSacos(prev => prev.filter(s => s.numero !== numero).map((s, i) => ({ ...s, numero: i + 1 })));
  };

  const limparPesagem = () => {
    setSacos([]);
    setPesoSaco('');
    setPctDesconto('');
    setTara('');
    setMotivo('');
    setObservacao('');
  };

  const salvarPesagem = async () => {
    if (!agricultor) return avisar('erro', 'Escolha o agricultor.');
    if (sacos.length === 0) return avisar('erro', 'Pese pelo menos um saco.');
    if (num(precoKg) <= 0) return avisar('erro', 'Informe o preço por kg.');
    if (totais.pesoLiquido <= 0) return avisar('erro', 'O desconto não pode zerar o peso.');
    if (pesador.trim()) localStorage.setItem(CHAVE_PESADOR, pesador.trim());

    const id = `pes_app_${Date.now()}`;
    const pesagem: PesagemRoca & { id: string } = {
      id,
      data,
      criado_em: new Date().toISOString(),
      agricultor_id: agricultor.id,
      agricultor_nome: agricultor.nome_completo,
      agricultor_propriedade: agricultor.nome_propriedade,
      agricultor_cidade_uf: `${agricultor.endereco.municipio}/${agricultor.endereco.uf}`,
      agricultor_cpf_cnpj: agricultor.cpf_cnpj,
      agricultor_chave_pix: agricultor.chave_pix,
      local_pesagem: agricultor.nome_propriedade ? `${agricultor.nome_propriedade} - ${agricultor.endereco.municipio}/${agricultor.endereco.uf}` : `Roça - ${agricultor.endereco.municipio}/${agricultor.endereco.uf}`,
      pesador_responsavel: pesador.trim(),
      preco_por_kg: num(precoKg),
      sacos,
      desconto_percentual: num(pctDesconto),
      desconto_tara_kg: num(tara),
      desconto_kg: calcularDescontoRoca(totais.pesoBruto, num(pctDesconto), num(tara)).desconto,
      peso_bruto_kg: totais.pesoBruto,
      peso_liquido_kg: totais.pesoLiquido,
      valor_total: totais.valor,
      motivo_desconto: temDesconto ? motivo.trim() || undefined : undefined,
      observacoes: observacao.trim() || undefined,
    };
    await enfileirar('PESAGEM', pesagem, id);
    limparPesagem();
    avisar('ok', 'Pesagem salva no aparelho. Vai para o sistema quando tiver internet.');
    recarregarLocais();
    setStatus(s => ({ ...s, pendentes: s.pendentes + 1 }));
  };

  const salvarAgricultor = async () => {
    if (!novo.nome.trim() || !novo.municipio.trim() || !novo.uf.trim()) {
      return avisar('erro', 'Informe nome, município e UF.');
    }
    const id = `agr_app_${Date.now()}`;
    const dados: AgricultorApp = {
      id,
      empresa_id: 'emp_grupo_eno',
      tipo_pessoa: novo.cpf.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF',
      nome_completo: novo.nome.trim(),
      nome_propriedade: novo.propriedade.trim(),
      cpf_cnpj: novo.cpf.trim(),
      ie_rural: '',
      telefone: novo.telefone.trim(),
      endereco: { estrada_linha: '', comunidade_bairro: '', municipio: novo.municipio.trim(), uf: novo.uf.trim().toUpperCase(), cep: '' },
      chave_pix: novo.pix.trim(),
      tipo_chave_pix: 'CPF',
      titular_pix: novo.nome.trim(),
      ativo: true,
      criado_em: new Date().toISOString(),
      origem_app: true,
    };
    await gravarAgricultorLocal(dados); // já aparece para usar na pesagem, mesmo sem internet
    await enfileirar('AGRICULTOR', dados, id);
    setNovo({ nome: '', propriedade: '', cpf: '', telefone: '', municipio: '', uf: '', pix: '' });
    avisar('ok', 'Agricultor salvo. Já pode ser usado na pesagem.');
    recarregarLocais();
  };

  const sincronizarAgora = async () => {
    setStatus(s => ({ ...s, sincronizando: true }));
    const r = await sincronizar();
    setStatus(s => ({ ...s, sincronizando: false, ultimoErro: r.ok ? undefined : r.erro }));
    recarregarLocais();
    avisar(r.ok ? 'ok' : 'erro', r.ok ? 'Tudo enviado.' : `Não enviou: ${r.erro}`);
  };

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900 font-sans pb-10">
      <header className="sticky top-0 z-20 bg-emerald-950 text-white px-4 py-3 shadow">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Grupo ENO</div>
            <div className="text-lg font-black leading-tight">Roça</div>
          </div>
          <div className="text-right text-[12px]">
            <div className={`inline-flex items-center gap-1.5 font-bold ${status.online ? 'text-emerald-300' : 'text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${status.online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {status.online ? 'Com internet' : 'Sem internet'}
            </div>
            <div className="text-emerald-200">{pendentes.length} para enviar</div>
          </div>
        </div>
        <button
          type="button"
          onClick={sincronizarAgora}
          disabled={status.sincronizando || !status.online}
          className="mt-2 w-full h-10 rounded-lg bg-white/10 text-[13px] font-bold disabled:opacity-40"
        >
          {status.sincronizando ? 'Enviando...' : 'Enviar agora'}
        </button>
      </header>

      <nav className="grid grid-cols-3 bg-white border-b border-stone-200 sticky top-[124px] z-10">
        {([['PESAGEM', 'Pesagem'], ['AGRICULTORES', 'Agricultores'], ['PENDENTES', `Pendentes (${pendentes.length})`]] as [Aba, string][]).map(([id, nome]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`h-12 text-[13px] font-bold ${aba === id ? 'text-emerald-800 border-b-2 border-emerald-700' : 'text-stone-500'}`}
          >
            {nome}
          </button>
        ))}
      </nav>

      {mensagem && (
        <div className={`mx-4 mt-3 rounded-xl px-4 py-3 text-[14px] font-semibold ${mensagem.tom === 'ok' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
          {mensagem.texto}
        </div>
      )}

      {aba === 'PESAGEM' && (
        <div className="p-4 space-y-4">
          <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
            <div>
              <label className={rotulo}>Agricultor</label>
              <select className={campo} value={agricultorId} onChange={e => setAgricultorId(e.target.value)}>
                <option value="">Escolha...</option>
                {agricultores.map(a => <option key={a.id} value={a.id}>{a.nome_completo}</option>)}
              </select>
              {agricultores.length === 0 && <p className="text-[13px] text-stone-500 mt-1">Nenhum agricultor ainda. Cadastre na aba Agricultores.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={rotulo}>Data</label>
                <input type="date" className={campo} value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div>
                <label className={rotulo}>Preço por kg (R$)</label>
                <input inputMode="decimal" className={campo} value={precoKg} onChange={e => setPrecoKg(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className={rotulo}>Pesador responsável</label>
              <input className={campo} value={pesador} onChange={e => setPesador(e.target.value)} placeholder="Seu nome" />
            </div>
          </section>

          <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="text-[13px] font-bold text-stone-700">Sacos pesados</div>
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                className={`${campo} text-2xl font-black`}
                value={pesoSaco}
                onChange={e => setPesoSaco(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') adicionarSaco(); }}
                placeholder="kg"
              />
              <button type="button" onClick={adicionarSaco} className={`${botao} shrink-0 min-w-[110px]`}>Adicionar</button>
            </div>
            {sacos.length > 0 && (
              <ul className="grid grid-cols-2 gap-2">
                {sacos.map(s => (
                  <li key={s.numero} className="flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2">
                    <span className="text-[13px] text-stone-600">#{s.numero}</span>
                    <span className="font-bold tabular-nums">{kg(s.peso_kg)} kg</span>
                    <button type="button" onClick={() => removerSaco(s.numero)} className="text-[12px] text-red-700 font-bold ml-2" aria-label={`Remover saco ${s.numero}`}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={rotulo}>Desconto (%)</label>
                <input inputMode="decimal" className={campo} value={pctDesconto} onChange={e => setPctDesconto(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={rotulo}>Tara (kg)</label>
                <input inputMode="decimal" className={campo} value={tara} onChange={e => setTara(e.target.value)} placeholder="0" />
              </div>
            </div>
            {temDesconto && (
              <div>
                <label className={rotulo}>Motivo do desconto</label>
                <input className={campo} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: terra e casca" />
              </div>
            )}
            <div>
              <label className={rotulo}>Observação</label>
              <input className={campo} value={observacao} onChange={e => setObservacao(e.target.value)} />
            </div>
          </section>

          <section className="rounded-2xl bg-emerald-950 text-white p-4 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
              <span className="text-emerald-200">Sacos</span><span className="text-right font-bold">{totais.totalSacos}</span>
              <span className="text-emerald-200">Peso bruto</span><span className="text-right font-bold">{kg(totais.pesoBruto)} kg</span>
              <span className="text-emerald-200">Descontado</span><span className="text-right font-bold">{kg(totais.desconto)} kg</span>
              <span className="text-emerald-200">Peso líquido</span><span className="text-right font-bold">{kg(totais.pesoLiquido)} kg</span>
              <span className="text-emerald-200">Peso médio do saco</span><span className="text-right font-bold">{kg(totais.pesoMedio)} kg</span>
            </div>
            <div className="flex items-end justify-between pt-2 border-t border-white/15">
              <span className="text-emerald-200 text-[14px]">Valor a pagar</span>
              <span className="text-3xl font-black tabular-nums">{reais(totais.valor)}</span>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="button" onClick={limparPesagem} className="h-12 px-4 rounded-xl border border-stone-300 bg-white font-bold">Limpar</button>
            <button type="button" onClick={salvarPesagem} className={`${botao} flex-1`}>Salvar pesagem</button>
          </div>
        </div>
      )}

      {aba === 'AGRICULTORES' && (
        <div className="p-4 space-y-4">
          <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="text-[13px] font-bold text-stone-700">Novo agricultor</div>
            <input className={campo} placeholder="Nome completo" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} />
            <input className={campo} placeholder="Propriedade" value={novo.propriedade} onChange={e => setNovo({ ...novo, propriedade: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={campo} placeholder="CPF/CNPJ" inputMode="numeric" value={novo.cpf} onChange={e => setNovo({ ...novo, cpf: e.target.value })} />
              <input className={campo} placeholder="Telefone" inputMode="tel" value={novo.telefone} onChange={e => setNovo({ ...novo, telefone: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input className={`${campo} col-span-2`} placeholder="Município" value={novo.municipio} onChange={e => setNovo({ ...novo, municipio: e.target.value })} />
              <input className={campo} placeholder="UF" maxLength={2} value={novo.uf} onChange={e => setNovo({ ...novo, uf: e.target.value })} />
            </div>
            <input className={campo} placeholder="Chave Pix" value={novo.pix} onChange={e => setNovo({ ...novo, pix: e.target.value })} />
            <button type="button" onClick={salvarAgricultor} className={`${botao} w-full`}>Salvar agricultor</button>
          </section>

          <section className="bg-white rounded-2xl shadow-sm divide-y divide-stone-200">
            {agricultores.length === 0 && <div className="p-4 text-[14px] text-stone-500">Nenhum agricultor no aparelho ainda.</div>}
            {agricultores.map(a => (
              <div key={a.id} className="p-4">
                <div className="font-bold">{a.nome_completo}</div>
                <div className="text-[13px] text-stone-500">{a.nome_propriedade || 'Sem propriedade'} · {a.endereco.municipio}/{a.endereco.uf}</div>
              </div>
            ))}
          </section>
        </div>
      )}

      {aba === 'PENDENTES' && (
        <div className="p-4 space-y-3">
          {pendentes.length === 0 && <div className="bg-white rounded-2xl p-4 text-[14px] text-stone-600 shadow-sm">Tudo enviado para o sistema.</div>}
          {pendentes.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold">{p.tipo === 'PESAGEM' ? 'Pesagem' : 'Agricultor'}</span>
                <span className="text-[12px] text-stone-500">{new Date(p.criado_em).toLocaleString('pt-BR')}</span>
              </div>
              {p.tipo === 'PESAGEM' && (
                <div className="text-[13px] text-stone-600">{(p.dados as PesagemRoca).agricultor_nome} · {kg((p.dados as PesagemRoca).peso_liquido_kg)} kg</div>
              )}
              {p.ultimo_erro && <div className="mt-1 text-[12px] text-red-700">Não enviou ainda: {p.ultimo_erro}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
