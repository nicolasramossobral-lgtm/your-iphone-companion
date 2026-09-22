import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function getAdminKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy key below.
    }
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  throw new Error("Nenhuma chave administrativa do Supabase está disponível na Edge Function.");
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, getAdminKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, erro: "Método não permitido." }, 405);

  try {
    const input = await req.json();
    const nome = String(input.nome ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const senha = String(input.senha ?? "");

    if (nome.length < 2 || !email || senha.length < 10) {
      return json({ ok: false, erro: "Nome, e-mail e senha válidos são obrigatórios." }, 400);
    }

    const supa = adminClient();

    const { count, error: countError } = await supa
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (countError) {
      return json({ ok: false, erro: `Falha ao verificar a configuração inicial: ${countError.message}` }, 500);
    }

    if ((count ?? 0) > 0) {
      return json({ ok: false, erro: "A configuração inicial já foi concluída." }, 409);
    }

    const { data, error: authError } = await supa.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome },
    });

    if (authError || !data.user) {
      return json({
        ok: false,
        erro: authError?.message ?? "Não foi possível criar o administrador.",
      }, 400);
    }

    const uid = data.user.id;

    const { error: profileError } = await supa
      .from("profiles")
      .upsert({ id: uid, full_name: nome, email, active: true });

    const { error: roleError } = await supa
      .from("user_roles")
      .upsert({ user_id: uid, role: "admin" });

    if (profileError || roleError) {
      await supa.auth.admin.deleteUser(uid);
      return json({
        ok: false,
        erro: `Não foi possível finalizar o administrador: ${profileError?.message ?? roleError?.message ?? "erro desconhecido"}`,
      }, 500);
    }

    const { error: auditError } = await supa.from("audit_logs").insert({
      user_id: uid,
      action: "first_admin_created",
      entity_type: "user",
      entity_id: uid,
      metadata: { email },
    });

    if (auditError) {
      await supa.auth.admin.deleteUser(uid);
      await supa.from("profiles").delete().eq("id", uid);
      await supa.from("user_roles").delete().eq("user_id", uid);
      return json({ ok: false, erro: `Não foi possível registrar a criação do administrador: ${auditError.message}` }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    return json({
      ok: false,
      erro: error instanceof Error ? error.message : "Erro interno ao inicializar o administrador.",
    }, 500);
  }
});
