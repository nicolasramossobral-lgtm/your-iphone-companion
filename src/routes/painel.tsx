import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getStoredSession, signOut } from "../lib/supabase-auth";

type Counts = {
  products: number | null;
  suppliers: number | null;
  offers: number | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

async function countTable(table: string, token: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: "count=exact",
    },
  });
  if (!response.ok) return null;
  const range = response.headers.get("content-range");
  const total = range?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

export const Route = createFileRoute("/painel")({
  component: Dashboard,
});

function Dashboard() {
  const [counts, setCounts] = useState<Counts>({ products: null, suppliers: null, offers: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      window.location.replace("/");
      return;
    }

    Promise.all([
      countTable("products", session.access_token),
      countTable("suppliers", session.access_token),
      countTable("supplier_prices", session.access_token),
    ])
      .then(([products, suppliers, offers]) => setCounts({ products, suppliers, offers }))
      .finally(() => setLoading(false));
  }, []);

  function handleSignOut() {
    signOut();
    window.location.replace("/");
  }

  const cards = [
    { label: "Produtos", value: counts.products },
    { label: "Fornecedores", value: counts.suppliers },
    { label: "Ofertas", value: counts.offers },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">YI</div>
            <span className="font-semibold tracking-tight">Your iPhone Companion</span>
          </div>
          <button onClick={handleSignOut} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Visão geral</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Dados carregados diretamente do Supabase.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <section key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{loading ? "—" : card.value ?? "—"}</p>
            </section>
          ))}
        </div>

        {!loading && counts.offers === 0 && (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="font-semibold">Nenhuma oferta cadastrada.</h2>
            <p className="mt-2 text-sm text-slate-500">Quando as ofertas forem registradas, elas aparecerão aqui no painel.</p>
          </section>
        )}
      </div>
    </main>
  );
}
