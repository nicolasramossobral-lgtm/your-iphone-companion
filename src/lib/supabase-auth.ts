export const SUPABASE_URL = "https://flvlopkobywrnttkeedj.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_mWdQ54O_V2N2yiiURAIMvMg_671m1Ieo";
const SUPABASE_LEGACY_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdmxvcGtvYnl3cm50dGtlZWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDUxMzcsImV4cCI6MjEwNTYyMTEzN30.u6jL4eQyXzIXs50attLm9Eu7L48nyZqAHlA2PA0_5wU";

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string };
};

const SESSION_KEY = "your-iphone-companion.auth";

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase não está configurado neste ambiente.");
  }
}

async function requestBootstrapAdmin(email: string, password: string) {
  const endpoint = `${SUPABASE_URL}/functions/v1/bootstrap-admin`;
  const body = JSON.stringify({
    nome: "Nicolas Ramos",
    email: email.trim().toLowerCase(),
    senha: password,
  });

  let response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: SUPABASE_LEGACY_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_LEGACY_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (response.status === 401) {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  return response;
}

async function getBootstrapError(response: Response) {
  const raw = await response.text();
  let payload: { ok?: boolean; erro?: string } = {};
  try {
    payload = JSON.parse(raw) as { ok?: boolean; erro?: string };
  } catch {
    // A resposta pode ser texto/HTML quando a requisição é bloqueada antes de chegar à função.
  }

  const errorCode = response.headers.get("sb-error-code");
  const details = payload.erro ?? raw.trim();

  return details
    ? `Inicialização do administrador falhou (HTTP ${response.status}): ${details}`
    : `Inicialização do administrador falhou (HTTP ${response.status}${errorCode ? `, ${errorCode}` : ""}).`;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  createAccessRequest = true,
) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
  const payload = await response.json().catch(() => ({})) as {
    user?: { id?: string };
    session?: AuthSession | null;
    msg?: string;
    error_description?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.msg ?? "Não foi possível criar o cadastro.");
  }

  const userId = payload.user?.id;
  if (!userId) throw new Error("Não foi possível identificar o cadastro.");

  if (createAccessRequest) {
    const requestResponse = await fetch(`${SUPABASE_URL}/rest/v1/signup_requests`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        auth_user_id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || null,
        status: "pending",
      }),
    });

    if (!requestResponse.ok) {
      const message = await requestResponse.text();
      throw new Error(message || "Cadastro criado, mas não foi possível enviar a solicitação.");
    }
  }

  if (payload.session) localStorage.removeItem(SESSION_KEY);
  return payload.session ?? null;
}

export async function bootstrapFirstAdmin(email: string, password: string) {
  assertConfig();
  const response = await requestBootstrapAdmin(email, password);
  if (!response.ok) {
    throw new Error(await getBootstrapError(response));
  }

  const payload = await response.json().catch(() => ({})) as { ok?: boolean; erro?: string };
  if (payload.ok === false) {
    throw new Error(payload.erro ?? "Não foi possível inicializar o administrador.");
  }
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  assertConfig();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === "nicolasramossobral@gmail.com") {
    const bootstrapResponse = await requestBootstrapAdmin(normalizedEmail, password);

    if (!bootstrapResponse.ok && bootstrapResponse.status !== 409) {
      throw new Error(await getBootstrapError(bootstrapResponse));
    }
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail, password }),
  });
  const payload = (await response.json()) as AuthSession & {
    error_description?: string;
    msg?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.msg ?? "E-mail ou senha inválidos.");
  }

  const session = { ...payload, expires_at: Math.floor(Date.now() / 1000) + payload.expires_in };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function signOut() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

export async function resetPassword(email: string) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { msg?: string; error_description?: string };
    throw new Error(payload.error_description ?? payload.msg ?? "Não foi possível enviar o e-mail de recuperação.");
  }
}
