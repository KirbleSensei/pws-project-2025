import http from 'http';
import { parse as parseCookie } from 'cookie';
import signature from 'cookie-signature';
import { SessionData } from 'express-session';
import { WebSocketServer, WebSocket } from 'ws';
import { findUserByIdSafe, sessionStore } from './auth';
import { User } from '../model/user';

interface WSMessage {
  type: string;
  data?: any;
}

interface WSWithUser extends WebSocket { // extended WebSocket to include user info
  user?: User;
}

interface ClientState {
  socket: WSWithUser;
  lastPong: number;
}

const clients = new Map<WSWithUser, ClientState>();

export function broadcast(roles: number[], msg: WSMessage) {
  const now = Date.now();

  for (const [ws, client] of clients) {
    const user = ws.user;
    if (!user) continue; // skip not-logged-ins

    // check if the user has one of the roles
    const hasRole = user.roles?.some((role: number) => roles.includes(role));
    if (!hasRole) continue;

    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error('Broadcast error:', err);
      }
    }
  }
}

export function attachWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  const PING_INTERVAL_MS = 10000;
  const PONG_TIMEOUT_MS = 30000;

  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/api/ws') {
      socket.destroy();
      return;
    }

    // get session ID from cookies
    const cookies = parseCookie(req.headers.cookie || '');
    let raw = cookies['connect.sid'];
    if (raw?.startsWith('s:')) {
      const unsign = signature.unsign(raw.slice(2), process.env.SECRETKEY || 'mysecretkey');
      raw = unsign === false ? undefined : unsign;
    }
    const sessionID = raw;
    if (sessionID) {
      sessionStore.get(sessionID, (err: any, session: SessionData | null | undefined) => {
        let userId: any = undefined;
        if (!err && session) {
          userId = (session as any).passport?.user;
        }
        const user: User | undefined = userId ? findUserByIdSafe(userId) : undefined;
        if(user) {
          console.log('Websocket connected for', user.username);
        } else {
          console.log('Websocket connected for not-logged-in');
        }
        wss.handleUpgrade(req, socket, head, ws => {
          const wsUser = ws as WSWithUser;
          wsUser.user = user;
          wss.emit('connection', wsUser, req);
        });
      });
    } else {
      socket.destroy();  // refuse ws connection without session
      return;
    }
  });

  wss.on('connection', ws => {
    const client: ClientState = {
      socket: ws,
      lastPong: Date.now(),
    };

    clients.set(ws, client);

    ws.on('message', raw => {
      let msg: WSMessage;

      try {
        msg = JSON.parse(raw.toString());
      } catch { return; }

      if (msg.type === 'pong') {
        client.lastPong = Date.now();
      }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  setInterval(() => {
    const now = Date.now();

    for (const [ws, client] of clients) {
      if (now - client.lastPong > PONG_TIMEOUT_MS) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }
  }, PING_INTERVAL_MS);
}
