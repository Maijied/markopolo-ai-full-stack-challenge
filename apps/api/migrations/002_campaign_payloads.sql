create table if not exists campaign_payloads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);
