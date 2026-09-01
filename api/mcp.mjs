// Streamable HTTP MCP endpoint for productivity-protocols.
//
// ChatGPT and other cloud clients cannot run a local process, so they cannot
// use the npx/stdio server. They take a URL instead:
//
//   ChatGPT -> Settings -> Connectors -> Add custom connector
//   https://protocols.aescle.com/mcp
//
// Stateless by design: the bank is read-only public data, so there is no
// session to track and no auth to negotiate. Every POST is a complete
// JSON-RPC exchange. Tool logic lives in mcp/handlers.mjs, shared with the
// stdio server.
import { rpc } from "../mcp/handlers.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, Mcp-Session-Id, Accept",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // The spec allows a server with no server-initiated messages to refuse the
  // SSE stream. Answer GET with something a human can read, since people do
  // paste this URL into a browser to see if it is alive.
  if (request.method === "GET") {
    return json({
      name: "productivity-protocols",
      transport: "streamable-http",
      usage: "POST JSON-RPC 2.0 to this URL. In ChatGPT: Settings -> Connectors -> Add custom connector.",
      tools: ["list_protocols", "get_protocol"],
      source: "https://github.com/aescle/productivity-protocols",
    });
  }

  if (request.method !== "POST") {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "use POST" } }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, 400);
  }

  // A client may batch requests in one array.
  if (Array.isArray(payload)) {
    const responses = payload.map(rpc).filter(Boolean);
    return responses.length ? json(responses) : new Response(null, { status: 202, headers: CORS });
  }

  const response = rpc(payload);
  // Notifications carry no id and get no body, only an accepted status.
  return response ? json(response) : new Response(null, { status: 202, headers: CORS });
}

export const config = { runtime: "edge" };
