-- ============================================
-- ContentMap: Database Schema for Supabase
-- Run this in Supabase SQL Editor (once)
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Products
create table if not exists public.products (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type_id text not null default 'lead_magnet',
  format text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  price text not null default '',
  currency text not null default 'RUB',
  description text not null default '',
  link text not null default '',
  created_date text not null default '',
  publish_date text not null default '',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "Users manage own products" on public.products for all using (auth.uid() = user_id);

-- 3. Topics
create table if not exists public.topics (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  thesis_plan text not null default '',
  is_idea_bank boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;
create policy "Users manage own topics" on public.topics for all using (auth.uid() = user_id);

-- 4. Content Items
create table if not exists public.content_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id bigint references public.topics(id) on delete cascade,
  platform_id text not null default 'tg_post',
  status text not null default 'idea' check (status in ('idea', 'in_progress', 'ready', 'published')),
  title text not null default '',
  body text not null default '',
  created_date text not null default '',
  publish_date text not null default '',
  created_at timestamptz not null default now()
);

alter table public.content_items enable row level security;
create policy "Users manage own content" on public.content_items for all using (auth.uid() = user_id);

-- 5. Funnels
create table if not exists public.funnels (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  badge_color text not null default 'violet',
  product text not null default '',
  product_type text not null default '',
  active boolean not null default true,
  content_count int not null default 0,
  leads int not null default 0,
  sales int not null default 0,
  cta text not null default '',
  content_item_ids bigint[] not null default '{}',
  lead_magnet_id bigint,
  tripwire_id bigint,
  mid_ticket_id bigint,
  flagship_id bigint,
  consultation_id bigint,
  created_at timestamptz not null default now()
);

alter table public.funnels enable row level security;
create policy "Users manage own funnels" on public.funnels for all using (auth.uid() = user_id);

-- 6. Custom Calendar Events
create table if not exists public.custom_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date text not null,
  time text,
  color text not null default '#f59e0b',
  created_at timestamptz not null default now()
);

alter table public.custom_events enable row level security;
create policy "Users manage own events" on public.custom_events for all using (auth.uid() = user_id);

-- 7. Keywords
create table if not exists public.keywords (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique(user_id, keyword)
);

alter table public.keywords enable row level security;
create policy "Users manage own keywords" on public.keywords for all using (auth.uid() = user_id);

-- 8. Formats
create table if not exists public.formats (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table public.formats enable row level security;
create policy "Users manage own formats" on public.formats for all using (auth.uid() = user_id);
