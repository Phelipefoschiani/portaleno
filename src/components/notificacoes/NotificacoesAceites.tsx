import React, { useEffect, useMemo, useState } from 'react';
import { CabecalhoPagina } from '../ui/CabecalhoPagina';
import {
  carregarClientes,
  salvarClientes,
  Cliente,
  situacaoAceite,
  CAMPOS_CONTROLE_ADMIN,
  removerRecusadosVencidos,
  PRAZO_CLIENTE_RECUSADO_DIAS,
} from '../../data/clientesData';
import { carregarPedidosVenda } from '../../data/pedidosVendaData';
import { sincronizarEspelhoClienteRca } from '../../data/cadastrosData';

// Campos mostrados na comparação (atual x proposto) de uma alteração
const CAMPOS_EXIBIDOS: [string, (c: Cliente) => string | undefined][] = [
  ['Tipo', c => (c.tipo_pessoa === 'PJ' ? 'Empresa' : 'Pessoa física')],
  ['Razão social / nome', c => c.razao_nome],
  ['Nome fantasia', c => c.fantasia],
  ['CPF / CNPJ', c => c.cpf_cnpj],
  ['IE / RG', c => c.ie_rg],
  ['E-mail', c => c.email],
  ['Telefone', c => c.telefone],
  ['CEP', c => c.endereco?.cep],
  ['Logradouro', c => c.endereco?.logradouro],
  ['Número', c => c.endereco?.numero],
  ['Bairro', c => c.endereco?.bairro],
  ['Cidade', c => c.endereco?.municipio],
  ['UF', c => c.endereco?.uf],
  ['Complemento', c => c.endereco?.complemento],
  ['Forma de pagamento', c => c.forma_pagamento_nome],
  ['Prazo', c => c.prazo_pagamento_nome],
];

const dataBR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

type Item = { cliente: Cliente; tipo: 'novo' | 'alteracao' };

const botaoPrimario = 'h-10 px-4 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-[13px] cursor-pointer';
const botaoSecundario = 'h-10 px-4 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold text-[13px] cursor-pointer';

// Aceites do administrador: cadastros novos feitos pelo RCA e alterações de clientes já aceitos
export function NotificacoesAceites() {
  const [versao, setVersao] = useState(0);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  useEffect(() => {
    const comPedido = new Set(carregarPedidosVenda().map(p => p.cliente_id));
    removerRecusadosVencidos(comPedido).forEach(id => sincronizarEspelhoClienteRca(id, undefined));
    const atualizar = () => setVersao(v => v + 1);
    window.addEventListener('clientes_updated', atualizar);
    return () => window.removeEventListener('clientes_updated', atualizar);
  }, []);

  const clientes = useMemo(() => carregarClientes(), [versao]);
  const itens: Item[] = useMemo(() => [
    ...clientes.filter(c => c.solicitacao_edicao).map(c => ({ cliente: c, tipo: 'alteracao' as const })),
    ...clientes
      .filter(c => situacaoAceite(c) === 'pendente' && !c.solicitacao_edicao)
      .map(c => ({ cliente: c, tipo: 'novo' as const })),
  ], [clientes]);

  const selecionado = itens.find(i => i.cliente.id === selecionadoId) || itens[0] || null;

  const alterarCliente = (id: string, mudar: (c: Cliente) => Cliente) => {
    const lista = carregarClientes();
    salvarClientes(lista.map(c => (c.id === id ? mudar(c) : c)));
    setSelecionadoId(null);
  };

  const aceitarNovo = (c: Cliente) =>
    alterarCliente(c.id, x => ({ ...x, aceite: 'aceito', recusado_em: undefined }));

  const recusarNovo = (c: Cliente) => {
    if (!window.confirm(`Recusar o cadastro de ${c.razao_nome}? O RCA verá como recusado e terá ${PRAZO_CLIENTE_RECUSADO_DIAS} dias para editar e reenviar.`)) return;
    alterarCliente(c.id, x => ({ ...x, aceite: 'recusado', recusado_em: new Date().toISOString() }));
  };

  const aceitarAlteracao = (c: Cliente) => {
    const proposta = c.solicitacao_edicao?.proposta;
    if (!proposta) return;
    if (!window.confirm(`Aceitar a alteração enviada pelo RCA para ${c.razao_nome}?`)) return;
    // Campos de controle do administrador (vendedor, tabela, ativo, código) não mudam pela alteração do RCA
    const aplicar = Object.fromEntries(
      Object.entries(proposta).filter(([k]) => !CAMPOS_CONTROLE_ADMIN.includes(k as keyof Cliente))
    );
    alterarCliente(c.id, x => ({ ...x, ...aplicar, solicitacao_edicao: undefined }));
  };

  const recusarAlteracao = (c: Cliente) => {
    if (!window.confirm(`Recusar a alteração de ${c.razao_nome}? O cadastro continua como está.`)) return;
    alterarCliente(c.id, x => ({ ...x, solicitacao_edicao: undefined }));
  };

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Notificações"
          resumo={itens.length === 0
            ? 'Nada aguardando o seu aceite'
            : `${itens.length} ${itens.length === 1 ? 'item aguardando' : 'itens aguardando'} o seu aceite`}
          className="!px-3 sm:!px-5"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 pb-6">
        {itens.length === 0 ? (
          <div className="mt-4 bg-papel rounded-md border border-linha p-6 text-[13px] text-cinza">
            Quando um RCA cadastrar um cliente ou pedir alteração em um cliente aceito, ele aparece aqui para você aceitar ou recusar.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start">
            <div className="bg-papel rounded-md border border-linha divide-y divide-linha">
              {itens.map(i => {
                const ativo = selecionado?.cliente.id === i.cliente.id;
                return (
                  <button
                    key={`${i.tipo}-${i.cliente.id}`}
                    type="button"
                    onClick={() => setSelecionadoId(i.cliente.id)}
                    className={`w-full text-left px-4 py-3 cursor-pointer ${ativo ? 'bg-papel-2' : 'hover:bg-papel-2/60'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[13px] text-tinta truncate">{i.cliente.razao_nome}</span>
                      <span className={`shrink-0 text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${i.tipo === 'novo' ? 'bg-st-aguardando-bg text-st-aguardando' : 'bg-eno-100 text-eno-800'}`}>
                        {i.tipo === 'novo' ? 'Novo cliente' : 'Alteração'}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-cinza">
                      RCA: {i.cliente.vendedor_nome || '—'} · {dataBR(i.tipo === 'alteracao' ? i.cliente.solicitacao_edicao?.enviado_em : i.cliente.criado_em)}
                    </div>
                  </button>
                );
              })}
            </div>

            {selecionado && (
              <div className="bg-papel rounded-md border border-linha p-5">
                <div className="pb-3 mb-3 border-b border-linha">
                  <h3 className="text-sm font-extrabold text-tinta">{selecionado.cliente.razao_nome}</h3>
                  <p className="text-[11.5px] text-cinza">
                    {selecionado.tipo === 'novo'
                      ? `Cadastro novo feito pelo RCA ${selecionado.cliente.vendedor_nome || ''} em ${dataBR(selecionado.cliente.criado_em)}.`
                      : `Alteração enviada pelo RCA ${selecionado.cliente.vendedor_nome || ''} em ${dataBR(selecionado.cliente.solicitacao_edicao?.enviado_em)}. Só vale se você aceitar.`}
                  </p>
                </div>

                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-cinza">
                      <th className="py-1 pr-2">Campo</th>
                      <th className="py-1 pr-2">{selecionado.tipo === 'alteracao' ? 'Atual' : 'Dados'}</th>
                      {selecionado.tipo === 'alteracao' && <th className="py-1">Proposto</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {CAMPOS_EXIBIDOS.map(([rotulo, ler]) => {
                      const atual = ler(selecionado.cliente) || '—';
                      const proposto = selecionado.tipo === 'alteracao'
                        ? ler(selecionado.cliente.solicitacao_edicao!.proposta) || '—'
                        : undefined;
                      const mudou = proposto !== undefined && proposto !== atual;
                      return (
                        <tr key={rotulo} className={`border-t border-linha ${mudou ? 'bg-st-aguardando-bg' : ''}`}>
                          <td className="py-1.5 pr-2 text-cinza">{rotulo}</td>
                          <td className="py-1.5 pr-2 text-tinta">{atual}</td>
                          {proposto !== undefined && <td className={`py-1.5 font-bold ${mudou ? 'text-tinta' : 'text-tinta-2'}`}>{proposto}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  {selecionado.tipo === 'novo' ? (
                    <>
                      <button type="button" onClick={() => recusarNovo(selecionado.cliente)} className={botaoSecundario}>Recusar</button>
                      <button type="button" onClick={() => aceitarNovo(selecionado.cliente)} className={botaoPrimario}>Aceitar cliente</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => recusarAlteracao(selecionado.cliente)} className={botaoSecundario}>Recusar alteração</button>
                      <button type="button" onClick={() => aceitarAlteracao(selecionado.cliente)} className={botaoPrimario}>Aceitar alteração</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
