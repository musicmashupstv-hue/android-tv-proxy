const net = require('net');
const http = require('http');
const url = require('url');

const PROXY_PORT = 8080;

// Embedded index.html as a string
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proxy Server - Console Compatible</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #0a0e27;
            color: #e0e0e0;
        }
        .card {
            background: #1e2444;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        h1 {
            color: #6ee7b7;
            margin-top: 0;
        }
        code {
            background: #2d3748;
            padding: 0.2rem 0.4rem;
            border-radius: 6px;
            font-family: monospace;
        }
        pre {
            background: #0f1222;
            padding: 1rem;
            border-radius: 12px;
            overflow-x: auto;
        }
        .status {
            background: #2b6e4f;
            display: inline-block;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        hr {
            border-color: #2d3748;
            margin: 1.5rem 0;
        }
        footer {
            text-align: center;
            margin-top: 2rem;
            font-size: 0.8rem;
            color: #6c7293;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>🚀 Console-Ready Proxy Server</h1>
        <p><span class="status">✅ ACTIVE</span> — CONNECT method supported</p>
        <p>This proxy works with <strong>PlayStation, Xbox, Nintendo Switch, Android TV, and any other device</strong> that supports HTTP/HTTPS proxies.</p>
        
        <hr>
        
        <h2>📡 Proxy Configuration</h2>
        <p>On your console or device, enter:</p>
        <pre>Proxy Host: <span id="proxyHost">loading...</span><br>Proxy Port: <code>8080</code></pre>
        <p><em>No authentication required (for local/private networks only).</em></p>
        
        <hr>
        
        <h2>⚡ Test the Proxy</h2>
        <p>From any device on the same network, run:</p>
        <pre>curl -x http://<span id="curlHost">server-ip</span>:8080 https://httpbin.org/ip</pre>
        <p>It should return the proxy server's IP address.</p>
        
        <hr>
        
        <h2>🔧 Supported Features</h2>
        <ul>
            <li>✅ HTTP & HTTPS (CONNECT tunnel)</li>
            <li>✅ WebSockets</li>
            <li>✅ All consoles (PS4/PS5, Xbox, Switch)</li>
            <li>✅ Android TV & Apple TV</li>
            <li>✅ No software install needed on client</li>
        </ul>
        
        <footer>
            Proxy server running on Node.js | All traffic is forwarded transparently
        </footer>
    </div>
    
    <script>
        fetch('/proxy?url=http://httpbin.org/ip')
            .then(res => res.json())
            .then(data => {
                const ip = data.origin;
                document.getElementById('proxyHost').innerText = ip;
                document.getElementById('curlHost').innerText = ip;
            })
            .catch(() => {
                document.getElementById('proxyHost').innerText = window.location.hostname || 'your-server-ip';
                document.getElementById('curlHost').innerText = window.location.hostname || 'your-server-ip';
            });
    </script>
</body>
</html>`;

// Create HTTP server for both proxy traffic and static file serving
const server = http.createServer((req, res) => {
  // Serve index.html for root path
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(INDEX_HTML);
    return;
  }

  // For any other path, treat as HTTP proxy request
  let targetUrl;
  try {
    // The request may be a full URL (e.g., "http://example.com/") or a path
    targetUrl = req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`;
    const parsed = new URL(targetUrl);
    
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    req.pipe(proxyReq);
    
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    });
  } catch (err) {
    res.writeHead(400);
    res.end(`Invalid request: ${err.message}`);
  }
});

// Handle CONNECT method (HTTPS, WebSockets, etc.)
server.on('connect', (req, clientSocket, head) => {
  const { hostname, port } = url.parse(`//${req.url}`);
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  
  serverSocket.on('error', (err) => {
    clientSocket.end(`HTTP/1.1 502 Bad Gateway\r\n\r\n${err.message}`);
  });
  
  clientSocket.on('error', () => {
    serverSocket.end();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`✅ CONNECT-capable proxy listening on port ${PROXY_PORT}`);
  console.log(`🌐 Web interface available at http://localhost:${PROXY_PORT}/`);
  console.log(`🔧 Use this proxy on any console: set proxy to your server IP and port ${PROXY_PORT}`);
});
