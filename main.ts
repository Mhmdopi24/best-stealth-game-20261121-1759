// The Moon Pearl — the entry program.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with buildDossier from
// vendor/makefun-game.ts. Node 22, standard library only, no network.

import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

if (outDir === '/' || outDir === repoRoot || outDir.startsWith(repoRoot + '/')) {
  throw new Error(`refusing to use ${outDir} as the output directory`);
}

// Count what will be handed in, so a run's log shows the entry's shape.
function countEntries(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countEntries(path);
      files += sub.files + 1;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

mkdirSync(outDir, { recursive: true });
for (const name of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(outDir, name), { recursive: true, force: true });
}
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const game = countEntries(join(outDir, 'game'));
const shots = countEntries(join(outDir, 'screenshots'));
console.log(`game/: ${game.files} files, ${game.bytes} bytes`);
console.log(`screenshots/: ${shots.files} files, ${shots.bytes} bytes`);

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
