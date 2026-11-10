// Dados institucionais exibidos nos documentos (tabela de preço, pedido/orçamento)
// Logo embutido no próprio sistema (data URL): aparece no PDF mesmo sem buscar arquivo no servidor
import logoDocumentos from '../assets/images/logo_eno_documentos.png?inline';

export const EMPRESA = {
  nome: 'GRUPO ENO',
  razao: 'Grupo ENO Agroindustrial',
  subtitulo: 'Agroindústria · Fecularia & Mandioca Gourmet',
  endereco: 'Rodovia PR-482, km 14',
  cnpj: '14.882.910/0001-44',
  telefone: '(44) 3639-8200',
  email: 'comercial@grupoeno.com.br',
  logo: logoDocumentos // PNG com fundo transparente
};

export const linhaContatoEmpresa = () => {
  const e = empresaAtual();
  return `${e.endereco} · CNPJ ${e.cnpj} · ${e.telefone} · ${e.email}`;
};

// ---------- dados da empresa (editáveis; aparecem nos documentos e no cabeçalho) ----------

export interface DadosEmpresa {
  nome_fantasia?: string;
  razao_social?: string;
  cpf_cnpj?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
}

export const CHAVE_DADOS_EMPRESA = 'grupo_eno_empresa_v1';

export function carregarDadosEmpresa(): DadosEmpresa {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DADOS_EMPRESA) || '{}') || {};
  } catch {
    return {};
  }
}

export function salvarDadosEmpresa(dados: DadosEmpresa): void {
  localStorage.setItem(CHAVE_DADOS_EMPRESA, JSON.stringify(dados));
  window.dispatchEvent(new Event('empresa_updated'));
}

/** Dados da empresa para os documentos: o que foi preenchido, senão o padrão do sistema. */
export function empresaAtual() {
  const d = carregarDadosEmpresa();
  const cidadeUf = [d.cidade, d.uf].filter(Boolean).join('/');
  const endereco = d.logradouro
    ? [d.logradouro, d.numero, d.bairro, cidadeUf, d.cep ? `CEP ${d.cep}` : ''].filter(Boolean).join(', ')
    : EMPRESA.endereco;
  return {
    nome: d.nome_fantasia || EMPRESA.nome,
    razao: d.razao_social || EMPRESA.razao,
    subtitulo: EMPRESA.subtitulo,
    endereco,
    cnpj: d.cpf_cnpj || EMPRESA.cnpj,
    telefone: d.telefone || EMPRESA.telefone,
    email: d.email || EMPRESA.email,
    logo: EMPRESA.logo,
  };
}
