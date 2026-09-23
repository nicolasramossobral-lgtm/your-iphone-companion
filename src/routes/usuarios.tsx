import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronLeft, LogOut, RefreshCw, ShieldCheck, Smartphone, Trash2, Truck, Users, X } from "lucide-react";
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
    <main className="app-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="app-ambient" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] lg:flex">
        <div className="flex h-[72px] items-center gap-3 border-b border-[var(--app-border)] px-5">
          <div className="brand-mark"><Smartphone className="h-5 w-5 text-white" strokeWidth={1.8} /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-purple)]">Painel interno</p>
            <p className="truncate text-sm font-semibold">NG IPhones BR</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">Navegação</p>
          <a href="/painel" className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-[13px] font-medium text-[var(--app-secondary)] transition hover:bg-white/[0.035] hover:text-white">
            <ChevronLeft className="h-4 w-4 text-[var(--app-muted)]" /> Voltar ao painel
          </a>
          <div className="mt-1 flex items-center gap-3 rounded-lg border border-indigo-400/20 bg-indigo-500/12 px-3 py-2.5 text-[13px] font-medium text-white shadow-[inset_2px_0_0_var(--app-purple)]">
            <Users className="h-4 w-4 text-[var(--app-purple)]" /> Usuários
          </div>
        </nav>
        <div className="border-t border-[var(--app-border)] p-3">
          <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-[12px] font-medium text-[var(--app-secondary)] transition hover:border-rose-400/20 hover:bg-rose-500/5 hover:text-rose-300">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-[230px]">
        <header className="sticky top-0 z-30 h-[72px] border-b border-[var(--app-border)] bg-[var(--app-header)]/95 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-5 sm:px-7 lg:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-purple)]">Administração</p>
              <h1 className="mt-1 text-[15px] font-semibold">Solicitações de acesso</h1>
            </div>
            <button onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3.5 text-[13px] font-medium text-[var(--app-text)] transition hover:border-indigo-400/30 hover:bg-indigo-500/10 disabled:opacity-70">
              <RefreshCw className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(" ")} /> Atualizar
            </button>
          </div>
        </header>

        <section className="relative mx-auto max-w-[1200px] px-5 py-7 sm:px-7 lg:px-8">
          <div className="mb-6">
            <p className="section-kicker">Acessos</p>
            <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.025em]">Usuários</h2>
            <p className="mt-1 text-[13px] text-[var(--app-secondary)]">Aprove ou exclua solicitações pendentes sem alterar as permissões existentes.</p>
          </div>

          {notice && (
            <div className="mb-5 flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-[13px] text-[var(--app-secondary)]">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)}><X className="h-4 w-4 text-[var(--app-muted)]" /></button>
            </div>
          )}

          <section className="panel-card overflow-hidden">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Fila de aprovação</p>
                <h3 className="panel-title">Solicitações pendentes</h3>
              </div>
              <Users className="h-4 w-4 text-[var(--app-purple)]" />
            </div>

            {loading ? (
              <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-white/[0.035]" />)}</div>
            ) : requests.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                  <ShieldCheck className="h-5 w-5 text-[var(--app-purple)]" />
                </div>
                <p className="mt-3 text-[13px] font-medium">Nenhuma solicitação pendente</p>
                <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[var(--app-muted)]">Novos cadastros aparecerão aqui para aprovação.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-border)]">
                {requests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-semibold text-violet-200">
                        {(request.full_name || request.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{request.full_name || "Sem nome"}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--app-secondary)]">{request.email}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--app-muted)]">Solicitado em {new Date(request.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      <button onClick={() => void approve(request.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 text-[11px] font-semibold text-slate-950 transition hover:bg-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Aprovar
                      </button>
                      <button onClick={() => void reject(request.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/15">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
