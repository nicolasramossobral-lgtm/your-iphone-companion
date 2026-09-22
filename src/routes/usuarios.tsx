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
    <main className="relative min-h-screen overflow-hidden bg-[#05091f] text-white"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(124,58,237,0.22),transparent_30%),radial-gradient(circle_at_85%_30%,rgba(37,99,235,0.16),transparent_34%),linear-gradient(135deg,#07113b_0%,#05091f_48%,#0a0630_100%)]" />
      <header className="relative border-b border-violet-500/20 bg-[#070c27]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/50 bg-gradient-to-br from-violet-600/70 via-blue-600/50 to-cyan-400/30 shadow-[0_0_25px_rgba(99,102,241,0.35)]"><span className="text-xs font-black text-white">YI</span></div><span className="font-semibold tracking-tight text-white">Your iPhone Companion</span></div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-slate-950/35 px-3 py-2 text-sm font-medium text-blue-100/85 transition hover:bg-violet-500/10"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </header>
      <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-blue-100/55">Administração</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Solicitações de acesso</h1><p className="mt-2 text-sm text-blue-100/55">Aprove ou exclua quem pediu acesso ao sistema.</p></div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-slate-950/45 px-3 py-2 text-sm font-medium text-blue-100/80 transition hover:bg-violet-500/10"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</button>
        </div>
        {notice && <div className="mt-5 rounded-xl border border-violet-500/20 bg-slate-950/45 px-4 py-3 text-sm text-blue-100/80 backdrop-blur-xl">{notice}</div>}
        <div className="mt-6 overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-950/45 shadow-[0_0_35px_rgba(99,102,241,0.10)] backdrop-blur-xl">
          {loading ? <div className="p-10 text-center text-sm text-blue-100/55">Carregando...</div> : requests.length === 0 ? <div className="p-12 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-violet-300/70" /><p className="mt-3 font-medium">Nenhuma solicitação pendente.</p><p className="mt-1 text-sm text-blue-100/55">Novos cadastros aparecerão aqui para sua aprovação.</p></div> : <div className="divide-y divide-violet-500/10">{requests.map(request => <div key={request.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{request.full_name || "Sem nome"}</p><p className="mt-1 text-sm text-blue-100/70">{request.email}</p><p className="mt-1 text-xs text-violet-300/70">Solicitado em {new Date(request.created_at).toLocaleString("pt-BR")}</p></div><div className="flex gap-2"><button onClick={() => void approve(request.id)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(16,185,129,0.20)] transition hover:brightness-110"><Check className="h-4 w-4" /> Aprovar</button><button onClick={() => void reject(request.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/15"><Trash2 className="h-4 w-4" /> Excluir</button></div></div>)}</div>}
        </div>
      </section>
    </main>
  );
}
