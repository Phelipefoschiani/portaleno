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

export const linhaContatoEmpresa = () =>
  `${EMPRESA.endereco} · CNPJ ${EMPRESA.cnpj} · ${EMPRESA.telefone} · ${EMPRESA.email}`;
