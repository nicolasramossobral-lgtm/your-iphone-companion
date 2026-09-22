import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PainelLayout } from "@/components/painel/PainelLayout";
import { AcessoDesativado, CarregandoPainel, SemPermissao } from "@/components/painel/Estados";
import { useSessao } from "@/hooks/useSessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  criarUsuario,
  definirPapelUsuario,
  definirStatusUsuario,
  listarUsuarios,
  type PapelApp,
} from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | Central de Preços" },
      { name: "description", content: "Gestão de usuários internos e papéis de acesso." },
      { property: "og:title", content: "Usuários | Central de Preços" },
      { property: "og:description", content: "Gestão de usuários internos e papéis de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaUsuarios,
});

function PaginaUsuarios() {
  const sessao = useSessao();

  if (sessao.carregando) return <CarregandoPainel />;
  if (!sessao.ativo) return <AcessoDesativado />;

  return (
    <PainelLayout sessao={sessao}>
      {sessao.papel === "admin" ? <GestaoUsuarios /> : <SemPermissao />}
    </PainelLayout>
  );
}

function GestaoUsuarios() {
  const queryClient = useQueryClient();
  const buscar = useServerFn(listarUsuarios);
  const criar = useServerFn(criarUsuario);
  const alterarStatus = useServerFn(definirStatusUsuario);
  const alterarPapel = useServerFn(definirPapelUsuario);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<PapelApp>("vendedor");

  const usuarios = useQuery({ queryKey: ["usuarios"], queryFn: () => buscar() });

  function aoFalhar(erro: unknown) {
    toast.error(erro instanceof Error ? erro.message : "Operação não permitida.");
  }

  const mutCriar = useMutation({
    mutationFn: () => criar({ data: { nome, email, senha, papel } }),
    onSuccess: (resultado) => {
      if (!resultado.ok) {
        toast.error(resultado.erro ?? "Não foi possível criar o usuário.");
        return;
      }
      toast.success("Usuário criado.");
      setNome("");
      setEmail("");
      setSenha("");
      setPapel("vendedor");
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: aoFalhar,
  });


  const mutStatus = useMutation({
    mutationFn: (v: { userId: string; ativo: boolean }) => alterarStatus({ data: v }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
    onError: aoFalhar,
  });

  const mutPapel = useMutation({
    mutationFn: (v: { userId: string; papel: PapelApp }) => alterarPapel({ data: v }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
    onError: aoFalhar,
  });

  return (
    <div>
      <header className="border-b border-border pb-6">
        <p className="mb-2 text-xs font-medium text-primary">ADMINISTRAÇÃO</p>
        <h1 className="text-3xl font-semibold text-foreground">Usuários</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Crie contas internas, defina papéis e controle quem pode acessar o painel.
        </p>
      </header>

      <section className="glass-panel mt-6 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-card-foreground">Novo usuário</h2>
        </div>

        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutCriar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="n-nome">Nome</Label>
            <Input id="n-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-email">E-mail</Label>
            <Input
              id="n-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-senha">Senha provisória</Label>
            <Input
              id="n-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={10}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-papel">Papel</Label>
            <Select value={papel} onValueChange={(v) => setPapel(v as PapelApp)}>
              <SelectTrigger id="n-papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={mutCriar.isPending}>
              {mutCriar.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Criar usuário
            </Button>
          </div>
        </form>
      </section>

      <section className="glass-panel mt-6 overflow-hidden rounded-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-card-foreground">Equipe</h2>
        </div>

        {usuarios.isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : usuarios.isError ? (
          <p className="p-5 text-sm text-muted-foreground">Não foi possível carregar a lista.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(usuarios.data ?? []).map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {u.nome || "Sem nome"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Select
                    value={u.papel ?? "vendedor"}
                    onValueChange={(v) => mutPapel.mutate({ userId: u.id, papel: v as PapelApp })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={u.ativo}
                      onCheckedChange={(valor) =>
                        mutStatus.mutate({ userId: u.id, ativo: valor })
                      }
                    />
                    {u.ativo ? "Ativo" : "Inativo"}
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
