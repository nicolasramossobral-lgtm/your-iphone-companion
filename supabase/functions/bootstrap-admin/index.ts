import { withSupabase } from "npm:@supabase/server";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    if (req.method !== "POST") {
      return json({ ok: false, erro: "Método não permitido." }, 405);
    }

    try {
      const input = await req.json();
      const nome = String(input.nome ?? "").trim();
      const email = String(input.email ?? "").trim().toLowerCase();
      const senha = String(input.senha ?? "");

      if (nome.length < 2 || !email || senha.length < 10) {
        return json({ ok: false, erro: "Nome, e-mail e senha válidos são obrigatórios." }, 400);
      }

      const { count, error: countError } = await ctx.supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (countError) {
        return json({ ok: false, erro: `Falha ao verificar a configuração inicial: ${countError.message}` }, 500);
      }

      if ((count ?? 0) > 0) {
        return json({ ok: false, erro: "A configuração inicial já foi concluída." }, 409);
      }

      const { data, error: authError } = await ctx.supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nome },
      });

      if (authError || !data.user) {
        return json({ ok: false, erro: authError?.message ?? "Não foi possível criar o administrador." }, 400);
      }

      const uid = data.user.id;

      const { error: profileError } = await ctx.supabaseAdmin
        .from("profiles")
        .upsert({ id: uid, full_name: nome, email, active: true });

      const { error: roleError } = await ctx.supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: uid, role: "admin" });

      if (profileError || roleError) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(uid);
        return json({
          ok: false,
          erro: `Não foi possível finalizar o administrador: ${profileError?.message ?? roleError?.message ?? "erro desconhecido"}`,
        }, 500);
      }

      const { error: auditError } = await ctx.supabaseAdmin.from("audit_logs").insert({
        user_id: uid,
        action: "first_admin_created",
        entity_type: "user",
        entity_id: uid,
        metadata: { email },
      });

      if (auditError) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(uid);
        await ctx.supabaseAdmin.from("profiles").delete().eq("id", uid);
        await ctx.supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
        return json({
          ok: false,
          erro: `Não foi possível registrar a criação do administrador: ${auditError.message}`,
        }, 500);
      }

      return json({ ok: true });
    } catch (error) {
      return json({
        ok: false,
        erro: error instanceof Error ? error.message : "Erro interno ao inicializar o administrador.",
      }, 500);
    }
  }),
};
