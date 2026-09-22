import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OfertaDashboard = {
  id: string;
  modelo: string;
  capacidade: string;
  cor: string;
  condicao: string;
  preco: number;
  estoque: number;
  fornecedor: string;
  coletadoEm: string;
};

export type DashboardData = {
  melhorPreco: number | null;
  quantidadeOfertas: number;
  fornecedoresAtivos: number;
  ultimaAtualizacao: string | null;
  ofertas: OfertaDashboard[];
};

export const carregarDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const [{ data: ofertas, error: erroOfertas }, { count, error: erroFornecedores }] =
      await Promise.all([
        context.supabase
          .from("ofertas")
          .select(
            "id, condicao, preco, estoque, coletado_em, produtos!inner(modelo, capacidade, cor), fornecedores!inner(nome, ativo)",
          )
          .eq("disponivel", true)
          .eq("fornecedores.ativo", true)
          .order("coletado_em", { ascending: false })
          .limit(50),
        context.supabase
          .from("fornecedores")
          .select("id", { count: "exact", head: true })
          .eq("ativo", true),
      ]);

    if (erroOfertas || erroFornecedores) {
      throw new Error("Não foi possível carregar os dados do dashboard.");
    }

    const lista: OfertaDashboard[] = (ofertas ?? []).map((oferta) => ({
      id: oferta.id,
      modelo: oferta.produtos.modelo,
      capacidade: oferta.produtos.capacidade,
      cor: oferta.produtos.cor,
      condicao: oferta.condicao,
      preco: Number(oferta.preco),
      estoque: oferta.estoque,
      fornecedor: oferta.fornecedores.nome,
      coletadoEm: oferta.coletado_em,
    }));

    return {
      melhorPreco: lista.length > 0 ? Math.min(...lista.map((oferta) => oferta.preco)) : null,
      quantidadeOfertas: lista.length,
      fornecedoresAtivos: count ?? 0,
      ultimaAtualizacao: lista[0]?.coletadoEm ?? null,
      ofertas: lista,
    };
  });