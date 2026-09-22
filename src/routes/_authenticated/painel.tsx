import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Layers, LineChart, ShieldCheck } from "lucide-react";

import { PainelLayout } from "@/components/painel/PainelLayout";
import { useSessao } from "@/hooks/useSessao";
import { AcessoDesativado, CarregandoPainel } from "@/components/painel/Estados";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Visão geral | Central de Preços" },
      { name: "description", content: "Painel interno da Central de Preços." },
      { property: "og:title", content: "Visão geral | Central de Preços" },
      { property: "og:description", content: "Painel interno da Central de Preços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

const espacos = [
  {
    titulo: "Preços por fornecedor",
    descricao: "Em breve: catálogo de preços recebidos, com histórico e origem.",
    icone: Layers,
  },
  {
    titulo: "Comparação de ofertas",
    descricao: "Em breve: melhor preço por modelo, com variação e margem.",
    icone: BarChart3,
  },
  {
    titulo: "Tendência de mercado",
    descricao: "Em breve: evolução dos preços ao longo do tempo.",
    icone: LineChart,
  },
];

function Painel() {
  const sessao = useSessao();

  if (sessao.carregando) return <CarregandoPainel />;
  if (!sessao.ativo) return <AcessoDesativado />;

  return (
    <PainelLayout sessao={sessao}>
      <header className="border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Olá, {sessao.nome.split(" ")[0] || "bem-vindo"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Esta é a base do painel. Os módulos de preços serão adicionados nas próximas etapas.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {espacos.map((item) => {
          const Icone = item.icone;
          return (
            <article
              key={item.titulo}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <Icone className="size-5 text-muted-foreground" />
              <h2 className="mt-4 text-sm font-semibold text-card-foreground">{item.titulo}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.descricao}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-secondary/40 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Seu nível de acesso</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {sessao.papel === "admin"
                ? "Administrador: você pode criar usuários, ativar ou desativar acessos e definir papéis."
                : "Vendedor: acesso de consulta. Criação de usuários e permissões são restritas a administradores."}
            </p>
          </div>
        </div>
      </section>
    </PainelLayout>
  );
}
