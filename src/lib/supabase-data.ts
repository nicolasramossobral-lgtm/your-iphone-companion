import { getStoredSession, SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-auth";

function config() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase não está configurado.");
  const session = getStoredSession();
  if (!session) throw new Error("Sessão expirada. Faça login novamente.");
  return { session, base: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

async function request<T>(table: string, options: RequestInit = {}, query = ""): Promise<T> {
  const { session, base, key } = config();
  const response = await fetch(`${base}/rest/v1/${table}${query}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Erro ao acessar ${table}.`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type Product = { id: string; model: string; brand: string; active: boolean };
export type Variant = { id: string; product_id: string; storage_gb: number; color: string; condition: string; sku: string | null };
export type Supplier = { id: string; name: string; legal_name: string | null; notes: string | null; active: boolean };
export type SignupRequest = { id: string; auth_user_id: string | null; email: string; full_name: string | null; status: string; created_at: string; reviewed_at: string | null; reviewed_by: string | null };
export type Offer = { id: string; supplier_id: string; product_variant_id: string; price: number; stock_quantity: number | null; observed_at: string; active: boolean };
export type PriceHistory = { id: string; supplier_price_id: string | null; supplier_id: string; product_variant_id: string; price: number; stock_quantity: number | null; observed_at: string; source_message_id: string | null; created_at: string };

export const dataApi = {
signupRequests: async () => {
    const session = getStoredSession();
    if (!session) throw new Error("Sessão expirada.");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/access-admin?action=list`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await response.json().catch(() => ({})) as { requests?: SignupRequest[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar as solicitações.");
    return payload.requests ?? [];
  },
  approveSignup: async (requestId: string) => adminSignupAction("approve", requestId),
  rejectSignup: async (requestId: string) => adminSignupAction("reject", requestId),

  products: () => request<Product[]>("products", {}, "?select=*&order=model"),
  variants: () => request<Variant[]>("product_variants", {}, "?select=*&order=storage_gb"),
  suppliers: () => request<Supplier[]>("suppliers", {}, "?select=*&order=name"),
  offers: () => request<Offer[]>("supplier_prices", {}, "?select=*&order=price"),
  priceHistory: () => request<PriceHistory[]>("price_history", {}, "?select=*&order=observed_at.desc&limit=100"),
  profile: async () => {
    const session = getStoredSession();
    if (!session) return null;
    const rows = await request<Array<{ full_name: string | null; email: string | null; phone: string | null }>>("profiles", {}, `?select=full_name,email,phone&id=eq.${session.user.id}&limit=1`);
    return rows[0] ?? null;
  },
  role: async () => {
    const session = getStoredSession();
    if (!session) return null;
    const rows = await request<Array<{ role: "admin" | "vendor" }>>("user_roles", {}, `?select=role&user_id=eq.${session.user.id}&limit=1`);
    return rows[0]?.role ?? null;
  },
  addProduct: (model: string) => request<Product[]>("products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ model, brand: "Apple", active: true }) }),
  addVariant: (data: Omit<Variant, "id">) => request<Variant[]>("product_variants", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(data) }),
  addSupplier: (name: string, legal_name: string) => request<Supplier[]>("suppliers", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name, legal_name, active: true }) }),
  addOffer: (data: Omit<Offer, "id" | "observed_at" | "active">) => request<Offer[]>("supplier_prices", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...data, active: true }) }),
  updateProduct: (id: string, data: Partial<Product>) => request<null>("products", { method: "PATCH", body: JSON.stringify(data) }, `?id=eq.${id}`),
  updateVariant: (id: string, data: Partial<Variant>) => request<null>("product_variants", { method: "PATCH", body: JSON.stringify(data) }, `?id=eq.${id}`),
  updateSupplier: (id: string, data: Partial<Supplier>) => request<null>("suppliers", { method: "PATCH", body: JSON.stringify(data) }, `?id=eq.${id}`),
  updateOffer: (id: string, data: Partial<Offer>) => request<null>("supplier_prices", { method: "PATCH", body: JSON.stringify(data) }, `?id=eq.${id}`),
  updateProfile: (id: string, data: { full_name?: string; phone?: string | null }) => request<null>("profiles", { method: "PATCH", body: JSON.stringify(data) }, `?id=eq.${id}`),
};

async function adminSignupAction(action: "approve" | "reject", requestId: string) {
  const session = getStoredSession();
  if (!session) throw new Error("Sessão expirada.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/access-admin`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, requestId }),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar a solicitação.");
}
