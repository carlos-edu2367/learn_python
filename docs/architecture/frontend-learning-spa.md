# Arquitetura — SPA de Aprendizado (Sem Backend)

## 1. Stack sugerida

| Camada | Escolha | Motivo |
|--------|---------|--------|
| **Framework** | Vanilla JS (ES Modules) ou HTMX + Alpine.js | Zero build step, roda direto no navegador via `file://` ou Live Server |
| **CSS** | Tailwind CSS via CDN (ou CSS custom properties puro para zero dependência) | Utilitário, fácil de escalar |
| **Routing** | HashRouter (`#/modulo/1`) | Sem necessidade de servidor; compatível com `file://` |
| **Persistência** | localStorage | Nativo, sem dependências |
| **Build** | Nenhum (.html/.js/.css diretos) | Abre no navegador com um duplo clique |
| **Validação** | VS Code Live Server / Python http.server | Servidor mínimo local |

Alternativa moderna: Vite + React/Svelte com export estático. Modelo de dados e estrutura lógica são os mesmos.

---

## 2. Estrutura de arquivos proposta

```
learning-app/
├── index.html                  # Single entry point (SPA shell)
├── assets/
│   ├── css/
│   │   └── styles.css          # Tema global, variáveis CSS, utilitários
│   └── icons/                  # SVG inline ou sprites para badges/streak
├── content/                    # ← CONTEÚDO SEPARADO DA UI
│   ├── catalog.json            # Catálogo de módulos visíveis ao usuário
│   ├── lessons/                # Conteúdo textual/markdown das lições
│   │   ├── m01-intro.md
│   │   ├── m01-basico.md
│   │   └── ...
│   ├── quizzes/                # Perguntas e respostas por lição
│   │   ├── q-m01.json
│   │   └── ...
│   └── achievements/           # Definição dos badges (não o progresso)
│       └── badges.json
├── src/
│   ├── store/                  # Estado persistido em localStorage
│   │   ├── storage.js          # Camada abstrata: leitura/escrita localStorage
│   │   ├── progress-store.js   # { lessonsCompleted, quizScores, xp }
│   │   ├── stats-store.js      # { currentStreak, lastVisitDate, totalXP }
│   │   └── index.js            # Re-export unificado do estado
│   ├── services/               # Regras de negócio
│   │   ├── xp-service.js       # Calcula XP ganha, verifica nível, level-up
│   │   ├── streak-service.js   # Calcula streak diária, reseta quando falta dia
│   │   ├── badge-service.js    # Verifica condições de desbloqueio vs progresso
│   │   ├── unlock-service.js   # Define quais módulos/lições estão acessíveis
│   │   └── quiz-engine.js      # Validação de respostas, feedback, pontuação
│   ├── ui/                     # Componentes da interface
│   │   ├── router.js           # Hash-based routing → renderiza views
│   │   ├── components/
│   │   │   ├── header.js       # Barra topo: nível atual, XP, streak, avatar
│   │   │   ├── sidebar.js      # Navegação lateral: lista de módulos expandíveis
│   │   │   ├── lesson-view.js  # Renderiza conteúdo da lição (markdown → HTML)
│   │   │   ├── quiz-view.js    # Renderiza perguntas, botões, feedback
│   │   │   ├── dashboard.js    # Visão geral: progresso por módulo
│   │   │   ├── badges-view.js  # Grid de badges desbloqueados + bloqueados
│   │   │   └── modals.js       # Diálogos: level up!, badge earned, confirmação
│   │   └── templates/          # Fragmentos HTML reutilizáveis
│   └── app.js                  # Inicialização: carrega conteúdo, monta roteador
├── tests/                      # Testes unitários (opcional)
│   ├── xp-service.test.js
│   ├── streak-service.test.js
│   └── quiz-engine.test.js
└── docs/
    └── api-content.md          # Especificação do formato dos arquivos de conteúdo
```

---

## 3. Modelo de Dados — Conteúdo (content/)

### 3.1 catalog.json — Catálogo de Módulos

```json
{
  "modules": [
    {
      "id": "m01",
      "title": "Introdução ao JavaScript",
      "description": "Variáveis, tipos e operadores básicos.",
      "order": 1,
      "icon": "📘",
      "requiredXp": 0,
      "prerequisiteModules": [],
      "lessons": ["m01-intro", "m01-basico"],
      "isPublished": true
    },
    {
      "id": "m02",
      "title": "Estruturas de Controle",
      "description": "Condicionais e laços de repetição.",
      "order": 2,
      "icon": "📗",
      "requiredXp": 100,
      "prerequisiteModules": ["m01"],
      "lessons": ["m02-condicionais", "m02-loops"],
      "isPublished": true
    },
    {
      "id": "m03",
      "title": "Funções",
      "description": "Declarar, chamar, arrow functions.",
      "order": 3,
      "icon": "📙",
      "requiredXp": 250,
      "prerequisiteModules": ["m02"],
      "lessons": ["m03-funcoes"],
      "isPublished": false
    }
  ]
}
```

Campos-chave: **id** (único), **prerequisiteModules** (array que exige `completed`), **requiredXp** (XP total mínimo), **isPublished** (lançamento gradual), **lessons** (IDs mapeados para `content/lessons/`).

### 3.2 Lições — lessons/m01-intro.md

Markdown com frontmatter YAML obrigatório:

```markdown
---
id: m01-intro
moduleId: m01
title: "Olá, Variáveis"
xpReward: 20
estimatedMinutes: 5
---

## O que são variáveis?

Variáveis são **caixas** que guardam valores...

```js
let nome = "Maria";
const PI = 3.14;
```
```

Frontmatter: **id** (chave em lessonProgress), **moduleId**, **title**, **xpReward** (inteiro), **estimatedMinutes**. Corpo é markdown puro. Parser interno extrai frontmatter entre `---` e converte resto pra HTML (ou usa marked.js via CDN opcionalmente).

### 3.3 Quizzes — quizzes/q-m01.json

```json
{
  "lessonId": "m01-intro",
  "passingScore": 70,
  "maxAttempts": 3,
  "xpReward": 15,
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "text": "Qual palavra-chave declara uma variável imutável?",
      "options": [
        { "id": "a", "text": "var" },
        { "id": "b", "text": "let" },
        { "id": "c", "text": "const" },
        { "id": "d", "text": "fixed" }
      ],
      "correctAnswers": ["c"],
      "explanation": "`const` cria referência imutável."
    },
    {
      "id": "q2",
      "type": "true_false",
      "text": "`let` permite reatribuição de valor.",
      "options": [
        { "id": "t", "text": "Verdadeiro" },
        { "id": "f", "text": "Falso" }
      ],
      "correctAnswers": ["t"],
      "explanation": "`let` permite reatribuir."
    }
  ]
}
```

Tipos: `single_choice`, `multi_choice`, `true_false`. Explicação aparece após submissão.

### 3.4 Badges — achievements/badges.json

```json
{
  "badges": [
    { "id": "primeira-licao", "title": "Primeiro Passo", "icon": "🎯", "condition": { "type": "totalLessonsCompleted", "min": 1 } },
    { "id": "streak-7", "title": "Semana Imbatível", "icon": "🔥", "condition": { "type": "streakDays", "min": 7 } },
    { "id": "nivel-5", "title": "Estudante Dedicado", "icon": "⭐", "condition": { "type": "playerLevel", "min": 5 } },
    { "id": "quiz-perfeito", "title": "Mestre do Quiz", "icon": "💯", "condition": { "type": "perfectQuizzes", "min": 5 } },
    { "id": "explorador", "title": "Explorador", "icon": "🗺️", "condition": { "type": "allPublishedModulesCompleted", "min": true } }
  ]
}
```

Tipos de condição extensíveis: `totalLessonsCompleted`, `streakDays`, `playerLevel`, `perfectQuizzes`, `allPublishedModulesCompleted`, `totalXP`, `{ moduleId, minPercent }`.

---

## 4. Modelo de Dados — Persistência (src/store/)

Chaves no localStorage: **learning_progress** (objeto principal) e **learning_meta** (versão/migrações).

### 4.1 Schema learning_progress

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-07-10T14:30:00Z",
  "player": { "totalXP": 420, "level": 3, "createdAt": "2025-06-01T09:00:00Z" },
  "stats": { "currentStreak": 5, "longestStreak": 12, "lastVisitDate": "2025-07-10", "totalVisits": 23, "perfectQuizzesCount": 2 },
  "lessonProgress": { "m01-intro": { "completedAt": "2025-06-15T10:00:00Z", "timeSpentSeconds": 300 }, "m01-basico": { "startedAt": "2025-06-18T11:00:00Z", "timeSpentSeconds": 450 } },
  "quizResults": { "q-m01": { "attempts": [{ "attemptNumber": 1, "score": 66, "answers": { "q1": "c", "q2": "t" }, "passed": false, "completedAt": "..." }, { "attemptNumber": 2, "score": 100, "answers": { "q1": "c", "q2": "t" }, "passed": true, "earnedXP": 15, "isPerfect": true, "completedAt": "..." }], "bestScore": 100, "overallPassed": true, "timesCompleted": 1 } },
  "moduleCompletion": { "m01": { "status": "completed", "completionDate": "..." }, "m02": { "status": "in_progress", "progressPercent": 40 } },
  "unlockedBadges": ["primeira-licao", "nivel-3"],
  "settings": { "soundEnabled": true, "highContrastMode": false }
}
```

Campos principais:
- **player**: totalXP, level calculado, createdAt.
- **stats**: streak atual/recorde, lastVisitDate, visitas totais, quizzes perfeitos.
- **lessonProgress**: mapa id→startedAt/completedAt/timeSpentSeconds.
- **quizResults**: cada quiz tem array de tentativas com score, answers, passed, earnedXP, isPerfect.
- **moduleCompletion**: status por módulo (not_started/in_progress/completed + percentual).
- **unlockedBadges**: IDs conquistados.
- **settings**: preferências.

---

## 5. Regras de Negócio

### 5.1 XP e Níveis

| Nível | XP Acumulado Necessário |
|-------|------------------------|
| Lv 1  | 0                      |
| Lv 2  | 100                    |
| Lv 3  | 300                    |
| Lv 4  | 600                    |
| Lv 5  | 1000                   |
| Lv 6  | 1500                   |

Fórmula: `xpParaNivel(n) = 100 * n * (n - 1)`.

```js
// xp-service.js
function xpForLevel(level) { return 100 * level * (level - 1); }
function getPlayerLevel(totalXP) { /* maior nível onde totalXP >= xpParaNivel */ }
function getLevelProgress(totalXP) { /* % entre nível atual e próximo */ }
function awardXP(amount) { data.player.totalXP += amount; checkLevelUp(); }
function checkLevelUp() { /* retorna novoNível se subiu, senão null */ }
```

Ganhos: completar lição (frontmatter), aprovar quiz (quiz JSON, multiplicador ×1.5 se perfeito), bônus diário de streak (5–10 XP).

### 5.2 Streak Diária

```js
function calculateStreak(lastVisitDate, today) {
  const diff = daysBetween(lastVisitDate, today);
  if (diff === 0) return { streak: current, updated: false };       // já visitou hoje
  if (diff === 1) return { streak: current + 1, updated: true };    // ontem — continua
  return { streak: 1, updated: true };                               // esqueceu — reseta
}
```

Mesmo dia = nada; dia seguinte = incrementa; gap ≥2 dias = reseta para 1; nunca visitou = inicia com 1. Bônus: `5 + (streak > 7 ? 5 : 0)`.

### 5.3 Desbloqueio de Módulos

Dois mecanismos combinados: pré-requisito (`prerequisiteModules` exige completed) + XP mínimo (`requiredXp`). Módulo é acessível quando `isPublished === true` E nenhuma condição está violada.

```js
function isModuleUnlocked(moduleId, progressData, catalog) {
  const mod = catalog.modules.find(m => m.id === moduleId);
  if (!mod.isPublished) return false;
  if (progressData.player.totalXP < mod.requiredXp) return false;
  for (const prereq of mod.prerequisiteModules) {
    if (progressData.moduleCompletion[prereq]?.status !== 'completed') return false;
  }
  return true;
}
```

Módulos bloqueados aparecem como "🔒 Bloqueado".

---

## 6. Routing e Navegação

### 6.1 Rotas (HashRouter)

| Rota | View | Ação |
|------|------|------|
| `#/` ou `#` | Dashboard | Visão geral, módulos recentes, próxima lição |
| `#/modulo/:id` | Lista de lições | Listar todas as lições do módulo |
| `#/licao/:lessonId` | Lesson View | Renderizar conteúdo da lição |
| `#/quiz/:quizId` | Quiz View | Responder perguntas do quiz |
| `#/quizzes` | Meus Quizzes | Histórico de quizzes realizados |
| `#/badges` | Badges View | Grid de badges conquistados e bloqueados |
| `#/configuracoes` | Settings | Som, contraste, resetar progresso |

### 6.2 Sidebar — Navegação por Módulos

Ordenada por `order` no catalog.json. Cada item mostra: ícone + título, status (não iniciado / em progresso / completado), barra parcial de progresso, 🔒 se bloqueado. Clique expande lista de lições.

### 6.3 Fluxo principal

```
Dashboard → módulo → lições → abrir lição
                              ↓ completar
                          Marcar ✓ (+XP) → próximo link
                              ↓
                        Quiz da lição (se houver)
                              ↓ aprovado
                      Módulo pode estar completo
```

---

## 7. Serviços Internos — Resumo

| Arquivo | Responsabilidade |
|---------|-----------------|
| `store/storage.js` | CRUD genérico localStorage (get/set/remove/clearAll) |
| `store/progress-store.js` | Operações de progresso (marcar lição, registrar quiz, atualizar XP) |
| `store/stats-store.js` | Estatísticas globais (streak, visitas, perfectQuizzesCount) |
| `services/xp-service.js` | Cálculo XP, níveis, progress bar |
| `services/streak-service.js` | Lógica streak diária, bonus, reset |
| `services/badge-service.js` | Avaliar condições dos badges vs estado atual |
| `services/unlock-service.js` | Verificar acessibilidade de módulos |
| `services/quiz-engine.js` | Validação respostas, score, feedback |

### 7.1 Detalhamento Quiz Engine

```js
// quiz-engine.js
function validateAnswer(question, selectedAnswers) {
  const correct = new Set(question.correctAnswers);
  const selected = new Set(Array.isArray(selectedAnswers) ? selectedAnswers : [selectedAnswers]);
  if (correct.size !== selected.size) return false;
  for (const a of selected) { if (!correct.has(a)) return false; }
  return true;
}

function evaluateQuiz(quizDef, userAnswers) {
  let correct = 0;
  const feedback = [];
  for (const q of quizDef.questions) {
    const answer = userAnswers[q.id];
    const isSelectedArray = Array.isArray(answer) ? answer : [answer];
    const isCorrect = validateAnswer(q, isSelectedArray);
    if (isCorrect) correct++;
    feedback.push({ questionId: q.id, isCorrect, explanation: q.explanation });
  }
  const total = quizDef.questions.length;
  const score = Math.round((correct / total) * 100);
  return { score, passed: score >= quizDef.passingScore, feedback, correct, total };
}

function processResult(quizDef, evaluation, attemptNumber) {
  const multiplier = evaluation.score === 100 ? 1.5 : 1;
  return {
    attemptNumber, score: evaluation.score, answers: userAnswers,
    passed: evaluation.passed, earnedXP: evaluation.passed ? quizDef.xpReward * multiplier : 0,
    isPerfect: evaluation.score === 100, completedAt: new Date().toISOString()
  };
}
```

---

## 8. Camada de Estado (Store)

### 8.1 Abstração Storage

```js
// storage.js
export class Store {
  constructor(key) { this.key = key; }
  get() { try { return JSON.parse(localStorage.getItem(this.key)); } catch { return null; } }
  set(data) { localStorage.setItem(this.key, JSON.stringify(data)); }
  clear() { localStorage.removeItem(this.key); }
}
```

Todos os serviços recebem a instância via injeção simples (testável).

### 8.2 Progress Store

```js
// progress-store.js
export class ProgressStore {
  constructor(store) { this.store = store; }
  
  completeLesson(lessonId) {
    const d = this.store.get();
    d.lessonProgress[lessonId] = { completedAt: new Date().toISOString(), timeSpentSeconds: d.lessonProgress[lessonId]?.timeSpentSeconds || 0 };
    this.store.set(d);
  }
  
  startLesson(lessonId) {
    const d = this.store.get();
    if (!d.lessonProgress[lessonId]) d.lessonProgress[lessonId] = { startedAt: new Date().toISOString() };
    this.store.set(d);
  }
  
  addXP(amount) {
    const d = this.store.get();
    d.player.totalXP += amount;
    d.player.level = xpService.getPlayerLevel(d.player.totalXP);
    d.lastUpdated = new Date().toISOString();
    this.store.set(d);
    return d.player.level;
  }
  
  recordQuizResult(quizId, result) {
    const d = this.store.get();
    if (!d.quizResults[quizId]) d.quizResults[quizId] = { attempts: [] };
    d.quizResults[quizId].attempts.push(result);
    d.quizResults[quizId].bestScore = Math.max(d.quizResults[quizId].bestScore || 0, result.score);
    if (result.passed) d.quizResults[quizId].overallPassed = true;
    d.lastUpdated = new Date().toISOString();
    this.store.set(d);
  }
}
```

### 8.3 Stats Store

```js
// stats-store.js
export class StatsStore {
  constructor(store) { this.store = store; }
  
  recordVisit() {
    const d = this.store.get();
    const today = new Date().toISOString().slice(0, 10);
    const result = streakService.calculateStreak(d.stats.lastVisitDate, today);
    d.stats.currentStreak = result.streak;
    d.stats.lastVisitDate = today;
    d.stats.totalVisits = (d.stats.totalVisits || 0) + 1;
    if (d.stats.currentStreak > d.stats.longestStreak) d.stats.longestStreak = d.stats.currentStreak;
    this.store.set(d);
    return result;
  }
  
  recordPerfectQuiz() {
    const d = this.store.get();
    d.stats.perfectQuizzesCount = (d.stats.perfectQuizzesCount || 0) + 1;
    this.store.set(d);
  }
}
```

---

## 9. UI — Componentes Principais

### 9.1 Header (todas as páginas)

Exibe: avatar/ícone do jogador, barra horizontal de XP nível atual (visual), texto "Nível 3 — 420/600 XP", ícone de fogo 🔥 + streak, medalhas 🏆 clicáveis → `/badges`.

### 9.2 Sidebar

Logo/título do app, itens: Dashboard, Meu Progresso, Badges, Configurações. Divisor, lista de módulos expandíveis com status e barra de progresso, 🔒 se bloqueado. Rodapé com versão.

### 9.3 Lesson View

```html
<div class="lesson-view">
  <header><h1>{{ lesson.title }}</h1></header>
  <div class="lesson-content">{{ renderedMarkdown }}</div>
  <footer class="lesson-actions">
    <button id="btn-mark-complete">✅ Marcar como concluída ({{ lesson.xpReward }} XP)</button>
    <span class="xp-preview">+{{ lesson.xpReward }} XP</span>
    {{# hasNext }}
      <a href="#/licao/{{ nextLessonId }}">Próxima lição →</a>
    {{/ hasNext }}
  </footer>
</div>
```

Markdown convertido em HTML via micro-parser interno (headings, lists, code blocks, bold, italic, links) ou marked.js CDN opcional.

### 9.4 Quiz View

```html
<div class="quiz-view">
  <header><h1>{{ quiz.title }}</h1>
    <span>Tentativa {{ attemptNumber }}/{{ maxAttempts }}</span>
  </header>
  {{# questions}}
    <fieldset class="question">
      <legend>{{ question.text }}</legend>
      {{# options}}
        <label>
          <input type="{{ type }}" name="{{ parentQuestionId }}" value="{{ id }}">
          {{ text }}
        </label>
      {{/ options}}
    </fieldset>
  {{/ questions}}
  <footer>
    <button id="btn-submit">Verificar Respostas</button>
  </footer>
  <div id="feedback-container"></div>
</div>
```

Ao submeter: `evaluateQuiz()` calcula score/feedback. Se passou: registra, dá XP, modal sucesso. Se não passou: mostra explicações, tenta novamente (se tentativas restantes > 0).

---

## 10. Inicialização (app.js)

```js
// src/app.js
async function init() {
  // 1. Carregar catálogos de conteúdo
  const catalog = await loadJSON('/content/catalog.json');
  const badges = await loadJSON('/content/achievements/badges.json');
  
  // 2. Inicializar camadas de estado
  const storage = new Store('learning_progress');
  const metaStorage = new Store('learning_meta');
  const progressStore = new ProgressStore(storage);
  const statsStore = new StatsStore(storage);
  
  // 3. Garantir estado inicial vazio se necessário
  ensureInitialState(storage);
  
  // 4. Registrar visita e recalcular streak
  statsStore.recordVisit();
  
  // 5. Recalcular badges desbloqueados
  const newBadges = await badgeService.checkAll(catalog, badges, storage.get());
  if (newBadges.length > 0) showModal('badgeEarned', newBadges);
  
  // 6. Montar roteador
  const router = new Router({ progressStore, statsStore, catalog, badges });
  router.registerRoute('/', views.dashboard);
  router.registerRoute('/modulo/:id', views.moduleList);
  router.registerRoute('/licao/:lessonId', views.lessonView);
  router.registerRoute('/quiz/:quizId', views.quizView);
  router.registerRoute('/badges', views.badgesView);
  router.registerRoute('/configuracoes', views.settingsView);
  router.init(); // escuta hashchange
  
  // 7. Renderizar header global
  renderHeader(progressStore, statsStore);
}

init();
```

---

## 11. Escalabilidade

**Adicionar conteúdo novo**: criar `.md` em `content/lessons/`, adicionar referência no `catalog.json` (array `lessons`), criar `.json` em `content/quizzes/` se houver quiz, publicar com `isPublished: true`. Zero alterações de código necessárias.

**Temas visuais**: cores primárias, fontes, espaçamentos em `assets/css/styles.css` como custom properties (`--color-primary`, `--font-main`, etc.). Trocar tema é editar um bloco CSS.

---

## 12. Segurança e Limitações

| Aspecto | Observação |
|---------|------------|
| Persistência local | Dados ficam só no navegador. Limpar cache = perder progresso. |
| Sem backend | Não há sincronização entre dispositivos nem backup automático. |
| Integridade | Jogador poderia manipular localStorage manualmente. Aceitável para uso casual; para certificados seria necessário backend. |
| Tamanho máximo | localStorage ~5–10MB. Volume deste SPA insignificante (< 50KB). |
| Extensão futura | Suporta migração para backend — basta substituir `storage.js` por fetch/axios sem alterar regras de negócio nos services. |

---

## 13. Checklist de Validação

Antes de considerar a arquitetura pronta para implementação:

- [ ] Estrutura de arquivos mapeada e validada pela equipe
- [ ] Modelos JSON de conteúdo revisados por educadores (autores de conteúdo podem editar sem saber programar?)
- [ ] Fluxo de desbloqueio de módulos testado em cenários edge (pré-requisito circular? XP exato no limite?)
- [ ] Lógica de streak validada contra casos: mesmo dia, dia seguinte, gap 2 dias, nunca visitou
- [ ] Quiz engine testada para todos os tipos de pergunta (single, multi, true/false)
- [ ] Badge service testado com combinações de condições (ex: streak 7 + nível 3 simultâneos)
- [ ] Estado inicial gerado corretamente (localStorage vazio → dados padrão criados)
- [ ] Router lida com rotas inválidas (404 SPA friendly → redireciona para dashboard)
- [ ] Dados migrados gracefully se schemaVersion mudar (usando learning_meta)
- [ ] Acessibilidade básica: contraste, aria-labels, navegação por teclado

---

*Documento gerado pela Arquitetura — Orin subagent.*
*Versão: 1.0.0 — 10 de julho de 2025*
