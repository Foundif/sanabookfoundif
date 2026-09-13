DROP POLICY IF EXISTS "Active products are public" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO anon USING (active);
CREATE POLICY "Signed-in users view products" ON public.products FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Active blocks are public" ON public.cms_blocks;
CREATE POLICY "Anyone can view active blocks" ON public.cms_blocks FOR SELECT TO anon USING (active);
CREATE POLICY "Signed-in users view blocks" ON public.cms_blocks FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;