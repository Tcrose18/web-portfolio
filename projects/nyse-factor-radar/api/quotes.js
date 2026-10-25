const { quotePayload } = require('./quote-service.cjs');

module.exports = async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(await quotePayload()));
};
