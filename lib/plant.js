import http from 'http';

import Router from './router.js';
import Application from './application.js';
import Service from './service.js';
function listen(server, port, hostname) {
  return new Promise((resolve) => {
    server.listen(port, hostname, () => {
      resolve();
    });
  });
}

export default {
  startApplication,
  createMockApplication,
  Router,
  Service
}

function createMockApplication(options) {
  const app = new Application({
    // appDir: options.appDir
  });

  return app;
}

async function startApplication(options) {
  const hostname = options.hostname || '127.0.0.1';
  const port = options.port || 7001;
  const app = new Application(options);
  // Loader
  await app.loadApplication();
  const server = http.createServer(app.handler());
  await listen(server, port, hostname);
  console.log(`Server running at http://${hostname}:${port}/`);
  return app;
}
