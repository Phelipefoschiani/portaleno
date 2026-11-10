import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { obterSessao } from '../lib/auth';
import { carregarDadosEmpresa, salvarDadosEmpresa, DadosEmpresa } from '../lib/empresa';
import { mascaraCpfCnpj } from '../lib/mascarasCadastro';
import { ESTADOS_UF } from '../lib/mascarasCadastro';

// Ficha do administrador: dados da empresa que aparecem nos pedidos e documentos
export function ContaEmpresa({ onFechar }: { onFechar: () => void }) {
  const sessao = obterSessao();
  const [dados, setDados] = useState<DadosEmpresa>(() => carregarDadosEmpresa());
  const [salvo, setSalvo] = useState(false);

  const set = (campo: keyof DadosEmpresa, valor: string) => {
    setSalvo(false);
    setDados(d => ({ ...d, [campo]: valor }));
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    salvarDadosEmpresa(dados);
    setSalvo(true);
  };

  const campo = 'w-full bg-papel-2 border border-linha rounded-md px-3 py-2 text-[13px] text-tinta focus:outline-none focus:border-eno-700';
  const rotulo = 'block text-[11px] font-bold uppercase tracking-wide text-tinta-2 mb-1';

  return (
    <div className="fixed inset-0 z-[70] bg-eno-900/60 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={e => e.stopPropagation()}
        className="bg-papel w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto sm:rounded-md shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-linha sticky top-0 bg-papel z-10">
          <div>
            <h3 className="font-extrabold text-tinta text-[15px]">Dados da empresa</h3>
            <p className="text-[11.5px] text-cinza">Aparecem nos pedidos e nos documentos.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="w-10 h-10 inline-flex items-center justify-center rounded-md hover:bg-papel-3/60 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-[12px] text-tinta-2 bg-papel-2 border border-linha rounded-md px-3 py-2">
            Administrador: <strong className="text-tinta">{sessao?.nome || sessao?.usuario}</strong> · login <strong className="text-tinta">{sessao?.usuario}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>Nome fantasia</label>
              <input className={campo} value={dados.nome_fantasia || ''} onChange={e => set('nome_fantasia', e.target.value)} placeholder="Ex: GRUPO ENO" />
            </div>
            <div>
              <label className={rotulo}>Razão social</label>
              <input className={campo} value={dados.razao_social || ''} onChange={e => set('razao_social', e.target.value)} placeholder="Ex: Grupo ENO Agroindustrial Ltda" />
            </div>
            <div>
              <label className={rotulo}>CPF ou CNPJ</label>
              <input className={`${campo} tabular-nums`} inputMode="numeric" value={dados.cpf_cnpj || ''} onChange={e => set('cpf_cnpj', mascaraCpfCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className={rotulo}>Telefone</label>
              <input className={`${campo} tabular-nums`} value={dados.telefone || ''} onChange={e => set('telefone', e.target.value)} placeholder="(44) 0000-0000" />
            </div>
            <div className="sm:col-span-2">
              <label className={rotulo}>E-mail</label>
              <input className={campo} value={dados.email || ''} onChange={e => set('email', e.target.value)} placeholder="comercial@empresa.com.br" />
            </div>
          </div>

          <div className="pt-2 border-t border-linha">
            <div className="text-[11px] font-bold uppercase tracking-wide text-tinta-2 mb-2">Endereço completo</div>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div className="sm:col-span-2">
                <label className={rotulo}>CEP</label>
                <input className={`${campo} tabular-nums`} value={dados.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              </div>
              <div className="sm:col-span-4">
                <label className={rotulo}>Rua / rodovia</label>
                <input className={campo} value={dados.logradouro || ''} onChange={e => set('logradouro', e.target.value)} placeholder="Ex: Rodovia PR-482" />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Número / km</label>
                <input className={campo} value={dados.numero || ''} onChange={e => set('numero', e.target.value)} placeholder="Ex: km 14" />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Bairro</label>
                <input className={campo} value={dados.bairro || ''} onChange={e => set('bairro', e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <label className={rotulo}>Cidade</label>
                <input className={campo} value={dados.cidade || ''} onChange={e => set('cidade', e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <label className={rotulo}>UF</label>
                <select className={campo} value={dados.uf || ''} onChange={e => set('uf', e.target.value)}>
                  <option value="">--</option>
                  {ESTADOS_UF.map(({ uf, nome }) => <option key={uf} value={uf}>{uf} · {nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-linha flex items-center justify-end gap-2 sticky bottom-0 bg-papel">
          {salvo && <span className="mr-auto text-[12px] font-semibold text-eno-700">Salvo</span>}
          <button type="button" onClick={onFechar} className="px-4 py-2 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold text-[13px] cursor-pointer">Fechar</button>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-[13px] cursor-pointer">
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
