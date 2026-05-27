export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CONNECT method (for HTTPS)
    if (request.method === 'CONNECT') {
      return handleCONNECT(request, url);
    }

    // For regular HTTP requests, forward them
    return proxyRequest(request, url);
  },
};

async function proxyRequest(request, url) {
  // Reconstruct the target URL from the original request
  // The client will send full URL like http://example.com/path
  let targetUrl = url.pathname + url.search;
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    targetUrl = url.toString();
  } else {
    // If the request was sent to our proxy with a full URL in the path
    // e.g., GET http://example.com/ HTTP/1.1
    // The URL's pathname would be "http://example.com/"
    if (url.pathname.startsWith('http://') || url.pathname.startsWith('https://')) {
      targetUrl = url.pathname + url.search;
    }
  }

  // Build new request headers
  const headers = new Headers(request.headers);
  headers.delete('Proxy-Connection');
  headers.delete('Proxy-Authorization');

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'manual', // Handle redirects manually if needed
    });

    // Return response with CORS headers so Android TV can use it
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

async function handleCONNECT(request, url) {
  // CONNECT method is used for HTTPS tunneling
  // In Cloudflare Workers, we cannot directly open raw TCP sockets.
  // However, we can still forward HTTPS requests by rewriting the URL.
  // This implementation works for most modern clients because they will
  // send a normal HTTP GET to the proxy with a full URL for HTTPS as well.

  // Alternative: Return a 405 Method Not Allowed and instruct to use HTTP proxy mode.
  return new Response('CONNECT method not supported. Please use HTTP proxy mode (send full URL).', {
    status: 405,
    headers: {
      'Allow': 'GET, POST, PUT, DELETE, OPTIONS',
      'Proxy-Support': 'Session-Based-Authentication'
    }
  });
}

// For OPTIONS preflight requests
export async function handleOptions(request) {
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
