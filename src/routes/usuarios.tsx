import { createFileRoute } from "@tanstack/react-router";
import { Check, LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredSession, signOut } from "../lib/supabase-auth";
import { dataApi, type SignupRequest } from "../lib/supabase-data";

export const Route = createFileRoute("/usuarios")({ component: Usuarios });

function Usuarios() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    if (!getStoredSession()) {
      window.location.replace("/");
      return;
    }
    setLoading(true);
    try {
      setRequests(await dataApi.signupRequests());
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar os cadastros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function approve(id: string) {
    try {
      await dataApi.approveSignup(id);
      setNotice("Acesso aprovado.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível aprovar.");
    }
  }

  async function reject(id: string) {
    try {
      await dataApi.rejectSignup(id);
      setNotice("Cadastro excluído.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  function logout() {
    signOut();
    window.location.replace("/");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">YI</div><span className="font-semibold">Your iPhone Companion</span></div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-slate-500">Administração</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Solicitações de acesso</h1><p className="mt-2 text-sm text-slate-500">Aprove ou exclua quem pediu acesso ao sistema.</p></div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</button>
        </div>
        {notice && <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</div>}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? <div className="p-10 text-center text-sm text-slate-500">Carregando...</div> : requests.length === 0 ? <div className="p-12 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-medium">Nenhuma solicitação pendente.</p><p className="mt-1 text-sm text-slate-500">Novos cadastros aparecerão aqui para sua aprovação.</p></div> : <div className="divide-y divide-slate-100">{requests.map(request => <div key={request.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{request.full_name || "Sem nome"}</p><p className="mt-1 text-sm text-slate-600">{request.email}</p><p className="mt-1 text-xs text-slate-400">Solicitado em {new Date(request.created_at).toLocaleString("pt-BR")}</p></div><div className="flex gap-2"><button onClick={() => void approve(request.id)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Check className="h-4 w-4" /> Aprovar</button><button onClick={() => void reject(request.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Excluir</button></div></div>)}</div>}
        </div>
      </section>
    </main>
  );
}
