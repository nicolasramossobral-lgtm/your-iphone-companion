import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Tags, Users } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Sessao } from "@/hooks/useSessao";

type ItemNav = {
  para: string;
  rotulo: string;
  icone: typeof LayoutDashboard;
  somenteAdmin?: boolean;
  emBreve?: boolean;
};

const navegacao: ItemNav[] = [
  { para: "/painel", rotulo: "Visão geral", icone: LayoutDashboard },
  { para: "/painel", rotulo: "Preços", icone: Tags, emBreve: true },
  { para: "/usuarios", rotulo: "Usuários", icone: Users, somenteAdmin: true },
];

export function PainelLayout({ sessao, children }: { sessao: Sessao; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const iniciais = (sessao.nome || sessao.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-8 md:py-10">
        <aside className="md:w-60 md:shrink-0">
          <div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:gap-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Painel interno
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Central de Preços
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {iniciais}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-foreground">{sessao.nome || "Usuário"}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {sessao.papel ?? "sem papel"}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex gap-1 overflow-x-auto md:mt-8 md:flex-col md:overflow-visible">
            {navegacao
              .filter((item) => !item.somenteAdmin || sessao.papel === "admin")
              .map((item) => {
                const ativo = caminho === item.para && !item.emBreve;
                const Icone = item.icone;
                const classe = cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                );

                if (item.emBreve) {
                  return (
                    <span
                      key={item.rotulo}
                      className={cn(classe, "cursor-default opacity-55 hover:bg-transparent")}
                    >
                      <Icone className="size-4" />
                      {item.rotulo}
                      <span className="ml-auto hidden rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide md:inline">
                        breve
                      </span>
                    </span>
                  );
                }

                return (
                  <Link key={item.rotulo} to={item.para} className={classe}>
                    <Icone className="size-4" />
                    {item.rotulo}
                  </Link>
                );
              })}

            <button
              type="button"
              onClick={() => void sair()}
              className="mt-0 flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground md:mt-4"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
