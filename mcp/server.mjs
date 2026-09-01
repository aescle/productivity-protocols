#!/usr/bin/env node
// productivity-protocols MCP server, stdio transport, zero dependencies.
//
// For local clients (Claude Code, Claude Desktop, Cursor):
//
//   claude mcp add productivity-protocols -- npx -y productivity-protocols
//
//   { "mcpServers": { "productivity-protocols": {
//       "command": "npx", "args": ["-y", "productivity-protocols"] } } }
//
// ChatGPT and other cloud clients cannot run a local process; they use the
// hosted Streamable HTTP endpoint instead (api/mcp.mjs). Both transports share
// mcp/handlers.mjs, so the tool surface is identical.
//
// Read-only over the committed dataset; no network, no state.
import { createInterface } from "node:readline";
import { rpc } from "./handlers.mjs";

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
  const response = rpc(req);
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
});
