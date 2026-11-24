/* DuoDev: protótipo jogável (passo 2).
   Carrega curso.json, mostra a trilha por unidade e roda as lições.
   Progresso (XP, ofensiva, vidas, lições concluídas) fica no localStorage deste navegador
   e, com login, é sincronizado com a nuvem por sync.js (DuoSync). */
(() => {
  'use strict';

  // ---------- Regras do jogo ----------
  const STORE_KEY = 'duodev:v1';
  const MAX_LIVES = 5;
  const LIFE_REGEN_MS = 30 * 60 * 1000; // 1 vida a cada 30 min
  const DAILY_GOAL = 20;                // XP por dia
  const PERFECT_BONUS = 5;              // XP extra por lição sem erros
  const PRACTICE_XP = 5;                // XP ao refazer lição já concluída
  const UNIT_COLORS = ['#2F5BFF', '#0B9A93', '#7A4DF0', '#D9530B', '#0A86B8', '#C92E6B', '#5F3DD6'];
  const ZIGZAG = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];
  // Revisão espaçada (caixas de Leitner). Caixa 0 = errou; cada acerto sobe uma caixa.
  // Dias até a próxima revisão por caixa. Pergunta nova acertada de primeira vai para a caixa 2 (3 dias).
  const INTERVALS = [1, 1, 3, 7, 16, 35, 90];
  const REVIEW_LIMIT = 15;  // perguntas por revisão do dia
  const REVIEW_XP = 5;      // XP base da revisão (+1 por acerto de primeira)
  const MEMORY_LEVELS = [
    { key: 'learning', label: 'Aprendendo', min: 0, max: 2, color: 'var(--streak)' },
    { key: 'firm', label: 'Firme', min: 3, max: 4, color: 'var(--accent)' },
    { key: 'mastered', label: 'Dominada', min: 5, max: 6, color: 'var(--ok)' },
  ];

  // ---------- Ícones ----------
  const I = {
    soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9.5v5h3.5L11 19V5L6.5 9.5z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.5a8 8 0 0 1 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9.5v5h3.5L11 19V5L6.5 9.5z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M15.5 9.5l5 5m0-5l-5 5"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.2c.5 3 4.9 5.6 4.9 11a5.5 5.5 0 0 1-11 0c0-2.3 1.1-4 2.4-5.2.1 1.9 1 3.1 2.1 3.3-.5-3.5.1-6.6 1.6-9.1z"/><path fill="#fff" fill-opacity=".55" d="M12 21a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.4-2.6 2.2-4.4.9 1.7 3 2.6 3 4.4A2.6 2.6 0 0 1 12 21z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 2 4 13.6h6.6L9.5 22 19 10.3h-6.6z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21.3l-1.4-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
    path: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path fill="none" stroke="currentColor" stroke-width="2.2" d="M9 4.5v13M15 6.5v13"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4.5 20.5c1.2-3.7 4-5.5 7.5-5.5s6.3 1.8 7.5 5.5"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 7v5l3 2"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6M18 3v4h-4M6 21v-4h4"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.4" fill="currentColor"/><circle cx="4.5" cy="12" r="1.4" fill="currentColor"/><circle cx="4.5" cy="18" r="1.4" fill="currentColor"/></svg>',
    layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8 22 8l-10 5.2L2 8z"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="m3.5 12.2 8.5 4.4 8.5-4.4M3.5 16.2l8.5 4.4 8.5-4.4"/></svg>',
    bug: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="14" rx="5.5" ry="6.5" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9 6.5 7.5 4M15 6.5 16.5 4M6.5 12H3M21 12h-3.5M6.8 16.5l-3 2M17.2 16.5l3 2"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/></svg>',
  };

  // ---------- Utilidades ----------
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

  const BLANK = '\u0001';
  // Markdown mínimo: `código` (inclusive ``com crase``) e **negrito**. Lacuna "___" vira o slot.
  function md(src, blankHtml = '') {
    const s = String(src).split('___').join(BLANK);
    let out = '', last = 0;
    const re = /(``?)(.+?)\1(?!`)/g;
    let m;
    while ((m = re.exec(s))) {
      out += text(s.slice(last, m.index));
      let code = m[2];
      if (m[1].length === 2) code = code.replace(/^ /, '').replace(/ $/, '');
      out += '<code>' + esc(code).split(BLANK).join(blankHtml) + '</code>';
      last = re.lastIndex;
    }
    out += text(s.slice(last));
    return out;
    function text(t) {
      return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').split(BLANK).join(blankHtml);
    }
  }

  // Realce de sintaxe simples para JS/TS/SQL/shell.
  const KW = new Set(('const let var function return if else for while of in new class extends async await import from export default ' +
    'try catch finally throw typeof instanceof this null undefined true false interface type implements public private readonly ' +
    'SELECT FROM WHERE JOIN LEFT RIGHT INNER ON GROUP BY ORDER HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX ' +
    'PRIMARY KEY REFERENCES NOT NULL AND OR AS COUNT BEGIN COMMIT ROLLBACK UNIQUE DISTINCT FOR').split(' '));
  function highlight(code) {
    const re = /(\/\/[^\n]*|--[^\n]*|#[^\n]*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += `<span class="tok-c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tok-s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tok-n">${esc(m[3])}</span>`;
      else if (m[4]) out += KW.has(m[4]) ? `<span class="tok-k">${esc(m[4])}</span>` : `<span class="tok-f">${esc(m[4])}</span>`;
      else out += KW.has(m[5]) ? `<span class="tok-k">${esc(m[5])}</span>` : esc(m[5]);
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  // ---------- Estado salvo ----------
  const freshState = () => ({
    xp: 0,
    lessons: {},                          // id -> { done, plays, perfect }
    streak: { count: 0, best: 0, last: null },
    lives: { n: MAX_LIVES, ts: Date.now() },
    days: {},                             // 'AAAA-MM-DD' -> XP do dia
    stats: { answered: 0, correct: 0 },
    srs: {},                              // id da pergunta -> { box, due, last, reps, lapses }
  });
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(freshState(), JSON.parse(raw));
    } catch (e) { /* armazenamento indisponível */ }
    return freshState();
  }
  function saveLocal() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignora */ } }
  function save() { state._updated = Date.now(); saveLocal(); Sync.queue(); }

  // Junta dois estados (este aparelho e a nuvem) sem perder progresso de nenhum lado.
  function mergeStates(a, b) {
    const A = Object.assign(freshState(), a), B = Object.assign(freshState(), b);
    const newer = (A._updated || 0) >= (B._updated || 0) ? A : B;
    const out = freshState();
    // XP total: o maior entre os dois lados e a soma do XP por dia já mesclado (cobre estudo nos dois aparelhos).
    const sumDays = (d) => Object.values(d).reduce((t, x) => t + (x || 0), 0);
    new Set([...Object.keys(A.lessons), ...Object.keys(B.lessons)]).forEach((id) => {
      const x = A.lessons[id] || {}, y = B.lessons[id] || {};
      out.lessons[id] = Object.assign({}, x, y, { done: !!(x.done || y.done), plays: Math.max(x.plays || 0, y.plays || 0), perfect: !!(x.perfect || y.perfect) });
    });
    const sa = A.streak, sb = B.streak;
    const ls = !sa.last ? sb : !sb.last ? sa : sa.last > sb.last ? sa : sb.last > sa.last ? sb : (sa.count >= sb.count ? sa : sb);
    out.streak = { count: ls.count || 0, last: ls.last || null, best: Math.max(sa.best || 0, sb.best || 0, ls.count || 0) };
    out.lives = Object.assign({}, newer.lives);
    new Set([...Object.keys(A.days), ...Object.keys(B.days)]).forEach((d) => { out.days[d] = Math.max(A.days[d] || 0, B.days[d] || 0); });
    out.xp = Math.max(A.xp || 0, B.xp || 0, sumDays(out.days));
    out.stats = Object.assign({}, (A.stats.answered || 0) >= (B.stats.answered || 0) ? A.stats : B.stats);
    new Set([...Object.keys(A.srs), ...Object.keys(B.srs)]).forEach((id) => {
      const x = A.srs[id], y = B.srs[id];
      out.srs[id] = Object.assign({}, !x ? y : !y ? x : (x.last || '') > (y.last || '') ? x : (y.last || '') > (x.last || '') ? y : (x.reps || 0) >= (y.reps || 0) ? x : y);
    });
    out._updated = Math.max(A._updated || 0, B._updated || 0);
    if (A._owner || B._owner) out._owner = A._owner || B._owner;
    return out;
  }

  function syncLives() {
    const L = state.lives, now = Date.now();
    if (L.n >= MAX_LIVES) { L.n = MAX_LIVES; L.ts = now; return; }
    const gained = Math.floor((now - L.ts) / LIFE_REGEN_MS);
    if (gained > 0) {
      L.n = Math.min(MAX_LIVES, L.n + gained);
      L.ts = L.n >= MAX_LIVES ? now : L.ts + gained * LIFE_REGEN_MS;
      save();
    }
  }
  function nextLifeIn() {
    if (state.lives.n >= MAX_LIVES) return 0;
    return Math.max(0, LIFE_REGEN_MS - (Date.now() - state.lives.ts));
  }
  function fmtWait(ms) {
    const m = Math.ceil(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`;
  }
  function loseLife() {
    if (state.lives.n >= MAX_LIVES) state.lives.ts = Date.now();
    state.lives.n = Math.max(0, state.lives.n - 1);
  }
  function streakNow() {
    const s = state.streak;
    if (!s.last) return { count: 0, today: false };
    const d = dayDiff(s.last, dayKey());
    if (d === 0) return { count: s.count, today: true };
    if (d === 1) return { count: s.count, today: false };
    return { count: 0, today: false };
  }
  function bumpStreak() {
    const s = state.streak, today = dayKey();
    if (s.last === today) return false;
    s.count = s.last && dayDiff(s.last, today) === 1 ? s.count + 1 : 1;
    s.best = Math.max(s.best, s.count);
    s.last = today;
    return true;
  }
  const todayXp = () => state.days[dayKey()] || 0;

  // ---------- Revisão espaçada ----------
  function addDays(key, n) { const d = new Date(key + 'T12:00'); d.setDate(d.getDate() + n); return dayKey(d); }
  function grade(qid, ok) {
    const c = state.srs[qid] || { box: 1, reps: 0, lapses: 0 };
    if (ok) c.box = Math.min(INTERVALS.length - 1, c.box + 1);
    else { c.box = 0; c.lapses++; }
    c.reps++;
    c.last = dayKey();
    c.due = addDays(c.last, INTERVALS[c.box]);
    state.srs[qid] = c;
  }
  function dueIds() {
    const today = dayKey();
    return Object.keys(state.srs)
      .filter((id) => qIndex[id] && state.srs[id].due <= today)
      .sort((a, b) => {
        const A = state.srs[a], B = state.srs[b];
        return A.due.localeCompare(B.due) || A.box - B.box || B.lapses - A.lapses;
      });
  }
  function nextReviewDay() {
    const ds = Object.keys(state.srs).filter((id) => qIndex[id]).map((id) => state.srs[id].due).sort();
    return ds[0] || null;
  }
  function dueOn(day) { return Object.keys(state.srs).filter((id) => qIndex[id] && state.srs[id].due === day).length; }
  function lessonDue(l) { const today = dayKey(); return l.questions.filter((q) => state.srs[q.id] && state.srs[q.id].due <= today).length; }
  function levelOf(c) { return MEMORY_LEVELS.find((m) => c.box >= m.min && c.box <= m.max); }
  function fmtDay(key) {
    const d = dayDiff(dayKey(), key);
    if (d <= 0) return 'hoje';
    if (d === 1) return 'amanhã';
    if (d < 7) return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(key + 'T12:00').getDay()];
    return `em ${d} dias`;
  }

  // ---------- Curso ----------
  let course = null;
  let flat = []; // lições básicas em ordem, com unidade
  let deepFlat = []; // lições do nível Aprofundar (fora da trilha linear)
  let byId = {}; // id da lição -> lição
  let qIndex = {}; // id da pergunta -> { q, lesson }
  let state = loadState();
  let view = 'path';
  let session = null;
  let firstPathRender = true;
  const Sync = window.DuoSync || { enabled: false, queue() {}, init() {} };

  const isDone = (id) => !!(state.lessons[id] && state.lessons[id].done);
  const currentIndex = () => { const i = flat.findIndex((l) => !isDone(l.id)); return i === -1 ? flat.length : i; };
  const isUnlocked = (i) => i <= currentIndex();
  // Aprofundar: liberado quando todas as lições básicas da unidade estão concluídas.
  const unitBasicsDone = (ui) => course.units[ui].lessons.every((l) => isDone(l.id));
  const lessonUnlocked = (l) => (l.deep ? unitBasicsDone(l.unitIndex) : isUnlocked(l.index));

  // ---------- Sons ----------
  const Snd = window.DuoSound || { play() {}, enabled: false, toggle() { return false; } };
  const sfx = (name, delay) => Snd.play(name, delay);
  function soundBtnHtml(cls = 'icon-btn') {
    const on = Snd.enabled;
    return `<button class="${cls} sound-btn ${on ? '' : 'muted'}" data-action="sound" aria-pressed="${on}" aria-label="${on ? 'Desligar sons' : 'Ligar sons'}" title="${on ? 'Sons ligados' : 'Sons desligados'}">${on ? I.soundOn : I.soundOff}${cls === 'icon-btn' ? '' : `<span>${on ? 'Sons ligados' : 'Sons desligados'}</span>`}</button>`;
  }

  // ---------- Pedaços de UI ----------
  function statsHtml() {
    syncLives();
    const st = streakNow();
    const lives = state.lives.n;
    const wait = nextLifeIn();
    return `<div class="stats js-stats">
      <button class="stat streak ${st.today ? '' : 'off'}" data-action="go" data-view="profile" title="Ofensiva: ${st.count} ${st.count === 1 ? 'dia' : 'dias'}${st.today ? '' : ' (estude hoje para manter)'}">${I.flame}${st.count}</button>
      <button class="stat xp" data-action="go" data-view="profile" title="${state.xp} XP no total">${I.bolt}${state.xp}</button>
      <button class="stat lives" data-action="lives" title="${lives} de ${MAX_LIVES} vidas${wait ? ` · próxima em ${fmtWait(wait)}` : ''}">${I.heart}${lives}</button>
    </div>`;
  }
  function goalHtml() {
    const xp = todayXp(), pct = Math.min(100, Math.round((xp / DAILY_GOAL) * 100));
    return `<div class="goal-row">${I.target}<div>
      <strong>${xp >= DAILY_GOAL ? 'Meta do dia batida' : 'Meta do dia'}</strong>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <span class="bar-label">${Math.min(xp, DAILY_GOAL)} / ${DAILY_GOAL} XP</span></div></div>`;
  }
  function reviewCardHtml() {
    if (!Object.keys(state.srs).length) return '';
    const due = dueIds().length;
    if (due) {
      const n = Math.min(due, REVIEW_LIMIT);
      return `<section class="review-card due">
        <div class="review-icon">${I.repeat}</div>
        <div class="review-txt"><strong>Revisão do dia</strong>
          <span>${due} ${due === 1 ? 'pergunta pede' : 'perguntas pedem'} revisão${due > REVIEW_LIMIT ? ` (${n} nesta rodada)` : ''}. Não gasta vidas.</span></div>
        <button class="btn" data-action="review">Revisar</button>
      </section>`;
    }
    const next = nextReviewDay();
    return `<section class="review-card">
      <div class="review-icon">${I.check}</div>
      <div class="review-txt"><strong>Revisão em dia</strong>
        <span>${next ? `Próxima revisão ${fmtDay(next)}: ${dueOn(next)} ${dueOn(next) === 1 ? 'pergunta' : 'perguntas'}.` : 'Nada agendado.'}</span></div>
    </section>`;
  }
  function livesPanelHtml() {
    const n = state.lives.n, wait = nextLifeIn();
    return `<div class="hearts" aria-label="${n} de ${MAX_LIVES} vidas">${Array.from({ length: MAX_LIVES }, (_, i) => I.heart.replace('<svg', `<svg class="${i < n ? '' : 'empty'}"`)).join('')}</div>
      <p>${n >= MAX_LIVES ? 'Vidas cheias. Cada erro em lição nova custa uma.' : `Próxima vida em ${fmtWait(wait)}. Revisar ou refazer uma lição concluída devolve 1 vida.`}</p>`;
  }
  function navHtml(where) {
    const b = (v, icon, label) => `<button class="nav-btn" data-action="go" data-view="${v}" ${view === v ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
    return b('path', I.path, 'Trilha') + b('profile', I.user, 'Progresso');
  }
  function shell(mainHtml) {
    return `<div class="topbar">${statsHtml()}</div>
    <div class="shell">
      <nav class="rail" aria-label="Navegação">
        <a class="brand" href="#" data-action="go" data-view="path"><span class="brand-mark">{ }</span><span class="brand-name">DuoDev</span></a>
        ${navHtml()}
      </nav>
      <main class="main">${mainHtml}</main>
      <aside class="side">
        ${statsHtml()}
        ${accountHtml('side')}
        <section class="panel">${goalHtml()}</section>
        <section class="panel"><h3>Vidas</h3>${livesPanelHtml()}</section>
        <section class="panel"><h3>${esc(course.title)}</h3><p>${flat.filter((l) => isDone(l.id)).length} de ${flat.length} lições concluídas em ${course.units.length} unidades.${deepFlat.length ? ` Aprofundar: ${deepFlat.filter((l) => isDone(l.id)).length} de ${deepFlat.length}.` : ''}</p></section>
      </aside>
    </div>
    <nav class="tabbar" aria-label="Navegação">${navHtml()}</nav>`;
  }

  // ---------- Trilha ----------
  function renderPath() {
    const cur = currentIndex();
    let gi = 0;
    const units = course.units.map((u, ui) => {
      const color = UNIT_COLORS[ui % UNIT_COLORS.length];
      const done = u.lessons.filter((l) => isDone(l.id)).length;
      const nodes = u.lessons.map((l, li) => {
        const i = gi++;
        const st = isDone(l.id) ? 'done' : i === cur ? 'current' : 'locked';
        const k = ZIGZAG[li % ZIGZAG.length];
        const icon = st === 'done' ? I.check : st === 'current' ? I.star : I.lock;
        const perfect = st === 'done' && state.lessons[l.id].perfect;
        const due = st === 'done' ? lessonDue(l) : 0;
        return `<div class="node-wrap ${st}" style="transform:translateX(calc(${k} * min(78px, 17vw)))">
          ${st === 'current' ? `<div class="start-tip">${i === 0 && !state.xp ? 'Começar' : 'Próxima'}</div>` : ''}
          <button class="node ${st}" data-action="lesson-info" data-id="${l.id}" aria-label="${esc(l.title)}${st === 'locked' ? ' (bloqueada)' : st === 'done' ? ' (concluída)' : ''}">${icon}
            ${perfect ? `<span class="badge-perfect" title="Sem erros">${I.star}</span>` : ''}
            ${due ? `<span class="badge-due" title="${due} para revisar">${due}</span>` : ''}</button>
          <div class="node-label">${esc(l.title)}</div>
        </div>`;
      }).join('');
      return `<section class="unit" style="--unit:${color}">
        <header class="unit-banner"><div>
          <div class="unit-eyebrow">Unidade ${ui + 1}</div>
          <h2>${esc(u.title)}</h2>
          <p>${esc(u.description)}</p></div>
          <span class="unit-count">${done}/${u.lessons.length}</span>
        </header>
        ${nodes}
        ${deepHtml(ui)}
      </section>`;
    }).join('');
    const allDone = cur >= flat.length;
    $app.innerHTML = shell(`
      ${accountHtml('path')}
      ${reviewCardHtml()}
      <section class="panel mobile-goal">${goalHtml()}</section>
      ${allDone ? '<section class="panel" style="margin-bottom:24px"><h3>Trilha concluída</h3><p>Você terminou todas as lições. Refaça qualquer uma para praticar e ganhar XP.</p></section>' : ''}
      ${units}`);
    if (firstPathRender) {
      firstPathRender = false;
      const n = $app.querySelector('.node.current');
      if (n && cur > 0 && !dueIds().length) requestAnimationFrame(() => n.scrollIntoView({ block: 'center' }));
    }
  }

  const DEEP_KINDS = [['scenario', 'Cenários'], ['find_bug', 'Encontre o bug'], ['order', 'Ordenar passos'], ['tradeoff', 'Trade-offs']];
  function deepHtml(ui) {
    const u = course.units[ui];
    if (!u.deep || !u.deep.length) return '';
    const open = unitBasicsDone(ui);
    const doneN = u.deep.filter((l) => isDone(l.id)).length;
    const rows = u.deep.map((l) => {
      const st = !open ? 'locked' : isDone(l.id) ? 'done' : 'open';
      const due = st === 'done' ? lessonDue(l) : 0;
      const perfect = st === 'done' && state.lessons[l.id].perfect;
      return `<button class="deep-row ${st}" data-action="lesson-info" data-id="${l.id}" aria-label="${esc(l.title)}${st === 'locked' ? ' (bloqueada)' : st === 'done' ? ' (concluída)' : ''}">
        <span class="deep-ic">${st === 'locked' ? I.lock : st === 'done' ? I.check : I.layers}</span>
        <span class="deep-txt"><strong>${esc(l.title)}</strong><small>${l.questions.length} desafios${perfect ? ' · sem erros' : ''}${due ? ` · <b>${due} para revisar</b>` : ''}</small></span>
        <span class="deep-go">${st === 'locked' ? '' : st === 'done' ? 'Praticar' : 'Começar'}</span>
      </button>`;
    }).join('');
    return `<div class="deep ${open ? 'open' : 'locked'}">
      <header class="deep-head"><span class="deep-badge">${I.layers}Aprofundar</span><span class="deep-count">${doneN}/${u.deep.length}</span></header>
      <p class="deep-sub">${open ? 'Aplique o que aprendeu: ' : 'Conclua as lições desta unidade para liberar: '}${DEEP_KINDS.map((k) => k[1].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' e $1')}.</p>
      ${rows}
    </div>`;
  }

  function lessonInfo(id) {
    const l = byId[id];
    if (!l) return;
    const done = isDone(l.id);
    const unlocked = lessonUnlocked(l);
    syncLives();
    const noLives = !done && state.lives.n <= 0;
    let action;
    if (!unlocked && l.deep) action = `<p>Conclua as ${course.units[l.unitIndex].lessons.length} lições de <strong>${esc(l.unitTitle)}</strong> para liberar o Aprofundar desta unidade. Faltam ${course.units[l.unitIndex].lessons.filter((x) => !isDone(x.id)).length}.</p><div class="actions"><button class="btn ghost block" data-action="close-modal">Entendi</button></div>`;
    else if (!unlocked) action = `<p>Conclua <strong>${esc(flat[currentIndex()].title)}</strong> para liberar esta lição.</p><div class="actions"><button class="btn ghost block" data-action="close-modal">Entendi</button></div>`;
    else if (noLives) action = `<p>Você está sem vidas. A próxima chega em ${fmtWait(nextLifeIn())}${flat.some((x) => isDone(x.id)) ? ', ou refaça uma lição concluída para ganhar 1 vida agora' : ''}.</p><div class="actions"><button class="btn ghost block" data-action="close-modal">Voltar</button></div>`;
    else action = `<div class="actions"><button class="btn block" data-action="start" data-id="${l.id}">${done ? `${I.repeat} Praticar +${PRACTICE_XP} XP` : `Começar +${l.xp} XP`}</button>
      <button class="link-btn" data-action="close-modal">Agora não</button></div>`;
    const kinds = l.deep ? DEEP_KINDS.map(([t, label]) => [label, l.questions.filter((q) => q.type === t).length]).filter((k) => k[1]) : [];
    openModal(`<div class="unit-eyebrow" style="color:${l.color}">Unidade ${l.unitIndex + 1} · ${esc(l.unitTitle)}${l.deep ? ' · Aprofundar' : ''}</div>
      <h2>${esc(l.title)}</h2>
      ${l.deep ? `<div class="chips">${kinds.map(([label, n]) => `<span class="chip deep-chip">${n}× ${esc(label)}</span>`).join('')}</div>` : ''}
      <div class="chips">${l.concepts.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      <div class="meta-row"><span>${I.list}${l.questions.length} ${l.deep ? 'desafios' : 'perguntas'}</span><span>${I.clock}${Math.max(2, Math.round(l.questions.length * (l.deep ? 0.8 : 0.4)))} min</span>${done ? `<span>${I.check}Concluída</span>` : ''}</div>
      ${memoryLine(l)}
      ${done && unlocked ? '<p>Praticar não custa vidas e devolve 1 vida no final.</p>' : ''}
      ${action}`);
  }

  function memoryLine(l) {
    const seen = l.questions.filter((q) => state.srs[q.id]);
    if (!seen.length) return '';
    const counts = MEMORY_LEVELS.map((m) => seen.filter((q) => levelOf(state.srs[q.id]) === m).length);
    const due = lessonDue(l);
    return `<div class="mem-mini">${memBar(counts, l.questions.length - seen.length)}
      <span>${MEMORY_LEVELS.map((m, k) => counts[k] ? `${counts[k]} ${m.label.toLowerCase()}` : '').filter(Boolean).join(' · ')}${due ? ` · <b>${due} para revisar hoje</b>` : ''}</span></div>`;
  }
  function memBar(counts, unseen) {
    const total = counts.reduce((a, b) => a + b, 0) + unseen;
    return `<div class="mem-bar">${MEMORY_LEVELS.map((m, k) => counts[k] ? `<i style="flex:${counts[k]};background:${m.color}" title="${m.label}: ${counts[k]}"></i>` : '').join('')}${unseen ? `<i style="flex:${unseen}" class="unseen" title="Não vistas: ${unseen}"></i>` : ''}</div>`;
  }

  // ---------- Progresso ----------
  function renderProfile() {
    const st = streakNow();
    const doneCount = flat.filter((l) => isDone(l.id)).length;
    const acc = state.stats.answered ? Math.round((state.stats.correct / state.stats.answered) * 100) : 0;
    const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); return d; });
    const vals = days.map((d) => state.days[dayKey(d)] || 0);
    const max = Math.max(DAILY_GOAL, ...vals);
    const wd = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const week = days.map((d, k) => `<div class="week-col ${vals[k] ? '' : 'zero'}"><em>${vals[k] || ''}</em><i style="height:${Math.max(4, (vals[k] / max) * 90)}px"></i><span>${k === 6 ? 'hoje' : wd[d.getDay()]}</span></div>`).join('');
    const units = course.units.map((u, ui) => {
      const done = u.lessons.filter((l) => isDone(l.id)).length;
      const deep = u.deep || [];
      const deepDone = deep.filter((l) => isDone(l.id)).length;
      return `<div class="unit-row" style="--unit:${UNIT_COLORS[ui % UNIT_COLORS.length]}"><strong>${ui + 1}. ${esc(u.title)}</strong><small>${done}/${u.lessons.length}${deep.length ? ` · ${I.layers}${deepDone}/${deep.length}` : ''}</small><div class="bar"><i style="width:${(done / u.lessons.length) * 100}%"></i></div></div>`;
    }).join('');
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    $app.innerHTML = shell(`
      <div class="page-head"><h1>Seu progresso</h1><p>${!Sync.enabled ? 'Salvo neste navegador. Em outro aparelho o progresso começa do zero.' : Sync.user ? 'Salvo na sua conta e neste aparelho.' : 'Salvo só neste navegador. Entre para levar para outros aparelhos.'}</p></div>
      ${accountHtml('profile')}
      <div class="stat-grid">
        <div class="stat-card" style="color:var(--streak)">${I.flame}<div><b>${st.count}</b><small>${st.count === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}</small></div></div>
        <div class="stat-card" style="color:var(--xp)">${I.bolt}<div><b>${state.xp}</b><small>XP no total</small></div></div>
        <div class="stat-card" style="color:var(--accent)">${I.check}<div><b>${doneCount}/${flat.length}</b><small>lições concluídas</small></div></div>
        <div class="stat-card" style="color:var(--ok)">${I.target}<div><b>${state.stats.answered ? acc + '%' : '–'}</b><small>de acertos (${state.stats.answered} respostas)</small></div></div>
      </div>
      <h2 class="section-title">XP nos últimos 7 dias</h2>
      <div class="week" role="img" aria-label="XP por dia nos últimos 7 dias">${week}</div>
      ${memorySectionHtml()}
      <h2 class="section-title">Unidades</h2>
      <div class="unit-list">${units}</div>
      <h2 class="section-title">Aplicativo</h2>
      <div class="danger-zone">
        ${soundBtnHtml('btn ghost')}
        ${deferredInstall ? `<button class="btn" data-action="install">${I.download} Instalar app</button>` : ''}
        ${!deferredInstall && !standalone ? `<p style="margin:0;color:var(--muted);flex-basis:100%">${ios ? 'No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : 'Para instalar, use “Instalar app” ou “Adicionar à tela inicial” no menu do navegador.'}</p>` : ''}
        <button class="btn ghost" data-action="reset">Apagar progresso</button>
      </div>
      <p style="color:var(--muted);font-size:14px;margin-top:20px">Melhor ofensiva: ${state.streak.best} ${state.streak.best === 1 ? 'dia' : 'dias'}.</p>`);
  }

  function memorySectionHtml() {
    const ids = Object.keys(state.srs).filter((id) => qIndex[id]);
    const total = Object.keys(qIndex).length;
    const counts = MEMORY_LEVELS.map((m) => ids.filter((id) => levelOf(state.srs[id]) === m).length);
    const legend = MEMORY_LEVELS.map((m, k) => `<span><i style="background:${m.color}"></i>${m.label} <b>${counts[k]}</b></span>`).join('') +
      `<span><i class="unseen"></i>Não vistas <b>${total - ids.length}</b></span>`;
    const today = dayKey();
    const days = Array.from({ length: 7 }, (_, k) => addDays(today, k));
    const vals = days.map((d, k) => k === 0 ? dueIds().length : dueOn(d));
    const max = Math.max(5, ...vals);
    const wd = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const forecast = days.map((d, k) => `<div class="week-col ${vals[k] ? '' : 'zero'}"><em>${vals[k] || ''}</em><i style="height:${Math.max(4, (vals[k] / max) * 90)}px${vals[k] ? ';background:var(--streak)' : ''}"></i><span>${k === 0 ? 'hoje' : wd[new Date(d + 'T12:00').getDay()]}</span></div>`).join('');
    const hard = ids.filter((id) => state.srs[id].lapses > 0)
      .sort((a, b) => state.srs[b].lapses - state.srs[a].lapses || state.srs[a].box - state.srs[b].box).slice(0, 5);
    const hardHtml = hard.length ? `<h2 class="section-title">Mais difíceis para você</h2><ol class="hard-list">${hard.map((id) => {
      const { q, lesson } = qIndex[id]; const c = state.srs[id];
      return `<li><div class="hard-q">${md(qSummary(q), '<b>___</b>')}</div><small>${esc(lesson.title)} · errou ${c.lapses}× · revisão ${fmtDay(c.due)}</small></li>`;
    }).join('')}</ol>` : '';
    return `<h2 class="section-title">Memória</h2>
      <div class="mem-card">${memBar(counts, total - ids.length)}<div class="mem-legend">${legend}</div>
      <p>Cada acerto adia a próxima revisão daquela pergunta (1, 3, 7, 16, 35 e 90 dias). Um erro faz ela voltar no dia seguinte.</p></div>
      <h2 class="section-title">Revisões nos próximos 7 dias</h2>
      <div class="week" role="img" aria-label="Perguntas para revisar por dia">${forecast}</div>
      ${hardHtml}`;
  }

  // ---------- Lição ----------
  const CHOICE = new Set(['multiple_choice', 'scenario', 'tradeoff']);
  function prep(q) {
    const p = { q };
    if (CHOICE.has(q.type)) {
      const order = shuffle(q.options.map((_, i) => i));
      p.opts = order.map((i) => q.options[i]);
      p.correct = order.indexOf(q.answer);
    } else if (q.type === 'fill_blank') {
      p.bank = shuffle(q.options);
      p.typing = false;
    } else if (q.type === 'find_bug') {
      p.lines = q.code.split('\n');
      p.okLines = [q.answer, ...(q.accept || [])];
    } else if (q.type === 'order') {
      const idx = q.items.map((_, i) => i);
      do { p.pool = shuffle(idx); } while (idx.length > 1 && p.pool.every((v, k) => v === k));
    }
    return p;
  }
  function startLesson(id) {
    closeModal();
    syncLives();
    const l = byId[id];
    if (!l || !lessonUnlocked(l)) return;
    const practice = isDone(l.id);
    if (!practice && state.lives.n <= 0) { lessonInfo(id); return; }
    session = {
      l, practice, total: l.questions.length, solved: 0, mistakes: 0, start: Date.now(),
      queue: l.questions.map(prep), cur: null, answer: null, checked: false, correct: false, firstTry: 0,
    };
    view = 'lesson';
    nextQuestion();
  }
  function startReview() {
    closeModal();
    const ids = dueIds().slice(0, REVIEW_LIMIT);
    if (!ids.length) { render(); return; }
    // Intercala lições para não ficar em bloco.
    const items = shuffle(ids).map((id) => { const p = prep(qIndex[id].q); p.from = qIndex[id].lesson.title; return p; });
    session = {
      l: { id: 'review', title: 'Revisão do dia', xp: REVIEW_XP }, practice: true, review: true,
      total: items.length, solved: 0, mistakes: 0, firstTry: 0, start: Date.now(),
      queue: items, cur: null, answer: null, checked: false, correct: false,
    };
    view = 'lesson';
    nextQuestion();
  }
  function nextQuestion() {
    if (!session.practice && state.lives.n <= 0) { renderOutOfLives(); return; }
    if (!session.queue.length) { finishLesson(); return; }
    session.cur = session.queue.shift();
    session.answer = session.cur.q.type === 'order' ? [] : null;
    session.checked = false;
    renderLesson();
    window.scrollTo(0, 0);
  }
  const KIND = {
    multiple_choice: 'Escolha a resposta certa', true_false: 'Verdadeiro ou falso?', fill_blank: 'Complete a lacuna',
    scenario: 'Cenário prático', find_bug: 'Encontre o bug', order: 'Coloque na ordem', tradeoff: 'Trade-off',
  };
  const DEEP_TYPES = new Set(['scenario', 'find_bug', 'order', 'tradeoff']);
  const isReady = () => {
    const s = session, a = s.answer;
    if (s.cur.q.type === 'order') return Array.isArray(a) && a.length === s.cur.q.items.length;
    return a != null && a !== '';
  };
  const qSummary = (q) => q.context || q.prompt;

  function renderLesson() {
    const s = session, p = s.cur, q = p.q;
    const pct = (s.solved / s.total) * 100;
    let body = '';
    if (CHOICE.has(q.type)) {
      body = `<div class="options" role="listbox">${p.opts.map((o, k) => {
        let cls = '';
        if (s.checked) cls = k === p.correct ? 'right' : k === s.answer ? 'wrong' : '';
        else if (k === s.answer) cls = 'sel';
        return `<button class="opt ${cls}" data-action="answer" data-v="${k}" ${s.checked ? 'disabled' : ''} role="option" aria-selected="${k === s.answer}"><span class="key">${k + 1}</span><span class="txt">${md(o)}</span></button>`;
      }).join('')}</div>`;
    } else if (q.type === 'true_false') {
      body = `<div class="options tf">${[true, false].map((v, k) => {
        let cls = '';
        if (s.checked) cls = v === q.answer ? 'right' : v === s.answer ? 'wrong' : '';
        else if (v === s.answer) cls = 'sel';
        return `<button class="opt ${cls}" data-action="answer" data-v="${v}" ${s.checked ? 'disabled' : ''}><span class="key">${k + 1}</span>${v ? 'Verdadeiro' : 'Falso'}</button>`;
      }).join('')}</div>`;
    } else if (q.type === 'find_bug') {
      body = `<div class="bug-code" role="listbox" aria-label="Linhas do código">${p.lines.map((ln, k) => {
        if (!ln.trim()) return `<div class="code-line empty"><span class="ln">${k + 1}</span></div>`;
        let cls = '';
        if (s.checked) cls = p.okLines.includes(k) ? (k === q.answer || k === s.answer ? 'right' : '') : k === s.answer ? 'wrong' : '';
        else if (k === s.answer) cls = 'sel';
        return `<button class="code-line ${cls}" data-action="answer" data-v="${k}" ${s.checked ? 'disabled' : ''} role="option" aria-selected="${k === s.answer}" aria-label="Linha ${k + 1}"><span class="ln">${k + 1}</span><code>${highlight(ln)}</code></button>`;
      }).join('')}</div>`;
    } else if (q.type === 'order') {
      const placed = s.answer || [];
      const left = p.pool.filter((v) => !placed.includes(v));
      const slots = q.items.map((_, k) => {
        const v = placed[k];
        if (v == null) return `<li class="slot empty"><span class="key">${k + 1}</span></li>`;
        const cls = s.checked ? (v === k ? 'right' : 'wrong') : 'placed';
        return `<li class="slot"><button class="step ${cls}" data-action="answer" data-v="${v}" ${s.checked ? 'disabled' : ''} title="Tirar da sequência"><span class="key">${k + 1}</span><span class="txt">${md(q.items[v])}</span></button></li>`;
      }).join('');
      body = `<ol class="order-slots" aria-label="Sua sequência">${slots}</ol>
        ${left.length ? `<div class="order-pool" aria-label="Passos disponíveis">${left.map((v, k) => `<button class="step" data-action="answer" data-v="${v}"><span class="key">${k + 1}</span><span class="txt">${md(q.items[v])}</span></button>`).join('')}</div>` : ''}
        ${placed.length && !s.checked ? '<button class="link-btn type-toggle" data-action="order-reset">Recomeçar a ordem</button>' : ''}`;
    }
    let prompt;
    if (q.type === 'fill_blank') {
      const filled = s.answer != null && s.answer !== '';
      const state2 = s.checked ? (s.correct ? 'right' : 'wrong') : '';
      const slot = p.typing
        ? `<span class="blank ${state2}">${filled ? esc(s.answer) : '&nbsp;'}</span>`
        : `<span class="blank ${filled ? 'filled' : ''} ${state2}" ${filled && !s.checked ? 'data-action="clear-blank" role="button" tabindex="0" title="Tirar palavra"' : ''}>${filled ? esc(s.answer) : '&nbsp;'}</span>`;
      prompt = md(q.prompt, slot);
      body = p.typing
        ? `<input id="type-answer" class="type-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a resposta" value="${esc(s.answer || '')}" ${s.checked ? 'disabled' : ''}>`
        : `<div class="bank">${p.bank.map((w, k) => `<button class="word ${w === s.answer ? 'used' : ''}" data-action="answer" data-v="${esc(w)}" ${s.checked ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`;
      if (!s.checked) body += `<button class="link-btn type-toggle" data-action="toggle-typing">${p.typing ? 'Usar banco de palavras' : 'Prefiro digitar'}</button>`;
    } else {
      prompt = md(q.prompt);
    }
    const retry = p.retry ? '<span class="retry">· de novo</span>' : p.from ? `<span class="from">· ${esc(p.from)}</span>` : '';
    const lives = s.practice
      ? `<span class="lesson-lives practice">${s.review ? 'Revisão' : 'Prática'}</span>`
      : `<span class="lesson-lives" title="Vidas">${I.heart}${state.lives.n}</span>`;

    let foot;
    if (!s.checked) {
      const ready = isReady();
      foot = `<div class="foot"><div class="foot-inner">
        <button class="btn" id="check-btn" data-action="check" ${ready ? '' : 'disabled'}>Verificar</button></div></div>`;
    } else {
      const ok = s.correct;
      let ans = '';
      if (!ok) {
        if (q.type === 'order') ans = `<div class="fb-answer">Ordem certa:</div><ol class="fb-order">${q.items.map((it) => `<li>${md(it)}</li>`).join('')}</ol>`;
        else if (q.type === 'find_bug') ans = `<div class="fb-answer">O bug está na linha ${q.answer + 1}.</div>`;
        else {
          const right = CHOICE.has(q.type) ? md(p.opts[p.correct]) : q.type === 'true_false' ? (q.answer ? 'Verdadeiro' : 'Falso') : md('`' + q.answer + '`');
          ans = `<div class="fb-answer">Resposta certa: ${right}</div>`;
        }
      }
      if (q.fix) ans += `<div class="fb-fix"><span>Correção</span><pre class="code"><code>${highlight(q.fix)}</code></pre></div>`;
      foot = `<div class="foot ${ok ? 'ok' : 'bad'}"><div class="foot-inner" style="flex-wrap:wrap">
        <div class="feedback" role="status"><div class="fb-icon">${ok ? I.check : I.x}</div><div style="min-width:0">
          <div class="fb-title">${ok ? pick(['Mandou bem!', 'Isso aí!', 'Correto!', 'Na mosca!', 'Perfeito!']) : 'Não foi dessa vez'}</div>
          ${ans}<div class="fb-expl">${md(q.explanation)}</div></div></div>
        <button class="btn ${ok ? 'ok' : 'bad'}" id="continue-btn" data-action="continue">Continuar</button></div></div>`;
    }

    $app.innerHTML = `<div class="lesson">
      <div class="lesson-top">
        <button class="icon-btn" data-action="quit" aria-label="Sair da lição">${I.x}</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${s.total}" aria-valuenow="${s.solved}"><i style="width:${pct}%"></i></div>
        ${soundBtnHtml()}
        ${lives}
      </div>
      <div class="q">
        <div class="q-kind ${DEEP_TYPES.has(q.type) ? 'deep-kind' : ''}">${q.type === 'find_bug' ? I.bug : ''}${KIND[q.type]} ${retry}</div>
        ${q.context ? `<div class="scenario"><span class="scenario-tag">Situação</span><p>${md(q.context)}</p></div>` : ''}
        ${q.compare ? `<div class="versus"><span>${md(q.compare[0])}</span><b>vs</b><span>${md(q.compare[1])}</span></div>` : ''}
        <p class="q-prompt ${q.context || q.compare ? 'small' : ''}">${prompt}</p>
        ${q.code && q.type !== 'find_bug' ? `<pre class="code"><code>${highlight(q.code)}</code></pre>` : ''}
        ${body}
      </div>
      ${foot}
    </div>`;
    if (s.checked) document.getElementById('continue-btn')?.focus({ preventScroll: true });
    else if (p.typing) { const inp = document.getElementById('type-answer'); inp && inp.focus({ preventScroll: true }); }
  }

  function setAnswer(v) {
    const s = session; if (!s || s.checked) return;
    const q = s.cur.q;
    if (CHOICE.has(q.type) || q.type === 'find_bug') s.answer = Number(v);
    else if (q.type === 'order') {
      const n = Number(v), a = s.answer || [];
      s.answer = a.includes(n) ? a.filter((x) => x !== n) : a.concat(n);
    } else if (q.type === 'true_false') s.answer = v === true || v === 'true';
    else s.answer = s.answer === v ? null : v;
    sfx('tap');
    renderLesson();
  }
  function check() {
    const s = session; if (!s || s.checked || !isReady()) return;
    const p = s.cur, q = p.q;
    let ok;
    if (CHOICE.has(q.type)) ok = s.answer === p.correct;
    else if (q.type === 'find_bug') ok = p.okLines.includes(s.answer);
    else if (q.type === 'order') ok = s.answer.every((v, k) => v === k);
    else if (q.type === 'true_false') ok = s.answer === q.answer;
    else {
      const accepted = [q.answer, ...(q.accept || [])].map(norm);
      ok = accepted.includes(norm(s.answer));
    }
    s.checked = true;
    s.correct = ok;
    state.stats.answered++;
    if (!p.retry) grade(q.id, ok);
    sfx(ok ? 'correct' : 'wrong');
    if (ok) { s.solved++; state.stats.correct++; if (!p.retry) s.firstTry++; }
    else {
      s.mistakes++;
      if (!s.practice) loseLife();
      const again = prep(q); again.retry = true;
      s.queue.push(again);
    }
    save();
    renderLesson();
  }
  function finishLesson() {
    const s = session, l = s.l;
    const perfect = s.mistakes === 0;
    const xp = s.review ? REVIEW_XP + s.firstTry : s.practice ? PRACTICE_XP : l.xp + (perfect ? PERFECT_BONUS : 0);
    if (!s.review) {
      const prev = state.lessons[l.id] || { done: false, plays: 0, perfect: false };
      state.lessons[l.id] = { done: true, plays: prev.plays + 1, perfect: prev.perfect || perfect };
    }
    state.xp += xp;
    const today = dayKey();
    const before = todayXp();
    state.days[today] = before + xp;
    const newStreakDay = bumpStreak();
    let lifeBack = false;
    if (s.practice) { syncLives(); if (state.lives.n < MAX_LIVES) { state.lives.n++; lifeBack = true; if (state.lives.n >= MAX_LIVES) state.lives.ts = Date.now(); } }
    save();
    const secs = Math.round((Date.now() - s.start) / 1000);
    const acc = Math.round((s.total / (s.total + s.mistakes)) * 100);
    const goalJustHit = before < DAILY_GOAL && state.days[today] >= DAILY_GOAL;
    const sub = [
      newStreakDay ? `Ofensiva de ${state.streak.count} ${state.streak.count === 1 ? 'dia' : 'dias'}.` : '',
      goalJustHit ? 'Meta do dia batida.' : '',
      lifeBack ? 'Você recuperou 1 vida.' : '',
    ].filter(Boolean).join(' ');
    const left = s.review ? dueIds().length : 0;
    const nextRev = s.review && !left ? nextReviewDay() : null;
    const reviewNote = s.review ? `<p>${left ? `Ainda ${left === 1 ? 'falta 1 pergunta' : `faltam ${left} perguntas`} para revisar hoje.` : nextRev ? `Revisão em dia. A próxima é ${fmtDay(nextRev)}.` : ''}</p>` : '';
    sfx(perfect ? 'perfect' : 'complete');
    if (newStreakDay) sfx('streak', 1.25);
    else if (goalJustHit) sfx('goal', 1.25);
    view = 'result';
    $app.innerHTML = `<div class="result">
      <div class="result-mark">${perfect ? I.star : I.check}</div>
      <h1>${s.review ? (perfect ? 'Revisão perfeita!' : 'Revisão concluída!') : perfect ? 'Lição perfeita!' : s.practice ? 'Prática concluída!' : 'Lição concluída!'}</h1>
      <p>${esc(l.title)}${sub ? ' · ' + esc(sub) : ''}</p>
      ${reviewNote}
      <div class="tiles">
        <div class="tile" style="--t:var(--xp)"><b>XP</b><span>${I.bolt}+${xp}</span></div>
        <div class="tile" style="--t:var(--ok)"><b>Acertos</b><span>${I.target}${acc}%</span></div>
        <div class="tile" style="--t:var(--accent)"><b>Tempo</b><span>${I.clock}${Math.floor(secs / 60)}:${pad(secs % 60)}</span></div>
      </div>
      <div class="actions">${left ? `<button class="btn block" id="continue-btn" data-action="review">Revisar mais ${Math.min(left, REVIEW_LIMIT)}</button><button class="link-btn" data-action="go" data-view="path">Voltar à trilha</button>` : '<button class="btn block" id="continue-btn" data-action="go" data-view="path">Continuar</button>'}</div>
    </div>`;
    session = null;
    document.getElementById('continue-btn')?.focus({ preventScroll: true });
  }
  function renderOutOfLives() {
    sfx('fail');
    view = 'result';
    const l = session.l;
    session = null;
    const canPractice = flat.some((x) => isDone(x.id));
    $app.innerHTML = `<div class="result">
      <div class="result-mark fail">${I.heart}</div>
      <h1>Suas vidas acabaram</h1>
      <p>O progresso em <strong>${esc(l.title)}</strong> não foi salvo. A próxima vida chega em ${fmtWait(nextLifeIn())}.${canPractice ? ' A revisão do dia e refazer uma lição concluída não gastam vidas e devolvem 1.' : ''}</p>
      <div class="actions"><button class="btn block" id="continue-btn" data-action="go" data-view="path">Voltar à trilha</button></div>
    </div>`;
    document.getElementById('continue-btn')?.focus({ preventScroll: true });
  }

  // ---------- Modal ----------
  function openModal(html) {
    $modal.innerHTML = `<div class="modal-backdrop" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const f = $modal.querySelector('.btn, button');
    f && f.focus({ preventScroll: true });
  }
  function closeModal() { $modal.innerHTML = ''; }

  // ---------- Conta e sincronização ----------
  function syncLabel() {
    if (!Sync.user) return '';
    const st = Sync.status;
    if (st === 'syncing') return 'Sincronizando…';
    if (st === 'offline') return 'Sem internet. O progresso fica salvo aqui e sobe quando a conexão voltar.';
    if (st === 'error') return 'Não deu para sincronizar agora. Vamos tentar de novo.';
    if (Sync.lastSync) {
      const d = new Date(Sync.lastSync);
      return `Sincronizado às ${pad(d.getHours())}:${pad(d.getMinutes())}.`;
    }
    return 'Conectado.';
  }
  // Bloco de conta: painel lateral (desktop), página de progresso e cartão na trilha (celular).
  function accountHtml(where) {
    if (!Sync.enabled) return '';
    const empty = `<div class="js-account" data-where="${where}" hidden></div>`; // lugar guardado para quando a sessão carregar
    if (!Sync.ready) return empty;
    if (Sync.user) {
      if (where === 'path') return empty;
      const email = esc(Sync.user.email || 'sua conta');
      const status = `<p class="sync-status ${Sync.status}"><i></i>${esc(syncLabel())}</p>`;
      if (where === 'side') return `<section class="panel account js-account" data-where="side"><h3>Conta</h3><p class="account-email">${email}</p>${status}</section>`;
      return `<div class="account-card js-account" data-where="profile">
        <div class="account-avatar">${esc((Sync.user.email || '?')[0].toUpperCase())}</div>
        <div class="account-txt"><strong>${email}</strong>${status}</div>
        <div class="account-actions"><button class="btn ghost" data-action="sync-now" ${Sync.status === 'syncing' ? 'disabled' : ''}>${I.repeat} Sincronizar</button>
        <button class="link-btn" data-action="logout">Sair</button></div></div>`;
    }
    const body = 'Entre para salvar o progresso na nuvem e continuar de onde parou no PC e no celular.';
    if (where === 'side') return `<section class="panel account js-account" data-where="side"><h3>Sincronizar aparelhos</h3><p>${body}</p><button class="btn block" data-action="account">Entrar</button></section>`;
    return `<section class="sync-card js-account ${where === 'path' ? 'mobile-only' : ''}" data-where="${where}">
      <div class="review-icon">${I.user}</div>
      <div class="review-txt"><strong>Use em todos os aparelhos</strong><span>${body}</span></div>
      <button class="btn" data-action="account">Entrar</button></section>`;
  }
  function refreshAccount() {
    document.querySelectorAll('.js-account').forEach((el) => {
      el.outerHTML = accountHtml(el.dataset.where);
    });
  }
  function rerenderView() {
    if ($modal.innerHTML) return; // não atrapalha quem está digitando no modal
    if (view === 'path') renderPath();
    else if (view === 'profile') renderProfile();
  }

  function openAuth(mode, notice) {
    const titles = { signin: 'Entrar', signup: 'Criar conta', reset: 'Recuperar senha', newpass: 'Nova senha' };
    const intro = {
      signin: 'Seu progresso deste aparelho vai junto para a conta.',
      signup: 'Seu progresso deste aparelho vai junto para a conta nova.',
      reset: 'Enviamos um link para você criar uma senha nova.',
      newpass: 'Escolha a nova senha da sua conta.',
    }[mode];
    const email = mode !== 'newpass' ? `<label class="field"><span>E-mail</span><input class="type-input" type="email" name="email" autocomplete="email" required></label>` : '';
    const pass = mode !== 'reset' ? `<label class="field"><span>${mode === 'newpass' ? 'Nova senha' : 'Senha'}</span><input class="type-input" type="password" name="password" minlength="6" required autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}"></label>` : '';
    const submit = { signin: 'Entrar', signup: 'Criar conta', reset: 'Enviar link', newpass: 'Salvar senha' }[mode];
    const links = mode === 'signin'
      ? `<button type="button" class="link-btn" data-action="auth-mode" data-mode="signup">Criar conta</button><button type="button" class="link-btn" data-action="auth-mode" data-mode="reset">Esqueci a senha</button>`
      : mode === 'newpass' ? '' : `<button type="button" class="link-btn" data-action="auth-mode" data-mode="signin">Já tenho conta</button>`;
    const google = Sync.google && (mode === 'signin' || mode === 'signup')
      ? `<button type="button" class="btn ghost block" data-action="google"><svg viewBox="0 0 24 24" aria-hidden="true" class="g-logo"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg> Continuar com Google</button><div class="or"><span>ou</span></div>`
      : '';
    openModal(`<h2>${titles[mode]}</h2><p>${notice ? esc(notice) : intro}</p>
      ${google}
      <form class="auth-form" id="auth-form" data-mode="${mode}" novalidate>
        ${email}${pass}
        <p class="auth-error" role="alert" hidden></p>
        <div class="actions"><button class="btn block" type="submit">${submit}</button></div>
      </form>
      <div class="auth-links">${links}<button type="button" class="link-btn" data-action="close-modal">${mode === 'newpass' ? 'Depois' : 'Agora não'}</button></div>`);
    const first = $modal.querySelector('input');
    first && first.focus({ preventScroll: true });
  }
  async function submitAuth(form) {
    const mode = form.dataset.mode;
    const email = form.email ? form.email.value.trim() : '';
    const password = form.password ? form.password.value : '';
    const errEl = form.querySelector('.auth-error');
    const showErr = (m) => { errEl.textContent = m; errEl.hidden = false; };
    if (form.email && !/^\S+@\S+\.\S+$/.test(email)) return showErr('Digite um e-mail válido.');
    if (form.password && password.length < 6) return showErr('A senha precisa de pelo menos 6 caracteres.');
    const btn = form.querySelector('[type=submit]');
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Aguarde…'; errEl.hidden = true;
    let r;
    if (mode === 'signin') r = await Sync.signIn(email, password);
    else if (mode === 'signup') r = await Sync.signUp(email, password);
    else if (mode === 'reset') r = await Sync.resetPassword(email);
    else r = await Sync.updatePassword(password);
    btn.disabled = false; btn.textContent = label;
    if (r.error) return showErr(r.error);
    if (mode === 'signup' && r.needsConfirm) {
      openModal(`<h2>Confirme seu e-mail</h2><p>Enviamos um link para <strong>${esc(email)}</strong>. Abra o link e depois volte aqui para entrar com seu e-mail e senha.</p>
        <div class="actions"><button class="btn block" data-action="auth-mode" data-mode="signin">Entrar</button></div>`);
      return;
    }
    if (mode === 'reset') {
      openModal(`<h2>Confira seu e-mail</h2><p>Se existir uma conta com <strong>${esc(email)}</strong>, enviamos um link para criar uma senha nova.</p>
        <div class="actions"><button class="btn block" data-action="close-modal">Ok</button></div>`);
      return;
    }
    closeModal();
    rerenderView();
  }
  async function googleLogin() {
    const r = await Sync.google_();
    if (r.error) openAuth('signin', r.error);
  }
  async function logout() {
    closeModal();
    await Sync.signOut();
    state = freshState(); saveLocal();
    firstPathRender = true;
    go('path');
  }
  function initSync() {
    Sync.init({
      getState: () => state,
      merge(remote) {
        const before = JSON.stringify(state);
        state = mergeStates(state, remote);
        if (Sync.user) state._owner = Sync.user.id;
        saveLocal();
        if (JSON.stringify(state) !== before) rerenderView();
        return state;
      },
      onLogin(user) {
        // Progresso local de outra conta não se mistura com esta; progresso sem dono migra para ela.
        if (state._owner && state._owner !== user.id) { state = freshState(); firstPathRender = true; }
        state._owner = user.id;
        saveLocal();
      },
      onChange() { if (view === 'path' || view === 'profile') refreshAccount(); },
      onRecovery() { openAuth('newpass'); },
    });
  }

  // ---------- Navegação ----------
  function render() {
    closeModal();
    if (view === 'profile') renderProfile();
    else { view = 'path'; renderPath(); }
  }
  function go(v) {
    view = v;
    render();
    if (v === 'profile') window.scrollTo(0, 0);
  }

  // ---------- Eventos ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'backdrop') { if (e.target === t) closeModal(); return; }
    e.preventDefault();
    switch (a) {
      case 'go': go(t.dataset.view); break;
      case 'lesson-info': lessonInfo(t.dataset.id); break;
      case 'start': startLesson(t.dataset.id); break;
      case 'review': startReview(); break;
      case 'close-modal': closeModal(); break;
      case 'answer': setAnswer(t.dataset.v); break;
      case 'order-reset': if (session && !session.checked) { session.answer = []; renderLesson(); } break;
      case 'clear-blank': if (session) { session.answer = null; renderLesson(); } break;
      case 'toggle-typing': if (session) { session.cur.typing = !session.cur.typing; session.answer = null; renderLesson(); } break;
      case 'check': check(); break;
      case 'sound': {
        Snd.toggle();
        document.querySelectorAll('.sound-btn').forEach((b) => { b.outerHTML = soundBtnHtml(b.classList.contains('icon-btn') ? 'icon-btn' : 'btn ghost'); });
        break;
      }
      case 'continue': nextQuestion(); break;
      case 'quit':
        openModal(`<h2>${session && session.review ? 'Sair da revisão?' : 'Sair da lição?'}</h2><p>${session && session.review ? 'As respostas que você já deu ficam salvas na sua memória. O resto continua para revisar.' : session && session.practice ? 'O progresso desta prática será perdido.' : 'O progresso desta lição será perdido. As vidas que você perdeu não voltam.'}</p>
          <div class="actions"><button class="btn block" data-action="close-modal">Continuar estudando</button>
          <button class="btn bad block" data-action="confirm-quit">Sair</button></div>`);
        break;
      case 'confirm-quit': session = null; go('path'); break;
      case 'lives': {
        syncLives();
        openModal(`<h2>Vidas</h2>${livesPanelHtml()}<div class="actions"><button class="btn ghost block" data-action="close-modal">Ok</button></div>`);
        break;
      }
      case 'reset':
        openModal(`<h2>Apagar todo o progresso?</h2><p>XP, ofensiva, vidas e lições concluídas voltam ao zero ${Sync.user ? 'neste aparelho e na sua conta' : 'neste navegador'}. Não dá para desfazer.</p>
          <div class="actions"><button class="btn block" data-action="close-modal">Manter progresso</button>
          <button class="btn bad block" data-action="confirm-reset">Apagar</button></div>`);
        break;
      case 'confirm-reset':
        state = freshState(); if (Sync.user) state._owner = Sync.user.id; save(); firstPathRender = true; go('path');
        if (Sync.user) Sync.overwrite();
        break;
      case 'account': openAuth(t.dataset.mode || 'signin'); break;
      case 'auth-mode': openAuth(t.dataset.mode); break;
      case 'google': googleLogin(); break;
      case 'sync-now': Sync.sync(); break;
      case 'logout':
        openModal(`<h2>Sair da conta?</h2><p>Seu progresso continua salvo na conta. Neste aparelho, o app volta ao zero até você entrar de novo.</p>
          <div class="actions"><button class="btn block" data-action="close-modal">Continuar conectado</button>
          <button class="btn ghost block" data-action="confirm-logout">Sair</button></div>`);
        break;
      case 'confirm-logout': logout(); break;
      case 'install':
        if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; if (view === 'profile') renderProfile(); }); }
        break;
    }
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'auth-form') return;
    e.preventDefault();
    submitAuth(e.target);
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'type-answer' && session && !session.checked) {
      session.answer = e.target.value;
      const b = document.getElementById('check-btn');
      if (b) b.disabled = !e.target.value.trim();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ($modal.innerHTML) {
      if (e.key === 'Escape') closeModal();
      return;
    }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-action="clear-blank"]')) { session.answer = null; renderLesson(); return; }
    if (view !== 'lesson' || !session) return;
    if (e.key === 'Escape') { document.querySelector('[data-action="quit"]').click(); return; }
    if (e.key === 'Enter') {
      if (e.target.tagName === 'BUTTON' && e.target.dataset.action !== 'answer') return; // botão em foco já trata
      e.preventDefault();
      if (session.checked) nextQuestion(); else check();
      return;
    }
    if (session.checked || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    const q = session.cur.q;
    if (q.type === 'order' && e.key === 'Backspace' && session.answer.length) {
      e.preventDefault(); setAnswer(session.answer[session.answer.length - 1]); return;
    }
    const n = Number(e.key);
    if (!n) return;
    if (CHOICE.has(q.type) && n <= session.cur.opts.length) setAnswer(n - 1);
    else if (q.type === 'find_bug' && n <= session.cur.lines.length && session.cur.lines[n - 1].trim()) setAnswer(n - 1);
    else if (q.type === 'order') { const left = session.cur.pool.filter((v) => !session.answer.includes(v)); if (n <= left.length) setAnswer(left[n - 1]); }
    else if (q.type === 'true_false' && n <= 2) setAnswer(n === 1);
    else if (q.type === 'fill_blank' && !session.cur.typing && n <= session.cur.bank.length) setAnswer(session.cur.bank[n - 1]);
  });

  // Atualiza vidas/ofensiva de tempos em tempos (regeneração de vidas, virada do dia).
  setInterval(() => {
    if (view !== 'path' && view !== 'profile') return;
    const html = statsHtml();
    document.querySelectorAll('.js-stats').forEach((el) => { el.outerHTML = html; });
  }, 30000);

  // ---------- PWA ----------
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (view === 'profile') renderProfile();
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // ---------- Início ----------
  fetch('curso.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      course = data;
      flat = [];
      deepFlat = [];
      byId = {};
      qIndex = {};
      const add = (l, ui, list) => {
        const lesson = Object.assign({}, l, { unitIndex: ui, unitTitle: course.units[ui].title, color: UNIT_COLORS[ui % UNIT_COLORS.length], index: list.length });
        list.push(lesson);
        byId[lesson.id] = lesson;
        l.questions.forEach((q) => { qIndex[q.id] = { q, lesson }; });
      };
      course.units.forEach((u, ui) => {
        u.lessons.forEach((l) => add(l, ui, flat));
        (u.deep || []).forEach((l) => add(Object.assign({}, l, { deep: true }), ui, deepFlat));
      });
      document.title = 'DuoDev';
      initSync();
      render();
    })
    .catch((err) => {
      $app.innerHTML = `<div class="boot"><h2>Não deu para carregar o curso</h2><p>Abra o app por um servidor (não direto do arquivo) e confira se o curso.json está na mesma pasta.</p><p><code>${esc(err.message)}</code></p></div>`;
    });
})();
