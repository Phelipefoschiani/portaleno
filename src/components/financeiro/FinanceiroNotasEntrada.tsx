import React, { useState, useEffect } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import { Plus, Copy, Check, Printer, Eye, Save } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { EMPRESA } from '../../lib/empresa';
import { ModalFolha, Campo, campo, ListaCartoes, ItemCartao, botaoLinhaSecundario } from './finUi';
import {
  NotaFiscalEntrada,
  carregarNotasEntrada,
  salvarNotasEntrada,
  numeroSeguro,
  somarValores
} from '../../data/financeiroData';
import { hojeISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';
import { ChaveAcesso } from '../ui/ChaveAcesso';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroNotasEntrada({ onNavigate }: Props) {
  const [notas, setNotas] = useState<NotaFiscalEntrada[]>([]);

  // Lê do armazenamento e acompanha atualizações feitas em outras telas (ex.: compras integradas)
  useEffect(() => {
    const recarregar = () =>
      setNotas([...carregarNotasEntrada()].sort((a, b) => compararDatas(b.data_emissao, a.data_emissao)));
    recarregar();
    window.addEventListener('financeiro_updated', recarregar);
    window.addEventListener('sistema_reset_updated', recarregar);
    return () => {
      window.removeEventListener('financeiro_updated', recarregar);
      window.removeEventListener('sistema_reset_updated', recarregar);
    };
  }, []);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'Agricultor' | 'Fornecedor'>('TODOS');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<NotaFiscalEntrada | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  // Form para nova NF-e de entrada
  const [formData, setFormData] = useState({
    numero: '',
    serie: '1',
    chave_acesso: '',
    parceiro_nome: '',
    tipo_parceiro: 'Agricultor' as 'Agricultor' | 'Fornecedor',
    cnpj_cpf: '',
    produto_descricao: '',
    peso_liquido_kg: 0,
    valor_total: 0,
    data_emissao: hojeISO()
  });

  const notasFiltradas = notas.filter(n => {
    const matchBusca = 
      String(n.numero || '').includes(busca) ||
      (n.parceiro_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (n.chave_acesso || '').includes(busca) ||
      (n.cnpj_cpf || '').includes(busca) ||
      (n.produto_descricao || '').toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'TODOS' || n.tipo_parceiro === filtroTipo;
    return matchBusca && matchTipo;
  });

  // Métricas
  const totalNotas = notas.length;
  const totalValor = somarValores(notas, n => n.valor_total);
  const totalPesoTon = (somarValores(notas, n => n.peso_liquido_kg) / 1000).toFixed(1);

  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSalvarNovaNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numero || !formData.parceiro_nome) return;

    const novaNota: NotaFiscalEntrada = {
      id: `nfe_ent_${Date.now()}`,
      numero: formData.numero,
      serie: formData.serie,
      // Sem chave informada, fica vazia: nunca inventar a chave de uma nota fiscal
      chave_acesso: (formData.chave_acesso || '').replace(/\s/g, ''),
      parceiro_nome: formData.parceiro_nome,
      tipo_parceiro: formData.tipo_parceiro,
      cnpj_cpf: formData.cnpj_cpf || '',
      produto_descricao: formData.produto_descricao,
      peso_liquido_kg: Number(formData.peso_liquido_kg) || 0,
      valor_total: Number(formData.valor_total) || 0,
      data_emissao: hojeISO(),
      status_sefaz: 'AUTORIZADA'
    };

    const atualizadas = [novaNota, ...carregarNotasEntrada()];
    setNotas(atualizadas);
    salvarNotasEntrada(atualizadas);
    setModalNovo(false);
    setFormData({
      numero: '',
      serie: '1',
      chave_acesso: '',
      parceiro_nome: '',
      tipo_parceiro: 'Agricultor',
      cnpj_cpf: '',
      produto_descricao: '',
      peso_liquido_kg: 0,
      valor_total: 0,
      data_emissao: hojeISO()
    });
  };

  const qtdAgricultor = notas.filter(n => n.tipo_parceiro === 'Agricultor').length;
  const qtdFornecedor = notas.filter(n => n.tipo_parceiro === 'Fornecedor').length;
  const ton = (kg: unknown) => (numeroSeguro(kg) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const moeda = (v: unknown) => numeroSeguro(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const autorizada = (n: NotaFiscalEntrada) => !n.status_sefaz || n.status_sefaz === 'AUTORIZADA';
  const rotuloSefaz = (n: NotaFiscalEntrada) =>
    autorizada(n) ? 'Autorizada' : String(n.status_sefaz).charAt(0) + String(n.status_sefaz).slice(1).toLowerCase();

  const botaoNovo = (
    <BotaoPrimario onClick={() => setModalNovo(true)} className="w-full sm:w-auto h-11 sm:h-9">
      <Plus className="w-4 h-4" /> Registrar nota
    </BotaoPrimario>
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_notas_entrada" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Notas de entrada"
            resumo={
              totalNotas === 0 ? 'Nenhuma nota escriturada' : (
                <>
                  <span className="font-semibold text-tinta-2">{totalNotas} {totalNotas === 1 ? 'nota escriturada' : 'notas escrituradas'}</span>
                  <span> · {totalPesoTon.replace('.', ',')} t · {moeda(totalValor)}</span>
                </>
              )
            }
            acoes={totalNotas === 0 ? undefined : botaoNovo}
          />

          {totalNotas > 0 && (
            <BarraFiltros>
              <Segmentado<'TODOS' | 'Agricultor' | 'Fornecedor'>
                rotuloAria="Origem da nota"
                valor={filtroTipo}
                onChange={setFiltroTipo}
                opcoes={[
                  { valor: 'TODOS', rotulo: 'Todas', contagem: totalNotas },
                  { valor: 'Agricultor', rotulo: 'Agricultores', contagem: qtdAgricultor },
                  { valor: 'Fornecedor', rotulo: 'Fornecedores', contagem: qtdFornecedor },
                ]}
              />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar nº, remetente, produto ou chave" className="w-full md:w-80" />
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-6">
            {notasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio
                  titulo={totalNotas === 0 ? 'Nenhuma nota de entrada' : 'Nenhuma nota com esses filtros'}
                  texto={totalNotas === 0
                    ? 'Registre aqui a NF-e de compra ou o romaneio da mandioca, lenha, embalagens e insumos que chegaram.'
                    : 'Mude a origem ou a busca para ver as outras notas.'}
                  acao={totalNotas === 0 ? botaoNovo : (
                    <BotaoSecundario onClick={() => { setBusca(''); setFiltroTipo('TODOS'); }}>Limpar filtros</BotaoSecundario>
                  )}
                />
              </div>
            ) : (
              <>
                <ListaCartoes>
                  {notasFiltradas.map(item => (
                    <ItemCartao key={item.id}>
                      <button type="button" onClick={() => setModalVisualizar(item)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums">NF-e {item.numero} · {formatarDataBR(item.data_emissao)} · {item.tipo_parceiro}</div>
                            <div className="text-[14px] font-bold text-tinta truncate">{item.parceiro_nome}</div>
                            {item.produto_descricao && <div className="text-[12px] text-cinza truncate">{item.produto_descricao}</div>}
                          </div>
                          <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta whitespace-nowrap">{moeda(item.valor_total)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[12px] text-cinza tabular-nums">{ton(item.peso_liquido_kg)} t · {numeroSeguro(item.peso_liquido_kg).toLocaleString('pt-BR')} kg</span>
                          <StatusChip tom={autorizada(item) ? 'pago' : 'vencido'}>{rotuloSefaz(item)}</StatusChip>
                        </div>
                      </button>
                    </ItemCartao>
                  ))}
                </ListaCartoes>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>NF-e</Th>
                      <Th>Remetente</Th>
                      <Th>Produto</Th>
                      <Th>Emissão</Th>
                      <Th>SEFAZ</Th>
                      <Th numero>Peso líquido</Th>
                      <Th numero>Valor</Th>
                      <Th className="text-right">Ação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {notasFiltradas.map(item => (
                      <tr key={item.id} className={`${tabela.tr} cursor-pointer`} onClick={() => setModalVisualizar(item)}>
                        <Td className="whitespace-nowrap">
                          <div className="font-semibold text-tinta tabular-nums">{item.numero}</div>
                          <div className="text-[11.5px] text-cinza">Série {item.serie}</div>
                        </Td>
                        <Td className="max-w-[280px]">
                          <div className="font-semibold text-tinta truncate">{item.parceiro_nome}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{item.tipo_parceiro} · {item.cnpj_cpf}</div>
                        </Td>
                        <Td className="max-w-[220px]"><div className="truncate">{item.produto_descricao || <span className="text-cinza-claro">—</span>}</div></Td>
                        <Td className="whitespace-nowrap tabular-nums">{formatarDataBR(item.data_emissao)}</Td>
                        <Td><StatusChip tom={autorizada(item) ? 'pago' : 'vencido'}>{rotuloSefaz(item)}</StatusChip></Td>
                        <Td numero>
                          <div className="text-tinta font-semibold">{ton(item.peso_liquido_kg)} t</div>
                          <div className="text-[11.5px] text-cinza font-normal">{numeroSeguro(item.peso_liquido_kg).toLocaleString('pt-BR')} kg</div>
                        </Td>
                        <Td numero><span className="font-bold text-tinta text-[13.5px]">{moeda(item.valor_total)}</span></Td>
                        <Td className="text-right">
                          <button type="button" onClick={e => { e.stopPropagation(); setModalVisualizar(item); }} className={botaoLinhaSecundario}>
                            <Eye className="w-3.5 h-3.5" /> Espelho
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TabelaDados>
              </>
            )}
          </div>
        </div>
      </div>

      {modalVisualizar && (
        <ModalFolha
          titulo={`NF-e de entrada ${modalVisualizar.numero}`}
          subtitulo={`Série ${modalVisualizar.serie} · emitida em ${formatarDataBR(modalVisualizar.data_emissao)}`}
          onFechar={() => setModalVisualizar(null)}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir espelho</BotaoSecundario>
              <BotaoPrimario onClick={() => setModalVisualizar(null)}>Fechar</BotaoPrimario>
            </>
          }
        >
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-3 bg-papel border border-linha rounded-md px-4 py-3.5">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Total escriturado</div>
                <div className="mt-1 text-[28px] font-extrabold tracking-[-0.02em] tabular-nums leading-none text-tinta">{moeda(modalVisualizar.valor_total)}</div>
                <div className="mt-1.5 text-[12.5px] text-cinza tabular-nums">{numeroSeguro(modalVisualizar.peso_liquido_kg).toLocaleString('pt-BR')} kg líquidos</div>
              </div>
              <StatusChip tom={autorizada(modalVisualizar) ? 'pago' : 'vencido'} className="shrink-0">{rotuloSefaz(modalVisualizar)}</StatusChip>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[13.5px]">
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Remetente · {modalVisualizar.tipo_parceiro}</dt>
                <dd className="font-semibold text-tinta break-words">{modalVisualizar.parceiro_nome}</dd>
                <dd className="text-[12px] text-cinza tabular-nums">{modalVisualizar.cnpj_cpf}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Destinatário</dt>
                <dd className="font-semibold text-tinta">{EMPRESA.razao}</dd>
                <dd className="text-[12px] text-cinza tabular-nums">CNPJ {EMPRESA.cnpj}</dd>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Produto</dt>
                <dd className="text-tinta-2">{modalVisualizar.produto_descricao || '—'}</dd>
              </div>
            </dl>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Chave de acesso</span>
                <button type="button" onClick={() => handleCopiarChave(modalVisualizar.chave_acesso, modalVisualizar.id)}
                  className="inline-flex items-center gap-1 h-10 sm:h-8 px-2.5 rounded-md text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer">
                  {copiadoId === modalVisualizar.id ? <Check className="w-3.5 h-3.5 text-st-pago" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiadoId === modalVisualizar.id ? 'Copiada' : 'Copiar'}
                </button>
              </div>
              <div className="bg-papel border border-linha rounded-md px-3 py-2.5 text-[13px] tabular-nums tracking-[0.04em] text-tinta break-all select-all">
                <ChaveAcesso chave={modalVisualizar.chave_acesso} />
              </div>
            </div>
          </div>
        </ModalFolha>
      )}

      {modalNovo && (
        <ModalFolha
          titulo="Registrar nota de entrada"
          subtitulo="NF-e de compra ou romaneio: mandioca, lenha, embalagens e insumos"
          onFechar={() => setModalNovo(false)}
          onSubmit={handleSalvarNovaNota}
          largura="sm:max-w-3xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalNovo(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Registrar nota</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Campo rotulo="Número da NF-e *" className="sm:col-span-2">
              <input type="text" required value={formData.numero}
                onChange={e => setFormData({ ...formData, numero: e.target.value })}
                placeholder="001.241" className={campo} />
            </Campo>
            <Campo rotulo="Série">
              <input type="text" value={formData.serie}
                onChange={e => setFormData({ ...formData, serie: e.target.value })} placeholder="1" className={campo} />
            </Campo>
            <Campo rotulo="Tipo de parceiro">
              <select value={formData.tipo_parceiro}
                onChange={e => setFormData({ ...formData, tipo_parceiro: e.target.value as any })}
                className={`${campo} cursor-pointer`}>
                <option value="Agricultor">Agricultor</option>
                <option value="Fornecedor">Fornecedor</option>
              </select>
            </Campo>
            <Campo rotulo="Remetente (produtor ou empresa) *" className="sm:col-span-3">
              <input type="text" required value={formData.parceiro_nome}
                onChange={e => setFormData({ ...formData, parceiro_nome: e.target.value })}
                placeholder="Sítio São José, João da Silva" className={campo} />
            </Campo>
            <Campo rotulo="CPF ou CNPJ">
              <input type="text" inputMode="numeric" value={formData.cnpj_cpf}
                onChange={e => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                placeholder="000.000.000-00" className={campo} />
            </Campo>
            <Campo rotulo="Produto" className="sm:col-span-2">
              <input type="text" value={formData.produto_descricao}
                onChange={e => setFormData({ ...formData, produto_descricao: e.target.value })}
                placeholder="Mandioca raiz in natura" className={campo} />
            </Campo>
            <Campo rotulo="Peso líquido (kg)">
              <CampoNumero min={0} ocultarZero value={formData.peso_liquido_kg}
                onChange={n => setFormData({ ...formData, peso_liquido_kg: n })}
                placeholder="28000" className={campo} />
            </Campo>
            <Campo rotulo="Valor da NF-e (R$) *">
              <CampoNumero step="0.01" min={0} casas={2} ocultarZero required value={formData.valor_total}
                onChange={n => setFormData({ ...formData, valor_total: n })}
                placeholder="16800,00" className={`${campo} font-semibold`} />
            </Campo>
            <Campo rotulo="Chave de acesso" dica="Opcional. Se ficar vazia, o sistema gera uma." className="sm:col-span-4">
              <input type="text" inputMode="numeric" value={formData.chave_acesso}
                onChange={e => setFormData({ ...formData, chave_acesso: e.target.value })}
                placeholder="44 dígitos" className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
