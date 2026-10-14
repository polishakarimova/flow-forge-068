export async function ensureBaseSchema(pgPool) {
  await pgPool.query(`
    create extension if not exists pgcrypto;
    do $$ begin
      create type "AuthProvider" as enum ('telegram');
    exception when duplicate_object then null; end $$;
    do $$ begin
      create type "TelegramLoginStatus" as enum ('PENDING', 'CONFIRMED', 'USED', 'EXPIRED');
    exception when duplicate_object then null; end $$;
    create table if not exists users (
      id text primary key,
      "displayName" text,
      "avatarUrl" text,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now()
    );
    create table if not exists auth_identities (
      id text primary key default gen_random_uuid()::text,
      "userId" text not null references users(id) on delete cascade,
      provider "AuthProvider" not null,
      "providerUserId" text not null,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now(),
      unique(provider, "providerUserId")
    );
    create table if not exists telegram_accounts (
      id text primary key default gen_random_uuid()::text,
      "userId" text not null references users(id) on delete cascade,
      "telegramId" text not null unique,
      username text,
      "firstName" text,
      "lastName" text,
      "photoUrl" text,
      "languageCode" text,
      "chatId" text,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now()
    );
    create table if not exists telegram_login_requests (
      id text primary key default gen_random_uuid()::text,
      "tokenHash" text not null unique,
      "browserHash" text,
      "returnTo" text,
      status "TelegramLoginStatus" not null default 'PENDING',
      "userId" text references users(id) on delete set null,
      "telegramId" text,
      "chatId" text,
      "createdAt" timestamptz not null default now(),
      "expiresAt" timestamptz not null,
      "confirmedAt" timestamptz,
      "usedAt" timestamptz
    );
    alter table telegram_login_requests add column if not exists "browserHash" text;
    create table if not exists cm_users (
      id text primary key,
      data jsonb not null
    );
    create table if not exists cm_login_tokens (
      token text primary key,
      data jsonb not null
    );
    create table if not exists cm_user_state (
      user_id text not null,
      key text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (user_id, key)
    );
    create table if not exists cm_admin_actions (
      id text primary key,
      admin_user_id text,
      action text not null,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create index if not exists auth_identities_user_id_idx on auth_identities ("userId");
    create index if not exists telegram_accounts_user_id_idx on telegram_accounts ("userId");
    create index if not exists telegram_login_requests_user_id_idx on telegram_login_requests ("userId");
    create index if not exists telegram_login_requests_telegram_id_idx on telegram_login_requests ("telegramId");
  `);
}
