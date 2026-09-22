import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function CarregandoPainel() {
  return (
    <div className="ambient-gradient flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AcessoDesativado() {
  const navigate = useNavigate();

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="ambient-gradient flex min-h-screen items-center justify-center bg-background px-5">
      <div className="glass-panel max-w-sm rounded-2xl p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground">Acesso desativado</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sua conta está sem papel atribuído ou foi desativada. Fale com um administrador.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void sair()}>
          Sair
        </Button>
      </div>
    </div>
  );
}

export function SemPermissao() {
  return (
    <div className="glass-panel rounded-xl p-8 text-center">
      <h1 className="text-base font-semibold text-card-foreground">Área restrita</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Somente administradores podem gerenciar usuários e permissões.
      </p>
    </div>
  );
}
