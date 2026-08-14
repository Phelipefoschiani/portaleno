import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Cliente,
  Produto,
  Pedido,
  Orcamento,
  Despesa,
  Comissao,
  Producao,
  User,
  Fornecedor,
  CompraMandioca,
  ObjetivoEmpresa,
  MetaRepresentante,
  AppEvent,
} from "./types";
import { supabase } from "./supabase";

interface GlobalStateContextType {
  clientes: Cliente[];
  clientesEmpana: Cliente[];
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

  objetivosEmpresa: ObjetivoEmpresa[];
  metasRepresentantes: MetaRepresentante[];
  saveObjetivoEmpresa: (ano: number, mes: number, valor: number) => void;
  saveMetaRepresentante: (
    ano: number,
    mes: number,
    representante_id: string,
    valor: number,
  ) => void;

  addUsuario: (u: Omit<User, "id">) => void;
  updateUsuario: (id: string, u: Partial<User>) => void;
  deleteUsuario: (id: string) => void;

  addCliente: (c: Omit<Cliente, "id">) => void;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  addClienteEmpana: (c: Omit<Cliente, "id">) => void;
  updateClienteEmpana: (id: string, c: Partial<Cliente>) => void;
  deleteClienteEmpana: (id: string) => void;

  addFornecedor: (f: Omit<Fornecedor, "id">) => void;
  updateFornecedor: (id: string, f: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;

  addCompraMandioca: (c: Omit<CompraMandioca, "id">) => void;
  updateCompraMandioca: (id: string, c: Partial<CompraMandioca>) => void;
  deleteCompraMandioca: (id: string) => void;

  addPedido: (p: Omit<Pedido, "id">) => Promise<boolean>;
  updatePedido: (id: string, p: Partial<Pedido>) => Promise<boolean>;
  deletePedido: (id: string) => Promise<boolean>;

  addOrcamento: (o: Omit<Orcamento, "id">) => Promise<boolean>;
  updateOrcamento: (id: string, o: Partial<Orcamento>) => Promise<boolean>;
  deleteOrcamento: (id: string) => Promise<boolean>;

  addProducao: (p: Omit<Producao, "id">) => void;
  updateProducao: (id: string, p: Partial<Producao>) => void;
  deleteProducao: (id: string) => void;

  addDespesa: (d: Omit<Despesa, "id">) => void;
  updateDespesa: (id: string, d: Partial<Despesa>) => void;
  deleteDespesa: (id: string) => void;

  updateProduto: (id: string, p: Partial<Produto>) => void;
  addProduto: (p: Omit<Produto, "id">) => void;
  deleteProduto: (id: string) => void;

  logEvent: (
    descricao: string,
    valor?: number,
    usuario_id?: string,
    usuario_nome?: string,
  ) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined,
);

export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesEmpana, setClientesEmpana] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [producao, setProducao] = useState<Producao[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [comprasMandioca, setComprasMandioca] = useState<CompraMandioca[]>([]);
  const [eventos, setEventos] = useState<AppEvent[]>([]);
  const [objetivosEmpresa, setObjetivosEmpresa] = useState<ObjetivoEmpresa[]>(
    [],
  );
  const [metasRepresentantes, setMetasRepresentantes] = useState<
    MetaRepresentante[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const [
          { data: qUsuarios, error: eUsuarios },
          { data: qClientes, error: eClientes },
          { data: qProdutos, error: eProdutos },
          { data: qFornecedores, error: eFornecedores },
          { data: qCompras, error: eCompras },
          { data: qPedidos, error: ePedidos },
          { data: qOrcamentos, error: eOrcamentos },
          { data: qDespesas, error: eDespesas },
          { data: qProducoes, error: eProducoes },
          { data: qComissoes, error: eComissoes },
          { data: qObjetivos, error: eObjetivos },
          { data: qMetas, error: eMetas },
          { data: qEventos, error: eEventos },
          { data: qClientesEmpana, error: eClientesEmpana }
        ] = await Promise.all([
          supabase.from("usuarios").select("*").limit(10000),
          supabase.from("clientes").select("*").limit(10000),
          supabase.from("produtos").select("*, custos_detalhados:custos_diferenciados(*)").limit(10000),
          supabase.from("fornecedores").select("*").limit(10000),
          supabase.from("compras_mandioca").select("*, pesagens_sacos:pesagens_mandioca(peso_kg)").limit(10000),
          supabase.from("pedidos").select("*, items:itens_pedido(*), solicitacoes_insumos:solicitacoes_insumo(*)").limit(10000),
          supabase.from("orcamentos").select("*, items:itens_orcamento(*)").limit(10000),
          supabase.from("despesas").select("*").limit(10000),
          supabase.from("producoes").select("*").limit(10000),
          supabase.from("comissoes").select("*").limit(10000),
          supabase.from("objetivos_empresa").select("*").limit(10000),
          supabase.from("metas_representante").select("*").limit(10000),
          supabase.from("log_eventos").select("*").order("data", { ascending: false }).limit(200),
          supabase.from("clientes_empana").select("*").limit(10000)
        ]);

        if (eUsuarios) console.error("Erro usuarios:", eUsuarios);
        if (eClientes) console.error("Erro clientes:", eClientes);
        if (eClientesEmpana) console.error("Erro clientes empana:", eClientesEmpana);
        if (eProdutos) console.error("Erro produtos:", eProdutos);
        if (eFornecedores) console.error("Erro fornecedores:", eFornecedores);
        if (eCompras) console.error("Erro compras:", eCompras);
        if (ePedidos) console.error("Erro pedidos:", ePedidos);
        if (eOrcamentos) console.error("Erro orçamentos:", eOrcamentos);
        if (eDespesas) console.error("Erro despesas:", eDespesas);
        if (eProducoes) console.error("Erro producoes:", eProducoes);
        if (eComissoes) console.error("Erro comissoes:", eComissoes);
        if (eObjetivos) console.error("Erro objetivos:", eObjetivos);
        if (eMetas) console.error("Erro metas:", eMetas);
        if (eEventos) console.error("Erro eventos:", eEventos);

        if (qUsuarios) setUsuarios(qUsuarios as User[]);
        if (qClientes) setClientes(qClientes as Cliente[]);
        if (qClientesEmpana) setClientesEmpana(qClientesEmpana as Cliente[]);
        if (qProdutos) setProdutos(qProdutos as Produto[]);
        if (qFornecedores) setFornecedores(qFornecedores as Fornecedor[]);
        if (qDespesas) setDespesas(qDespesas as Despesa[]);
        if (qProducoes) setProducao(qProducoes as Producao[]);
        if (qComissoes) setComissoes(qComissoes as Comissao[]);
        if (qObjetivos) setObjetivosEmpresa(qObjetivos as ObjetivoEmpresa[]);
        if (qMetas) setMetasRepresentantes(qMetas as MetaRepresentante[]);
        if (qEventos) setEventos(qEventos as AppEvent[]);

        if (qCompras) {
          setComprasMandioca(
            qCompras.map((c) => {
              let realStatus = c.status_pagamento || 'Pendente';
              let linkedOrdemId = undefined;
              if (realStatus.includes('_vinc_')) {
                const parts = realStatus.split('_vinc_');
                realStatus = parts[0];
                linkedOrdemId = parts[1];
              }
              return {
                ...c,
                status_pagamento: realStatus,
                ordem_compra_id: linkedOrdemId,
                pesagens_sacos: c.pesagens_sacos?.map((p: any) => p.peso_kg) || [],
              };
            }),
          );
        }

        if (qPedidos) setPedidos(qPedidos as Pedido[]);
        if (qOrcamentos) setOrcamentos(qOrcamentos as unknown as Orcamento[]);
      } catch (err) {
        console.error("Erro fatal no fetchData:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveObjetivoEmpresa = async (
    ano: number,
    mes: number,
    valor: number,
  ) => {
    // Delete old
    await supabase
      .from("objetivos_empresa")
      .delete()
      .eq("ano", ano)
      .eq("mes", mes);
    // Insert new
    const { data } = await supabase
      .from("objetivos_empresa")
      .insert([{ ano, mes, valor }])
      .select()
      .single();
    if (data) {
      setObjetivosEmpresa((prev) => {
        const filtered = prev.filter((o) => !(o.ano === ano && o.mes === mes));
        return [...filtered, data].sort((a, b) => a.mes - b.mes);
      });
    }
  };

  const saveMetaRepresentante = async (
    ano: number,
    mes: number,
    representante_id: string,
    valor: number,
  ) => {
    await supabase
      .from("metas_representante")
      .delete()
      .eq("ano", ano)
      .eq("mes", mes)
      .eq("representante_id", representante_id);
    const { data } = await supabase
      .from("metas_representante")
      .insert([{ ano, mes, representante_id, valor }])
      .select()
      .single();
    if (data) {
      setMetasRepresentantes((prev) => {
        const filtered = prev.filter(
          (m) =>
            !(
              m.ano === ano &&
              m.mes === mes &&
              m.representante_id === representante_id
            ),
        );
        return [...filtered, data];
      });
    }
  };

  const addUsuario = async (u: Omit<User, "id">) => {
    const { data, error } = await supabase
      .from("usuarios")
      .insert([u])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar usuário:", error);
      alert("Erro ao adicionar usuário: " + error.message);
    }
    if (data) { setUsuarios((prev) => [...prev, data]); logEvent(`Adicionou usuário: ${u.nome}`); }
  };
  const updateUsuario = async (id: string, updatedFields: Partial<User>) => {
    const { data } = await supabase
      .from("usuarios")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();
    if (data) { setUsuarios((prev) => prev.map((u) => (u.id === id ? data : u))); logEvent(`Atualizou usuário: ${updatedFields.nome || "Usuário"}`); }
  };
  const deleteUsuario = async (id: string) => {
    const u = usuarios.find(x => x.id === id);
    if(u) logEvent(`Excluiu usuário: ${u.nome}`);
    await supabase.from("usuarios").delete().eq("id", id);
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  };

  const addCliente = async (c: Omit<Cliente, "id">) => {
    const payload = { ...c };
    if ((payload as any).representante_id === "") (payload as any).representante_id = null;
    
    const { data, error } = await supabase
      .from("clientes")
      .insert([payload])
      .select()
      .single();
      
    if (error) {
      console.error("Erro ao adicionar cliente:", error);
      alert("Erro ao adicionar cliente: " + error.message);
    }
    if (data) { setClientes((prev) => [...prev, data]); logEvent(`Adicionou cliente: ${payload.nome_fantasia || payload.razao_social}`); }
  };
  const updateCliente = async (id: string, updatedFields: Partial<Cliente>) => {
    const payload = { ...updatedFields };
    if ((payload as any).representante_id === "") (payload as any).representante_id = null;

    const { data } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      logEvent(`Atualizou configuração do cliente: ${(payload as any).razao_social || "Cliente"}`);
      setClientes((prev) => prev.map((c) => (c.id === id ? data : c)));
    }
  };
  const deleteCliente = async (id: string) => {
    const c = clientes.find(x => x.id === id);
    if(c) logEvent(`Excluiu cliente: ${c.nome_fantasia || c.razao_social}`);
    await supabase.from("clientes").delete().eq("id", id);
    setClientes((prev) => prev.filter((c) => c.id !== id));
    setPedidos((prev) => prev.filter((p) => p.cliente_id !== id));
    setOrcamentos((prev) => prev.filter((o) => o.cliente_id !== id));
  };

  const addClienteEmpana = async (c: Omit<Cliente, "id">) => {
    const payload = { ...c };
    if ((payload as any).representante_id === "") (payload as any).representante_id = null;
    const { data, error } = await supabase.from("clientes_empana").insert([payload]).select().single();
    if (error) {
      console.error("Erro ao adicionar cliente empana:", error);
      alert("Erro ao adicionar cliente empana: " + error.message);
    }
    if (data) { setClientesEmpana((prev) => [...prev, data]); logEvent(`Adicionou cliente RCA: ${payload.nome_fantasia || payload.razao_social}`); }
  };

  const updateClienteEmpana = async (id: string, updatedFields: Partial<Cliente>) => {
    const payload = { ...updatedFields };
    if ((payload as any).representante_id === "") (payload as any).representante_id = null;
    const { data, error } = await supabase.from("clientes_empana").update(payload).eq("id", id).select().single();
    if (error) {
      console.error("Erro ao atualizar cliente empana:", error);
    }
    if (data) {
      logEvent(`Atualizou cliente RCA: ${(payload as any).razao_social || "Cliente"}`);
      setClientesEmpana((prev) => prev.map((c) => (c.id === id ? data : c)));
    }
  };

  const deleteClienteEmpana = async (id: string) => {
    const c = clientesEmpana.find(x => x.id === id);
    if(c) logEvent(`Excluiu cliente RCA: ${c.nome_fantasia || c.razao_social}`);
    await supabase.from("clientes_empana").delete().eq("id", id);
    setClientesEmpana((prev) => prev.filter((c) => c.id !== id));
  };

  const addPedido = async (p: Omit<Pedido, "id">) => {
    const { items, solicitacoes_insumos, ...rest } = p;
    const payload = { ...rest };
    
    // Clean up empty strings
    Object.keys(payload).forEach(key => {
      if ((payload as any)[key] === "") {
        (payload as any)[key] = null;
      }
    });

    // Map `condicao_pagamento` & `prazo_entrega` which don't exist in `pedidos` table
    if ((payload as any).condicao_pagamento) {
      if (!(payload as any).forma_pagamento_nf) {
        (payload as any).forma_pagamento_nf = (payload as any).condicao_pagamento;
      }
    }
    
    // Handle data_vencimento and prazo_entrega which don't exist natively
    const extraObs: string[] = [];
    if ((payload as any).data_vencimento) {
      extraObs.push(`Vencimento: ${new Date((payload as any).data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`);
    }
    if ((payload as any).prazo_entrega) {
      const pe = (payload as any).prazo_entrega; if (/^\d{4}-\d{2}-\d{2}/.test(pe)) { extraObs.push(`Prazo de Entrega: ${new Date(pe).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`); } else { extraObs.push(`Prazo de Entrega: ${pe}`); }
    }

    if (extraObs.length > 0) {
      const obs = (payload as any).observacoes || '';
      (payload as any).observacoes = `${extraObs.join(' | ')}\n${obs}`;
    }

    // Prevent sending invalid timestamp
    const prevDateVal = (payload as any).previsao_entrega;
    if (prevDateVal) {
      const parsed = Date.parse(prevDateVal);
      if (isNaN(parsed) || !/^\d{4}-\d{2}-\d{2}/.test(prevDateVal)) {
        (payload as any).previsao_entrega = null;
      }
    }

    delete (payload as any).condicao_pagamento;
    delete (payload as any).prazo_entrega;
    delete (payload as any).data_vencimento;

    const { data, error } = await supabase
      .from("pedidos")
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar pedido:", error);
      alert("Erro ao adicionar pedido: " + error.message);
      return false;
    }
    if (data) {
      const insertedPedido = {
        ...data,
        items: [],
        solicitacoes_insumos: [], // Ensure key matches join and interface
      } as any;
      if (items && items.length > 0) {
        // Remove temporary ID and map to table
        const mappedItems = items.map(({ id, orcamento_id, ...it }: any) => ({ ...it, pedido_id: data.id }));
        const { data: itemData, error: itemError } = await supabase
          .from("itens_pedido")
          .insert(mappedItems)
          .select();
        
        if (itemError) {
          console.error("Erro ao inserir itens do pedido:", itemError);
        }
        if (itemData) insertedPedido.items = itemData;
      }
      if (solicitacoes_insumos && solicitacoes_insumos.length > 0) {
        const mapped = solicitacoes_insumos.map(({ id, ...s }: any) => ({
          ...s,
          pedido_id: data.id,
        }));
        const { data: reqData, error: reqError } = await supabase
          .from("solicitacoes_insumo")
          .insert(mapped)
          .select();
        
        if (reqError) {
          console.error("Erro ao inserir solicitações de insumo:", reqError);
        }
        if (reqData) insertedPedido.solicitacoes_insumos = reqData;
      }
      setPedidos((prev) => [...prev, insertedPedido]);
      logEvent(`Adicionou novo pedido.`, insertedPedido.valor_total);
      return true;
    }
    return false;
  };

  const updatePedido = async (id: string, updatedFields: Partial<Pedido>) => {
    const { items, solicitacoes_insumos, ...rest } = updatedFields;
    const oldPedido = pedidos.find((p) => p.id === id);
    if (!oldPedido) return;

    if (Object.keys(rest).length > 0) {
      const payload = { ...rest };
      
      // Clean up empty strings
      Object.keys(payload).forEach(key => {
        if ((payload as any)[key] === "") {
          (payload as any)[key] = null;
        }
      });

      if ((payload as any).condicao_pagamento) {
        if (!(payload as any).forma_pagamento_nf) {
          (payload as any).forma_pagamento_nf = (payload as any).condicao_pagamento;
        }
      }

      const extraObs: string[] = [];
      if ((payload as any).data_vencimento) {
        extraObs.push(`Vencimento: ${new Date((payload as any).data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`);
      }
      if ((payload as any).prazo_entrega) {
        const pe = (payload as any).prazo_entrega; if (/^\d{4}-\d{2}-\d{2}/.test(pe)) { extraObs.push(`Prazo de Entrega: ${new Date(pe).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`); } else { extraObs.push(`Prazo de Entrega: ${pe}`); }
      }

      if (extraObs.length > 0) {
        const obs = (payload as any).observacoes || '';
        (payload as any).observacoes = `${extraObs.join(' | ')}\n${obs}`;
      }

      // Prevent sending invalid timestamp
      const prevDateVal = (payload as any).previsao_entrega;
      if (prevDateVal) {
        const parsed = Date.parse(prevDateVal);
        if (isNaN(parsed) || !/^\d{4}-\d{2}-\d{2}/.test(prevDateVal)) {
          (payload as any).previsao_entrega = null;
        }
      }

      delete (payload as any).condicao_pagamento;
      delete (payload as any).prazo_entrega;
      delete (payload as any).data_vencimento;

      await supabase.from("pedidos").update(payload).eq("id", id);
    }

    let updatedItems = oldPedido.items;
    if (items) {
      await supabase.from("itens_pedido").delete().eq("pedido_id", id);
      const mappedItems = items.map((it) => {
        const { id: _, orcamento_id, ...noIdIt } = it as any;
        return { ...noIdIt, pedido_id: id };
      });
      const { data: newItems } = await supabase
        .from("itens_pedido")
        .insert(mappedItems)
        .select();
      if (newItems) updatedItems = newItems;
    }

    const pName = items ? "Itens do Pedido" : "Detalhes do Pedido";
    logEvent(`Atualizou pedido.`, (rest as any).valor_total);
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...rest, items: updatedItems } : p,
      ),
    );
  };

  const deletePedido = async (id: string) => {
    const ped = pedidos.find(p => p.id === id);
    if(ped) {
      logEvent(`Excluiu pedido.`, ped.valor_total);
      
      let orcamentoIdToRevert = null;
      if (ped.observacoes) {
        const match = ped.observacoes.match(/\[OrcamentoID:([a-fA-F0-9-]{36})\]/);
        if (match && match[1]) {
          orcamentoIdToRevert = match[1];
        }
      }

      if (!orcamentoIdToRevert) {
        // Fallback: find any Orçamento with status "Convertido em Pedido" matching client and valor_total
        const matchingOrcamento = orcamentos.find(o => 
          o.status === "Convertido em Pedido" && 
          o.cliente_id === ped.cliente_id && 
          Math.abs(Number(o.valor_total) - Number(ped.valor_total)) < 0.01
        );
        if (matchingOrcamento) {
          orcamentoIdToRevert = matchingOrcamento.id;
        }
      }

      if (orcamentoIdToRevert) {
        await supabase.from("orcamentos").update({ status: "Orçamento" }).eq("id", orcamentoIdToRevert);
        setOrcamentos((prev) =>
          prev.map((o) =>
            o.id === orcamentoIdToRevert ? { ...o, status: "Orçamento" } : o
          )
        );
      }
    }
    await supabase.from("pedidos").delete().eq("id", id);
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    setComissoes((prev) => prev.filter((c) => c.pedido_id !== id));
  };

  const addOrcamento = async (o: Omit<Orcamento, "id">) => {
    const { items, ...rest } = o;
    // Fix empty strings for UUID and timestamp fields
    const payload = { ...rest };
    Object.keys(payload).forEach(key => {
      if ((payload as any)[key] === "") {
        (payload as any)[key] = null;
      }
    });

    // Handle data_vencimento and prazo_entrega which don't exist natively
    const extraObs: string[] = [];
    if ((payload as any).data_vencimento) {
      extraObs.push(`Vencimento: ${new Date((payload as any).data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`);
    }
    if ((payload as any).prazo_entrega) {
      const pe = (payload as any).prazo_entrega; if (/^\d{4}-\d{2}-\d{2}/.test(pe)) { extraObs.push(`Prazo de Entrega: ${new Date(pe).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`); } else { extraObs.push(`Prazo de Entrega: ${pe}`); }
    }

    if (extraObs.length > 0) {
      const obs = (payload as any).observacoes || '';
      (payload as any).observacoes = `${extraObs.join(' | ')}\n${obs}`;
    }

    delete (payload as any).prazo_entrega;
    delete (payload as any).data_vencimento;

    const { data, error } = await supabase
      .from("orcamentos")
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar orçamento:", error);
      alert("Erro ao adicionar orçamento: " + error.message);
      return false;
    }
    if (data) {
      const inserted = { ...data, items: [] } as any;
      if (items && items.length > 0) {
        // Remove temporary ID and map to table
        const mappedItems = items.map(({ id, pedido_id, ...it }: any) => ({
          ...it,
          orcamento_id: data.id,
        }));
        const { data: itemData, error: itemError } = await supabase
          .from("itens_orcamento")
          .insert(mappedItems)
          .select();
        
        if (itemError) {
          console.error("Erro ao inserir itens do orçamento:", itemError);
        }
        if (itemData) inserted.items = itemData;
      }
      logEvent(`Adicionou novo orçamento.`, inserted.valor_total);
      setOrcamentos((prev) => [...prev, inserted]);
      return true;
    }
    return false;
  };

  const updateOrcamento = async (
    id: string,
    updatedFields: Partial<Orcamento>,
  ) => {
    const { items, ...rest } = updatedFields;
    const oldOrcamento = orcamentos.find((o) => o.id === id);
    if (!oldOrcamento) return;

    if (Object.keys(rest).length > 0) {
      const payload = { ...rest };
      Object.keys(payload).forEach(key => {
        if ((payload as any)[key] === "") {
          (payload as any)[key] = null;
        }
      });

      // Handle fields that don't exist in the DB table
      const extraObs: string[] = [];
      if ((payload as any).data_vencimento) {
        extraObs.push(`Vencimento: ${new Date((payload as any).data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`);
      }
      if ((payload as any).prazo_entrega) {
        const pe = (payload as any).prazo_entrega; if (/^\d{4}-\d{2}-\d{2}/.test(pe)) { extraObs.push(`Prazo de Entrega: ${new Date(pe).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`); } else { extraObs.push(`Prazo de Entrega: ${pe}`); }
      }

      if (extraObs.length > 0) {
        const obs = (payload as any).observacoes || '';
        (payload as any).observacoes = `${extraObs.join(' | ')}\n${obs}`;
      }

      delete (payload as any).prazo_entrega;
      delete (payload as any).data_vencimento;

      await supabase.from("orcamentos").update(payload).eq("id", id);
    }

    let updatedItems = oldOrcamento.items;
    if (items) {
      await supabase.from("itens_orcamento").delete().eq("orcamento_id", id);
      const mappedItems = items.map((it) => {
        const { id: _, pedido_id, ...noIdIt } = it as any;
        return { ...noIdIt, orcamento_id: id };
      });
      const { data: newItems } = await supabase
        .from("itens_orcamento")
        .insert(mappedItems)
        .select();
      if (newItems) updatedItems = newItems as any;
    }

    setOrcamentos((prev) => prev.map((o) => o.id === id ? { ...o, ...rest, items: updatedItems } : o)); logEvent(`Atualizou orçamento`, (rest as any).valor_total); };

  const deleteOrcamento = async (id: string) => {
    const obj = orcamentos.find(o => o.id === id);
    if(obj) logEvent(`Excluiu orçamento.`, obj.valor_total);
    await supabase.from("orcamentos").delete().eq("id", id);
    setOrcamentos((prev) => prev.filter((o) => o.id !== id));
    const orc = orcamentos.find(x => x.id === id);
    logEvent(`Excluiu orçamento`, orc?.valor_total);
  };

  const addFornecedor = async (f: Omit<Fornecedor, "id">) => {
    const { data, error } = await supabase
      .from("fornecedores")
      .insert([f])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar fornecedor:", error);
      alert("Erro ao adicionar fornecedor: " + error.message);
    }
    if (data) { setFornecedores((prev) => [...prev, data]); logEvent(`Adicionou fornecedor: ${data.nome || 'Fornecedor'}`); }
  };
  const updateFornecedor = async (
    id: string,
    updatedFields: Partial<Fornecedor>,
  ) => {
    const { data } = await supabase
      .from("fornecedores")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      setFornecedores((prev) => prev.map((f) => (f.id === id ? data : f)));
      logEvent(`Atualizou fornecedor: ${updatedFields.nome || 'Fornecedor'}`);
    }
  };
  const deleteFornecedor = async (id: string) => {
    const forn = fornecedores.find(x => x.id === id); if(forn) logEvent(`Excluiu fornecedor: ${forn.nome || 'Fornecedor'}`); await supabase.from("fornecedores").delete().eq("id", id); setFornecedores((prev) => prev.filter((f) => f.id !== id));
    setComprasMandioca((prev) => prev.filter((c) => c.fornecedor_id !== id));
  };

  const addCompraMandioca = async (c: Omit<CompraMandioca, "id">) => {
    const { pesagens_sacos, ...rest } = c;
    if ((rest as any).fornecedor_id === "") (rest as any).fornecedor_id = null;
    
    // Serialize ordem_compra_id into status_pagamento to avoid DB errors due to missing columns
    if ((rest as any).ordem_compra_id) {
      (rest as any).status_pagamento = `${rest.status_pagamento}_vinc_${(rest as any).ordem_compra_id}`;
    }
    delete (rest as any).ordem_compra_id;

    const { data, error } = await supabase
      .from("compras_mandioca")
      .insert([rest])
      .select()
      .single();

    if (error) {
      console.error("Erro ao adicionar compra:", error);
      alert("Erro ao adicionar compra: " + error.message);
    }

    if (data) {
      let realStatus = data.status_pagamento || 'Pendente';
      let linkedOrdemId = undefined;
      if (realStatus.includes('_vinc_')) {
        const parts = realStatus.split('_vinc_');
        realStatus = parts[0];
        linkedOrdemId = parts[1];
      }
      const compData = { 
        ...data, 
        status_pagamento: realStatus,
        ordem_compra_id: linkedOrdemId,
        pesagens_sacos: [] 
      } as any;
      if (pesagens_sacos && pesagens_sacos.length > 0) {
        const peds = pesagens_sacos.map((p) => ({
          compra_id: data.id,
          peso_kg: p,
        }));
        const { data: dp } = await supabase
          .from("pesagens_mandioca")
          .insert(peds)
          .select();
        if (dp) compData.pesagens_sacos = dp.map((x: any) => x.peso_kg);
      }
      setComprasMandioca((prev) => [...prev, compData]);
      logEvent(`Adicionou compra de mandioca`, c.valor_total);

      // Automatically create a "Materia Prima" expense as "Em aberto"
      if (c.status_pagamento !== "Ordem de Compra" && c.status_pagamento !== "Ordem Cumprida") {
        const forn = fornecedores.find((f) => f.id === c.fornecedor_id);
        const fornName = forn ? forn.nome : "Fornecedor";
        const valorCompra =
          c.valor_total || c.quantidade_total * (c.preco_quilo || 1.15);

        const localUser = localStorage.getItem("grupo_eno_user");
        let uId = null;
        if (localUser) {
          try { uId = JSON.parse(localUser).id; } catch (e) {}
        }
        const isPaidInit = c.status_pagamento === "Pago";
        const novaDesp = {
          usuario_id: uId,
          tipo: "Empresa",
          categoria: "Materia Prima",
          data: c.data,
          vencimento: c.data,
          valor: valorCompra,
          forma_pagamento: "Pix",
          recorrente: false,
          parcelas: 1,
          parcela_atual: 1,
          status: isPaidInit ? "Pago" : "Em aberto",
          data_pagamento: isPaidInit ? c.data : null,
          descricao: `Compra de Mandioca - Lote ${c.quantidade_total}kg (${fornName})`,
          tipo_despesa: "variavel",
          compra_mandioca_id: data.id,
        };

        const admin = usuarios.find((u) => u.login === "admin");
        const finalUsuarioId = admin?.id || uId || null;
        if (finalUsuarioId) {
          novaDesp.usuario_id = finalUsuarioId;
        } else {
          delete (novaDesp as any).usuario_id;
        }

        const { data: newDesp, error: errD } = await supabase
          .from("despesas")
          .insert([novaDesp])
          .select()
          .single();

        if (errD) {
          console.error("Erro ao inserir despesa automática:", errD);
        }
        if (newDesp) {
          setDespesas((prev) => [...prev, newDesp]);
        }
      }
    }
  };

  const updateCompraMandioca = async (
    id: string,
    updatedFields: Partial<CompraMandioca>,
  ) => {
    const { pesagens_sacos, ...rest } = updatedFields;

    const existing = comprasMandioca.find(c => c.id === id);
    const linkedOrdemId = (updatedFields as any).ordem_compra_id || existing?.ordem_compra_id;

    if (rest.status_pagamento && linkedOrdemId) {
      (rest as any).status_pagamento = `${rest.status_pagamento}_vinc_${linkedOrdemId}`;
    }
    delete (rest as any).ordem_compra_id;

    if (Object.keys(rest).length > 0) {
      await supabase.from("compras_mandioca").update(rest).eq("id", id);
    }

    let newPesagens =
      comprasMandioca.find((c) => c.id === id)?.pesagens_sacos || [];
    if (pesagens_sacos) {
      await supabase.from("pesagens_mandioca").delete().eq("compra_id", id);
      const peds = pesagens_sacos.map((p) => ({ compra_id: id, peso_kg: p }));
      const { data: dp } = await supabase
        .from("pesagens_mandioca")
        .insert(peds)
        .select();
      if (dp) newPesagens = dp.map((x: any) => x.peso_kg);
    }

    setComprasMandioca((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { 
            ...c, 
            ...rest, 
            pesagens_sacos: newPesagens, 
            status_pagamento: updatedFields.status_pagamento || c.status_pagamento, 
            ordem_compra_id: linkedOrdemId 
          };
          if (updatedFields.status_pagamento === "Pago") {
            // Sync state instantly, but technically should update DB as well
            const relatedExp = despesas.find(
              (d) => d.compra_mandioca_id === id,
            );
            if (relatedExp) {
              updateDespesa(relatedExp.id, {
                status: "Pago",
                forma_pagamento: "Pix",
                data_pagamento: new Date().toISOString().split("T")[0],
              });
            }
          }
          return updated;
        }
        return c;
      }),
    );
    logEvent(`Atualizou compra de mandioca`, rest.valor_total);
  };

  const deleteCompraMandioca = async (id: string) => {
    const obj = comprasMandioca.find(c => c.id === id);
    if(obj) logEvent(`Excluiu compra de mandioca`, obj.valor_total);
    await supabase.from("compras_mandioca").delete().eq("id", id);
    setComprasMandioca((prev) => prev.filter((c) => c.id !== id));
    setDespesas((prev) =>
      prev.filter(
        (d) => !(d.compra_mandioca_id === id && d.status === "Em aberto"),
      ),
    );
  };

  const addProducao = async (p: Omit<Producao, "id">) => {
    const payload = { ...p };
    if ((payload as any).produto_id === "") (payload as any).produto_id = null;
    const { data, error } = await supabase
      .from("producoes")
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar produção:", error);
      alert("Erro ao adicionar produção: " + error.message);
    }
    if (data) { setProducao((prev) => [...prev, data]); logEvent(`Adicionou produção: ${data.lote}`); }
  };
  const updateProducao = async (
    id: string,
    updatedFields: Partial<Producao>,
  ) => {
    const { data } = await supabase
      .from("producoes")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();
    if (data) { setProducao((prev) => prev.map((p) => (p.id === id ? data : p))); logEvent(`Atualizou produção: ${data.lote}`); }
  };
  const deleteProducao = async (id: string) => {
    const obj = producao.find(p => p.id === id);
    if(obj) logEvent(`Excluiu produção: ${obj.lote}`);
    await supabase.from("producoes").delete().eq("id", id);
    setProducao((prev) => prev.filter((p) => p.id !== id));
  };

  const addDespesa = async (d: Omit<Despesa, "id">) => {
    const payload = { ...d };
    if ((payload as any).usuario_id === "") (payload as any).usuario_id = null;

    const { data, error } = await supabase
      .from("despesas")
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar despesa:", error);
      alert("Erro ao adicionar despesa: " + error.message);
    }
    if (data) { setDespesas((prev) => [...prev, data]); logEvent(`Adicionou despesa: ${data.descricao}`, data.valor); }
  };

  const updateDespesa = async (id: string, updatedFields: Partial<Despesa>) => {
    const oldDesp = despesas.find((d) => d.id === id);
    const { data } = await supabase
      .from("despesas")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();

    if (data) {
      setDespesas((prev) => {
        const updatedList = prev.map((d) => (d.id === id ? data : d));
        if (
          oldDesp &&
          updatedFields.status === "Pago" &&
          oldDesp.status !== "Pago"
        ) {
          if (oldDesp.compra_mandioca_id) {
            supabase
              .from("compras_mandioca")
              .update({ status_pagamento: "Pago" })
              .eq("id", oldDesp.compra_mandioca_id)
              .then(({ error: errC }) => {
                if (errC) console.error("Erro ao quitar compra de mandioca relacionada:", errC);
              });
            setComprasMandioca((currC) =>
              currC.map((c) =>
                c.id === oldDesp.compra_mandioca_id
                  ? { ...c, status_pagamento: "Pago" }
                  : c
              )
            );
          }

          const jurosPago = updatedFields.juros_pago || 0;
          if (jurosPago > 0) {
            const dataPagamento =
              updatedFields.data_pagamento ||
              new Date().toISOString().split("T")[0];
            const jurosDesp = {
              usuario_id: oldDesp.usuario_id || "",
              tipo: oldDesp.tipo || "Empresa",
              categoria: "Juros",
              data: dataPagamento,
              vencimento: dataPagamento,
              valor: jurosPago,
              forma_pagamento:
                updatedFields.forma_pagamento ||
                oldDesp.forma_pagamento ||
                "Pix",
              recorrente: false,
              parcelas: 1,
              parcela_atual: 1,
              status: "Pago",
              descricao: `Juros pagos sobre a despesa: ${oldDesp.descricao || oldDesp.categoria} (Ref: ${oldDesp.id.substring(0, 8)})`,
              tipo_despesa: "variavel",
              data_pagamento: dataPagamento,
            };

            // Insert asynchronously
            supabase
              .from("despesas")
              .insert([jurosDesp])
              .select()
              .single()
              .then(({ data: jd }) => {
                if (jd) setDespesas((curr) => [...curr, jd]);
              });
          }
        }
        return updatedList;
      });
      logEvent(`Atualizou despesa.`, data.valor);
    }
  };

  const deleteDespesa = async (id: string) => {
    const o = despesas.find(x => x.id === id);
    if(o) logEvent(`Excluiu despesa.`, o.valor);
    await supabase.from("despesas").delete().eq("id", id);
    setDespesas((prev) => prev.filter((d) => d.id !== id));
  };

  const addProduto = async (p: Omit<Produto, "id">) => {
    const { custos_detalhados, ...rest } = p;
    const { data, error } = await supabase
      .from("produtos")
      .insert([rest])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar produto:", error);
      alert("Erro ao adicionar produto: " + error.message + "\n\nVerifique se todas as colunas existem no banco de dados.");
      return;
    }
    if (data) {
      const prod = { ...data, custos_detalhados: [] } as any;
      if (custos_detalhados && custos_detalhados.length > 0) {
        const m = custos_detalhados.map((c) => ({ ...c, produto_id: data.id }));
        const { data: dc } = await supabase
          .from("custos_diferenciados")
          .insert(m)
          .select();
        if (dc) prod.custos_detalhados = dc;
      }
      setProdutos((prev) => [...prev, prod]);
    }
  };

  const updateProduto = async (id: string, updatedFields: Partial<Produto>) => {
    const { custos_detalhados, ...rest } = updatedFields;
    if (Object.keys(rest).length > 0) {
      const { error } = await supabase.from("produtos").update(rest).eq("id", id);
      if (error) {
        console.error("Erro ao atualizar produto:", error);
        alert("Erro ao atualizar produto: " + error.message + "\n\nVerifique se todas as colunas existem no banco de dados.");
        return;
      }
    }

    let newCustos = produtos.find((p) => p.id === id)?.custos_detalhados || [];
    if (custos_detalhados) {
      await supabase.from("custos_diferenciados").delete().eq("produto_id", id);
      const m = custos_detalhados.map((c) => {
        const { id: _, ...noIdC } = c as any;
        return { ...noIdC, produto_id: id };
      });
      const { data: dc } = await supabase
        .from("custos_diferenciados")
        .insert(m)
        .select();
      if (dc) newCustos = dc as any;
    }

    setProdutos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...rest, custos_detalhados: newCustos } : p,
      ),
    );
    logEvent(`Atualizou produto.`, (rest as any).preco_base);
  };

  const deleteProduto = async (id: string) => {
    const prod = produtos.find(x => x.id === id);
    if(prod) logEvent(`Excluiu produto: ${prod.nome}`, prod.preco_base);
    await supabase.from("produtos").delete().eq("id", id);
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const logEvent = async (
    descricao: string,
    valor?: number,
    usuario_id?: string,
    usuario_nome?: string,
  ) => {
    let finalUserId = usuario_id;
    let finalUserName = usuario_nome;

    if (!finalUserId) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        finalUserId = sessionData.session.user.id;
      }
    }
    
    if (finalUserId && !finalUserName) {
       // Search in current users state. If not available yet, this will be skipped.
       // However, the `usuarios` variable might be stale, so we do:
    }

    const now = new Date();
    const ev = {
      data: now.toISOString().split("T")[0],
      hora: now.toTimeString().split(" ")[0],
      descricao,
      usuario_id: finalUserId || null,
      usuario_nome: finalUserName || "Sistema",
      valor,
    };

    const { data } = await supabase
      .from("log_eventos")
      .insert([ev])
      .select()
      .single();
    if (data) {
      setEventos((prev) => [data, ...prev]);
    }
  };



  return (
    <GlobalStateContext.Provider
      value={{
        clientes,
        clientesEmpana,
        produtos,
        pedidos,
        orcamentos,
        despesas,
        comissoes,
        producao,
        usuarios,
        fornecedores,
        comprasMandioca,
        eventos,
        addUsuario,
        updateUsuario,
        deleteUsuario,
        addCliente,
        updateCliente,
        deleteCliente,
        addClienteEmpana,
        updateClienteEmpana,
        deleteClienteEmpana,
        addFornecedor,
        updateFornecedor,
        deleteFornecedor,
        addCompraMandioca,
        updateCompraMandioca,
        deleteCompraMandioca,
        addPedido,
        updatePedido,
        deletePedido,
        addOrcamento,
        updateOrcamento,
        deleteOrcamento,
        addProducao,
        updateProducao,
        deleteProducao,
        addDespesa,
        updateDespesa,
        deleteDespesa,
        updateProduto,
        addProduto,
        deleteProduto,
        objetivosEmpresa,
        metasRepresentantes,
        saveObjetivoEmpresa,
        saveMetaRepresentante,
        logEvent,
        isLoading,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};
