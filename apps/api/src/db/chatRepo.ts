import { pgPool } from "../lib/pg";

export type ChatRole = "user" | "assistant" | "system";

export async function createSession(id: string) {
  await pgPool.query(
    "insert into chat_sessions (id) values ($1)",
    [id]
  );
}

export async function insertMessage(input: {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
}) {
  const q = `
    insert into chat_messages (id, session_id, role, content)
    values ($1, $2, $3, $4)
    returning id, session_id, role, content, created_at
  `;
  const r = await pgPool.query(q, [input.id, input.sessionId, input.role, input.content]);
  return r.rows[0];
}

export async function listMessages(sessionId: string) {
  const r = await pgPool.query(
    `select id, session_id, role, content, created_at
     from chat_messages
     where session_id = $1
     order by created_at asc`,
    [sessionId]
  );
  return r.rows;
}
