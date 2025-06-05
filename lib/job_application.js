import path from 'path';
import fs from 'fs';
import { readdir, readFile } from 'fs/promises';

async function accessable(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(err ? false : true);
    });
  });
}

export default class JobApplication {
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
    // load jobs
    this.jobs = await this.loadJobs();
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

    this.innerInstances = {};

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
        this.innerInstances[filePath.replace('.js', '')] = instance;
        const client = await instance.get(this.config);
        modules.set(filePath.replace('.js', ''), client);
      }
    }

    return proxy;
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

  async loadJobs() {
    const jobs = {};
    // Load jobs
    const jobsDir = path.join(this.appDir, 'app/job');
    if (!(await accessable(jobsDir))) {
      console.warn('no job folder found');
      return jobs;
    }

    const dir = await readdir(jobsDir);
    for (const filePath of dir) {
      if (filePath.endsWith('.js')) {
        const module = await import(path.join(jobsDir, filePath));
        const service = new module.default(this);
        jobs[filePath.replace('.js', '')] = service;
      }
    }

    return jobs;
  }

  async schedule(argv) {
    console.log(argv);
    try {
      if (argv.j) {
        const job = this.jobs[argv.j];
        if (!job) {
          console.error(`job ${argv.j} not found`);
          return;
        }

        await job.run();
      }
    } finally {
      await this.close();
    }
  }

  async close() {
    for (const instance of Object.values(this.innerInstances)) {
      await instance.close();
    }
  }
}
