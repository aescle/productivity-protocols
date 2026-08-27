# Protocol Bank

A structured, evidence-graded bank of health and performance protocols: concrete behaviors with
their rationale, progression ladders, citations, contraindications, and the observable signals
that indicate trying them.

A protocol is a behavior, not advice prose. Each one is a single JSON file that a person or an
agent can act on: what to do, what it buys you (`benefit`, stated performance-first: energy,
focus, output, recovery), what the evidence actually supports, and when it applies. The bank's
center of gravity is work performance; longevity levers earn their place by protecting the
ability to keep performing, and their benefits are framed that way.

```json
{
  "id": "post_meal_walk",
  "name": "Post-Meal Walk",
  "title": "Walk after one meal per day.",
  "benefit": "No post-lunch crash; a steadier afternoon.",
  "kind": "walk",
  "family": "meal_timing",
  "tier": "intermediate",
  "evidence": {
    "grade": "strong",
    "summary": "Walking soon after eating reduces acute post-meal glucose excursions.",
    "sources": [{ "label": "Post-meal exercise meta-analysis", "url": "https://pubmed.ncbi.nlm.nih.gov/36715875/" }]
  },
  "indications": ["Focus reliably dips in the hour after lunch."]
}
```

## Layout

- `data/protocols/<id>.json` — one file per protocol. This is the source of truth.
- `schema/protocol.schema.json` — the contract (JSON Schema draft-07, field docs included).
- `src/protocols.generated.js` — committed plain-JS mirror of the data, for bundlers and Node.
  Regenerate after any data edit: `node scripts/generate-index.mjs` (also refreshes the site).
- `src/index.js` — entry point: `PROTOCOLS`, `protocolCore(id)`, `hasProtocol(id)`.
- `site/index.html` — committed static browse page over the whole bank (search, grade filters,
  ladders). Host it anywhere static; no build step, no backend.
- `mcp/server.mjs` — zero-dependency MCP server (stdio) so agents can query the bank:
  `list_protocols`, `get_protocol`, `match_situation`, `list_families`. Point any MCP client at
  `node mcp/server.mjs`. A hosted Streamable HTTP variant can wrap the same handlers.
- `scripts/validate.mjs` — zero-dependency validation: schema contract, unique ids, complete
  ladders, clean https citations, mirror and site sync.

## Writing style

Every protocol reads in one voice. Plain words, no metaphors, no cleverness. The validator
enforces these rules, so a contribution that breaks them fails CI rather than shipping.

| Field | Form | Example |
| --- | --- | --- |
| `name` | Title Case noun phrase, 2-5 words | `Post-Meal Walk` |
| `title` | One imperative sentence, ends in a period | `Walk after one meal per day.` |
| `benefit` | Plain outcome phrase, 14 words or fewer; no second-person address | `Steadier energy after lunch.` |
| `subtitle` | Two or three word Title Case label | `Meal Protocol` |
| `rationale` | Plain sentences on why it works, no names | `Walking soon after eating blunts the glucose spike...` |
| `origin` | One sentence naming who is known for it | `Jeff Bezos replaced slides with narrative memos.` |
| `indications` | Complete sentences describing an observable state | `Focus reliably dips in the hour after lunch.` |

Three rules carry most of the weight. Say what the person gets, not how it sounds. Keep
attribution in `origin` so `rationale` can stay a plain explanation. Never use a semicolon or a
colon to splice two clauses together.

## Evidence grades

Every protocol carries an honest grade, so science-backed staples and popular-but-thin practices
can live in one bank without pretending to be the same thing:

| Grade | Meaning |
| --- | --- |
| `strong` | Consistent trial, meta-analytic, or guideline-level support. |
| `moderate` | Supportive trials or robust observational evidence, with limitations. |
| `emerging` | Early, small, or mixed evidence. |
| `anecdotal` | Practice-driven with a plausible mechanism; little direct trial evidence. |

The `evidence.summary` sentence must be written no stronger than the grade supports.

## Indications

`indications` are the triggers: observable, neutral statements an agent can match against a
person's real data ("Wake time swings by hours between weekdays and weekends."). They answer
*when should I try this*, which a flat list of protocols never does.

## Ladders

Protocols with a `family` sit on a progression ladder: exactly one `beginner`, one
`intermediate`, and one `advanced` rung per family, each with a measurable `tierTarget`. Ladders
exist so nobody maxes out: mastering a rung promotes you to the next one instead of retiring the
topic. Standalone protocols omit `family` entirely.

## Adding a protocol

1. Create `data/protocols/<id>.json` following `schema/protocol.schema.json`.
2. Cite real sources (https, no tracking params). Prefer primary literature or major-institution
   pages; verify every URL loads and is login-free.
3. Grade the evidence honestly. `anecdotal` is a valid grade; an inflated grade is not.
4. Add `avoidWhen` for anything with real contraindications.
5. Regenerate the mirror and validate:

```bash
node packages/protocol-bank/scripts/generate-index.mjs
node packages/protocol-bank/scripts/validate.mjs
```

## Relationship to the Aescle app

The Aescle app curates a subset of this bank (its `ProtocolId` union is the manifest) and layers
its own scheduling, personalization, and recommendation logic on top. Bank entries outside that
subset do not appear in the app. Nothing app-specific belongs in this package.

## License

Code is MIT (`LICENSE`); the protocol dataset is CC BY 4.0 (`LICENSE-DATA.md`). Not medical
advice; protocols describe general practices and their evidence, not recommendations for any
individual.

## Status

Internal package, pre-release; public repository and hosted endpoints land at publication.
