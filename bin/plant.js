#!/usr/bin/env node

import plant from '../lib/plant.js';

const [appDir, portStr] = process.argv.slice(2);
const port = parseInt(portStr) || 7001;

await plant.startApplication({
  appDir: appDir,
  port
});

console.log(`App(${appDir}) started at port ${port}`);
