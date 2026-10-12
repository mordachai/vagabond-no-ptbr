// Step 5b - glossary enforcement, applied only to strings whose EN has the term
// and whose pt-BR lacks the glossary word (Being->Criatura, Save->Salvaguarda,
// Focus->Concentracao, Favored/Hindered->Vantagem/Desvantagem, Speed->Velocidade),
// then fixes gender agreement. Dry run by default; review, then --write.
// node tools/fix-terms.mjs <workDir> <trDir> [--write]
import fs from 'node:fs';
import path from 'node:path';

const [workDir, trDir, flag] = process.argv.slice(2);
const write = flag === '--write';

const FIX = [
  [/\bBeings?\b/, [
    [/\beste Ser\b/g, 'esta Criatura'], [/\bum Ser\b/g, 'uma Criatura'], [/\bo Ser\b/g, 'a Criatura'],
    [/\bdo Ser\b/g, 'da Criatura'], [/\bao Ser\b/g, 'à Criatura'], [/\bno Ser\b/g, 'na Criatura'], [/\bpelo Ser\b/g, 'pela Criatura'],
    [/\bos Seres\b/g, 'as Criaturas'], [/\bdos Seres\b/g, 'das Criaturas'], [/\baos Seres\b/g, 'às Criaturas'],
    [/\bnos Seres\b/g, 'nas Criaturas'], [/\bpelos Seres\b/g, 'pelas Criaturas'], [/\bOutros Seres\b/g, 'Outras Criaturas'],
    [/\boutros Seres\b/g, 'outras Criaturas'], [/\bSeres\b/g, 'Criaturas'], [/\bSer\b(?! \w+ado)/g, 'Criatura'],
  ]],
  [/\bSaves?\b/, [
    [/\bum [Tt]este de (\[?(?:Vontade|Reflexo|Resistir)\]?)/g, 'uma Salvaguarda de $1'],
    [/\b[Tt]estes de (\[?(?:Vontade|Reflexo|Resistir)\]?)/g, 'Salvaguardas de $1'],
    [/\b[Tt]este de (\[?(?:Vontade|Reflexo|Resistir)\]?)/g, 'Salvaguarda de $1'],
  ]],
  [/\bFocus(ing)?\b/, [[/\bFoco\b/g, 'Concentração']]],
  [/\bFavor(ed)?\b/, [
    [/podem ser Favorecid[oa]s/g, 'podem ter Vantagem'], [/pode ser Favorecid[oa]/g, 'pode ter Vantagem'],
    [/são Favorecid[oa]s/g, 'têm Vantagem'], [/é Favorecid[oa]/g, 'tem Vantagem'],
    [/ficam Favorecid[oa]s/g, 'têm Vantagem'], [/fica Favorecid[oa]/g, 'tem Vantagem'],
  ]],
  [/\bHinder(ed)?\b/, [
    [/são Dificultad[oa]s/g, 'têm Desvantagem'], [/é Dificultad[oa]/g, 'tem Desvantagem'],
  ]],
  [/\bSpeed\b/, [[/\bDeslocamento\b/g, 'Velocidade']]],
];

// gender agreement after masculine → feminine noun swaps
const POST = [
  [/\bseu Velocidade\b/g, 'sua Velocidade'], [/\bdo Velocidade\b/g, 'da Velocidade'], [/\bo Velocidade\b/g, 'a Velocidade'],
  [/\btodos as Criaturas\b/g, 'todas as Criaturas'], [/\bdeste Criatura\b/g, 'desta Criatura'], [/\bneste Criatura\b/g, 'nesta Criatura'],
  [/\bUm Ser Vinculado\b/g, 'Uma Criatura Vinculada'],
  [/\bCriatura (Médio|Imobilizado|Aliado|Amedrontado|Furioso|Enfeitiçado|Caído|Grande|Pequeno)\b/g, (s, a) => `Criatura ${fem(a)}`],
  [/(esta Criatura estiver) Furioso\b/g, '$1 Furiosa'],
  [/(Qualquer Criatura [^.]*?) é empurrado\b/g, '$1 é empurrada'],
  [/passar na Resistir\b/g, 'passar na Salvaguarda de Resistir'],
  [/\bSer Imobilizado\b/g, 'Criatura Imobilizada'], [/Velocidade usado\b/g, 'Velocidade usada'],
  [/Imobilizada, torna-o\b/g, 'Imobilizada, torna-a'],
];
function fem(a) { return { Grande: 'Grande' }[a] ?? a.replace(/o$/, 'a'); }

const EXPECT = { Beings: /Criatura/, Saves: /[Ss]alvaguarda/, Focus: /Concentra/, Favor: /Vantagem/, Hinder: /Desvantagem/, Speed: /Velocidade/ };
const leftovers = [];
let changed = 0;

for (const f of fs.readdirSync(workDir).filter(f => f.endsWith('.json'))) {
  const pack = f.slice(0, -5);
  const mf = path.join(trDir, `vagabond.${pack}.json`);
  if (!fs.existsSync(mf)) continue;
  const w = JSON.parse(fs.readFileSync(path.join(workDir, f), 'utf8'));
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const cnt = {};
  for (const r of Object.values(w.records)) cnt[r.name] = (cnt[r.name] ?? 0) + 1;
  let packChanged = false;
  for (const [id, r] of Object.entries(w.records)) {
    const key = cnt[r.name] > 1 ? id : r.name;
    const walk = (en, pt, where) => {
      if (typeof en === 'string' && typeof pt === 'string') {
        if (where.endsWith('.name')) return pt;
        let out = pt;
        for (const [er, reps] of FIX) {
          if (!er.test(en)) continue;
          const exp = Object.entries(EXPECT).find(([k]) => er.source.includes(k))?.[1];
          if (exp && exp.test(out)) continue; // already uses the glossary term
          for (const [a, b] of reps) out = out.replace(a, b);
          if (exp && !exp.test(out)) leftovers.push(`${pack}/${r.name}${where} [${er.source}]: ${out.replace(/<[^>]+>/g, '').slice(0, 150)}`);
        }
        if (FIX.some(([er]) => er.test(en))) for (const [a, b] of POST) out = out.replace(a, b);
        if (out !== pt) {
          changed++; packChanged = true;
          const strip = s => s.replace(/<[^>]+>/g, '');
          console.log(`${pack}/${r.name}${where}\n   - ${strip(pt).slice(0, 170)}\n   + ${strip(out).slice(0, 170)}`);
        }
        return out;
      }
      if (Array.isArray(en) && Array.isArray(pt)) return pt.map((p, i) => walk(en[i], p, `${where}[${i}]`));
      if (en && pt && typeof en === 'object' && typeof pt === 'object') {
        const o = { ...pt };
        for (const k of Object.keys(o)) if (k in en) o[k] = walk(en[k], o[k], `${where}.${k}`);
        return o;
      }
      return pt;
    };
    if (m.entries[key]) m.entries[key] = walk(r.rec, m.entries[key], '');
  }
  if (write && packChanged) fs.writeFileSync(mf, JSON.stringify(m, null, '\t') + '\n');
}
console.log(`\nchanged ${changed}${write ? ' (written)' : ' (dry run)'}`);
for (const l of leftovers) console.log('LEFT', l);
