# One schema source for Vertex structured output and imports

Research for [#144](https://github.com/shrujancheruku/look-together/issues/144) (parent map [#142](https://github.com/shrujancheruku/look-together/issues/142)), feeding [#145](https://github.com/shrujancheruku/look-together/issues/145). Researched 2026-11-05 against Google's Vertex AI and Gemini structured-output docs, the `@google/genai` 2.32.0 type definitions and source, and the current releases of each schema library: Zod 4.6.7, Valibot 1.5.0 with `@valibot/to-json-schema` 1.8.0, TypeBox 1.4.4, ArkType 2.2.9 and Effect 4.1.2. Each library generated a JSON Schema for the same test shape: a turn with a `reply`, a `distress` flag, up to 3 `events` as a union keyed by `kind`, string length caps and a nullable optional field. Bundle sizes come from esbuild 0.28.2.

**No live Vertex calls were made.** This machine has no Application Default Credentials, and asking gcloud for a token was refused here. Every claim about what Vertex accepts comes from Google's docs and the SDK. The items to confirm with one live call are listed in [section 6](#6-to-confirm-with-one-live-call).

## Answer in brief

1. **Use `responseJsonSchema` (JSON Schema), not `responseSchema` (OpenAPI).** On Vertex, `responseSchema` takes a subset of the OpenAPI 3.0 Schema object, and that subset has no `oneOf` and no `const`. `responseJsonSchema` takes real JSON Schema with a documented keyword list. That list includes `anyOf`, `oneOf` (treated as `anyOf`), `$defs`/`$ref`, `enum`, `minItems`/`maxItems`, `minimum`/`maximum`, `required` and `additionalProperties`. **It leaves out `const`, `minLength`, `maxLength` and `pattern`.**
2. **The output is guaranteed to match only the keywords Gemini supports.** Unsupported keywords are dropped, not rejected. So string length caps are never enforced by the model, and a `const` discriminator may be lost. Write discriminators as one-value `enum`s, and run the same schema's parser on every reply.
3. **Pick Zod 4, imported as `zod/mini` in shared code.** The one definition gives the TypeScript type (`z.infer`), the Vertex schema (`z.toJSONSchema` plus a one-line `override` that turns `const` into `enum`), and import validation (`safeParse`). In this test it was about 7 KB gzipped, with no platform dependencies. It falls back cleanly when `new Function` isn't available. Google's own Gemini docs name Zod for JavaScript. **Valibot is an equally good fit and smaller (about 2 KB).** TypeBox, ArkType and Effect work too, but cost 38–100 KB gzipped in the app.
4. **Some rules can't live in the schema** and stay in `step` or the import path: word-for-word quote checks, cross-turn and per-Inquiry caps, references to existing Assumption ids, phase-dependent event rules, and the migrations from `vN-1` to `vN`. Size caps stay as `vN` constants. The schema can reuse those constants for the parser's length checks, but Gemini ignores them.

## 1. What Vertex accepts

### Two fields, one recommended

| Field | Format | Source |
|---|---|---|
| `responseSchema` | "a select subset of an [OpenAPI 3.0 schema object]". Needs `responseMimeType: application/json`. | [GenerationConfig](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerationConfig), `@google/genai` 2.32.0 `GenerationConfig.responseSchema` |
| `responseJsonSchema` | JSON Schema. "When this field is set, `responseSchema` must be omitted and `responseMimeType` must be set to `application/json`." | same |
| `responseFormat[].text.schema` | "The JSON schema that the output should conform to." | same; SDK `TextResponseFormat` |

- In the v1 REST reference, `responseMimeType`, `responseSchema` and `responseJsonSchema` are now all marked "Deprecated: Use `responseFormat` instead". The replacement takes a JSON Schema too, so the schema we generate carries over unchanged. Only the field it goes in moves. The SDK added `response_format` to `GenerationConfig` recently ([js-genai CHANGELOG](https://github.com/googleapis/js-genai/blob/main/CHANGELOG.md)). The adapter should keep the field name in one place.
- The SDK's own `responseSchema` doc says: "If `response_schema` doesn't process your schema correctly, try using `response_json_schema` instead." In `generateContentConfigToVertex`, `@google/genai` passes `responseJsonSchema` through unchanged (`tJsonSchema` is the identity function). It also moves any `responseSchema` that carries a `$schema` key over to `responseJsonSchema` (`maybeMoveToResponseJsonSchema`). Read in `dist/node/index.mjs`.

### Keywords `responseJsonSchema` supports

Quoted from the `@google/genai` 2.32.0 `GenerationConfig.responseJsonSchema` doc comment:

> While the full JSON Schema may be sent, not all features are supported. Specifically, only the following properties are supported: `$id` `$defs` `$ref` `$anchor` `type` `format` `title` `description` `enum` (for strings and numbers) `items` `prefixItems` `minItems` `maxItems` `minimum` `maximum` `anyOf` `oneOf` (interpreted the same as `anyOf`) `properties` `additionalProperties` `required`. The non-standard `propertyOrdering` property may also be set. Cyclic references are unrolled to a limited degree and, as such, may only be used within non-required properties. (Nullable properties are not sufficient.) If `$ref` is set on a sub-schema, no other properties, except for than those starting as a `$`, may be set.

Against the questions in the ticket:

| Feature | `responseJsonSchema` | `responseSchema` (OpenAPI `Schema`) |
|---|---|---|
| Unions | `anyOf`, and `oneOf` treated as `anyOf` | `anyOf` only ([Schema](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/Schema)) |
| Discriminated unions | No `discriminator` keyword. Works as `oneOf`/`anyOf` whose branches each hold a one-value `enum` on the shared key. **`const` isn't on the list.** | Same idea, `anyOf` plus a one-value `enum`. No `const` or `oneOf` field in `Schema`. |
| Nullable | `type: ["string","null"]` (`type` is supported). `nullable` is not on the list. | `nullable: true` |
| `minItems` / `maxItems` | Supported | Supported |
| String length, `pattern` | **Not on the list**, so ignored | `minLength`, `maxLength` and `pattern` exist on `Schema`, but the structured-output page lists only `anyOf, enum, format, items, maximum, maxItems, minimum, minItems, nullable, properties, description, propertyOrdering, required` ([Control generated output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)) |
| `enum` | Strings and numbers | "only `string` enums are supported" (same page) |
| Reuse / recursion | `$defs`/`$ref`, recursion only through non-required properties | `defs`/`ref` at the root ([Schema](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/Schema)) |
| `additionalProperties` | Supported | Exists on `Schema`, but the SDK's JSON-to-OpenAPI converter drops it (`processJsonSchema`: "additionalProperties is not included in JSONSchema, skipping it") |

### Limits

- **No numeric limit is published** for nesting depth, property count, enum size or schema size on Vertex.
- "The size of your response schema counts towards the input token limit." So the schema is billed on every call ([Control generated output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)).
- "A complex schema can result in an `InvalidArgument: 400` error." The causes listed are long property names, long array length limits, large enums, many optional properties, and combinations of these (same page).
- Google's Gemini developer docs give more detail. That page covers AI Studio, not Vertex, so treat it as a strong hint only. The API compiles the schema "into a state machine" that has limits on states, branching and nesting depth, and "very large or deeply nested schemas may be rejected" with `400 INVALID_ARGUMENT`. Optional fields, enums and `anyOf` branches all increase complexity. `minLength`/`maxLength` and `minProperties`/`maxProperties` are "accepted but not enforced", and unsupported constraints are stripped "rather than returning an error" ([Structured output](https://aistudio.google.com/docs/structured-output)).
- **Guarantee:** with a schema and `application/json`, "the model's response always follows your defined schema". JSON mode without a schema "acts only as a strong hint" ([Control generated output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)). The guarantee covers only the keywords Gemini supports.
- Gemini 3.8 Flash and 3.5 Flash-Lite are on the page's list of supported models. The page doesn't say whether each model supports both schema fields.

**What this means for the Inquiry schema:** a turn of `{reply, distress, events[≤3]}`, with events as a union keyed by `kind`, fits the keyword list easily. Keep the union small and the event field names short. The schema is billed on every call, and every branch adds complexity.

## 2. What each library emits

All five generated a schema for the same test shape. The keys outside the Vertex list are the ones Gemini would drop:

| Library | Union output | Literal / discriminator | Nullable | Keys outside the Vertex list | Notes |
|---|---|---|---|---|---|
| **Zod 4.6.7** `z.toJSONSchema` (default draft-2020-12) | `oneOf` | `const` | `type: [T, "null"]` | `const`, `minLength`, `maxLength`, `$schema` | Sets `additionalProperties: false` on objects. Targets: `draft-04`, `draft-07`, `draft-2020-12`, `openapi-3.0` ([Zod JSON Schema](https://zod.dev/json-schema)) |
| Zod, `target: "openapi-3.0"` | `oneOf` | **`enum: ["x"]`** | `nullable: true` | `nullable`, `minLength`, `maxLength` | Fixes `const`, but uses `nullable`, which `responseJsonSchema` doesn't list. `oneOf` isn't in Vertex's OpenAPI `Schema` either, so this output fits neither field exactly. |
| **Valibot 1.5.0** + `@valibot/to-json-schema` 1.8.0 | `oneOf` (`variant`) | `const` | `anyOf: [T, {type: null}]` | `const`, `minLength`, `maxLength`, `$schema` | Targets `draft-07` (default), `draft-2020-12`, `openapi-3.0`. Has `overrideSchema`/`overrideAction` hooks ([README](https://github.com/fabian-hiller/valibot/blob/main/packages/to-json-schema/README.md)) |
| **TypeBox 1.4.4** (the schema *is* JSON Schema) | `anyOf` | `const` (literal unions become `anyOf` of `const`s) | `anyOf` | `const`, `minLength`, `maxLength` | No `additionalProperties: false` unless set |
| **ArkType 2.2.9** `.toJsonSchema()` | `anyOf` | `const` | `anyOf` | `const`, `minLength`, `maxLength`, `$schema` | Reorders properties alphabetically, so `propertyOrdering` would have to be added ([ArkType integrations](https://arktype.io/docs/integrations)) |
| **Effect 4.1.2** `Schema.toJsonSchemaDocument` | `anyOf` | **`enum: ["x"]`** | `anyOf` (null listed twice) | `minLength`, `maxLength` | `additionalProperties: true` by default. No OpenAPI target. |

So **every library needs a small post-pass or override** to produce a fully supported schema: `const` to one-value `enum`, and dropping `$schema`. They differ in how easy that override is:

- **Zod:** `z.toJSONSchema(schema, { override: (ctx) => { … } })`. Per the Zod docs, `override` is the supported way to change the output, and "Metadata takes precedence over the keywords Zod generates" ([Zod JSON Schema](https://zod.dev/json-schema)).
- **Valibot:** the `overrideSchema` hook ([README](https://github.com/fabian-hiller/valibot/blob/main/packages/to-json-schema/README.md)).
- For the others, a generic recursive rewrite of the emitted object, about 15 lines.

`minLength`/`maxLength` can stay in the schema. Gemini ignores them, and the same schema's parser enforces them after the call.

## 3. Bundle size and platform fit

The same test shape plus one parse call, bundled with esbuild `--minify --platform=neutral`. JSON Schema generation runs only on the backend, so it's left out of the app's cost.

| Library | Minified | Gzip | Notes |
|---|---:|---:|---|
| Valibot 1.5.0 | 6.1 KB | **2.1 KB** | Modular functions, tree-shakes per schema and action |
| Zod 4.6.7 `zod/mini` | 20.9 KB | **6.9 KB** | Same core as `zod`, functional API, tree-shakes |
| TypeBox 1.4.4 (`Value.Check`) | 151.6 KB | 38.7 KB | |
| ArkType 2.2.9 | 156.3 KB | 47.8 KB | |
| Zod 4.6.7 classic `zod` | 454.2 KB | 92.6 KB | The method-chaining API pulls in the JIT compiler, `fromJSONSchema` and every locale |
| Effect 4.1.2 `Schema` | 315.6 KB | 99.7 KB | Brings much of the Effect runtime |

- **The app should import `zod/mini`, never `zod`.** The two share `zod/v4/core`. A `zod/mini` schema works with `z.infer`, `safeParse`, and `z.toJSONSchema`, which `zod/mini` also exports (checked: it gives the same output). So the protocol package can define every schema with `zod/mini`, and the backend generates the Vertex schema from the same objects.
- **No platform dependencies:** none of the five has runtime dependencies on Node or the DOM. Zod, Valibot, TypeBox and ArkType all work in pure ESM/JS.
- **Hermes and `new Function`:** Hermes documents local-mode `eval()` as unsupported, and says nothing about the `Function` constructor ([Hermes Features](https://github.com/facebook/hermes/blob/main/doc/Features.md)). Zod probes `new Function("")` and falls back to its interpreter if it throws. It also has a `jitless` config to skip the probe (`zod/v4/core/util.js` `allowsEval`, `compile.js`). ArkType probes the same way (`@ark/util` `envHasCsp`) and has a `jitless` option. Valibot never compiles code at runtime. So none of them breaks on Hermes. At most, Zod or ArkType runs its slower non-JIT path, which doesn't matter at our sizes (≤40 Reflections per Inquiry). Set `jitless` in the app to make the behaviour explicit. Not run on a device here.

## 4. Can one definition drive all three?

**Yes, for Zod, with these parts:**

```
vN/schema.ts     zod/mini objects: Turn output per kind, the stored Inquiry record, the export envelope
                 + size constants (PROBLEM_MAX = 2000, REFLECTION_MAX = 4000, ...)
vN/types.ts      export type Inquiry = z.infer<typeof Inquiry> ...
backend adapter  responseJsonSchema = toVertex(z.toJSONSchema(vN.TurnOutput[kind], { override }))
                 reply = vN.TurnOutput[kind].safeParse(JSON.parse(text))
import path      vN.ExportFile.safeParse(json) after migrating forward from its schemaVersion
```

- **TS type:** `z.infer` (output) and `z.input` (input). Zod's `io: "input"` option picks the matching JSON Schema side when a schema has defaults or pipes ([Zod JSON Schema](https://zod.dev/json-schema)).
- **Vertex schema:** generated at module load or at build time, then cached. It's derived, never hand-written. Field `.meta({ description })` text is copied into the JSON Schema, and per Google it is the right place for per-field guidance to the model ([Schema](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/Schema), `description`).
- **Import validation:** use `safeParse` on the Zod schema itself. There's no need to validate imports against a generated JSON Schema with a second validator. A JSON Schema file can still be emitted as documentation for the export format if wanted.
- **One definition, two uses:** the model's output schema per `kind` and the stored record are different shapes, but both are built from the same per-version parts. For example, the `Event` union is defined once and used both in `TurnOutput.events` and in the stored event log.
- Google's Gemini docs show the reverse direction, a JSON Schema turned into Zod with `z.fromJSONSchema`. Zod marks that function "experimental and … not considered part of Zod's stable API" ([Zod JSON Schema](https://zod.dev/json-schema)). Don't use it. Go from Zod to JSON Schema only.

**Valibot** supports the same design (`v.InferOutput`, `toJsonSchema` with `overrideSchema`, `v.safeParse`) at a third of the bundle size. Zod comes out ahead on three things: Google names it for JavaScript, its `override` hook and metadata are documented, and its `zod/mini` package shares one core with full `zod` if the backend wants the method-chaining API. Either is a sound choice. The other three are viable but too heavy for the app.

### What falls outside the schema

These are rules that one schema can't express, or that Gemini won't enforce from it:

| Rule | Where it lives |
|---|---|
| Word-for-word quote check (an Assumption's quote must appear in the person's text) | `step`, which needs the Inquiry's text |
| String size caps (Problem 2,000, Reflection 4,000) | `vN` constants. The schema's `maxLength` uses them for the parser, but **Gemini ignores them**. The HTTP layer and composer read the same constants. |
| Per-Inquiry caps (3 additions, 40 Reflections, 20 dictation minutes) | `step`, because they span turns. The `maxItems: 3` on one turn's events is only a per-turn cap. |
| Event refers to an existing Assumption id or the right phase | `step` |
| Pushback rules (`resetAngles` only when the premise changed) | `step`, or the prompt plus gate records |
| Migrating `vN-1` to `vN` on import | Migrations outside the version folders (as in [current-state](../current-state.md)). The `vN` schema checks only the migrated result. |
| `bigint`, `Date`, `transform` and custom refinements | Unrepresentable in JSON Schema. Zod throws by default (`unrepresentable: "throw"`), which stops one leaking into the model schema without anyone noticing ([Zod JSON Schema](https://zod.dev/json-schema)). Keep model output schemas plain JSON types. Store dates as ISO strings with `format: "date-time"`, which both fields support. |

## 5. Recommendation for #145

- Each `vN/` holds one `schema.ts` written with `zod/mini`. Types are `z.infer`d from it. The size caps are exported constants that the schema itself uses.
- The LLM adapter receives a ready-made schema object for each `kind` from `vN` (for example `vN.modelOutput[kind]`). It converts it once with `z.toJSONSchema`, applying a shared `override` that rewrites `const` to `enum`, and caches the result. It also drops `$schema`. It sends the result as `responseJsonSchema` and later `responseFormat.text.schema`, never as `responseSchema`. Every reply is run through the same `vN` schema's `safeParse`, and a parse failure counts as `failed`. The adapter never declares a schema of its own.
- Import runs `schemaVersion` → migrations → `vN.ExportFile.safeParse`.
- Add a unit test that walks each generated Vertex schema and fails on any keyword outside the supported list. That catches a library upgrade or a new field quietly sending an ignored keyword.

## 6. To confirm with one live call

Before #145 locks this in, these need one call each to Gemini 3.8 Flash in project `look-together`:

1. A `$schema` key in `responseJsonSchema`: accepted, ignored, or `400`? (The plan strips it anyway.)
2. `const` on a discriminator: ignored (so the model can emit any `kind`), enforced, or `400`? This decides whether the `const` → `enum` override is required or just a precaution.
3. `oneOf` with `additionalProperties: false` branches: accepted on Vertex as documented in the SDK?
4. The real Turn and Breakdown schemas: accepted without `400`, and how many input tokens they add.

## Sources

- [Vertex AI: Control generated output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)
- [Vertex AI REST v1: GenerationConfig](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerationConfig)
- [Vertex AI REST v1: Schema](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/Schema)
- [Gemini API: Structured output](https://aistudio.google.com/docs/structured-output) (Gemini developer API, not Vertex; used as a hint only)
- `@google/genai` 2.32.0: `dist/genai.d.ts` (`GenerationConfig.responseJsonSchema`, `TextResponseFormat`), `dist/node/index.mjs` (`processJsonSchema`, `tJsonSchema`, `maybeMoveToResponseJsonSchema`, `generateContentConfigToVertex`); [js-genai CHANGELOG](https://github.com/googleapis/js-genai/blob/main/CHANGELOG.md)
- [Zod: JSON Schema](https://zod.dev/json-schema); `zod` 4.6.7 source (`v4/core/util.js`, `v4/core/compile.js`)
- [Valibot to-json-schema README](https://github.com/fabian-hiller/valibot/blob/main/packages/to-json-schema/README.md)
- [ArkType integrations](https://arktype.io/docs/integrations); `@ark/util` source (`functions.js`)
- [Hermes: Features](https://github.com/facebook/hermes/blob/main/doc/Features.md)
- Observed output of `typebox` 1.4.4 and `effect` 4.1.2 `Schema.toJsonSchemaDocument`, run locally
