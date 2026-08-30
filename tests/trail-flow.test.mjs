// ============================================================
// trail-flow — Testes da ordem didática da trilha (Node nativo)
//
// O QUE VALIDA:
//   1. app.js exporta a constante TRAIL_ORDER (ordem didática publicada).
//   2. Todo ID m1..m8 referenciado no TRAIL_ORDER existe em content.js.
//   3. Nenhum módulo m1..m8 fica órfão (todo módulo existente está na ordem).
//   4. Os IDs são únicos em content.js (sem duplicatas por reordenação).
//   5. A sequência didática: m6 (CREATE), m7 (UPDATE), m8 (DELETE)
//      precedem m5 (Mini-projeto), ou seja: ... m6, m7, m8, ..., m5.
// Não altera app.js, content.js, docs nem styles: apenas lê os arquivos.
// ============================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = readFileSync(resolve(root, 'app.js'), 'utf8');
const contentSrc = readFileSync(resolve(root, 'content.js'), 'utf8');

// --- Leitura da constante TRAIL_ORDER em app.js (sem executar o SPA) ---
function extractTrailOrder(src) {
  const re = /export\s+const\s+TRAIL_ORDER\s*=\s*(\[[^\]]*\])/;
  const m = src.match(re);
  return m ? JSON.parse(m[1].replace(/'/g, '"')) : null;
}

// --- Leitura dos IDs de módulo declarados em content.js ---
function extractModuleIds(src) {
  return [...src.matchAll(/^\s*id:\s*'m(\d+)'/gm)].map(m => `m${m[1]}`);
}

const trail = extractTrailOrder(appSrc);
const contentIds = extractModuleIds(contentSrc);

test('app.js exporta TRAIL_ORDER com os 8 módulos m1..m8', () => {
  assert.ok(trail, 'TRAIL_ORDER não encontrado em app.js');
  assert.deepEqual(
    [...trail].sort(),
    ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
    'TRAIL_ORDER deve conter exatamente os IDs m1..m8 (sem faltar nem sobrar)'
  );
});

test('m6 (CREATE), m7 (UPDATE) e m8 (DELETE) precedem m5 (Mini-projeto)', () => {
  for (const id of ['m6', 'm7', 'm8']) {
    assert.ok(
      trail.indexOf(id) < trail.indexOf('m5'),
      `${id} deve aparecer em TRAIL_ORDER ANTES de m5 (CRUD antes do projeto final)`
    );
  }
});

test('todos os IDs de TRAIL_ORDER existem em content.js', () => {
  for (const id of trail) {
    assert.ok(
      contentIds.includes(id),
      `TRAIL_ORDER referencia ${id}, mas content.js não declara esse módulo`
    );
  }
});

test('nenhum módulo m1..m8 fica órfão fora do TRAIL_ORDER', () => {
  const contentUnique = [...new Set(contentIds)];
  const trailSet = new Set(trail);
  for (const id of contentUnique) {
    assert.ok(
      trailSet.has(id),
      `content.js declara ${id}, mas TRAIL_ORDER não o inclui na trilha`
    );
  }
});

test('IDs de módulo em content.js são únicos (m1..m8, um por módulo)', () => {
  const dupes = contentIds.filter((id, i) => contentIds.indexOf(id) !== i);
  assert.deepEqual(dupes, [], 'content.js não pode declarar o mesmo ID de módulo mais de uma vez');
});

test('a trilha parte de fundamentos (m1, m2) e encerra no projeto (m5)', () => {
  assert.equal(trail[0], 'm1', 'o curso deve começar por m1');
  assert.equal(trail[1], 'm2', 'o segundo módulo deve ser m2');
  assert.equal(trail[trail.length - 1], 'm5', 'o curso deve encerrar no mini-projeto m5');
});