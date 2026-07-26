#!/usr/bin/env node
/**
 * Détecte les dépendances circulaires entre les chunks générés par Rollup.
 *
 * Pourquoi : `build.rollupOptions.output.manualChunks` peut produire deux chunks
 * qui s'importent mutuellement. L'ordre d'évaluation des modules ES devient alors
 * indéterminé et un chunk peut lire les exports d'un autre avant son
 * initialisation. Symptôme observé en production : `vendor-radix` lisait
 * `React.forwardRef` avant `vendor-react`, React ne montait pas, page blanche.
 *
 * Le build réussit malgré tout — d'où ce contrôle explicite après `npm run build`.
 */

import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const ASSETS_DIRECTORY = new URL('../dist/assets/', import.meta.url).pathname;

/** Repère les imports statiques d'un chunk vers un autre chunk du même dossier. */
const CHUNK_IMPORT_PATTERN = /(?:from|import)\s*["'](\.\/[^"']+\.js)["']/g;

async function buildChunkGraph() {
  let fileNames;
  try {
    fileNames = (await readdir(ASSETS_DIRECTORY)).filter((name) => name.endsWith('.js'));
  } catch {
    throw new Error(`Dossier introuvable : ${ASSETS_DIRECTORY}. Lancez d'abord "npm run build".`);
  }

  const graph = new Map();
  for (const fileName of fileNames) {
    const source = await readFile(join(ASSETS_DIRECTORY, fileName), 'utf8');
    const importedChunks = new Set();
    for (const match of source.matchAll(CHUNK_IMPORT_PATTERN)) {
      importedChunks.add(basename(match[1]));
    }
    graph.set(fileName, importedChunks);
  }
  return graph;
}

/** Parcours en profondeur ; retourne le premier cycle trouvé, sinon null. */
function findCycle(graph) {
  const visited = new Set();
  const stack = [];
  const inStack = new Set();

  function walk(node) {
    if (inStack.has(node)) {
      return [...stack.slice(stack.indexOf(node)), node];
    }
    if (visited.has(node)) return null;

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    for (const neighbour of graph.get(node) ?? []) {
      if (!graph.has(neighbour)) continue;
      const cycle = walk(neighbour);
      if (cycle) return cycle;
    }

    stack.pop();
    inStack.delete(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = walk(node);
    if (cycle) return cycle;
  }
  return null;
}

const graph = await buildChunkGraph();
const cycle = findCycle(graph);

if (cycle) {
  console.error('\nDépendance circulaire entre chunks détectée :\n');
  console.error(`  ${cycle.join('\n    -> ')}\n`);
  console.error("Corrigez `manualChunks` dans vite.config.ts : les modules partagés");
  console.error('par deux chunks manuels doivent vivre dans le même chunk.\n');
  process.exit(1);
}

console.log(`Aucun cycle entre les ${graph.size} chunks générés.`);
