import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Tags,
  Truck,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStoredSession, signOut } from "../lib/supabase-auth";
import {
  dataApi,
  type Offer,
  type PriceHistory,
  type Product,
  type Supplier,
  type Variant,
} from "../lib/supabase-data";

export const Route = createFileRoute("/painel")({ component: Dashboard });

type Tab = "inicio" | "produtos" | "fornecedores" | "ofertas" | "comparador";

const navItems: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "inicio", label: "Painel", icon: LayoutDashboard },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "fornecedores", label: "Fornecedores", icon: Truck },
  { id: "ofertas", label: "Ofertas", icon: Tags },
  { id: "comparador", label: "Comparador", icon: GitCompare },
];

function Dashboard() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modal, setModal] = useState<"product" | "supplier" | "offer" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const session = getStoredSession();
    if (!session) {
      window.location.replace("/");
      return;
    }

    setLoading(true);
    try {
      const [p, v, s, o, h, currentRole, currentProfile] = await Promise.all([
        dataApi.products(),
        dataApi.variants(),
        dataApi.suppliers(),
        dataApi.offers(),
        dataApi.priceHistory(),
        dataApi.role(),
        dataApi.profile(),
      ]);
      setProducts(p);
      setVariants(v);
      setSuppliers(s);
      setOffers(o);
      setHistory(h);
      setRole(currentRole);
      setProfile(currentProfile);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canManage = role === "admin";
  const displayName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || getStoredSession()?.user.email?.split("@")[0] || "Usuário";
  const firstName = displayName.split(/\s+/)[0] || "Usuário";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  const productName = (variantId: string) => {
    const variant = variants.find((item) => item.id === variantId);
    const product = variant ? products.find((item) => item.id === variant.product_id) : undefined;
    return variant
      ? `${product?.model ?? "Produto"} · ${variant.storage_gb} GB · ${variant.color}`
      : "Variante";
  };

  const supplierName = (supplierId: string) =>
    suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "Fornecedor";

  const activeOffers = useMemo(() => offers.filter((offer) => offer.active), [offers]);
  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.active), [suppliers]);

  const bestOffer = useMemo(
    () => activeOffers.reduce<Offer | null>((best, offer) => (!best || Number(offer.price) < Number(best.price) ? offer : best), null),
    [activeOffers],
  );

  const latestUpdate = useMemo(() => {
    const timestamps = activeOffers.map((offer) => offer.observed_at).filter(Boolean);
    return timestamps.length ? new Date(Math.max(...timestamps.map((value) => new Date(value).getTime()))) : null;
  }, [activeOffers]);

  const recentOffers = useMemo(
    () => [...activeOffers].sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()).slice(0, 7),
    [activeOffers],
  );

  const historyChart = useMemo(() => {
    const rows = [...history]
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
      .slice(-12);
    return rows.map((row) => ({
      date: new Date(row.observed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      price: Number(row.price),
      label: `${productName(row.product_variant_id)} · ${supplierName(row.supplier_id)}`,
    }));
  }, [history, products, variants, suppliers]);

  const filteredProducts = useMemo(
    () => products.filter((product) => product.model.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );
  const filteredSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.name.toLowerCase().includes(search.toLowerCase())),
    [suppliers, search],
  );

  async function saveProduct(model: string, storage: string, color: string, condition: string, sku: string) {
    const [product] = await dataApi.addProduct(model);
    if (!product) throw new Error("Produto não retornado.");
    await dataApi.addVariant({
      product_id: product.id,
      storage_gb: Number(storage),
      color,
      condition,
      sku: sku || null,
    });
    setModal(null);
    setNotice("Produto cadastrado.");
    await load();
  }

  async function saveSupplier(name: string, legalName: string) {
    await dataApi.addSupplier(name, legalName);
    setModal(null);
    setNotice("Fornecedor cadastrado.");
    await load();
  }

  async function saveOffer(supplierId: string, variantId: string, price: string, stock: string) {
    await dataApi.addOffer({
      supplier_id: supplierId,
      product_variant_id: variantId,
      price: Number(price),
      stock_quantity: stock === "" ? null : Number(stock),
    });
    setModal(null);
    setNotice("Oferta cadastrada.");
    await load();
  }

  function logout() {
    signOut();
    window.location.replace("/");
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setSearch("");
    setMobileNavOpen(false);
  }

  return (
    <main className="app-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="app-ambient" />

      <button
        aria-label="Abrir menu"
        onClick={() => setMobileNavOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-header)] text-[var(--app-muted)] shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileNavOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[230px] flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] transition-transform duration-200",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-[72px] items-center gap-3 border-b border-[var(--app-border)] px-5">
          <div className="brand-mark">
            <Smartphone className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-purple)]">Painel interno</p>
            <p className="truncate text-sm font-semibold text-[var(--app-text)]">NG IPhones BR</p>
          </div>
          <button onClick={() => setMobileNavOpen(false)} className="ml-auto rounded-md p-1 text-[var(--app-muted)] hover:bg-white/5 lg:hidden">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">Navegação</p>
          <nav className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={[
                  "group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition",
                  tab === id
                    ? "border-indigo-400/20 bg-indigo-500/12 text-white shadow-[inset_2px_0_0_var(--app-purple)]"
                    : "border-transparent text-[var(--app-secondary)] hover:bg-white/[0.035] hover:text-[var(--app-text)]",
                ].join(" ")}
              >
                <Icon className={["h-4 w-4 shrink-0", tab === id ? "text-[var(--app-purple)]" : "text-[var(--app-muted)]"].join(" ")} strokeWidth={1.8} />
                {label}
              </button>
            ))}
            {canManage && (
              <a
                href="/usuarios"
                className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-[13px] font-medium text-[var(--app-secondary)] transition hover:bg-white/[0.035] hover:text-[var(--app-text)]"
              >
                <Users className="h-4 w-4 text-[var(--app-muted)]" strokeWidth={1.8} />
                Usuários
              </a>
            )}
          </nav>

        </div>

        <div className="border-t border-[var(--app-border)] p-3">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-violet-200">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--app-text)]">{displayName}</p>
              <p className="truncate text-[11px] text-[var(--app-muted)]">{canManage ? "Administrador" : "Fornecedor"}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Sair"
              className="rounded-md p-1.5 text-[var(--app-muted)] transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[230px]">
        <header className="sticky top-0 z-30 h-[72px] border-b border-[var(--app-border)] bg-[var(--app-header)]/95 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between gap-4 px-5 pl-16 sm:px-7 sm:pl-16 lg:px-8 lg:pl-8">
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--app-text)]">Monitoramento</h1>
              <p className="mt-0.5 text-[12px] text-[var(--app-muted)]">Ofertas de iPhones em um só lugar</p>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-[12px] font-medium text-[var(--app-secondary)]">{profile?.email ?? getStoredSession()?.user.email ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">{canManage ? "Administrador" : "Fornecedor"}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)]">
                <UserCircle2 className="h-4 w-4 text-[var(--app-muted)]" />
              </div>
            </div>
          </div>
        </header>

        <section className="relative mx-auto max-w-[1400px] px-5 py-6 sm:px-7 lg:px-8 lg:py-7">
          {notice && (
            <div className="mb-5 flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-[13px] text-[var(--app-secondary)]">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} className="ml-4 rounded-md p-1 text-[var(--app-muted)] hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {tab === "inicio" && (
            <>
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="section-kicker">Visão geral</p>
                  <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.025em] text-[var(--app-text)]">Olá, {firstName}</h2>
                  <p className="mt-1 text-[13px] text-[var(--app-secondary)]">Acompanhe as oportunidades mais recentes do catálogo</p>
                </div>
                <button
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3.5 text-[13px] font-medium text-[var(--app-text)] transition hover:border-indigo-400/30 hover:bg-indigo-500/10 disabled:cursor-wait disabled:opacity-70"
                >
                  <RefreshCw className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(" ")} />
                  Atualizar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Melhor preço atual"
                  value={bestOffer ? formatCurrency(bestOffer.price) : "—"}
                  description={bestOffer ? productName(bestOffer.product_variant_id) : "Nenhuma oferta ativa"}
                  icon={CircleDollarSign}
                />
                <MetricCard
                  title="Ofertas disponíveis"
                  value={loading ? "—" : String(activeOffers.length)}
                  description={activeOffers.length ? "Ofertas ativas no catálogo" : "Nenhuma oferta cadastrada"}
                  icon={Tags}
                />
                <MetricCard
                  title="Fornecedores ativos"
                  value={loading ? "—" : String(activeSuppliers.length)}
                  description={activeSuppliers.length ? "Fornecedores disponíveis" : "Nenhum fornecedor ativo"}
                  icon={Truck}
                />
                <MetricCard
                  title="Última atualização"
                  value={latestUpdate ? formatRelativeDate(latestUpdate) : "—"}
                  description={latestUpdate ? latestUpdate.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Ainda sem atualização"}
                  icon={Clock3}
                />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
                <section className="panel-card min-w-0">
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">Radar</p>
                      <h3 className="panel-title">Ofertas mais recentes</h3>
                    </div>
                    <Activity className="h-4 w-4 text-[var(--app-purple)]" />
                  </div>
                  <div className="divide-y divide-[var(--app-border)]">
                    {loading ? (
                      <LoadingRows />
                    ) : recentOffers.length === 0 ? (
                      <EmptyState icon={Tags} title="Nenhuma oferta encontrada" description="Quando houver ofertas ativas, elas aparecerão aqui." />
                    ) : (
                      recentOffers.map((offer) => (
                        <div key={offer.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[var(--app-text)]">{productName(offer.product_variant_id)}</p>
                            <p className="mt-1 text-[11px] text-[var(--app-muted)]">{supplierName(offer.supplier_id)} · {formatRelativeDate(new Date(offer.observed_at))}</p>
                          </div>
                          <div className="flex items-center gap-4 sm:text-right">
                            <div>
                              <p className="text-[15px] font-semibold text-[var(--app-text)]">{formatCurrency(offer.price)}</p>
                              <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--app-muted)]">preço</p>
                            </div>
                            <div className="hidden h-8 w-px bg-[var(--app-border)] sm:block" />
                            <div className="min-w-14">
                              <p className="text-[13px] font-medium text-[var(--app-secondary)]">{offer.stock_quantity ?? "—"}</p>
                              <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--app-muted)]">estoque</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="panel-card min-w-0">
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">Histórico</p>
                      <h3 className="panel-title">Evolução de preços</h3>
                    </div>
                    <BarChart3 className="h-4 w-4 text-[var(--app-purple)]" />
                  </div>
                  {historyChart.length >= 2 ? (
                    <div className="h-[270px] px-2 pb-4 pt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyChart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                          <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => `R$ ${Math.round(value)}`} />
                          <Tooltip
                            contentStyle={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", borderRadius: 8, color: "var(--app-text)", fontSize: 12 }}
                            formatter={(value) => [formatCurrency(Number(value)), "Preço"]}
                            labelFormatter={(label) => String(label)}
                          />
                          <Line type="monotone" dataKey="price" stroke="var(--app-purple)" strokeWidth={2} dot={{ r: 2, fill: "var(--app-purple)" }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState icon={BarChart3} title="Histórico insuficiente" description="O gráfico será exibido quando houver pelo menos dois registros de preço." compact />
                  )}
                </section>
              </div>
            </>
          )}

          {tab === "produtos" && (
            <DataPage
              kicker="Catálogo"
              title="Produtos"
              description="Gerencie modelos e variantes cadastradas."
              search={search}
              setSearch={setSearch}
              searchPlaceholder="Pesquisar modelo..."
              action={canManage ? { label: "Novo produto", onClick: () => setModal("product") } : undefined}
              icon={Package}
            >
              <div className="divide-y divide-[var(--app-border)]">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--app-text)]">{product.model}</p>
                      <p className="mt-1 text-[11px] text-[var(--app-muted)]">{variants.filter((variant) => variant.product_id === product.id).length} variante(s) · {product.brand}</p>
                    </div>
                    <span className={statusPill(product.active)}>{product.active ? "Ativo" : "Inativo"}</span>
                  </div>
                ))}
                {!filteredProducts.length && <EmptyState icon={Package} title="Nenhum produto encontrado" description="Ajuste a busca ou cadastre um novo produto." />}
              </div>
            </DataPage>
          )}

          {tab === "fornecedores" && (
            <DataPage
              kicker="Rede"
              title="Fornecedores"
              description="Acompanhe os parceiros disponíveis para o catálogo."
              search={search}
              setSearch={setSearch}
              searchPlaceholder="Pesquisar fornecedor..."
              action={canManage ? { label: "Novo fornecedor", onClick: () => setModal("supplier") } : undefined}
              icon={Truck}
            >
              <div className="divide-y divide-[var(--app-border)]">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--app-text)]">{supplier.name}</p>
                      <p className="mt-1 truncate text-[11px] text-[var(--app-muted)]">{supplier.legal_name || "Razão social não informada"}</p>
                    </div>
                    <span className={statusPill(supplier.active)}>{supplier.active ? "Ativo" : "Inativo"}</span>
                  </div>
                ))}
                {!filteredSuppliers.length && <EmptyState icon={Truck} title="Nenhum fornecedor encontrado" description="Ajuste a busca ou cadastre um novo fornecedor." />}
              </div>
            </DataPage>
          )}

          {tab === "ofertas" && (
            <DataPage
              kicker="Radar"
              title="Ofertas"
              description="Todas as ofertas disponíveis no catálogo."
              search={search}
              setSearch={setSearch}
              searchPlaceholder="Pesquisar produto ou fornecedor..."
              action={canManage ? { label: "Nova oferta", onClick: () => setModal("offer") } : undefined}
              icon={Tags}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/60">
                    <tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      <th className="px-4 py-3 font-semibold">Produto</th>
                      <th className="px-4 py-3 font-semibold">Fornecedor</th>
                      <th className="px-4 py-3 font-semibold">Preço</th>
                      <th className="px-4 py-3 font-semibold">Estoque</th>
                      <th className="px-4 py-3 font-semibold">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)]">
                    {[...activeOffers]
                      .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
                      .filter((offer) => `${productName(offer.product_variant_id)} ${supplierName(offer.supplier_id)}`.toLowerCase().includes(search.toLowerCase()))
                      .map((offer) => (
                        <tr key={offer.id} className="transition hover:bg-white/[0.018]">
                          <td className="px-4 py-3.5 text-[13px] font-medium text-[var(--app-text)]">{productName(offer.product_variant_id)}</td>
                          <td className="px-4 py-3.5 text-[12px] text-[var(--app-secondary)]">{supplierName(offer.supplier_id)}</td>
                          <td className="px-4 py-3.5 text-[13px] font-semibold text-[var(--app-text)]">{formatCurrency(offer.price)}</td>
                          <td className="px-4 py-3.5 text-[12px] text-[var(--app-secondary)]">{offer.stock_quantity ?? "—"}</td>
                          <td className="px-4 py-3.5 text-[11px] text-[var(--app-muted)]">{formatRelativeDate(new Date(offer.observed_at))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!activeOffers.length && <EmptyState icon={Tags} title="Nenhuma oferta ativa" description="As ofertas cadastradas aparecerão aqui." />}
              </div>
            </DataPage>
          )}

          {tab === "comparador" && (
            <section>
              <div className="mb-6">
                <p className="section-kicker">Comparação</p>
                <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.025em]">Comparador</h2>
                <p className="mt-1 text-[13px] text-[var(--app-secondary)]">Compare as ofertas ativas pelo menor preço.</p>
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.7fr)]">
                <section className="panel-card">
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">Menor preço</p>
                      <h3 className="panel-title">Oportunidades atuais</h3>
                    </div>
                    <GitCompare className="h-4 w-4 text-[var(--app-purple)]" />
                  </div>
                  <div className="divide-y divide-[var(--app-border)]">
                    {[...activeOffers]
                      .sort((a, b) => Number(a.price) - Number(b.price))
                      .map((offer, index) => (
                        <div key={offer.id} className="flex items-center gap-3 px-4 py-3.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-[11px] font-semibold text-violet-300">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{productName(offer.product_variant_id)}</p>
                            <p className="mt-1 text-[11px] text-[var(--app-muted)]">{supplierName(offer.supplier_id)}</p>
                          </div>
                          <p className="text-[14px] font-semibold">{formatCurrency(offer.price)}</p>
                        </div>
                      ))}
                    {!activeOffers.length && <EmptyState icon={GitCompare} title="Sem dados para comparar" description="Cadastre ofertas para começar a comparação." />}
                  </div>
                </section>
                <section className="panel-card">
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">Resumo</p>
                      <h3 className="panel-title">Referência atual</h3>
                    </div>
                    <CircleDollarSign className="h-4 w-4 text-[var(--app-purple)]" />
                  </div>
                  <div className="space-y-3 p-4">
                    <SummaryRow label="Melhor preço" value={bestOffer ? formatCurrency(bestOffer.price) : "—"} />
                    <SummaryRow label="Ofertas ativas" value={String(activeOffers.length)} />
                    <SummaryRow label="Fornecedores ativos" value={String(activeSuppliers.length)} />
                  </div>
                </section>
              </div>
            </section>
          )}
        </section>
      </div>

      {modal === "product" && <ProductModal onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal === "supplier" && <SupplierModal onClose={() => setModal(null)} onSave={saveSupplier} />}
      {modal === "offer" && <OfferModal variants={variants} products={products} suppliers={suppliers} onClose={() => setModal(null)} onSave={saveOffer} />}
    </main>
  );
}

function MetricCard({ title, value, description, icon: Icon }: { title: string; value: string; description: string; icon: typeof CircleDollarSign }) {
  return (
    <article className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[var(--app-secondary)]">{title}</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">{value}</p>
        </div>
        <div className="icon-surface"><Icon className="h-4 w-4 text-[var(--app-purple)]" strokeWidth={1.8} /></div>
      </div>
      <p className="mt-3 truncate text-[11px] text-[var(--app-muted)]">{description}</p>
    </article>
  );
}

function DataPage({
  kicker,
  title,
  description,
  search,
  setSearch,
  searchPlaceholder,
  action,
  icon: Icon,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
  action?: { label: string; onClick: () => void };
  icon: typeof Package;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.025em]">{title}</h2>
          <p className="mt-1 text-[13px] text-[var(--app-secondary)]">{description}</p>
        </div>
        {action && (
          <button onClick={action.onClick} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--app-purple)] px-3.5 text-[13px] font-semibold text-white transition hover:bg-violet-500">
            <Plus className="h-3.5 w-3.5" /> {action.label}
          </button>
        )}
      </div>

      <section className="panel-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/40 p-3.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="app-input h-9 w-full pl-9"
            />
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-[var(--app-muted)] sm:flex">
            <Icon className="h-3.5 w-3.5" />
            Dados atuais do catálogo
          </div>
        </div>
        {children}
      </section>
    </section>
  );
}

function EmptyState({ icon: Icon, title, description, compact = false }: { icon: typeof Package; title: string; description: string; compact?: boolean }) {
  return (
    <div className={compact ? "px-5 py-12 text-center" : "px-5 py-14 text-center"}>
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
        <Icon className="h-4 w-4 text-[var(--app-purple)]" />
      </div>
      <p className="mt-3 text-[13px] font-medium text-[var(--app-text)]">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-[var(--app-muted)]">{description}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 px-4 py-4">
      {[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-white/[0.035]" />)}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--app-border)] py-3 last:border-0">
      <span className="text-[12px] text-[var(--app-muted)]">{label}</span>
      <span className="text-[13px] font-semibold text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function statusPill(active: boolean) {
  return active
    ? "rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300"
    : "rounded-full border border-[var(--app-border)] bg-white/[0.025] px-2 py-1 text-[10px] font-medium text-[var(--app-muted)]";
}

function formatCurrency(value: number) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }) : "—";
}

function formatRelativeDate(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <button aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="ui-3d-surface relative z-10 w-full max-w-lg rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--app-muted)] hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductModal({ onClose, onSave }: { onClose: () => void; onSave: (model: string, storage: string, color: string, condition: string, sku: string) => Promise<void> }) {
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("256");
  const [color, setColor] = useState("");
  const [condition, setCondition] = useState("new");
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try { await onSave(model, storage, color, condition, sku); } finally { setBusy(false); }
  }

  return (
    <Modal title="Novo iPhone" onClose={onClose}>
      <form className="mt-5 space-y-3.5" onSubmit={submit}>
        <Field label="Modelo" value={model} onChange={setModel} placeholder="iPhone 17 Pro Max" required />
        <Field label="Cor" value={color} onChange={setColor} placeholder="Natural" required />
        <Field label="SKU" value={sku} onChange={setSku} placeholder="Opcional" />
        <SelectField label="Capacidade" value={storage} onChange={setStorage} options={["128", "256", "512", "1024"]} />
        <SelectField label="Condição" value={condition} onChange={setCondition} options={["new", "used", "refurbished", "unknown"]} />
        <ModalButton busy={busy} label="Cadastrar produto" />
      </form>
    </Modal>
  );
}

function SupplierModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string, legal: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [legal, setLegal] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try { await onSave(name, legal); } finally { setBusy(false); }
  }

  return (
    <Modal title="Novo fornecedor" onClose={onClose}>
      <form className="mt-5 space-y-3.5" onSubmit={submit}>
        <Field label="Nome" value={name} onChange={setName} required />
        <Field label="Razão social" value={legal} onChange={setLegal} />
        <ModalButton busy={busy} label="Cadastrar fornecedor" />
      </form>
    </Modal>
  );
}

function OfferModal({
  variants,
  products,
  suppliers,
  onClose,
  onSave,
}: {
  variants: Variant[];
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (supplier: string, variant: string, price: string, stock: string) => Promise<void>;
}) {
  const [supplier, setSupplier] = useState(suppliers[0]?.id ?? "");
  const [variant, setVariant] = useState(variants[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try { await onSave(supplier, variant, price, stock); } finally { setBusy(false); }
  }

  return (
    <Modal title="Nova oferta" onClose={onClose}>
      <form className="mt-5 space-y-3.5" onSubmit={submit}>
        <SelectField label="Fornecedor" value={supplier} onChange={setSupplier} options={suppliers.map((item) => item.id)} labels={Object.fromEntries(suppliers.map((item) => [item.id, item.name]))} required />
        <SelectField label="Produto" value={variant} onChange={setVariant} options={variants.map((item) => item.id)} labels={Object.fromEntries(variants.map((item) => [item.id, productLabel(item, products)]))} required />
        <Field label="Preço" value={price} onChange={setPrice} type="number" min="0" step="0.01" required />
        <Field label="Estoque" value={stock} onChange={setStock} type="number" min="0" />
        <ModalButton busy={busy} label="Cadastrar oferta" disabled={!supplier || !variant} />
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, required = false, type = "text", min, step }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string; min?: string; step?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[var(--app-secondary)]">{label}</span>
      <input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="app-input h-10 w-full" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, labels, required = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string>; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[var(--app-secondary)]">{label}</span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="app-input h-10 w-full">
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function ModalButton({ busy, label, disabled = false }: { busy: boolean; label: string; disabled?: boolean }) {
  return (
    <button disabled={busy || disabled} className="mt-2 h-10 w-full rounded-lg bg-[var(--app-purple)] text-[13px] font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? "Salvando..." : label}
    </button>
  );
}

function productLabel(variant: Variant, products: Product[]) {
  return `${products.find((product) => product.id === variant.product_id)?.model ?? "Produto"} · ${variant.storage_gb} GB · ${variant.color}`;
}
