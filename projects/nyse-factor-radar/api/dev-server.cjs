const http = require('node:http');
const quotes = require('./quotes.js');

const port = Number(process.env.PORT || 8787);

const server = http.createServer((request, response) => {
  if (request.url === '/api/quotes') {
    quotes(request, response);
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Quote API running at http://127.0.0.1:${port}/api/quotes`);
});
