GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.cms_blocks TO anon;
GRANT SELECT ON public.product_reviews TO anon;