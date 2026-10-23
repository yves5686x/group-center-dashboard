import http from 'node:http';

/** A local bridge for real-data previews. Only the task-search POST is read-only. */
export const createReadonlyPreviewProxy = (
  upstream = 'http://127.0.0.1:18881',
) => {
  const destination = new URL(upstream);
  if (
    destination.protocol !== 'http:' ||
    destination.hostname !== '127.0.0.1'
  ) {
    throw new Error('The preview upstream must be the local SSH forward.');
  }
  return http.createServer((request, response) => {
    const path = request.url ?? '/';
    const pathname = path.split('?')[0];
    if (!path.startsWith('/') || path.startsWith('//')) {
      response.writeHead(400).end();
      return;
    }
    const read = ['GET', 'HEAD'].includes(request.method);
    const search =
      request.method === 'POST' && pathname === '/web/open/gpu-tasks/query';
    if (!read && !search) {
      response.writeHead(405, {
        'Content-Type': 'application/json',
        Allow: 'GET, HEAD',
      });
      response.end(
        JSON.stringify({
          isSucceed: false,
          message: '本地真实数据预览为只读连接',
        }),
      );
      request.resume();
      return;
    }
    const headers = { ...request.headers, host: destination.host };
    delete headers.connection;
    const remote = http.request(
      {
        hostname: destination.hostname,
        port: destination.port,
        path,
        method: request.method,
        headers,
        timeout: 35_000,
      },
      (incoming) => {
        const forwarded = {
          ...incoming.headers,
          'x-gc-preview-source': 'server-read-only',
          'cache-control': 'no-store',
        };
        delete forwarded.connection;
        response.writeHead(incoming.statusCode ?? 502, forwarded);
        incoming.pipe(response);
      },
    );
    remote.on('timeout', () =>
      remote.destroy(new Error('Preview read timed out')),
    );
    remote.on('error', () => {
      if (response.headersSent) response.destroy();
      else {
        response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            isSucceed: false,
            message: 'server 只读连接暂时不可用',
          }),
        );
      }
    });
    response.on('close', () => {
      if (!response.writableFinished) remote.destroy();
    });
    request.pipe(remote);
  });
};
