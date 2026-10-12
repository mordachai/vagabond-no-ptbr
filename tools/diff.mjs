// Step 1 - diff EN baseline (system packs/_source at the last translated commit)
// vs current EN sources vs the existing pt-BR Babele files. Writes one work
// file per pack (records + unchanged/changed/new/removed/renamed) to <outDir>.
// Usage: node tools/diff.mjs <oldSrc> <newSrc> <translationsDir> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [oldSrc, newSrc, trDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const ITEM_SCALARS = { description: 'system.description', gearCategory: 'system.gearCategory', lore: 'system.lore', duration: 'system.duration', crit: 'system.crit' };
const ACTOR_SCALARS = { description: 'system.description', armorDescription: 'system.armorDescription', sensesNote: 'system.sensesNote', biography: 'system.biography' };
const ARRAYS = {
  traits: ['system.traits', ['name', 'description']],
  levelFeatures: ['system.levelFeatures', ['name', 'description']],
  actions: ['system.actions', ['name', 'note', 'extraInfo']],
  abilities: ['system.abilities', ['name', 'description']],
};
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const str = v => (typeof v === 'string' ? v : '');

function record(doc) {
  const r = { name: doc.name };
  const isActor = doc._key?.startsWith('!actors!');
  for (const [k, p] of Object.entries(isActor ? ACTOR_SCALARS : ITEM_SCALARS)) {
    const v = str(get(doc, p)).trim();
    if (v) r[k] = v;
  }
  for (const [k, [p, fields]] of Object.entries(ARRAYS)) {
    const arr = get(doc, p);
    if (Array.isArray(arr) && arr.length) r[k] = arr.map(e => Object.fromEntries(fields.map(f => [f, str(e?.[f])])));
  }
  if (doc._key?.startsWith('!effects!') && str(doc.description).trim()) r.description = doc.description.trim();
  if (doc.effects?.length) r.effects = Object.fromEntries(doc.effects.map(e => [e.name, { name: e.name, description: str(e.description) }]));
  return r;
}

function load(dir) {
  const docs = new Map(), folders = new Map();
  if (!fs.existsSync(dir)) return { docs, folders };
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (d._key?.startsWith('!folders!')) folders.set(d._id, d.name);
    else docs.set(d._id, d);
  }
  return { docs, folders };
}

const plain = s => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const samePlain = (a, b) => JSON.stringify(a, (k, v) => (typeof v === 'string' ? plain(v) : v)) === JSON.stringify(b, (k, v) => (typeof v === 'string' ? plain(v) : v));
const chars = v => JSON.stringify(v ?? '').length;

const packs = fs.readdirSync(newSrc).filter(p => fs.statSync(path.join(newSrc, p)).isDirectory());
const summary = [];
for (const pack of packs) {
  const O = load(path.join(oldSrc, pack)), N = load(path.join(newSrc, pack));
  const trFile = path.join(trDir, `vagabond.${pack}.json`);
  const tr = fs.existsSync(trFile) ? JSON.parse(fs.readFileSync(trFile, 'utf8')) : null;
  const entries = tr?.entries ?? {};
  const used = new Set();
  const out = { records: {}, newFolders: [], pack, unchanged: [], markupOnly: [], changed: [], new: [], removed: [], renamed: [] };

  for (const [id, nd] of N.docs) {
    const nr = record(nd);
    const od = O.docs.get(id);
    const or = od ? record(od) : null;
    const key = entries[id] ? id : (or && entries[or.name]) ? or.name : (entries[nr.name] ? nr.name : null);
    const pt = key ? entries[key] : null;
    if (key) used.add(key);
    out.records[id] = { name: nr.name, ptKey: key, rec: nr };
    if (!pt) { out.new.push({ id, name: nr.name, en: nr }); continue; }
    if (or && or.name !== nr.name) out.renamed.push({ id, from: or.name, to: nr.name });
    if (!or) { out.changed.push({ id, name: nr.name, ptKey: key, fields: Object.keys(nr), noBaseline: true, en: nr, pt }); continue; }
    const diffFields = Object.keys({ ...or, ...nr }).filter(k => !same(or[k], nr[k]));
    const missing = Object.keys(nr).filter(k => k !== 'name' && pt[k] === undefined && JSON.stringify(nr[k]).replace(/[{}[]",:]|name|description/g, '').trim());
    const realFields = [...new Set([...diffFields.filter(k => k in nr && !samePlain(or[k], nr[k])), ...missing])];
    if (!realFields.length) { (diffFields.length ? out.markupOnly : out.unchanged).push(diffFields.length ? { id, name: nr.name, ptKey: key, fields: diffFields } : nr.name); continue; }
    const diffs = {};
    for (const k of realFields) {
      const o = or[k], n = nr[k], p = pt[k];
      if (Array.isArray(n) && Array.isArray(o) && o.length === n.length) {
        diffs[k] = { elems: n.map((e, i) => ({ i, oldEn: o[i], newEn: e, pt: p?.[i] })).filter((x, i) => !samePlain(o[i], n[i])) };
      } else if (Array.isArray(n)) {
        // length changed: pair by EN name, reuse pt where text unchanged
        const elems = n.map((e, i) => {
          const j = (o ?? []).findIndex(x => x.name === e.name);
          if (j >= 0 && samePlain(o[j], e) && p?.[j]) return { i, reuse: j };
          return { i, oldEn: j >= 0 ? o[j] : undefined, newEn: e, pt: j >= 0 ? p?.[j] : undefined };
        });
        diffs[k] = { relayout: true, length: n.length, elems };
      } else if (k === 'effects' && o && n) {
        diffs[k] = { byName: Object.keys(n).filter(nm => !samePlain(o[nm], n[nm])).map(nm => ({ name: nm, oldEn: o[nm], newEn: n[nm], pt: p?.[nm] ?? p?.[nm] })) };
      } else diffs[k] = { oldEn: o, newEn: n, pt: p };
    }
    out.changed.push({ id, name: nr.name, ptKey: key, fields: realFields, diffs });
  }
  for (const k of Object.keys(entries)) if (!used.has(k)) out.removed.push(k);

  const oldFolders = new Set(O.folders.values()), newFolders = [...N.folders.values()];
  out.newFolderNames = newFolders;
  out.folders = { new: newFolders.filter(f => !(tr?.folders?.[f])), dropped: Object.keys(tr?.folders ?? {}).filter(f => !newFolders.includes(f)) };
  fs.writeFileSync(path.join(outDir, `${pack}.json`), JSON.stringify(out, null, 1));

  summary.push({
    pack, tr: !!tr, docs: N.docs.size, unchanged: out.unchanged.length, markup: out.markupOnly.length,
    changed: out.changed.length, new: out.new.length, removed: out.removed.length, renamed: out.renamed.length,
    newFolders: out.folders.new.length,
    kChars: Math.round((out.changed.reduce((a, c) => a + chars(c.diffs ? Object.values(c.diffs).map(d => d.elems ? d.elems.filter(e => !('reuse' in e)).map(e => e.newEn) : d.byName ? d.byName.map(e => e.newEn) : d.newEn) : c.en), 0) + out.new.reduce((a, c) => a + chars(c.en), 0)) / 1000),
  });
}
console.table(summary);
