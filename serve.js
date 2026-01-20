#!/usr/bin/env node
// Simple HTTP server for local development

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.mid': 'audio/midi',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Handle root path
  let filePath = req.url === '/' ? '/index.html' : req.url;

  // Remove query strings
  filePath = filePath.split('?')[0];

  // Decode URL-encoded characters (e.g., %20 -> space)
  filePath = decodeURIComponent(filePath);

  // Resolve to absolute path
  filePath = path.join(__dirname, filePath);

  // Get file extension and content type
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\nDrum Practice Game Server`);
  console.log(`========================`);
  console.log(`Running at: http://localhost:${PORT}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
