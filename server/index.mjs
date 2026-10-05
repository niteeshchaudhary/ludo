import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRoomServer } from './rooms.mjs';

const production = process.argv.includes('--production');
const port = Number(production ? process.env.PORT || 3000 : process.env.ROOM_PORT || 3001);
const host = production ? process.env.HOST || '0.0.0.0' : process.env.ROOM_HOST || '127.0.0.1';
const app = createRoomServer({ publicPort: Number(process.env.PUBLIC_PORT || (production ? port : 3000)), staticDir: production ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../build') : null });
app.server.on('error', error => { console.error(`Could not start Ludo server: ${error.message}`); process.exitCode = 1; });
app.server.listen(port, host, () => console.log(`${production ? 'Ludo' : 'Room server'} listening on ${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(); });
