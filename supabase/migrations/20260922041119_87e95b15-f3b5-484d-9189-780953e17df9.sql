CREATE OR REPLACE FUNCTION public.apply_order_stock(_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE it jsonb;
BEGIN
  IF _items IS NULL THEN RETURN; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    UPDATE public.products
      SET stock = GREATEST(0, stock - GREATEST(0, COALESCE((it->>'qty')::int, 0)))
      WHERE handle = it->>'handle';
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.apply_order_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_order_stock(jsonb) TO anon, authenticated, service_role;