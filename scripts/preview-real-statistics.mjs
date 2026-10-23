import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createReadonlyPreviewProxy } from './lib/readonly-preview-proxy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const preload = fileURLToPath(
  new URL('./preview-loopback.cjs', import.meta.url),
);
const ports = { web: 18771, ssh: 18881, proxy: 18882 };
const children = [];
const processGroups = new Set();
let bridge;
let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  children.forEach((child) => {
    try {
      if (processGroups.has(child.pid)) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  });
  bridge?.close();
  setTimeout(() => process.exit(code), 300).unref();
};
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

const isOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(300);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });

try {
  for (const port of Object.values(ports)) {
    if (await isOpen(port))
      throw new Error(`本地端口 ${port} 已被占用，请先停止相应预览进程。`);
  }
  const ssh = spawn(
    'ssh',
    [
      '-o',
      'BatchMode=yes',
      '-o',
      'ConnectTimeout=12',
      '-o',
      'ExitOnForwardFailure=yes',
      '-o',
      'ServerAliveInterval=30',
      '-o',
      'ServerAliveCountMax=3',
      '-N',
      '-L',
      `127.0.0.1:${ports.ssh}:127.0.0.1:15090`,
      '-p',
      '233',
      'root@server.329509.xyz',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  children.push(ssh);
  ssh.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  ssh.on('exit', () => {
    if (!stopping) {
      console.error('server 只读连接已断开。');
      stop(1);
    }
  });
  const deadline = Date.now() + 15_000;
  while (!(await isOpen(ports.ssh))) {
    if (stopping || Date.now() > deadline)
      throw new Error('无法建立 server 的只读连接。');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  bridge = createReadonlyPreviewProxy(`http://127.0.0.1:${ports.ssh}`);
  await new Promise((resolve, reject) => {
    bridge.once('error', reject);
    bridge.listen(ports.proxy, '127.0.0.1', resolve);
  });
  const dev = spawn(
    process.execPath,
    [
      '--require',
      preload,
      fileURLToPath(
        new URL('../node_modules/@umijs/max/bin/max.js', import.meta.url),
      ),
      'dev',
    ],
    {
      cwd: root,
      detached: process.platform !== 'win32',
      stdio: 'inherit',
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(ports.web),
        BROWSER: 'none',
        MOCK: 'none',
        ENABLE_PROXY: 'true',
        DISABLE_PROXY: 'false',
        GROUP_CENTER_URL: `http://127.0.0.1:${ports.proxy}`,
        PREVIEW_READONLY_URL: `http://127.0.0.1:${ports.proxy}`,
        GROUP_CENTER_REAL_PREVIEW: '1',
      },
    },
  );
  children.push(dev);
  if (process.platform !== 'win32' && dev.pid) processGroups.add(dev.pid);
  dev.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  dev.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
  console.log(
    `server 真实数据只读预览：http://127.0.0.1:${ports.web}/statistics`,
  );
} catch (error) {
  console.error(error.message);
  stop(1);
}
