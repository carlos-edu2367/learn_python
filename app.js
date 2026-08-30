// ============================================================
// QUERYQUEST — Camada de Aplicação (SPA)
// Navegação, estado, renderização, simulador SQL integrado
// ============================================================

import { modules, badges } from './content.js';

/* ---- Estado ---- */
const STORAGE_KEY = 'queryquest-progress-v2';

function freshState() {
  return {
    xp: 0,
    done: [],
    answers: {},
    streak: 1,
    last: new Date().toDateString(),
    badges: []
  };
}

let state;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  state = raw ? JSON.parse(raw) : freshState();
  // Garantir campos mínimos mesmo se progresso antigo estiver corrompido
  if (!Array.isArray(state.done)) state.done = [];
  if (typeof state.answers !== 'object') state.answers = {};
  if (!Array.isArray(state.badges)) state.badges = [];
} catch {
  state = freshState();
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('localStorage indisponível:', e); }
}

/* ---- Streak ---- */
function updateStreak() {
  const today = new Date();
  const todayKey = today.toDateString();
  if (state.last === todayKey) return;
  const prev = new Date(state.last);
  prev.setDate(prev.getDate() + 1);
  state.streak = prev.toDateString() === todayKey ? state.streak + 1 : 1;
  state.last = todayKey;
  saveState();
}

/* ---- XP & Level ---- */
function xpVal()   { return state.xp; }
function lvl()     { return Math.floor(xpVal() / 300) + 1; }
function progressPct() {
  const cur = xpVal() % 300;
  return Math.round((cur / 300) * 100);
}

/* ---- Badges ---- */
function badgeEarned(id)   { return state.badges.includes(id); }
function grantBadge(id) {
  if (badgeEarned(id)) return false;
  state.badges.push(id);
  saveState();
  const b = badges.find(x => x.id === id);
  if (b) showToast(`${b.icon} Conquista: ${b.name}`);
  return true;
}

function checkBadges() {
  if (state.done.length >= 1)      grantBadge('first');
  if (state.streak >= 3)           grantBadge('streak');
  const mod3 = modules.find(m => m.id === 'm3');
  if (mod3 && mod3.lessons.every(l => state.done.includes(l.id))) grantBadge('join');
  const mod5 = modules.find(m => m.id === 'm5');
  if (mod5 && mod5.lessons.every(l => state.done.includes(l.id))) grantBadge('finish');
  // explorer: visitou todos os módulos
  if (modules.every(m => m.lessons.some(l => state.done.includes(l.id)))) grantBadge('explorer');
}

/* ---- Completar lição ---- */
function markLessonComplete(lessonId) {
  if (state.done.includes(lessonId)) return;
  const allLessons = modules.flatMap(m => m.lessons);
  const lesson = allLessons.find(l => l.id === lessonId);
  if (!lesson) return;
  state.xp += lesson.xp;
  state.done.push(lessonId);
  updateStreak();
  saveState();
  checkBadges();
  updateTopbar();
  showToast(`+${lesson.xp} XP ganho!`);
}

/* ---- Toast ---- */
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ---- Topbar Stats ---- */
function updateTopbar() {
  const $ = document.getElementById.bind(document);
  const elXP  = $('xp');
  const elLvl = $('level');
  const elStr = $('streak');
  if (elXP)  elXP.textContent  = state.xp;
  if (elLvl) elLvl.textContent = lvl();
  if (elStr) elStr.textContent = state.streak;
}

/* ---- Breadcrumb ---- */
function setBreadcrumb(path) {
  const crumb = document.getElementById('crumb');
  const bc = document.getElementById('breadcrumb');
  if (!bc || !crumb) return;
  const parts = Array.isArray(path) ? path : [path];
  if (parts.length === 1) {
    bc.innerHTML = `<strong>${parts[0]}</strong>`;
  } else {
    bc.innerHTML = parts.map((p, i) => {
      if (i === parts.length - 1) return `<strong>${p}</strong>`;
      return `${p}<i>/</i>`;
    }).join('');
  }
}

/* ---- Sidebar Nav ---- */
function renderSidebar() {
  const nav = document.getElementById('module-nav');
  if (!nav) return;
  nav.innerHTML = modules.map(mod => {
    const total = mod.lessons.length;
    const doneCount = mod.lessons.filter(l => state.done.includes(l.id)).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const idx = modules.indexOf(mod);
    const prevMod = idx > 0 ? modules[idx - 1] : null;
    const locked = prevMod && !prevMod.lessons.every(l => state.done.includes(l.id));
    const colorClass = mod.color;
    return `
      <button class="nav-module${locked ? ' nav-locked' : ''}"
              data-module="${mod.id}"
              ${locked ? 'disabled aria-hidden="true"' : ''}
              title="${locked ? 'Bloqueado — conclua o módulo anterior' : mod.title}">
        <div class="nav-title">
          <span class="nav-icon ${colorClass}" style="color:var(--${mod.color})">${mod.icon}</span>
          <div>
            <b>${mod.title}</b>
            <small>${mod.subtitle}</small>
          </div>
        </div>
        <div class="nav-progress"><i style="width:${pct}%"></i></div>
      </button>`;
  }).join('');

  // Bind nav-module clicks
  nav.querySelectorAll('.nav-module:not(.nav-locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      viewModule(btn.dataset.module);
      closeDrawer();
    });
  });
}

/* ---- Drawer Mobile ---- */
function openDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('drawer-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('show');
}

function closeDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('drawer-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

/* ---- Helpers para renderizar conteúdo da lição ---- */
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlightSql(code) {
  // Minimal SQL keyword highlighting
  return escapeHtml(code)
    .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|AS|ORDER|BY|ASC|DESC|LIMIT|OFFSET|GROUP|HAVING|COUNT|SUM|AVG|MAX|MIN|DISTINCT|IN|LIKE|BETWEEN|IS|EXISTS|UNION|ALL|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CASCADE|INDEX|VIEW|TRIGGER)\b/g,
             '<span class="sql-keyword">$1</span>')
    .replace(/\b(TRUE|FALSE)\b/g, '<span class="sql-bool">$1</span>')
    .replace(/(--.*)$/gm, '<span class="sql-comment">$1</span>');
}

function highlightPython(code) {
  return escapeHtml(code)
    .replace(/\b(from|import|class|def|return|if|else|elif|for|while|in|not|and|or|is|None|True|False|print|self|pass|with|as|try|except|finally|raise|yield|lambda|global|nonlocal|assert|del|break|continue)\b/g,
             '<span class="py-keyword">$1</span>')
    .replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, '<span class="py-string">$1</span>')
    .replace(/(#.*)$/gm, '<span class="py-comment">$1</span>');
}

/* ---- View: Dashboard ---- */
function viewDashboard() {
  setBreadcrumb(['TRILHA']);

  // Calcular módulos
  const modCards = modules.map((mod, idx) => {
    const total = mod.lessons.length;
    const doneCount = mod.lessons.filter(l => state.done.includes(l.id)).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const prevMod = idx > 0 ? modules[idx - 1] : null;
    const locked = prevMod && !prevMod.lessons.every(l => state.done.includes(l.id));
    const unlocked = !locked;
    const colorVar = mod.color;

    return `<div class="module-card${locked ? ' is-locked' : ''}"
                 data-module="${mod.id}"
                 ${locked ? 'tabindex="-1" aria-disabled="true"' : 'role="button" tabindex="0"'}
                 title="${locked ? 'Bloqueado' : 'Clique para acessar o módulo'}">
      <div class="module-top">
        <span class="nav-icon ${mod.color}" style="color:var(--${colorVar});background:#${locked ? '1a2d28' : '17362e'}">${mod.icon}</span>
        <span class="tag tag-eyebrow">${mod.desc}</span>
      </div>
      <h3>${mod.title}</h3>
      <p>${mod.subtitle}</p>
      <div class="card-footer">
        <span><b>${doneCount}</b>/${total} lições</span>
        <span>${pct}%</span>
      </div>
    </div>`;
  }).join('');

  // Badges earned count
  const totalBadges = badges.length;
  const earnedCount = state.badges.length;

  const html = `
    <section class="dash">
      <header>
        <h1>QueryQuest <span class="accent">&mdash;</span> Aprenda SQL & SQLAlchemy</h1>
        <p style="color:var(--muted);max-width:520px;margin-top:8px;">Uma trilha gamificada para dominar persistência de dados. Sem login, sem servidor — funciona offline.</p>
        <div class="stats" style="display:flex;gap:14px;margin-top:24px;flex-wrap:wrap;">
          <div class="stat"><small>XP TOTAL</small><strong>${state.xp}</strong></div>
          <div class="stat"><small>NIVEL</small><strong>Lv.<span style="color:var(--purple)">${lvl()}</span></strong></div>
          <div class="stat"><small>STREAK</small><strong style="color:var(--orange)">${state.streak}${state.streak > 1 ? ' dias' : ' dia'}</strong></div>
          <div class="stat"><small>PROGRESSO</small><strong>${state.done.length}/${modules.reduce((s,m)=>s+m.lessons.length,0)}</strong></div>
        </div>
      </header>
      <div class="xp-bar"><i style="width:${progressPct()}%"></i></div>

      <div class="section-head" style="margin-bottom:14px;">
        <h2>Módulos da Trilha</h2>
        <span class="completion">${Math.round((state.done.length / modules.reduce((s,m)=>s+m.lessons.length,0))*100)}% completo</span>
      </div>

      <div class="module-grid">${modCards}</div>

      <div class="section-head badges-head" style="margin-top:40px;">
        <h2>Conquistas</h2>
        <span class="completion">${earnedCount}/${totalBadges}</span>
      </div>
      <div class="badges-grid">${badges.map(b => `
        <div class="badge-card${badgeEarned(b.id) ? ' earned' : ''}"
             title="${b.desc}"
             role="img"
             aria-label="${badgeEarned(b.id) ? 'Desbloqueada: ' + b.name : 'Bloqueada: ' + b.name}">
          <span>${b.icon}</span>
          <div><b>${b.name}</b><small>${b.desc}</small></div>
        </div>`).join('')}</div>

      <footer style="margin-top:40px;text-align:center;">
        <button id="reset-progress-btn" aria-label="Resetar todo o progresso">↻ Resetar progresso</button>
      </footer>
    </section>`;

  document.getElementById('app').innerHTML = html;
  bindDashboard();
  closeDrawer();
}

function bindDashboard() {
  // Module cards click
  document.querySelectorAll('.module-card:not(.is-locked)').forEach(card => {
    card.addEventListener('click', () => viewModule(card.dataset.module));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        viewModule(card.dataset.module);
      }
    });
  });

  // Reset button
  const resetBtn = document.getElementById('reset-progress-btn');
  resetBtn?.addEventListener('click', () => {
    if (confirm('Tem certeza? Todo seu progresso será apagado permanentemente.')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
}

/* ---- View: Modules List ---- */
function viewModule(modId) {
  const mod = modules.find(m => m.id === modId);
  if (!mod) return viewDashboard();

  setBreadcrumb(['TRILHA', mod.title]);

  const idx = modules.indexOf(mod);
  const prevMod = idx > 0 ? modules[idx - 1] : null;
  const locked = prevMod && !prevMod.lessons.every(l => state.done.includes(l.id));

  const lessonRows = mod.lessons.map((lesson, i) => {
    const done = state.done.includes(lesson.id);
    const answered = lesson.quiz && state.answers[lesson.id] !== undefined;
    const correct = lesson.quiz && state.answers[lesson.id] === lesson.quiz.answer;
    const statusIcon = done ? '✓' : (correct ? '?' : '');
    const statusClass = done ? 'is-done' : '';

    return `<button class="lesson-row ${statusClass}${locked ? ' is-locked' : ''}"
                  data-lesson="${lesson.id}"
                  ${locked ? 'disabled aria-disabled="true"' : 'tabindex="0"'}
                  title="${locked ? 'Bloqueado' : lesson.title}">
      <div class="lesson-number">${i + 1}</div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${lesson.tag ? `<span class="tag tag-eyebrow">${lesson.tag}</span>` : ''}
          <strong>${lesson.title}</strong>
        </div>
        <small>${lesson.time} · ${lesson.xp} XP ${answered ? '· respondido' : ''}</small>
      </div>
      <span>${statusIcon || '→'}</span>
    </button>`;
  }).join('');

  const html = `
    <section class="mod-view">
      <header>
        <button class="back" data-view="dash" aria-label="Voltar ao dashboard">←</button>
        <div>
          <h2>${mod.icon} ${mod.title}</h2>
          <p>${mod.desc}</p>
        </div>
      </header>
      <div class="lessons">${lessonRows}</div>
    </section>`;

  document.getElementById('app').innerHTML = html;
  bindModuleView();
  closeDrawer();
}

function bindModuleView() {
  document.querySelectorAll('.back[data-view="dash"]').forEach(btn => {
    btn.addEventListener('click', viewDashboard);
  });

  document.querySelectorAll('.lesson-row:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => viewLesson(btn.dataset.lesson));
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        viewLesson(btn.dataset.lesson);
      }
    });
  });
}

/* ---- View: Single Lesson ---- */
function viewLesson(lessonId) {
  const mod = modules.find(m => m.lessons.some(l => l.id === lessonId));
  if (!mod) return viewDashboard();
  const lesson = mod.lessons.find(l => l.id === lessonId);
  if (!lesson) return viewModule(mod.id);

  setBreadcrumb(['TRILHA', mod.title, lesson.title]);

  const done = state.done.includes(lessonId);
  const ans = state.answers[lessonId];
  const showAns = ans !== undefined;
  const quizData = lesson.quiz;
  const isQuizAnswered = quizData && showAns;
  const isCorrect = isQuizAnswered && ans === quizData.answer;

  // Render intro as paragraph
  const introHtml = `<p>${lesson.intro.replace(/\n\n/g, '</p><p>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;

  // Render explanation if present
  const explanationHtml = lesson.explanation ? `<div class="lesson-content-section"><h3>O que você precisa saber</h3>${lesson.explanation.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n+/g, '<br>')}</div>` : '';

  // Attention box
  const attentionHtml = lesson.attention ? `
    <aside class="lesson-alert">
      <strong>⚠️ Atenção:</strong> ${lesson.attention.replace(/<\/?code>/g, '')}
    </aside>` : '';

  // Mini practice
  const miniPracticeHtml = lesson.mini_practice ? `
    <div class="lesson-practice">
      <strong>💡 Pratique:</strong> ${lesson.mini_practice.replace(/\*<strong>(.+?)<\/strong>\*/g, '$1')}
    </div>` : '';

  // Syntax highlighted code
  const sqlCode = highlightSql(lesson.example || '');
  const pyCode = highlightPython(lesson.py || '');

  // Quiz HTML
  let quizHtml = '';
  if (quizData) {
    quizHtml = `
      <div class="quiz-section">
        <div class="lesson-alert challenge-label">🎯 DESAFIO RÁPIDO</div>
        <h3>${quizData.q}</h3>
        <div class="opts" role="radiogroup" aria-label="Opções do quiz">
          ${quizData.opts.map((opt, i) => {
            let cls = 'opt';
            let disabled = '';
            if (isQuizAnswered) {
              if (i === quizData.answer) cls += ' correct';
              else if (i === ans) cls += ' wrong';
              disabled = 'disabled';
            }
            return `<button class="${cls}" data-i="${i}" role="radio" aria-checked="${isQuizAnswered && i === ans}" ${disabled}>${escapeHtml(opt)}</button>`;
          }).join('')}
        </div>
        ${isQuizAnswered ? `
          <div class="feedback ${isCorrect ? 'good' : 'bad'}">
            <strong>${isCorrect ? '✅ Correto!' : '❌ Não é bem assim...'}</strong>
            <p class="why">${quizData.why}</p>
          </div>` : ''}
      </div>`;
  }

  const completeStatus = done
    ? 'Concluída ✓'
    : (isQuizAnswered && isCorrect ? 'Marcar como concluída' : (isQuizAnswered && !isCorrect ? 'Resposta incorreta — tente novamente' : 'Responda o desafio primeiro'));

  const html = `
    <section class="lesson-view" data-lesson="${lessonId}" data-mod="${mod.id}">
      <div class="lesson-heading">
        <div>
          <span class="tag tag-eyebrow">${lesson.tag}</span>
          <h1>${lesson.title}</h1>
          <div class="lesson-meta">
            <span>⏱ ${lesson.time}</span>
            <span class="xp-reward">${lesson.xp} XP</span>
          </div>
        </div>
      </div>

      <div class="lesson-layout">
        <!-- Main content column -->
        <div class="lesson-main">
          ${introHtml}
          ${explanationHtml}
          ${attentionHtml}
          ${miniPracticeHtml}

          <!-- Code Tabs -->
          <div class="code-tabs">
            <span class="active" data-lang="sql">SQL</span>
            <span data-lang="python">PYTHON / SQLALCHEMY</span>
          </div>

          <div class="code-container">
            <div class="code-block sql" data-lang="sql">
              <div class="code-head">
                <i></i><i></i><i></i>
                <small>query.sql</small>
                <button class="copy" aria-label="Copiar código">copiar</button>
              </div>
              <pre><code>${sqlCode}</code></pre>
            </div>
            <div class="code-block python" data-lang="python" style="display:none">
              <div class="code-head">
                <i></i><i></i><i></i>
                <small>model.py</small>
                <button class="copy" aria-label="Copiar código">copiar</button>
              </div>
              <pre><code>${pyCode}</code></pre>
            </div>
          </div>

          ${quizHtml}
        </div>
      </div>

      <footer style="margin-top:30px;display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;">
        <button class="secondary" data-action="simulator-from-lesson">⚡ Simulador SQL</button>
        <button class="primary${done ? ' completed' : ''}"
                data-action="complete"
                ${!isQuizAnswered ? 'disabled' : (!isCorrect && !done ? 'disabled' : '')}>
          ${done ? '✓ ' : ''}${completeStatus}
        </button>
      </footer>
    </section>`;

  document.getElementById('app').innerHTML = html;
  bindLessonView();
  closeDrawer();
}

function bindLessonView() {
  // Back button
  document.querySelectorAll('.back[data-view="dash"], .back[data-view="mod"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view === 'dash') viewDashboard();
      else if (btn.dataset.mod) viewModule(btn.dataset.mod);
    });
  });

  // Code tabs
  document.querySelectorAll('.code-tabs span').forEach(tab => {
    tab.addEventListener('click', () => {
      const container = tab.closest('.lesson-view');
      container.querySelectorAll('.code-tabs span').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const lang = tab.dataset.lang;
      container.querySelectorAll('.code-container > .code-block').forEach(block => {
        block.style.display = block.dataset.lang === lang ? 'block' : 'none';
      });
    });
  });

  // Copy button
  document.querySelectorAll('.code-block .copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeEl = btn.closest('.code-block').querySelector('code');
      // Remove HTML tags for plain text copy
      const plainText = codeEl.textContent || codeEl.innerText;
      navigator.clipboard?.writeText(plainText).then(() => {
        btn.textContent = 'copiado!';
        setTimeout(() => btn.textContent = 'copiar', 1500);
      }).catch(() => {});
    });
  });

  // Quiz options
  document.querySelectorAll('.opts .opt:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.lesson-view');
      const lessonId = container.dataset.lesson;
      const optIdx = parseInt(btn.dataset.i);
      const mod = modules.find(m => m.lessons.some(l => l.id === lessonId));
      const lesson = mod?.lessons.find(l => l.id === lessonId);
      if (!lesson?.quiz) return;

      state.answers[lessonId] = optIdx;
      saveState();

      // Re-render lesson to show feedback
      viewLesson(lessonId);
    });
  });

  // Complete button
  document.querySelector('[data-action="complete"]')?.addEventListener('click', () => {
    const container = document.querySelector('.lesson-view');
    const lessonId = container?.dataset.lesson;
    if (lessonId && markLessonComplete(lessonId)) {
      viewLesson(lessonId);
    }
  });

  // Simulator button within lesson
  document.querySelector('[data-action="simulator-from-lesson"]')?.addEventListener('click', () => {
    viewSimulator();
  });
}

/* ---- View: SQL Simulator ---- */
let simUIReady = false;

function viewSimulator() {
  setBreadcrumb(['SIMULADOR SQL']);
  updateBottomBar('simulator');

  const html = `
    <section class="simulator-view">
      <header class="sim-header">
        <button class="back" data-action="go-back" aria-label="Voltar">←</button>
        <div>
          <h2>⚡ Simulador SQL</h2>
          <p style="color:var(--muted)">Execute consultas reais contra um banco local. Perfeito para praticar!</p>
        </div>
        <div>
          <button class="secondary" id="sim-init-db">Reiniciar Banco</button>
          <button class="secondary" id="sim-reset">Limpar Tudo</button>
        </div>
      </header>

      <div class="sim-body">
        <!-- Table info panel -->
        <div class="sim-sidebar">
          <h3>Tabelas Disponíveis</h3>
          <div id="sim-table-list"><em>Carregando...</em></div>
        </div>

        <!-- Main editor area -->
        <div class="sim-main">
          <!-- Toolbar buttons -->
          <div class="sim-toolbar">
            <button class="sim-tb-btn active" data-table="tarefas">tarefas</button>
            <button class="sim-tb-btn" data-table="comentarios_tarefa">comentarios_tarefa</button>
            <button class="sim-tb-btn" data-table="usuarios">usuarios</button>
            <button class="sim-tb-btn" data-action="new-table">+ Nova Tabela</button>
          </div>

          <!-- Query input -->
          <div class="sim-query-box">
            <div class="sim-query-head">
              <span>QUERY EDITOR</span>
              <div style="display:flex;gap:8px;">
                <button class="sim-run" id="sim-exec">▶ EXECUTAR</button>
                <select id="sim-example-select" class="sim-dropdown">
                  <option value="">Exemplos rápidos…</option>
                  <optgroup label="SELECT">
                    <option value="select-all">SELECT *</option>
                    <option value="select-filtered">WHERE filtrado</option>
                    <option value="select-order">ORDER BY + LIMIT</option>
                  </optgroup>
                  <optgroup label="INSERT">
                    <option value="insert-one">INSERT simples</option>
                    <option value="insert-bulk">INSERT múltiplo</option>
                  </optgroup>
                  <optgroup label="UPDATE">
                    <option value="update-basic">UPDATE básico</option>
                    <option value="update-conditional">UPDATE condicional</option>
                  </optgroup>
                  <optgroup label="DELETE">
                    <option value="delete-by-id">DELETE por ID</option>
                    <option value="delete-pending">DELETE pendentes</option>
                  </optgroup>
                </select>
              </div>
            </div>
            <textarea id="sim-editor" spellcheck="false" placeholder="Digite sua query SQL aqui...&#10;Ex: SELECT * FROM tarefas WHERE feito = FALSE"></textarea>
          </div>

          <!-- Results -->
          <div class="sim-results-box">
            <div class="sim-results-head">
              <span>RESULTADOS</span>
              <span id="sim-row-count"></span>
            </div>
            <div class="sim-scroll-area">
              <div id="sim-results-empty" class="sim-empty-state">
                <p>Clique em <strong>EXECUTAR</strong> ou selecione um exemplo acima para ver resultados.</p>
              </div>
              <div id="sim-results-content" style="display:none;"></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  document.getElementById('app').innerHTML = html;
  bindSimulator();
  closeDrawer();
}

function updateBottomBar(active) {
  const bar = document.getElementById('bottom-bar');
  if (!bar) return;
  // Show bottom bar only on mobile (CSS handles visibility)
  const btns = bar.querySelectorAll('.bb-btn');
  btns.forEach(b => {
    b.classList.toggle('active', b.dataset.view === active || b.dataset.action === active);
  });
}

function bindSimulator() {
  const editor = document.getElementById('sim-editor');
  const execBtn = document.getElementById('sim-exec');
  const exampleSel = document.getElementById('sim-example-select');
  const resetDbBtn = document.getElementById('sim-init-db');
  const resetAllBtn = document.getElementById('sim-reset');
  const goBackBtn = document.querySelector('[data-action="go-back"]');

  // Go back
  goBackBtn?.addEventListener('click', () => {
    // Navigate back: if current section is lesson, go to module; otherwise dashboard
    const mod = modules.find(m => m.lessons.some(l => state.answers[l.id] !== undefined));
    if (mod) viewModule(mod.id);
    else viewDashboard();
  });

  // Examples dropdown
  exampleSel?.addEventListener('change', () => {
    const val = exampleSel.value;
    if (!val || !editor) return;
    const examples = getSimExamples();
    editor.value = examples[val] || '';
    exampleSel.value = '';
  });

  // Run query
  execBtn?.addEventListener('click', () => {
    if (!editor) return;
    const sql = editor.value.trim();
    if (!sql) return;
    executeSimQuery(sql);
  });

  // Ctrl+Enter to run
  editor?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      execBtn?.click();
    }
  });

  // Reset DB (recreate tables)
  resetDbBtn?.addEventListener('click', async () => {
    if (!window.__simulator) return;
    const tables = ['tarefas', 'comentarios_tarefa', 'usuarios'];
    for (const name of tables) {
      await window.__simulator.dropTable(name).catch(() => {});
    }
    await initDefaultTables();
    updateSimTableList();
    showEmptyResults();
    showToast('Banco reiniciado com tabelas padrão');
  });

  // Clear everything
  resetAllBtn?.addEventListener('click', async () => {
    if (!window.__simulator) return;
    const tables = ['tarefas', 'comentarios_tarefa', 'usuarios'];
    for (const name of tables) {
      try {
        const records = await window.__simulator.getAllRecords(name);
        for (const rec of records) {
          await window.__simulator.deleteRecord(name, rec.id);
        }
      } catch {}
    }
    updateSimTableList();
    showEmptyResults();
    showToast('Dados limpos');
  });

  // Table toolbar buttons
  document.querySelectorAll('.sim-tb-btn[data-table]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sim-tb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      populateEditorWithTable(btn.dataset.table);
    });
  });

  // New table button
  document.querySelector('.sim-tb-btn[data-action="new-table"]')?.addEventListener('click', () => {
    const name = prompt('Nome da nova tabela (ex: projetos):');
    if (!name) return;
    const cols = prompt(`Colunas separadas por vírgula (ex: id INTEGER, nome TEXT, ativo BOOLEAN DEFAULT TRUE):`);
    if (!cols) return;
    createTableFromPrompt(name, cols);
    updateSimTableList();
    showToast(`Tabela "${name}" criada`);
  });

  // Init tables on load
  initSimulatorLoad();
}

function getSimExamples() {
  return {
    'select-all': 'SELECT * FROM tarefas;',
    'select-filtered': 'SELECT id, titulo FROM tarefas WHERE feito = FALSE;',
    'select-order': 'SELECT * FROM tarefas ORDER BY id DESC LIMIT 3;',
    'select-like': "SELECT * FROM tarefas WHERE titulo LIKE '%SQL%';",
    'insert-one': "INSERT INTO tarefas (titulo, feito) VALUES ('Nova tarefa', FALSE);",
    'insert-bulk': "INSERT INTO tarefas (titulo, feito) VALUES\n  ('Aprender JOIN', FALSE),\n  ('Praticar Subqueries', FALSE);",
    'update-basic': 'UPDATE tarefas SET feito = TRUE WHERE id = 1;',
    'update-conditional': 'UPDATE tarefas SET feito = TRUE WHERE id IN (2, 3) AND feito = FALSE;',
    'delete-by-id': 'DELETE FROM tarefas WHERE id = 999;',
    'delete-pending': "DELETE FROM tarefas WHERE titulo LIKE '%Inexistente%';",
  };
}

function populateEditorWithTable(tableName) {
  const editor = document.getElementById('sim-editor');
  if (editor) editor.value = `SELECT * FROM ${tableName};`;
}

async function initSimulatorLoad() {
  const listEl = document.getElementById('sim-table-list');
  if (!listEl) return;

  if (!window.__simulator) {
    try {
      window.__simulator = new SqlSimulator();
      await window.__simulator.init();
      await initDefaultTables();
    } catch (e) {
      listEl.innerHTML = `<em style="color:var(--red)">Erro: ${e.message}</em>`;
      return;
    }
  }

  updateSimTableList();
}

async function initDefaultTables() {
  if (!window.__simulator) return;

  // Create tasks table
  await window.__simulator.createTable('tarefas', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    titulo: 'TEXT NOT NULL',
    feito: 'BOOLEAN DEFAULT 0',
    descricao: 'TEXT',
    criado_em: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  }).catch(() => {}); // ignore if exists

  // Create comments table
  await window.__simulator.createTable('comentarios_tarefa', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    tarefa_id: 'INTEGER',
    conteudo: 'TEXT NOT NULL',
    autor: 'TEXT DEFAULT \'anônimo\'',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  }).catch(() => {});

  // Create users table
  await window.__simulator.createTable('usuarios', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    nome: 'TEXT NOT NULL',
    email: 'TEXT UNIQUE',
    ativo: 'BOOLEAN DEFAULT 1'
  }).catch(() => {});

  // Seed sample data if empty
  const existingTasks = await window.__simulator.selectAll('tarefas');
  if (existingTasks.length === 0) {
    await window.__simulator.insertRow('tarefas', { titulo: 'Aprender SELECT', feito: true, descricao: 'Fundamentos da consulta' });
    await window.__simulator.insertRow('tarefas', { titulo: 'Dominar JOINs', feito: false, descricao: 'Unir tabelas relacionadas' });
    await window.__simulator.insertRow('tarefas', { titulo: 'Subqueries avançadas', feito: false, descricao: 'Queries dentro de queries' });
    await window.__simulator.insertRow('tarefas', { titulo: 'Performance com INDEX', feito: true, descricao: 'Otimize consultas lentas' });
    await window.__simulator.insertRow('tarefas', { titulo: 'Transações ACID', feito: false, descricao: 'Garantia de consistência' });
  }

  // Sample comments
  const existingComments = await window.__simulator.selectAll('comentarios_tarefa');
  if (existingComments.length === 0) {
    await window.__simulator.insertRow('comentarios_tarefa', { tarefa_id: 1, conteudo: 'Muito bom pra começar!', autor: 'Maria' });
    await window.__simulator.insertRow('comentarios_tarefa', { tarefa_id: 2, conteudo: 'JOINs são confusos no início.', autor: 'João' });
    await window.__simulator.insertRow('comentarios_tarefa', { tarefa_id: 2, conteudo: 'Dica: sempre comece com INNER JOIN.', autor: 'Ana' });
  }

  // Sample users
  const existingUsers = await window.__simulator.selectAll('usuarios');
  if (existingUsers.length === 0) {
    await window.__simulator.insertRow('usuarios', { nome: 'Alice', email: 'alice@email.com', ativo: 1 });
    await window.__simulator.insertRow('usuarios', { nome: 'Bob', email: 'bob@email.com', ativo: 0 });
    await window.__simulator.insertRow('usuarios', { nome: 'Carlos', email: 'carlos@email.com', ativo: 1 });
  }
}

async function updateSimTableList() {
  const listEl = document.getElementById('sim-table-list');
  if (!listEl || !window.__simulator) return;

  const tables = ['tarefas', 'comentarios_tarefa', 'usuarios'];
  let html = '<div class="sim-table-list-inner">';
  for (const name of tables) {
    try {
      const count = await window.__simulator.countRecords(name);
      const cols = await window.__simulator.getSchema(name);
      const colNames = Object.keys(cols).join(', ');
      html += `<div class="sim-table-item">
        <strong>${name}</strong>
        <span class="sim-table-count">${count} registros</span>
        <small>${colNames}</small>
      </div>`;
    } catch {
      html += `<div class="sim-table-item"><strong>${name}</strong><em style="color:var(--muted)">sem dados</em></div>`;
    }
  }
  html += '</div>';
  listEl.innerHTML = html;
}

function showEmptyResults() {
  const empty = document.getElementById('sim-results-empty');
  const content = document.getElementById('sim-results-content');
  const rowCount = document.getElementById('sim-row-count');
  if (empty) empty.style.display = 'block';
  if (content) content.style.display = 'none';
  if (rowCount) rowCount.textContent = '';
}

function showResults(data) {
  const empty = document.getElementById('sim-results-empty');
  const content = document.getElementById('sim-results-content');
  const rowCount = document.getElementById('sim-row-count');
  if (!content) return;

  if (!data || data.length === 0) {
    if (empty) empty.style.display = 'block';
    if (empty) empty.innerHTML = '<p>Nenhuma linha retornada.</p>';
    if (content) content.style.display = 'none';
    if (rowCount) rowCount.textContent = '0 linhas';
    return;
  }

  // Convert to string values for display (handles booleans, nulls)
  const rows = data.map(r => {
    const obj = {};
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined) obj[k] = 'NULL';
      else if (typeof v === 'boolean') obj[k] = v ? 'TRUE' : 'FALSE';
      else obj[k] = String(v);
    }
    return obj;
  });

  const headers = Object.keys(rows[0]);

  let html = '<table class="sim-result-table"><thead><tr>';
  for (const h of headers) {
    html += `<th>${escapeHtml(h)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const row of rows) {
    html += '<tr>';
    for (const h of headers) {
      html += `<td>${escapeHtml(row[h])}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  if (empty) empty.style.display = 'none';
  if (content) {
    content.innerHTML = html;
    content.style.display = 'block';
  }
  if (rowCount) rowCount.textContent = `${rows.length} linha${rows.length !== 1 ? 's' : ''}`;
}

async function showExecutionError(msg) {
  const empty = document.getElementById('sim-results-empty');
  const content = document.getElementById('sim-results-content');
  const rowCount = document.getElementById('sim-row-count');
  if (empty) empty.style.display = 'none';
  if (content) {
    content.innerHTML = `<div class="sim-error"><strong>⚠ Erro na execução:</strong><pre>${escapeHtml(msg)}</pre></div>`;
    content.style.display = 'block';
  }
  if (rowCount) rowCount.textContent = 'ERRO';
}

// Removida declaração duplicada de escapeHtml (definida na linha 187)

async function executeSimQuery(sql) {
  if (!window.__simulator) {
    showExecutionError('Simulador não inicializado. Clique em "Reiniciar Banco".');
    return;
  }

  try {
    const result = await window.__simulator.exec(sql);

    if (result.type === 'error') {
      await showExecutionError(result.message);
    } else if (result.type === 'rows') {
      showResults(result.rows);
    } else if (result.type === 'affected') {
      showEmptyResults();
      showToast(`${result.affected} registro(s) afetado(s)`);
    } else {
      showResults(result.rows || []);
    }

    // Refresh table counts
    updateSimTableList();
  } catch (err) {
    await showExecutionError(err.message);
  }
}

async function createTableFromPrompt(name, colsStr) {
  if (!window.__simulator) return;
  const schema = {};
  for (const part of colsStr.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const colName = parts[0];
    if (colName) {
      schema[colName] = parts.slice(1).join(' ');
    }
  }
  await window.__simulator.createTable(name, schema);
}

/* ---- Event Binding (Global) ---- */
function bindGlobalEvents() {
  // Mobile menu button
  document.getElementById('menu-btn')?.addEventListener('click', openDrawer);

  // Drawer overlay click closes drawer
  document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);

  // Global back button handler (for lesson views)
  document.getElementById('app')?.addEventListener('click', e => {
    // Delegate: .back[data-view="dash"]
    const backBtn = e.target.closest('.back[data-view="dash"]');
    if (backBtn) {
      e.preventDefault();
      viewDashboard();
      return;
    }
    // Delegate: .back[data-view="mod"]
    const backModBtn = e.target.closest('.back[data-view="mod"]');
    if (backModBtn) {
      e.preventDefault();
      viewModule(backModBtn.dataset.mod);
      return;
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Escape closes drawer
    if (e.key === 'Escape') {
      const sidebar = document.getElementById('sidebar');
      if (sidebar?.classList.contains('open')) closeDrawer();
    }
  });
}

/* ---- Initialize App ---- */
async function init() {
  updateTopbar();
  renderSidebar();
  bindGlobalEvents();
  viewDashboard();
}

init();
