import { createApp } from './app.js';
import { env } from './config.js';
import { store } from './data/store.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`\n  DieselP2P API  →  http://localhost:${env.port}/api`);
  console.log(`  Store: ${store.kind}${store.kind === 'memory' ? ' (datos seed en memoria)' : ' (Supabase)'}`);
  console.log(`  Demo mode: ${env.demoMode ? 'ON' : 'OFF'}\n  MVP DEMO — DATOS SIMULADOS\n`);
});
