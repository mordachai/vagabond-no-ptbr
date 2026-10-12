// Step 3b - checks agent outputs against task units: missing units, shape,
// HTML tag sequence, @UUID links, dice, untranslated text.
// node tools/validate.mjs <tasksDir> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [tasksDir, outDir] = process.argv.slice(2);
const tags = s => (String(s).match(/<\/?[a-z][a-z0-9]*/gi) ?? []).map(t => t.toLowerCase()).join(' ');
const uuids = s => (String(s).match(/@UUID\[[^\]]+\]/g) ?? []).sort().join(' ');
const dice = s => (String(s).match(/\b\d*[dD]\d+!?|\bCd\d+!?/g) ?? []).map(x => x.toLowerCase()).sort().join(' ');
const strings = (v, pre = '') => (typeof v === 'string' ? [[pre, v]] : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => strings(x, pre ? `${pre}.${k}` : k)) : []);

let total = 0;
for (const f of fs.readdirSync(tasksDir).filter(f => f.endsWith('.json') && !f.startsWith('_'))) {
  const t = JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf8'));
  const of = path.join(outDir, f);
  if (!fs.existsSync(of)) { console.log(`${f}: NO OUTPUT`); continue; }
  let o;
  try { o = JSON.parse(fs.readFileSync(of, 'utf8')); } catch (e) { console.log(`${f}: INVALID JSON ${e.message}`); continue; }
  const issues = [];
  for (const { u, en } of t) {
    if (!(u in o)) { issues.push(`${u}: missing`); continue; }
    const tr = o[u];
    if (typeof en !== typeof tr) { issues.push(`${u}: shape ${typeof en}→${typeof tr}`); continue; }
    if (typeof en === 'object') {
      const ek = Object.keys(en).sort().join(), tk = Object.keys(tr).sort().join();
      if (ek !== tk) issues.push(`${u}: keys ${ek} vs ${tk}`);
    }
    const trMap = Object.fromEntries(strings(tr));
    for (const [k, s] of strings(en)) {
      const x = trMap[k] ?? '';
      const id = k ? `${u}.${k}` : u;
      if (s && !x) issues.push(`${id}: empty`);
      if (tags(s) !== tags(x)) issues.push(`${id}: html tags differ`);
      if (uuids(s) !== uuids(x)) issues.push(`${id}: @UUID differ`);
      if (dice(s) !== dice(x)) issues.push(`${id}: dice differ (${dice(s)} | ${dice(x)})`);
      if (s.length > 40 && s === x) issues.push(`${id}: untranslated`);
    }
  }
  total += issues.length;
  console.log(`${f}: ${t.length} units, ${issues.length} issues`);
  for (const i of issues.slice(0, 15)) console.log('   ', i);
}
console.log('TOTAL ISSUES', total);
