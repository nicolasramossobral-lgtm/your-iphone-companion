CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_fornecedores"
ON public.fornecedores
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo text NOT NULL,
  capacidade text NOT NULL,
  cor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produtos_identidade_unica UNIQUE (modelo, capacidade, cor)
);

GRANT SELECT ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE TABLE public.ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  condicao text NOT NULL,
  preco numeric(12,2) NOT NULL,
  estoque integer NOT NULL DEFAULT 0,
  disponivel boolean NOT NULL DEFAULT true,
  coletado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ofertas_condicao_valida CHECK (condicao IN ('novo', 'seminovo', 'vitrine')),
  CONSTRAINT ofertas_preco_positivo CHECK (preco >= 0),
  CONSTRAINT ofertas_estoque_nao_negativo CHECK (estoque >= 0)
);

GRANT SELECT ON public.ofertas TO authenticated;
GRANT ALL ON public.ofertas TO service_role;

ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_ofertas"
ON public.ofertas
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE INDEX ofertas_produto_id_idx ON public.ofertas (produto_id);
CREATE INDEX ofertas_fornecedor_id_idx ON public.ofertas (fornecedor_id);
CREATE INDEX ofertas_disponiveis_recentes_idx ON public.ofertas (coletado_em DESC) WHERE disponivel = true;
CREATE INDEX fornecedores_ativos_idx ON public.fornecedores (ativo) WHERE ativo = true;

CREATE TRIGGER fornecedores_touch_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER produtos_touch_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER ofertas_touch_updated_at
BEFORE UPDATE ON public.ofertas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();