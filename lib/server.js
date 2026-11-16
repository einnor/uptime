const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const config = require('./config');
const handlers = require('./handlers');

const server = {};
server.router = {
  '': handlers.index,
  ping: handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
};

server.unifiedServer = (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const trimmedPath = url.pathname.replace(/^\/+|\/+$/g, '');
  const chunks = [];
  let bytes = 0;
  let tooLarge = false;
  request.on('error', () => response.destroy());
  request.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > 65536) {
      if (!tooLarge) {
        tooLarge = true;
        response.writeHead(413, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ Error: 'Request body exceeds 64 KiB' }));
      }
    } else chunks.push(chunk);
  });
  request.on('end', () => {
    if (tooLarge) return;
    let payload = {};
    try {
      const body = Buffer.concat(chunks).toString('utf8');
      if (body) payload = JSON.parse(body);
      if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid body');
    } catch {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ Error: 'Expected a JSON object' }));
      return;
    }
    const handler = server.router[trimmedPath] || handlers.notFound;
    handler({
      trimmedPath,
      method: request.method.toLowerCase(),
      queryStringObject: Object.fromEntries(url.searchParams),
      headers: request.headers,
      payload,
    }, (status = 200, result = {}, contentType = 'json') => {
      response.writeHead(status, {
        'Content-Type': contentType === 'html' ? 'text/html; charset=utf-8' : 'application/json',
      });
      response.end(contentType === 'html' ? String(result) : JSON.stringify(result));
    });
  });
};

server.httpServer = http.createServer(server.unifiedServer);
server.init = () => {
  const keyPath = process.env.TLS_KEY_PATH;
  const certPath = process.env.TLS_CERT_PATH;
  if (Boolean(keyPath) !== Boolean(certPath)) throw new Error('Set both TLS_KEY_PATH and TLS_CERT_PATH');
  if (keyPath && certPath) {
    server.httpsServer = https.createServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }, server.unifiedServer);
    server.httpsServer.listen(config.httpsPort, config.host);
  }
  server.httpServer.listen(config.httpPort, config.host, () => {
    console.log(`Uptime API listening at http://${config.host}:${server.httpServer.address().port}`);
  });
};

module.exports = server;
