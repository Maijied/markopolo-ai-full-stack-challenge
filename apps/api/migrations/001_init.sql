create table if not exists chat_sessions (
  id uuid primary key,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_created
  on chat_messages(session_id, created_at);
