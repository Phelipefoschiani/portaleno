// Importações de arquivos tratadas pelo Vite (?inline devolve o arquivo como data URL)
declare module '*?inline' {
  const conteudo: string;
  export default conteudo;
}
