import { modules, badges } from './content.js';
const KEY = 'queryquest-progress';
const fresh = () => ({ xp: 0, done: [], answers: {}, streak: 1, last: new Date().toDateString(), badges: [] });
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || fresh();

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

function saveState() {
    localStorage.setItem(KEY, JSON.stringify(state));
}

function xp() { return state.xp; }
function level() { return Math.floor(xp() / 300) + 1; }
function progressToNext() {
    const cur = xp() % 300;
    return Math.round((cur / 300) * 100);
}

function earned(b) { return state.badges.includes(b.id); }
function grant(b) {
    if (!earned(b)) {
        state.badges.push(b.id);
        saveState();
        return true;
    }
    return false;
}

function checkBadges() {
    if (state.done.length >= 1) grant(badges.find(b => b.id === 'first'));
    if (state.streak >= 3) grant(badges.find(b => b.id === 'streak'));
    const joinMod = modules.find(m => m.id === 'm3');
    if (joinMod && joinMod.lessons.every(l => state.done.includes(l.id))) grant(badges.find(b => b.id === 'join'));
    const finalMod = modules.find(m => m.id === 'm5');
    if (finalMod && finalMod.lessons.every(l => state.done.includes(l.id))) grant(badges.find(b => b.id === 'finish'));
}

function lessonDone(id) {
    if (!state.done.includes(id)) {
        const lesson = modules.flatMap(m => m.lessons).find(l => l.id === id);
        if (lesson) {
            state.xp += lesson.xp;
            state.done.push(id);
            updateStreak();
            saveState();
            checkBadges();
        }
    }
}

const $ = document.querySelector.bind(document);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function render(root, html) {
    root.innerHTML = html;
    bind();
}

function viewDashboard() {
    const m = modules.map(mod => {
        const done = mod.lessons.filter(l => state.done.includes(l.id)).length;
        const total = mod.lessons.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const idx = modules.indexOf(mod);
        const prev = idx > 0 ? modules[idx - 1] : null;
        const locked = prev && !prev.lessons.every(l => state.done.includes(l.id));
        return `<div class="mod ${locked ? 'locked' : ''}" data-id="${mod.id}"><div class="mod-head"><span class="mod-icon" style="color:var(--${mod.color})">${mod.icon}</span><div><h3>${mod.title}</h3><p>${mod.subtitle}</p></div></div><div class="mod-progress"><div class="bar"><i style="width:${pct}%"></i></div><span>${done}/${total} lições</span></div></div>`;
    }).join('');
    render($('#app'), `<section class="dash"><header><h1>QueryQuest</h1><div class="stats"><div class="stat"><b>${xp()}</b> XP</div><div class="stat"><b>Nv.${level()}</b></div><div class="stat"><b>${state.streak}</b> dias</div></div></header><div class="xp-bar"><i style="width:${progressToNext()}%"></i></div><div class="modules">${m}</div><footer><button id="reset">Resetar progresso</button></footer></section>`);
}

function viewModule(modId) {
    const mod = modules.find(m => m.id === modId);
    if (!mod) return viewDashboard();
    const idx = modules.indexOf(mod);
    const prev = idx > 0 ? modules[idx - 1] : null;
    const locked = prev && !prev.lessons.every(l => state.done.includes(l.id));
    const lessons = mod.lessons.map(l => {
        const done = state.done.includes(l.id);
        return `<button class="lesson ${done ? 'done' : ''}" data-id="${l.id}" ${locked ? 'disabled' : ''}><span>${l.tag ? '<span class="tag">' + l.tag + '</span>' : ''}<strong>${l.title}</strong></span>${done ? '✓' : ''}</button>`;
    }).join('');
    render($('#app'), `<section class="mod-view"><header><button class="back" data-view="dash">←</button><div><h2>${mod.icon} ${mod.title}</h2><p>${mod.desc}</p></div></header><div class="lessons">${lessons}</div></section>`);
}

function lessonView(modId, lessonId) {
    const mod = modules.find(m => m.id === modId);
    const lesson = mod?.lessons.find(l => l.id === lessonId);
    if (!lesson) return viewModule(modId);
    const done = state.done.includes(lessonId);
    const ans = state.answers[lessonId];
    const showAns = ans !== undefined;
    const showQuiz = lesson.quiz;
    let quizHtml = '';
    if (showQuiz) {
        quizHtml = `<div class="quiz ${showAns ? 'answered' : ''}"><p>${lesson.quiz.q}</p><div class="opts">${lesson.quiz.opts.map((o, i) => `<button class="opt ${showAns ? (i === lesson.quiz.answer ? 'correct' : i === ans ? 'wrong' : '') : ''}" data-i="${i}" ${showAns ? 'disabled' : ''}>${o}</button>`).join('')}</div>${showAns ? `<p class="why">${lesson.quiz.why}</p>` : ''}</div>`;
    }
    render($('#app'), `<section class="lesson-view" data-mod="${modId}" data-lesson="${lessonId}"><header><button class="back" data-view="mod" data-mod="${modId}">←</button><div><span class="tag">${lesson.tag}</span><h2>${lesson.title}</h2></div></header><article><p>${lesson.intro}</p><div class="code-tabs"><span class="active" data-lang="sql">SQL</span><span data-lang="python">PYTHON / SQLALCHEMY</span></div><pre class="code-block sql"><code>${lesson.code}</code></pre><pre class="code-block python" style="display:none"><code>${lesson.py}</code></pre>${quizHtml}</article><footer><button class="primary" data-action="complete" ${done || (showQuiz && showAns && ans !== lesson.quiz.answer) ? 'disabled' : ''}>${done ? 'Concluída ✓' : (showQuiz && !showAns ? 'Responder primeiro' : (showQuiz && showAns && ans !== lesson.quiz.answer ? 'Resposta incorreta, tente novamente' : 'Marcar como concluída'))}</button></footer></section>`);
}

function bind() {
    $('#reset')?.addEventListener('click', () => {
        if (confirm('Apagar todo progresso?')) {
            localStorage.removeItem(KEY);
            state = fresh();
            location.reload();
        }
    });

    $$('.mod:not(.locked)').forEach(b => b.addEventListener('click', () => viewModule(b.dataset.id)));

    $$('.lesson:not([disabled])').forEach(b => {
        b.addEventListener('click', () => {
            const lessonId = b.dataset.id;
            const lesson = modules.flatMap(m => m.lessons).find(l => l.id === lessonId);
            if (lesson) {
                const mod = modules.find(m => m.lessons.some(l => l.id === lessonId));
                lessonView(mod.id, lessonId);
            }
        });
    });

    $$('.back[data-view="dash"]').forEach(b => b.addEventListener('click', viewDashboard));
    $$('.back[data-view="mod"]').forEach(b => b.addEventListener('click', () => viewModule(b.dataset.mod)));

    $$('.opt').forEach(b => b.addEventListener('click', () => {
        const container = b.closest('.lesson-view');
        const modId = container?.dataset.mod;
        const lessonId = container?.dataset.lesson;
        const mod = modules.find(m => m.id === modId);
        const lesson = mod?.lessons.find(l => l.id === lessonId);

        if (lesson) {
            const optIdx = parseInt(b.dataset.i);
            state.answers[lesson.id] = optIdx;
            saveState();
            if (optIdx === lesson.quiz.answer) {
                lessonDone(lesson.id);
            }
            lessonView(modId, lessonId);
        }
    }));

    $$('[data-action="complete"]').forEach(b => b.addEventListener('click', () => {
        const container = b.closest('.lesson-view');
        const modId = container?.dataset.mod;
        const lessonId = container?.dataset.lesson;
        if (lessonId) {
            lessonDone(lessonId);
            lessonView(modId, lessonId);
        }
    }));

    $$('.code-tabs span').forEach(tab => tab.addEventListener('click', () => {
        const container = tab.closest('.lesson-view');
        container.querySelectorAll('.code-tabs span').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const lang = tab.dataset.lang;
        container.querySelectorAll('.code-block').forEach(block => {
            block.style.display = block.classList.contains(lang) ? 'block' : 'none';
        });
    }));
}

viewDashboard();
