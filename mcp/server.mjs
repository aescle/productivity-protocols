#!/usr/bin/env node
// Protocol Bank MCP server (stdio transport, zero dependencies).
//
// Exposes the bank to MCP clients (Claude Desktop, Claude Code, Cursor, ...):
//
//   { "mcpServers": { "protocol-bank": {
//       "command": "node",
//       "args": ["<path-to>/packages/protocol-bank/mcp/server.mjs"] } } }
//
// Read-only over the committed dataset; no network, no state. A hosted
// Streamable HTTP variant can wrap the same tool handlers at publication.
import { createInterface } from "node:readline";
import { PROTOCOLS } from "../src/protocols.generated.js";

const SERVER_INFO = { name: "protocol-bank", version: "0.1.0" };

const compact = (p) => ({
  id: p.id,
  title: p.title,
  kind: p.kind,
  ...(p.family ? { family: p.family, tier: p.tier } : {}),
  grade: p.evidence.grade,
  targets: p.targets,
});

const TOOLS = [
  {
    name: "list_protocols",
    description:
      "List protocols in the bank, optionally filtered. Returns compact records; use get_protocol for full detail. Evidence grades: strong, moderate, emerging, anecdotal.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text match against title, targets, and triggers." },
        kind: { type: "string", description: "Behavior category, e.g. deep_work, sleep, nutrition, training, recovery, walk, calendar_defense, social." },
        family: { type: "string", description: "Progression-ladder id, e.g. sleep_shutdown, cold_exposure." },
        grade: { type: "string", description: "Minimum-detail filter by evidence grade: strong, moderate, emerging, or anecdotal." },
      },
    },
  },
  {
    name: "get_protocol",
    description: "Get one protocol's full record by id: rationale, tier target, triggers, contraindications, evidence summary, citations, and guide link.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Protocol id, e.g. post_meal_walk." } },
      required: ["id"],
    },
  },
  {
    name: "match_situation",
    description:
      "Given a description of someone's current situation or data (e.g. 'wake time varies hours, heavy meetings, afternoon crashes'), return the protocols whose indications best match, ranked.",
    inputSchema: {
      type: "object",
      properties: {
        situation: { type: "string", description: "Plain-text description of the person's state, signals, or problems." },
        limit: { type: "number", description: "Max results (default 8)." },
      },
      required: ["situation"],
    },
  },
  {
    name: "list_families",
    description: "List the progression ladders (families): each runs beginner -> intermediate -> advanced with a measurable bar per rung.",
    inputSchema: { type: "object", properties: {} },
  },
];

function listProtocols({ query, kind, family, grade } = {}) {
  let out = PROTOCOLS;
  if (kind) out = out.filter((p) => p.kind === kind);
  if (family) out = out.filter((p) => p.family === family);
  if (grade) out = out.filter((p) => p.evidence.grade === grade);
  if (query) {
    const q = query.toLowerCase();
    out = out.filter((p) =>
      [p.id, p.title, p.rationale, ...p.targets, ...p.indications]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return { count: out.length, protocols: out.map(compact) };
}

function getProtocol({ id }) {
  const p = PROTOCOLS.find((x) => x.id === id);
  if (!p) {
    const near = PROTOCOLS.filter((x) => x.id.includes(id) || id.includes(x.id)).map((x) => x.id);
    return { error: `unknown protocol id "${id}"`, ...(near.length ? { didYouMean: near } : {}) };
  }
  return p;
}

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have i in is it my of on or so that the to with you your".split(" "),
);
const tokens = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));

function matchSituation({ situation, limit = 8 }) {
  const situ = new Set(tokens(situation));
  const scored = PROTOCOLS.map((p) => {
    const indicationText = tokens(p.indications.join(" "));
    const supportText = tokens([p.title, ...p.targets].join(" "));
    let score = 0;
    for (const t of indicationText) if (situ.has(t)) score += 2;
    for (const t of supportText) if (situ.has(t)) score += 1;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return {
    matches: scored.map(({ p, score }) => ({
      ...compact(p),
      score,
      indications: p.indications,
      ...(p.avoidWhen ? { avoidWhen: p.avoidWhen } : {}),
    })),
    note: "Ranked by overlap between the situation and each protocol's indications. Use get_protocol for evidence and citations.",
  };
}

function listFamilies() {
  const fams = new Map();
  for (const p of PROTOCOLS) {
    if (!p.family) continue;
    if (!fams.has(p.family)) fams.set(p.family, []);
    fams.get(p.family).push({ tier: p.tier, id: p.id, bar: p.tierTarget });
  }
  const order = { beginner: 0, intermediate: 1, advanced: 2 };
  return {
    families: [...fams.entries()].map(([family, rungs]) => ({
      family,
      rungs: rungs.sort((a, b) => order[a.tier] - order[b.tier]),
    })),
  };
}

const HANDLERS = {
  list_protocols: listProtocols,
  get_protocol: getProtocol,
  match_situation: matchSituation,
  list_families: listFamilies,
};

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    return;
  }
  const { id, method, params } = req;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    });
    return;
  }
  if (method === "notifications/initialized" || id === undefined) return;
  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }
  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }
  if (method === "tools/call") {
    const handler = HANDLERS[params?.name];
    if (!handler) {
      send({ jsonrpc: "2.0", id, error: { code: -32602, message: `unknown tool ${params?.name}` } });
      return;
    }
    try {
      const result = handler(params?.arguments ?? {});
      send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    } catch (error) {
      send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(error?.message ?? error) } });
    }
    return;
  }
  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown method ${method}` } });
});
