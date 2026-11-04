// Importações de arquivos tratadas pelo Vite (?inline devolve o arquivo como data URL)
declare module '*?inline' {
  const conteudo: string;
  export default conteudo;
}

// Variáveis de ambiente usadas pelo app
interface ImportMetaEnv {
  readonly VITE_MODO_NUVEM?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
