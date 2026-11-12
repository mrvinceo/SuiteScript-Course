/* SuiteScript Route Book — course engine.
   Content lives in assets/content/*.js, each pushing modules onto window.COURSE_MODULES. */
(() => {
  'use strict';

  const MODS = (window.COURSE_MODULES || []).slice().sort((a, b) => a.order - b.order);
  const KEY = 'ssrb-progress-v1';
  const $main = document.getElementById('main');
  const $nav = document.getElementById('nav');
  const $overall = document.getElementById('overall');

  /* ---------- progress storage (per viewer, best-effort) ---------- */
  let P = {};
  try { P = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { P = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* storage unavailable */ } };
  const mp = (id) => {
    if (!P[id]) P[id] = { lesson: false, quiz: 0, labs: {}, cards: {} };
    return P[id];
  };

  const pct = (m) => {
    const s = mp(m.id);
    const known = Object.values(s.cards).filter((v) => v === 'known').length;
    const labs = Object.keys(s.labs).length;
    const parts = [
      s.lesson ? 1 : 0,
      m.cards.length ? known / m.cards.length : 1,
      m.quiz.length ? s.quiz / m.quiz.length : 1,
      m.labs.length ? labs / m.labs.length : 1,
    ];
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const KW = 'const|let|var|function|return|if|else|for|of|in|while|new|try|catch|finally|throw|typeof|instanceof|async|await|break|continue|switch|case|default|this|class|extends';
  const TOKEN = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' + // 1 comment
    '|(`(?:\\\\.|[^`\\\\])*`|\'(?:\\\\.|[^\'\\\\\\n])*\'|"(?:\\\\.|[^"\\\\\\n])*")' + // 2 string
    '|\\b(' + KW + ')\\b' + // 3 keyword
    '|\\b(true|false|null|undefined)\\b' + // 4 literal
    '|\\b(\\d+(?:\\.\\d+)?)\\b' + // 5 number
    '|\\b(define|require|N\\/[a-z\\/]+)\\b', // 6 amd
    'g'
  );
  const hl = (code) => {
    let out = '';
    let last = 0;
    code.replace(TOKEN, (m, c, s, k, l, n, a, idx) => {
      out += esc(code.slice(last, idx));
      const cls = c ? 'c' : s ? 's' : k ? 'k' : l ? 'l' : n ? 'n' : 'a';
      out += `<span class="t-${cls}">${esc(m)}</span>`;
      last = idx + m.length;
      return m;
    });
    return out + esc(code.slice(last));
  };
  const codeBlock = (code, label) =>
    `<figure class="code">${label ? `<figcaption>${esc(label)}</figcaption>` : ''}<pre><code>${hl(code.replace(/^\n/, ''))}</code></pre></figure>`;

  const norm = (s) => String(s).trim()
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*([()[\]{},.:;=<>!+\-*/?])\s*/g, '$1');

  /* ---------- nav ---------- */
  function renderNav(route) {
    const items = MODS.map((m) => {
      const p = pct(m);
      const active = route.mod && route.mod.id === m.id;
      return `<a class="stop${active ? ' is-active' : ''}${p === 100 ? ' is-done' : ''}" href="#${m.id}">
        <span class="stop-no">${pad(m.order)}</span>
        <span class="stop-body"><span class="stop-title">${esc(m.title)}</span>
        <span class="meter" aria-hidden="true"><span style="width:${p}%"></span></span></span>
        <span class="stop-pct">${p}%</span></a>`;
    }).join('');
    $nav.innerHTML = `
      <a class="nav-home${route.view === 'home' ? ' is-active' : ''}" href="#home">Run sheet</a>
      <div class="nav-label">Stops</div>
      <div class="stops">${items}</div>
      <a class="nav-home${route.view === 'review' ? ' is-active' : ''}" href="#review">Review depot</a>`;
    const all = MODS.reduce((a, m) => a + pct(m), 0) / (MODS.length || 1);
    $overall.innerHTML = `<span class="meter meter-lg" aria-hidden="true"><span style="width:${all}%"></span></span><span>${Math.round(all)}% delivered</span>`;
  }

  /* ---------- home ---------- */
  function renderHome() {
    const next = MODS.find((m) => pct(m) < 100) || MODS[0];
    const dict = window.COURSE_DICTIONARY || [];
    $main.innerHTML = `
      <section class="hero">
        <p class="eyebrow">Interactive course · JavaScript for SuiteScript 2.1</p>
        <h1>SuiteScript Route Book</h1>
        <p class="lede">Learn the JavaScript behind NetSuite automations by building the scripts a wholesale distributor actually runs: order checks, delivery-date rules, route manifests, driver proof-of-delivery and overdue-invoice chasers.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#${next.id}">${pct(next) > 0 ? 'Continue' : 'Start'}: Stop ${pad(next.order)}</a>
          <a class="btn" href="#review">Mixed review</a>
        </div>
      </section>

      <section class="brief">
        <div class="brief-text">
          <p class="eyebrow">The account you'll be scripting</p>
          <h2>Harbourside Supply Co.</h2>
          <p>A fictional wholesaler that sells coffee, dry goods, chilled dairy, packaging and cleaning supplies to cafés, restaurants and offices in its region. Orders come in by phone, the web store and sales reps. Three vans run four delivery routes, Monday to Saturday. Orders placed before the 2:00 pm cut-off go out the next delivery day.</p>
          <p>Every example in the course uses the same custom fields, so you'll see how small scripts connect into one delivery workflow.</p>
        </div>
        <div class="dict" role="region" aria-label="Custom field reference" tabindex="0">
          <table>
            <thead><tr><th>Field ID</th><th>On</th><th>Type</th><th>Holds</th></tr></thead>
            <tbody>${dict.map((d) => `<tr><td><code>${esc(d.id)}</code></td><td>${esc(d.on)}</td><td>${esc(d.type)}</td><td>${esc(d.desc)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>

      <section>
        <div class="section-head"><h2>The route</h2><p>Nine stops. Each has a short lesson, flashcards, a quiz and a code lab where you fill the gaps in working scripts.</p></div>
        <div class="grid">${MODS.map((m) => {
          const p = pct(m);
          return `<a class="mod-card" href="#${m.id}">
            <span class="mod-no">Stop ${pad(m.order)}</span>
            <span class="mod-title">${esc(m.title)}</span>
            <span class="mod-sum">${esc(m.summary)}</span>
            <span class="mod-meta">${m.cards.length} cards · ${m.quiz.length} questions · ${m.labs.length} labs</span>
            <span class="meter" aria-hidden="true"><span style="width:${p}%"></span></span>
          </a>`;
        }).join('')}</div>
      </section>

      <section class="howto">
        <h2>How each stop works</h2>
        <dl>
          <div><dt>Lesson</dt><dd>Read the concept with annotated SuiteScript. Mark it done at the end.</dd></div>
          <div><dt>Flashcards</dt><dd>Flip with Space, move with the arrow keys. "Got it" counts toward progress; "Again" sends the card to the review depot.</dd></div>
          <div><dt>Quiz</dt><dd>Multiple choice with an explanation after every answer. Your best score is kept.</dd></div>
          <div><dt>Code lab</dt><dd>Type the missing pieces into the script and press Check (or Enter). Quote style and spacing don't matter.</dd></div>
        </dl>
        <p class="fineprint">Progress is saved in this browser only. <button class="linkish" id="reset-all" type="button">Reset all progress</button></p>
        <p class="fineprint" id="reset-confirm" hidden>Clear progress for every stop? <button class="linkish danger" id="reset-yes" type="button">Yes, clear it</button> <button class="linkish" id="reset-no" type="button">Keep it</button></p>
      </section>`;
    document.getElementById('reset-all').onclick = () => { document.getElementById('reset-confirm').hidden = false; };
    document.getElementById('reset-no').onclick = () => { document.getElementById('reset-confirm').hidden = true; };
    document.getElementById('reset-yes').onclick = () => { P = {}; save(); route(); };
  }

  /* ---------- module shell ---------- */
  const TABS = [['', 'Lesson'], ['cards', 'Flashcards'], ['quiz', 'Quiz'], ['labs', 'Code lab']];

  function renderModule(m, tab) {
    const s = mp(m.id);
    const counts = { '': s.lesson ? 'done' : '', cards: `${m.cards.length}`, quiz: `${m.quiz.length}`, labs: `${Object.keys(s.labs).length}/${m.labs.length}` };
    const idx = MODS.indexOf(m);
    $main.innerHTML = `
      <header class="mod-head">
        <p class="eyebrow">Stop ${pad(m.order)} of ${pad(MODS.length)}</p>
        <h1>${esc(m.title)}</h1>
        <p class="lede">${esc(m.summary)}</p>
        <nav class="tabs" aria-label="Sections">${TABS.map(([k, label]) =>
          `<a class="tab${tab === k ? ' is-active' : ''}" href="#${m.id}${k ? '-' + k : ''}"${tab === k ? ' aria-current="page"' : ''}>${label}${counts[k] ? `<span class="tab-count">${counts[k]}</span>` : ''}</a>`).join('')}</nav>
      </header>
      <div id="panel"></div>
      <footer class="mod-foot">
        ${idx > 0 ? `<a class="btn" href="#${MODS[idx - 1].id}">← Stop ${pad(MODS[idx - 1].order)}</a>` : '<span></span>'}
        ${idx < MODS.length - 1 ? `<a class="btn" href="#${MODS[idx + 1].id}">Stop ${pad(MODS[idx + 1].order)} →</a>` : '<a class="btn" href="#review">Review depot →</a>'}
      </footer>`;
    const panel = document.getElementById('panel');
    if (tab === 'cards') renderCards(panel, m.cards.map((c, i) => ({ ...c, mid: m.id, i })), m);
    else if (tab === 'quiz') renderQuiz(panel, m.quiz, (score) => { if (score > s.quiz) { s.quiz = score; save(); renderNav(currentRoute()); } }, `${m.id}-cards`);
    else if (tab === 'labs') renderLabs(panel, m);
    else renderLesson(panel, m);
  }

  /* ---------- lesson ---------- */
  function renderLesson(panel, m) {
    const s = mp(m.id);
    const body = m.lesson.map((b) => {
      if (b.h) return `<h2>${esc(b.h)}</h2>`;
      if (b.p) return `<p>${b.p}</p>`;
      if (b.list) return `<ul>${b.list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
      if (b.code) return codeBlock(b.code, b.label);
      if (b.note) return `<aside class="note"><strong>${esc(b.title || 'On the job')}</strong><p>${b.note}</p></aside>`;
      if (b.table) return `<div class="tbl" tabindex="0"><table><thead><tr>${b.table[0].map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${b.table.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      return '';
    }).join('');
    panel.innerHTML = `<article class="lesson">${body}
      <div class="lesson-end">
        <button class="btn btn-primary" id="lesson-done" type="button">${s.lesson ? 'Lesson complete · Go to flashcards' : 'Mark complete · Go to flashcards'}</button>
      </div></article>`;
    document.getElementById('lesson-done').onclick = () => {
      s.lesson = true; save();
      location.hash = `${m.id}-cards`;
    };
  }

  /* ---------- flashcards ---------- */
  function renderCards(panel, deck, m) {
    if (!deck.length) {
      panel.innerHTML = `<div class="empty"><h2>Nothing in the depot yet</h2><p>Cards you mark "Again" in any stop land here for another pass.</p></div>`;
      return;
    }
    let order = deck.slice();
    let i = 0;
    let flipped = false;

    const draw = () => {
      const c = order[i];
      const status = mp(c.mid).cards[c.i];
      const knownCount = deck.filter((d) => mp(d.mid).cards[d.i] === 'known').length;
      panel.innerHTML = `
        <div class="deck">
          <div class="deck-bar">
            <span class="deck-pos">Card ${i + 1} / ${order.length}</span>
            <span class="deck-known">${knownCount} of ${deck.length} marked "got it"</span>
            <button class="linkish" id="shuf" type="button">Shuffle</button>
          </div>
          <button class="card${flipped ? ' is-flipped' : ''}" id="card" type="button" aria-live="polite" aria-label="${flipped ? 'Answer side. Press to show question' : 'Question side. Press to reveal answer'}">
            <span class="card-face card-front"><span class="card-tag">${status === 'known' ? 'Got it' : status === 'again' ? 'Learning' : 'Question'}${m ? '' : ` · Stop ${pad(MODS.find((x) => x.id === c.mid).order)}`}</span><span class="card-text">${c.q}</span><span class="card-hint">Space or tap to flip</span></span>
            <span class="card-face card-back"><span class="card-tag">Answer</span><span class="card-text">${c.a}</span></span>
          </button>
          <div class="deck-ctl">
            <button class="btn" id="prev" type="button" ${i === 0 ? 'disabled' : ''}>← Prev</button>
            <button class="btn btn-again" id="again" type="button">Again <kbd>1</kbd></button>
            <button class="btn btn-got" id="got" type="button">Got it <kbd>2</kbd></button>
            <button class="btn" id="next" type="button" ${i === order.length - 1 ? 'disabled' : ''}>Next →</button>
          </div>
          ${m ? `<p class="deck-after">Done here? <a href="#${m.id}-quiz">Take the Stop ${pad(m.order)} quiz →</a></p>` : ''}
        </div>`;
      document.getElementById('card').onclick = () => { flipped = !flipped; draw(); };
      document.getElementById('prev').onclick = () => go(-1);
      document.getElementById('next').onclick = () => go(1);
      document.getElementById('again').onclick = () => mark('again');
      document.getElementById('got').onclick = () => mark('known');
      document.getElementById('shuf').onclick = () => { order = shuffle(order); i = 0; flipped = false; draw(); };
    };
    const go = (d) => { const n = i + d; if (n >= 0 && n < order.length) { i = n; flipped = false; draw(); } };
    const mark = (v) => {
      const c = order[i];
      mp(c.mid).cards[c.i] = v; save(); renderNav(currentRoute());
      if (i < order.length - 1) { i++; flipped = false; }
      draw();
    };
    keyHandler = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === ' ') { e.preventDefault(); flipped = !flipped; draw(); document.getElementById('card').focus(); }
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === '1') mark('again');
      else if (e.key === '2') mark('known');
    };
    draw();
  }

  /* ---------- quiz ---------- */
  function renderQuiz(panel, questions, onFinish, nextHash) {
    const qs = shuffle(questions).map((q) => {
      const opts = shuffle(q.options.map((text, k) => ({ text, right: k === q.answer })));
      return { ...q, opts };
    });
    let i = 0;
    let score = 0;
    let chosen = null;

    const draw = () => {
      if (i >= qs.length) {
        onFinish(score);
        const ratio = score / qs.length;
        panel.innerHTML = `<div class="quiz-done">
          <p class="eyebrow">Quiz complete</p>
          <p class="score"><span>${score}</span> / ${qs.length}</p>
          <p>${ratio === 1 ? 'Clean run. Every answer correct.' : ratio >= 0.7 ? 'Solid. Re-read the explanations on the ones you missed.' : 'Worth another pass through the lesson and flashcards before retrying.'}</p>
          <div class="hero-actions"><button class="btn btn-primary" id="retry" type="button">Retake quiz</button>${nextHash ? `<a class="btn" href="#${nextHash.replace('-cards', '-labs')}">Go to code lab →</a>` : ''}</div>
        </div>`;
        document.getElementById('retry').onclick = () => renderQuiz(panel, questions, onFinish, nextHash);
        return;
      }
      const q = qs[i];
      panel.innerHTML = `<div class="quiz">
        <div class="quiz-bar"><span>Question ${i + 1} / ${qs.length}</span><span>Score ${score}</span></div>
        <div class="progress-strip" aria-hidden="true"><span style="width:${(i / qs.length) * 100}%"></span></div>
        <h2 class="q">${q.q}</h2>
        ${q.code ? codeBlock(q.code) : ''}
        <div class="opts" role="list">${q.opts.map((o, k) => {
          let cls = '';
          if (chosen !== null) cls = o.right ? ' is-right' : k === chosen ? ' is-wrong' : ' is-dim';
          return `<button class="opt${cls}" data-k="${k}" type="button" ${chosen !== null ? 'disabled' : ''}><span class="opt-key">${'ABCDE'[k]}</span><span>${o.text}</span></button>`;
        }).join('')}</div>
        ${chosen !== null ? `<div class="why ${q.opts[chosen].right ? 'ok' : 'bad'}"><strong>${q.opts[chosen].right ? 'Correct.' : 'Not quite.'}</strong> ${q.why}</div>
        <div class="quiz-next"><button class="btn btn-primary" id="qnext" type="button">${i === qs.length - 1 ? 'See score' : 'Next question'} →</button></div>` : ''}
      </div>`;
      panel.querySelectorAll('.opt').forEach((b) => {
        b.onclick = () => {
          chosen = Number(b.dataset.k);
          if (q.opts[chosen].right) score++;
          draw();
          const nb = document.getElementById('qnext');
          if (nb) nb.focus();
        };
      });
      const nb = document.getElementById('qnext');
      if (nb) nb.onclick = () => { i++; chosen = null; draw(); };
    };
    keyHandler = (e) => {
      if (chosen === null && /^[1-5a-e]$/i.test(e.key)) {
        const k = /\d/.test(e.key) ? Number(e.key) - 1 : 'abcde'.indexOf(e.key.toLowerCase());
        const b = panel.querySelector(`.opt[data-k="${k}"]`);
        if (b) b.click();
      }
    };
    draw();
  }

  /* ---------- code labs ---------- */
  function renderLabs(panel, m) {
    const s = mp(m.id);
    panel.innerHTML = m.labs.map((lab, li) => {
      const parts = lab.code.replace(/^\n/, '').split(/\{\{(.+?)\}\}/);
      let html = '';
      let n = 0;
      parts.forEach((part, k) => {
        if (k % 2 === 0) { html += hl(part); return; }
        const answers = part.split('|');
        const w = Math.max(5, ...answers.map((a) => a.length)) + 1;
        html += `<input class="blank" id="${m.id}-lab${li}-b${n}" data-answers="${esc(JSON.stringify(answers))}" style="width:${w}ch" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" aria-label="Blank ${n + 1}">`;
        n++;
      });
      const done = !!s.labs[li];
      return `<section class="lab${done ? ' is-done' : ''}" data-li="${li}">
        <header class="lab-head">
          <span class="lab-no">Lab ${m.order}.${li + 1}</span>
          <h2>${esc(lab.title)}</h2>
          <span class="lab-state">${done ? 'Completed' : `${n} blank${n === 1 ? '' : 's'}`}</span>
        </header>
        <p class="lab-brief">${lab.scenario}</p>
        <figure class="code code-lab"><figcaption>${esc(lab.file || 'script.js')}</figcaption><pre><code>${html}</code></pre></figure>
        <div class="lab-ctl">
          <button class="btn btn-primary" data-act="check" type="button">Check</button>
          <button class="btn" data-act="hint" type="button">Hint</button>
          <button class="btn" data-act="show" type="button">Show answers</button>
          <button class="btn" data-act="reset" type="button">Clear</button>
          <span class="lab-msg" role="status"></span>
        </div>
        <p class="lab-hint" hidden>${lab.hint}</p>
        <div class="lab-explain" ${done ? '' : 'hidden'}><strong>Why it works</strong><p>${lab.explain}</p></div>
      </section>`;
    }).join('');

    panel.querySelectorAll('.lab').forEach((sec) => {
      const li = Number(sec.dataset.li);
      const inputs = [...sec.querySelectorAll('.blank')];
      const msg = sec.querySelector('.lab-msg');
      const check = () => {
        let right = 0;
        inputs.forEach((inp) => {
          const ok = JSON.parse(inp.dataset.answers).some((a) => norm(a) === norm(inp.value));
          inp.classList.toggle('ok', ok);
          inp.classList.toggle('bad', !ok && inp.value.trim() !== '');
          if (ok) right++;
        });
        if (right === inputs.length) {
          msg.textContent = 'All blanks correct.';
          msg.className = 'lab-msg ok';
          sec.querySelector('.lab-explain').hidden = false;
          sec.classList.add('is-done');
          sec.querySelector('.lab-state').textContent = 'Completed';
          if (!s.labs[li]) { s.labs[li] = true; save(); renderNav(currentRoute()); updateLabCount(m); }
        } else {
          msg.textContent = `${right} of ${inputs.length} correct. Red blanks need another look.`;
          msg.className = 'lab-msg bad';
        }
      };
      sec.querySelector('[data-act="check"]').onclick = check;
      sec.querySelector('[data-act="hint"]').onclick = () => { const h = sec.querySelector('.lab-hint'); h.hidden = !h.hidden; };
      sec.querySelector('[data-act="show"]').onclick = () => {
        inputs.forEach((inp) => { inp.value = JSON.parse(inp.dataset.answers)[0]; inp.classList.remove('bad'); inp.classList.add('shown'); });
        sec.querySelector('.lab-explain').hidden = false;
        msg.textContent = 'Answers filled in. Clear and retype them from memory to complete the lab.';
        msg.className = 'lab-msg';
      };
      sec.querySelector('[data-act="reset"]').onclick = () => {
        inputs.forEach((inp) => { inp.value = ''; inp.className = 'blank'; });
        msg.textContent = ''; msg.className = 'lab-msg';
      };
      inputs.forEach((inp, k) => {
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); check(); }
        });
        inp.addEventListener('input', () => { inp.classList.remove('ok', 'bad', 'shown'); });
        void k;
      });
    });
  }
  function updateLabCount(m) {
    const tab = document.querySelector('.tab[href="#' + m.id + '-labs"] .tab-count');
    if (tab) tab.textContent = `${Object.keys(mp(m.id).labs).length}/${m.labs.length}`;
  }

  /* ---------- review depot ---------- */
  function renderReview(mode) {
    const again = [];
    MODS.forEach((m) => m.cards.forEach((c, i) => { if (mp(m.id).cards[i] === 'again') again.push({ ...c, mid: m.id, i }); }));
    $main.innerHTML = `
      <header class="mod-head">
        <p class="eyebrow">Review depot</p>
        <h1>Mixed review</h1>
        <p class="lede">Cards you marked "Again", and a 12-question quiz drawn from every stop.</p>
        <nav class="tabs" aria-label="Review modes">
          <a class="tab${mode !== 'quiz' ? ' is-active' : ''}" href="#review">Cards to revisit<span class="tab-count">${again.length}</span></a>
          <a class="tab${mode === 'quiz' ? ' is-active' : ''}" href="#review-quiz">Mixed quiz</a>
        </nav>
      </header>
      <div id="panel"></div>`;
    const panel = document.getElementById('panel');
    if (mode === 'quiz') {
      const pool = shuffle(MODS.flatMap((m) => m.quiz)).slice(0, 12);
      renderQuiz(panel, pool, () => {}, null);
    } else {
      renderCards(panel, again, null);
    }
  }

  /* ---------- routing ---------- */
  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (keyHandler) keyHandler(e);
  });

  function currentRoute() {
    const h = (location.hash || '').replace(/^#/, '');
    if (h === 'review' || h === 'review-quiz') return { view: 'review', mode: h === 'review-quiz' ? 'quiz' : 'cards' };
    const mm = /^(m\d+)(?:-(cards|quiz|labs))?$/.exec(h);
    const mod = mm && MODS.find((m) => m.id === mm[1]);
    if (mod) return { view: 'module', mod, tab: mm[2] || '' };
    return { view: 'home' };
  }

  function route() {
    keyHandler = null;
    const r = currentRoute();
    renderNav(r);
    if (r.view === 'module') renderModule(r.mod, r.tab);
    else if (r.view === 'review') renderReview(r.mode);
    else renderHome();
    document.title = r.view === 'module' ? `${r.mod.title} · SuiteScript Route Book` : 'SuiteScript Route Book';
    window.scrollTo(0, 0);
    $main.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', route);
  route();
})();
