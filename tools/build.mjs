// Step 2 - node tools/build.mjs tasks <workDir> <tasksDir> <trDir>
//   one task file per pack: units {u, en, old?, pt?} still needing translation.
// Step 4 - node tools/build.mjs merge <workDir> <outDir(agent outputs)> <trDir> <destDir>
//   rebuilds every vagabond.<pack>.json from existing pt + agent outputs
//   (reads <pack>.json and <pack>.partN.json from outDir).
import fs from 'node:fs';
import path from 'node:path';

const [mode, workDir, b, trDir, destDir] = process.argv.slice(2);
const packs = fs.readdirSync(workDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const SKIP = new Set(['macro-scripts']);
const LABELS = {
  'active-effects': 'Efeitos Ativos', 'build-guides': 'Guias de Construção',
  'mounts-vehicles': 'Montarias e Veículos', stores: 'Lojas',
};
const readTr = p => { const f = path.join(trDir, `vagabond.${p}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const emptyish = v => !JSON.stringify(v ?? '').replace(/[{}\[\]",:]|name|description|note|extraInfo/g, '').trim();

function unitsFor(w) {
  const units = [];
  const push = (u, en, old, pt) => { if (!emptyish(en)) units.push({ u, en, ...(old !== undefined ? { old } : {}), ...(pt !== undefined ? { pt } : {}) }); };
  const addField = (id, k, en) => {
    if (Array.isArray(en)) en.forEach((e, i) => push(`${id}|${k}|${i}`, e));
    else if (k === 'effects') for (const [nm, e] of Object.entries(en)) push(`${id}|effects|${nm}`, e);
    else push(`${id}|${k}`, en);
  };
  for (const n of w.new) for (const [k, v] of Object.entries(n.en)) addField(n.id, k, v);
  for (const c of w.changed) {
    if (c.noBaseline) { for (const [k, v] of Object.entries(c.en)) addField(c.id, k, v); continue; }
    for (const [k, d] of Object.entries(c.diffs)) {
      if (d.elems) for (const e of d.elems) { if (!('reuse' in e)) push(`${c.id}|${k}|${e.i}`, e.newEn, e.oldEn, e.pt); }
      else if (d.byName) for (const e of d.byName) push(`${c.id}|effects|${e.name}`, e.newEn, e.oldEn, e.pt);
      else if (Array.isArray(d.newEn)) d.newEn.forEach((e, i) => push(`${c.id}|${k}|${i}`, e));
      else if (k === 'effects') for (const [nm, e] of Object.entries(d.newEn ?? {})) push(`${c.id}|effects|${nm}`, e, d.oldEn?.[nm], d.pt?.[nm]);
      else push(`${c.id}|${k}`, d.newEn, d.oldEn, d.pt);
    }
  }
  for (const f of w.folders.new) push(`@folder|${f}`, f);
  return units;
}

if (mode === 'tasks') {
  fs.mkdirSync(b, { recursive: true });
  const rows = [];
  for (const p of packs) {
    if (SKIP.has(p)) continue;
    const units = unitsFor(JSON.parse(fs.readFileSync(path.join(workDir, `${p}.json`), 'utf8')));
    if (!units.length) continue;
    fs.writeFileSync(path.join(b, `${p}.json`), JSON.stringify(units, null, 1));
    rows.push({ pack: p, units: units.length, kChars: Math.round(JSON.stringify(units).length / 1000) });
  }
  console.table(rows);
}

if (mode === 'merge') {
  fs.mkdirSync(destDir, { recursive: true });
  const report = [];
  for (const p of packs) {
    if (SKIP.has(p)) continue;
    const w = JSON.parse(fs.readFileSync(path.join(workDir, `${p}.json`), 'utf8'));
    const tr = readTr(p);
    const out = Object.assign({}, ...fs.readdirSync(b)
      .filter(f => f === `${p}.json` || (f.startsWith(`${p}.part`) && f.endsWith('.json')))
      .map(f => JSON.parse(fs.readFileSync(path.join(b, f), 'utf8'))));
    const reuse = {};
    for (const c of w.changed) for (const [k, d] of Object.entries(c.diffs ?? {})) if (d.relayout) reuse[`${c.id}|${k}`] = Object.fromEntries(d.elems.filter(e => 'reuse' in e).map(e => [e.i, e.reuse]));
    const needed = new Set(unitsFor(w).map(x => x.u));
    const missing = [...needed].filter(u => !(u in out));

    const nameCount = {};
    for (const r of Object.values(w.records)) nameCount[r.name] = (nameCount[r.name] ?? 0) + 1;
    const entries = {};
    for (const [id, r] of Object.entries(w.records)) {
      const pt = (r.ptKey && tr?.entries?.[r.ptKey]) || {};
      const e = {};
      for (const [k, en] of Object.entries(r.rec)) {
        if (Array.isArray(en)) {
          const rl = reuse[`${id}|${k}`];
          e[k] = en.map((el, i) => out[`${id}|${k}|${i}`] ?? (rl ? (rl[i] !== undefined ? pt[k]?.[rl[i]] : undefined) : pt[k]?.[i]) ?? el);
        } else if (k === 'effects') {
          e[k] = Object.fromEntries(Object.entries(en).map(([nm, el]) => {
            const v = out[`${id}|effects|${nm}`] ?? pt.effects?.[nm] ?? el;
            return [nm, Object.fromEntries(Object.entries(v).filter(([, x]) => x))];
          }));
        } else {
          const v = out[`${id}|${k}`] ?? pt[k];
          if (v !== undefined && v !== '') e[k] = v;
        }
      }
      entries[nameCount[r.name] > 1 ? id : r.name] = e;
    }
    const folders = {};
    for (const f of w.newFolderNames ?? []) { const v = out[`@folder|${f}`] ?? tr?.folders?.[f]; if (v) folders[f] = v; }
    const file = { label: tr?.label ?? LABELS[p] ?? p, ...(Object.keys(folders).length ? { folders } : {}), entries };
    fs.writeFileSync(path.join(destDir, `vagabond.${p}.json`), JSON.stringify(file, null, '\t') + '\n');
    report.push({ pack: p, entries: Object.keys(entries).length, units: needed.size, missing: missing.length });
    if (missing.length) console.log(p, 'MISSING', missing.slice(0, 10));
  }
  console.table(report);
}
