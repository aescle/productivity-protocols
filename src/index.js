import { PROTOCOLS } from "./protocols.generated.js";

export { PROTOCOLS };

const byId = new Map(PROTOCOLS.map((protocol) => [protocol.id, protocol]));

export function protocolCore(id) {
  const protocol = byId.get(id);
  if (!protocol) {
    throw new Error(`protocol-bank: unknown protocol id "${id}"`);
  }
  return protocol;
}

export function hasProtocol(id) {
  return byId.has(id);
}
