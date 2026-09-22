import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  BarChart3,
  Boxes,
  Building2,
  Clock3,
  PackageOpen,
  RefreshCw,
  Sparkles,
  Tag,
} from "lucide-react";

import { PainelLayout } from "@/components/painel/PainelLayout";
import { useSessao } from "@/hooks/useSessao";
import { AcessoDesativado, CarregandoPainel } from "@/components/painel/Estados";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { carregarDashboard, type DashboardData, type OfertaDashboard } from "@/lib/dashboard.functions";

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

function Painel() {
  const sessao = useSessao();

  if (sessao.carregando) return <CarregandoPainel />;
  if (!sessao.ativo) return <AcessoDesativado />;

  return (
    <PainelLayout sessao={sessao}>
      <Dashboard nome={sessao.nome} />
    </PainelLayout>
  );
}

const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Dashboard({ nome }: { nome: string }) {
  const buscar = useServerFn(carregarDashboard);
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => buscar() });
  const dados = dashboard.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-primary">Visão geral</p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Olá, {nome.split(" ")[0] || "bem-vindo"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe as oportunidades mais recentes do catálogo.</p>
        </div>
        <Button variant="outline" onClick={() => void dashboard.refetch()} disabled={dashboard.isFetching}>
          <RefreshCw className={dashboard.isFetching ? "size-4 animate-spin" : "size-4"} />
          Atualizar
        </Button>
      </header>

      {dashboard.isError ? (
        <section className="glass-panel rounded-xl p-8 text-center" role="alert">
          <PackageOpen className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold text-foreground">Não foi possível carregar o dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tente atualizar os dados em alguns instantes.</p>
        </section>
      ) : (
        <>
          <Resumo dados={dados} carregando={dashboard.isLoading} />
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <OfertasRecentes ofertas={dados?.ofertas.slice(0, 3) ?? []} carregando={dashboard.isLoading} />
            <section className="glass-panel flex min-h-64 flex-col rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">Inteligência</p>
                  <h2 className="mt-1 text-base font-semibold text-foreground">Evolução de preços</h2>
                </div>
                <BarChart3 className="size-5 text-muted-foreground" />
              </div>
              <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20 px-5 text-center">
                <Sparkles className="size-6 text-primary" />
                <p className="mt-3 text-sm font-medium text-foreground">Histórico em preparação</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Os gráficos aparecerão quando houver dados suficientes para uma leitura confiável.
                </p>
              </div>
            </section>
          </div>
          <Comparacao ofertas={dados?.ofertas ?? []} carregando={dashboard.isLoading} />
        </>
      )}
    </div>
  );
}

function Resumo({ dados, carregando }: { dados: DashboardData | undefined; carregando: boolean }) {
  const itens = [
    { titulo: "Melhor preço atual", valor: dados?.melhorPreco != null ? dinheiro.format(dados.melhorPreco) : "—", detalhe: "Entre ofertas disponíveis", icone: Tag },
    { titulo: "Ofertas disponíveis", valor: String(dados?.quantidadeOfertas ?? 0), detalhe: "Itens monitorados", icone: Boxes },
    { titulo: "Fornecedores ativos", valor: String(dados?.fornecedoresAtivos ?? 0), detalhe: "Fontes disponíveis", icone: Building2 },
    { titulo: "Última atualização", valor: dados?.ultimaAtualizacao ? dataHora.format(new Date(dados.ultimaAtualizacao)) : "—", detalhe: "Data e hora da coleta", icone: Clock3 },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores gerais">
      {itens.map((item) => (
        <article key={item.titulo} className="glass-panel rounded-xl p-5 transition-colors hover:border-primary/35">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{item.titulo}</p>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"><item.icone className="size-4" /></div>
          </div>
          {carregando ? <Skeleton className="mt-5 h-8 w-28" /> : <p className="mt-4 text-2xl font-semibold text-foreground">{item.valor}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{item.detalhe}</p>
        </article>
      ))}
    </section>
  );
}

function OfertasRecentes({ ofertas, carregando }: { ofertas: OfertaDashboard[]; carregando: boolean }) {
  return (
    <section className="glass-panel rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase text-primary">Radar</p><h2 className="mt-1 text-base font-semibold text-foreground">Ofertas mais recentes</h2></div>
        <ArrowDownRight className="size-5 text-primary" />
      </div>
      {carregando ? (
        <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : ofertas.length === 0 ? (
        <EstadoVazio compacto />
      ) : (
        <div className="mt-4 divide-y divide-border">
          {ofertas.map((oferta) => (
            <div key={oferta.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{oferta.modelo} · {oferta.capacidade}</p><p className="truncate text-xs text-muted-foreground">{oferta.fornecedor} · {oferta.cor}</p></div>
              <p className="shrink-0 text-sm font-semibold text-foreground">{dinheiro.format(oferta.preco)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Comparacao({ ofertas, carregando }: { ofertas: OfertaDashboard[]; carregando: boolean }) {
  return (
    <section className="glass-panel overflow-hidden rounded-xl">
      <div className="border-b border-border px-5 py-4"><p className="text-xs font-semibold uppercase text-primary">Comparação</p><h2 className="mt-1 text-base font-semibold text-foreground">Todas as ofertas</h2></div>
      {carregando ? <div className="space-y-3 p-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-16 w-full" /></div> : ofertas.length === 0 ? <EstadoVazio /> : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-5">Modelo</TableHead><TableHead>Capacidade</TableHead><TableHead>Cor</TableHead><TableHead>Condição</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Fornecedor</TableHead><TableHead className="pr-5">Atualização</TableHead></TableRow></TableHeader>
              <TableBody>{ofertas.map((o) => <TableRow key={o.id}><TableCell className="pl-5 font-medium text-foreground">{o.modelo}</TableCell><TableCell>{o.capacidade}</TableCell><TableCell>{o.cor}</TableCell><TableCell><Badge variant="outline" className="capitalize">{o.condicao}</Badge></TableCell><TableCell className="font-semibold text-foreground">{dinheiro.format(o.preco)}</TableCell><TableCell>{o.estoque}</TableCell><TableCell>{o.fornecedor}</TableCell><TableCell className="pr-5 text-muted-foreground">{dataHora.format(new Date(o.coletadoEm))}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border lg:hidden">{ofertas.map((o) => <li key={o.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-foreground">{o.modelo}</p><p className="text-xs text-muted-foreground">{o.capacidade} · {o.cor}</p></div><p className="font-semibold text-foreground">{dinheiro.format(o.preco)}</p></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline" className="capitalize">{o.condicao}</Badge><span>{o.estoque} em estoque</span><span>·</span><span>{o.fornecedor}</span><span>·</span><time>{dataHora.format(new Date(o.coletadoEm))}</time></div></li>)}</ul>
        </>
      )}
    </section>
  );
}

function EstadoVazio({ compacto = false }: { compacto?: boolean }) {
  return <div className={compacto ? "mt-5 rounded-lg border border-dashed border-border px-5 py-8 text-center" : "px-5 py-14 text-center"}><PackageOpen className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-foreground">Nenhuma oferta disponível</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Quando fornecedores e ofertas forem adicionados, os dados aparecerão aqui automaticamente.</p></div>;
}
