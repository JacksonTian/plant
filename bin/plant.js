#!/usr/bin/env node

import path from 'path';
import plant from '../lib/plant.js';

const [appDirStr, portStr] = process.argv.slice(2);
const appDir = path.resolve(appDirStr);
const port = parseInt(portStr) || 7001;

await plant.startApplication({
  appDir,
  port
});

console.log(`App(${appDir}) started at port ${port}`);
