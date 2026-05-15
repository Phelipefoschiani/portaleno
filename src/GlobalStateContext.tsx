import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Cliente, Produto, Pedido, Orcamento, Despesa, Comissao, Producao, User, MetaRepresentante 
} from './types';
import { supabase } from './supabaseClient';

interface GlobalStateContextType {
  clientes: Cliente[];
  produtos: Produto[];
  pedidos: Pedido[];
  orcamentos: Orcamento[];
  despesas: Despesa[];
  comissoes: Comissao[];
  producao: Producao[];
  usuarios: User[];
  metas: MetaRepresentante[];
  isLoading: boolean;
  
  // Actions
  addUsuario: (u: Omit<User, 'id'>) => void;
  updateUsuario: (id: string, u: Partial<User>) => void;
  deleteUsuario: (id: string) => void;

  addMeta: (m: Omit<MetaRepresentante, 'id'>) => void;
  updateMeta: (id: string, m: Partial<MetaRepresentante>) => void;
  deleteMeta: (id: string) => void;

  addCliente: (c: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  
  addPedido: (p: Omit<Pedido, 'id'>) => void;
  updatePedido: (id: string, p: Partial<Pedido>) => void;
  deletePedido: (id: string) => void;
  
  addOrcamento: (o: Omit<Orcamento, 'id'>) => void;
  updateOrcamento: (id: string, o: Partial<Orcamento>) => void;
  deleteOrcamento: (id: string) => void;
  
  addProducao: (p: Omit<Producao, 'id'>) => void;
  updateProducao: (id: string, p: Partial<Producao>) => void;
  deleteProducao: (id: string) => void;
  
  addDespesa: (d: Omit<Despesa, 'id'>) => void;
  updateDespesa: (id: string, d: Partial<Despesa>) => void;
  deleteDespesa: (id: string) => void;
  
  updateProduto: (id: string, p: Partial<Produto>) => void;
  addProduto: (p: Produto) => void;
  deleteProduto: (id: string) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [producao, setProducao] = useState<Producao[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<MetaRepresentante[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: clientesData },
          { data: produtosData },
          { data: pedidosData },
          { data: orcamentosData },
          { data: despesasData },
          { data: comissoesData },
          { data: producaoData },
          { data: usuariosData },
          { data: metasData }
        ] = await Promise.all([
          supabase.from('clientes').select('*'),
          supabase.from('produtos').select(`*, custos_detalhados:produtos_custos(*)`),
          supabase.from('pedidos').select(`*, items:itens_pedido(*)`),
          supabase.from('orcamentos').select(`*, items:itens_orcamento(*)`),
          supabase.from('despesas').select('*'),
          supabase.from('comissoes').select('*'),
          supabase.from('producao').select('*'),
          supabase.from('usuarios').select('*'),
          supabase.from('metas_representantes').select('*')
        ]);

        if (clientesData) setClientes(clientesData as any);
        if (produtosData) setProdutos(produtosData as any);
        if (pedidosData) setPedidos(pedidosData as any);
        if (orcamentosData) setOrcamentos(orcamentosData as any);
        if (despesasData) setDespesas(despesasData as any);
        if (comissoesData) setComissoes(comissoesData as any);
        if (producaoData) setProducao(producaoData as any);
        if (usuariosData) setUsuarios(usuariosData as any);
        if (metasData) setMetas(metasData as any);
        
      } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  };

  const addUsuario = async (u: Omit<User, 'id'>) => {
    const newUser = { ...u, id: generateId() };
    setUsuarios(prev => [...prev, newUser]);
    try {
      const { error } = await supabase.from('usuarios').insert([newUser]);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao adicionar usuário no Supabase:", err);
      alert("Erro ao salvar usuário: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    }
  };

  const updateUsuario = async (id: string, updatedFields: Partial<User>) => {
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...updatedFields } : u));
    try {
      const { error } = await supabase.from('usuarios').update(updatedFields).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar usuário no Supabase:", err);
    }
  };

  const deleteUsuario = async (id: string) => {
    setUsuarios(prev => prev.filter(u => u.id !== id));
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir usuário no Supabase:", err);
    }
  };

  const addMeta = async (m: Omit<MetaRepresentante, 'id'>) => {
    const newMeta = { ...m, id: generateId() };
    setMetas(prev => [...prev, newMeta]);
    try {
      const { error } = await supabase.from('metas_representantes').insert([newMeta]);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao adicionar meta:", err);
    }
  };

  const updateMeta = async (id: string, updatedFields: Partial<MetaRepresentante>) => {
    setMetas(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
    try {
      const { error } = await supabase.from('metas_representantes').update(updatedFields).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar meta:", err);
    }
  };

  const deleteMeta = async (id: string) => {
    setMetas(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('metas_representantes').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir meta:", err);
    }
  };

  const addCliente = async (c: Omit<Cliente, 'id'>) => {
    const newCliente = { ...c, id: generateId(), data_cadastro: new Date().toISOString().split('T')[0] };
    setClientes(prev => [...prev, newCliente]);
    try {
      const { error } = await supabase.from('clientes').insert([newCliente]);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao adicionar cliente:", err);
      alert("Erro ao gravar cliente: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    }
  };

  const updateCliente = async (id: string, updatedFields: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    try {
      const { error } = await supabase.from('clientes').update(updatedFields).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar cliente:", err);
    }
  };

  const deleteCliente = async (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
    }
  };

  const addPedido = (p: Omit<Pedido, 'id'>) => {
    const newId = generateId();
    const newPedido = { ...p, id: newId };
    setPedidos(prev => [...prev, newPedido as Pedido]);
    
    const persistPedido = async () => {
      try {
        const { items, ...dbConfig } = newPedido;
        const { error: pError } = await supabase.from('pedidos').insert([dbConfig]);
        if (pError) throw pError;

        if (items && items.length > 0) {
          const dbItems = items.map(i => ({ ...i, pedido_id: newId }));
          const { error: iError } = await supabase.from('itens_pedido').insert(dbItems);
          if (iError) throw iError;
        }
      } catch (err) {
        console.error("Erro ao persistir pedido:", err);
        alert("Erro ao gravar pedido no banco: " + (err instanceof Error ? err.message : "Erro desconhecido"));
      }
    };
    persistPedido();
    
    // Create commission if faturado
    if (p.status === 'Faturado') {
      const valorBase = p.valor_total;
      const valorComissao = valorBase * 0.05; // 5% pattern
      const newComissao: Comissao = {
        id: generateId(),
        representante_id: p.representante_id,
        pedido_id: newId,
        valor_base: valorBase,
        percentual: 5,
        valor_comissao: valorComissao,
        status: 'Prevista',
        data_prevista: new Date().toISOString().split('T')[0]
      };
      setComissoes(prev => [...prev, newComissao]);
      supabase.from('comissoes').insert([newComissao]).then(({error}) => { if(error) console.error("Erro comissao:", error); });
    }

    // Deduct stock
    p.items?.forEach(item => {
      setProdutos(prev => prev.map(prod => {
        if (prod.id === item.produto_id) {
          const newEstoque = prod.estoque_atual - item.quantidade;
          supabase.from('produtos').update({ estoque_atual: newEstoque }).eq('id', prod.id).then();
          return { ...prod, estoque_atual: newEstoque };
        }
        return prod;
      }));
    });
  };

  const updatePedido = (id: string, updatedFields: Partial<Pedido>) => {
    setPedidos(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updatedFields };
        
        const persistUpdate = async () => {
          try {
            const { items, ...dbConfig } = updatedFields;
            if (Object.keys(dbConfig).length > 0) {
              const { error: pErr } = await supabase.from('pedidos').update(dbConfig).eq('id', id);
              if (pErr) throw pErr;
            }
            if (items) {
               await supabase.from('itens_pedido').delete().eq('pedido_id', id);
               const dbItems = items.map(i => ({ ...i, pedido_id: id }));
               const { error: iErr } = await supabase.from('itens_pedido').insert(dbItems);
               if (iErr) throw iErr;
            }
          } catch (err) {
            console.error("Erro ao atualizar pedido:", err);
          }
        };
        persistUpdate();
        
        // Logical side effects
        if (updatedFields.status === 'Faturado' && p.status !== 'Faturado') {
           const valorBase = updated.valor_total;
           const valorComissao = valorBase * 0.05;
           const newCom: Comissao = {
             id: generateId(),
             representante_id: updated.representante_id,
             pedido_id: updated.id,
             nf_numero: updated.nf_numero,
             nf_serie: updated.nf_serie,
             valor_base: valorBase,
             percentual: 5,
             valor_comissao: valorComissao,
             status: 'Prevista',
             data_prevista: new Date().toISOString().split('T')[0]
           };
           setComissoes(cPrev => [...cPrev, newCom]);
           supabase.from('comissoes').insert([newCom]).then();
        }
        
        return updated;
      }
      return p;
    }));
  };

  const deletePedido = async (id: string) => {
    setPedidos(prev => prev.filter(p => p.id !== id));
    try {
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir pedido:", err);
    }
  };

  const addOrcamento = (o: Omit<Orcamento, 'id'>) => {
    const newId = generateId();
    const newOrc = { ...o, id: newId };
    setOrcamentos(prev => [...prev, newOrc as Orcamento]);
    
    const persistOrc = async () => {
      try {
        const { items, ...dbConfig } = newOrc;
        const { error: pErr } = await supabase.from('orcamentos').insert([dbConfig]);
        if (pErr) throw pErr;

        if (items && items.length > 0) {
          const dbItems = items.map(i => ({ ...i, orcamento_id: newId }));
          const { error: iErr } = await supabase.from('itens_orcamento').insert(dbItems);
          if (iErr) throw iErr;
        }
      } catch (err) {
        console.error("Erro ao gravar orcamento:", err);
      }
    };
    persistOrc();
  };

  const updateOrcamento = (id: string, updatedFields: Partial<Orcamento>) => {
    setOrcamentos(prev => prev.map(o => {
      if (o.id === id) {
        const persistUpdate = async () => {
          try {
            const { items, ...dbConfig } = updatedFields;
            if (Object.keys(dbConfig).length > 0) {
               const { error: pErr } = await supabase.from('orcamentos').update(dbConfig).eq('id', id);
               if (pErr) throw pErr;
            }
            if (items) {
               await supabase.from('itens_orcamento').delete().eq('orcamento_id', id);
               const dbItems = items.map(i => ({ ...i, orcamento_id: id }));
               const { error: iErr } = await supabase.from('itens_orcamento').insert(dbItems);
               if (iErr) throw iErr;
            }
          } catch (err) {
            console.error("Erro ao atualizar orcamento:", err);
          }
        };
        persistUpdate();
        return { ...o, ...updatedFields };
      }
      return o;
    }));
  };

  const deleteOrcamento = async (id: string) => {
    setOrcamentos(prev => prev.filter(o => o.id !== id));
    try {
      const { error } = await supabase.from('orcamentos').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir orcamento:", err);
    }
  };

  const addProducao = async (p: Omit<Producao, 'id'>) => {
    const newId = crypto.randomUUID();
    const newP = { ...p, id: newId };
    setProducao(prev => [...prev, newP]);
    try {
      const { error } = await supabase.from('producao').insert([newP]);
      if (error) throw error;
      
      // Update stock
      setProdutos(prev => prev.map(prod => {
        if (prod.id === p.produto_id) {
          const newEstoque = (prod.estoque_atual || 0) + p.quantidade_produzida;
          supabase.from('produtos').update({ estoque_atual: newEstoque }).eq('id', prod.id).then();
          return { ...prod, estoque_atual: newEstoque };
        }
        return prod;
      }));
    } catch (err) {
      console.error("Erro ao adicionar producao:", err);
      alert("Erro ao gravar produção: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    }
  };

  const updateProducao = async (id: string, updatedFields: Partial<Producao>) => {
    setProducao(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    try {
      const { error } = await supabase.from('producao').update(updatedFields).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar producao:", err);
    }
  };

  const deleteProducao = async (id: string) => {
    setProducao(prev => prev.filter(p => p.id !== id));
    try {
      const { error } = await supabase.from('producao').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir producao:", err);
    }
  };

  const addDespesa = async (d: Omit<Despesa, 'id'>) => {
    const newD = { ...d, id: generateId() };
    setDespesas(prev => [...prev, newD]);
    try {
      const { error } = await supabase.from('despesas').insert([newD]);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao adicionar despesa:", err);
    }
  };

  const updateDespesa = async (id: string, updatedFields: Partial<Despesa>) => {
    setDespesas(prev => prev.map(d => d.id === id ? { ...d, ...updatedFields } : d));
    try {
      const { error } = await supabase.from('despesas').update(updatedFields).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar despesa:", err);
    }
  };

  const deleteDespesa = async (id: string) => {
    setDespesas(prev => prev.filter(d => d.id !== id));
    try {
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir despesa:", err);
    }
  };

  const updateProduto = (id: string, updatedFields: Partial<Produto>) => {
    setProdutos(prev => prev.map(p => {
       if (p.id === id) {
          const persistUpdate = async () => {
             const { custos_detalhados, estoque_minimo, ativo, ...dbConfig } = updatedFields;
             if (Object.keys(dbConfig).length > 0) {
                const { error } = await supabase.from('produtos').update(dbConfig).eq('id', id);
                if (error) console.error("Erro ao atualizar produto:", error);
             }
             if (custos_detalhados) {
                const { error: delError } = await supabase.from('produtos_custos').delete().eq('produto_id', id);
                if (delError) console.error("Erro ao excluir custos antigos:", delError);
                
                const dbItems = custos_detalhados.map(c => {
                   const { id: cId, ...rest } = c;
                   return { 
                     ...rest, 
                     id: crypto.randomUUID(),
                     produto_id: id,
                     proporcao: rest.proporcao || 1,
                     base_calculo: rest.base_calculo || null
                   };
                });
                const { error: insError } = await supabase.from('produtos_custos').insert(dbItems);
                if (insError) console.error("Erro ao inserir novos custos:", insError);
             }
          };
          persistUpdate();
          return { ...p, ...updatedFields };
       }
       return p;
    }));
  };

  const addProduto = (p: Produto) => {
    const newId = crypto.randomUUID();
    const newP = { ...p, id: newId };
    setProdutos(prev => [...prev, newP]);
    
    const persistP = async () => {
       const { custos_detalhados, estoque_minimo, ativo, ...dbConfig } = newP;
       const { error } = await supabase.from('produtos').insert([dbConfig]);
       if (error) {
         console.error("Erro ao inserir produto:", error);
         alert("Erro ao gravar produto no banco de dados: " + error.message);
         return;
       }
       
       if (custos_detalhados && custos_detalhados.length > 0) {
          const dbItems = custos_detalhados.map(c => {
             const { id: cId, ...rest } = c;
             return { 
               ...rest, 
               id: crypto.randomUUID(),
               produto_id: newId,
               proporcao: rest.proporcao || 1,
               base_calculo: rest.base_calculo || null
             };
          });
          const { error: insError } = await supabase.from('produtos_custos').insert(dbItems);
          if (insError) console.error("Erro ao inserir custos do novo produto:", insError);
       }
    };
    persistP();
  };

  const deleteProduto = (id: string) => {
    setProdutos(prev => prev.filter(p => p.id !== id));
    supabase.from('produtos').delete().eq('id', id).then();
  };

  return (
    <GlobalStateContext.Provider value={{ 
      clientes, produtos, pedidos, orcamentos, despesas, comissoes, producao, usuarios, metas,
      addUsuario, updateUsuario, deleteUsuario,
      addMeta, updateMeta, deleteMeta,
      addCliente, updateCliente, deleteCliente,
      addPedido, updatePedido, deletePedido,
      addOrcamento, updateOrcamento, deleteOrcamento,
      addProducao, updateProducao, deleteProducao,
      addDespesa, updateDespesa, deleteDespesa,
      updateProduto, addProduto, deleteProduto
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
