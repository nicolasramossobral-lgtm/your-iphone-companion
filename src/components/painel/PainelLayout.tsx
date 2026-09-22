import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Menu, Tags, Users, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Sessao } from "@/hooks/useSessao";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
  const [menuAberto, setMenuAberto] = useState(false);

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

  const menu = (
    <>
      <div className="flex items-center gap-3 px-2">
        <div className="brand-gradient brand-glow flex size-9 items-center justify-center rounded-lg">
          <Zap className="size-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-primary">Painel interno</p>
          <p className="text-base font-semibold text-foreground">Central de Preços</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Menu</p>
        {navegacao
          .filter((item) => !item.somenteAdmin || sessao.papel === "admin")
          .map((item) => {
            const ativo = caminho === item.para && !item.emBreve;
            const Icone = item.icone;
            const classe = cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-all duration-200",
              ativo
                ? "bg-accent font-medium text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            );

            if (item.emBreve) {
              return (
                <span key={item.rotulo} className={cn(classe, "cursor-default opacity-50")}>
                  <Icone className="size-4" />
                  {item.rotulo}
                  <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase">
                    breve
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.rotulo}
                to={item.para}
                className={classe}
                onClick={() => setMenuAberto(false)}
              >
                <Icone className="size-4" />
                {item.rotulo}
              </Link>
            );
          })}
      </nav>

      <div className="mt-8 border-t border-border pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground">
            {iniciais}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-foreground">{sessao.nome || "Usuário"}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{sessao.papel ?? "sem papel"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => void sair()} aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="ambient-gradient min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="glass-panel sticky top-0 hidden h-screen w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-5 lg:flex">
          {menu}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/75 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMenuAberto(true)}
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </Button>
              <div>
                <p className="text-sm font-semibold text-foreground">Monitoramento</p>
                <p className="hidden text-xs text-muted-foreground sm:block">Ofertas de iPhones em um só lugar</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/35 px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-chart-5" />
              <span className="text-xs text-muted-foreground">Ambiente seguro</span>
            </div>
          </header>

          <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="glass-panel flex w-[290px] flex-col border-y-0 border-l-0 p-5">
          <SheetTitle className="sr-only">Navegação principal</SheetTitle>
          {menu}
        </SheetContent>
      </Sheet>
    </div>
  );
}
