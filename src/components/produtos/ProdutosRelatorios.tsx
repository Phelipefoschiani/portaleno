import React, { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import { CabecalhoPagina, BotaoSecundario } from '../ui/CabecalhoPagina';
import { CardNumero } from '../ui/CardNumero';
import { Painel } from '../ui/Painel';
import { EstadoVazio } from '../ui/EstadoVazio';
import { CORES } from '../ui/tokens';
import { FaixaNumerosProdutos, TabelaResponsiva, brl } from './kitProdutos';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  carregarEstoqueProdutos,
  carregarMateriaPrima,
  carregarReceitas,
  converterQuantidade,
  ProdutoEstoque,
  MateriaPrimaEstoque
} from '../../data/produtosData';
import { hojeISO } from '../../lib/datas';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosRelatorios({ onNavigate }: Props) {
  // Dados reais do estoque (atualiza quando produtos/matérias-primas mudam)
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>(() => carregarEstoqueProdutos());
  const [materias, setMaterias] = useState<MateriaPrimaEstoque[]>(() => carregarMateriaPrima());
  useEffect(() => {
    const atualizar = () => {
      setProdutos(carregarEstoqueProdutos());
      setMaterias(carregarMateriaPrima());
    };
    window.addEventListener('produtos_updated', atualizar);
    return () => window.removeEventListener('produtos_updated', atualizar);
  }, []);

  const totalEstoqueKg = produtos.reduce((acc, p) => acc + (p.estoque_atual_kg || 0), 0);
  // Raiz in natura convertida para toneladas conforme a unidade cadastrada
  const totalRaizTon = materias
    .filter(m => m.categoria === 'Raiz In Natura')
    .reduce((acc, m) => acc + (converterQuantidade(m.estoque_atual || 0, m.unidade_medida, 'TON') || 0), 0);

  const dadosGrafico = produtos.map(p => ({
    nome: p.nome.split(' ')[0] + ' ' + (p.nome.split(' ')[1] || ''),
    estoqueTon: parseFloat((p.estoque_atual_kg / 1000).toFixed(1)),
    minimoTon: parseFloat((p.estoque_minimo_kg / 1000).toFixed(1))
  }));

  const handleExportarCsv = () => {
    const cabecalho = 'Codigo,Nome,Categoria,Embalagem,Estoque_Pacotes,Estoque_Ton,Custo_Unitario\n';
    const linhas = produtos.map(p =>
      `"${p.codigo}","${p.nome}","${p.categoria}","${p.tipo_embalagem}",${p.estoque_atual_sacos},${(p.estoque_atual_kg / 1000).toFixed(2)},${(p.custo_total || 0).toFixed(2)}`
    ).join('\n');

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_estoque_produtos_${hojeISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rendimento real das receitas: kg de produto por kg de mandioca
  const fatoresExtracao = carregarReceitas().map(r => r.kg_mandioca_por_kg_produto || 0).filter(f => f > 0);
  const extracaoMedia = fatoresExtracao.length > 0 ? 100 / (fatoresExtracao.reduce((a, b) => a + b, 0) / fatoresExtracao.length) : null;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + p.estoque_atual_sacos * (p.custo_total || 0), 0);
  const abaixoMinimo = produtos.filter(p => p.status !== 'EM_ESTOQUE').length;
  const eixo = { fontSize: 11, fill: CORES.cinza };
  const semProdutos = produtos.length === 0;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_relatorios" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Relatórios de estoque"
            resumo={
              semProdutos ? (
                'Nenhum produto acabado no estoque'
              ) : (
                <>
                  {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'} · {materias.length} matérias-primas
                  {abaixoMinimo > 0 && <span className="font-semibold text-st-aguardando"> · {abaixoMinimo} abaixo do mínimo</span>}
                </>
              )
            }
            acoes={
              <>
                <BotaoSecundario onClick={handleExportarCsv} className="flex-1 sm:flex-none h-11 sm:h-9">
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </BotaoSecundario>
                <BotaoSecundario onClick={() => window.print()} className="flex-1 sm:flex-none h-11 sm:h-9">
                  <Printer className="w-4 h-4" />
                  Imprimir
                </BotaoSecundario>
              </>
            }
          />

          <div className="px-4 sm:px-6 pb-8 space-y-5">
            <FaixaNumerosProdutos colunas={3}>
              <CardNumero
                destaque
                rotulo="Estoque acabado"
                valor={(totalEstoqueKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                unidade="t"
                detalhe={`${brl(valorTotalEstoque)} a custo`}
              />
              <CardNumero rotulo="Raiz no pátio" valor={totalRaizTon.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} unidade="t" detalhe="Autonomia de moagem" />
              <CardNumero
                rotulo="Extração média"
                valor={extracaoMedia === null ? '—' : extracaoMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                unidade={extracaoMedia === null ? undefined : '%'}
                detalhe={extracaoMedia === null ? 'Sem receitas com mandioca' : 'Rendimento médio das receitas'}
              />
            </FaixaNumerosProdutos>

            {semProdutos ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio
                  titulo="Sem produtos para comparar"
                  texto="O gráfico de estoque × mínimo e o resumo por produto aparecem quando houver produtos acabados cadastrados."
                  acao={onNavigate ? <BotaoSecundario onClick={() => onNavigate('produtos_estoque_cadastro')}>Ir para produtos acabados</BotaoSecundario> : undefined}
                />
              </div>
            ) : (
              <>
                <Painel titulo="Estoque atual × estoque mínimo" contexto="toneladas">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGrafico} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={CORES.linha} />
                        <XAxis dataKey="nome" tick={eixo} axisLine={{ stroke: CORES.linha }} tickLine={false} interval={0} />
                        <YAxis tick={eixo} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 6, border: `1px solid ${CORES.linha}`, background: CORES.papel, fontSize: 12 }}
                          cursor={{ fill: CORES.papel2 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v: any) => <span style={{ color: CORES.tinta }}>{v}</span>} />
                        <Bar dataKey="estoqueTon" name="Estoque atual (t)" fill={CORES.eno800} radius={[3, 3, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="minimoTon" name="Estoque mínimo (t)" fill={CORES.ouro} radius={[3, 3, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Painel>

                <Painel titulo="Resumo por produto" contexto="saldo e valor a custo" semPadding>
                  <TabelaResponsiva
                    semMoldura
                    colunas={[
                      { rotulo: 'Produto' },
                      { rotulo: 'Categoria' },
                      { rotulo: 'Saldo', numero: true },
                      { rotulo: 'Toneladas', numero: true },
                      { rotulo: 'Valor (custo)', numero: true },
                    ]}
                    linhas={produtos.map((p, idx) => ({
                      chave: p.id || idx,
                      celulas: [
                        p.nome,
                        p.categoria,
                        `${p.estoque_atual_sacos.toLocaleString('pt-BR')} un`,
                        `${(p.estoque_atual_kg / 1000).toLocaleString('pt-BR')} t`,
                        <span className="font-bold text-tinta">{brl(p.estoque_atual_sacos * (p.custo_total || 0))}</span>,
                      ],
                    }))}
                    rodape={
                      <div className="flex items-baseline justify-between gap-3 tabular-nums">
                        <span className="font-semibold text-tinta-2">Total</span>
                        <span className="font-bold text-tinta">
                          {(totalEstoqueKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t · {brl(valorTotalEstoque)}
                        </span>
                      </div>
                    }
                  />
                </Painel>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
