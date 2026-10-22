import { spawn } from 'child_process';
const env = { ...process.env, NODE_ENV: 'production' };
const child = spawn('npx', ['tsx', 'server.ts'], { env, stdio: 'inherit' });
setTimeout(() => child.kill(), 3000);
