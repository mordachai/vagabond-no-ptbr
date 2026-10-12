// Step 5a - post-merge term renames (add a RULES row when a term changes).
// node tools/sweep.mjs <workDir> <mergedDir>
// Walks every merged entry next to its current EN record; applies term fixes
// only where the EN text supports them; prints anything ambiguous.
import fs from 'node:fs';
import path from 'node:path';

const [workDir, mergedDir] = process.argv.slice(2);
const flags = [];
let changes = 0;

// [EN test, fn(pt) → pt]
const RULES = [
  // Shift (downtime block) = "Quarto de dia" (lang file). Only when EN says Shift and never Turn.
  [en => /\bShifts?\b/.test(en) && !/\bTurns?\b/.test(en),
    pt => pt.replace(/\bTurnos\b/g, 'Quartos de dia').replace(/\bTurno\b/g, 'Quarto de dia')],
  [en => /\bShifts?\b/.test(en), pt => pt.replace(/Quartos de Dia/g, 'Quartos de dia').replace(/Quarto de Dia/g, 'Quarto de dia')],
  [en => /Cast Max/i.test(en), pt => pt.replace(/Limite de Conjuração/g, 'Máximo de Conjuração')],
  [en => /Vicious/.test(en), pt => pt.replace(/Propriedade Violenta/g, 'Propriedade Cruel')],
  [en => /Hunter.s Mark/.test(en), pt => pt.replace(/A Marca de um Caçador|Marca de um Caçador/g, 'Marca do Caçador')],
  [en => /Pack Mule/.test(en), pt => pt.replace(/Talento Burro de Carga/g, 'Burro de Carga')],
];

function walk(en, pt, where) {
  if (typeof en === 'string' && typeof pt === 'string') {
    let out = pt;
    for (const [test, fn] of RULES) if (test(en)) out = fn(out);
    if (/\bShifts?\b/.test(en) && /\bTurns?\b/.test(en) && /Turno/.test(out)) flags.push(`${where}: EN has Shift+Turn — check`);
    if (out !== pt) changes++;
    return out;
  }
  if (Array.isArray(en) && Array.isArray(pt)) return pt.map((p, i) => walk(en[i], p, `${where}[${i}]`));
  if (en && pt && typeof en === 'object' && typeof pt === 'object') {
    const o = { ...pt };
    for (const k of Object.keys(o)) if (k in en) o[k] = walk(en[k], o[k], `${where}.${k}`);
    return o;
  }
  return pt;
}

for (const f of fs.readdirSync(workDir).filter(f => f.endsWith('.json'))) {
  const pack = f.slice(0, -5);
  const mf = path.join(mergedDir, `vagabond.${pack}.json`);
  if (!fs.existsSync(mf)) continue;
  const w = JSON.parse(fs.readFileSync(path.join(workDir, f), 'utf8'));
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const nameCount = {};
  for (const r of Object.values(w.records)) nameCount[r.name] = (nameCount[r.name] ?? 0) + 1;
  for (const [id, r] of Object.entries(w.records)) {
    const key = nameCount[r.name] > 1 ? id : r.name;
    if (m.entries[key]) m.entries[key] = walk(r.rec, m.entries[key], `${pack}/${r.name}`);
  }
  fs.writeFileSync(mf, JSON.stringify(m, null, '\t') + '\n');
}
console.log('changed strings', changes);
for (const x of flags) console.log('FLAG', x);
