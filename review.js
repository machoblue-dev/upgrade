/* UP:GRADE — 다섯 탭 그리기(구현 사양 2절 · 5절)

   _도구\폰복습\틀.html 의 그리기 함수와 누르기 동작을 옮겼다(9/29 에 11개교 검사를 통과한 기준).
   밑줄 ___낱말___ · 빈칸 ___ · (ㄱ) 고르기 · 「A — 진술」 덧줄 · 서술형 모양별로 먼저 보이는 것과 답 뒤에 보이는 것 ·
   단어 카드 넘기기 · 지문 한 화면(문장을 누르면 해석) · 핵심 ★ · 짚음 · 흐름 · 각주 · 자리 · 바꿔치기가 틀.html 그대로다.

   바뀐 것
   · 진도를 순번(w1 · g1 · 「지문:문장 번호」 · 낱말) 대신 항목 번호(key)로 적는다 — p.key · p.핵심키[i] · w.key · g.key · v.key
     state 는 done · ok · re 이고, 누른 것을 다시 누르면 none(체크를 지움 — sync.js)
   · 화면 문구를 요체로 바꿨다(자료 글은 그대로다)
   · HTML 이 든 칸(제목 · 문장 html · 자리)은 허락한 태그만 남겨 그린다(safe)
   · 틀린 곳 알리기 단추 — 지문 한 화면 · 서술형 · 어법 · 단어 카드
   · 시험 이름(중간고사·기말고사)과 해(2026)를 회차·시험일에서 읽는다 — 틀.html 은 글자로 박혀 있었다
   · 단어 출처가 지문에 안 붙은 낱말은 코드나 출처 이름을 쓴다 — 틀.html 은 부교재를 「올림포스」로 박아 두었다
   · 묶음 차례에 없는 묶음이 있으면 뒤에 붙인다(빠진 지문이 목록에서 사라지지 않게)
   · 0.3.0 발음 듣기 단추(data-act="say") — 단어 카드 · 핵심 문장(영어를 연 뒤) · 지문 문장(누른 뒤). 읽기는 app.js 가 한다
   · 0.4.0 지문 분석 보기 — 판 지문에 「분석」 칸이 있으면 지문 화면에 단추가 서고 #a-<지문 id> 한 화면에 네 탭이 선다(아래 절)
     0.4.1 단추를 제목 바로 아래 「지문 읽기 | 지문 분석」 전환으로 올렸다 · 지문 목록 머리에 안내 한 줄(강사 「찾아 들어가기가 다소 어렵다」)
   · 0.5.0 그림 풀이 — 판 지문에 「그림」 칸이 있으면 전환 바로 아래 그림 카드가 서고 「전체 화면으로 크게 보기」가 pic.js 의 가로 전체 화면을 연다.
     지문 목록에는 그 지문에 「그림 풀이」 딱지가 붙는다. 그림을 받는 일은 app.js 가 그린 뒤 Pics.fill 로 한다
   · 0.6.0 Top Tier 서술형 — 서술형 모양 「글」(물음 아래 글상자: 지문 · 요약문 · 접힌 「지문 전체」) · 힌트를 하나씩 여는 단추 ·
     답 아래 「이것도 맞아요」 · 「깎이는 곳」 · 머리에 배점. 판 데이터는 _도구\폰복습\탑티어칸.py 가 만든다
     0.6.1 서술형이 다 Top Tier 문항인 판은 이름이 「Top Tier 서술형」 — 탭은 「Top Tier」를 작은 글씨로 위에 얹는다(C.TT)
   · 0.7.0 The Concise — 판 지문에 「콘사이스」 칸이 있으면 전환에 셋째 칸 「The Concise」가 서고 #c-<지문 id> 한 화면에 종이 콘사이스
     한 면을 같은 차례로 싣는다(아래 절). 판 데이터는 _도구\폰복습\콘사이스칸.py 가 만든다
   · 0.9.0 두 목표(자주 들어오게 · 학습 효과 — 261019 기원T)에 맞춘 다듬기 — 「시험 한눈에」를 따로 떼어 접는다(glanceHTML) ·
     머리 카드에 오늘 · 이번 주 숫자(진도 한 칸의 누른 시각으로 센다) · 다시 볼 것 칩을 「전체」 바로 뒤에 수와 함께 ·
     판정 단추는 어느 탭이든 왼쪽 「다시」 · 오른쪽 「앎」 · 핵심 문장에도 「다시 볼래요」(state re) · 누른 뒤 한 줄 알림(묶음을 다 마침 · 다시 볼 것에서 뺌) ·
     시험 직전(D-3 ~ D-DAY) 칸 · 시험 끝 칸 · 출제 예상 한 번에 보기(#yesang) · 지문 · 분석 · The Concise 머리의 겹친 작은 제목을 뺐다 */
var Review = (function () {
  'use strict';
  var C = null;                                        // 지금 판 문맥 — setup() 이 만든다
  var deck = { list: [], i: 0, open: false, key: '' };

  /* ---------- 도움 함수 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* HTML 이 든 칸 — 자료가 쓰는 태그(mark · br · b · u · i · em · strong · sup · sub)만 남기고 나머지 꺾쇠는 글자로 보인다.
     자료의 &#x27; 같은 문자 참조는 그대로 둔다(한 번 더 바꾸면 화면에 그대로 찍힌다) */
  function safe(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>|</g, function (t) {
      if (t === '<') return '&lt;';
      var m;
      if (/^<br\s*\/?>$/i.test(t)) return '<br>';
      if ((m = /^<(\/?)(mark|b|u|i|em|strong|sup|sub)>$/i.exec(t))) return '<' + m[1] + m[2].toLowerCase() + '>';
      if ((m = /^<mark\s+data-k="([0-9, ]*)">$/i.exec(t))) return '<mark data-k="' + m[1] + '">';
      return esc(t);
    });
  }
  function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }
  /* 발음 듣기에 넘길 맨글 — 줄바꿈(<br>)은 빈칸으로, 나머지 태그는 걷고, 문자 참조(&#x27; · &amp; …)를 글자로 되돌린다 */
  function plain(s) {
    var named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, g) {
      if (g.charAt(0) === '#') {
        var n = g.charAt(1) === 'x' || g.charAt(1) === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
      }
      return Object.prototype.hasOwnProperty.call(named, g.toLowerCase()) ? named[g.toLowerCase()] : m;
    }).replace(/\s+/g, ' ').trim();
  }
  /* 발음 듣기 단추 — 누르면 app.js 가 data-say 글을 읽는다(0.3.0) */
  var 소리그림 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  function sayBtn(text) {
    var t = plain(text);
    return t ? '<button class="say" data-act="say" data-say="' + esc(t) + '" aria-label="발음 듣기">' + 소리그림 + '듣기</button>' : '';
  }
  function U() { return C.env.ui; }
  function saveUi() { if (C.env.saveUi) C.env.saveUi(); }
  function st(key) { return (key && C.env.mark(key)) || ''; }
  function okre(s) { return s === 'ok' || s === 're' ? s : ''; }
  function setm(pairs) { if (pairs.length) C.env.setMarks(pairs); }
  function each(list, f) { for (var i = 0; i < list.length; i++) f(list[i], i); }

  var 출처말 = { '교과서': '교과서', '부교재': '부교재', '학평': '학평', '학습지': '학교 학습지', '소설': '소설' };
  function 있는출처(list) {
    var seen = {}, out = [];
    list.forEach(function (x) { var k = x['출처']; if (k && !seen[k]) { seen[k] = 1; out.push(k); } });
    return out;
  }
  function 차례(base, list, field) {
    var out = (base || []).slice(), seen = {};
    out.forEach(function (g) { seen[g] = 1; });
    list.forEach(function (x) { var g = x[field]; if (g && !seen[g]) { seen[g] = 1; out.push(g); } });
    return out;
  }

  /* ---------- 판 하나로 문맥 만들기 ---------- */
  function setup(D, env) {
    deck = { list: [], i: 0, open: false, key: '' };
    if (!D || !env) { C = null; return; }
    var P = D['지문'] || [], W = D['서술형'] || [], G = D['어법'] || [], V = D['단어'] || [];
    /* 주소에서 오는 지문 id 를 그대로 찾으므로 원형(prototype)이 없는 칸을 쓴다 — #p-constructor 같은 주소가 헛것을 찾지 않게 */
    var byId = Object.create(null), wByP = Object.create(null), vByP = Object.create(null), KEYS = [], UV = [], seenV = Object.create(null);
    P.forEach(function (p, i) { p._i = i; byId[p.id] = p; });
    W.forEach(function (w) { if (w.key == null) w.key = 'w:' + w.id; if (w['지문']) (wByP[w['지문']] = wByP[w['지문']] || []).push(w); });
    G.forEach(function (g) { if (g.key == null) g.key = 'g:' + g.id; });
    V.forEach(function (v) {
      if (v.key == null) v.key = 'v:' + String(v.en || '').toLowerCase();
      if (v['지문']) (vByP[v['지문']] = vByP[v['지문']] || []).push(v);
      if (!seenV[v.key]) { seenV[v.key] = 1; UV.push(v.key); }
    });
    P.forEach(function (p) {
      if (p.key == null) p.key = 'p:' + p.id;
      var ks = p['핵심키'] || [];
      (p['핵심'] || []).forEach(function (n, i) { KEYS.push({ p: p, n: n, key: ks[i] || ('k:' + p.id + ':#' + n) }); });
    });
    var HASMARK = P.some(function (p) { return (p['문장'] || []).some(function (s) { return (s['짚음'] || []).length; }); });
    /* 0.6.1 — 서술형이 다 Top Tier 문항(모양 「글」)인 판은 이름을 「Top Tier 서술형」으로(261017 기원T) */
    var TT = W.length > 0 && W.every(function (w) { return w['모양'] === '글'; });
    var TABS = [
      { id: 'jimun', name: '지문', n: P.length }, { id: 'haeksim', name: '핵심 문장', n: KEYS.length },
      { id: 'seosul', name: TT ? 'Top Tier 서술형' : '서술형', n: W.length }, { id: 'eobeop', name: '어법', n: G.length }, { id: 'dan', name: '단어', n: V.length }
    ].filter(function (t) { return t.n > 0; });       // 내용이 없는 탭은 세우지 않는다
    var ui = env.ui;
    if (!ui.f || typeof ui.f !== 'object') ui.f = {};
    if (ui.mode !== 'ko') ui.mode = 'en';
    if (ui.wm !== 'd2w') ui.wm = 'w2m';
    if (!ATABS.some(function (t) { return t.id === ui.atab; })) ui.atab = ATABS[0].id;
    C = {
      D: D, P: P, W: W, G: G, V: V, byId: byId, wByP: wByP, vByP: vByP, KEYS: KEYS, UV: UV,
      ORDER: 차례(D['묶음차례'], P, '묶음'), GORDER: 차례(D['어법묶음'], G, '묶음'),
      HASMARK: HASMARK, TABS: TABS, TT: TT, env: env
    };
  }

  function pLabel(p) { return p['묶음'] + ' · ' + p['이름']; }
  function wSrc(w) { return w['지문'] && C.byId[w['지문']] ? pLabel(C.byId[w['지문']]) : (w['코드'] || ''); }
  function wGroup(w) { return w['출처']; }
  function sentence(p, n) {
    var list = p['문장'] || [];
    for (var i = 0; i < list.length; i++) if (list[i].n === n) return list[i];
    return list[n - 1] || { ko: '', html: '' };
  }

  /* ---------- 시험까지 ---------- */
  function dday() {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(C.D['시험일'] || '');
    if (!m) return null;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var e = new Date(+m[1], +m[2] - 1, +m[3]);
    return Math.round((e - t) / 86400000);
  }
  function 날짜말(ymd) {
    var p = ymd.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return (+p[1]) + '월 ' + (+p[2]) + '일 ' + '일월화수목금토'.charAt(d.getDay()) + '요일';
  }
  function 시험이름() {
    var s = String(C.env.cycle || '') + ' ' + String(C.D['제목'] || '');
    if (/기말/.test(s)) return '기말고사';
    if (/중간/.test(s)) return '중간고사';
    return '시험';
  }
  function 해() { var m = /^(\d{4})/.exec(C.D['시험일'] || C.env.cycle || ''); return m ? m[1] : ''; }

  /* ---------- 0.9.0 오늘 · 이번 주 · 다시 볼 차례 ----------
     진도 한 칸에 적힌 누른 시각(sync.js {s, t} — 서버 updated_at 과 같다)으로 센다. 판에 든 번호만 센다.
     미리보기처럼 시각이 없는 진도는 0 으로 두고, 「다시」에 시각이 없으면 볼 차례로 본다 */
  function marksMap() { var m = C.env.marks ? C.env.marks() : null; return m && typeof m === 'object' ? m : {}; }
  function tOf(m) { var n = m && typeof m.t === 'string' ? Date.parse(m.t) : NaN; return isNaN(n) ? 0 : n; }
  function dayAt(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function weekAt(ms) { var d = new Date(dayAt(ms)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }   // 그 주 월요일
  function tabKeys(id) {
    if (id === 'jimun') return C.P.map(function (p) { return p.key; });
    if (id === 'haeksim') return C.KEYS.map(function (k) { return k.key; });
    if (id === 'seosul') return C.W.map(function (w) { return w.key; });
    if (id === 'eobeop') return C.G.map(function (g) { return g.key; });
    return id === 'dan' ? C.UV : [];
  }
  /* 다시 볼 차례 — 「다시」로 고른 지 하루가 지난 것(오늘 고른 것은 내일부터) */
  function dueCount(id) {
    var M = marksMap(), t0 = dayAt(Date.now()), n = 0;
    tabKeys(id).forEach(function (k) { if (st(k) === 're' && tOf(M[k]) < t0) n++; });
    return n;
  }
  /* 해 온 것 — 오늘 체크한 수 · 이번 주 공부한 날 · 이 판에서 공부한 날 · 체크한 수(다 봄 · 외움 · 맞음 · 알겠음 · 알아요) */
  function doneStats() {
    var M = marksMap(), now = Date.now(), t0 = dayAt(now), w0 = weekAt(now), days = {}, week = {}, today = 0, done = 0;
    C.TABS.forEach(function (tb) {
      tabKeys(tb.id).forEach(function (k) {
        var m = M[k], s = st(k);
        if (!s) return;
        var t = tOf(m);
        if (s === 'done' || s === 'ok') { done++; if (t >= t0) today++; }
        if (!t) return;
        days[dayAt(t)] = 1;
        if (t >= w0) week[dayAt(t)] = 1;
      });
    });
    return { today: today, week: Object.keys(week).length, days: Object.keys(days).length, done: done };
  }

  /* ---------- 라우팅 — 주소(# 뒤, 이미 풀어 둔 글)를 받는다 ---------- */
  function route(h) {
    if (!C) return null;
    if (h.indexOf('p-') === 0) return C.byId[h.slice(2)] ? { view: 'p', id: h.slice(2) } : null;
    if (h.indexOf('a-') === 0) return hasA(C.byId[h.slice(2)]) ? { view: 'a', id: h.slice(2) } : null;   // 지문 분석 보기(0.4.0)
    if (h.indexOf('c-') === 0) return hasC(C.byId[h.slice(2)]) ? { view: 'c', id: h.slice(2) } : null;   // The Concise(0.7.0)
    if (h === 'yesang') return hasY() ? { view: 'y' } : null;                                              // 출제 예상 한 번에 보기(0.9.0)
    for (var i = 0; i < C.TABS.length; i++) if (C.TABS[i].id === h) return { view: 't', tab: h };
    return null;
  }
  function tabName(id) { for (var i = 0; i < C.TABS.length; i++) if (C.TABS[i].id === id) return C.TABS[i].name; return ''; }
  function firstTab() { return C && C.TABS.length ? C.TABS[0].id : ''; }
  /* 「이어서 보기」에 적을 이름 — 없는 화면이면 빈 글 */
  function label(h) {
    var r = route(h || '');
    if (!r) return '';
    if (r.view === 't') return tabName(r.tab);
    if (r.view === 'y') return Y이름;
    var p = C.byId[r.id];
    return pLabel(p) + ' — ' + p['제목'] + (r.view === 'a' ? ' · 지문 분석' : r.view === 'c' ? ' · The Concise' : '');
  }
  function href(h) { return h.indexOf('p-') === 0 || h.indexOf('a-') === 0 || h.indexOf('c-') === 0 ? h.slice(0, 2) + enc(h.slice(2)) : h; }

  function counts() {
    function n(list, keyOf, s) { var c = 0; each(list, function (x) { if (st(keyOf(x)) === s) c++; }); return c; }
    var id = function (x) { return x; };
    return {
      jimun: { n: n(C.P, function (p) { return p.key; }, 'done'), N: C.P.length, re: 0 },
      haeksim: { n: n(C.KEYS, function (k) { return k.key; }, 'done'), N: C.KEYS.length, re: n(C.KEYS, function (k) { return k.key; }, 're') },
      seosul: { n: n(C.W, function (w) { return w.key; }, 'ok'), N: C.W.length, re: n(C.W, function (w) { return w.key; }, 're') },
      eobeop: { n: n(C.G, function (g) { return g.key; }, 'ok'), N: C.G.length, re: n(C.G, function (g) { return g.key; }, 're') },
      dan: { n: n(C.UV, id, 'ok'), N: C.UV.length, re: n(C.UV, id, 're') }
    };
  }
  function tabCount(id) { var c = counts()[id]; return c.n + '/' + c.N; }
  var 뜻말 = { jimun: '다 봄', haeksim: '외움', seosul: '맞음', eobeop: '알겠음', dan: '알아요' };
  /* 첫 화면 탭별 진도 — [{id, name, n, N, re, due, what}] · due 는 다시 볼 것 가운데 오늘 볼 차례(0.9.0) */
  function progress() {
    var c = counts();
    return C.TABS.map(function (t) { return { id: t.id, name: t.name, n: c[t.id].n, N: c[t.id].N, re: c[t.id].re, due: c[t.id].re ? dueCount(t.id) : 0, what: 뜻말[t.id] }; });
  }

  /* ---------- 첫 화면 머리 · 시험 한눈에 ---------- */
  function heroHTML() {
    var D = C.D, dbox = '', d = dday();
    if (d !== null) {
      var dtxt = d > 0 ? 'D-' + d : (d === 0 ? 'D-DAY' : '끝');
      /* 0.10.0 시험이 지났으면 past — 「중간고사까지」의 「까지」를 안 붙인다(CSS) */
      dbox = '<div class="dbox' + (d < 0 ? ' past' : '') + '"><span class="l">' + 시험이름() + '</span><span class="n">' + dtxt + '</span><span class="d">' + 날짜말(D['시험일']) + '</span></div>';
    }
    var y = 해();
    var 제목 = String(D['제목'] || '').replace(/폰\s*복습/g, '복습');   // 폰복습 데이터의 「영어 폰 복습」 — 앱에서는 「영어 복습」
    /* 0.9.0 오늘 · 이번 주 — 사실 숫자만(연속 기록 · 순위는 두지 않는다 · 261019 기원T). 0 인 것은 안 적는다.
       0.10.0 전체 진도 막대는 첫 화면 「진도」 머리(전체 수)와 노선으로 옮겨 머리 카드에는 이 한 줄만 둔다 */
    var s = doneStats(), mins = C.env.studyMin ? C.env.studyMin() : 0, 오늘 = [];
    if (s.today) 오늘.push('오늘 ' + s.today + '개 체크');
    if (mins) 오늘.push('오늘 ' + mins + '분');
    if (s.week) 오늘.push('이번 주 ' + s.week + '일 공부');
    var 진도 = 오늘.length ? '<div class="hero-prog"><p class="hp-today">' + 오늘.join(' · ') + '</p></div>' : '';
    return '<header class="hero">' +
      '<div class="hero-card"><div class="hero-main' + (dbox ? '' : ' nod') + '"><h1><small>' + (y ? y + ' · ' : '') + esc(D['학교표시']) + '</small><span class="ht">' + safe(제목) + '</span></h1>' + dbox + '</div>' +
      진도 + '</div>' +
      '</header>';
  }
  /* 시험 한눈에 — 0.9.0 머리 카드에서 떼어 첫 화면 아래쪽으로 내리고 접는다. 이 회차에서 처음 볼 때만 펼쳐 둔다
     (app.js 가 첫 화면을 떠날 때 glanceSeen 으로 「봤다」를 적는다) */
  function glanceHTML() {
    var D = C.D;
    var 문항 = (D['문항'] || []).length ? '<div class="g-score">' + D['문항'].map(function (x) {
      return '<div class="g-cell"><span class="k">' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b>' + (x[2] ? '<span class="p">' + esc(x[2]) + '</span>' : '') + '</div>';
    }).join('') + '</div>' : '';
    return '<details class="glance"' + (U().gl !== C.env.cycle ? ' open' : '') + '><summary class="g-sum">시험 한눈에<small>문항 · 배점 · 범위</small></summary>' +
      '<div class="g-body">' + 문항 +
      '<ul class="g-src">' + (D['범위'] || []).map(function (x) {
        var c = x['수'] ? x['수'] + '지문' : (x['덧'] || '');
        return '<li><b>' + esc(x['이름']) + '</b>' + esc(x['표기']) + (c ? ' <span class="c">' + esc(c) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<p class="g-howto">누르면 해석과 답이 나와요. 체크한 진도는 폰을 바꿔도 이어져요.</p>' +
      '</div></details>';
  }
  function glanceSeen() { if (C && U().gl !== C.env.cycle) { U().gl = C.env.cycle; saveUi(); } }
  /* 시험 직전(D-3 ~ D-DAY) — 새로 보기보다 다시 볼 것과 출제 예상으로 이끈다 */
  function cramHTML() {
    var d = dday();
    if (d === null || d < 0 || d > 3) return '';
    return '<section class="cram" aria-label="시험 직전"><h2 class="sec-h">시험 직전 · ' + (d ? 'D-' + d : 'D-DAY') + '</h2>' +
      '<p>새로 보기보다 다시 볼 것부터 보고, 시험에 나올 곳을 한 번에 훑어요.</p>' +
      (hasY() ? '<a class="btn cram-go" href="#yesang">' + Y이름 + '</a>' : '') + '</section>';
  }
  /* 시험 끝(시험일이 지났을 때) — 이 판에서 해 온 것을 사실 그대로 */
  function endHTML() {
    var d = dday();
    if (d === null || d >= 0) return '';
    var s = doneStats(), re = 0;
    progress().forEach(function (x) { re += x.re; });
    if (!s.days && !s.done) return '';
    return '<section class="endcard" aria-label="시험 끝"><h2 class="sec-h">시험 끝</h2><p>' +
      (s.days ? '이번 시험 동안 <b>' + s.days + '일</b> 공부했고, ' : '') + '체크를 <b>' + s.done + '개</b> 했어요.' +
      (re ? ' 다시 볼 것이 <b>' + re + '개</b> 남아 있어요.' : '') + '</p></section>';
  }

  var 탭글자 = { jimun: '지', haeksim: '핵', seosul: '서', eobeop: '어', dan: '단' };
  function tabsHTML(cur) {
    return '<div id="tabs-anchor"></div><nav class="tabs" role="tablist" aria-label="복습 종류" style="grid-template-columns:repeat(' + Math.max(C.TABS.length, 1) + ',minmax(0,1fr))">' +
      C.TABS.map(function (t) {
        /* 탭 다섯 칸은 폭이 같아 「Top Tier 서술형」이 한 줄에 안 든다 — 「Top Tier」를 작은 글씨로 위에 얹는다 */
        var nm = t.id === 'seosul' && C.TT ? '<b class="tt">Top Tier</b><span>서술형</span>' : '<span>' + t.name + '</span>';
        /* 0.10.0 어두운 화면 「노선도」는 탭마다 노선 배지 글자(밝은 화면은 CSS 가 감춘다) */
        return '<a class="tab" role="tab" href="#' + t.id + '" aria-selected="' + (t.id === cur) + '"' +
          (t.id === 'seosul' && C.TT ? ' aria-label="' + t.name + '"' : '') + '><b class="tk" aria-hidden="true">' + (탭글자[t.id] || '') + '</b>' + nm + '<i>' + tabCount(t.id) + '</i></a>';
      }).join('') + '</nav>';
  }
  function chipVal(key, items) {
    var v = U().f[key];
    for (var i = 0; i < items.length; i++) if (items[i][0] === v) return v;
    return items[0][0];                                 // 판이 바뀌어 고른 칩이 사라졌으면 「전체」로
  }
  function chipsHTML(key, items) {
    var cur = chipVal(key, items);
    return '<div class="chips" role="group" aria-label="고르기">' + items.map(function (it) {
      return '<button class="chip" data-chip="' + key + '" data-val="' + esc(it[0]) + '" aria-pressed="' + (it[0] === cur) + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  function grpItems() { return [['all', '전체']].concat(C.ORDER.map(function (g) { return [g, g]; })); }
  /* 다시 볼 것 칩(0.9.0) — 「전체」 바로 뒤 · 지금 수와 함께(0 이면 수를 안 적는다) */
  function reItem(tab) { var n = counts()[tab].re; return ['re', '다시 볼 것' + (n ? ' ' + n : '')]; }
  function repBtn(key, what) {
    if (!C.env.report || !key) return '';
    return '<div class="rep-row"><button class="rep" data-act="rep" data-key="' + esc(key) + '" data-label="' + esc(what) + '">틀린 곳 알리기</button></div>';
  }
  /* 260930 — 「체크한 진도 지우기」는 시범 동안 감춘다. 학생이 누르면 그 학생의 체크가 모두 none 이 되어
     관리자 현황판 숫자가 0 이 된다. 되살릴지는 강사 결정 대기 — 켜려면 true 로 바꾼다 */
  var 진도지우기_켬 = false;
  function tailHTML() {
    return '<footer class="tail">' +
      '<p>범위 — ' + (C.D['범위'] || []).map(function (x) { return esc((x['이름'] || '') + ' ' + (x['표기'] || '')); }).join(' · ') + '</p>' +
      '<p>문장 해석과 문제는 학원에서 나눠 준 자료와 같은 내용이에요.' + (C.HASMARK ? ' 밑줄은 학교 학습지와 수업 판서가 짚은 곳이에요.' : '') + '</p>' +
      (C.env.readonly || !진도지우기_켬 ? '' : '<div id="resetbox"><button class="reset" data-act="reset">체크한 진도 지우기</button></div>') +
      '</footer>';
  }

  /* ---------- 탭: 지문 ---------- */
  /* 지문 목록 머리 안내 한 줄(0.4.1) — 0.7.0 The Concise 칸이 있는 판이면 함께 알린다 */
  function ahintHTML() {
    var a = C.P.some(hasA), c = C.P.some(hasC);
    if (!a && !c) return '';
    return '<p class="ahint-card">' + (a && c ? '<b>지문을 열면 맨 위에 「지문 분석」과 「The Concise」가 있어요.</b>The Concise는 지문 하나를 한 장에 모아 정리한 거예요.'
      : a ? '<b>지문을 열면 맨 위에 「지문 분석」이 있어요.</b>구조·흐름 · 문장별 해설 · 문법 · 주제 문장을 볼 수 있어요.'
        : '<b>지문을 열면 맨 위에 「The Concise」가 있어요.</b>지문 하나를 한 장에 모아 정리한 거예요.') + '</p>';
  }
  function jimunHTML() {
    var items = grpItems(), f = chipVal('jimun', items);
    var out = '<p class="intro">지문을 누르면 문장마다 해석이 나와요. 한글을 보고 영어를 떠올리는 방식으로도 볼 수 있어요.</p>' +
      ahintHTML() +
      chipsHTML('jimun', items);
    C.ORDER.forEach(function (g) {
      if (f !== 'all' && f !== g) return;
      var ps = C.P.filter(function (p) { return p['묶음'] === g; });
      var done = ps.filter(function (p) { return st(p.key) === 'done'; }).length;
      out += '<section class="grp"><h3 class="grp-h">' + esc(g) + '<span>' + ps.length + '지문 · ' + done + ' 다 봄</span></h3>';
      ps.forEach(function (p) {
        var on = st(p.key) === 'done';
        out += '<a class="row" href="#p-' + enc(p.id) + '"><span><span class="row-l">' + esc(p['이름']) + '</span>' +
          '<span class="row-t">' + esc(p['제목']) + '</span>' +
          (p['영제목'] ? '<span class="row-e">' + esc(p['영제목']) + '</span>' : '') +
          (picOf(p) ? '<span class="row-pic">그림 풀이</span>' : '') + '</span>' +
          '<span class="dot' + (on ? ' on' : '') + '" role="img" aria-label="' + (on ? '다 봄' : '아직') + '"></span></a>';
      });
      out += '</section>';
    });
    return out;
  }

  /* ---------- 탭: 핵심 문장 ---------- */
  function haeksimHTML() {
    var items = grpItems(), any = false;
    items.splice(1, 0, reItem('haeksim'));
    var f = chipVal('haeksim', items);
    var out = '<p class="intro">지문마다 먼저 외워 둘 핵심 문장이에요. 한글을 보고 영어 문장을 먼저 말해 본 뒤 눌러요.</p>' + chipsHTML('haeksim', items);
    C.ORDER.forEach(function (g) {
      if (f !== 'all' && f !== 're' && f !== g) return;
      var ks = C.KEYS.filter(function (k) { return k.p['묶음'] === g && (f !== 're' || st(k.key) === 're'); });
      if (!ks.length) return;
      any = true;
      out += '<section class="grp"><h3 class="grp-h">' + esc(g) + '<span>' + ks.length + '문장 · ' +
        ks.filter(function (k) { return st(k.key) === 'done'; }).length + ' 외움</span></h3><div class="cards">';
      ks.forEach(function (k) {
        var s = sentence(k.p, k.n), ks2 = st(k.key);
        /* 0.9.0 판정 두 칸 — 어느 탭이든 왼쪽 「다시」 · 오른쪽 「앎」 */
        out += '<article class="card kcard" data-key="' + esc(k.key) + '"><div class="card-h"><span class="tag">' + esc(k.p['이름']) + ' · 문장 ' + k.n + '</span>' +
          '<a class="src" href="#p-' + enc(k.p.id) + '">' + esc(k.p['제목']) + ' ›</a>' + stateTag(ks2, '외움') + '</div>' +
          '<p class="ko-line">' + esc(s.ko) + '</p>' +
          '<button class="show" data-act="kshow">영어 문장 보기</button>' +
          '<div class="en-line" hidden><p class="en" style="margin:0">' + safe(s.html) + '</p>' + sayBtn(s.html) + '</div>' +
          '<div class="judge"><button data-act="kre" data-v="re" aria-pressed="' + (ks2 === 're') + '">다시 볼래요</button>' +
          '<button data-act="kdone" data-v="done" aria-pressed="' + (ks2 === 'done') + '">외웠어요</button></div>' +
          '</article>';
      });
      out += '</div></section>';
    });
    if (!any) out += '<p class="empty">' + (f === 're' ? '「다시 볼래요」를 누른 문장이 여기에 모여요.' : '문장이 없어요.') + '</p>';
    return out;
  }

  /* ---------- 서술형 카드 ---------- */
  /* 밑줄 __말__ — 분석 MD 가 **굵게** 감싼 밑줄 친 말(0.3.1). 앞뒤 밑줄표가 꼭 둘인 것만 — 빈칸 ___ 과 안 섞인다 */
  function underline(h) { return h.replace(/(^|[^_])__([^_\s](?:[^_]*?[^_\s])?)__(?!_)/g, '$1<u>$2</u>'); }
  function blankify(s) { return underline(esc(s)).replace(/_{3,}/g, '<span class="blank" aria-label="빈칸"></span>'); }
  /* (ㄱ)~(ㄹ) 고르기 구절 — ___낱말___ 은 밑줄, 앞뒤 띄운 ___ 은 빈칸이다 */
  function optHTML(x) {
    var m = String(x).match(/^(\([ㄱ-ㅎ]\))\s*([\s\S]*)$/), lab = m ? m[1] : '', body = m ? m[2] : String(x);
    var b = esc(body).replace(/_{2,}([^_\s][^_]*?[^_\s]|[^_\s])_{2,}/g, '<u>$1</u>').replace(/_{3,}/g, '<span class="blank" aria-label="빈칸"></span>');
    return '<li>' + (lab ? '<span class="ok">' + esc(lab) + '</span>' : '') + '<span class="en">' + b + '</span></li>';
  }
  /* 물음 아래 덧줄 — 「A — 진술」은 A 를 표지로, 나머지는 줄 그대로 */
  function addHTML(x) {
    var m = String(x).match(/^([A-E])\s*—\s*([\s\S]*)$/);
    return '<li>' + (m ? '<span class="ok">' + m[1] + '</span>' + esc(m[2]) : esc(x)) + '</li>';
  }
  function stateTag(s, okWord) { return s ? '<span class="state ' + s + '">' + (s === 're' ? '다시 볼 것' : okWord) + '</span>' : ''; }
  /* Top Tier 서술형(0.6.0 · 261017) — 모양 「글」의 글상자(지문 · 요약문 · 지문 전체)와 힌트 · 이것도 맞아요 · 깎이는 곳 */
  function wBoxHTML(b) {
    var body = (b['글'] || []).map(function (x) { return '<p class="en">' + blankify(x) + '</p>'; }).join('');
    return '<div class="under wbox"><span class="lab">' + esc(b['라벨']) + '</span>' +
      (b['접음'] ? '<div class="wbox-b" hidden>' + body + '</div><button class="link-btn" data-act="wbox" aria-expanded="false">펼치기</button>' : body) + '</div>';
  }
  function wHintHTML(list) {
    return '<div class="whints">' + list.map(function (x, i) {
      return '<button class="link-btn" data-act="whint"' + (i ? ' hidden' : '') + '>' + esc(x[0]) + ' 보기</button>' +
        '<p class="whint" hidden><span class="lab">' + esc(x[0]) + '</span>' + esc(x[1]) + '</p>';
    }).join('') + '</div>';
  }
  function wCard(w, withSrc) {
    var s = okre(st(w.key));
    var h = '<article class="card" data-key="' + esc(w.key) + '" data-kind="w"><div class="card-h"><span class="tag">' + esc(w['틀']) + '</span>' +
      (w['배점'] ? '<span class="src">' + esc(w['배점']) + '점</span>' : '') +
      (withSrc ? '<span class="src">' + esc(wSrc(w)) + '</span>' : '') + stateTag(s, '맞음') + '</div>';
    var m = w['모양'];
    if (m === '글') {
      h += '<p class="q">' + esc(w['물음']) + '</p>' + (w['글상자'] || []).map(wBoxHTML).join('');
    } else if (m === '밑줄') {
      h += '<p class="q">' + esc(w['물음']) + '</p>' +
        '<div class="under"><span class="lab">' + esc(w['밑줄라벨'] || '밑줄 친 (A)') + '</span><p class="en" style="margin:0">' + underline(esc(w['밑줄문'])) + '</p>' +
        (w['밑줄해석'] ? '<p class="sub-ko" hidden>' + esc(w['밑줄해석']) + '</p><button class="link-btn" data-act="wko">해석 보기</button>' : '') + '</div>';
    } else if (m === '빈칸') {
      h += '<p class="q">' + esc(w['물음']) + '</p><p class="en prompt">' + blankify(w['제시문']) + '</p>' +
        (w['지정어'] ? '<div class="kw">반드시 넣을 낱말 <b>' + esc(w['지정어']) + '</b></div>' : '') +
        (w['밑줄해석'] ? '<p class="sub-ko">뜻 — ' + esc(w['밑줄해석']) + '</p>' : '');
    } else if (m === '표현') {
      h += '<p class="q">본문 표현을 같은 뜻의 다른 말로 바꿔 써 봐요.</p><div class="expr"><span class="lab">본문 표현</span><p class="en" style="margin:0">' + esc(w['본문표현']) + '</p></div>' +
        '<p class="mean">뜻 — ' + esc(w['뜻']) + '</p>';
    } else {
      h += (w['앞문장'] ? '<p class="en prompt" style="margin:0 0 8px">' + esc(w['앞문장']) + '</p>' : '') + '<p class="ko-q">' + esc(w['물음']) + '</p>' +
        (w['뒷문장'] ? '<p class="en prompt" style="margin:8px 0 0">' + esc(w['뒷문장']) + '</p>' : '');
    }
    if (w['덧줄'] && w['덧줄'].length) h += '<ul class="opts ko">' + w['덧줄'].map(addHTML).join('') + '</ul>';
    if (w['선택지'] && w['선택지'].length) h += '<ul class="opts">' + w['선택지'].map(optHTML).join('') + '</ul>';
    if (w['보기'] && w['보기'].length) h += '<div class="bogi"><span class="lab">보기</span><div class="bogi-w">' + w['보기'].map(function (x) { return '<span class="en">' + esc(x) + '</span>'; }).join('') + '</div></div>';
    if (w['조건들'] && w['조건들'].length) h += '<ul class="cond">' + w['조건들'].map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';
    if (w['힌트'] && w['힌트'].length) h += wHintHTML(w['힌트']);
    h += '<button class="reveal" data-act="wshow">답 보기</button><div class="ans" hidden>' +
      '<span class="lab">답</span><p class="' + (/[가-힣]/.test(w['답'] || '') ? 'ko-a' : 'en') + '" style="margin:0">' + esc(w['답']) + '</p>' +
      (w['원문'] ? '<p class="orig">' + esc(w['원문라벨'] || '원문') + ' — <span class="en">' + esc(w['원문']) + '</span></p>' : '') +
      (w['맞다'] ? '<p class="tip"><span class="lab">이것도 맞아요</span>' + esc(w['맞다']) + '</p>' : '') +
      (w['깎'] && w['깎'].length ? '<div class="tip"><span class="lab">깎이는 곳</span><ul class="wcut">' +
        w['깎'].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
      (w['포인트'] ? '<p class="tip"><span class="lab">빠뜨리기 쉬운 곳</span>' + esc(w['포인트']) + '</p>' : '') +
      '<div class="judge"><button data-act="wj" data-v="re" aria-pressed="' + (s === 're') + '">다시 볼래요</button><button data-act="wj" data-v="ok" aria-pressed="' + (s === 'ok') + '">맞았어요</button></div>' +
      '</div>' + repBtn(w.key, tabName('seosul') + ' · ' + (wSrc(w) || w['틀'] || '')) + '</article>';
    return h;
  }
  function seosulHTML() {
    var items = [['all', '전체'], reItem('seosul')].concat(있는출처(C.W).map(function (k) { return [k, 출처말[k] || k]; }));
    var f = chipVal('seosul', items);
    var list = C.W.filter(function (w) {
      if (f === 'all') return true;
      if (f === 're') return st(w.key) === 're';
      return wGroup(w) === f;
    });
    var out = '<p class="intro">답을 보기 전에 먼저 써 보거나 입으로 말해 봐요. 조건을 지켰는지부터 맞춰 봐요.</p>' + chipsHTML('seosul', items);
    if (!list.length) return out + '<p class="empty">' + (f === 're' ? '「다시 볼래요」를 누른 문항이 여기에 모여요.' : '문항이 없어요.') + '</p>';
    return out + '<div class="cards">' + list.map(function (w) { return wCard(w, true); }).join('') + '</div>';
  }

  /* ---------- 탭: 어법 ---------- */
  var 학습지묶음 = '학교 학습지가 가르친 자리';
  function gCard(g) {
    var s = okre(st(g.key));
    return '<article class="card" data-key="' + esc(g.key) + '" data-kind="g"><div class="card-h"><span class="tag">' + esc(g['종류']) + '</span><span class="src">' + esc(g['코드']) + '</span>' +
      stateTag(s, '알겠음') + '</div>' +
      '<p class="g-name">' + esc(g['이름']) + '</p><p class="en g-ex">' + esc(g['예문']) + '</p>' +
      '<button class="reveal" data-act="gshow">왜 이 형태인지 보기</button><div class="ans" hidden><p class="why">' + esc(g['이유']) + '</p>' +
      '<div class="judge"><button data-act="gj" data-v="re" aria-pressed="' + (s === 're') + '">다시 볼래요</button><button data-act="gj" data-v="ok" aria-pressed="' + (s === 'ok') + '">알겠어요</button></div></div>' +
      repBtn(g.key, '어법 · ' + (g['코드'] ? g['코드'] + ' · ' : '') + (g['이름'] || '')) + '</article>';
  }
  function eobeopHTML() {
    var items = [['all', '전체'], reItem('eobeop')].concat(C.GORDER.map(function (g) { return [g, g === 학습지묶음 ? '학교 학습지' : g]; }));
    var f = chipVal('eobeop', items);
    var out = '<p class="intro">규칙과 예문을 먼저 보고, 왜 그 형태인지 스스로 말해 본 뒤 눌러요.' +
      (C.GORDER[0] === 학습지묶음 ? ' 학교 학습지가 가르친 규칙이 맨 앞이에요.' : '') + '</p>' + chipsHTML('eobeop', items);
    var any = false;
    C.GORDER.forEach(function (gr) {
      if (f !== 'all' && f !== 're' && f !== gr) return;
      var list = C.G.filter(function (g) { return g['묶음'] === gr && (f !== 're' || st(g.key) === 're'); });
      if (!list.length) return;
      any = true;
      out += '<section class="grp"><h3 class="grp-h">' + esc(gr) + '<span>' + list.length + '개</span></h3><div class="cards">' + list.map(gCard).join('') + '</div></section>';
    });
    if (!any) out += '<p class="empty">「다시 볼래요」를 누른 규칙이 여기에 모여요.</p>';
    return out;
  }

  /* ---------- 탭: 단어 ---------- */
  function danItems() {
    var 학교있음 = C.V.some(function (v) { return v['학교']; });
    return [['all', '전체'], reItem('dan')].concat(학교있음 ? [['school', '학교 낱말']] : [])
      .concat(있는출처(C.V).map(function (k) { return [k, 출처말[k] || k]; }));
  }
  function wordList() {
    var f = chipVal('dan', danItems());
    var srcOrder = { '교과서': 0, '부교재': 1, '학평': 2 };
    var list = C.V.filter(function (v) {
      if (U().wm === 'd2w' && !v['정의']) return false;
      if (f === 'all') return true;
      if (f === 'school') return v['학교'];
      if (f === 're') return st(v.key) === 're';
      return v['출처'] === f;
    });
    return list.map(function (v, i) {
      return { v: v, s: (srcOrder[v['출처']] || 0) * 1000 + (C.byId[v['지문']] ? C.byId[v['지문']]._i : 99) * 10, i: i };
    }).sort(function (a, b) { return a.s - b.s || a.i - b.i; }).map(function (x) { return x.v; });
  }
  function shuffleArr(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function ensureDeck() {
    var key = chipVal('dan', danItems()) + '|' + U().wm;
    if (deck.key !== key) { deck.list = wordList(); if (U().shuffle) shuffleArr(deck.list); deck.i = 0; deck.open = false; deck.key = key; }
  }
  function vSrc(v) {
    if (v['지문'] && C.byId[v['지문']]) return pLabel(C.byId[v['지문']]);
    return v['코드'] || 출처말[v['출처']] || v['출처'] || '';
  }
  function badge(text) { return '<span class="badge">' + text + '</span>'; }
  function flashHTML() {
    ensureDeck();
    var L = deck.list;
    if (!L.length) return '<p class="empty">' + (chipVal('dan', danItems()) === 're' ? '「몰라요」를 누른 낱말이 여기에 모여요.' : '낱말이 없어요.') + '</p>';
    if (deck.i >= L.length) {
      var ok = L.filter(function (v) { return st(v.key) === 'ok'; }).length;
      return '<div class="flash" style="align-items:center;text-align:center"><p class="front" style="font-family:var(--sans);font-size:22px;font-weight:800">한 바퀴 끝</p>' +
        '<p class="ask">' + L.length + '개 가운데 ' + ok + '개를 안다고 했어요. 「다시 볼 것만」을 누르면 모르는 낱말만 한 번 더 볼 수 있어요.</p></div>' +
        '<div class="judge big"><button data-act="dagain">처음부터</button><button data-act="dre">다시 볼 것만</button></div>';
    }
    var v = L[deck.i], d2w = U().wm === 'd2w';
    /* 발음 단추는 낱말이 보일 때만 — 「영영정의 → 낱말」은 카드를 뒤집기 전에 읽으면 답이 들린다 */
    var sb = !d2w || deck.open ? sayBtn(v.en) : '';
    var h = '<div class="deck-top"><span class="count">' + (deck.i + 1) + ' / ' + L.length + '</span><span class="deck-tools">' +
      '<button data-act="dshuf" aria-pressed="' + (!!U().shuffle) + '">' + (U().shuffle ? '섞는 중' : '섞기') + '</button><button data-act="dagain">처음부터</button></span></div>' +
      '<div class="flash-wrap' + (sb ? ' has-say' : '') + '">' + sb +
      '<button class="flash" data-act="dflip" aria-expanded="' + deck.open + '">';
    if (d2w) h += '<span class="ask">이 풀이에 맞는 낱말은?</span><span class="front def">' + esc(v['정의']) + '</span>';
    else h += '<span class="front">' + esc(v.en) + (v['학교'] ? badge('학교 낱말') : '') + '</span><span class="ask">' + (deck.open ? '' : '먼저 떠올려 보고 카드를 눌러요') + '</span>';
    if (deck.open) {
      h += '<span class="back">';
      if (d2w) h += '<span class="wd">' + esc(v.en) + (v['학교'] ? badge('학교 낱말') : '') + '</span>';
      h += '<span class="mn">' + (v['품사'] ? '<span class="ps">' + esc(v['품사']) + '</span>' : '') + esc(v['뜻']) + '</span>';
      if (!d2w && v['정의']) h += '<span class="df">' + esc(v['정의']) + (v['학교정의'] ? badge('학교 정의') : '') + '</span>';
      if (d2w && v['학교정의']) h += '<span class="from">학교가 준 영영정의예요</span>';
      h += '<span class="from">' + esc(vSrc(v)) + '</span></span>';
    }
    h += '</button>';
    /* 0.10.0 어두운 화면 「노선도」 — 역 이름판처럼 앞뒤 낱말(밝은 화면은 CSS 가 감춘다).
       「영영정의 → 낱말」에서는 앞뒤 낱말이 다른 카드의 답이라 안 싣는다 */
    if (!d2w) {
      var 앞 = L[deck.i - 1], 뒤 = L[deck.i + 1];
      h += '<div class="flash-nb" aria-hidden="true"><span class="nb-p">' + (앞 ? '‹ <i>' + deck.i + '</i> ' + esc(앞.en) : '') + '</span>' +
        '<span class="nb-n">' + (뒤 ? '<i>' + (deck.i + 2) + '</i> ' + esc(뒤.en) + ' ›' : '') + '</span></div>';
    }
    h += '</div>';
    h += '<div class="judge big"><button data-act="dj" data-v="re">몰라요</button><button data-act="dj" data-v="ok">알아요</button></div>';
    h += repBtn(v.key, '단어 · ' + v.en);
    return h;
  }
  function wordItem(v) {
    return '<li><button data-act="wlm"><span class="w">' + esc(v.en) + '</span><span class="m cover" data-m="' + esc((v['품사'] ? v['품사'] + ' ' : '') + (v['뜻'] || '')) + '"></span></button></li>';
  }
  function wordTable() { return '<ul class="wl wtable">' + wordList().map(wordItem).join('') + '</ul>'; }
  function danHTML() {
    var 학교있음 = C.V.some(function (v) { return v['학교']; });
    return '<p class="intro">' + (학교있음 ? '「학교 낱말」은 학교 학습지가 찍어 준 낱말이에요. 뜻과 영영정의는 학교가 준 것을 그대로 실었어요.' : '카드를 보고 뜻을 떠올려 봐요. 모르면 「몰라요」를 눌러요.') + '</p>' +
      chipsHTML('dan', danItems()) +
      '<div class="seg" role="group" aria-label="보는 방식"><button data-act="wm" data-v="w2m" aria-pressed="' + (U().wm !== 'd2w') + '">낱말 → 뜻</button>' +
      '<button data-act="wm" data-v="d2w" aria-pressed="' + (U().wm === 'd2w') + '">영영정의 → 낱말</button></div>' +
      '<div id="deck">' + flashHTML() + '</div>' +
      '<button class="listtoggle" data-act="wlist">' + (U().wlist ? '목록 접기' : '목록으로 한눈에 보기') + '</button>' +
      '<div id="wlist">' + (U().wlist ? wordTable() : '') + '</div>';
  }

  /* ---------- 그림 풀이(0.5.0) — 그림은 서버 비공개 저장소에 있고 src 는 그 안 이름이다(학교 폴더 표 / 내용 해시.webp) ---------- */
  var PICNAME = /^[0-9a-f]{12}\/[0-9a-f]{16}\.webp$/;
  function picOf(p) {
    var g = p && p['그림'];
    return g && typeof g === 'object' && typeof g.src === 'string' && PICNAME.test(g.src) && +g.w > 0 && +g.h > 0 ? g : null;
  }
  /* 큰 그림(src · 4배)은 전체 화면에서만 · 지문 화면 카드는 작은 그림(작은 · 1200px)을 쓴다 — 작은 칸이 없으면 큰 그림 하나로 */
  function picSmall(g) { return typeof g['작은'] === 'string' && PICNAME.test(g['작은']) ? g['작은'] : g.src; }
  function picHTML(p) {
    var g = picOf(p);
    if (!g) return '';
    var t = g['제목'] || p['제목'] || '', s = picSmall(g);
    var data = ' data-src="' + esc(g.src) + '" data-s="' + esc(s) + '" data-w="' + esc(g.w) + '" data-h="' + esc(g.h) + '" data-t="' + esc(t) + '"';
    /* 0.5.1 처음에는 접혀 있다(기원T 「처음에는 접혀 있다가 누르면 보이게」) — 머리 줄을 누르면 펼쳐지고 그때 그림을 받는다(data-pic-wait → data-pic) */
    return '<section class="pic"><button class="pic-tog" type="button" data-act="pictog" aria-expanded="false" aria-controls="pic-body">' +
      '<span class="pic-h">그림 풀이<small>그림으로 먼저 내용을 잡아요</small></span><span class="pic-arr">펼치기</span></button>' +
      '<div class="pic-body" id="pic-body" hidden>' +
      '<button class="pic-box" type="button" data-act="picfull"' + data + ' aria-label="그림 풀이 크게 보기" style="aspect-ratio:' + (+g.w) + ' / ' + (+g.h) + '">' +
      '<img data-pic-wait="' + esc(s) + '" alt="그림 풀이 — ' + esc(t) + '" width="' + (+g.w) + '" height="' + (+g.h) + '">' +
      '<span class="pic-wait">그림을 받는 중이에요</span></button>' +
      '<button class="btn pic-full" type="button" data-act="picfull"' + data + '>전체 화면으로 크게 보기</button></div></section>';
  }

  /* ---------- 지문 한 화면 ---------- */
  function passageHTML(id) {
    var p = C.byId[id], i = p._i, prev = C.P[i - 1], next = C.P[i + 1];
    var keyset = {}; (p['핵심'] || []).forEach(function (n) { keyset[n] = 1; });
    var hasMark = (p['문장'] || []).some(function (s) { return (s['짚음'] || []).length; });
    var mode = U().mode === 'ko' ? 'ko' : 'en';
    var h = '<div class="pbar"><a class="back" href="#jimun">‹ 목록</a><span class="t">' + esc(pLabel(p)) + '</span><span class="nv">' +
      (prev ? '<a href="#p-' + enc(prev.id) + '" aria-label="이전 지문">‹</a>' : '<span aria-hidden="true">‹</span>') +
      (next ? '<a href="#p-' + enc(next.id) + '" aria-label="다음 지문">›</a>' : '<span aria-hidden="true">›</span>') + '</span></div>';
    /* 0.9.0 머리 위 작은 제목(지문 이름)은 위쪽 막대에 이미 있어 뺐다 */
    h += '<header class="phead"><h2>' + esc(p['제목']) + '</h2>' +
      (p['영제목'] ? '<p class="en-t">' + esc(p['영제목']) + '</p>' : '') + '</header>';
    h += pSwitch(p, 'p');
    h += picHTML(p);
    h += '<div class="gist"><span class="lab">한 줄 요약</span><p>' + esc(p['한줄']) + '</p></div>';
    if ((p['흐름'] || []).length) h += '<ol class="flow" aria-label="글의 흐름">' + p['흐름'].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    h += '<div class="modebar" role="group" aria-label="보는 방식"><button data-act="mode" data-v="en" aria-pressed="' + (mode === 'en') + '">영어로 읽기</button>' +
      '<button data-act="mode" data-v="ko" aria-pressed="' + (mode === 'ko') + '">한글 보고 떠올리기</button></div>';
    var leg = [];
    if ((p['핵심'] || []).length) leg.push('<b>★</b> 핵심 문장');
    if (hasMark) leg.push('<mark>밑줄</mark> 학교에서 짚은 곳');
    h += '<div class="tools"><p class="legend">' + leg.join(' · ') + '</p>' +
      '<button class="link-btn" data-act="openall">모두 펼치기</button></div>';
    h += '<div class="sents" data-mode="' + mode + '">';
    (p['문장'] || []).forEach(function (s) {
      var key = keyset[s.n];
      h += '<div class="s' + (key ? ' key' : '') + (s['새문단'] ? ' para' : '') + '" data-n="' + esc(s.n) + '">' +
        '<button class="s-btn" data-act="sopen" aria-expanded="false"><span class="s-num">' + esc(s.n) + (key ? '<b>★</b>' : '') + '</span>' +
        '<span class="s-body"><span class="s-en en">' + safe(s.html) + '</span><span class="s-ph">영어 문장 보기</span><span class="s-ko">' + esc(s.ko) + '</span></span></button>' +
        sayBtn(s.html) +
        ((s['짚음'] || []).length ? '<ul class="s-notes">' + s['짚음'].map(function (m) { return '<li><mark class="q">' + esc(m['구']) + '</mark> — ' + esc(m['말']) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>';
    });
    h += '</div>';
    if ((p['각주'] || []).length) h += '<p class="foot">' + p['각주'].map(esc).join('<br>') + '</p>';
    /* 자리 글은 자료를 만들 때 이미 이스케이프하고 굵은 글씨만 <b> 로 바꿔 두었다 — 그래도 허락한 태그만 남긴다 */
    if ((p['자리'] || []).length) h += '<section class="blk"><h3>시험에 나오는 자리</h3><ul class="bul">' + p['자리'].map(function (x) { return '<li>' + safe(x) + '</li>'; }).join('') + '</ul></section>';
    if ((p['바꿔치기'] || []).length) h += '<section class="blk"><h3>바꿔치기 자리</h3><div class="pairs">' + p['바꿔치기'].map(function (r) {
      return '<span class="pair"><span class="w">' + esc(r.en) + '</span> <span class="a">↔ ' + esc(r['반']) + '</span>' + (r['문장'] ? '<span class="x">문장 ' + esc(r['문장']) + '</span>' : '') + '</span>';
    }).join('') + '</div><p class="hint">' + esc(C.D['바꿔치기말'] || '낱말 하나가 반대말로 바뀌면 글의 뜻이 뒤집혀요.') + '</p></section>';
    var ws = C.wByP[p.id] || [];
    if (ws.length) h += '<section class="blk"><h3>이 지문 ' + tabName('seosul') + ' <small>' + ws.length + '문항</small></h3><div class="cards">' + ws.map(function (w) { return wCard(w, false); }).join('') + '</div></section>';
    var vs = C.vByP[p.id] || [];
    if (vs.length) h += '<section class="blk"><h3>이 지문 단어 <small>' + vs.length + '개 · 누르면 뜻</small></h3><ul class="wl">' + vs.map(wordItem).join('') + '</ul></section>';
    var done = st(p.key) === 'done';
    h += '<button class="done-btn" data-act="pdone" data-key="' + esc(p.key) + '" aria-pressed="' + done + '">' + (done ? '다 봤어요 · 다시 누르면 취소' : '이 지문 다 봤어요') + '</button>';
    h += repBtn(p.key, '지문 · ' + pLabel(p) + ' — ' + (p['제목'] || ''));
    h += '<nav class="pn">' + (prev ? '<a href="#p-' + enc(prev.id) + '"><span class="k">‹ 이전 지문</span><span class="t">' + esc(prev['제목']) + '</span></a>' : '<span></span>') +
      (next ? '<a class="nx" href="#p-' + enc(next.id) + '"><span class="k">다음 지문 ›</span><span class="t">' + esc(next['제목']) + '</span></a>' : '<span></span>') + '</nav>';
    return h;
  }

  /* ---------- 지문 분석 보기(0.4.0 · 261010 강사 「네 학교 교과서에 지문 분석 보기 파트를 만들어 줘」) ----------
     강사가 카톡으로 받은 견본 html 의 네 탭(구조·흐름 · 문장별 해설 · 문법 · 주제 문장) 모양에 분석 MD 글을 싣는다.
     글은 판 지문의 「분석」 칸이다(_도구\폰복습\분석칸.py — 분석 MD 에 이미 있는 칸을 옮긴 것 · 새 글이 없다).
     · 체크 칸이 없다 — 진도 번호(key)가 그대로이고 학생 진도가 안 비워진다
     · 「분석」 칸이 없는 판(중간 판 · 종전 길로 만든 판)에서는 지문 화면에 들어가는 단추가 안 서고 #a- 주소도 안 열린다
     · 고른 탭은 폰에 남는다(ui.atab) — 다른 지문 분석으로 넘어가도 같은 탭이 열린다
     · 견본의 「핵심 대조」 · 「주제·요지 보기 분석」은 분석 MD 에 없는 칸이라 첫 판에서 뺐다(강사 「네 의견대로」) */
  var ATABS = [{ id: 'gu', name: '구조·흐름' }, { id: 'mun', name: '문장별 해설' }, { id: 'beop', name: '문법' }, { id: 'ju', name: '주제 문장' }];
  function aOf(p) { return p && p['분석'] && typeof p['분석'] === 'object' ? p['분석'] : null; }
  /* 칸 이름(분석칸.py) — 얘기 · 구조[칸 · 범위 · 말] · 이야기 · 줄(문장마다)[n · 기능 · 핵심 · 표시 · 끊어 · 외울말 · 고르기 · 문법점 · 주석 · 조각] ·
     심화 · 구문[틀 · 풀이 · 예] · 더쉬운 · 요약[en · ko] · 속풀이[n · 말] · 막힘[물음 · 풀이] */
  function aSents(a) { return (a['줄'] || []).filter(function (s) { return s && typeof s.n === 'number'; }); }
  function beopOn(s) { return !!((s['조각'] || []).length || s['고르기'] || (s['주석'] || []).length || (s['문법점'] || []).length); }
  function aHas(a, id) {
    function L(k) { return (a[k] || []).length > 0; }
    if (id === 'gu') return L('얘기') || L('구조') || !!a['이야기'];
    if (id === 'mun') return aSents(a).length > 0;
    if (id === 'beop') return L('심화') || L('구문') || aSents(a).some(beopOn);
    return L('더쉬운') || L('요약') || L('속풀이') || L('막힘') || aSents(a).some(function (s) { return !!s['표시']; });
  }
  function aTabs(p) { var a = aOf(p); return a ? ATABS.filter(function (t) { return aHas(a, t.id); }) : []; }
  function hasA(p) { return aTabs(p).length > 0; }
  function aCur(p) {
    var ts = aTabs(p);
    for (var i = 0; i < ts.length; i++) if (ts[i].id === U().atab) return ts[i].id;
    return ts.length ? ts[0].id : '';
  }
  function aName(id) { for (var i = 0; i < ATABS.length; i++) if (ATABS[i].id === id) return ATABS[i].name; return ''; }
  function aRepLabel(p, tab) { return '지문 분석 · ' + pLabel(p) + ' — ' + (p['제목'] || '') + ' · ' + aName(tab); }
  function aSec(title, body, cls) { return '<section class="acard' + (cls ? ' ' + cls : '') + '"><h3 class="ah">' + title + '</h3>' + body + '</section>'; }
  function aLines(list, cls) { return (list || []).map(function (x) { return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(x) + '</p>'; }).join(''); }
  /* 구조도 칸 이름으로 딱지 색을 고른다 — 도입 파랑 · 전개(본론 · 근거 · 사례) 주황 · 전환(반론 · 대조) 빨강 · 결론(주제 · 마무리) 보라 */
  function 칸색(name) {
    var s = String(name || '');
    if (/도입|배경|소개|상황|문제 제기/.test(s)) return 'k1';
    if (/전환|반론|대조|반전|반박|한계|문제/.test(s)) return 'k3';
    if (/결론|주제|마무리|요지|정리|중심|주장|교훈/.test(s)) return 'k4';
    return 'k2';
  }
  function starBadge(v) {
    if (v === '주제문') return '<span class="astar ju">주제문 ★★★</span>';
    if (v === '원픽문장') return '<span class="astar one">원픽문장 ★★★</span>';
    return '';
  }
  /* 풀이 한 줄 — [낱말, 풀이] 를 「낱말 = 풀이」로(종이 지문 노트 1면 어휘·어법 상자와 같은 꼴) */
  function noteHTML(x) { return '<li>' + (x[0] ? '<b class="en">' + esc(x[0]) + '</b> = ' : '') + esc(x[1]) + '</li>'; }
  /* 문법 문장 조각 — [글, 표] · 표 g 짚을 문법 · s 주어 쪽 · v 동사 쪽(겹치면 gs · gv) · '@' 는 그 자리에서 시작하는 골격 라벨(S · V · S' · V') */
  function segHTML(list) {
    return (list || []).map(function (x) {
      var t = String(x[0] == null ? '' : x[0]), k = String(x[1] || '');
      if (k === '@') return '<sup class="svl ' + (t.charAt(0) === 'V' ? 'v' : 's') + '">' + esc(t.replace(/'/g, '′')) + '</sup>';
      var cls = [];
      if (k.indexOf('g') >= 0) cls.push('u-g');
      if (k.indexOf('s') >= 0) cls.push('u-s');
      if (k.indexOf('v') >= 0) cls.push('u-v');
      return cls.length ? '<span class="' + cls.join(' ') + '">' + esc(t) + '</span>' : esc(t);
    }).join('');
  }
  /* 짚을 문법 낱말 — 붙어 있는 g 조각을 하나로(라벨 조각은 건너뛴다) */
  function gWords(list) {
    var out = [], cur = '';
    (list || []).forEach(function (x) {
      if (x[1] === '@') return;
      if (String(x[1] || '').indexOf('g') >= 0) cur += x[0];
      else if (cur) { if (out.indexOf(cur.trim()) < 0) out.push(cur.trim()); cur = ''; }
    });
    if (cur && out.indexOf(cur.trim()) < 0) out.push(cur.trim());
    return out.filter(Boolean);
  }
  function aEn(p, x) {
    var s = sentence(p, x.n);
    return s.html ? s : { html: esc((x['끊어'] || []).map(function (c) { return c[0]; }).join(' ')), ko: s.ko || '' };
  }

  function aGu(p, a) {
    var h = '';
    if ((a['얘기'] || []).length) h += aSec('이 글, 무슨 얘기냐', '<p class="atext">' + esc(a['얘기'].join(' ')) + '</p>');
    if ((a['구조'] || []).length) h += aSec('글의 구조도', '<ol class="astruct">' + a['구조'].map(function (x) {
      return '<li class="' + 칸색(x['칸']) + '"><span class="as-top"><span class="akb">' + esc(x['칸']) + '</span>' +
        (x['범위'] ? '<span class="arange">문장 ' + esc(x['범위']) + '</span>' : '') + '</span><p>' + esc(x['말']) + '</p></li>';
    }).join('') + '</ol>');
    if (a['이야기']) h += aSec('지문 이해를 돕는 이야기', '<p class="atext">' + esc(a['이야기']) + '</p>');
    return h;
  }
  function aMun(p, a) {
    var h = '<p class="intro">문장마다 하는 일과 풀이예요. 「끊어 읽기 보기」를 누르면 덩어리마다 뜻이 나와요.</p>';
    aSents(a).forEach(function (x) {
      var s = aEn(p, x);
      h += '<article class="acard asent' + (x['표시'] ? ' star' : '') + '"><div class="as-h"><span class="anum">' + esc(x.n) + '</span>' +
        (x['기능'] ? '<b class="as-f">' + esc(x['기능']) + '</b>' : '') + starBadge(x['표시']) + '</div>' +
        '<p class="en as-en">' + safe(s.html) + '</p>' + sayBtn(s.html) +
        (s.ko ? '<p class="as-ko">' + esc(s.ko) + '</p>' : '') +
        (x['핵심'] ? '<p class="as-core">' + esc(x['핵심']) + '</p>' : '') +
        ((x['외울말'] || []).length ? '<ul class="awords" aria-label="이 문장 단어">' + x['외울말'].map(function (w) {
          return '<li><b class="en">' + esc(w[0]) + '</b>' + esc(w[1]) + '</li>';
        }).join('') + '</ul>' : '') +
        ((x['끊어'] || []).length ? '<button class="link-btn achunk-b" data-act="achunk" aria-expanded="false">끊어 읽기 보기</button><ol class="achunks" hidden>' +
          x['끊어'].map(function (c) {
            return '<li><span class="en">' + esc(c[0]) + '</span><span class="ck">' + esc(c[1]) + '</span>' +
              ((c[2] || []).length ? '<ul class="anotes">' + c[2].map(noteHTML).join('') + '</ul>' : '') + '</li>';
          }).join('') + '</ol>' : '') +
        '</article>';
    });
    return h;
  }
  function aBeop(p, a) {
    var h = '';
    (a['심화'] || []).forEach(function (x) {
      h += '<section class="acard agram"><p class="ag-k">자주 나오는 문법</p><h3 class="ah">' + esc(x['이름']) + '</h3><dl class="agf">' +
        [['틀', x['틀'], ''], ['규칙', x['규칙'], ''], ['예', x['예'], 'en'], ['함정', x['함정'], '']].filter(function (r) { return r[1]; }).map(function (r) {
          return '<div><dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + esc(r[1]) + '</dd></div>';
        }).join('') + '</dl></section>';
    });
    var ss = aSents(a).filter(beopOn);
    if (ss.length) {
      var sv = ss.some(function (x) { return (x['조각'] || []).some(function (g) { return g[1] === '@'; }); });
      h += '<p class="intro">색칠한 말이 짚을 문법이에요.' + (sv ? ' 작은 S는 주어, V는 동사 자리예요.' : '') + '</p>';
      ss.forEach(function (x) {
        var notes = (x['문법점'] || []).concat(x['주석'] || []);
        h += '<article class="acard abeop"><div class="as-h"><span class="anum">' + esc(x.n) + '</span>' +
          gWords(x['조각']).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
          '<p class="en ag-en">' + ((x['조각'] || []).length ? segHTML(x['조각']) : safe(aEn(p, x).html)) + '</p>' +
          (notes.length ? '<ul class="anotes">' + notes.map(noteHTML).join('') + '</ul>' : '') +
          (x['고르기'] ? '<div class="ag-box"><span class="lab">어법 고르기 자리</span><p>' + esc(x['고르기']) + '</p></div>' : '') +
          '</article>';
      });
    }
    if ((a['구문'] || []).length) h += aSec('구문 정리', '<ol class="agu">' + a['구문'].map(function (x) {
      return '<li><b>' + esc(x['틀']) + '</b>' + (x['풀이'] ? '<span class="ag-m">' + esc(x['풀이']) + '</span>' : '') +
        (x['예'] ? '<span class="en">' + esc(x['예']) + '</span>' : '') + '</li>';
    }).join('') + '</ol>');
    return h;
  }
  function aJu(p, a) {
    var h = '', 주 = a['더쉬운'] || [], 요 = a['요약'] || [], star = {};
    if (주.length || 요.length) h += aSec('주제·요약',
      (주.length ? '<div class="aj-sub"><span class="lab">더 쉬운 주제</span>' + aLines(주) + '</div>' : '') +
      (요.length ? '<div class="aj-sub"><span class="lab">주제(Main Idea) · 요약문(Summary)</span>' + 요.map(function (x) {
        return '<div class="aj-pair"><p class="en">' + esc(x.en) + '</p>' + sayBtn(x.en) + (x.ko ? '<p class="aj-ko">' + esc(x.ko) + '</p>' : '') + '</div>';
      }).join('') + '</div>' : ''));
    aSents(a).forEach(function (x) {
      if (!x['표시']) return;
      star[x.n] = 1;
      var s = aEn(p, x);
      h += '<section class="acard astarbox ' + (x['표시'] === '주제문' ? 'ju' : 'one') + '"><div class="as-h"><span class="anum">' + esc(x.n) + '</span>' +
        starBadge(x['표시']) + (x['기능'] ? '<b class="as-f">' + esc(x['기능']) + '</b>' : '') + '</div>' +
        '<p class="en aj-en">' + safe(s.html) + '</p>' + sayBtn(s.html) + (s.ko ? '<p class="as-ko">' + esc(s.ko) + '</p>' : '') +
        (x['핵심'] ? '<p class="as-core">' + esc(x['핵심']) + '</p>' : '') + '</section>';
    });
    if ((a['속풀이'] || []).length) h += aSec('문장마다 속뜻', '<p class="ahint">번호는 지문의 문장 번호와 같아요.</p><ol class="asd">' + a['속풀이'].map(function (x) {
      return '<li' + (star[x.n] ? ' class="key"' : '') + '><span class="anum">' + esc(x.n) + '</span><div>' + aLines(x['말']) + '</div></li>';
    }).join('') + '</ol>');
    if ((a['막힘'] || []).length) h += aSec('여기서 막힌다', a['막힘'].map(function (x) {
      return '<div class="amk"><p class="amk-q">' + esc(x['물음']) + '</p>' + aLines(x['풀이']) + '</div>';
    }).join(''));
    return h;
  }
  function aBody(p, tab) {
    var a = aOf(p), ts = aTabs(p), k = -1;
    for (var i = 0; i < ts.length; i++) if (ts[i].id === tab) k = i;
    var h = tab === 'gu' ? aGu(p, a) : tab === 'mun' ? aMun(p, a) : tab === 'beop' ? aBeop(p, a) : aJu(p, a);
    var nx = ts[k + 1];
    return h + (nx ? '<button class="anext" data-act="atab" data-v="' + nx.id + '">다음 · ' + nx.name + ' ›</button>'
      : '<a class="anext" href="#p-' + enc(p.id) + '">‹ 지문으로 돌아가기</a>');
  }
  /* 지문 읽기 | 지문 분석 전환(0.4.1 · 261010 강사 「더 보기 쉬운 곳에 · 학생들이 찾아 들어가기가 다소 어렵다」) —
     지문 화면과 분석 화면의 제목 바로 아래 같은 자리에 선다. 첫 화면에서 바로 보이게 흐름 아래 단추(0.4.0)를 여기로 올렸다.
     지금 보는 쪽은 채운 칸, 갈 쪽은 누르는 단추 모양이다. 분석 칸이 없는 지문에는 안 선다 */
  /* 0.7.0 The Concise 칸이 있으면 셋째 칸이 선다(지문 읽기 | 지문 분석 | The Concise) — 칸이 셋이면 nav 에 data-n="3".
     칸이 둘이면 0.4.1 과 글자까지 같다. 지문 화면에서 갈 쪽 링크에 클래스(ago · cgo)를 달아 시험이 쓴다 */
  function pSwitch(p, cur) {
    var it = [['p', '지문 읽기', '']];
    if (hasA(p)) it.push(['a', '지문 분석', 'ago']);
    if (hasC(p)) it.push(['c', 'The Concise', 'cgo']);
    if (it.length < 2) return '';
    return '<nav class="pswitch"' + (it.length > 2 ? ' data-n="3"' : '') + ' aria-label="지문 보는 방식">' + it.map(function (x) {
      return x[0] === cur ? '<span class="ps-on" aria-current="page">' + x[1] + '</span>'
        : '<a' + (cur === 'p' && x[2] ? ' class="' + x[2] + '"' : '') + ' href="#' + x[0] + '-' + enc(p.id) + '">' + x[1] + '</a>';
    }).join('') + '</nav>';
  }
  function aTabsHTML(ts, cur) {
    return '<div class="atabs" role="tablist" aria-label="분석 보기" style="grid-template-columns:repeat(' + Math.max(ts.length, 1) + ',minmax(0,1fr))">' +
      ts.map(function (t) { return '<button role="tab" data-act="atab" data-v="' + t.id + '" aria-selected="' + (t.id === cur) + '">' + t.name + '</button>'; }).join('') + '</div>';
  }
  function analysisHTML(id) {
    var p = C.byId[id], ts = aTabs(p), cur = aCur(p);
    var list = C.P.filter(hasA), i = list.indexOf(p), prev = list[i - 1], next = list[i + 1];
    var h = '<div class="pbar"><a class="back" href="#jimun">‹ 목록</a><span class="t">' + esc(pLabel(p)) + ' · 분석</span><span class="nv">' +
      (prev ? '<a href="#a-' + enc(prev.id) + '" aria-label="이전 지문 분석">‹</a>' : '<span aria-hidden="true">‹</span>') +
      (next ? '<a href="#a-' + enc(next.id) + '" aria-label="다음 지문 분석">›</a>' : '<span aria-hidden="true">›</span>') + '</span></div>';
    /* 0.9.0 분석 화면은 본문이 빨리 오게 — 작은 제목 · 영어 제목을 빼고 한 줄 제목만(지문 이름은 위쪽 막대에) */
    h += '<header class="phead"><h2>' + esc(p['제목']) + '</h2></header>';
    h += pSwitch(p, 'a');
    h += aTabsHTML(ts, cur) + '<div id="abody" data-p="' + esc(p.id) + '" data-tab="' + cur + '">' + aBody(p, cur) + '</div>';
    h += repBtn(p.key, aRepLabel(p, cur));
    h += '<nav class="pn">' + (prev ? '<a href="#a-' + enc(prev.id) + '"><span class="k">‹ 이전 지문 분석</span><span class="t">' + esc(prev['제목']) + '</span></a>' : '<span></span>') +
      (next ? '<a class="nx" href="#a-' + enc(next.id) + '"><span class="k">다음 지문 분석 ›</span><span class="t">' + esc(next['제목']) + '</span></a>' : '<span></span>') + '</nav>';
    return h;
  }
  /* 탭을 바꾸면 그 자리에서 몸만 갈아 끼운다 — 내려가 있었으면 새 탭 첫머리(탭 줄 바로 아래)로 올린다 */
  function aSwitch(v) {
    var body = document.getElementById('abody');
    var p = body && C.byId[body.getAttribute('data-p')];
    if (!p || !aHas(aOf(p), v)) return;
    U().atab = v; saveUi();
    body.innerHTML = aBody(p, v);
    body.setAttribute('data-tab', v);
    each(document.querySelectorAll('.atabs [data-act="atab"]'), function (x) { x.setAttribute('aria-selected', x.getAttribute('data-v') === v); });
    var rb = document.querySelector('.rep[data-act="rep"]');
    if (rb) rb.setAttribute('data-label', aRepLabel(p, v));
    var bar = document.querySelector('.atabs');
    if (bar) {   // 탭 줄은 위쪽 막대 아래에 붙어 있다(style.css .atabs top) — 몸 첫머리가 그 아래에 오게
      var top = body.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(bar).top) || 0) - bar.getBoundingClientRect().height;
      if (window.scrollY > top) window.scrollTo(0, Math.max(0, top));
    }
  }

  /* ---------- The Concise(0.7.0 · 261018 기원T 「글로 싣기(이름은 The Concise) · 겹치는 내용 빼지 말고 그대로 넣기」) ----------
     종이 콘사이스 한 면(_도구\콘사이스\빌드.js)과 같은 차례로 싣는다 — 제목 · TOPIC · 주제 · 구조 · 한 줄 → 핵심 어휘 → 핵심 어법 →
     핵심 문장 → 출제 예상 자리(객관식 · 서답형). 글은 판 지문의 「콘사이스」 칸(_도구\폰복습\콘사이스칸.py — 확정 json 의 학생 칸 그대로)이다.
     단어 탭 · 지문 분석과 겹치는 글도 그대로 둔다.
     · 체크 칸이 없다 — 진도 번호(key)가 그대로다
     · 「콘사이스」 칸이 없는 판 · 지문에서는 전환 칸이 안 서고 #c- 주소도 첫 화면으로 간다 */
  function cOf(p) {
    var c = p && p['콘사이스'];
    return c && typeof c === 'object' && ((c.vocab || []).length || (c.sentences || []).length || c.topicKo) ? c : null;
  }
  function hasC(p) { return !!cOf(p); }
  function cObjs(x) { return Array.isArray(x) ? x.filter(function (v) { return v && typeof v === 'object'; }) : []; }
  function cStrs(x) { return Array.isArray(x) ? x.filter(function (v) { return typeof v === 'string' && v; }) : []; }
  /* 핵심 문장 따옴표 — 문장이 따옴표로 열리거나 닫히면 겹치지 않게 안 씌운다(빌드.js 문장따옴표와 같다) */
  function cQuote(t) { t = String(t || '').trim(); return /^["“]|["”]$/.test(t) ? t : '“' + t + '”'; }
  /* 어법 인용 도막 잇기 — 앞 · 핵심 · 뒤 사이를 띄우되 문장부호 앞뒤는 안 띄운다(빌드.js 이음공백과 같다) */
  function cGap(a, b) { return !a || !b || /^\s|^[,.;:!?)\]}»”’…]/.test(b) || /\s$|[([{«“‘\-—]$/.test(a) ? '' : ' '; }
  function cSec(title, body, cls) { return '<section class="acard ccard' + (cls ? ' ' + cls : '') + '"><h3 class="ah cc-h">' + title + '</h3>' + body + '</section>'; }
  function cBody(c) {
    var h = '', meta = [['TOPIC', c.topicEn, 'en'], ['주제', c.topicKo, ''], ['구조', c.structure, ''], ['한 줄', c.oneLiner, '']].filter(function (r) { return r[1]; });
    if (c.titleEn || c.titleKo || meta.length) h += '<section class="acard ccard chead">' +
      (c.titleEn ? '<p class="en cc-te">' + esc(c.titleEn) + '</p>' : '') + (c.titleKo ? '<p class="cc-tk">' + esc(c.titleKo) + '</p>' : '') +
      (meta.length ? '<dl class="cc-meta">' + meta.map(function (r) {
        return '<div><dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</dl>' : '') + '</section>';
    var vs = cObjs(c.vocab);
    if (vs.length) h += cSec('핵심 어휘', '<ul class="cc-voc">' + vs.map(function (v) {
      var rel = v.related ? String(v.related) : '';
      return '<li><p class="cv-h"><b class="en">' + esc(v.en) + '</b>' + (v.pos ? '<i class="cv-pos">' + esc(v.pos) + '</i>' : '') +
        (v.ko ? '<span class="cv-ko">' + esc(v.ko) + '</span>' : '') + '</p>' +
        (rel ? '<p class="cv-rel"><span class="cv-c">' + esc(v.connector || '↔') + '</span> <span' + (/[가-힣]/.test(rel) ? '' : ' class="en"') + '>' + esc(rel) + '</span></p>' : '') +
        (v.note ? '<p class="cv-note">' + esc(v.note) + '</p>' : '') + sayBtn(esc(v.en)) + '</li>';
    }).join('') + '</ul>');
    var gs = cObjs(c.grammar);
    if (gs.length) h += cSec('핵심 어법', '<ul class="cc-gram">' + gs.map(function (g) {
      var a = g.quoteBefore || '', b = g.quoteBold || '', z = g.quoteAfter || '';
      return '<li><p class="cg-t">' + esc(g.title) + '</p>' +
        (a || b || z ? '<p class="en cg-q">' + esc(a) + cGap(a, b) + (b ? '<b>' + esc(b) + '</b>' : '') + cGap(b || a, z) + esc(z) + '</p>' : '') +
        (g.trap ? '<p class="cg-trap">' + esc(g.trap) + '</p>' : '') + '</li>';
    }).join('') + '</ul>');
    var ss = cObjs(c.sentences);
    if (ss.length) h += cSec('핵심 문장', ss.map(function (s) {
      return '<article class="cc-sent">' + (s.slot ? '<span class="cs-slot">' + esc(s.slot) + '</span>' : '') +
        '<p class="en cs-en">' + esc(cQuote(s.en)) + '</p>' + sayBtn(esc(s.en)) +
        (s.ko ? '<p class="cs-ko">' + esc(s.ko) + '</p>' : '') + (s.why ? '<p class="cs-why">' + esc(s.why) + '</p>' : '') +
        (s.where ? '<p class="cs-where">' + esc(s.where) + '</p>' : '') + '</article>';
    }).join(''));
    var mc = cStrs(c.expectationsMc), sa = cStrs(c.expectationsSa), ex = cStrs(c.expectations);
    function ul(list) { return '<ul class="cc-exp">' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
    var eb = mc.length || sa.length ? (mc.length ? '<p class="cc-sub">객관식</p>' + ul(mc) : '') + (sa.length ? '<p class="cc-sub">서답형</p>' + ul(sa) : '') : ex.length ? ul(ex) : '';
    if (eb) h += cSec('출제 예상 자리', eb);
    return h;
  }
  function conciseHTML(id) {
    var p = C.byId[id];
    var list = C.P.filter(hasC), i = list.indexOf(p), prev = list[i - 1], next = list[i + 1];
    var h = '<div class="pbar"><a class="back" href="#jimun">‹ 목록</a><span class="t">' + esc(pLabel(p)) + ' · The Concise</span><span class="nv">' +
      (prev ? '<a href="#c-' + enc(prev.id) + '" aria-label="이전 지문 The Concise">‹</a>' : '<span aria-hidden="true">‹</span>') +
      (next ? '<a href="#c-' + enc(next.id) + '" aria-label="다음 지문 The Concise">›</a>' : '<span aria-hidden="true">›</span>') + '</span></div>';
    h += '<header class="phead"><h2>' + esc(p['제목']) + '</h2></header>';   // 0.9.0 분석 화면과 같다
    h += pSwitch(p, 'c');
    h += '<div id="cbody">' + cBody(cOf(p)) + '</div>';
    h += '<a class="anext" href="#p-' + enc(p.id) + '">‹ 지문으로 돌아가기</a>';
    h += repBtn(p.key, 'The Concise · ' + pLabel(p) + ' — ' + (p['제목'] || ''));
    h += '<nav class="pn">' + (prev ? '<a href="#c-' + enc(prev.id) + '"><span class="k">‹ 이전 지문</span><span class="t">' + esc(prev['제목']) + '</span></a>' : '<span></span>') +
      (next ? '<a class="nx" href="#c-' + enc(next.id) + '"><span class="k">다음 지문 ›</span><span class="t">' + esc(next['제목']) + '</span></a>' : '<span></span>') + '</nav>';
    return h;
  }

  /* ---------- 출제 예상 한 번에 보기(0.9.0 · #yesang) ----------
     지문마다 The Concise 「출제 예상 자리」(없으면 지문 화면 「시험에 나오는 자리」)를 묶음 차례로 한 화면에 모은다.
     시험 직전(D-3 ~ D-DAY) 첫 화면 칸이 여기로 데려온다. 체크 칸이 없다 — 진도 번호가 그대로다 */
  var Y이름 = '출제 예상 한 번에 보기';
  function yOf(p) {
    var c = cOf(p), mc = c ? cStrs(c.expectationsMc) : [], sa = c ? cStrs(c.expectationsSa) : [], ex = c ? cStrs(c.expectations) : [];
    if (mc.length || sa.length || ex.length) return { mc: mc, sa: sa, ex: ex, z: [] };
    var z = cStrs(p['자리']);
    return z.length ? { mc: [], sa: [], ex: [], z: z } : null;
  }
  function hasY() { return !!C && C.P.some(function (p) { return !!yOf(p); }); }
  function yList(list) { return '<ul class="cc-exp">' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function yesangHTML() {
    var h = '<div class="pbar"><a class="back" href="#home">‹ 처음</a><span class="t"></span><span class="nv"></span></div>' +   // 이름은 바로 아래 제목에 있다
      '<header class="phead"><h2>' + Y이름 + '</h2></header>' +
      '<p class="intro">지문마다 시험에 나올 만한 곳을 모았어요. 지문 이름을 누르면 그 지문으로 가요.</p>';
    C.ORDER.forEach(function (g) {
      var ps = C.P.filter(function (p) { return p['묶음'] === g && yOf(p); });
      if (!ps.length) return;
      h += '<section class="ygrp"><h3 class="grp-h">' + esc(g) + '<span>' + ps.length + '지문</span></h3>';
      ps.forEach(function (p) {
        var y = yOf(p);
        h += '<article class="acard ycard"><a class="y-h" href="#' + (hasC(p) ? 'c-' : 'p-') + enc(p.id) + '"><span class="row-l">' + esc(p['이름']) + '</span>' +
          '<span class="y-t">' + esc(p['제목']) + ' ›</span></a>' +
          (y.mc.length ? '<p class="cc-sub">객관식</p>' + yList(y.mc) : '') + (y.sa.length ? '<p class="cc-sub">서답형</p>' + yList(y.sa) : '') +
          (y.ex.length ? yList(y.ex) : '') +
          (y.z.length ? '<ul class="bul">' + y.z.map(function (x) { return '<li>' + safe(x) + '</li>'; }).join('') + '</ul>' : '') + '</article>';
      });
      h += '</section>';
    });
    return h;
  }

  /* ---------- 누른 뒤 한 줄 알림(0.9.0) — 묶음이나 탭을 다 마쳤으면 그 사실을, 다시 볼 것에서 뺐으면 남은 수를 ---------- */
  var 마침말 = { jimun: '다 봤어요', haeksim: '다 외웠어요', seosul: '모두 맞혔어요', eobeop: '모두 확인했어요', dan: '모두 안다고 했어요' };
  function goodOf(tab) { return tab === 'jimun' || tab === 'haeksim' ? 'done' : 'ok'; }
  /* 그 항목이 든 묶음 — 지문 · 핵심 문장 · 서술형(지문이 있으면 그 지문 묶음, 없으면 출처) · 어법. 단어는 묶음을 안 센다 */
  function groupOf(tab, key) {
    var hit, name, keys;
    if (tab === 'jimun' || tab === 'haeksim') {
      var list = tab === 'jimun' ? C.P.map(function (p) { return { key: p.key, g: p['묶음'] }; }) : C.KEYS.map(function (k) { return { key: k.key, g: k.p['묶음'] }; });
      hit = list.filter(function (x) { return x.key === key; })[0];
      if (!hit) return null;
      name = hit.g;
      keys = list.filter(function (x) { return x.g === name; }).map(function (x) { return x.key; });
    } else if (tab === 'seosul') {
      var wg = function (w) { return w['지문'] && C.byId[w['지문']] ? C.byId[w['지문']]['묶음'] : (출처말[w['출처']] || w['출처'] || ''); };
      hit = C.W.filter(function (w) { return w.key === key; })[0];
      if (!hit) return null;
      name = wg(hit);
      keys = C.W.filter(function (w) { return wg(w) === name; }).map(function (w) { return w.key; });
    } else if (tab === 'eobeop') {
      hit = C.G.filter(function (g) { return g.key === key; })[0];
      if (!hit) return null;
      keys = C.G.filter(function (g) { return g['묶음'] === hit['묶음']; }).map(function (g) { return g.key; });
      name = hit['묶음'] === 학습지묶음 ? '학교 학습지' : hit['묶음'];
    } else return null;
    return name ? { name: name, keys: keys } : null;
  }
  function finishMsg(tab, key) {
    var c = counts()[tab];
    if (c.N > 1 && c.n === c.N) return tabName(tab) + ' ' + c.N + '개를 ' + 마침말[tab];
    var g = groupOf(tab, key), good = goodOf(tab);
    if (!g || g.keys.length < 2 || !g.keys.every(function (k) { return st(k) === good; })) return '';
    return g.name + ' ' + tabName(tab) + ' ' + g.keys.length + '개를 ' + 마침말[tab];
  }
  function after(tab, key, prev, now) {
    if (!C.env.toast || prev === now) return;
    var msg = now === goodOf(tab) ? finishMsg(tab, key) : '';
    if (!msg && prev === 're') msg = '다시 볼 것에서 뺐어요 · 남은 ' + counts()[tab].re + '개';
    if (msg) C.env.toast(msg);
  }

  /* ---------- 그리기 ---------- */
  function renderTab(tab) {
    U().tab = tab;
    var body = tab === 'jimun' ? jimunHTML() : tab === 'haeksim' ? haeksimHTML() : tab === 'seosul' ? seosulHTML() : tab === 'eobeop' ? eobeopHTML() : danHTML();
    return tabsHTML(tab) + '<main id="view">' + body + '</main>' + tailHTML();
  }
  function renderPassage(id) { return passageHTML(id) + tailHTML(); }
  function renderAnalysis(id) { return analysisHTML(id) + tailHTML(); }
  function renderConcise(id) { return conciseHTML(id) + tailHTML(); }
  function renderYesang() { return yesangHTML() + tailHTML(); }
  function refreshTabs() {
    var t = document.querySelector('.tabs');
    if (!t) return;
    var a = document.getElementById('tabs-anchor');
    if (a) a.remove();
    var sel = t.querySelector('[aria-selected="true"]');
    t.outerHTML = tabsHTML(sel ? sel.getAttribute('href').slice(1) : '');
    var rc = document.querySelector('.chip[data-val="re"]'), tab = U().tab;   // 다시 볼 것 칩의 수도 맞춘다(0.9.0)
    if (rc && TABNAMES[tab]) rc.textContent = reItem(tab)[1];
  }
  var TABNAMES = { haeksim: 1, seosul: 1, eobeop: 1, dan: 1 };
  function redrawDeck() { var d = document.getElementById('deck'); if (d) d.innerHTML = flashHTML(); }
  function setJudge(card, s, okWord) {
    Array.prototype.forEach.call(card.querySelectorAll('.judge button'), function (x) { x.setAttribute('aria-pressed', s === x.getAttribute('data-v')); });
    var tag = card.querySelector('.state'), hd = card.querySelector('.card-h');
    if (tag) tag.remove();
    if (s) { var sp = document.createElement('span'); sp.className = 'state ' + s; sp.textContent = s === 're' ? '다시 볼 것' : okWord; hd.appendChild(sp); }
  }

  /* ---------- 누르기 — 돌려주는 값: false(내 것이 아니다) · true(처리했다) · 'render'(화면을 다시 그려야 한다) ---------- */
  function click(b) {
    if (!C) return false;
    if (b.hasAttribute('data-chip')) {
      U().f[b.getAttribute('data-chip')] = b.getAttribute('data-val'); saveUi();
      return 'render';
    }
    var act = b.getAttribute('data-act'), card, key, v, cur, now;
    switch (act) {
      case 'sopen':
        var s = b.closest('.s'), open = !s.classList.contains('open');
        s.classList.toggle('open', open); b.setAttribute('aria-expanded', open); return true;
      case 'openall':
        var all = document.querySelectorAll('.sents .s');
        var any = Array.prototype.some.call(all, function (x) { return !x.classList.contains('open'); });
        Array.prototype.forEach.call(all, function (x) { x.classList.toggle('open', any); x.querySelector('.s-btn').setAttribute('aria-expanded', any); });
        b.textContent = any ? '모두 접기' : '모두 펼치기'; return true;
      case 'mode':
        U().mode = b.getAttribute('data-v') === 'ko' ? 'ko' : 'en'; saveUi();
        var box = document.querySelector('.sents');
        if (box) box.setAttribute('data-mode', U().mode);
        Array.prototype.forEach.call(document.querySelectorAll('.modebar button'), function (x) { x.setAttribute('aria-pressed', x === b); });
        return true;
      case 'pdone':
        key = b.getAttribute('data-key'); cur = st(key);
        now = cur === 'done' ? 'none' : 'done';
        setm([[key, now]]);
        b.setAttribute('aria-pressed', now === 'done'); b.textContent = now === 'done' ? '다 봤어요 · 다시 누르면 취소' : '이 지문 다 봤어요';
        after('jimun', key, cur, now);
        return true;
      case 'kshow':
        card = b.closest('.kcard'); card.querySelector('.en-line').hidden = false; b.hidden = true; return true;
      case 'kdone': case 'kre':   // 0.9.0 핵심 문장도 두 칸(다시 볼래요 · 외웠어요) — 누른 칸을 다시 누르면 지운다
        card = b.closest('.kcard'); key = card.getAttribute('data-key'); cur = st(key);
        v = act === 'kre' ? 're' : 'done';
        now = cur === v ? 'none' : v;
        setm([[key, now]]);
        setJudge(card, now === 'none' ? '' : now, '외움');
        after('haeksim', key, cur, now);
        refreshTabs(); return true;
      case 'wko':
        var ko = b.parentNode.querySelector('.sub-ko'); ko.hidden = !ko.hidden; b.textContent = ko.hidden ? '해석 보기' : '해석 접기'; return true;
      case 'wbox':
        var bx = b.parentNode.querySelector('.wbox-b'); bx.hidden = !bx.hidden;
        b.setAttribute('aria-expanded', !bx.hidden); b.textContent = bx.hidden ? '펼치기' : '접기'; return true;
      case 'whint':
        var hp = b.nextElementSibling; hp.hidden = false; b.hidden = true;
        if (hp.nextElementSibling) hp.nextElementSibling.hidden = false;
        return true;
      case 'wshow': case 'gshow':
        card = b.closest('.card'); card.querySelector('.ans').hidden = false; b.hidden = true; return true;
      case 'wj': case 'gj':
        card = b.closest('.card'); key = card.getAttribute('data-key'); v = b.getAttribute('data-v'); cur = okre(st(key));
        now = cur === v ? 'none' : v;
        setm([[key, now]]);
        setJudge(card, now === 'none' ? '' : now, act === 'wj' ? '맞음' : '알겠음');
        after(act === 'wj' ? 'seosul' : 'eobeop', key, cur, now);
        refreshTabs(); return true;
      case 'wm':
        U().wm = b.getAttribute('data-v') === 'd2w' ? 'd2w' : 'w2m'; saveUi(); return 'render';
      case 'dflip':
        deck.open = !deck.open; redrawDeck(); return true;
      case 'dj':
        cur = deck.list[deck.i]; v = b.getAttribute('data-v');
        var was = cur ? st(cur.key) : '';
        if (cur && was !== v) { setm([[cur.key, v]]); after('dan', cur.key, was, v); }
        deck.i++; deck.open = false; redrawDeck(); refreshTabs(); return true;
      case 'dagain':
        deck.key = ''; ensureDeck(); redrawDeck(); return true;
      case 'dre':
        U().f.dan = 're'; saveUi(); deck.key = ''; return 'render';
      case 'dshuf':
        U().shuffle = !U().shuffle; saveUi(); deck.key = ''; ensureDeck(); redrawDeck(); return true;
      case 'wlist':
        U().wlist = !U().wlist; saveUi();
        document.getElementById('wlist').innerHTML = U().wlist ? wordTable() : '';
        b.textContent = U().wlist ? '목록 접기' : '목록으로 한눈에 보기'; return true;
      case 'wlm':
        var m = b.querySelector('.m');
        if (m.classList.contains('cover')) { m.textContent = m.getAttribute('data-m'); m.classList.remove('cover'); } else { m.textContent = ''; m.classList.add('cover'); }
        return true;
      case 'reset':
        document.getElementById('resetbox').innerHTML = '<div class="confirm"><span>진도 체크를 모두 지울까요?</span><button class="reset yes" data-act="resetyes">지우기</button><button class="reset" data-act="resetno">그대로 두기</button></div>';
        return true;
      case 'resetyes':
        var pairs = [];
        var clear = function (k) { if (st(k)) pairs.push([k, 'none']); };
        C.P.forEach(function (p) { clear(p.key); });
        C.KEYS.forEach(function (k) { clear(k.key); });
        C.W.forEach(function (w) { clear(w.key); });
        C.G.forEach(function (g) { clear(g.key); });
        C.UV.forEach(clear);
        setm(pairs); deck.key = '';
        return 'render';
      case 'resetno':
        document.getElementById('resetbox').innerHTML = '<button class="reset" data-act="reset">체크한 진도 지우기</button>'; return true;
      case 'atab':
        aSwitch(b.getAttribute('data-v')); return true;
      case 'pictog':
        var pb = b.parentNode.querySelector('.pic-body'), show = !!(pb && pb.hidden);
        if (!pb) return true;
        pb.hidden = !show;
        b.setAttribute('aria-expanded', show);
        b.querySelector('.pic-arr').textContent = show ? '접기' : '펼치기';
        if (show) {
          Array.prototype.forEach.call(pb.querySelectorAll('img[data-pic-wait]'), function (im) { im.setAttribute('data-pic', im.getAttribute('data-pic-wait')); im.removeAttribute('data-pic-wait'); });
          if (typeof Pics !== 'undefined') Pics.fill(pb);
        }
        return true;
      case 'picfull':
        if (typeof Pics !== 'undefined') Pics.open(b.getAttribute('data-src'), b.getAttribute('data-w'), b.getAttribute('data-h'), b.getAttribute('data-t'), b.getAttribute('data-s'));
        return true;
      case 'achunk':
        var ol = b.nextElementSibling, show = !!(ol && ol.hidden);
        if (ol) ol.hidden = !show;
        b.setAttribute('aria-expanded', show); b.textContent = show ? '끊어 읽기 접기' : '끊어 읽기 보기'; return true;
    }
    return false;
  }

  return {
    setup: setup, ready: function () { return !!C; }, route: route, label: label, href: href,
    tabName: tabName, firstTab: firstTab, heroHTML: heroHTML, progress: progress,
    glanceHTML: glanceHTML, glanceSeen: glanceSeen, cramHTML: cramHTML, endHTML: endHTML, hasYesang: hasY, stats: function () { return C ? doneStats() : null; },
    renderTab: renderTab, renderPassage: renderPassage, renderAnalysis: renderAnalysis, renderConcise: renderConcise, renderYesang: renderYesang, refreshTabs: refreshTabs, click: click,
    data: function () { return C ? C.D : null; },
    util: { esc: esc, safe: safe, enc: enc, plain: plain, underline: underline, blankify: blankify, segHTML: segHTML, gWords: gWords },
    concise: { has: function (id) { return !!(C && C.byId[id] && hasC(C.byId[id])); } },
    analysis: { tabs: function (id) { return C && C.byId[id] ? aTabs(C.byId[id]).map(function (t) { return t.id; }) : []; }, body: function (id, tab) { return aBody(C.byId[id], tab); } }
  };
})();

if (typeof module === 'object' && module.exports) module.exports = Review;
