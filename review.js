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
   · 0.3.0 발음 듣기 단추(data-act="say") — 단어 카드 · 핵심 문장(영어를 연 뒤) · 지문 문장(누른 뒤). 읽기는 app.js 가 한다 */
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
    var TABS = [
      { id: 'jimun', name: '지문', n: P.length }, { id: 'haeksim', name: '핵심 문장', n: KEYS.length },
      { id: 'seosul', name: '서술형', n: W.length }, { id: 'eobeop', name: '어법', n: G.length }, { id: 'dan', name: '단어', n: V.length }
    ].filter(function (t) { return t.n > 0; });       // 내용이 없는 탭은 세우지 않는다
    var ui = env.ui;
    if (!ui.f || typeof ui.f !== 'object') ui.f = {};
    if (ui.mode !== 'ko') ui.mode = 'en';
    if (ui.wm !== 'd2w') ui.wm = 'w2m';
    C = {
      D: D, P: P, W: W, G: G, V: V, byId: byId, wByP: wByP, vByP: vByP, KEYS: KEYS, UV: UV,
      ORDER: 차례(D['묶음차례'], P, '묶음'), GORDER: 차례(D['어법묶음'], G, '묶음'),
      HASMARK: HASMARK, TABS: TABS, env: env
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

  /* ---------- 라우팅 — 주소(# 뒤, 이미 풀어 둔 글)를 받는다 ---------- */
  function route(h) {
    if (!C) return null;
    if (h.indexOf('p-') === 0) return C.byId[h.slice(2)] ? { view: 'p', id: h.slice(2) } : null;
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
    var p = C.byId[r.id];
    return pLabel(p) + ' — ' + p['제목'];
  }
  function href(h) { return h.indexOf('p-') === 0 ? 'p-' + enc(h.slice(2)) : h; }

  function counts() {
    function n(list, keyOf, s) { var c = 0; each(list, function (x) { if (st(keyOf(x)) === s) c++; }); return c; }
    var id = function (x) { return x; };
    return {
      jimun: { n: n(C.P, function (p) { return p.key; }, 'done'), N: C.P.length, re: 0 },
      haeksim: { n: n(C.KEYS, function (k) { return k.key; }, 'done'), N: C.KEYS.length, re: 0 },
      seosul: { n: n(C.W, function (w) { return w.key; }, 'ok'), N: C.W.length, re: n(C.W, function (w) { return w.key; }, 're') },
      eobeop: { n: n(C.G, function (g) { return g.key; }, 'ok'), N: C.G.length, re: n(C.G, function (g) { return g.key; }, 're') },
      dan: { n: n(C.UV, id, 'ok'), N: C.UV.length, re: n(C.UV, id, 're') }
    };
  }
  function tabCount(id) { var c = counts()[id]; return c.n + '/' + c.N; }
  var 뜻말 = { jimun: '다 봄', haeksim: '외움', seosul: '맞음', eobeop: '알겠음', dan: '알아요' };
  /* 첫 화면 탭별 진도 — [{id, name, n, N, re, what}] */
  function progress() {
    var c = counts();
    return C.TABS.map(function (t) { return { id: t.id, name: t.name, n: c[t.id].n, N: c[t.id].N, re: c[t.id].re, what: 뜻말[t.id] }; });
  }

  /* ---------- 첫 화면 머리 · 시험 한눈에 ---------- */
  function heroHTML() {
    var D = C.D, dbox = '', d = dday();
    if (d !== null) {
      var dtxt = d > 0 ? 'D-' + d : (d === 0 ? 'D-DAY' : '끝');
      dbox = '<div class="dbox"><span class="l">' + 시험이름() + '</span><span class="n">' + dtxt + '</span><span class="d">' + 날짜말(D['시험일']) + '</span></div>';
    }
    var 문항 = (D['문항'] || []).length ? '<div class="g-score">' + D['문항'].map(function (x) {
      return '<div class="g-cell"><span class="k">' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b>' + (x[2] ? '<span class="p">' + esc(x[2]) + '</span>' : '') + '</div>';
    }).join('') + '</div>' : '';
    var y = 해();
    var 제목 = String(D['제목'] || '').replace(/폰\s*복습/g, '복습');   // 폰복습 데이터의 「영어 폰 복습」 — 앱에서는 「영어 복습」
    /* 머리 카드 아래 전체 진도 — 다섯 갈래 진도를 더한 것(첫 화면 진도 카드와 같은 셈) */
    var 합 = 0, 전체 = 0;
    progress().forEach(function (x) { 합 += x.n; 전체 += x.N; });
    var 진도 = 전체 ? '<div class="hero-prog"><div class="hp-row"><span>전체 진도</span><span>' + 합 + ' / ' + 전체 + '</span></div>' +
      '<span class="hp-bar" aria-hidden="true"><i style="width:' + Math.round(합 * 100 / 전체) + '%"></i></span></div>' : '';
    return '<header class="hero">' +
      '<div class="hero-card"><div class="hero-main"><h1><small>' + (y ? y + ' · ' : '') + esc(D['학교표시']) + '</small>' + safe(제목) + '</h1>' + dbox + '</div>' +
      진도 + '</div>' +
      '</header>' +
      '<section class="glance" aria-label="시험 한눈에">' + 문항 +
      '<ul class="g-src">' + (D['범위'] || []).map(function (x) {
        var c = x['수'] ? x['수'] + '지문' : (x['덧'] || '');
        return '<li><b>' + esc(x['이름']) + '</b>' + esc(x['표기']) + (c ? ' <span class="c">' + esc(c) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<p class="g-howto">누르면 해석과 답이 나와요. 체크한 진도는 폰을 바꿔도 이어져요.</p>' +
      '</section>';
  }

  function tabsHTML(cur) {
    return '<div id="tabs-anchor"></div><nav class="tabs" role="tablist" aria-label="복습 종류" style="grid-template-columns:repeat(' + Math.max(C.TABS.length, 1) + ',minmax(0,1fr))">' +
      C.TABS.map(function (t) {
        return '<a class="tab" role="tab" href="#' + t.id + '" aria-selected="' + (t.id === cur) + '"><span>' + t.name + '</span><i>' + tabCount(t.id) + '</i></a>';
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
  function jimunHTML() {
    var items = grpItems(), f = chipVal('jimun', items);
    var out = '<p class="intro">지문을 누르면 문장마다 해석이 나와요. 한글을 보고 영어를 떠올리는 방식으로도 볼 수 있어요.</p>' + chipsHTML('jimun', items);
    C.ORDER.forEach(function (g) {
      if (f !== 'all' && f !== g) return;
      var ps = C.P.filter(function (p) { return p['묶음'] === g; });
      var done = ps.filter(function (p) { return st(p.key) === 'done'; }).length;
      out += '<section class="grp"><h3 class="grp-h">' + esc(g) + '<span>' + ps.length + '지문 · ' + done + ' 다 봄</span></h3>';
      ps.forEach(function (p) {
        var on = st(p.key) === 'done';
        out += '<a class="row" href="#p-' + enc(p.id) + '"><span><span class="row-l">' + esc(p['이름']) + '</span>' +
          '<span class="row-t">' + esc(p['제목']) + '</span>' +
          (p['영제목'] ? '<span class="row-e">' + esc(p['영제목']) + '</span>' : '') + '</span>' +
          '<span class="dot' + (on ? ' on' : '') + '" role="img" aria-label="' + (on ? '다 봄' : '아직') + '"></span></a>';
      });
      out += '</section>';
    });
    return out;
  }

  /* ---------- 탭: 핵심 문장 ---------- */
  function haeksimHTML() {
    var items = grpItems(), f = chipVal('haeksim', items);
    var out = '<p class="intro">지문마다 먼저 외워 둘 핵심 문장이에요. 한글을 보고 영어 문장을 먼저 말해 본 뒤 눌러요.</p>' + chipsHTML('haeksim', items);
    C.ORDER.forEach(function (g) {
      if (f !== 'all' && f !== g) return;
      var ks = C.KEYS.filter(function (k) { return k.p['묶음'] === g; });
      if (!ks.length) return;
      out += '<section class="grp"><h3 class="grp-h">' + esc(g) + '<span>' + ks.length + '문장 · ' +
        ks.filter(function (k) { return st(k.key) === 'done'; }).length + ' 외움</span></h3><div class="cards">';
      ks.forEach(function (k) {
        var s = sentence(k.p, k.n), on = st(k.key) === 'done';
        out += '<article class="card kcard" data-key="' + esc(k.key) + '"><div class="card-h"><span class="tag">' + esc(k.p['이름']) + ' · 문장 ' + k.n + '</span>' +
          '<a class="src" href="#p-' + enc(k.p.id) + '">' + esc(k.p['제목']) + ' ›</a></div>' +
          '<p class="ko-line">' + esc(s.ko) + '</p>' +
          '<button class="show" data-act="kshow">영어 문장 보기</button>' +
          '<div class="en-line" hidden><p class="en" style="margin:0">' + safe(s.html) + '</p>' + sayBtn(s.html) + '</div>' +
          '<button class="mini" data-act="kdone" aria-pressed="' + on + '">' + (on ? '외웠어요' : '외웠으면 누르기') + '</button>' +
          '</article>';
      });
      out += '</div></section>';
    });
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
  function stateTag(s, okWord) { return s ? '<span class="state ' + s + '">' + (s === 'ok' ? okWord : '다시 볼 것') + '</span>' : ''; }
  function wCard(w, withSrc) {
    var s = okre(st(w.key));
    var h = '<article class="card" data-key="' + esc(w.key) + '" data-kind="w"><div class="card-h"><span class="tag">' + esc(w['틀']) + '</span>' +
      (withSrc ? '<span class="src">' + esc(wSrc(w)) + '</span>' : '') + stateTag(s, '맞음') + '</div>';
    var m = w['모양'];
    if (m === '밑줄') {
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
    h += '<button class="reveal" data-act="wshow">답 보기</button><div class="ans" hidden>' +
      '<span class="lab">답</span><p class="' + (/[가-힣]/.test(w['답'] || '') ? 'ko-a' : 'en') + '" style="margin:0">' + esc(w['답']) + '</p>' +
      (w['원문'] ? '<p class="orig">' + esc(w['원문라벨'] || '원문') + ' — <span class="en">' + esc(w['원문']) + '</span></p>' : '') +
      (w['포인트'] ? '<p class="tip"><span class="lab">빠뜨리기 쉬운 곳</span>' + esc(w['포인트']) + '</p>' : '') +
      '<div class="judge"><button data-act="wj" data-v="ok" aria-pressed="' + (s === 'ok') + '">맞았어요</button><button data-act="wj" data-v="re" aria-pressed="' + (s === 're') + '">다시 볼래요</button></div>' +
      '</div>' + repBtn(w.key, '서술형 · ' + (wSrc(w) || w['틀'] || '')) + '</article>';
    return h;
  }
  function seosulHTML() {
    var items = [['all', '전체']].concat(있는출처(C.W).map(function (k) { return [k, 출처말[k] || k]; })).concat([['re', '다시 볼 것']]);
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
      '<div class="judge"><button data-act="gj" data-v="ok" aria-pressed="' + (s === 'ok') + '">알겠어요</button><button data-act="gj" data-v="re" aria-pressed="' + (s === 're') + '">다시 볼래요</button></div></div>' +
      repBtn(g.key, '어법 · ' + (g['코드'] ? g['코드'] + ' · ' : '') + (g['이름'] || '')) + '</article>';
  }
  function eobeopHTML() {
    var items = [['all', '전체']].concat(C.GORDER.map(function (g) { return [g, g === 학습지묶음 ? '학교 학습지' : g]; })).concat([['re', '다시 볼 것']]);
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
    return [['all', '전체']].concat(학교있음 ? [['school', '학교 낱말']] : [])
      .concat(있는출처(C.V).map(function (k) { return [k, 출처말[k] || k]; })).concat([['re', '다시 볼 것']]);
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
    h += '</button></div>';
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

  /* ---------- 지문 한 화면 ---------- */
  function passageHTML(id) {
    var p = C.byId[id], i = p._i, prev = C.P[i - 1], next = C.P[i + 1];
    var keyset = {}; (p['핵심'] || []).forEach(function (n) { keyset[n] = 1; });
    var hasMark = (p['문장'] || []).some(function (s) { return (s['짚음'] || []).length; });
    var mode = U().mode === 'ko' ? 'ko' : 'en';
    var h = '<div class="pbar"><a class="back" href="#jimun">‹ 목록</a><span class="t">' + esc(pLabel(p)) + '</span><span class="nv">' +
      (prev ? '<a href="#p-' + enc(prev.id) + '" aria-label="이전 지문">‹</a>' : '<span aria-hidden="true">‹</span>') +
      (next ? '<a href="#p-' + enc(next.id) + '" aria-label="다음 지문">›</a>' : '<span aria-hidden="true">›</span>') + '</span></div>';
    h += '<header class="phead"><p class="eyebrow">' + esc(pLabel(p)) + '</p><h2>' + esc(p['제목']) + '</h2>' +
      (p['영제목'] ? '<p class="en-t">' + esc(p['영제목']) + '</p>' : '') + '</header>';
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
    if (ws.length) h += '<section class="blk"><h3>이 지문 서술형 <small>' + ws.length + '문항</small></h3><div class="cards">' + ws.map(function (w) { return wCard(w, false); }).join('') + '</div></section>';
    var vs = C.vByP[p.id] || [];
    if (vs.length) h += '<section class="blk"><h3>이 지문 단어 <small>' + vs.length + '개 · 누르면 뜻</small></h3><ul class="wl">' + vs.map(wordItem).join('') + '</ul></section>';
    var done = st(p.key) === 'done';
    h += '<button class="done-btn" data-act="pdone" data-key="' + esc(p.key) + '" aria-pressed="' + done + '">' + (done ? '다 봤어요 · 다시 누르면 취소' : '이 지문 다 봤어요') + '</button>';
    h += repBtn(p.key, '지문 · ' + pLabel(p) + ' — ' + (p['제목'] || ''));
    h += '<nav class="pn">' + (prev ? '<a href="#p-' + enc(prev.id) + '"><span class="k">‹ 이전 지문</span><span class="t">' + esc(prev['제목']) + '</span></a>' : '<span></span>') +
      (next ? '<a class="nx" href="#p-' + enc(next.id) + '"><span class="k">다음 지문 ›</span><span class="t">' + esc(next['제목']) + '</span></a>' : '<span></span>') + '</nav>';
    return h;
  }

  /* ---------- 그리기 ---------- */
  function renderTab(tab) {
    U().tab = tab;
    var body = tab === 'jimun' ? jimunHTML() : tab === 'haeksim' ? haeksimHTML() : tab === 'seosul' ? seosulHTML() : tab === 'eobeop' ? eobeopHTML() : danHTML();
    return tabsHTML(tab) + '<main id="view">' + body + '</main>' + tailHTML();
  }
  function renderPassage(id) { return passageHTML(id) + tailHTML(); }
  function refreshTabs() {
    var t = document.querySelector('.tabs');
    if (!t) return;
    var a = document.getElementById('tabs-anchor');
    if (a) a.remove();
    var sel = t.querySelector('[aria-selected="true"]');
    t.outerHTML = tabsHTML(sel ? sel.getAttribute('href').slice(1) : '');
  }
  function redrawDeck() { var d = document.getElementById('deck'); if (d) d.innerHTML = flashHTML(); }
  function setJudge(card, s, okWord) {
    Array.prototype.forEach.call(card.querySelectorAll('.judge button'), function (x) { x.setAttribute('aria-pressed', s === x.getAttribute('data-v')); });
    var tag = card.querySelector('.state'), hd = card.querySelector('.card-h');
    if (tag) tag.remove();
    if (s) { var sp = document.createElement('span'); sp.className = 'state ' + s; sp.textContent = s === 'ok' ? okWord : '다시 볼 것'; hd.appendChild(sp); }
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
        key = b.getAttribute('data-key');
        now = st(key) === 'done' ? 'none' : 'done';
        setm([[key, now]]);
        b.setAttribute('aria-pressed', now === 'done'); b.textContent = now === 'done' ? '다 봤어요 · 다시 누르면 취소' : '이 지문 다 봤어요';
        return true;
      case 'kshow':
        card = b.closest('.kcard'); card.querySelector('.en-line').hidden = false; b.hidden = true; return true;
      case 'kdone':
        card = b.closest('.kcard'); key = card.getAttribute('data-key');
        now = st(key) === 'done' ? 'none' : 'done';
        setm([[key, now]]);
        b.setAttribute('aria-pressed', now === 'done'); b.textContent = now === 'done' ? '외웠어요' : '외웠으면 누르기';
        refreshTabs(); return true;
      case 'wko':
        var ko = b.parentNode.querySelector('.sub-ko'); ko.hidden = !ko.hidden; b.textContent = ko.hidden ? '해석 보기' : '해석 접기'; return true;
      case 'wshow': case 'gshow':
        card = b.closest('.card'); card.querySelector('.ans').hidden = false; b.hidden = true; return true;
      case 'wj': case 'gj':
        card = b.closest('.card'); key = card.getAttribute('data-key'); v = b.getAttribute('data-v');
        now = okre(st(key)) === v ? 'none' : v;
        setm([[key, now]]);
        setJudge(card, now === 'none' ? '' : now, act === 'wj' ? '맞음' : '알겠음');
        refreshTabs(); return true;
      case 'wm':
        U().wm = b.getAttribute('data-v') === 'd2w' ? 'd2w' : 'w2m'; saveUi(); return 'render';
      case 'dflip':
        deck.open = !deck.open; redrawDeck(); return true;
      case 'dj':
        cur = deck.list[deck.i]; v = b.getAttribute('data-v');
        if (cur && st(cur.key) !== v) setm([[cur.key, v]]);
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
    }
    return false;
  }

  return {
    setup: setup, ready: function () { return !!C; }, route: route, label: label, href: href,
    tabName: tabName, firstTab: firstTab, heroHTML: heroHTML, progress: progress,
    renderTab: renderTab, renderPassage: renderPassage, refreshTabs: refreshTabs, click: click,
    data: function () { return C ? C.D : null; },
    util: { esc: esc, safe: safe, enc: enc, plain: plain, underline: underline, blankify: blankify }
  };
})();

if (typeof module === 'object' && module.exports) module.exports = Review;
