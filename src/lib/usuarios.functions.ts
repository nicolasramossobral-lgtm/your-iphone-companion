import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type PapelApp = "admin" | "vendedor";

export type UsuarioInterno = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  papel: PapelApp | null;
  criadoEm: string;
};

type ContextoAutenticado = {
  supabase: SupabaseClient<Database>;
  userId: string;
};
export type ResultadoOperacao = { ok: boolean; erro?: string };

/**
 * O middleware de erro do servidor transforma exceções em uma página HTML 500,
 * o que deixaria a tela em branco no cliente. Por isso falhas esperadas são
 * devolvidas como resultado, nunca lançadas.
 */
function traduzirErroSenha(mensagem?: string): string {
  const texto = mensagem ?? "Não foi possível concluir a operação.";
  if (/weak|easy to guess|pwned|leaked/i.test(texto)) {
    return "Esta senha é fraca ou já apareceu em vazamentos. Use ao menos 10 caracteres com letras, números e símbolos.";
  }
  if (/already registered|already been registered|exists/i.test(texto)) {
    return "Já existe uma conta com este e-mail.";
  }
  if (/password/i.test(texto) && /short|least/i.test(texto)) {
    return "A senha é curta demais. Use ao menos 8 caracteres.";
  }
  return texto;
}


async function garantirAdmin(context: ContextoAutenticado) {
  const { data, error } = await context.supabase.rpc("is_active_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error("Não foi possível validar suas permissões.");
  if (!data) throw new Error("Acesso restrito a administradores ativos.");
}

/** Valida admin sem lançar, para operações que devolvem resultado. */
async function checarAdmin(context: ContextoAutenticado): Promise<string | null> {
  const { data, error } = await context.supabase.rpc("is_active_admin", {
    _user_id: context.userId,
  });
  if (error) return "Não foi possível validar suas permissões.";
  if (!data) return "Acesso restrito a administradores ativos.";
  return null;
}

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioInterno[]> => {
    await garantirAdmin(context as unknown as ContextoAutenticado);
    const ctx = context as unknown as ContextoAutenticado;

    const { data: perfis, error: erroPerfis } = await ctx.supabase
      .from("profiles")
      .select("id, nome, email, ativo, created_at")
      .order("created_at", { ascending: true });
    if (erroPerfis) throw new Error("Falha ao carregar usuários.");

    const { data: papeis, error: erroPapeis } = await ctx.supabase
      .from("user_roles")
      .select("user_id, role");
    if (erroPapeis) throw new Error("Falha ao carregar papéis.");

    const mapaPapeis = new Map<string, PapelApp>();
    for (const linha of papeis ?? []) {
      mapaPapeis.set(linha.user_id, linha.role as PapelApp);
    }

    return (perfis ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      ativo: p.ativo,
      papel: mapaPapeis.get(p.id) ?? null,
      criadoEm: p.created_at,
    }));
  });

const esquemaCriacao = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  papel: z.enum(["admin", "vendedor"]),
});

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaCriacao.parse(input))
  .handler(async ({ data, context }): Promise<ResultadoOperacao> => {
    const ctx = context as unknown as ContextoAutenticado;
    const semPermissao = await checarAdmin(ctx);
    if (semPermissao) return { ok: false, erro: semPermissao };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !criado.user) {
      return { ok: false, erro: traduzirErroSenha(error?.message) };
    }

    const novoId = criado.user.id;

    const { error: erroPerfil } = await supabaseAdmin.from("profiles").upsert({
      id: novoId,
      nome: data.nome,
      email: data.email,
      ativo: true,
    });
    if (erroPerfil) return { ok: false, erro: "Usuário criado, mas o perfil falhou." };

    const { error: erroPapel } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: novoId, role: data.papel }, { onConflict: "user_id,role" });
    if (erroPapel) return { ok: false, erro: "Usuário criado, mas o papel falhou." };

    return { ok: true };
  });


export const definirStatusUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), ativo: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ContextoAutenticado;
    await garantirAdmin(ctx);

    if (data.userId === ctx.userId && !data.ativo) {
      throw new Error("Você não pode desativar a própria conta.");
    }

    const { error } = await ctx.supabase
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.userId);
    if (error) throw new Error("Não foi possível atualizar o status.");

    return { ok: true };
  });

export const definirPapelUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), papel: z.enum(["admin", "vendedor"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ContextoAutenticado;
    await garantirAdmin(ctx);

    if (data.userId === ctx.userId && data.papel !== "admin") {
      throw new Error("Você não pode remover o próprio acesso de administrador.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: erroRemover } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (erroRemover) throw new Error("Não foi possível atualizar o papel.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.papel });
    if (error) throw new Error("Não foi possível atribuir o novo papel.");

    return { ok: true };
  });

const esquemaBootstrap = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  senha: z.string().min(8),
});

/**
 * Cria o primeiro administrador. Só funciona enquanto não existir nenhum
 * usuário cadastrado — depois disso o endpoint rejeita qualquer chamada.
 */
export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => esquemaBootstrap.parse(input))
  .handler(async ({ data }): Promise<ResultadoOperacao> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: erroContagem } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (erroContagem) return { ok: false, erro: "Não foi possível verificar o estado inicial." };
    if ((count ?? 0) > 0) {
      return { ok: false, erro: "A configuração inicial já foi concluída." };
    }

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !criado.user) {
      return { ok: false, erro: traduzirErroSenha(error?.message) };
    }


    await supabaseAdmin
      .from("profiles")
      .upsert({ id: criado.user.id, nome: data.nome, email: data.email, ativo: true });
    await supabaseAdmin.from("user_roles").insert({ user_id: criado.user.id, role: "admin" });

    return { ok: true };
  });

export const precisaConfiguracaoInicial = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return { precisa: (count ?? 0) === 0 };
});
