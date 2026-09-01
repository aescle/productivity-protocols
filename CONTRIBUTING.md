# Contributing

Contributions are welcome. The most useful ones are new protocols with real citations and an
honest grade, and corrections to grades or sources that are wrong.

`scripts/validate.mjs` enforces every rule below. It runs in CI on each pull request, so a
contribution that breaks the contract fails the check rather than shipping.

## Adding a protocol

1. Create `data/protocols/<id>.json` following `schema/protocol.schema.json`. The id is
   `snake_case` and must be unique.
2. Cite real sources. HTTPS only, no tracking parameters. Prefer primary literature or
   major-institution pages. Verify every URL loads and is login-free.
3. Grade the evidence honestly. `anecdotal` is a valid and common grade here. An inflated grade
   is not, and is the main reason a protocol gets rejected.
4. Write `indications` as observable, neutral statements that describe a state, not a diagnosis.
   These are what an agent matches against, so they carry most of the value.
5. Add `avoidWhen` for anything with real contraindications. Heat, cold, fasting, and hard
   training protocols usually need one.
6. Regenerate the mirror and the site, then validate:

```bash
node scripts/generate-index.mjs
node scripts/validate.mjs
```

Commit the regenerated `src/protocols.generated.js` and `site/index.html` along with your data
file. The validator fails if they drift from the data.

## House style

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

Three rules carry most of the weight:

- Say what the person gets, not how it sounds.
- Keep attribution in `origin` so `rationale` can stay a plain explanation.
- Never use a semicolon or a colon to splice two clauses together.

`benefit` must be distinct across the bank. The validator rejects duplicates, because two
protocols that promise the same thing in the same words are a signal that one of them is filler.

## Ladders

A protocol with a `family` sits on a progression ladder. Each family must have exactly one
`beginner`, one `intermediate`, and one `advanced` rung, each with a measurable `tierTarget`.
Adding a rung to an existing family means rebalancing the others. Adding a new family means
authoring all three at once. If a protocol does not belong on a ladder, omit `family` entirely
and leave it standalone.

## What gets rejected

- A grade the sources do not support.
- Citations behind a login, or that do not load.
- `indications` written as advice or as a diagnosis rather than an observable state.
- A supplement or drug protocol. The bank covers behaviors.
- A protocol that restates one already in the bank under a new name.

## Scope

The bank's center of gravity is work performance. Longevity levers earn their place by protecting
the ability to keep performing, and their `benefit` should be framed that way. Anything specific
to a particular app or product does not belong here.
