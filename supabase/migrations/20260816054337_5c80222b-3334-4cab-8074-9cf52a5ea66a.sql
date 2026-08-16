-- roles
create type public.app_role as enum ('admin','staff','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can read their own roles" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- first signed-in user may claim admin when no admin exists yet
create or replace function public.claim_admin_if_none()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(uid,'admin');
  end if;
  insert into public.user_roles (user_id, role) values (uid,'admin')
    on conflict (user_id, role) do nothing;
  return true;
end $$;
grant execute on function public.claim_admin_if_none() to authenticated;

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text,
  shipping_method text not null default 'standard',
  payment_method text not null default 'upi',
  subtotal numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  cod_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'placed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_handle text not null,
  product_title text not null,
  image_url text,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);
create index on public.order_items (order_id);
create index on public.orders (user_id);

grant select, insert on public.orders to anon;
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
grant select, insert on public.order_items to anon;
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Anyone can place an order" on public.orders
for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
create policy "Shoppers read their own orders" on public.orders
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "Admins update orders" on public.orders
for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));

create policy "Anyone can add items to a new order" on public.order_items
for insert to anon, authenticated with check (true);
create policy "Read items of readable orders" on public.order_items
for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff')))
);

-- contact messages
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  topic text not null default 'general',
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
grant insert on public.contact_messages to anon;
grant select, insert, update on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "Anyone can send a message" on public.contact_messages
for insert to anon, authenticated with check (true);
create policy "Admins read messages" on public.contact_messages
for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "Admins update messages" on public.contact_messages
for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));

-- profile shipping details
alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();