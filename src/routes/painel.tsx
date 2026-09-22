import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, Boxes, LogOut, Package, Plus, RefreshCw, Search, Store, Users, X } from "lucide-react";
import { getStoredSession, signOut } from "../lib/supabase-auth";
import { dataApi, type Offer, type Product, type Supplier, type Variant } from "../lib/supabase-data";

export const Route = createFileRoute("/painel")({ component: Dashboard });

type Tab = "inicio" | "produtos" | "fornecedores" | "ofertas" | "comparador";

function Dashboard() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"product" | "supplier" | "offer" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const session = getStoredSession();
    if (!session) { window.location.replace("/"); return; }
    setLoading(true);
    try {
      const [p, v, s, o, r] = await Promise.all([dataApi.products(), dataApi.variants(), dataApi.suppliers(), dataApi.offers(), dataApi.role()]);
      setProducts(p); setVariants(v); setSuppliers(s); setOffers(o); setRole(r);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const productName = (variantId: string) => {
    const v = variants.find((item) => item.id === variantId);
    return v ? `${products.find((p) => p.id === v.product_id)?.model ?? "Produto"} · ${v.storage_gb} GB · ${v.color}` : "Variante";
  };
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "Fornecedor";

  const filteredProducts = useMemo(() => products.filter((p) => p.model.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const filteredSuppliers = useMemo(() => suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  const canManage = role === "admin";

  const stats = [
    { label: "Produtos", value: products.length, icon: Package },
    { label: "Fornecedores ativos", value: suppliers.filter((s) => s.active).length, icon: Store },
    { label: "Ofertas", value: offers.length, icon: BarChart3 },
    { label: "Estoque", value: offers.reduce((sum, o) => sum + (o.stock_quantity ?? 0), 0), icon: Boxes },
  ];

  async function saveProduct(model: string, storage: string, color: string, condition: string, sku: string) {
    const [p] = await dataApi.addProduct(model);
    if (!p) throw new Error("Produto não retornado.");
    await dataApi.addVariant({ product_id: p.id, storage_gb: Number(storage), color, condition, sku: sku || null });
    setModal(null); setNotice("Produto cadastrado."); await load();
  }

  async function saveSupplier(name: string, legalName: string) {
    await dataApi.addSupplier(name, legalName); setModal(null); setNotice("Fornecedor cadastrado."); await load();
  }

  async function saveOffer(supplierId: string, variantId: string, price: string, stock: string) {
    await dataApi.addOffer({ supplier_id: supplierId, product_variant_id: variantId, price: Number(price), stock_quantity: stock === "" ? null : Number(stock) });
    setModal(null); setNotice("Oferta cadastrada."); await load();
  }

  function logout() { signOut(); window.location.replace("/"); }

  const nav = [
    ["inicio", "Dashboard", BarChart3],
    ["produtos", "Produtos", Package],
    ["fornecedores", "Fornecedores", Store],
    ["ofertas", "Ofertas", Boxes],
    ["comparador", "Comparador", Search],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">YI</div><span className="font-semibold tracking-tight">Your iPhone Companion</span></div>
          <div className="flex items-center gap-3"><span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">{role === "admin" ? "Administrador" : "Vendor"}</span><button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sair</button></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 lg:flex-col">
            {nav.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${tab === id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{label}</button>)}
          </nav>
        </aside>
        <section className="min-w-0 flex-1">
          {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><span>{notice}</span><button onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-slate-500">Gestão</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{nav.find(([id]) => id === tab)?.[1]}</h1></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</button></div>

          {tab === "inicio" && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({label,value,icon:Icon}) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-slate-400" /><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold">{loading ? "—" : value}</p></div>)}</div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Últimas ofertas</h2>{offers.length === 0 ? <p className="mt-4 text-sm text-slate-500">Nenhuma oferta cadastrada.</p> : <div className="mt-4 divide-y divide-slate-100">{offers.slice(0,5).map(o => <div key={o.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row"><span className="text-sm font-medium">{productName(o.product_variant_id)}</span><span className="text-sm font-semibold">R$ {Number(o.price).toLocaleString("pt-BR",{minimumFractionDigits:2})} · {supplierName(o.supplier_id)}</span></div>)}</div>}</div></>}

          {(tab === "produtos" || tab === "fornecedores") && <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-slate-950"/></div>{canManage && <button onClick={()=>setModal(tab==="produtos"?"product":"supplier")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"><Plus className="h-4 w-4"/>Novo</button>}</div>{tab==="produtos" ? <div className="divide-y divide-slate-100">{filteredProducts.map(p=><div key={p.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{p.model}</p><p className="text-xs text-slate-500">{variants.filter(v=>v.product_id===p.id).length} variante(s)</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${p.active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{p.active?"Ativo":"Inativo"}</span></div>)}{filteredProducts.length===0&&<Empty text="Nenhum produto encontrado."/>}</div> : <div className="divide-y divide-slate-100">{filteredSuppliers.map(s=><div key={s.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{s.name}</p><p className="text-xs text-slate-500">{s.legal_name||"Sem razão social"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${s.active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{s.active?"Ativo":"Inativo"}</span></div>)}{filteredSuppliers.length===0&&<Empty text="Nenhum fornecedor encontrado."/>}</div>}</div>}

          {tab === "ofertas" && <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex justify-end border-b border-slate-100 p-4">{canManage&&<button onClick={()=>setModal("offer")} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Nova oferta</button>}</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-4">Produto</th><th className="p-4">Fornecedor</th><th className="p-4">Preço</th><th className="p-4">Estoque</th></tr></thead><tbody className="divide-y divide-slate-100">{offers.map(o=><tr key={o.id}><td className="p-4 font-medium">{productName(o.product_variant_id)}</td><td className="p-4">{supplierName(o.supplier_id)}</td><td className="p-4 font-semibold">R$ {Number(o.price).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td><td className="p-4">{o.stock_quantity ?? "—"}</td></tr>)}</tbody></table>{offers.length===0&&<Empty text="Nenhuma oferta cadastrada."/>}</div></div>}

          {tab === "comparador" && <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5"><h2 className="font-semibold">Comparação de ofertas</h2><p className="mt-1 text-sm text-slate-500">As ofertas abaixo estão ordenadas pelo menor preço.</p><div className="mt-5 space-y-2">{offers.map(o=><div key={o.id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"><div><p className="font-medium">{productName(o.product_variant_id)}</p><p className="text-xs text-slate-500">{supplierName(o.supplier_id)} · estoque {o.stock_quantity ?? "—"}</p></div><strong>R$ {Number(o.price).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong></div>)}</div>{offers.length===0&&<Empty text="Cadastre ofertas para comparar preços."/>}</div>}
        </section>
      </div>
      {modal==="product"&&<ProductModal onClose={()=>setModal(null)} onSave={saveProduct}/>}
      {modal==="supplier"&&<SupplierModal onClose={()=>setModal(null)} onSave={saveSupplier}/>}
      {modal==="offer"&&<OfferModal variants={variants} products={products} suppliers={suppliers} onClose={()=>setModal(null)} onSave={saveOffer}/>}
    </main>
  );
}

function Empty({text}:{text:string}) { return <div className="p-10 text-center text-sm text-slate-500">{text}</div>; }

function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose}><X className="h-5 w-5"/></button></div>{children}</div></div>;
}

function ProductModal({onClose,onSave}:{onClose:()=>void;onSave:(model:string,storage:string,color:string,condition:string,sku:string)=>Promise<void>}) {
  const [model,setModel]=useState(""); const [storage,setStorage]=useState("256"); const [color,setColor]=useState(""); const [condition,setCondition]=useState("new"); const [sku,setSku]=useState(""); const [busy,setBusy]=useState(false);
  return <Modal title="Novo iPhone" onClose={onClose}><form className="mt-5 space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(model,storage,color,condition,sku)}finally{setBusy(false)}}}>{[["Modelo",model,setModel,"iPhone 17 Pro Max"],["Cor",color,setColor,"Natural"],["SKU",sku,setSku,"Opcional"]].map(([label,value,setter,placeholder])=><label key={label} className="block text-sm font-medium">{label}<input required={label!=="SKU"} value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)} placeholder={placeholder as string} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-slate-950"/></label>)}<label className="block text-sm font-medium">Capacidade<select value={storage} onChange={e=>setStorage(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"><option>128</option><option>256</option><option>512</option><option>1024</option></select></label><label className="block text-sm font-medium">Condição<select value={condition} onChange={e=>setCondition(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"><option value="new">Novo</option><option value="used">Usado</option><option value="refurbished">Recondicionado</option><option value="unknown">Não informado</option></select></label><button disabled={busy} className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white disabled:opacity-50">{busy?"Salvando...":"Cadastrar produto"}</button></form></Modal>;
}

function SupplierModal({onClose,onSave}:{onClose:()=>void;onSave:(name:string,legal:string)=>Promise<void>}) {
  const [name,setName]=useState("");const [legal,setLegal]=useState("");const[busy,setBusy]=useState(false);
  return <Modal title="Novo fornecedor" onClose={onClose}><form className="mt-5 space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(name,legal)}finally{setBusy(false)}}}><label className="block text-sm font-medium">Nome<input required value={name} onChange={e=>setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"/></label><label className="block text-sm font-medium">Razão social<input value={legal} onChange={e=>setLegal(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"/></label><button disabled={busy} className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white">{busy?"Salvando...":"Cadastrar fornecedor"}</button></form></Modal>;
}

function OfferModal({variants,products,suppliers,onClose,onSave}:{variants:Variant[];products:Product[];suppliers:Supplier[];onClose:()=>void;onSave:(supplier:string,variant:string,price:string,stock:string)=>Promise<void>}) {
  const [supplier,setSupplier]=useState(suppliers[0]?.id??"");const [variant,setVariant]=useState(variants[0]?.id??"");const[price,setPrice]=useState("");const[stock,setStock]=useState("");const[busy,setBusy]=useState(false);
  return <Modal title="Nova oferta" onClose={onClose}><form className="mt-5 space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(supplier,variant,price,stock)}finally{setBusy(false)}}}><label className="block text-sm font-medium">Fornecedor<select required value={supplier} onChange={e=>setSupplier(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal">{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="block text-sm font-medium">Produto<select required value={variant} onChange={e=>setVariant(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal">{variants.map(v=><option key={v.id} value={v.id}>{products.find(p=>p.id===v.product_id)?.model??"Produto"} · {v.storage_gb} GB · {v.color}</option>)}</select></label><label className="block text-sm font-medium">Preço<input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"/></label><label className="block text-sm font-medium">Estoque<input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"/></label><button disabled={busy||!supplier||!variant} className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white disabled:opacity-50">{busy?"Salvando...":"Cadastrar oferta"}</button></form></Modal>;
}
