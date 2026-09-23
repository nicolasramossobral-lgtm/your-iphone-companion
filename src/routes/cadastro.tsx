import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { signUp } from "../lib/supabase-auth";

export const Route = createFileRoute("/cadastro")({ component: Cadastro });

function Cadastro() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await signUp(email.trim(), password, name);
      setPassword("");
      setMessage("Cadastro enviado. Aguarde a aprovação do administrador para acessar o sistema.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o cadastro.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-5 py-10 text-[var(--app-text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.09),transparent_30%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.07),transparent_30%)]" />
      <div className="relative">
      <div className="ui-3d-surface mx-auto max-w-lg rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_8px_28px_rgba(0,0,0,0.16)] sm:p-8">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--app-secondary)] hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar para o login</a>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-indigo-500/10"><UserPlus className="h-7 w-7" /></div>
          <h1 className="text-[28px] font-semibold">Solicitar acesso</h1>
          <p className="mt-2 text-sm text-[var(--app-secondary)]">Cadastre seus dados. O administrador aprovará ou recusará o acesso.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="app-input h-10 w-full px-4 text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10" />
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="h-14 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 px-4 text-white outline-none focus:border-violet-400" />
          <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Crie sua senha" className="h-14 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 px-4 text-white outline-none focus:border-cyan-400" />
          {error && <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}
          <button className="flex h-10 w-full items-center justify-center rounded-lg bg-[var(--app-purple)] text-[13px] font-semibold">Enviar cadastro</button>
        </form>
        <p className="mt-6 text-center text-[11px] text-[var(--app-muted)]">A senha é processada pelo Supabase Auth e não fica disponível para o administrador.</p>
      </div>
      </div>
    </main>
  );
}
