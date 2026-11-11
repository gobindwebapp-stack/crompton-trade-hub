-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('admin', 'dealer', 'retailer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  business_name text not null default '',
  phone text not null default '',
  gstin text not null default '',
  city text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
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

create or replace function public.get_user_role(_user_id uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'admin' then 1 when 'dealer' then 2 else 3 end
  limit 1
$$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.get_user_role(uuid) to authenticated;

create policy "Users read own profile or admin reads all" on public.profiles
  for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users read own roles or admin reads all" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- New user: profile + role (Admin only granted if none exists yet)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_req text := coalesce(new.raw_user_meta_data->>'requested_role', 'retailer');
  v_role public.app_role;
begin
  perform pg_advisory_xact_lock(hashtext('crompton_admin_claim'));
  if v_req = 'admin' and not exists (select 1 from public.user_roles where role = 'admin') then
    v_role := 'admin';
  elsif v_req = 'dealer' then
    v_role := 'dealer';
  else
    v_role := 'retailer';
  end if;

  insert into public.profiles (id, email, full_name, business_name, phone)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 120),
    left(coalesce(new.raw_user_meta_data->>'business_name', ''), 160),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 20)
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, v_role)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin: upgrade / degrade users between Dealer and Retailer
create or replace function public.set_user_role(p_user uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can change roles';
  end if;
  if p_role not in ('dealer', 'retailer') then
    raise exception 'Role can only be set to dealer or retailer';
  end if;
  if public.has_role(p_user, 'admin') then
    raise exception 'Admin accounts cannot be changed here';
  end if;
  delete from public.user_roles where user_id = p_user and role in ('dealer', 'retailer');
  insert into public.user_roles (user_id, role) values (p_user, p_role);
end;
$$;
revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;

-- CATALOG -------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Anyone reads categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins insert categories" on public.categories for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update categories" on public.categories for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text not null default '',
  brand text not null default 'Crompton',
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  retail_price numeric(12,2) not null default 0 check (retail_price >= 0),
  wholesale_price numeric(12,2) not null default 0 check (wholesale_price >= 0),
  dealer_moq int not null default 10 check (dealer_moq > 0),
  retailer_moq int not null default 1 check (retailer_moq > 0),
  stock int not null default 0 check (stock >= 0),
  unit text not null default 'pc',
  specs jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Anyone reads active products" on public.products for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

-- MARKETING -----------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'banner' check (kind in ('banner', 'scheme')),
  title text not null,
  subtitle text not null default '',
  badge_text text not null default '',
  image_url text,
  link_url text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;
grant all on public.banners to service_role;
alter table public.banners enable row level security;
create policy "Anyone reads active banners" on public.banners for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert banners" on public.banners for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update banners" on public.banners for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete banners" on public.banners for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.sponsored_ads (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  headline text not null,
  body text not null default '',
  image_url text,
  link_url text not null default '',
  cta_label text not null default 'Learn more',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.sponsored_ads to anon, authenticated;
grant insert, update, delete on public.sponsored_ads to authenticated;
grant all on public.sponsored_ads to service_role;
alter table public.sponsored_ads enable row level security;
create policy "Anyone reads active ads" on public.sponsored_ads for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert ads" on public.sponsored_ads for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update ads" on public.sponsored_ads for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete ads" on public.sponsored_ads for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Crompton Trade Hub',
  support_phone text not null default '',
  gst_percent numeric(5,2) not null default 18 check (gst_percent >= 0 and gst_percent <= 50),
  cod_enabled boolean not null default true,
  bank_transfer_enabled boolean not null default true,
  online_gateway_enabled boolean not null default false,
  gateway_label text not null default 'Online payment (UPI / Card)',
  assistant_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Anyone reads settings" on public.app_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.app_settings for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ORDERS --------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity (start with 100001),
  user_id uuid not null,
  role_at_order public.app_role not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('cod', 'bank_transfer', 'online')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'awaiting_gateway', 'paid', 'refunded')),
  subtotal numeric(14,2) not null default 0,
  gst_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  ship_name text not null,
  ship_phone text not null,
  ship_address text not null,
  ship_city text not null,
  ship_pincode text not null,
  gstin text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Users read own orders, admins read all" on public.orders for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(14,2) not null
);
create index order_items_order_idx on public.order_items(order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Read items of visible orders" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

-- Secure order placement: client sends only product ids + quantities
create or replace function public.place_b2b_order(p_items jsonb, p_payment_method text, p_shipping jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_set public.app_settings;
  v_line record;
  v_prod public.products;
  v_price numeric;
  v_moq int;
  v_subtotal numeric := 0;
  v_gst numeric;
  v_order_id uuid;
  v_order_no bigint;
  v_name text := btrim(coalesce(p_shipping->>'name', ''));
  v_phone text := btrim(coalesce(p_shipping->>'phone', ''));
  v_addr text := btrim(coalesce(p_shipping->>'address', ''));
  v_city text := btrim(coalesce(p_shipping->>'city', ''));
  v_pin text := btrim(coalesce(p_shipping->>'pincode', ''));
  v_gstin text := upper(btrim(coalesce(p_shipping->>'gstin', '')));
  v_notes text := btrim(coalesce(p_shipping->>'notes', ''));
begin
  if v_uid is null then raise exception 'Please sign in to place an order'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'Too many lines in one order'; end if;

  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Enter a valid contact name'; end if;
  if v_phone !~ '^[0-9+ -]{7,20}$' then raise exception 'Enter a valid phone number'; end if;
  if length(v_addr) < 5 or length(v_addr) > 500 then raise exception 'Enter a valid delivery address'; end if;
  if length(v_city) < 2 or length(v_city) > 80 then raise exception 'Enter a valid city'; end if;
  if v_pin !~ '^[0-9]{6}$' then raise exception 'Enter a valid 6-digit PIN code'; end if;
  if v_gstin <> '' and v_gstin !~ '^[0-9A-Z]{15}$' then raise exception 'GSTIN must be 15 letters/digits'; end if;
  if length(v_notes) > 1000 then raise exception 'Notes are too long'; end if;

  select * into v_set from public.app_settings where id = 1;
  if p_payment_method = 'cod' and not v_set.cod_enabled
     or p_payment_method = 'bank_transfer' and not v_set.bank_transfer_enabled
     or p_payment_method = 'online' and not v_set.online_gateway_enabled
     or p_payment_method not in ('cod', 'bank_transfer', 'online') then
    raise exception 'That payment method is not available';
  end if;

  v_role := coalesce(public.get_user_role(v_uid), 'retailer');

  insert into public.orders (user_id, role_at_order, payment_method, payment_status,
    ship_name, ship_phone, ship_address, ship_city, ship_pincode, gstin, notes)
  values (v_uid, v_role, p_payment_method,
    case when p_payment_method = 'online' then 'awaiting_gateway' else 'unpaid' end,
    v_name, v_phone, v_addr, v_city, v_pin, v_gstin, v_notes)
  returning id, order_no into v_order_id, v_order_no;

  for v_line in
    select (e->>'product_id')::uuid as pid, sum((e->>'quantity')::int) as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    if v_line.qty is null or v_line.qty <= 0 or v_line.qty > 100000 then
      raise exception 'Invalid quantity';
    end if;
    select * into v_prod from public.products where id = v_line.pid and is_active for update;
    if not found then raise exception 'A product in your cart is no longer available'; end if;

    if v_role in ('dealer', 'admin') then
      v_price := v_prod.wholesale_price; v_moq := v_prod.dealer_moq;
    else
      v_price := v_prod.retail_price; v_moq := v_prod.retailer_moq;
    end if;

    if v_line.qty < v_moq then
      raise exception 'Minimum order for % is % units', v_prod.name, v_moq;
    end if;
    if v_line.qty > v_prod.stock then
      raise exception 'Only % units of % in stock', v_prod.stock, v_prod.name;
    end if;

    update public.products set stock = stock - v_line.qty where id = v_prod.id;
    insert into public.order_items (order_id, product_id, product_name, sku, unit_price, quantity, line_total)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.sku, v_price, v_line.qty, v_price * v_line.qty);
    v_subtotal := v_subtotal + v_price * v_line.qty;
  end loop;

  v_gst := round(v_subtotal * v_set.gst_percent / 100, 2);
  update public.orders set subtotal = v_subtotal, gst_amount = v_gst, total = v_subtotal + v_gst
  where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'order_no', v_order_no, 'total', v_subtotal + v_gst);
end;
$$;
revoke execute on function public.place_b2b_order(jsonb, text, jsonb) from public, anon;
grant execute on function public.place_b2b_order(jsonb, text, jsonb) to authenticated;

-- STORAGE POLICIES (bucket: product-media) -----------------------------
create policy "Public reads product media" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-media');
create policy "Admins upload product media" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-media' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update product media" on storage.objects for update to authenticated
  using (bucket_id = 'product-media' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete product media" on storage.objects for delete to authenticated
  using (bucket_id = 'product-media' and public.has_role(auth.uid(), 'admin'));

-- SEED ----------------------------------------------------------------
insert into public.app_settings (id) values (1);

insert into public.categories (name, slug, image_url, sort_order) values
  ('Ceiling Fans', 'ceiling-fans', '/images/products/ceiling-fan.webp', 1),
  ('LED Lighting', 'led-lighting', '/images/products/led-bulb.webp', 2),
  ('Water Pumps', 'water-pumps', '/images/products/water-pump.webp', 3),
  ('Water Heaters', 'water-heaters', '/images/products/water-heater.webp', 4),
  ('Kitchen Appliances', 'kitchen-appliances', '/images/products/mixer-grinder.webp', 5),
  ('Air Coolers', 'air-coolers', '/images/products/air-cooler.webp', 6);

insert into public.products (sku, name, slug, description, category_id, image_url, retail_price, wholesale_price, dealer_moq, retailer_moq, stock, unit, specs, is_featured)
select v.sku, v.name, v.slug, v.descr, c.id, v.img, v.rp, v.wp, v.dmoq, v.rmoq, v.stock, v.unit, v.specs::jsonb, v.feat
from (values
  ('CF-AURA-1200', 'Aura Prime 1200mm BLDC Ceiling Fan', 'aura-prime-1200-bldc', 'Energy-saving 28W BLDC motor with remote, 5 speeds and silent operation.', 'ceiling-fans', '/images/products/ceiling-fan.webp', 3899, 2950, 10, 1, 640, 'pc', '{"Sweep":"1200 mm","Power":"28 W","Speed":"340 RPM","Warranty":"5 years"}', true),
  ('CF-SUREBREEZE-1200', 'SureBreeze 1200mm High-Speed Fan', 'surebreeze-1200-high-speed', 'Classic high-air-delivery fan built for everyday use in shops and homes.', 'ceiling-fans', '/images/products/ceiling-fan.webp', 1999, 1520, 20, 1, 1200, 'pc', '{"Sweep":"1200 mm","Power":"70 W","Speed":"380 RPM","Warranty":"2 years"}', false),
  ('LED-STAR-9W', 'StarLite 9W LED Bulb (B22)', 'starlite-9w-led-b22', 'Cool daylight LED bulb, 900 lumens, surge protected.', 'led-lighting', '/images/products/led-bulb.webp', 99, 62, 100, 10, 25000, 'pc', '{"Wattage":"9 W","Lumens":"900 lm","Base":"B22","Colour":"6500K"}', true),
  ('LED-STAR-12W', 'StarLite 12W LED Bulb (B22)', 'starlite-12w-led-b22', 'Bright 1200 lumen bulb with 2-year replacement warranty.', 'led-lighting', '/images/products/led-bulb.webp', 139, 88, 100, 10, 18000, 'pc', '{"Wattage":"12 W","Lumens":"1200 lm","Base":"B22","Colour":"6500K"}', false),
  ('PMP-MINI-05', 'Mini Master 0.5HP Self-Priming Pump', 'mini-master-05hp-pump', 'Domestic self-priming monoblock pump with thermal overload protection.', 'water-pumps', '/images/products/water-pump.webp', 4590, 3620, 5, 1, 300, 'pc', '{"Power":"0.5 HP","Head":"30 m","Pipe":"25 x 25 mm","Phase":"Single"}', true),
  ('PMP-MINI-10', 'Mini Master 1HP Self-Priming Pump', 'mini-master-1hp-pump', 'Higher head pump for multi-storey buildings.', 'water-pumps', '/images/products/water-pump.webp', 6990, 5480, 5, 1, 180, 'pc', '{"Power":"1 HP","Head":"40 m","Pipe":"25 x 25 mm","Phase":"Single"}', false),
  ('WH-ARNO-15L', 'Arno Neo 15L Storage Water Heater', 'arno-neo-15l-water-heater', '5-star rated storage geyser with glass-lined tank.', 'water-heaters', '/images/products/water-heater.webp', 7490, 5890, 4, 1, 220, 'pc', '{"Capacity":"15 L","Power":"2000 W","Rating":"5 Star","Pressure":"8 bar"}', true),
  ('WH-INSTA-3L', 'InstaBliss 3L Instant Water Heater', 'instabliss-3l-instant-heater', 'Compact instant geyser for kitchens and small bathrooms.', 'water-heaters', '/images/products/water-heater.webp', 3290, 2510, 6, 1, 410, 'pc', '{"Capacity":"3 L","Power":"3000 W","Pressure":"6.5 bar"}', false),
  ('KA-MG-750', 'DuraGrind 750W Mixer Grinder', 'duragrind-750w-mixer-grinder', '3 stainless-steel jars, overload protection, 3-speed control.', 'kitchen-appliances', '/images/products/mixer-grinder.webp', 3499, 2690, 6, 1, 520, 'pc', '{"Power":"750 W","Jars":"3","Speed":"18000 RPM","Warranty":"2 years"}', true),
  ('KA-KETTLE-15', 'QuickBoil 1.5L Electric Kettle', 'quickboil-15l-kettle', 'Stainless steel kettle with auto shut-off.', 'kitchen-appliances', '/images/products/mixer-grinder.webp', 1199, 860, 12, 1, 900, 'pc', '{"Capacity":"1.5 L","Power":"1500 W"}', false),
  ('AC-OZONE-75', 'Ozone 75L Desert Air Cooler', 'ozone-75l-desert-cooler', 'Large desert cooler with honeycomb pads and 4-way air deflection.', 'air-coolers', '/images/products/air-cooler.webp', 9990, 7840, 3, 1, 150, 'pc', '{"Tank":"75 L","Air Throw":"18 m","Power":"210 W"}', true),
  ('AC-ACGC-40', 'Ginie 40L Personal Air Cooler', 'ginie-40l-personal-cooler', 'Compact cooler with remote and ice chamber.', 'air-coolers', '/images/products/air-cooler.webp', 6290, 4870, 4, 1, 260, 'pc', '{"Tank":"40 L","Air Throw":"10 m","Power":"150 W"}', false)
) as v(sku, name, slug, descr, cat, img, rp, wp, dmoq, rmoq, stock, unit, specs, feat)
join public.categories c on c.slug = v.cat;

insert into public.banners (kind, title, subtitle, badge_text, image_url, link_url, sort_order) values
  ('banner', 'Summer stocking season is here', 'Dealer prices on fans and coolers. Order by the carton, ship in 48 hours.', 'Wholesale', '/images/banners/hero-warehouse.webp', '/products?category=ceiling-fans', 1),
  ('banner', 'Light up every shelf', 'StarLite LED range from ₹62 per bulb for dealers.', 'New range', '/images/banners/hero-lighting.webp', '/products?category=led-lighting', 2),
  ('scheme', 'Buy 50 fans, get 2 free', 'Valid on SureBreeze range for registered dealers.', 'Scheme', null, '/products?category=ceiling-fans', 1),
  ('scheme', 'Extra 3% off on pumps', 'On orders above ₹50,000 this month.', 'Limited', null, '/products?category=water-pumps', 2),
  ('scheme', 'Free freight above ₹1 lakh', 'Pan-India delivery on bulk orders.', 'Freight', null, '/products', 3);

insert into public.sponsored_ads (sponsor_name, headline, body, link_url, cta_label, sort_order) values
  ('WireMax Cables', 'FR-grade house wires for every install', 'Stock the cables your electricians ask for. Dealer schemes available.', 'https://example.com', 'View offer', 1),
  ('QuickShip Logistics', 'Same-week freight for electrical dealers', 'Part-load and full-truck shipping across 600+ towns.', 'https://example.com', 'Get a quote', 2);
