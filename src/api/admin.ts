import { Request, Response, Router } from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { requireRole, findUserByIdSafe, sessionStore } from '../helpers/auth';
import { db } from '../helpers/db';
import { HttpError } from '../helpers/errors';
import { broadcast } from '../helpers/websocket';

export const adminRouter = Router();

type EditLock = { owner: string; userId: number; resource: string; createdAt: number };
const editLocks = new Map<string, EditLock>();

async function readActiveSessions() {
  const sessionDb = await open({
    filename: process.env.SESSIONSDBFILE || './db/sessions.sqlite3',
    driver: sqlite3.Database
  });
  try {
    const rows = await sessionDb.all('SELECT sid, sess, expire FROM sessions ORDER BY expire DESC');
    const now = Date.now();
    return rows
      .map((r: any) => {
        try {
          const sess = JSON.parse(r.sess);
          const userId = sess?.passport?.user;
          if (!userId) return null;
          const user = findUserByIdSafe(userId);
          if (!user) return null;
          return {
            sid: r.sid,
            username: user.username,
            roles: user.roles,
            userId,
            expire: r.expire,
            expired: r.expire * 1000 < now
          };
        } catch {
          return null;
        }
      })
      .filter((v: any) => !!v);
  } finally {
    await sessionDb.close();
  }
}

adminRouter.get('/changes', requireRole([0]), async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 200, 2000);
  const rows = await db.connection!.all(
    'SELECT id, table_name, operation, row_id, username, payload, created_at FROM change_log ORDER BY created_at DESC LIMIT ?',
    limit
  );
  res.json(rows.map((r: any) => ({
    ...r,
    payload: r.payload ? JSON.parse(r.payload) : null
  })));
});

adminRouter.get('/users', requireRole([0]), async (req: Request, res: Response) => {
  const currentSid = (req as any).sessionID as string;
  const sessions = await readActiveSessions();
  res.json(sessions.map((s: any) => ({
    ...s,
    current: s.sid === currentSid
  })));
});

adminRouter.delete('/users', requireRole([0]), async (req: Request, res: Response) => {
  const sid = (req.query.sid as string) || '';
  if (!sid) throw new HttpError(400, 'sid was not provided');

  await new Promise<void>((resolve, reject) => {
    sessionStore.destroy(sid, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  broadcast([0], { type: 'active_users_changed', data: 'Session was terminated by admin' });
  res.json({ ok: true, sid });
});

adminRouter.post('/locks/acquire', requireRole([0]), async (req: Request, res: Response) => {
  const resource = (req.body?.resource ?? '').toString();
  if (!resource) throw new HttpError(400, 'resource was not provided');

  const user = req.user as any;
  const current = editLocks.get(resource);
  if (current && current.userId !== user.id) {
    throw new HttpError(409, `Resource is being edited by ${current.owner}`);
  }

  editLocks.set(resource, {
    owner: user.username,
    userId: user.id,
    resource,
    createdAt: Date.now()
  });
  broadcast([0], { type: 'edit_lock_changed', data: { resource, owner: user.username, locked: true } });
  res.json({ ok: true, resource, owner: user.username });
});

adminRouter.post('/locks/release', requireRole([0]), async (req: Request, res: Response) => {
  const resource = (req.body?.resource ?? '').toString();
  if (!resource) throw new HttpError(400, 'resource was not provided');

  const user = req.user as any;
  const current = editLocks.get(resource);
  if (current && current.userId !== user.id) {
    throw new HttpError(409, `Resource is being edited by ${current.owner}`);
  }

  editLocks.delete(resource);
  broadcast([0], { type: 'edit_lock_changed', data: { resource, owner: user.username, locked: false } });
  res.json({ ok: true, resource });
});
