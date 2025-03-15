import path from 'path';
import fs from 'fs';
import { readdir, readFile } from "fs/promises";

import Context from './context.js';

async function accessable(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(err ? false : true);
    });
  });
}

export default class Application {
  constructor(options) {
    this.appDir = options.appDir;
  }

  async loadApplication() {
    // load configurations
    this.config = await this.loadConfigurations();
    // create instances. for example: database, redis, etc.
    this.instances = await this.loadInstances();

    this.services = await this.loadServices();

    // initialiaze middlewares
    this.middlewares = await this.loadMiddlewares();
    // initialiaze routes
    this.router = await this.loadRoutes();
    console.log(this.router);
  }

  async loadConfigurations() {
    // load configurations
    // Load default configurations
    let defaultConf = {};
    const defaultConfPath = path.join(this.appDir, 'config/config.default.js');
    if (await accessable(defaultConfPath)) {
      defaultConf = await import(defaultConfPath);
      console.log(defaultConf);
    }

    // Load environment configurations
    const env = await this.getCurrentEnv();
    const envConfPath = path.join(this.appDir, `config/config.${env}.js`);
    if (await accessable(envConfPath)) {
      const envConf = await import(envConfPath);
      return {
        ...defaultConf,
        ...envConf
      };
    }

    return defaultConf;
  }

  async getCurrentEnv() {
    if (await accessable(path.join(this.appDir, 'config/env'))) {
      return await readFile(path.join(this.appDir, 'config/env'), 'utf-8');
    }

    return process.env.PLANT_ENV || 'prod';
  }

  async loadInstances() {
    // create instances. for example: database, redis, etc.
    const modules = new Map();
    // Load database
    // Load redis
    const instancesDir = path.join(this.appDir, 'app/instance');
    const dir = await readdir(instancesDir);
    for (const filePath of dir) {
      if (filePath.endsWith('.js')) {
        const module = await import(path.join(instancesDir, filePath));
        const instance = new module.default();
        const client = await instance.get(this.config);
        modules.set(filePath.replace('.js', ''), client);
      }
    }

    return new Proxy({}, {
      get: function (target, prop) {
        if (modules.has(prop)) {
          return modules.get(prop);
        } else {
          return null;
        }
      }
    });
  }

  async loadMiddlewares() {
    // initialiaze middlewares
    // Load middlewares
    return {};
  }

  async loadServices() {
    // Load services
    const servicesDir = path.join(this.appDir, 'app/service');
    const dir = await readdir(servicesDir);
    const services = {};
    for (const filePath of dir) {
      if (filePath.endsWith('.js')) {
        const module = await import(path.join(servicesDir, filePath));
        const service = new module.default(this);
        services[filePath.replace('.js', '')] = service;
      }
    }
    return services;
  }

  async loadRoutes() {
    // initialiaze routes
    // Load routes
    const routerPath = path.join(this.appDir, `app/router.js`);
    const module = await import(routerPath);
    return module.default;
  }

  dispatch(router, method, url) {
    const [path] = url.split('?');
    const routes = router.routes;
    for (const route of routes) {
      if (route.method === method && route.path === path) {
        return route.handler;
      }
    }
    return null;
  }

  handler() {
    const app = this;
    return async function (req, res) {
      const router = app.router;
      const handle = app.dispatch(router, req.method, req.url);
      if (!handle) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const ctx = new Context(req, res);

      try {
        await handle(ctx, app);
      } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }

      if (typeof ctx.body === 'string') {
        res.end(ctx.body);
      } else if (Buffer.isBuffer(ctx.body)) {
        res.setHeader('Content-Length', ctx.body.length);
        if (ctx.type) {
          res.setHeader('Content-Type', ctx.type);
        }
        res.setHeader('Server', 'plant.js');
        res.writeHead(200);
        res.end(ctx.body);
      } else if (typeof ctx.body === 'object') {
        const body = JSON.stringify(ctx.body);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.writeHead(200);
        res.end(body);
      }
      // for stream
      //  else if (ctx.body instanceof Stream) {

      // }
    }
  }
}
