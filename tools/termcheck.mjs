// Glossary consistency report: flags strings whose EN source uses a rules
// term but whose pt-BR text lacks the expected glossary term.
// Usage: node tools/termcheck.mjs <workDir> <translationsDir> [examplesPerTerm=3] [termFilter]
import fs from 'node:fs';
import path from 'node:path';

const [workDir, trDir, nArg, only] = process.argv.slice(2);
const N = Number(nArg) || 3;

// [EN regex, expected pt-BR regex]
export const RULES = [
  [/\bSpeed\b/, /Velocidade/],
  [/\bSaves?\b/, /[Ss]alvaguarda/],
  [/\bFavor(ed)?\b/, /Vantagem/],
  [/\bHinder(ed)?\b/, /Desvantagem/],
  [/\bChecks?\b/, /[Tt]este/],
  [/\bClose\b/, /Adjacente/],
  [/\bNear\b/, /Próxim/],
  [/\bBeings?\b/, /Criatura/],
  [/\bShifts?\b/, /Quartos? de dia/],
  [/\bFatigue\b/, /Fadiga/],
  [/\bCrit(s|ical)?\b/, /Crít/],
  [/\bLuck\b/, /Sorte/],
  [/\bSlots?\b/, /Espaço/],
  [/\bRound\b/, /Rodada/],
  [/\bTurn\b/, /Turno/],
  [/\bFocus(ing)?\b/, /Concentra/],
  [/\bCast(s|ing)?\b/, /[Cc]onjur/],
];

const strip = s => s.replace(/<[^>]+>/g, '');
const res = {};
for (const f of fs.readdirSync(workDir).filter(f => f.endsWith('.json'))) {
  const pack = f.slice(0, -5);
  const mf = path.join(trDir, `vagabond.${pack}.json`);
  if (!fs.existsSync(mf)) continue;
  const w = JSON.parse(fs.readFileSync(path.join(workDir, f), 'utf8'));
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const cnt = {};
  for (const r of Object.values(w.records)) cnt[r.name] = (cnt[r.name] ?? 0) + 1;
  for (const [id, r] of Object.entries(w.records)) {
    const e = m.entries[cnt[r.name] > 1 ? id : r.name];
    const walk = (en, pt, where) => {
      if (typeof en === 'string' && typeof pt === 'string') {
        if (where.endsWith('.name')) return;
        for (const [er, pr] of RULES) {
          if (only && !er.source.includes(only)) continue;
          if (er.test(en) && !pr.test(pt)) (res[er.source] ??= []).push(`${pack}/${r.name}${where}\n      EN: ${strip(en).slice(0, 140)}\n      PT: ${strip(pt).slice(0, 160)}`);
        }
      } else if (en && typeof en === 'object') for (const k in en) walk(en[k], pt?.[k], `${where}.${k}`);
    };
    walk(r.rec, e, '');
  }
}
for (const [k, v] of Object.entries(res)) {
  console.log(`\n### ${k} (${v.length})`);
  v.slice(0, N).forEach(x => console.log('  ', x));
}
