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

  addFornecedor: (f: Omit<Fornecedor, "id">) => void;
  updateFornecedor: (id: string, f: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;

  addCompraMandioca: (c: Omit<CompraMandioca, "id">) => void;
  updateCompraMandioca: (id: string, c: Partial<CompraMandioca>) => void;
  deleteCompraMandioca: (id: string) => void;

  addPedido: (p: Omit<Pedido, "id">) => void;
  updatePedido: (id: string, p: Partial<Pedido>) => void;
  deletePedido: (id: string) => void;

  addOrcamento: (o: Omit<Orcamento, "id">) => void;
  updateOrcamento: (id: string, o: Partial<Orcamento>) => void;
  deleteOrcamento: (id: string) => void;

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

      const { data: qUsuarios } = await supabase.from("usuarios").select("*");
      const { data: qClientes } = await supabase.from("clientes").select("*");
      const { data: qProdutos } = await supabase
        .from("produtos")
        .select("*, custos_detalhados:custos_diferenciados(*)");
      const { data: qFornecedores } = await supabase
        .from("fornecedores")
        .select("*");
      const { data: qCompras } = await supabase
        .from("compras_mandioca")
        .select("*, pesagens_sacos:pesagens_mandioca(peso_kg)");

      const { data: qPedidos } = await supabase
        .from("pedidos")
        .select("*, items:itens_pedido(*), solicitacoes_insumos(*)");
      const { data: qOrcamentos } = await supabase
        .from("orcamentos")
        .select("*, items:itens_orcamento(*)");

      const { data: qDespesas } = await supabase.from("despesas").select("*");
      const { data: qProducoes } = await supabase.from("producoes").select("*");
      const { data: qComissoes } = await supabase.from("comissoes").select("*");
      const { data: qObjetivos } = await supabase
        .from("objetivos_empresa")
        .select("*");
      const { data: qMetas } = await supabase
        .from("metas_representante")
        .select("*");
      const { data: qEventos } = await supabase
        .from("log_eventos")
        .select("*")
        .order("data", { ascending: false })
        .limit(200);

      if (qUsuarios) setUsuarios(qUsuarios as User[]);
      if (qClientes) setClientes(qClientes as Cliente[]);
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
          qCompras.map((c) => ({
            ...c,
            pesagens_sacos: c.pesagens_sacos?.map((p: any) => p.peso_kg) || [],
          })),
        );
      }

      if (qPedidos) setPedidos(qPedidos as Pedido[]);
      if (qOrcamentos) setOrcamentos(qOrcamentos as unknown as Orcamento[]);

      setIsLoading(false);
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
    const { data } = await supabase
      .from("usuarios")
      .insert([u])
      .select()
      .single();
    if (data) setUsuarios((prev) => [...prev, data]);
  };
  const updateUsuario = async (id: string, updatedFields: Partial<User>) => {
    const { data } = await supabase
      .from("usuarios")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();
    if (data) setUsuarios((prev) => prev.map((u) => (u.id === id ? data : u)));
  };
  const deleteUsuario = async (id: string) => {
    await supabase.from("usuarios").delete().eq("id", id);
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  };

  const addCliente = async (c: Omit<Cliente, "id">) => {
    const { data } = await supabase
      .from("clientes")
      .insert([c])
      .select()
      .single();
    if (data) setClientes((prev) => [...prev, data]);
  };
  const updateCliente = async (id: string, updatedFields: Partial<Cliente>) => {
    const { data } = await supabase
      .from("clientes")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();
    if (data) setClientes((prev) => prev.map((c) => (c.id === id ? data : c)));
  };
  const deleteCliente = async (id: string) => {
    await supabase.from("clientes").delete().eq("id", id);
    setClientes((prev) => prev.filter((c) => c.id !== id));
    setPedidos((prev) => prev.filter((p) => p.cliente_id !== id));
    setOrcamentos((prev) => prev.filter((o) => o.cliente_id !== id));
  };

  const addPedido = async (p: Omit<Pedido, "id">) => {
    const { items, solicitacoes_insumos, ...rest } = p;
    const { data } = await supabase
      .from("pedidos")
      .insert([rest])
      .select()
      .single();
    if (data) {
      const insertedPedido = {
        ...data,
        items: [],
        solicitacoes_insumos: [],
      } as any;
      if (items && items.length > 0) {
        const mappedItems = items.map((it) => ({ ...it, pedido_id: data.id }));
        const { data: itemData } = await supabase
          .from("itens_pedido")
          .insert(mappedItems)
          .select();
        if (itemData) insertedPedido.items = itemData;
      }
      if (solicitacoes_insumos && solicitacoes_insumos.length > 0) {
        const mapped = solicitacoes_insumos.map((s) => ({
          ...s,
          pedido_id: data.id,
        }));
        const { data: reqData } = await supabase
          .from("solicitacoes_insumo")
          .insert(mapped)
          .select();
        if (reqData) insertedPedido.solicitacoes_insumos = reqData;
      }
      setPedidos((prev) => [...prev, insertedPedido]);
    }
  };

  const updatePedido = async (id: string, updatedFields: Partial<Pedido>) => {
    const { items, solicitacoes_insumos, ...rest } = updatedFields;
    const oldPedido = pedidos.find((p) => p.id === id);
    if (!oldPedido) return;

    if (Object.keys(rest).length > 0) {
      await supabase.from("pedidos").update(rest).eq("id", id);
    }

    let updatedItems = oldPedido.items;
    if (items) {
      await supabase.from("itens_pedido").delete().eq("pedido_id", id);
      const mappedItems = items.map((it) => {
        const { id: _, ...noIdIt } = it as any;
        return { ...noIdIt, pedido_id: id };
      });
      const { data: newItems } = await supabase
        .from("itens_pedido")
        .insert(mappedItems)
        .select();
      if (newItems) updatedItems = newItems;
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...rest, items: updatedItems } : p,
      ),
    );
  };

  const deletePedido = async (id: string) => {
    await supabase.from("pedidos").delete().eq("id", id);
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    setComissoes((prev) => prev.filter((c) => c.pedido_id !== id));
  };

  const addOrcamento = async (o: Omit<Orcamento, "id">) => {
    const { items, ...rest } = o;
    const { data } = await supabase
      .from("orcamentos")
      .insert([rest])
      .select()
      .single();
    if (data) {
      const inserted = { ...data, items: [] } as any;
      if (items && items.length > 0) {
        const mappedItems = items.map((it) => ({
          ...it,
          orcamento_id: data.id,
        }));
        const { data: itemData } = await supabase
          .from("itens_orcamento")
          .insert(mappedItems)
          .select();
        if (itemData) inserted.items = itemData;
      }
      setOrcamentos([...orcamentos, inserted]);
    }
  };

  const updateOrcamento = async (
    id: string,
    updatedFields: Partial<Orcamento>,
  ) => {
    const { items, ...rest } = updatedFields;
    const oldOrcamento = orcamentos.find((o) => o.id === id);
    if (!oldOrcamento) return;

    if (Object.keys(rest).length > 0) {
      await supabase.from("orcamentos").update(rest).eq("id", id);
    }

    let updatedItems = oldOrcamento.items;
    if (items) {
      await supabase.from("itens_orcamento").delete().eq("orcamento_id", id);
      const mappedItems = items.map((it) => {
        const { id: _, ...noIdIt } = it as any;
        return { ...noIdIt, orcamento_id: id };
      });
      const { data: newItems } = await supabase
        .from("itens_orcamento")
        .insert(mappedItems)
        .select();
      if (newItems) updatedItems = newItems as any;
    }

    setOrcamentos((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, ...rest, items: updatedItems } : o,
      ),
    );
  };

  const deleteOrcamento = async (id: string) => {
    await supabase.from("orcamentos").delete().eq("id", id);
    setOrcamentos(orcamentos.filter((o) => o.id !== id));
  };

  const addFornecedor = async (f: Omit<Fornecedor, "id">) => {
    const { data } = await supabase
      .from("fornecedores")
      .insert([f])
      .select()
      .single();
    if (data) setFornecedores((prev) => [...prev, data]);
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
    if (data)
      setFornecedores((prev) => prev.map((f) => (f.id === id ? data : f)));
  };
  const deleteFornecedor = async (id: string) => {
    await supabase.from("fornecedores").delete().eq("id", id);
    setFornecedores((prev) => prev.filter((f) => f.id !== id));
    setComprasMandioca((prev) => prev.filter((c) => c.fornecedor_id !== id));
  };

  const addCompraMandioca = async (c: Omit<CompraMandioca, "id">) => {
    const { pesagens_sacos, ...rest } = c;
    const { data } = await supabase
      .from("compras_mandioca")
      .insert([rest])
      .select()
      .single();

    if (data) {
      const compData = { ...data, pesagens_sacos: [] } as any;
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

      // Automatically create a "Materia Prima" expense as "Em aberto"
      const forn = fornecedores.find((f) => f.id === c.fornecedor_id);
      const fornName = forn ? forn.nome : "Fornecedor";
      const valorCompra =
        c.valor_total || c.quantidade_total * (c.preco_quilo || 1.15);

      const novaDesp = {
        usuario_id: "1", // Should ideally map to a real UUID if schema demands it, but for our setup UUID is default
        tipo: "Empresa",
        categoria: "Materia Prima",
        data: c.data,
        vencimento: c.data,
        valor: valorCompra,
        forma_pagamento: "Pix",
        recorrente: false,
        parcelas: 1,
        parcela_atual: 1,
        status: "Em aberto",
        descricao: `Compra de Mandioca - Lote ${c.quantidade_total}kg (${fornName})`,
        tipo_despesa: "variavel",
        compra_mandioca_id: data.id,
      };

      // For reference integrity, we must be careful with usuario_id if it's strongly enforced,
      // Assuming '1' might fail UUID. Let's omit and let user logic handle, or use admin user id.
      const admin = usuarios.find((u) => u.login === "admin");
      if (admin) {
        novaDesp.usuario_id = admin.id;
        const { data: newDesp } = await supabase
          .from("despesas")
          .insert([novaDesp])
          .select()
          .single();
        if (newDesp) setDespesas((prev) => [...prev, newDesp]);
      }
    }
  };

  const updateCompraMandioca = async (
    id: string,
    updatedFields: Partial<CompraMandioca>,
  ) => {
    const { pesagens_sacos, ...rest } = updatedFields;

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
          const updated = { ...c, ...rest, pesagens_sacos: newPesagens };
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
  };

  const deleteCompraMandioca = async (id: string) => {
    await supabase.from("compras_mandioca").delete().eq("id", id);
    setComprasMandioca((prev) => prev.filter((c) => c.id !== id));
    setDespesas((prev) =>
      prev.filter(
        (d) => !(d.compra_mandioca_id === id && d.status === "Em aberto"),
      ),
    );
  };

  const addProducao = async (p: Omit<Producao, "id">) => {
    const { data } = await supabase
      .from("producoes")
      .insert([p])
      .select()
      .single();
    if (data) setProducao((prev) => [...prev, data]);
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
    if (data) setProducao((prev) => prev.map((p) => (p.id === id ? data : p)));
  };
  const deleteProducao = async (id: string) => {
    await supabase.from("producoes").delete().eq("id", id);
    setProducao((prev) => prev.filter((p) => p.id !== id));
  };

  const addDespesa = async (d: Omit<Despesa, "id">) => {
    const { data } = await supabase
      .from("despesas")
      .insert([d])
      .select()
      .single();
    if (data) setDespesas((prev) => [...prev, data]);
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
    }
  };

  const deleteDespesa = async (id: string) => {
    await supabase.from("despesas").delete().eq("id", id);
    setDespesas((prev) => prev.filter((d) => d.id !== id));
  };

  const addProduto = async (p: Omit<Produto, "id">) => {
    const { custos_detalhados, ...rest } = p;
    const { data } = await supabase
      .from("produtos")
      .insert([rest])
      .select()
      .single();
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
      await supabase.from("produtos").update(rest).eq("id", id);
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
  };

  const deleteProduto = async (id: string) => {
    await supabase.from("produtos").delete().eq("id", id);
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const logEvent = async (
    descricao: string,
    valor?: number,
    usuario_id?: string,
    usuario_nome?: string,
  ) => {
    const now = new Date();
    const ev = {
      data: now.toISOString().split("T")[0],
      hora: now.toTimeString().split(" ")[0],
      descricao,
      usuario_id: usuario_id || null, // Cannot be 'sys' if UUID is strictly enforced and 'sys' is not a valid UUID
      usuario_nome: usuario_nome || "Sistema",
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
