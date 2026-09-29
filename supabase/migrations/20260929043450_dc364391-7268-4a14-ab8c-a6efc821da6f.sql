ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_title text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name text;

CREATE OR REPLACE FUNCTION public.track_order(_order_number text, _phone text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; items jsonb;
BEGIN
  SELECT * INTO o FROM public.orders
   WHERE upper(order_number) = upper(trim(both '#' from trim(_order_number)))
     AND right(regexp_replace(phone,'\D','','g'),10) = right(regexp_replace(_phone,'\D','','g'),10)
   LIMIT 1;
  IF o.id IS NULL THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('title',product_title,'variant',variant_title,'qty',quantity,'image',image_url)),'[]'::jsonb)
    INTO items FROM public.order_items WHERE order_id = o.id;
  RETURN jsonb_build_object('order_number',o.order_number,'status',o.status,'payment_status',o.payment_status,
    'created_at',o.created_at,'updated_at',o.updated_at,'total',o.total,'city',o.city,
    'courier_name',o.courier_name,'tracking_number',o.tracking_number,'items',items);
END $$;
GRANT EXECUTE ON FUNCTION public.track_order(text,text) TO anon, authenticated;