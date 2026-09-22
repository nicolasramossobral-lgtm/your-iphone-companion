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
    const [
      { data: ofertas, error: erroOfertas },
      { count: totalOfertas, error: erroTotalOfertas },
      { data: melhorOferta, error: erroMelhorOferta },
      { count: totalFornecedores, error: erroFornecedores },
    ] =
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
          .from("ofertas")
          .select("id, fornecedores!inner(id)", { count: "exact", head: true })
          .eq("disponivel", true)
          .eq("fornecedores.ativo", true),
        context.supabase
          .from("ofertas")
          .select("preco, fornecedores!inner(id)")
          .eq("disponivel", true)
          .eq("fornecedores.ativo", true)
          .order("preco", { ascending: true })
          .limit(1)
          .maybeSingle(),
        context.supabase
          .from("fornecedores")
          .select("id", { count: "exact", head: true })
          .eq("ativo", true),
      ]);

    if (erroOfertas || erroTotalOfertas || erroMelhorOferta || erroFornecedores) {
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
      melhorPreco: melhorOferta ? Number(melhorOferta.preco) : null,
      quantidadeOfertas: totalOfertas ?? 0,
      fornecedoresAtivos: totalFornecedores ?? 0,
      ultimaAtualizacao: lista[0]?.coletadoEm ?? null,
      ofertas: lista,
    };
  });