const net = require('net');
const http = require('http');
const url = require('url');

const PROXY_PORT = 8080;

// Embedded HTML that announces "Server is ACTIVE"
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proxy Server - ACTIVE</title>
    <style>
        body {
            font-family: monospace;
            max-width: 700px;
            margin: 50px auto;
            padding: 20px;
            background: #0a0a0a;
            color: #0f0;
            text-align: center;
        }
        .box {
            border: 2px solid #0f0;
            padding: 30px;
            border-radius: 15px;
            background: #111;
        }
        h1 { font-size: 2.5em; margin: 0 0 10px; }
        .active { font-size: 1.2em; letter-spacing: 2px; }
        pre {
            text-align: left;
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            color: #0f0;
        }
        hr { border-color: #0f0; margin: 30px 0; }
        .small { font-size: 0.8em; color: #6f6; }
    </style>
</head>
<body>
<div class="box">
    <h1>🚀 PROXY SERVER</h1>
    <div class="active">✅ SERVER IS ACTIVE ✅</div>
    <p>CONNECT method supported – works with PlayStation, Xbox, Switch, Android TV</p>
    <hr>
    <h3>📡 Proxy Settings</h3>
    <pre>Host: <span id="ip">(your server IP)</span><br>Port: 8080</pre>
    <p>No authentication required (private network only)</p>
    <hr>
    <h3>⚡ Test Command</h3>
    <pre>curl -x http://<span id="testIp">server-ip</span>:8080 https://httpbin.org/ip</pre>
    <p class="small">Should return the proxy server's public IP</p>
</div>
<script>
    fetch('/proxy?url=http://httpbin.org/ip')
        .then(r => r.json())
        .then(d => {
            document.getElementById('ip').innerText = d.origin;
            document.getElementById('testIp').innerText = d.origin;
        })
        .catch(() => {
            document.getElementById('ip').innerText = window.location.hostname;
            document.getElementById('testIp').innerText = window.location.hostname;
        });
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(INDEX_HTML);
    return;
  }

  // HTTP proxy forwarding
  let targetUrl;
  try {
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

// CONNECT for HTTPS tunnels
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
  clientSocket.on('error', () => serverSocket.end());
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`\n✅ Proxy server is ACTIVE on port ${PROXY_PORT}`);
  console.log(`🌐 Web interface: http://localhost:${PROXY_PORT}/`);
  console.log(`🔧 Use on any console: set proxy to this machine's IP, port ${PROXY_PORT}\n`);
});
