ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  min_subtotal numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  times_used integer NOT NULL DEFAULT 0,
  free_shipping boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read coupons" ON public.coupons FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff insert coupons" ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff update coupons" ON public.coupons FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff delete coupons" ON public.coupons FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.check_coupon(_code text, _subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.coupons; d numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This code is not valid.');
  END IF;
  IF NOT c.active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This code is no longer active.');
  END IF;
  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This code is not active yet.');
  END IF;
  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This code has expired.');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.times_used >= c.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This code has been fully redeemed.');
  END IF;
  IF _subtotal < c.min_subtotal THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Add more items to use this code.', 'min_subtotal', c.min_subtotal);
  END IF;
  IF c.discount_type = 'percent' THEN
    d := round(_subtotal * c.value / 100.0, 2);
  ELSE
    d := c.value;
  END IF;
  IF c.max_discount IS NOT NULL AND d > c.max_discount THEN d := c.max_discount; END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;
  RETURN jsonb_build_object(
    'ok', true, 'code', c.code, 'discount', d,
    'free_shipping', c.free_shipping, 'description', c.description
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.check_coupon(text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.check_coupon(text, numeric) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bump_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL AND length(trim(NEW.coupon_code)) > 0 THEN
    UPDATE public.coupons SET times_used = times_used + 1
      WHERE upper(code) = upper(trim(NEW.coupon_code));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER orders_bump_coupon AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.bump_coupon_usage();

INSERT INTO public.coupons (code, description, discount_type, value, min_subtotal, max_discount, active)
VALUES
  ('WELCOME10', '10% off your first order', 'percent', 10, 499, 200, true),
  ('SANA50', 'Flat Rs.50 off orders above Rs.699', 'flat', 50, 699, NULL, true)
ON CONFLICT (code) DO NOTHING;