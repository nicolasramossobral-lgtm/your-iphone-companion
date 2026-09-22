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
    <main className="min-h-screen bg-[#05091f] px-5 py-10 text-white">
      <div className="mx-auto max-w-lg rounded-[28px] border border-violet-500/70 bg-slate-950/70 p-7 shadow-[0_0_55px_rgba(99,102,241,0.22)] backdrop-blur-xl sm:p-10">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-blue-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar para o login</a>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500"><UserPlus className="h-7 w-7" /></div>
          <h1 className="text-3xl font-bold">Solicitar acesso</h1>
          <p className="mt-2 text-sm text-blue-100/70">Cadastre seus dados. O administrador aprovará ou recusará o acesso.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="h-14 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 px-4 text-white outline-none focus:border-cyan-400" />
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="h-14 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 px-4 text-white outline-none focus:border-cyan-400" />
          <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Crie sua senha" className="h-14 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 px-4 text-white outline-none focus:border-cyan-400" />
          {error && <p className="rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-500/50 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-300">{message}</p>}
          <button className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 font-semibold">Enviar cadastro</button>
        </form>
        <p className="mt-6 text-center text-xs text-blue-100/55">A senha é processada pelo Supabase Auth e não fica disponível para o administrador.</p>
      </div>
    </main>
  );
}
