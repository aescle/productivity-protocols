// Transport-independent MCP core for productivity-protocols.
//
// One JSON-RPC dispatcher, two transports: mcp/server.mjs speaks stdio for
// local clients (Claude Code, Claude Desktop, Cursor), api/mcp.mjs speaks
// Streamable HTTP for cloud clients (ChatGPT), which cannot run a local
// process. Both call rpc() below, so the two can never drift.
//
// Design: this server does no ranking and no matching. It hands the model the
// catalog and gets out of the way. Every protocol carries `indications`
// (observable triggers), and a model reasons over those far better than any
// keyword score can.
import { PROTOCOLS } from "../src/protocols.generated.js";

export const SERVER_INFO = { name: "productivity-protocols", version: "0.1.0" };

// Catalog shape: everything needed to decide, nothing needed only to cite.
// ~18k tokens for all 227, which is cheap enough to hand over whole.
const catalogEntry = (p) => ({
  id: p.id,
  title: p.title,
  benefit: p.benefit,
  kind: p.kind,
  ...(p.family ? { family: p.family, tier: p.tier } : {}),
  grade: p.evidence.grade,
  indications: p.indications,
});

const GRADES = ["strong", "moderate", "emerging", "anecdotal"];

export const TOOLS = [
  {
    name: "list_protocols",
    description:
      "Return the protocol catalog: id, what to do, what it buys, evidence grade, ladder position, " +
      "and `indications` (the observable triggers that indicate trying it). Call with no arguments to " +
      "get all 227 protocols (~18k tokens) and choose among them yourself by comparing the person's " +
      "actual situation against each protocol's indications. This server does no ranking; you are " +
      "better at that than it is. Filters are for narrowing a large catalog, not for finding matches. " +
      "Evidence grades, strongest first: strong, moderate, emerging, anecdotal. Then call get_protocol " +
      "for the few you picked, to get rationale, contraindications, and citations before recommending.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          description:
            "Optional. Behavior category: focus, starting, rhythm, priorities, decisions, ideas, learning, review, calendar_defense, sleep, training, recovery, nutrition, walk, social.",
        },
        family: {
          type: "string",
          description:
            "Optional. Progression-ladder id, e.g. sleep_shutdown, cold_exposure. Each ladder runs beginner -> intermediate -> advanced.",
        },
        grade: {
          type: "string",
          enum: GRADES,
          description: "Optional. Return only protocols at this evidence grade.",
        },
      },
    },
  },
  {
    name: "get_protocol",
    description:
      "Get full records by id: rationale, ladder target, triggers, contraindications (`avoidWhen`), " +
      "evidence summary, citations, and guide link. Pass every id you are considering in one call. " +
      "Always read `avoidWhen` and cite `evidence.sources` before recommending a protocol to someone.",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: 'Protocol ids, e.g. ["post_meal_walk", "screen_shutdown"].',
        },
      },
      required: ["ids"],
    },
  },
];

function listProtocols({ kind, family, grade } = {}) {
  let out = PROTOCOLS;
  if (kind) out = out.filter((p) => p.kind === kind);
  if (family) out = out.filter((p) => p.family === family);
  if (grade) out = out.filter((p) => p.evidence.grade === grade);
  return {
    count: out.length,
    total: PROTOCOLS.length,
    protocols: out.map(catalogEntry),
    note: "Choose by comparing the person's situation against each protocol's indications, then call get_protocol for citations and contraindications.",
  };
}

function getProtocol({ ids, id } = {}) {
  const wanted = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!wanted.length) return { error: "pass ids: an array of protocol ids" };
  const found = [];
  const unknown = [];
  for (const want of wanted) {
    const p = PROTOCOLS.find((x) => x.id === want);
    if (p) found.push(p);
    else {
      const near = PROTOCOLS.filter((x) => x.id.includes(want) || want.includes(x.id)).map((x) => x.id);
      unknown.push({ id: want, ...(near.length ? { didYouMean: near } : {}) });
    }
  }
  return { protocols: found, ...(unknown.length ? { unknown } : {}) };
}

const HANDLERS = { list_protocols: listProtocols, get_protocol: getProtocol };

export const CATALOG_URI = "protocols://catalog";
const RESOURCES = [
  {
    uri: CATALOG_URI,
    name: "Protocol catalog",
    description:
      "All 227 protocols with their triggers, evidence grades, and ladder positions. Reason over this directly.",
    mimeType: "application/json",
  },
];

const result = (id, value) => ({ jsonrpc: "2.0", id, result: value });
const failure = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

// Dispatch one JSON-RPC request. Returns the response object, or null for
// notifications (which carry no id and must not be answered).
export function rpc(req) {
  const { id, method, params } = req ?? {};
  if (id === undefined || id === null) return null;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {}, resources: {} },
        serverInfo: SERVER_INFO,
      });
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools: TOOLS });
    case "resources/list":
      return result(id, { resources: RESOURCES });
    case "resources/read": {
      if (params?.uri !== CATALOG_URI) return failure(id, -32602, `unknown resource ${params?.uri}`);
      return result(id, {
        contents: [
          {
            uri: CATALOG_URI,
            mimeType: "application/json",
            text: JSON.stringify(PROTOCOLS.map(catalogEntry)),
          },
        ],
      });
    }
    case "tools/call": {
      const handler = HANDLERS[params?.name];
      if (!handler) return failure(id, -32602, `unknown tool ${params?.name}`);
      try {
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(handler(params?.arguments ?? {})) }],
        });
      } catch (error) {
        return failure(id, -32603, String(error?.message ?? error));
      }
    }
    default:
      return failure(id, -32601, `unknown method ${method}`);
  }
}
