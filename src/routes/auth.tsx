import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { criarPrimeiroAdmin, precisaConfiguracaoInicial } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Central de Preços" },
      {
        name: "description",
        content: "Acesso restrito à equipe interna da Central de Preços.",
      },
      { property: "og:title", content: "Entrar | Central de Preços" },
      {
        property: "og:description",
        content: "Acesso restrito à equipe interna da Central de Preços.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaAuth,
});

function PaginaAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modoInicial, setModoInicial] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    void precisaConfiguracaoInicial()
      .then((r) => vivo && setModoInicial(r.precisa))
      .catch(() => vivo && setModoInicial(false));
    void supabase.auth.getUser().then(({ data }) => {
      if (vivo && data.user) navigate({ to: "/painel", replace: true });
    });
    return () => {
      vivo = false;
    };
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error || !data.user) {
        toast.error("E-mail ou senha inválidos.");
        return;
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("ativo")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!perfil?.ativo) {
        await supabase.auth.signOut();
        toast.error("Seu acesso está desativado. Fale com um administrador.");
        return;
      }

      navigate({ to: "/painel", replace: true });
    } finally {
      setEnviando(false);
    }
  }

  async function configurar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const resultado = await criarPrimeiroAdmin({ data: { nome, email, senha } });
      if (!resultado.ok) {
        toast.error(resultado.erro ?? "Não foi possível concluir.");
        return;
      }
      toast.success("Administrador criado. Entrando...");
      setModoInicial(false);
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        toast.error("Conta criada. Entre com suas credenciais.");
        return;
      }
      navigate({ to: "/painel", replace: true });
    } catch {
      toast.error("Não foi possível concluir. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }


  return (
    <div className="ambient-gradient flex min-h-screen flex-col bg-background md:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border p-12 md:flex lg:p-16">
        <div className="absolute inset-0 bg-secondary/20 backdrop-blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="brand-gradient brand-glow flex size-10 items-center justify-center rounded-xl">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Central de Preços</p>
        </div>
        <div className="max-w-sm">
          <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" /> Ambiente seguro
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-foreground lg:text-5xl">
            Inteligência de preços para o seu <span className="text-gradient">time comercial.</span>
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">
            Acesso exclusivo para a equipe interna. Novas contas são criadas apenas por
            administradores.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">Ambiente interno · uso restrito</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="glass-panel w-full max-w-md rounded-2xl p-6 sm:p-8">
          {modoInicial === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
          <div className="mb-8">
            <div className="brand-gradient brand-glow mb-5 flex size-11 items-center justify-center rounded-xl">
              <Lock className="size-4 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {modoInicial ? "Configuração inicial" : "Entrar"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {modoInicial
                ? "Nenhum usuário existe ainda. Crie a conta do primeiro administrador."
                : "Use as credenciais fornecidas pelo administrador."}
            </p>
          </div>

          <form onSubmit={modoInicial ? configurar : entrar} className="space-y-4">

            {modoInicial && (
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete={modoInicial ? "new-password" : "current-password"}
                minLength={modoInicial ? 10 : 8}
                required
              />
              {modoInicial && (
                <p className="text-xs text-muted-foreground">
                  Use ao menos 10 caracteres com letras, números e símbolos. Senhas comuns ou
                  presentes em vazamentos são recusadas.
                </p>
              )}
            </div>


            <Button type="submit" className="w-full" disabled={enviando || modoInicial === null}>
              {enviando && <Loader2 className="mr-2 size-4 animate-spin" />}
              {modoInicial ? "Criar administrador" : "Entrar"}
            </Button>
          </form>

          {!modoInicial && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Não há cadastro público. Solicite acesso a um administrador.
            </p>
          )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
