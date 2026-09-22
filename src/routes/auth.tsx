import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
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
      await criarPrimeiroAdmin({ data: { nome, email, senha } });
      toast.success("Administrador criado. Entrando...");
      setModoInicial(false);
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        toast.error("Conta criada. Entre com suas credenciais.");
        return;
      }
      navigate({ to: "/painel", replace: true });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <div className="hidden flex-1 flex-col justify-between bg-secondary/60 p-12 md:flex">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Central de Preços
        </p>
        <div className="max-w-sm">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Inteligência de preços para o seu time comercial.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Acesso exclusivo para a equipe interna. Novas contas são criadas apenas por
            administradores.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Ambiente interno · uso restrito</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {modoInicial === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
          <div className="mb-8">
            <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary">
              <Lock className="size-4 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
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
                autoComplete="current-password"
                minLength={8}
                required
              />
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
        </div>
      </div>
    </div>
  );
}
