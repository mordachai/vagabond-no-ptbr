# Vagabond pt-BR translation task

You translate Foundry VTT compendium text for the Vagabond TTRPG (pulp fantasy) from English to Brazilian Portuguese.

## Inputs
- Glossary (MANDATORY, read it fully first): `D:/FoundryVTT-14/Data/modules/vagabond-no-ptbr/dictionary.json` — EN term → pt-BR (notes in brackets explain usage; use only the pt-BR term, not the bracket notes).
- Your task file (given in your prompt): a JSON array of units `{u, en, old?, pt?}`.
  - `u` = unit id (copy verbatim as the output key).
  - `en` = CURRENT English text. Either a string, or an object (e.g. `{name, description}` / `{name, note, extraInfo}`).
  - `old` + `pt` present = `pt` is the existing pt-BR translation of the PREVIOUS English `old`. Update `pt` so it matches `en`: keep `pt`'s wording wherever `old` and `en` say the same thing, change only what differs. Do not restyle unchanged sentences.
  - only `pt` present (no `old`) = existing translation; check it against `en` and fix if it no longer matches, otherwise keep it.
  - neither = translate `en` from scratch.

## Output
Write ONE JSON file (path given in your prompt): an object `{ "<u>": <translation>, ... }` with an entry for EVERY unit in the task file.
- `<translation>` has the SAME shape as `en`: string → string; object → object with exactly the same keys. Keys whose English value is `""` stay `""`.
- Valid JSON, UTF-8. Escape `"` inside strings as `\"`. Write the file with the Write tool in one go (for big files you may write it in parts and concatenate, but the end result must be one valid JSON object).
- Then validate: run `node -e "const t=require('<task file>'),o=require('<output file>');const m=t.filter(x=>!(x.u in o));console.log('missing',m.length,m.slice(0,5).map(x=>x.u))"` and fix until missing is 0.

## Rules
- Preserve ALL HTML exactly: same tags, attributes, classes (`<span class="fontstyle0">`, `<p>`, `<strong>`, tables…). Translate only the text between tags.
- `@UUID[...]{Label}`: keep the `@UUID[...]` part byte-for-byte; translate only `{Label}`.
- Keep dice and formulas verbatim: `2d6`, `Cd4`, `Cd4!`, `d20`, `1d6!`, `+1`, `@stats.might.total`, numbers, `7 (2d6)`.
- Bracketed save names in NPC text are translated: `[Endure]` → `[Resistir]`, `[Will]` → `[Vontade]`, `[Reflex]` → `[Reflexo]`.
- Capitalized rules terms (Favor, Hinder, Check, Save, Close, Near, Far, Being, Slot, Luck, Fatigue, Cast, Crit, status names…) MUST use the glossary term and keep the capital letter. If a capitalized game term is not in the glossary, pick a sensible pt-BR term, use it consistently, and list it at the end of your final reply as `NEW TERM: English => Português`.
- Units: keep feet as in the source style used by the glossary/existing `pt` (e.g. `10 pés`, `120'` stays `120'`).
- Proper names of people/works in quotes/epigraphs (e.g. "Liam Neeson, Taken") stay as is; translate the quote text.
- `@folder|X` units: `en` is a compendium folder name; translate it.
- Item/creature names: natural pt-BR (e.g. "Shield, great" → "Escudo, grande" keeps the inventory-style comma ordering).
- Register: clear, concise rulebook Portuguese; second person "você" for player-facing rules text.

## Final reply
Reply in under 10 lines: output path, unit count, missing count (must be 0), and any `NEW TERM:` lines. Do not paste the translations.
