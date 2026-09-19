CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  maintenance_enabled boolean NOT NULL DEFAULT false,
  maintenance_heading text NOT NULL DEFAULT 'We are getting the shelves ready',
  maintenance_message text NOT NULL DEFAULT 'Sanabooks India is briefly offline for a quick update. We will be back very soon.',
  maintenance_ends_at timestamptz,
  show_countdown boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton_unique UNIQUE (singleton)
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE, INSERT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.site_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Signed-in users read settings" ON public.site_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff update settings" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff insert settings" ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (singleton) VALUES (true);