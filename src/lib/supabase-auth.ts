import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-client";

export { SUPABASE_ANON_KEY, SUPABASE_URL };

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string };
};

const SESSION_KEY = "your-iphone-companion.auth";
const SESSION_KEY_SESSION = "your-iphone-companion.session";

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase não está configurado neste ambiente.");
  }
}

function authErrorMessage(code?: string, message?: string) {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha inválidos.";
    case "email_not_confirmed":
      return "Este e-mail ainda não foi confirmado.";
    case "too_many_requests":
      return "Muitas tentativas de login. Aguarde alguns instantes e tente novamente.";
    case "user_banned":
      return "Esta conta está temporariamente bloqueada.";
    default:
      return message || "Não foi possível entrar.";
  }
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

  if (payload.session) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY_SESSION);
  }
  return payload.session ?? null;
}

export async function signIn(email: string, password: string, remember = true): Promise<AuthSession> {
  assertConfig();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    const diagnosticCode = error.code ?? error.name ?? "unknown_auth_error";
    console.warn("[auth] sign-in failed", {
      status: error.status,
      code: diagnosticCode,
    });
    throw new Error(authErrorMessage(error.code, error.message));
  }

  if (!data.session || !data.user) {
    throw new Error("O Supabase não retornou uma sessão válida.");
  }

  const session: AuthSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    ...(data.session.expires_at ? { expires_at: data.session.expires_at } : {}),
    token_type: data.session.token_type,
    user: {
      id: data.user.id,
      ...(data.user.email ? { email: data.user.email } : {}),
    },
  };

  const serialized = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(SESSION_KEY, serialized);
    sessionStorage.removeItem(SESSION_KEY_SESSION);
  } else {
    sessionStorage.setItem(SESSION_KEY_SESSION, serialized);
    localStorage.removeItem(SESSION_KEY);
  }
  return session;
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY_SESSION);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000)) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY_SESSION);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY_SESSION);
    return null;
  }
}

export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY_SESSION);
  }
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

export async function recoverSessionFromUrl() {
  if (typeof window === "undefined") return false;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (!accessToken || !refreshToken) return false;
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw new Error("O link de recuperação expirou ou é inválido.");
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

export async function updatePassword(password: string) {
  assertConfig();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message || "Não foi possível atualizar a senha.");
  await supabase.auth.signOut();
  signOut();
}
