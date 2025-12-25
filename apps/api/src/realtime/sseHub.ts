import type { Response } from "express";

type Client = { res: Response };

const sessions = new Map<string, Set<Client>>();

export function addClient(sessionId: string, res: Response) {
  const set = sessions.get(sessionId) ?? new Set<Client>();
  set.add({ res });
  sessions.set(sessionId, set);
}

export function removeClient(sessionId: string, res: Response) {
  const set = sessions.get(sessionId);
  if (!set) return;
  for (const c of set) if (c.res === res) set.delete(c);
  if (set.size === 0) sessions.delete(sessionId);
}

export function broadcast(sessionId: string, event: string, data: unknown) {
  const set = sessions.get(sessionId);
  if (!set) return;

  for (const { res } of set) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
