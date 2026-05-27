export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle OPTIONS preflight for CORS
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Dedicated proxy endpoint: /proxy?url=<encoded_target_url>
    if (path === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing ?url= parameter', { status: 400 });
      }
      return proxyRequestTo(targetUrl, request);
    }

    // Fallback: treat the full request path as the target URL (for general forward proxy)
    // e.g., GET http://example.com/ HTTP/1.1
    let target = url.toString();
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      target = url.toString();
    } else if (url.pathname.startsWith('http://') || url.pathname.startsWith('https://')) {
      target = url.pathname + url.search;
    } else {
      // Not a proxy-style request, return help
      return new Response(
        `Usage: /proxy?url=<encoded_url>\nExample: /proxy?url=https://httpbin.org/get`,
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    return proxyRequestTo(target, request);
  },
};

async function proxyRequestTo(targetUrl, originalRequest) {
  try {
    // Build new request headers (remove proxy-specific ones)
    const headers = new Headers(originalRequest.headers);
    headers.delete('Proxy-Connection');
    headers.delete('Proxy-Authorization');
    // Ensure Host header matches target
    const targetHost = new URL(targetUrl).host;
    headers.set('Host', targetHost);

    const response = await fetch(targetUrl, {
      method: originalRequest.method,
      headers: headers,
      body: originalRequest.body,
      redirect: 'manual',
    });

    // Create a new response with CORS headers
    const proxyResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', '*');

    return proxyResponse;
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
