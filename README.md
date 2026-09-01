# productivity-protocols

227 things people actually do to work better, each graded by how much proof is behind it.

## Install

```bash
claude mcp add productivity-protocols -- npx -y productivity-protocols
```

ChatGPT takes a URL instead, under Settings -> Connectors -> Add custom connector:
`https://protocols.aescle.com/mcp`

## Example

> **Fundraising, hiring, and code all day. I haven't shipped in three weeks.**

```
Your problem is fragmentation, not hours. Four protocols fit.

  Meeting Clustering                                          emerging
  Cluster meetings into two daily windows.
  https://pubmed.ncbi.nlm.nih.gov/37023294/

  Themed Days                                                anecdotal
  Give each weekday one theme and route work into its day.
  Jack Dorsey ran two companies on themed weekdays.

  90-Minute First-Block Creation                             anecdotal
  Give the first 90 work minutes to creation, not communication.
  Jensen Huang finishes his top priority before reaching the office.

  Three Decisions a Day                                      anecdotal
  Cap yourself at about three good decisions per day.
  Jeff Bezos aims for three good decisions a day.

Only the first has real evidence behind it. Start there. The other three
are what specific people do, which is worth something, but not the same
thing.
```

## Browse it first

All 227, searchable and filterable, at **https://protocols.aescle.com**.

---

## What is in it

| | |
| --- | --- |
| Protocols | 227 |
| Evidence grades | 17 strong, 52 moderate, 80 emerging, 78 anecdotal |
| Progression ladders | 12 families, 36 laddered protocols |
| Standalone protocols | 191 |
| With contraindications | 26 |
| With match triggers | 227 |

A protocol is a behavior, not advice prose. Each one is a single JSON file that a person or an
agent can act on.

Evidence grades are honest. Science-backed staples and popular-but-thin founder practices live in
one bank without pretending to be the same thing. 78 entries are labeled `anecdotal` because that
is what they are.

## How the agent uses it

The bank ships a zero-dependency MCP server. Local clients run it over stdio via `npx`; ChatGPT and
other cloud clients use the hosted endpoint at `https://protocols.aescle.com/mcp`. Same two tools
either way.

<details>
<summary>Local client config, if you did not use the one-liner above</summary>

```json
{
  "mcpServers": {
    "productivity-protocols": {
      "command": "npx",
      "args": ["-y", "productivity-protocols"]
    }
  }
}
```

</details>

Two tools:

| Tool | Returns |
| --- | --- |
| `list_protocols` | The catalog. All 227 by default, about 18k tokens. Optional `kind`, `family`, `grade` filters. |
| `get_protocol` | Full records for the ids you chose: rationale, contraindications, evidence, citations. |

Plus the same catalog as an MCP resource at `protocols://catalog`, for clients that prefer to load
it without spending a tool call.

**The server does no ranking and no matching, on purpose.** Every protocol carries `indications`,
which are observable triggers written to be compared against a real person's state. A model reads
those and reasons about them better than any keyword score can, so the server hands over the
catalog and gets out of the way.

The flow is two calls. The agent reads the catalog, picks the handful whose indications actually
fit the person in front of it, then pulls those full records to check `avoidWhen` and cite the
evidence:

```
list_protocols()  ->  227 protocols, each with its triggers and evidence grade
                      ...the model chooses...
get_protocol(["sleep_extension_experiment", "caffeine_cutoff", "post_meal_walk"])
                  ->  full records with rationale, contraindications, and sources
```

An earlier version ranked server-side. It was worse than the model at the one job that mattered,
so it was removed.

## Use it as data

```bash
npm install productivity-protocols
```

```js
import { PROTOCOLS, protocolCore, hasProtocol } from "productivity-protocols";
```

Or read the JSON directly. `data/protocols/<id>.json` is the source of truth and has no build step.

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

Browse all 227 at **https://protocols.aescle.com**.

## What is in the bank

The center of gravity is work performance. Longevity levers earn their place by protecting the
ability to keep performing, and their benefits are framed that way. Kinds span `deep_work`,
`calendar_defense`, `sleep`, `training`, `recovery`, `nutrition`, `walk`, and `social`.

Sources span the performance canon: founder essays, the Huberman and Attia literature, the
Founders-podcast roster, athletes, and the deep-work research. Every URL is verified live and
every PMID is checked against NCBI.

## Evidence grades

| Grade | Meaning |
| --- | --- |
| `strong` | Consistent trial, meta-analytic, or guideline-level support. |
| `moderate` | Supportive trials or robust observational evidence, with limitations. |
| `emerging` | Early, small, or mixed evidence. |
| `anecdotal` | Practice-driven with a plausible mechanism; little direct trial evidence. |

The `evidence.summary` sentence is written no stronger than the grade supports.

## Indications

`indications` are the triggers: observable, neutral statements an agent can match against a
person's real data, like "Wake time swings by hours between weekdays and weekends." They answer
*when should I try this*, which a flat list of protocols never does. Every protocol has them.

## Ladders

Protocols with a `family` sit on a progression ladder: exactly one `beginner`, one
`intermediate`, and one `advanced` rung per family, each with a measurable `tierTarget`. Ladders
exist so nobody maxes out. Mastering a rung promotes you to the next one instead of retiring the
topic. Standalone protocols omit `family` entirely.

## Layout

- `data/protocols/<id>.json` — one file per protocol. The source of truth.
- `schema/protocol.schema.json` — the contract (JSON Schema draft-07, field docs included).
- `src/index.js` — entry point: `PROTOCOLS`, `protocolCore(id)`, `hasProtocol(id)`.
- `src/protocols.generated.js` — committed plain-JS mirror, for bundlers and Node.
- `mcp/handlers.mjs` — the MCP tool logic, shared by both transports.
- `mcp/server.mjs` — stdio transport, for local clients. This is what `npx` runs.
- `api/mcp.mjs` — Streamable HTTP transport, for cloud clients like ChatGPT. Stateless, no auth.
- `site/index.html` — the committed static browse page. Host it anywhere; no build, no backend.
- `scripts/validate.mjs` — zero-dependency validation of the whole bank.

Both transports call the same `rpc()` in `mcp/handlers.mjs`, so the tool surface cannot drift
between them. Zero dependencies throughout.

### Self-hosting

`vercel.json` deploys `site/` as the static root with the MCP endpoint at `/mcp`. Fork it and you
have your own copy of both, with no configuration. Everything is read-only public data, so there is
no session state, no auth, and nothing to provision.

## Contributing

Contributions are welcome, especially new protocols with real citations and honest grades. See
[CONTRIBUTING.md](CONTRIBUTING.md). Every rule below is enforced by `scripts/validate.mjs` in CI,
so a contribution that breaks house style fails the check rather than shipping.

Every protocol reads in one voice. Plain words, no metaphors, no cleverness.

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

## Who maintains this

Built and maintained by [Aescle](https://aescle.com), an iOS health and performance coach. The
Aescle app curates a subset of this bank and layers its own scheduling and personalization on top.
The bank itself is complete and standalone. Nothing app-specific belongs in it.

## License

Code is MIT ([LICENSE](LICENSE)). The protocol dataset is CC BY 4.0
([LICENSE-DATA.md](LICENSE-DATA.md)).

Not medical advice. Protocols describe general practices and their evidence, not recommendations
for any individual. Check `avoidWhen` and talk to a doctor before changing anything that interacts
with a medical condition or medication.
