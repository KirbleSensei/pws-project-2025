import http from 'http';
import express from 'express';
import morgan from 'morgan';
import { config } from 'dotenv';

import { APP_VERSION } from './shared/version';
import { errorHandler } from './helpers/errors';
import { openDb as openSysDb } from './helpers/sysdb';
import { openDb } from './helpers/db';
import { authRouter, initAuth } from './helpers/auth';
import { uploadRouter } from './helpers/fileupload';
import { personsRouter } from './api/persons';
import { teamsRouter } from './api/teams';
import { tasksRouter } from './api/tasks';
import { attachWebSocketServer } from './helpers/websocket';

config({ quiet: true });

const app = express();

// log http requests
app.use(morgan(process.env.MORGANTYPE || 'tiny'));

// static files (angular app)
const frontendPath = process.env.FRONTEND || './frontend/dist/frontend/browser';
app.use(express.static(frontendPath));
// static uploaded files
app.use('/uploads', express.static(process.env.UPLOADSDIR || './uploads'));

// api url prefix
const apiUrl = process.env.APIURL || '/api';

// automatic parsing of json payloads
app.use(express.json());

async function main() {
  await openSysDb();
  console.log('OK system database connected');

  await initAuth(app);
  console.log('OK initialize authorization framework');

  await openDb();
  console.log('OK main database connected');
  
  // auth router
  app.use('/api/auth', authRouter);
  
  // file upload router
  app.use(apiUrl + '/upload', uploadRouter);

  // import and install api routers
  app.use(apiUrl + '/persons', personsRouter);
  app.use(apiUrl + '/teams', teamsRouter);
  app.use(apiUrl + '/tasks', tasksRouter);

  // install our error handler (must be the last app.use)
  app.use(errorHandler);

  // import and install websocket handler
  const server = http.createServer(app);
  attachWebSocketServer(server);

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

console.log(`Backend ${APP_VERSION} is starting...`);
main().catch(err => {
  console.error('ERROR startup failed due to', err);
})