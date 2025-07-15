import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!\n');
});

// Configure keep-alive timeout (in milliseconds)
server.keepAliveTimeout = 60 * 1000; // 60 seconds
server.headersTimeout = 60 * 1000 + 2000; // Should be longer than keepAliveTimeout

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});