#!/usr/bin/env node

import path from 'path';
import minimist from 'minimist';
import plant from '../lib/plant.js';

const argv = minimist(process.argv.slice(2));
const command = argv._[0];

if (!command || !['start', 'run'].includes(command)) {
  console.error('Usage: plant <command> [options]');
  console.error('\nCommands:');
  console.error('  start    Start the application server');
  console.error('  run      Run a job');
  process.exit(1);
}

const appDir = path.resolve(argv.appdir || '.');

if (command === 'start') {
  const port = parseInt(argv.port) || 7001;
  const hostname = argv.hostname || '127.0.0.1';

  const app = await plant.startApplication({
    appDir,
    hostname,
    port
  });

  console.log(`App(${appDir}) started at port ${port}`);

  process.on('SIGINT', async () => {
    console.log('Received SIGINT signal, shutting down...');
    await app.close();
    process.exit(0);
  });
} else if (command === 'run') {
  const app = await plant.startJobApplication({
    appDir
  });

  await app.schedule(argv);
}