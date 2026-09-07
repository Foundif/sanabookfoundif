CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own addresses" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.wishlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_handle text NOT NULL,
  product_title text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_handle)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own wishlist" ON public.wishlist_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS child_age integer,
  ADD COLUMN IF NOT EXISTS child_interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_payment text,
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS notify_picks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_launches boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_orders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_digest boolean NOT NULL DEFAULT true;