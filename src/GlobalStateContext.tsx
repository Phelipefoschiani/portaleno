import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Cliente, Produto, Pedido, Orcamento, Despesa, Comissao, Producao, User, Fornecedor, CompraMandioca,
  ObjetivoEmpresa, MetaRepresentante, AppEvent
} from './types';

interface GlobalStateContextType {
  clientes: Cliente[];
  produtos: Produto[];
  pedidos: Pedido[];
  orcamentos: Orcamento[];
  despesas: Despesa[];
  comissoes: Comissao[];
  producao: Producao[];
  usuarios: User[];
  fornecedores: Fornecedor[];
  comprasMandioca: CompraMandioca[];
  eventos: AppEvent[];
  isLoading: boolean;
  
  // Metas & Objetivos
  objetivosEmpresa: ObjetivoEmpresa[];
  metasRepresentantes: MetaRepresentante[];
  saveObjetivoEmpresa: (ano: number, mes: number, valor: number) => void;
  saveMetaRepresentante: (ano: number, mes: number, representante_id: string, valor: number) => void;
  
  // Actions
  addUsuario: (u: Omit<User, 'id'>) => void;
  updateUsuario: (id: string, u: Partial<User>) => void;
  deleteUsuario: (id: string) => void;

  addCliente: (c: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  
  addFornecedor: (f: Omit<Fornecedor, 'id'>) => void;
  updateFornecedor: (id: string, f: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;

  addCompraMandioca: (c: Omit<CompraMandioca, 'id'>) => void;
  updateCompraMandioca: (id: string, c: Partial<CompraMandioca>) => void;
  deleteCompraMandioca: (id: string) => void;
  
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
  addProduto: (p: Omit<Produto, 'id'>) => void;
  deleteProduto: (id: string) => void;

  logEvent: (descricao: string, valor?: number, usuario_id?: string, usuario_nome?: string) => void;
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
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [comprasMandioca, setComprasMandioca] = useState<CompraMandioca[]>([]);
  const [eventos, setEventos] = useState<AppEvent[]>(() => {
    const cached = localStorage.getItem('app_eventos_v1');
    if (cached) return JSON.parse(cached);
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Metas & Objetivos persistent state
  const [objetivosEmpresa, setObjetivosEmpresa] = useState<ObjetivoEmpresa[]>(() => {
    const cached = localStorage.getItem('objetivos_empresa_v2');
    if (cached) return JSON.parse(cached);
    // Default goals for 2026 and 2025
    return [
      { id: 'obj_2025_1', ano: 2025, mes: 1, valor: 45000 },
      { id: 'obj_2025_2', ano: 2025, mes: 2, valor: 45000 },
      { id: 'obj_2025_3', ano: 2025, mes: 3, valor: 50000 },
      { id: 'obj_2025_4', ano: 2025, mes: 4, valor: 50000 },
      { id: 'obj_2025_5', ano: 2025, mes: 5, valor: 55000 },
      { id: 'obj_2025_6', ano: 2025, mes: 6, valor: 55000 },
      { id: 'obj_2025_7', ano: 2025, mes: 7, valor: 60000 },
      { id: 'obj_2025_8', ano: 2025, mes: 8, valor: 60000 },
      { id: 'obj_2025_9', ano: 2025, mes: 9, valor: 65000 },
      { id: 'obj_2025_10', ano: 2025, mes: 10, valor: 65000 },
      { id: 'obj_2025_11', ano: 2025, mes: 11, valor: 70000 },
      { id: 'obj_2025_12', ano: 2025, mes: 12, valor: 75000 },

      { id: 'obj_2026_1', ano: 2026, mes: 1, valor: 60000 },
      { id: 'obj_2026_2', ano: 2026, mes: 2, valor: 65000 },
      { id: 'obj_2026_3', ano: 2026, mes: 3, valor: 70000 },
      { id: 'obj_2026_4', ano: 2026, mes: 4, valor: 75000 },
      { id: 'obj_2026_5', ano: 2026, mes: 5, valor: 80000 },
      { id: 'obj_2026_6', ano: 2026, mes: 6, valor: 85000 },
      { id: 'obj_2026_7', ano: 2026, mes: 7, valor: 90000 },
      { id: 'obj_2026_8', ano: 2026, mes: 8, valor: 95000 },
      { id: 'obj_2026_9', ano: 2026, mes: 9, valor: 100000 },
      { id: 'obj_2026_10', ano: 2026, mes: 10, valor: 105000 },
      { id: 'obj_2026_11', ano: 2026, mes: 11, valor: 110000 },
      { id: 'obj_2026_12', ano: 2026, mes: 12, valor: 120000 },
    ];
  });

  const [metasRepresentantes, setMetasRepresentantes] = useState<MetaRepresentante[]>(() => {
    const cached = localStorage.getItem('metas_representantes_v2');
    if (cached) return JSON.parse(cached);
    // Splitting the Maio 2026 goal of 80,000 as default: rep1 = 40,000, rep2 = 20,000, rep3 = 20,000
    return [
      { id: 'meta_rep1_2026_5', representante_id: 'rep1', ano: 2026, mes: 5, valor: 40000 },
      { id: 'meta_rep2_2026_5', representante_id: 'rep2', ano: 2026, mes: 5, valor: 20000 },
      { id: 'meta_rep3_2026_5', representante_id: 'rep3', ano: 2026, mes: 5, valor: 20000 },
    ];
  });

  // Persists
  useEffect(() => {
    localStorage.setItem('objetivos_empresa_v2', JSON.stringify(objetivosEmpresa));
  }, [objetivosEmpresa]);

  useEffect(() => {
    localStorage.setItem('metas_representantes_v2', JSON.stringify(metasRepresentantes));
  }, [metasRepresentantes]);

  const saveObjetivoEmpresa = (ano: number, mes: number, valor: number) => {
    setObjetivosEmpresa(prev => {
      const id = `obj_${ano}_${mes}`;
      const filtered = prev.filter(o => o.id !== id);
      return [...filtered, { id, ano, mes, valor }].sort((a,b) => (a.mes - b.mes));
    });
  };

  const saveMetaRepresentante = (ano: number, mes: number, representante_id: string, valor: number) => {
    setMetasRepresentantes(prev => {
      const id = `meta_${representante_id}_${ano}_${mes}`;
      const filtered = prev.filter(m => m.id !== id);
      return [...filtered, { id, representante_id, ano, mes, valor }];
    });
  };

  useEffect(() => {
    // Carregar mock data
    const mockRep: User = { id: 'rep1', nome: 'João Rep', login: 'joao', perfil: 'representante', ativo: true, data_cadastro: '2025-01' };
    const mockRep2: User = { id: 'rep2', nome: 'Guilherme Rep', login: 'guilherme', perfil: 'representante', ativo: true, data_cadastro: '2025-01' };
    const mockRep3: User = { id: 'rep3', nome: 'Sônia Vendas', login: 'sonia', perfil: 'representante', ativo: true, data_cadastro: '2026-05' };
    const mockCli: Cliente = {
      id: 'cli1', representante_id: 'rep1', razao_social: 'Mercado Silva', nome_fantasia: 'Mercado Silva',
      cnpj_cpf: '00.000.000/0001-00', telefone: '1199999999', whatsapp: '1199999999', email: 'contato@silva.com',
      endereco: 'Rua A', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', cep: '00000-000',
      canal: 'Supermercado', categorias: ['Mercado', 'Varejo'], status: 'Liberado', data_cadastro: new Date().toISOString()
    };
    const mockProd1: Produto = {
      id: 'prod1', nome: 'Pão de Queijo 1kg', categoria: 'Congelados', unidade: 'Un', preco_base: 25.0, custo: 10.0,
      margem_pretendida: 60, estoque_atual: 100, estoque_minimo: 20, ativo: true
    };
    const mockProd2: Produto = {
      id: 'prod2', nome: 'Bolinha de Queijo 2kg', categoria: 'Congelados', unidade: 'Un', preco_base: 30.0, custo: 15.0,
      margem_pretendida: 50, estoque_atual: 50, estoque_minimo: 10, ativo: true
    };
    
    // Some are in production
    const mockPed1: Pedido = {
      id: 'ped1', representante_id: 'rep1', cliente_id: 'cli1', data: new Date().toISOString(),
      valor_total: 1000, custo_total: 400, margem: 60, status: 'Em produção',
      items: [{ produto_id: 'prod1', quantidade: 20, preco: 25 }, { produto_id: 'prod2', quantidade: 10, preco: 30 }]
    };
    const mockPed2: Pedido = {
      id: 'ped2', representante_id: 'rep1', cliente_id: 'cli1', data: new Date(Date.now() - 86400000).toISOString(),
      valor_total: 42000, custo_total: 17000, margem: 59.5, status: 'Faturado',
      items: [{ produto_id: 'prod1', quantidade: 60, preco: 25 }]
    };

    // Faturados for rep2 and rep3
    const mockPed3: Pedido = {
      id: 'ped3', representante_id: 'rep2', cliente_id: 'cli1', data: new Date().toISOString(),
      valor_total: 15400, custo_total: 6000, margem: 61.0, status: 'Faturado',
      items: [{ produto_id: 'prod1', quantidade: 30, preco: 25 }]
    };
    
    const mockPed4: Pedido = {
      id: 'ped4', representante_id: 'rep3', cliente_id: 'cli1', data: new Date().toISOString(),
      valor_total: 21200, custo_total: 8500, margem: 59.9, status: 'Faturado',
      items: [{ produto_id: 'prod2', quantidade: 50, preco: 30 }]
    };

    // Despesas fixas and variaveis
    const mockDesp1: Despesa = {
      id: 'desp1', usuario_id: '1', tipo: 'Empresa', categoria: 'Aluguel (Fixo)', data: new Date().toISOString(), vencimento: new Date().toISOString(),
      valor: 5000, forma_pagamento: 'Boleto', recorrente: true, parcelas: 1, parcelas_atual: 1, status: 'Pago', descricao: 'Aluguel do galpão'
    } as any;
    const mockDesp2: Despesa = {
      id: 'desp2', usuario_id: '1', tipo: 'Empresa', categoria: 'Energia (Variável)', data: new Date().toISOString(), vencimento: new Date().toISOString(),
      valor: 1500, forma_pagamento: 'Boleto', recorrente: false, parcelas: 1, parcelas_atual: 1, status: 'Pago', descricao: 'Conta de luz'
    } as any;
    
    const mockComissoes: Comissao[] = [
      { id: 'com1', representante_id: 'rep1', pedido_id: 'ped2', valor_base: 42000, percentual: 5, valor_comissao: 2100, status: 'Prevista', data_prevista: new Date().toISOString() }
    ];

    const saved = localStorage.getItem('grupo_eno_usuarios_v2');
    if (saved) {
      setUsuarios(JSON.parse(saved));
    } else {
      const mockRep: User = { id: 'rep1', nome: 'João Rep', login: 'joao', senha: '123', perfil: 'representante', ativo: true, data_cadastro: '2025-01' };
      const mockRep2: User = { id: 'rep2', nome: 'Guilherme Rep', login: 'guilherme', senha: '123', perfil: 'representante', ativo: true, data_cadastro: '2025-01' };
      const mockRep3: User = { id: 'rep3', nome: 'Sônia Vendas', login: 'sonia', senha: '123', perfil: 'representante', ativo: true, data_cadastro: '2026-05' };
      const initialUsers = [mockRep, mockRep2, mockRep3];
      setUsuarios(initialUsers);
      localStorage.setItem('grupo_eno_usuarios_v2', JSON.stringify(initialUsers));
    }
    setClientes([mockCli]);
    setProdutos([mockProd1, mockProd2]);
    setPedidos([mockPed1, mockPed2, mockPed3, mockPed4]);
    setDespesas([mockDesp1, mockDesp2]);
    setComissoes(mockComissoes);

    setIsLoading(false);
  }, []);

  const addUsuario = (u: Omit<User, 'id'>) => {
    const novo = { ...u, id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as User;
    setUsuarios(prev => {
      const updated = [...prev, novo];
      localStorage.setItem('grupo_eno_usuarios_v2', JSON.stringify(updated));
      return updated;
    });
  };
  const updateUsuario = (id: string, updatedFields: Partial<User>) => {
    setUsuarios(prev => {
      const updated = prev.map(u => u.id === id ? { ...u, ...updatedFields } : u);
      localStorage.setItem('grupo_eno_usuarios_v2', JSON.stringify(updated));
      return updated;
    });
  };
  const deleteUsuario = (id: string) => {
    setUsuarios(prev => {
      const updated = prev.filter(u => u.id !== id);
      localStorage.setItem('grupo_eno_usuarios_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const addCliente = (c: Omit<Cliente, 'id'>) => {
    const novo = { ...c, id: `cli_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as Cliente;
    setClientes(prev => [...prev, novo]);
  };
  const updateCliente = (id: string, updatedFields: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };
  const deleteCliente = (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    setPedidos(prev => prev.filter(p => p.cliente_id !== id));
    setOrcamentos(prev => prev.filter(o => o.cliente_id !== id));
  };

  const addPedido = (p: Omit<Pedido, 'id'>) => {
    const novo = { ...p, id: `ped_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as Pedido;
    setPedidos([...pedidos, novo]);
  };
  const updatePedido = (id: string, updatedFields: Partial<Pedido>) => {
    setPedidos(pedidos.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };
  const deletePedido = (id: string) => {
    setPedidos(prev => prev.filter(p => p.id !== id));
    setComissoes(prev => prev.filter(c => c.pedido_id !== id));
  };

  const addOrcamento = (o: Omit<Orcamento, 'id'>) => {
    const novo = { ...o, id: `orc_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as Orcamento;
    setOrcamentos([...orcamentos, novo]);
  };
  const updateOrcamento = (id: string, updatedFields: Partial<Orcamento>) => {
    setOrcamentos(orcamentos.map(o => o.id === id ? { ...o, ...updatedFields } : o));
  };
  const deleteOrcamento = (id: string) => {
    setOrcamentos(orcamentos.filter(o => o.id !== id));
  };

  const addFornecedor = (f: Omit<Fornecedor, 'id'>) => {
    const novo = { ...f, id: `forn_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as Fornecedor;
    setFornecedores(prev => [...prev, novo]);
  };
  const updateFornecedor = (id: string, updatedFields: Partial<Fornecedor>) => {
    setFornecedores(prev => prev.map(f => f.id === id ? { ...f, ...updatedFields } : f));
  };
  const deleteFornecedor = (id: string) => {
    setFornecedores(prev => prev.filter(f => f.id !== id));
    setComprasMandioca(prev => prev.filter(c => c.fornecedor_id !== id));
  };

  const addCompraMandioca = (c: Omit<CompraMandioca, 'id'>) => {
    const compId = `comp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const novo = { ...c, id: compId } as CompraMandioca;
    setComprasMandioca(prev => [...prev, novo]);

    // Automatically create a "Materia Prima" expense as "Em aberto"
    const forn = fornecedores.find(f => f.id === c.fornecedor_id);
    const fornName = forn ? forn.nome : "Fornecedor";
    const valorCompra = c.valor_total || (c.quantidade_total * (c.preco_quilo || 1.15));

    const novaDesp: Despesa = {
      id: `desp_comp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      usuario_id: '1',
      tipo: 'Empresa',
      categoria: 'Materia Prima',
      data: c.data,
      vencimento: c.data, 
      valor: valorCompra,
      forma_pagamento: 'Pix',
      recorrente: false,
      parcelas: 1,
      parcela_atual: 1,
      status: 'Em aberto',
      descricao: `Compra de Mandioca - Lote ${c.quantidade_total}kg (${fornName})`,
      tipo_despesa: 'variavel',
      compra_mandioca_id: compId
    };

    setDespesas(prev => [...prev, novaDesp]);
  };

  const updateCompraMandioca = (id: string, updatedFields: Partial<CompraMandioca>) => {
    setComprasMandioca(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updatedFields };
        // Sync status with expense if updated status is Pago
        if (updatedFields.status_pagamento === 'Pago') {
          setDespesas(despPrev => despPrev.map(d => {
            if (d.compra_mandioca_id === id) {
              return { ...d, status: 'Pago', forma_pagamento: 'Pix', data_pagamento: new Date().toISOString().split('T')[0] };
            }
            return d;
          }));
        }
        return updated;
      }
      return c;
    }));
  };

  const deleteCompraMandioca = (id: string) => {
    setComprasMandioca(prev => prev.filter(c => c.id !== id));
    // Also remove the linked expense if it's still unpaid (so we don't keep orphaned unpaid expenses)
    setDespesas(prev => prev.filter(d => !(d.compra_mandioca_id === id && d.status === 'Em aberto')));
  };



  const addProducao = (p: Omit<Producao, 'id'>) => {};
  const updateProducao = (id: string, updatedFields: Partial<Producao>) => {};
  const deleteProducao = (id: string) => {};

  const addDespesa = (d: Omit<Despesa, 'id'>) => {
    const novo = { ...d, id: `desp_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as Despesa;
    setDespesas(prev => [...prev, novo]);
  };

  const updateDespesa = (id: string, updatedFields: Partial<Despesa>) => {
    setDespesas(prev => {
      const oldDesp = prev.find(d => d.id === id);
      const updatedList = prev.map(d => d.id === id ? { ...d, ...updatedFields } : d);
      
      // If payment is registered with interest, automatically create a separate "Juros" category expense!
      if (oldDesp && updatedFields.status === 'Pago' && oldDesp.status !== 'Pago') {
        const jurosPago = updatedFields.juros_pago || 0;
        if (jurosPago > 0) {
          const dataPagamento = updatedFields.data_pagamento || new Date().toISOString().split('T')[0];
          const jurosDesp: Despesa = {
            id: `desp_juros_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            usuario_id: oldDesp.usuario_id || '1',
            tipo: oldDesp.tipo || 'Empresa',
            categoria: 'Juros',
            data: dataPagamento,
            vencimento: dataPagamento,
            valor: jurosPago,
            forma_pagamento: updatedFields.forma_pagamento || oldDesp.forma_pagamento || 'Pix',
            recorrente: false,
            parcelas: 1,
            parcela_atual: 1,
            status: 'Pago',
            descricao: `Juros pagos sobre a despesa: ${oldDesp.descricao || oldDesp.categoria} (Ref: ${oldDesp.id.substring(0,8)})`,
            tipo_despesa: 'variavel',
            data_pagamento: dataPagamento
          };
          
          return [...updatedList, jurosDesp];
        }
      }
      return updatedList;
    });
  };

  const deleteDespesa = (id: string) => {
    setDespesas(prev => prev.filter(d => d.id !== id));
  };

  const updateProduto = (id: string, updatedFields: Partial<Produto>) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };
  const addProduto = (p: Omit<Produto, 'id'>) => {
    const novo = { ...p, id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}` } as Produto;
    setProdutos(prev => [...prev, novo]);
  };
  const deleteProduto = (id: string) => {
    setProdutos(prev => prev.filter(p => p.id !== id));
  };

  const logEvent = (descricao: string, valor?: number, usuario_id?: string, usuario_nome?: string) => {
    const now = new Date();
    const newEvent: AppEvent = {
      id: Math.random().toString(36).substring(2, 9),
      data: now.toISOString().split('T')[0],
      hora: now.toTimeString().split(' ')[0],
      descricao,
      usuario_id: usuario_id || 'sys',
      usuario_nome: usuario_nome || 'Sistema',
      valor
    };
    setEventos(prev => [newEvent, ...prev]);
  };

  // Update localStorage when events change
  useEffect(() => {
    localStorage.setItem('app_eventos_v1', JSON.stringify(eventos));
  }, [eventos]);

  return (
    <GlobalStateContext.Provider value={{ 
      clientes, produtos, pedidos, orcamentos, despesas, comissoes, producao, usuarios, fornecedores, comprasMandioca, eventos,
      addUsuario, updateUsuario, deleteUsuario,
      addCliente, updateCliente, deleteCliente,
      addFornecedor, updateFornecedor, deleteFornecedor,
      addCompraMandioca, updateCompraMandioca, deleteCompraMandioca,
      addPedido, updatePedido, deletePedido,
      addOrcamento, updateOrcamento, deleteOrcamento,
      addProducao, updateProducao, deleteProducao,
      addDespesa, updateDespesa, deleteDespesa,
      updateProduto, addProduto, deleteProduto,
      objetivosEmpresa, metasRepresentantes, saveObjetivoEmpresa, saveMetaRepresentante,
      logEvent,
      isLoading
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
