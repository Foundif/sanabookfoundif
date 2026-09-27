CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  label text,
  path text,
  session_id text,
  user_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log events" ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (length(event_name) <= 60 AND coalesce(length(label),0) <= 200 AND coalesce(length(path),0) <= 300);
CREATE POLICY "Staff read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE INDEX analytics_events_created_idx ON public.analytics_events (created_at DESC);
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS meta_pixel_id text DEFAULT '2371989856885975',
  ADD COLUMN IF NOT EXISTS meta_pixel_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_notify_email text DEFAULT 'stationeriessana@gmail.com';