import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../visual-polish.css', import.meta.url), 'utf8');

test('shell possui landmarks e skip link acessível', () => {
  assert.match(html, /href="#app" class="skip-link"/);
  assert.match(html, /<main class="main">/);
  assert.match(html, /id="app" role="main" tabindex="-1"/);
  assert.match(html, /aria-label="Navegação da trilha"/);
});

test('polimento visual cobre mobile, desktop e reduced motion', () => {
  assert.match(css, /@media \(min-width: 901px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(css, /overflow-x: auto/);
});

test('foco visível e largura de conteúdo são definidos', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /--content-max: 1180px/);
  assert.match(css, /max-width: var\(--content-max\)/);
});
