import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Smartphone, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { dataApi } from "../lib/supabase-data";
import { recoverSessionFromUrl, resetPassword, signIn, signUp, updatePassword } from "../lib/supabase-auth";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    void recoverSessionFromUrl().then((recovered) => setRecoveryMode(recovered)).catch((err) => setError(err instanceof Error ? err.message : "Link de recuperação inválido."));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const session = await signIn(email.trim(), password, remember);
      const role = await dataApi.role();
      if (!role) { localStorage.removeItem("your-iphone-companion.auth"); sessionStorage.removeItem("your-iphone-companion.session"); throw new Error("Seu acesso ainda não foi aprovado pelo administrador."); }
      window.location.assign("/painel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName);
      setPassword("");
      setStatus("Cadastro enviado. Aguarde a aprovação do administrador para acessar o sistema.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o cadastro.");
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
    <main className="relative min-h-screen overflow-hidden bg-[#05091f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(124,58,237,0.28),transparent_30%),radial-gradient(circle_at_78%_72%,rgba(37,99,235,0.2),transparent_34%),linear-gradient(135deg,#07113b_0%,#05091f_48%,#0a0630_100%)]" />
      <div className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[760px] rotate-[-25deg] bg-gradient-to-br from-violet-700/50 via-blue-700/10 to-transparent blur-2xl" />
      <div className="pointer-events-none absolute -bottom-64 left-[45%] h-[520px] w-[700px] rotate-[-30deg] bg-gradient-to-br from-violet-700/30 to-transparent blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-violet-400/50 bg-gradient-to-br from-violet-600/70 via-blue-600/50 to-cyan-400/40 shadow-[0_0_30px_rgba(99,102,241,0.45)]">
              <Smartphone className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight">NG IPhones</div>
              <div className="text-lg font-bold tracking-tight text-violet-400">BR</div>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-blue-200/80 md:flex">
            <span>Tecnologia</span>
            <span className="text-white/60">•</span>
            <span>Negócios</span>
            <span className="text-white/60">•</span>
            <span>Resultados</span>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 xl:gap-20">
          <section className="relative hidden min-h-[650px] lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-xl">
              <p className="mb-4 text-xl font-semibold text-transparent bg-gradient-to-r from-indigo-300 via-blue-400 to-violet-400 bg-clip-text">
                Bem-vindo ao
              </p>
              <h1 className="text-5xl font-bold leading-[0.98] tracking-tight xl:text-6xl">
                NG IPhones
                <span className="block bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  BR
                </span>
              </h1>
              <p className="mt-7 max-w-md text-lg leading-8 text-blue-100/75">
                Compare preços, encontre os melhores fornecedores e maximize seus lucros com a NG IPhones BR.
              </p>
            </div>

            <div className="relative mt-8 h-[380px] w-full max-w-2xl">
              <div className="absolute left-[28%] top-[16%] h-48 w-48 rounded-full bg-fuchsia-600/35 blur-3xl" />
              <div className="absolute left-[38%] top-[10%] h-64 w-64 rounded-full bg-blue-600/25 blur-3xl" />
              <div className="absolute left-[25%] top-[38%] h-24 w-[430px] rotate-[-12deg] rounded-[50%] border-2 border-fuchsia-500/80 shadow-[0_0_35px_rgba(168,85,247,0.8),0_0_70px_rgba(37,99,235,0.5)]" />

              <div className="absolute left-[40%] top-[3%] h-[310px] w-[155px] rotate-[8deg] rounded-[34px] border-[3px] border-violet-300/80 bg-gradient-to-br from-slate-800 via-indigo-950 to-blue-900 p-2 shadow-[0_20px_60px_rgba(59,130,246,0.45)]">
                <div className="relative h-full overflow-hidden rounded-[27px] bg-[radial-gradient(circle_at_65%_25%,#7c3aed,transparent_35%),linear-gradient(145deg,#070b28,#071c58_55%,#0ea5e9)]">
                  <div className="absolute left-1/2 top-2 h-5 w-16 -translate-x-1/2 rounded-full bg-black/90" />
                  <div className="absolute -right-1 top-24 h-12 w-1 rounded-full bg-blue-300/60" />
                  <div className="absolute inset-x-4 bottom-5 h-32 rounded-full bg-gradient-to-tr from-fuchsia-500/80 via-violet-500/40 to-cyan-300/70 blur-xl" />
                </div>
              </div>

              <div className="absolute left-[26%] top-[10%] h-[315px] w-[158px] rotate-[-13deg] rounded-[34px] border-[3px] border-violet-200/70 bg-gradient-to-br from-purple-700 via-indigo-950 to-blue-900 p-2 shadow-[0_20px_60px_rgba(124,58,237,0.55)]">
                <div className="relative h-full overflow-hidden rounded-[27px] bg-gradient-to-br from-indigo-900 via-violet-700 to-blue-950">
                  <div className="absolute inset-5 rounded-[25px] bg-[radial-gradient(circle_at_30%_25%,#c084fc,transparent_25%),radial-gradient(circle_at_70%_75%,#22d3ee,transparent_32%),linear-gradient(145deg,#10002d,#172554)]" />
                  <div className="absolute -right-1 top-20 h-16 w-1 rounded-full bg-violet-200/70" />
                  <div className="absolute -left-1 top-24 h-12 w-1 rounded-full bg-violet-200/50" />
                </div>
                <div className="absolute -left-5 top-9 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-slate-300/60 bg-slate-900/90 shadow-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="h-5 w-5 rounded-full bg-slate-950 ring-2 ring-slate-400/50" />
                    <span className="h-5 w-5 rounded-full bg-slate-950 ring-2 ring-slate-400/50" />
                    <span className="h-5 w-5 rounded-full bg-slate-950 ring-2 ring-slate-400/50" />
                    <span className="h-5 w-5 rounded-full bg-slate-950 ring-2 ring-slate-400/50" />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-[20%] h-12 w-[430px] rounded-full bg-blue-500/20 blur-2xl" />
            </div>
          </section>

          <section className="flex w-full justify-center lg:justify-end">
            <div className="ui-3d-surface w-full max-w-xl rounded-[28px] border border-violet-500/80 bg-slate-950/55 p-6 shadow-[0_0_55px_rgba(99,102,241,0.22)] backdrop-blur-xl sm:p-8 md:p-10">
              <div className="mx-auto max-w-md">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/60 bg-gradient-to-br from-violet-600/70 via-blue-600/50 to-cyan-400/30 shadow-[0_0_35px_rgba(99,102,241,0.4)]">
                    <Smartphone className="h-8 w-8 text-white" strokeWidth={1.7} />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Bem-vindo de volta</h2>
                  <p className="mt-2 text-sm leading-6 text-blue-100/70">
                    Entre com suas credenciais para acessar o sistema.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-blue-100">E-mail</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-300" />
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-16 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-blue-200/55 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-blue-100">Senha</span>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-300" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        placeholder="Digite sua senha"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-16 w-full rounded-2xl border border-indigo-500/45 bg-indigo-950/45 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-blue-200/55 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="login-password-toggle rounded-lg p-2 text-blue-300 transition hover:bg-white/10 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </label>

                  {error && <p role="alert" className="rounded-2xl border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</p>}
                  {status && <p role="status" className="rounded-2xl border border-emerald-500/50 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-300">{status}</p>}

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-blue-100/80">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        className="h-5 w-5 rounded border-violet-400/70 bg-indigo-950/60 accent-violet-500"
                      />
                      Lembrar de mim
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="font-medium text-violet-300 transition hover:text-cyan-300 hover:underline disabled:opacity-50"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 text-base font-semibold text-white shadow-[0_10px_35px_rgba(79,70,229,0.35)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#080b25] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Entrar
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>

                <p className="mt-8 border-t border-indigo-500/25 pt-6 text-center text-xs leading-5 text-blue-100/65">
                  O acesso é controlado pelo administrador do sistema.
                </p>
                <a href="/cadastro" className="mt-4 block text-center text-sm font-medium text-violet-300 hover:text-cyan-300 hover:underline">Solicitar acesso</a>
              </div>
            </div>
          </section>
        </div>

        <footer className="hidden pb-2 text-sm text-blue-200/70 lg:block">
          © {new Date().getFullYear()} NG IPhones BR
        </footer>
      </div>
    </main>
  );
}
