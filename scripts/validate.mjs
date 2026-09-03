// Validates data/protocols/*.json against the schema contract and checks that
// the committed src/protocols.generated.js mirror matches the data. Zero
// dependencies so it runs anywhere Node runs:
//
//   node packages/protocol-bank/scripts/validate.mjs
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderGeneratedModule } from "./generate-index.mjs";

const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.PROTOCOL_DATA_DIR ?? path.join(pkgRoot, "data", "protocols");

const KINDS = new Set([
  "calendar_defense",
  "decisions",
  "focus",
  "ideas",
  "learning",
  "nutrition",
  "priorities",
  "recovery",
  "review",
  "rhythm",
  "sleep",
  "social",
  "starting",
  "training",
  "walk",
]);
const TIERS = new Set(["beginner", "intermediate", "advanced"]);
const GRADES = new Set(["strong", "moderate", "emerging", "anecdotal"]);
const ALLOWED_KEYS = new Set([
  "id",
  "name",
  "title",
  "benefit",
  "subtitle",
  "origin",
  "rationale",
  "kind",
  "family",
  "tier",
  "tierTarget",
  "targets",
  "durationMinutes",
  "evidence",
  "indications",
  "avoidWhen",
  "guide",
]);

const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;
const isStringList = (v, min = 1, max = Infinity) =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every(isNonEmptyString);

function checkUrl(url, context) {
  assert.ok(isNonEmptyString(url), `${context}: url missing`);
  assert.ok(url.startsWith("https://"), `${context}: url must be https (${url})`);
  assert.ok(!/[?&](utm_|fbclid|gclid)/.test(url), `${context}: url carries tracking params (${url})`);
}

const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json")).sort();
assert.ok(files.length > 0, "no protocol data files found");

const protocols = [];
for (const file of files) {
  const raw = await readFile(path.join(dataDir, file), "utf8");
  let record;
  try {
    record = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${file}: invalid JSON (${error.message})`);
  }

  const ctx = file;
  assert.equal(`${record.id}.json`, file, `${ctx}: filename must equal id`);
  for (const key of Object.keys(record)) {
    assert.ok(ALLOWED_KEYS.has(key), `${ctx}: unknown key "${key}"`);
  }
  assert.ok(/^[a-z][a-z0-9_]*$/.test(record.id), `${ctx}: id must be snake_case`);
  assert.ok(isNonEmptyString(record.name), `${ctx}: name missing`);
  assert.ok(isNonEmptyString(record.title), `${ctx}: title missing`);
  assert.ok(isNonEmptyString(record.benefit), `${ctx}: benefit missing`);
  assert.ok(isNonEmptyString(record.subtitle), `${ctx}: subtitle missing`);
  assert.ok(isNonEmptyString(record.rationale), `${ctx}: rationale missing`);

  // House style. One voice across the bank, enforced rather than hoped for.
  // See "Writing style" in README.md.
  const words = (s) => s.trim().split(/\s+/).length;
  // Colons inside clock times (10:30) are fine; colons used as punctuation are not.
  const spliced = (s) => /;/.test(s) || /:(?!\d)/.test(s);

  assert.ok(
    words(record.name) >= 2 && words(record.name) <= 5,
    `${ctx}: name must be 2-5 words (got "${record.name}")`,
  );
  assert.ok(
    !/[.;:]/.test(record.name),
    `${ctx}: name must not contain sentence punctuation (got "${record.name}")`,
  );
  if (/\d/.test(record.title)) {
    assert.ok(
      /\d/.test(record.name),
      `${ctx}: numeric dose in title must also appear in name`,
    );
  }

  assert.ok(record.title.endsWith("."), `${ctx}: title must end with a period`);
  assert.ok(
    !spliced(record.title) && !record.title.includes('?'),
    `${ctx}: title must be one plain imperative sentence, no semicolons, colons, or questions`,
  );

  assert.ok(!/^You\b/.test(record.benefit), `${ctx}: benefit must be a plain outcome phrase, not second-person copy`);
  assert.ok(record.benefit.endsWith("."), `${ctx}: benefit must end with a period`);
  assert.ok(
    !spliced(record.benefit) && words(record.benefit) <= 14,
    `${ctx}: benefit must be one short sentence with no semicolons or colons`,
  );

  assert.ok(
    words(record.subtitle) >= 2 && words(record.subtitle) <= 3,
    `${ctx}: subtitle must be a 2-3 word category label (got "${record.subtitle}")`,
  );
  assert.ok(
    !/[.;:]/.test(record.subtitle) && !/\b[a-z]+\b/.test(record.subtitle),
    `${ctx}: subtitle must be Title Case with no punctuation`,
  );

  assert.ok(record.rationale.endsWith("."), `${ctx}: rationale must end with a period`);
  assert.ok(
    !spliced(record.rationale),
    `${ctx}: rationale must be plain sentences with no semicolons or colons`,
  );
  assert.ok(
    !/^[A-Z][a-z]+('s|s') /.test(record.rationale),
    `${ctx}: rationale must explain why it works, not who did it — put attribution in "origin"`,
  );

  if (record.origin !== undefined) {
    assert.ok(isNonEmptyString(record.origin), `${ctx}: origin must be a non-empty string`);
    assert.ok(record.origin.endsWith("."), `${ctx}: origin must end with a period`);
    assert.ok(
      !spliced(record.origin),
      `${ctx}: origin must be one plain sentence with no semicolons or colons`,
    );
  }

  for (const indication of record.indications) {
    assert.ok(
      indication.endsWith("."),
      `${ctx}: each indication must be a complete sentence ending in a period`,
    );
  }
  assert.ok(KINDS.has(record.kind), `${ctx}: unknown kind "${record.kind}"`);
  assert.ok(isStringList(record.targets), `${ctx}: targets must be a non-empty string list`);
  assert.ok(
    Number.isInteger(record.durationMinutes) && record.durationMinutes >= 1,
    `${ctx}: durationMinutes must be a positive integer`,
  );
  assert.ok(isStringList(record.indications, 1, 5), `${ctx}: indications must list 1-5 signals`);
  if (record.avoidWhen !== undefined) {
    assert.ok(isStringList(record.avoidWhen), `${ctx}: avoidWhen must be a non-empty string list`);
  }

  if (record.family !== undefined || record.tier !== undefined || record.tierTarget !== undefined) {
    assert.ok(
      /^[a-z][a-z0-9_]*$/.test(record.family ?? ""),
      `${ctx}: family must be snake_case when the protocol is on a ladder`,
    );
    assert.ok(TIERS.has(record.tier), `${ctx}: ladder protocols need a valid tier`);
    assert.ok(isNonEmptyString(record.tierTarget), `${ctx}: ladder protocols need a tierTarget`);
  }

  const evidence = record.evidence;
  assert.ok(evidence && typeof evidence === "object", `${ctx}: evidence missing`);
  assert.ok(GRADES.has(evidence.grade), `${ctx}: unknown evidence grade "${evidence?.grade}"`);
  assert.ok(isNonEmptyString(evidence.summary), `${ctx}: evidence summary missing`);
  assert.ok(
    Array.isArray(evidence.sources) && evidence.sources.length >= 1,
    `${ctx}: evidence needs at least one source`,
  );
  for (const source of evidence.sources) {
    assert.ok(isNonEmptyString(source.label), `${ctx}: source label missing`);
    checkUrl(source.url, `${ctx} source "${source.label}"`);
  }

  assert.ok("guide" in record, `${ctx}: guide must be a link or an explicit null`);
  if (record.guide !== null) {
    assert.ok(isNonEmptyString(record.guide?.source), `${ctx}: guide source missing`);
    checkUrl(record.guide?.url, `${ctx} guide`);
  }

  protocols.push(record);
}

const ids = new Set(protocols.map((p) => p.id));
assert.equal(ids.size, protocols.length, "duplicate protocol ids");

// Every benefit must be specific to its protocol. Shared template phrases are
// how a bank of 200 protocols turns into a bank of 20 vague ones.
const benefits = new Map();
for (const p of protocols) {
  const prior = benefits.get(p.benefit);
  assert.ok(
    prior === undefined,
    `benefit is reused by ${p.id} and ${prior} — write the outcome specific to each protocol: "${p.benefit}"`,
  );
  benefits.set(p.benefit, p.id);
}

// Ladders, not lists: a family is a complete beginner -> intermediate ->
// advanced progression, never a partial one.
const families = new Map();
for (const p of protocols) {
  if (!p.family) continue;
  if (!families.has(p.family)) families.set(p.family, []);
  families.get(p.family).push(p.tier);
}
for (const [family, tiers] of families) {
  const sorted = [...tiers].sort();
  assert.deepEqual(
    sorted,
    ["advanced", "beginner", "intermediate"],
    `family "${family}" must have exactly one beginner, one intermediate, and one advanced protocol (found: ${tiers.join(", ")})`,
  );
}

// The mirror and site are generated from data/protocols. When PROTOCOL_DATA_DIR
// points elsewhere (the local admin checking a single staged candidate), that
// drift is expected and the check is meaningless, so skip it.
if (!process.env.PROTOCOL_DATA_DIR) {
const committed = await readFile(path.join(pkgRoot, "src", "protocols.generated.js"), "utf8");
const expected = await renderGeneratedModule();
assert.equal(
  committed,
  expected,
  "src/protocols.generated.js is stale; run: node packages/protocol-bank/scripts/generate-index.mjs",
);

const { renderSite } = await import("./generate-site.mjs");
const committedSite = await readFile(path.join(pkgRoot, "site", "index.html"), "utf8");
assert.equal(
  committedSite,
  await renderSite(),
  "site/index.html is stale; run: node packages/protocol-bank/scripts/generate-index.mjs",
);
}

console.log(`protocol-bank: ${protocols.length} protocols valid, ${families.size} families complete, mirror and site in sync`);
