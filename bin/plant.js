#!/usr/bin/env node

import path from 'path';

import minimist from 'minimist';

import plant from '../lib/plant.js';

const argv = minimist(process.argv.slice(2));

const appDir = path.resolve(argv.appdir || '.');
const port = parseInt(argv.port) || 7001;
const hostname = argv.hostname || '127.0.0.1';

await plant.startApplication({
  appDir,
  hostname,
  port
});

console.log(`App(${appDir}) started at port ${port}`);
