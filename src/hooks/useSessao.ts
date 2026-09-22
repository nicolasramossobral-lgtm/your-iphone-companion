import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { PapelApp } from "@/lib/usuarios.functions";

export type Sessao = {
  carregando: boolean;
  user: User | null;
  nome: string;
  email: string;
  ativo: boolean;
  papel: PapelApp | null;
};

const inicial: Sessao = {
  carregando: true,
  user: null,
  nome: "",
  email: "",
  ativo: false,
  papel: null,
};

export function useSessao(): Sessao {
  const [sessao, setSessao] = useState<Sessao>(inicial);

  useEffect(() => {
    let ativoNoEfeito = true;

    async function carregar() {
      const { data } = await supabase.auth.getUser();
      const user = data.user ?? null;
      if (!ativoNoEfeito) return;

      if (!user) {
        setSessao({ ...inicial, carregando: false });
        return;
      }

      const [{ data: perfil }, { data: papeis }] = await Promise.all([
        supabase.from("profiles").select("nome, email, ativo").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!ativoNoEfeito) return;

      setSessao({
        carregando: false,
        user,
        nome: perfil?.nome ?? "",
        email: perfil?.email ?? user.email ?? "",
        ativo: perfil?.ativo ?? false,
        papel: (papeis?.[0]?.role as PapelApp | undefined) ?? null,
      });
    }

    void carregar();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void carregar();
      }
    });

    return () => {
      ativoNoEfeito = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return sessao;
}
