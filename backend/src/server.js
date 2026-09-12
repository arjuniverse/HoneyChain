import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seed } from './seed.js';
import { startIotSim } from './iot.js';
import { core } from './routesCore.js';
import { trace } from './routesTrace.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_q, res) => res.json({ status: 'ok', service: 'honey-chain-backend', time: new Date().toISOString() }));
app.use('/api', core);
app.use('/api', trace);

const here = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

seed();
startIotSim();

app.listen(PORT, () => {
  console.log(`[Honey Chain] backend listening on http://localhost:${PORT}`);
});

export default app;