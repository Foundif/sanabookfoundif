alter table public.product_reviews add column if not exists author_name text;

update public.product_reviews r set author_name = p.display_name
from public.profiles p where p.id = r.user_id and r.author_name is null;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
revoke select on public.profiles from anon;
create policy "Users read their own profile" on public.profiles
for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));