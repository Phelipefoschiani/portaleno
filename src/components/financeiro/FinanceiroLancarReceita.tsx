import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, Campo, campo, FaixaFin, ListaCartoes, ItemCartao, moedaSemSimbolo, botaoLinhaExcluir } from './finUi';
import {
  LancamentoReceita,
  carregarReceitasExtras,
  salvarReceitasExtras,
  somarValores,
  formatarMoeda,
  registrarBaixaNoCaixa,
  estornarBaixaNoCaixa
} from '../../data/financeiroData';
import { hojeISO, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

const ORIGENS_RECEITA = [
  'Venda de Resíduo/Bagaço Úmido',
  'Venda de Cascas/Destopo',
  'Rendimento de Aplicação Financeira',
  'Bonificação/Reembolso',
  'Outras Receitas'
] as const;

export function FinanceiroLancarReceita({ onNavigate }: Props) {
  const ordenar = (lista: LancamentoReceita[]) => [...lista].sort((a, b) => compararDatas(b.data, a.data));
  const [receitas, setReceitas] = useState<LancamentoReceita[]>(() => ordenar(carregarReceitasExtras()));
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS');
  const [modalNovo, setModalNovo] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    data: hojeISO(),
    origem: 'Venda de Resíduo/Bagaço Úmido' as typeof ORIGENS_RECEITA[number],
    comprador_origem: '',
    descricao: '',
    valor: '',
    conta_creditada: '',
    forma_recebimento: ''
  });

  useEffect(() => {
    const handleUpdate = () => {
      setReceitas(ordenar(carregarReceitasExtras()));
    };
    handleUpdate();
    window.addEventListener('financeiro_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    return () => {
      window.removeEventListener('financeiro_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  const receitasFiltradas = receitas.filter((item) => {
    const matchBusca =
      (item.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      (item.comprador_origem || '').toLowerCase().includes(busca.toLowerCase()) ||
      (item.conta_creditada || '').toLowerCase().includes(busca.toLowerCase());
    const matchOrigem = filtroOrigem === 'TODAS' || item.origem === filtroOrigem;
    return matchBusca && matchOrigem;
  });

  // Métricas
  const totalReceitas = somarValores(receitas, r => r.valor);
  const receitasSubprodutos = somarValores(
    receitas.filter((r) => (r.origem || '').includes('Bagaço') || (r.origem || '').includes('Cascas')),
    r => r.valor
  );
  const rendimentosAplicacoes = somarValores(
    receitas.filter((r) => (r.origem || '').includes('Aplicação')),
    r => r.valor
  );

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.comprador_origem || !formData.valor) return;
    const valor = parseFloat(String(formData.valor).replace(',', '.')) || 0;
    if (valor <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    const novoLancamento: LancamentoReceita = {
      id: `rec_extra_${Date.now()}`,
      data: paraISO(formData.data) || hojeISO(),
      origem: formData.origem,
      comprador_origem: formData.comprador_origem,
      descricao: formData.descricao || `${formData.origem} - ${formData.comprador_origem}`,
      valor,
      conta_creditada: formData.conta_creditada,
      forma_recebimento: formData.forma_recebimento
    };

    const atualizadas = [novoLancamento, ...carregarReceitasExtras()];
    setReceitas(ordenar(atualizadas));
    salvarReceitasExtras(atualizadas);
    // Receita lançada já foi recebida: entra no caixa uma única vez
    registrarBaixaNoCaixa(`receita:${novoLancamento.id}`, novoLancamento.valor, { descricao: novoLancamento.descricao, data: novoLancamento.data });
    setModalNovo(false);
    setFormData({
      data: hojeISO(),
      origem: 'Venda de Resíduo/Bagaço Úmido',
      comprador_origem: '',
      descricao: '',
      valor: '',
      conta_creditada: '',
      forma_recebimento: ''
    });
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente estornar este lançamento de receita?')) {
      const atualizadas = carregarReceitasExtras().filter((r) => r.id !== id);
      setReceitas(ordenar(atualizadas));
      salvarReceitasExtras(atualizadas);
      // Estorno: retira do caixa o que esta receita havia somado
      estornarBaixaNoCaixa(`receita:${id}`);
    }
  };

  const ROTULO_CURTO: Record<string, string> = {
    'Venda de Resíduo/Bagaço Úmido': 'Bagaço úmido',
    'Venda de Cascas/Destopo': 'Cascas e destopo',
    'Rendimento de Aplicação Financeira': 'Aplicação financeira',
    'Bonificação/Reembolso': 'Bonificação e reembolso',
    'Outras Receitas': 'Outras',
  };
  const contagemOrigem = (o: string) => receitas.filter(r => r.origem === o).length;
  const vazioPorFiltro = receitas.length > 0 && receitasFiltradas.length === 0;

  const botaoNovo = (
    <BotaoPrimario onClick={() => setModalNovo(true)} className="w-full sm:w-auto h-11 sm:h-9">
      <Plus className="w-4 h-4" /> Lançar receita
    </BotaoPrimario>
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_lancar_receita" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Receitas extras"
            resumo={
              receitas.length === 0 ? 'Subprodutos, rendimentos e reembolsos que entram no caixa' : (
                <>
                  <span className="font-semibold text-tinta-2">{receitas.length} {receitas.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                  <span> · entram direto no caixa</span>
                </>
              )
            }
            acoes={receitas.length === 0 ? undefined : botaoNovo}
          />

          {receitas.length > 0 && (
            <div className="px-4 sm:px-6 pb-4">
              <FaixaFin colunas="lg:grid-cols-[1.45fr_1fr_1fr]">
                <CardNumero destaque rotulo="Total de receitas extras" unidade="R$" unidadeAntes valor={moedaSemSimbolo(totalReceitas)} />
                <CardNumero rotulo="Subprodutos" unidade="R$" unidadeAntes valor={moedaSemSimbolo(receitasSubprodutos)} detalhe="Bagaço, cascas e destopo" />
                <CardNumero rotulo="Rendimentos" unidade="R$" unidadeAntes valor={moedaSemSimbolo(rendimentosAplicacoes)} detalhe="Aplicação financeira" />
              </FaixaFin>
            </div>
          )}

          {receitas.length > 0 && (
            <BarraFiltros>
              <Segmentado<string>
                rotuloAria="Origem da receita"
                valor={filtroOrigem}
                onChange={setFiltroOrigem}
                opcoes={[
                  { valor: 'TODAS', rotulo: 'Todas', contagem: receitas.length },
                  ...ORIGENS_RECEITA.map(o => ({ valor: o as string, rotulo: ROTULO_CURTO[o] || o, contagem: contagemOrigem(o) })),
                ]}
              />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar descrição, pagador ou conta" className="w-full md:w-72 shrink-0" />
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-6">
            {receitasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio
                  titulo={vazioPorFiltro ? 'Nenhuma receita com esses filtros' : 'Nenhuma receita extra lançada'}
                  texto={vazioPorFiltro
                    ? 'Mude a origem ou a busca para ver os outros lançamentos.'
                    : 'Lance a venda de bagaço, cascas, rendimentos de aplicação e reembolsos. O valor entra no caixa na hora.'}
                  acao={vazioPorFiltro
                    ? <BotaoSecundario onClick={() => { setBusca(''); setFiltroOrigem('TODAS'); }}>Limpar filtros</BotaoSecundario>
                    : botaoNovo}
                />
              </div>
            ) : (
              <>
                <ListaCartoes>
                  {receitasFiltradas.map(item => (
                    <ItemCartao key={item.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{formatarDataBR(item.data)} · {ROTULO_CURTO[item.origem] || item.origem}</div>
                          <div className="text-[14px] font-bold text-tinta truncate">{item.comprador_origem}</div>
                          {item.descricao && <div className="text-[12px] text-cinza line-clamp-2">{item.descricao}</div>}
                        </div>
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-st-pago whitespace-nowrap">+ {formatarMoeda(item.valor)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-[12px] text-cinza truncate">{[item.conta_creditada, item.forma_recebimento].filter(Boolean).join(' · ') || 'Conta não informada'}</span>
                        <button type="button" onClick={() => handleExcluir(item.id)} className={botaoLinhaExcluir} aria-label="Estornar lançamento" title="Estornar lançamento">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </ItemCartao>
                  ))}
                </ListaCartoes>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Data</Th>
                      <Th>Origem</Th>
                      <Th>Pagador e descrição</Th>
                      <Th>Conta e forma</Th>
                      <Th numero>Valor</Th>
                      <Th className="text-right">Ação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitasFiltradas.map(item => (
                      <tr key={item.id} className={tabela.tr}>
                        <Td className="whitespace-nowrap tabular-nums">{formatarDataBR(item.data)}</Td>
                        <Td className="whitespace-nowrap">{ROTULO_CURTO[item.origem] || item.origem}</Td>
                        <Td className="max-w-[380px]">
                          <div className="font-semibold text-tinta truncate">{item.comprador_origem}</div>
                          <div className="text-[11.5px] text-cinza truncate">{item.descricao}</div>
                        </Td>
                        <Td className="max-w-[260px]">
                          <div className="truncate">{item.conta_creditada || <span className="text-cinza-claro">—</span>}</div>
                          <div className="text-[11.5px] text-cinza truncate">{item.forma_recebimento}</div>
                        </Td>
                        <Td numero><span className="font-bold text-st-pago text-[13.5px]">+ {formatarMoeda(item.valor)}</span></Td>
                        <Td className="text-right">
                          <button type="button" onClick={() => handleExcluir(item.id)} className={botaoLinhaExcluir} title="Estornar lançamento" aria-label="Estornar lançamento">
                            <Trash2 className="w-3.5 h-3.5" />
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

      {modalNovo && (
        <ModalFolha
          titulo="Lançar receita"
          subtitulo="Venda de bagaço ou casca, rendimento ou reembolso já recebido"
          onFechar={() => setModalNovo(false)}
          onSubmit={handleSalvar}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalNovo(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Salvar receita</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Origem *">
              <select value={formData.origem} onChange={e => setFormData({ ...formData, origem: e.target.value as any })} className={`${campo} cursor-pointer`}>
                {ORIGENS_RECEITA.map(orig => <option key={orig} value={orig}>{orig}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Valor recebido (R$) *">
              <input type="number" step="0.01" required inputMode="decimal" value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0,00" className={`${campo} font-semibold`} />
            </Campo>
            <Campo rotulo="Pagador ou fonte *" className="sm:col-span-2">
              <input type="text" required value={formData.comprador_origem}
                onChange={e => setFormData({ ...formData, comprador_origem: e.target.value })}
                placeholder="Confinamento Santa Luzia" className={campo} />
            </Campo>
            <Campo rotulo="Data do recebimento *">
              <input type="date" required value={paraISO(formData.data)}
                onChange={e => setFormData({ ...formData, data: e.target.value })} className={campo} />
            </Campo>
            <Campo rotulo="Forma de recebimento">
              <select value={formData.forma_recebimento} onChange={e => setFormData({ ...formData, forma_recebimento: e.target.value })} className={`${campo} cursor-pointer`}>
                <option value="PIX à Vista">PIX à Vista</option>
                <option value="Transferência TED">Transferência TED</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="Depósito em Dinheiro">Depósito em Dinheiro</option>
                <option value="Crédito em Conta">Crédito em Conta</option>
              </select>
            </Campo>
            <Campo rotulo="Conta creditada" className="sm:col-span-2">
              <select value={formData.conta_creditada} onChange={e => setFormData({ ...formData, conta_creditada: e.target.value })} className={`${campo} cursor-pointer`}>
                <option value="Banco do Brasil - Conta Movimento">Banco do Brasil - Conta Movimento (Ag. 0048 / CC 18492-1)</option>
                <option value="Itaú Unibanco - Conta Giro">Itaú Unibanco - Conta Giro (Ag. 1892 / CC 09123-5)</option>
                <option value="Sicoob Agro - Cooperativa">Sicoob Agro - Cooperativa (Ag. 4310 / CC 33019-9)</option>
                <option value="Conta Aplicação Automática">Conta Aplicação Automática (Liquidez Diária)</option>
              </select>
            </Campo>
            <Campo rotulo="Descrição" className="sm:col-span-2">
              <input type="text" value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="24 t de bagaço úmido prensado a granel" className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
