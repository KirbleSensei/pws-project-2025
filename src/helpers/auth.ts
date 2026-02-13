import { scryptSync, randomBytes } from 'crypto';
import { Express, Request, Response, NextFunction, Router, RequestHandler } from 'express';
import session from 'express-session';
import passport from 'passport';
import SQLiteStoreFactory from 'connect-sqlite3';

import { User } from '../model/user';
import { HttpError } from './errors';
import { reloadUsers } from './sysdb';
import { broadcast } from './websocket';

export const authRouter = Router();

export let sessionStore: session.Store;

interface AuthRequest extends Request {
  user?: User;
}

export function requireRole(roles: number[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const user = authReq.user as User | undefined;
    const hasRole = user?.roles?.some(role => roles.includes(role));
    if (!hasRole) {
      throw new HttpError(403, 'You do not have permission to do this');
    }
    next();
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashToCompare = scryptSync(password, salt, 64).toString('hex');
  return hash === hashToCompare;
}

export const users: User[] = []

// Initialize authentication
export async function initAuth(app: Express, reset: boolean = false): Promise<void> {

  // Define JSON strategy
  const { Strategy } = require('passport-json') as any;
  passport.use(
    new Strategy((username: string, password: string, done: (err: any, user?: User | false, info?: any) => void) => {
      const user: User | undefined = findUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }
      if (!verifyPassword(password, user.password || '')) {
        return done(null, false, { message: 'Invalid password' });
      }
      return done(null, user);
    })
  );

  // Middleware setup with persistent sessions
  const SQLiteStore = SQLiteStoreFactory(session);
  sessionStore = new SQLiteStore({ db: process.env.SESSIONSDBFILE || './db/sessions.sqlite3' }) as session.Store;
  app.use(
    session({
      secret: process.env.SECRETKEY || 'mysecretkey',
      resave: false,
      saveUninitialized: false,
      // store sessions in sqlite database
      store: sessionStore,
      cookie: { maxAge: 86400000 } // default 1 day
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  if(reset) {
    users.length = 0;
  }
  if(users.length > 0) return; // already initialized
  reloadUsers();
}

// Find user helpers
function findUserById(id: number): User | undefined {
  return users.find((u) => { return u.id === id; });
}

// Exported version without password
export function findUserByIdSafe(id: number): Omit<User, 'password'> | undefined {
  const user = findUserById(id);
  if (!user) return undefined;
  const { password, ...safeUser } = user;
  return safeUser;
}

function findUserByUsername(username: string): User | undefined {
  return users.find((u) => { return u.username === username; });
}


// Serialize user to store in session (User -> user.id)
passport.serializeUser((user: Express.User, done: (err: any, id?: number) => void) => {
  done(null, (user as User).id);
});

// Deserialize user from session (user.id -> User)
passport.deserializeUser((id: number, done: (err: any, user?: User | false | null) => void) => {
  const user: User | undefined = findUserById(id);
  done(null, user || false);
});

authRouter.post('', passport.authenticate('json'), (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  broadcast([ 0 ], { type: 'login', data: 'New user successfully logged in' });
  res.json({
    message: 'Logged in successfully',
    username: authReq.user?.username,
    roles: authReq.user?.roles
  });
});

// Route to logout
authRouter.delete('', (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;  
  authReq.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logged out' });
  });
});

// Route to whoami
authRouter.get('', (req: Request, res: Response) => {
  if(req.isAuthenticated()) {
    const user = req.user as User;
    res.json({ username: user.username, roles: user.roles });
  } else {
    res.json({ username: null, roles: null });
  }
});