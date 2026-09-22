import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { resetPassword, signIn } from "../lib/supabase-auth";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      window.location.assign("/painel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await resetPassword(normalizedEmail);
      setStatus("Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o e-mail de recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between p-10 lg:flex xl:p-16">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">
                YI
              </div>
              <span className="text-lg font-semibold tracking-tight">Your iPhone Companion</span>
            </div>
          </div>
          <div className="max-w-lg pb-8">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Gestão inteligente
            </p>
            <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
              Controle seus produtos, fornecedores e preços em um só lugar.
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-400">
              Acesse seu painel para acompanhar ofertas, estoque e informações do seu catálogo.
            </p>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Your iPhone Companion</p>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 text-slate-950 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                  YI
                </div>
                <span className="text-lg font-semibold tracking-tight">Your iPhone Companion</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight">Bem-vindo de volta</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Entre com suas credenciais para acessar o sistema.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">E-mail</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Senha</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {status && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Lembrar de mim
                </label>
                <button type="button" onClick={handleForgotPassword} disabled={loading} className="font-medium text-slate-900 hover:underline disabled:opacity-50">
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              >
                Entrar
              </button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              O acesso é controlado pelo administrador do sistema.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
