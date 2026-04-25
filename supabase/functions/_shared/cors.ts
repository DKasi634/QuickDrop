export function corsHeaders(methods = 'GET, POST, OPTIONS'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': methods,
  };
}

export function optionsResponse(methods?: string): Response {
  return new Response('ok', { headers: corsHeaders(methods) });
}

export function json(
  body: unknown,
  status = 200,
  methods?: string
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(methods),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
