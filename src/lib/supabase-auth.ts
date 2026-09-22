export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://flvlopkobywrnttkeedj.supabase.co";
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "sb_publishable_mWdQ54O_V2N2yiiURAIMvMg_671m1Ieo";

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

export async function signIn(email: string, password: string): Promise<AuthSession> {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json()) as AuthSession & { error_description?: string; msg?: string };
  if (!response.ok) throw new Error(payload.error_description ?? payload.msg ?? "E-mail ou senha inválidos.");
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
