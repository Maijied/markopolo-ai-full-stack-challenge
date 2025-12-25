create table if not exists connections (
  id uuid primary key,
  source text not null check (source in ('website','shopify','crm')),
  status text not null check (status in ('connected','disconnected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_connections_source on connections(source);
