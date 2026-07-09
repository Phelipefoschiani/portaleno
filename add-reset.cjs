const fs = require('fs');
let content = fs.readFileSync('src/GlobalStateContext.tsx', 'utf8');

const regexType = /  logEvent: \([\s\S]*?\) => void;\n\}/;
const replaceType = `  logEvent: (
    descricao: string,
    valor?: number,
    usuario_id?: string,
    usuario_nome?: string,
  ) => void;
  resetDatabase: () => Promise<void>;
}`;
content = content.replace(regexType, replaceType);

const resetFn = `
  const resetDatabase = async () => {
    setIsLoading(true);
    try {
      // Deletar os dados relacionados e principais
      // Apaga dependencias primeiro
      await supabase.from('log_eventos').delete().not('id', 'is', 'null');
      await supabase.from('metas_representante').delete().not('id', 'is', 'null');
      await supabase.from('objetivos_empresa').delete().not('ano', 'is', 'null');
      
      await supabase.from('pedidos').delete().not('id', 'is', 'null');
      await supabase.from('orcamentos').delete().not('id', 'is', 'null');
      await supabase.from('despesas').delete().not('id', 'is', 'null');
      await supabase.from('comissoes').delete().not('id', 'is', 'null');
      await supabase.from('compras_mandioca').delete().not('id', 'is', 'null');
      await supabase.from('producoes').delete().not('id', 'is', 'null');

      await supabase.from('fornecedores').delete().not('id', 'is', 'null');
      await supabase.from('produtos').delete().not('id', 'is', 'null');
      await supabase.from('clientes').delete().not('id', 'is', 'null');

      setClientes([]);
      setProdutos([]);
      setPedidos([]);
      setOrcamentos([]);
      setDespesas([]);
      setComissoes([]);
      setProducao([]);
      setFornecedores([]);
      setComprasMandioca([]);
      setEventos([]);
      setObjetivosEmpresa([]);
      setMetasRepresentantes([]);

    } catch (e) {
      console.error('Erro ao resetar: ', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
`;

content = content.replace(/  return \(\n    <GlobalStateContext\.Provider/, resetFn + '    <GlobalStateContext.Provider');
content = content.replace(/        logEvent\,\n        isLoading\,\n      \}\}/, '        logEvent,\n        resetDatabase,\n        isLoading,\n      }}');

fs.writeFileSync('src/GlobalStateContext.tsx', content);
console.log('resetDatabase added');
