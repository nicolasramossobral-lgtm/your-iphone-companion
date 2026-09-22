ALTER TABLE public.produtos
ADD COLUMN ativo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.produtos.capacidade IS 'DEPRECATED: replaced by public.produto_variantes.capacidade';
COMMENT ON COLUMN public.produtos.cor IS 'DEPRECATED: replaced by public.produto_variantes.cor';

GRANT INSERT, UPDATE ON public.produtos TO authenticated;

CREATE POLICY "admins_criam_produtos"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "admins_atualizam_produtos"
ON public.produtos
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE INDEX produtos_ativos_idx ON public.produtos (ativo) WHERE ativo = true;

CREATE TABLE public.produto_variantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  capacidade text NOT NULL,
  cor text NOT NULL,
  condicao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produto_variantes_condicao_valida CHECK (condicao IN ('novo', 'seminovo', 'vitrine')),
  CONSTRAINT produto_variantes_identidade_unica UNIQUE (produto_id, capacidade, cor, condicao)
);

GRANT SELECT, INSERT, UPDATE ON public.produto_variantes TO authenticated;
GRANT ALL ON public.produto_variantes TO service_role;

ALTER TABLE public.produto_variantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_variantes"
ON public.produto_variantes
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE POLICY "admins_criam_variantes"
ON public.produto_variantes
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "admins_atualizam_variantes"
ON public.produto_variantes
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE INDEX produto_variantes_produto_id_idx ON public.produto_variantes (produto_id);
CREATE INDEX produto_variantes_ativas_idx ON public.produto_variantes (ativo) WHERE ativo = true;

CREATE TRIGGER produto_variantes_touch_updated_at
BEFORE UPDATE ON public.produto_variantes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.fornecedores
ADD COLUMN observacoes text;

GRANT INSERT, UPDATE ON public.fornecedores TO authenticated;

CREATE POLICY "admins_criam_fornecedores"
ON public.fornecedores
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "admins_atualizam_fornecedores"
ON public.fornecedores
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE TABLE public.fornecedor_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  nome text,
  telefone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fornecedor_contatos_unico UNIQUE (fornecedor_id)
);

GRANT SELECT, INSERT, UPDATE ON public.fornecedor_contatos TO authenticated;
GRANT ALL ON public.fornecedor_contatos TO service_role;

ALTER TABLE public.fornecedor_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_contatos"
ON public.fornecedor_contatos
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE POLICY "admins_criam_contatos"
ON public.fornecedor_contatos
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "admins_atualizam_contatos"
ON public.fornecedor_contatos
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE INDEX fornecedor_contatos_fornecedor_id_idx ON public.fornecedor_contatos (fornecedor_id);

CREATE TRIGGER fornecedor_contatos_touch_updated_at
BEFORE UPDATE ON public.fornecedor_contatos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.fornecedor_enderecos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fornecedor_enderecos_unico UNIQUE (fornecedor_id),
  CONSTRAINT fornecedor_enderecos_uf_valida CHECK (uf IS NULL OR char_length(uf) = 2)
);

GRANT SELECT, INSERT, UPDATE ON public.fornecedor_enderecos TO authenticated;
GRANT ALL ON public.fornecedor_enderecos TO service_role;

ALTER TABLE public.fornecedor_enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_enderecos"
ON public.fornecedor_enderecos
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE POLICY "admins_criam_enderecos"
ON public.fornecedor_enderecos
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "admins_atualizam_enderecos"
ON public.fornecedor_enderecos
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE INDEX fornecedor_enderecos_fornecedor_id_idx ON public.fornecedor_enderecos (fornecedor_id);

CREATE TRIGGER fornecedor_enderecos_touch_updated_at
BEFORE UPDATE ON public.fornecedor_enderecos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.ofertas
ADD COLUMN variante_id uuid REFERENCES public.produto_variantes(id) ON DELETE RESTRICT;

GRANT INSERT, UPDATE ON public.ofertas TO authenticated;

CREATE POLICY "admins_criam_ofertas"
ON public.ofertas
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "admins_atualizam_ofertas"
ON public.ofertas
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

CREATE INDEX ofertas_variante_id_idx ON public.ofertas (variante_id);
CREATE UNIQUE INDEX ofertas_fornecedor_variante_unica_idx
ON public.ofertas (fornecedor_id, variante_id)
WHERE variante_id IS NOT NULL;

CREATE TABLE public.preco_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  preco numeric(12,2) NOT NULL,
  estoque integer NOT NULL,
  disponivel boolean NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preco_historico_preco_positivo CHECK (preco >= 0),
  CONSTRAINT preco_historico_estoque_nao_negativo CHECK (estoque >= 0)
);

GRANT SELECT ON public.preco_historico TO authenticated;
GRANT ALL ON public.preco_historico TO service_role;

ALTER TABLE public.preco_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ativos_leem_historico"
ON public.preco_historico
FOR SELECT
TO authenticated
USING (public.is_active(auth.uid()));

CREATE INDEX preco_historico_oferta_data_idx ON public.preco_historico (oferta_id, registrado_em DESC);

CREATE OR REPLACE FUNCTION public.registrar_preco_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
    OR NEW.preco IS DISTINCT FROM OLD.preco
    OR NEW.estoque IS DISTINCT FROM OLD.estoque
    OR NEW.disponivel IS DISTINCT FROM OLD.disponivel THEN
    INSERT INTO public.preco_historico (oferta_id, preco, estoque, disponivel, registrado_em)
    VALUES (NEW.id, NEW.preco, NEW.estoque, NEW.disponivel, NEW.coletado_em);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ofertas_registrar_preco_historico
AFTER INSERT OR UPDATE OF preco, estoque, disponivel ON public.ofertas
FOR EACH ROW EXECUTE FUNCTION public.registrar_preco_historico();