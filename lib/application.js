import path from 'path';
import fs from 'fs';
import { readdir, readFile } from 'fs/promises';

import Context from './context.js';
import OptimizedRouter from './optimized_router.js';
import DefaultRouter from './default_router.js';

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
    // create services
    this.services = await this.loadServices();
    // initialiaze middlewares
    this.middlewares = await this.loadMiddlewares();
    // initialiaze routes
    this.router = await this.loadRoutes();
  }

  async loadConfigurations() {
    // load configurations
    // Load default configurations
    let defaultConf = {};
    const defaultConfPath = path.join(this.appDir, 'config/config.default.js');
    if (await accessable(defaultConfPath)) {
      defaultConf = await import(defaultConfPath);
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
    const proxy = new Proxy({}, {
      get: function (target, prop) {
        if (modules.has(prop)) {
          return modules.get(prop);
        } else {
          return null;
        }
      }
    });

    // Load database
    // Load redis
    const instancesDir = path.join(this.appDir, 'app/instance');
    if (!(await accessable(instancesDir))) {
      console.warn('no instance folder found');
      return proxy;
    }

    const dir = await readdir(instancesDir);
    for (const filePath of dir) {
      if (filePath.endsWith('.js')) {
        const module = await import(path.join(instancesDir, filePath));
        const instance = new module.default();
        const client = await instance.get(this.config);
        modules.set(filePath.replace('.js', ''), client);
      }
    }

    return proxy;
  }

  async loadMiddlewares() {
    // Load middlewares
    const middlewarePath = path.join(this.appDir, 'app/middleware.js');
    if (await accessable(middlewarePath)) {
      const module = await import(middlewarePath);
      return module.default;
    }
    return [];
  }

  async loadServices() {
    const services = {};
    // Load services
    const servicesDir = path.join(this.appDir, 'app/service');
    if (!(await accessable(servicesDir))) {
      console.warn('no service folder found');
      return services;
    }

    const dir = await readdir(servicesDir);
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
    const routerPath = path.join(this.appDir, 'app/router.js');
    if (!(await accessable(routerPath))) {
      console.warn('no router file found');
      return new DefaultRouter();
    }

    const module = await import(routerPath);
    return new OptimizedRouter(module.default);
  }

  #dispatch(method, url) {
    const [path] = url.split('?');
    return this.router.dispatch(method, path);
  }

  async runMiddlewares(ctx) {
    const middlewares = this.middlewares;
    let index = -1;
    let runAll = false;

    const next = async (i) => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }

      index = i;

      const middleware = middlewares[index];
      if (!middleware) {
        runAll = true;
        return;
      }

      await middleware(ctx, next.bind(null, i + 1));
    };

    await next(0);
    return runAll;
  }

  #respond(ctx, req, res) {
    if (ctx.type) {
      res.setHeader('Content-Type', ctx.type);
    }
    if (typeof ctx.body === 'string') {
      res.end(ctx.body);
    } else if (Buffer.isBuffer(ctx.body)) {
      res.setHeader('Content-Length', ctx.body.length);
      res.setHeader('Server', 'plant.js');
      res.writeHead(200);
      res.end(ctx.body);
    } else if ('function' === typeof ctx.body.pipe) {
      res.setHeader('Server', 'plant.js');
      ctx.body.pipe(res);
    } else if (typeof ctx.body === 'object') {
      const body = JSON.stringify(ctx.body);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.writeHead(200);
      res.end(body);
    }
  }

  handler() {
    const app = this;
    return async function (req, res) {
      const startTime = Date.now();
      const ctx = new Context(req, res);
      const runAll = await app.runMiddlewares(ctx);
      if (!runAll) {
        app.#respond(ctx, req, res);
        return;
      }

      const route = app.#dispatch(req.method, req.url);
      const endTime = Date.now();
      console.log(`dispatch ${req.method} ${req.url} used time: ${endTime - startTime}ms`);
      if (!route) {
        res.setHeader('Server', 'plant.js');
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      try {
        ctx.params = route.params;
        // run route
        await route.route.handle(ctx, app);
      } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }

      app.#respond(ctx, req, res);
    }
  }

  async close() {
    for (const instance of Object.values(this.instances)) {
      await instance.close();
    }
  }
}
