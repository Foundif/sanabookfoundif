CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  product_type text NOT NULL DEFAULT 'Books',
  tags text[] NOT NULL DEFAULT '{}',
  age_tag text,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  image_url text,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cms_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key text NOT NULL UNIQUE,
  page text NOT NULL DEFAULT 'home',
  heading text NOT NULL DEFAULT '',
  subheading text,
  body text,
  image_url text,
  link_label text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_blocks TO authenticated;
GRANT ALL ON public.cms_blocks TO service_role;
ALTER TABLE public.cms_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active blocks are public" ON public.cms_blocks FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff insert blocks" ON public.cms_blocks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff update blocks" ON public.cms_blocks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff delete blocks" ON public.cms_blocks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE TRIGGER cms_blocks_updated_at BEFORE UPDATE ON public.cms_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.cms_blocks (block_key, page, heading, subheading, body, sort_order) VALUES
  ('home_hero','home','Books that make little readers glow','Early learning, tracing, phonics and activity books — delivered across India.','Free shipping over ₹499 · COD available · GST invoicing',1),
  ('home_bundles','home','Bundle & gift packs','Curated by age so parents can shop in seconds.','Save up to 30% versus buying books individually.',2),
  ('home_promise','home','Our promise','Sturdy pages, wipe-clean sheets and age-perfect progression.','Loved by 2,100+ Indian families.',3);