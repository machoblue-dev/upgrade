/* UP:GRADE — 관리자 화면(구현 사양 5절 「관리자」) · role = admin 일 때만 app.js 가 연다
   ① 현황판 — 학교를 고르면 학생마다 마지막 접속 · 지문 다 봄 · 핵심 외움 · 서술형 · 어법 · 단어.
      N 은 그 학교 공개 판의 수(counts)이고, 판에 없는 key 는 세지 않는다(판 내용을 받아 번호를 맞대 본다)
   ② 학생 관리 — 학교 고치기 · 새 비밀번호 정하기 · 막기/풀기 · 퇴원(이름을 그대로 쳐야 지운다) · 가입 코드 바꾸기
   ③ 자료 판 — 학교·과목마다 판 목록 · 미리보기로 열기 · 공개 · 되돌리기(바로 전 지난 판 번호로 pack_publish)
   ④ 틀린 곳 알림 — 목록 · 처리 표시
   화면 칸마다 data-* 로 숫자를 함께 적어 둔다 — 시험 스크립트가 화면 글이 아니라 이 값을 읽어 맞대 본다 */
var Admin = (function () {
  'use strict';
  var app = null;       // app.js 가 넘겨준 도구 — state · schools · schoolLabel · go · toast · refresh · preview
  var S = {
    packs: null, profiles: null, reports: null, board: {}, cache: {},
    loading: {}, err: {}, school: '', stuSchool: '', openStu: '', ask: '', repAll: false, busy: false
  };
  var SEP = '␟', DAY = 86400000;
  var 칸이름 = [['지문', '지문'], ['핵심', '핵심'], ['서술형', '서술형'], ['어법', '어법'], ['단어', '단어']];

  function esc(s) { return Review.util.esc(s); }
  function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }
  function init(a) { app = a; }
  function reset() { S.packs = S.profiles = S.reports = null; S.board = {}; S.cache = {}; S.loading = {}; S.err = {}; S.ask = ''; S.openStu = ''; }

  /* ---------- 불러오기 ---------- */
  function load(name, fn) {
    if (S.loading[name]) return;
    S.loading[name] = true; S.err[name] = '';
    Promise.resolve().then(fn).then(function () {
      S.loading[name] = false; app.refresh();
    }, function (e) {
      S.loading[name] = false; S.err[name] = Api.words(e) || '불러오지 못했어요'; app.refresh();
    });
  }
  function waitHTML(name) {
    if (S.err[name]) {
      return '<div class="notice"><b>불러오지 못했어요</b><p>' + esc(S.err[name]) + '</p>' +
        '<button class="btn sm" data-act="a-retry" data-what="' + esc(name) + '">다시 불러오기</button></div>';
    }
    return '<p class="empty">불러오는 중이에요</p>';
  }
  async function ensurePacks() { if (!S.packs) S.packs = await Api.adminPacks(); return S.packs; }
  async function ensureProfiles() { if (!S.profiles) S.profiles = await Api.adminProfiles(); return S.profiles; }
  async function ensureReports() { if (!S.reports) S.reports = await Api.adminReports(); return S.reports; }
  async function packData(meta) {
    var k = meta.id + ':' + meta.hash;
    if (S.cache[k]) return S.cache[k];
    var got = await Api.packData(meta.id);
    var d = got && got[0] && got[0].data;
    if (!d || typeof d !== 'object') throw new Error('pack data missing');
    S.cache[k] = d;
    return d;
  }
  function invalidate(what) {
    if (what === 'profiles') { S.profiles = null; S.board = {}; }
    if (what === 'packs') { S.packs = null; S.board = {}; }
    if (what === 'reports') S.reports = null;
  }

  /* ---------- 글 도움 ---------- */
  function ago(ts) {
    var t = Date.parse(ts || '');
    if (isNaN(t)) return '';
    var d = Date.now() - t;
    if (d < 3600000) return Math.max(1, Math.round(d / 60000)) + '분 전';
    if (d < DAY) return Math.round(d / 3600000) + '시간 전';
    if (d < 30 * DAY) return Math.floor(d / DAY) + '일 전';
    return dateText(ts);
  }
  function dateText(ts) {
    var d = new Date(ts || '');
    return isNaN(d.getTime()) ? '' : (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }
  function stale(ts) { var t = Date.parse(ts || ''); return isNaN(t) || Date.now() - t > 7 * DAY; }
  function schoolOptions(cur, withAll) {
    return (withAll ? '<option value="">전체</option>' : '') + app.schools().map(function (s) {
      return '<option value="' + esc(s.name) + '"' + (s.name === cur ? ' selected' : '') + '>' + esc(s.label || s.name) + '</option>';
    }).join('');
  }
  function stName(s) { return s === 'live' ? '공개 중' : (s === 'preview' ? '미리보기' : '지난 판'); }
  function countsText(c) {
    c = c || {};
    return 칸이름.filter(function (x) { return typeof c[x[0]] === 'number'; }).map(function (x) { return x[1] + ' ' + c[x[0]]; }).join(' · ');
  }
  function partTitle(meta) { return (meta.subject ? meta.subject + ' · ' : '') + meta.cycle + ' · 판 ' + meta.version; }
  function subjTok(s) { return s ? s : '~'; }
  function askHTML(text, act, attrs, yes) {
    return '<div class="a-ask" role="alert"><p>' + esc(text) + '</p><div class="btnrow">' +
      '<button class="btn sm warn" data-act="' + act + '"' + attrs + '>' + esc(yes) + '</button>' +
      '<button class="btn sm ghost" data-act="a-no">그만두기</button></div></div>';
  }

  /* ---------- 머리 ---------- */
  function headHTML(what) {
    if (!S.reports && !S.err.reports) load('reports', ensureReports);
    var n = S.reports ? S.reports.filter(function (r) { return !r.resolved; }).length : 0;
    var tabs = [['board', '현황판'], ['students', '학생 관리'], ['packs', '자료 판'], ['reports', '틀린 곳 알림' + (n ? ' ' + n : '')]];
    var cur = what === 'who' ? 'board' : what;
    return '<div class="a-head"><h1 class="page-h">관리</h1><button class="tb" data-act="a-reload">새로 고치기</button></div>' +
      '<nav class="chips anav" aria-label="관리 화면">' + tabs.map(function (t) {
        return '<a class="chip" href="#admin/' + t[0] + '"' + (t[0] === cur ? ' aria-current="page"' : '') + '>' + t[1] + '</a>';
      }).join('') + '</nav>';
  }

  function render(h) {
    var parts = h.split('/'), what = parts[1] || 'board', body;
    if (what === 'who') body = whoHTML(parts[2] || '', parts[3] || '~', parts[4] || '');
    else if (what === 'students') body = studentsHTML();
    else if (what === 'packs') body = packsHTML();
    else if (what === 'reports') body = reportsHTML();
    else { what = 'board'; body = boardHTML(parts[2] || ''); }
    return '<section class="admin">' + headHTML(what) + body + '</section>';
  }

  /* ---------- ① 현황판 ---------- */
  async function loadBoard(school) {
    var packs = await ensurePacks();
    var subs = (app.school(school) || {}).subjects || [];
    var live = packs.filter(function (p) { return p.school === school && p.status === 'live'; })
      .sort(function (a, b) { return subs.indexOf(a.subject) - subs.indexOf(b.subject); });
    var parts = [];
    for (var i = 0; i < live.length; i++) {
      var d = await packData(live[i]);
      parts.push({ meta: live[i], data: d, keys: SyncCore.packKeys(d) });
    }
    var rows = await Api.adminMarks(school);
    S.board[school] = { parts: parts, rows: Array.isArray(rows) ? rows : [] };
  }
  function studentsOf(rows) {
    var map = {}, order = [];
    rows.forEach(function (r) {
      var s = map[r.user_id];
      if (!s) {
        s = map[r.user_id] = { id: r.user_id, name: r.name, email: r.email, blocked: r.blocked, created_at: r.created_at, last_seen: r.last_seen, by: {} };
        order.push(s);
      }
      if (r.subject != null && r.cycle != null) s.by[(r.subject || '') + SEP + r.cycle] = r.marks || {};
    });
    return order;
  }
  function cell(kind, name, text, data) {
    var at = '';
    for (var k in data) at += ' data-' + k + '="' + data[k] + '"';
    return '<div data-stat="' + kind + '"' + at + '><dt>' + name + '</dt><dd>' + text + '</dd></div>';
  }
  function statsHTML(t, counts) {
    counts = counts || {};
    function N(k, alt) { return typeof counts[k] === 'number' ? counts[k] : alt; }
    var nP = N('지문', t.p.N), nK = N('핵심', t.k.N), nW = N('서술형', t.w.N), nG = N('어법', t.g.N), nV = N('단어', t.v.N);
    return '<dl class="stats">' +
      (nP ? cell('p', '지문 다 봄', t.p.done + '/' + nP, { n: t.p.done, total: nP }) : '') +
      (nK ? cell('k', '핵심 외움', t.k.done + '/' + nK, { n: t.k.done, total: nK }) : '') +
      (nW ? cell('w', '서술형', '맞음 ' + t.w.ok + ' · 다시 ' + t.w.re + ' / ' + nW, { ok: t.w.ok, re: t.w.re, total: nW }) : '') +
      (nG ? cell('g', '어법', '알겠음 ' + t.g.ok + ' · 다시 ' + t.g.re + ' / ' + nG, { ok: t.g.ok, re: t.g.re, total: nG }) : '') +
      (nV ? cell('v', '단어', '알아요 ' + t.v.ok + ' · 다시 ' + t.v.re + ' / ' + nV, { ok: t.v.ok, re: t.v.re, total: nV }) : '') +
      '</dl>';
  }
  function seenHTML(s) {
    var old = stale(s.last_seen);
    return '<span class="seen' + (old ? ' stale' : '') + '" data-stale="' + old + '">' +
      (s.last_seen ? '마지막 접속 ' + esc(ago(s.last_seen)) : '한 번도 안 열었어요') + '</span>';
  }
  function boardHTML(school) {
    var list = app.schools();
    if (!school) school = S.school || (app.state.profile && app.state.profile.school) || (list[0] && list[0].name) || '';
    S.school = school;
    var sel = '<label class="fld"><span>학교</span><select data-change="a-school">' + schoolOptions(school, false) + '</select></label>';
    if (!school) return sel + '<p class="empty">학교 목록이 없어요</p>';
    var b = S.board[school], name = 'board:' + school;
    if (!b) { if (!S.err[name]) load(name, function () { return loadBoard(school); }); return sel + waitHTML(name); }
    var studs = studentsOf(b.rows);
    var old = studs.filter(function (s) { return stale(s.last_seen); }).length;
    var out = sel + '<p class="a-sum" data-students="' + studs.length + '" data-stale="' + old + '">학생 ' + studs.length + '명 · 7일 넘게 안 연 학생 ' + old + '명</p>';
    if (!studs.length) return out + '<p class="empty">가입한 학생이 없어요</p>';
    if (!b.parts.length) {
      return out + '<div class="notice"><b>공개된 판이 없어요</b><p>자료 판에서 공개하면 여기에 진도가 나와요.</p></div>' +
        studs.map(function (s) {
          return '<article class="scard" data-uid="' + esc(s.id) + '"><div class="scard-h"><b class="sname">' + esc(s.name) + '</b>' +
            (s.blocked ? '<span class="tagb block">막힘</span>' : '') + seenHTML(s) + '</div></article>';
        }).join('');
    }
    b.parts.forEach(function (part) {
      var m = part.meta, sub = m.subject || '';
      out += '<section class="pgrp" data-subject="' + esc(sub) + '"><h2 class="sec-h">' + esc(partTitle(m)) + '</h2>';
      studs.forEach(function (s) {
        var marks = s.by[sub + SEP + m.cycle] || {};
        var t = SyncCore.tally(function (k) { return Object.prototype.hasOwnProperty.call(marks, k) ? marks[k] : ''; }, part.keys);
        out += '<article class="scard" data-uid="' + esc(s.id) + '"><div class="scard-h">' +
          '<a class="sname" href="#admin/who/' + enc(school) + '/' + enc(subjTok(sub)) + '/' + enc(s.id) + '">' + esc(s.name) + '</a>' +
          (s.blocked ? '<span class="tagb block">막힘</span>' : '') + seenHTML(s) + '</div>' + statsHTML(t, m.counts) + '</article>';
      });
      out += '</section>';
    });
    return out;
  }
  function whoHTML(school, tok, uid) {
    var back = '<a class="back-l" href="#admin/board/' + enc(school) + '">‹ 현황판</a>';
    var b = S.board[school], name = 'board:' + school;
    if (!b) { if (!S.err[name]) load(name, function () { return loadBoard(school); }); return back + waitHTML(name); }
    var subject = tok === '~' ? '' : tok;
    var part = b.parts.filter(function (p) { return (p.meta.subject || '') === subject; })[0];
    var s = studentsOf(b.rows).filter(function (x) { return x.id === uid; })[0];
    if (!s || !part) return back + '<p class="empty">찾지 못했어요</p>';
    var marks = s.by[subject + SEP + part.meta.cycle] || {};
    var D = part.data, P = D['지문'] || [];
    var order = (D['묶음차례'] || []).slice();
    P.forEach(function (p) { if (order.indexOf(p['묶음']) < 0) order.push(p['묶음']); });
    var seen = P.filter(function (p) { return marks[p.key] === 'done'; }).length;
    var out = back + '<h2 class="page-h">' + esc(s.name) + '</h2>' +
      '<p class="a-sum">' + esc(app.schoolLabel(school)) + ' · ' + esc(partTitle(part.meta)) + '</p>' +
      '<p class="a-sum" data-seen="' + seen + '" data-unseen="' + (P.length - seen) + '">본 지문 ' + seen + ' · 안 본 지문 ' + (P.length - seen) + '</p>';
    order.forEach(function (g) {
      var ps = P.filter(function (p) { return p['묶음'] === g; });
      if (!ps.length) return;
      var d = ps.filter(function (p) { return marks[p.key] === 'done'; }).length;
      out += '<section class="grp"><h3 class="grp-h">' + esc(g) + '<span>' + d + '/' + ps.length + ' 다 봄</span></h3>' + ps.map(function (p) {
        var on = marks[p.key] === 'done';
        return '<div class="row"><span><span class="row-l">' + esc(p['이름']) + '</span><span class="row-t">' + esc(p['제목']) + '</span></span>' +
          '<span class="dot' + (on ? ' on' : '') + '" role="img" aria-label="' + (on ? '다 봄' : '아직') + '"></span></div>';
      }).join('') + '</section>';
    });
    return out;
  }

  /* ---------- ② 학생 관리 ---------- */
  function codeHTML() {
    return '<form class="card form" data-form="a-code"><h2 class="sec-h">가입 코드 바꾸기</h2>' +
      '<p class="hint">바꾸면 가입 안내 카드도 함께 고쳐 주세요.</p>' +
      '<label class="fld"><span>새 가입 코드(6자 이상)</span><input name="code" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<p class="msg" role="alert"></p><button class="btn" type="submit">가입 코드 바꾸기</button></form>';
  }
  function profileOf(uid) { return (S.profiles || []).filter(function (p) { return p.id === uid; })[0]; }
  function studentsHTML() {
    if (!S.profiles) { if (!S.err.profiles) load('profiles', ensureProfiles); return codeHTML() + waitHTML('profiles'); }
    var f = S.stuSchool;
    var list = S.profiles.filter(function (p) { return !f || p.school === f; });
    return codeHTML() +
      '<label class="fld top-gap"><span>학교로 거르기</span><select data-change="a-stu-school">' + schoolOptions(f, true) + '</select></label>' +
      '<p class="a-sum" data-count="' + list.length + '">계정 ' + list.length + '개</p>' + list.map(stuCard).join('');
  }
  function stuCard(p) {
    var open = S.openStu === p.id, admin = p.role === 'admin';
    return '<article class="scard" data-uid="' + esc(p.id) + '"><div class="scard-h"><b class="sname">' + esc(p.name) + '</b>' +
      (admin ? '<span class="tagb">관리자</span>' : '') + (p.blocked ? '<span class="tagb block">막힘</span>' : '') +
      '<span class="seen' + (stale(p.last_seen) ? ' stale' : '') + '">' + (p.last_seen ? '마지막 접속 ' + esc(ago(p.last_seen)) : '한 번도 안 열었어요') + '</span></div>' +
      '<p class="smeta">' + esc(app.schoolLabel(p.school)) + ' · ' + esc(p.email || '') + ' · 가입 ' + esc(dateText(p.created_at)) + '</p>' +
      (admin ? '<p class="hint">관리자 계정은 여기서 바꿀 수 없어요.</p>' :
        '<button class="link-btn" data-act="a-open" data-uid="' + esc(p.id) + '">' + (open ? '접기' : '고치기') + '</button>' + (open ? actsHTML(p) : '')) +
      '</article>';
  }
  function actsHTML(p) {
    var u = ' data-uid="' + esc(p.id) + '"';
    var ask = S.ask === 'block:' + p.id
      ? askHTML(p.blocked ? '막기를 풀까요? 다시 자료와 진도가 보여요.' : '막을까요? 로그인은 되지만 자료와 진도가 하나도 안 보여요.', 'a-block-yes', u + ' data-flag="' + (!p.blocked) + '"', p.blocked ? '막기 풀기' : '막기')
      : '';
    return '<div class="acts">' +
      '<form class="act" data-form="a-school"' + u + '><label class="fld"><span>학교 고치기</span><select name="school">' + schoolOptions(p.school, false) + '</select></label>' +
      '<button class="btn sm" type="submit">학교 저장</button></form>' +
      '<form class="act" data-form="a-pw"' + u + '><label class="fld"><span>새 비밀번호 정하기(6자 이상)</span><input name="pw" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<button class="btn sm" type="submit">비밀번호 정하기</button></form>' +
      '<div class="act"><span class="fld-l">막기</span><p class="hint">막으면 로그인은 되지만 자료와 진도가 안 보여요.</p>' +
      '<button class="btn sm' + (p.blocked ? ' ghost' : ' warn') + '" data-act="a-block"' + u + '>' + (p.blocked ? '막기 풀기' : '막기') + '</button>' + ask + '</div>' +
      '<form class="act" data-form="a-remove"' + u + '><label class="fld"><span>퇴원 — 계정과 진도를 모두 지워요. 되돌릴 수 없어요. 이름을 그대로 쳐 주세요</span>' +
      '<input name="confirm" autocomplete="off" data-need="' + esc(p.name) + '"></label>' +
      '<button class="btn sm danger" type="submit" disabled>퇴원 처리</button></form>' +
      '<p class="msg" data-msg="' + esc(p.id) + '" role="alert"></p></div>';
  }

  /* ---------- ③ 자료 판 ---------- */
  function prevOld(list, live) {
    var lt = SyncCore.tsNum(live.created_at), best = null, bt = -Infinity;
    list.forEach(function (p) {
      if (p.status !== 'old') return;
      var t = SyncCore.tsNum(p.created_at);
      if (t > lt || (t === lt && Number(p.id) >= Number(live.id))) return;   // 공개 판보다 뒤에 올린 판은 「바로 전」이 아니다
      if (!best || t > bt || (t === bt && Number(p.id) > Number(best.id))) { best = p; bt = t; }
    });
    return best;
  }
  function packsHTML() {
    if (!S.packs) { if (!S.err.packs) load('packs', ensurePacks); return waitHTML('packs'); }
    if (!S.packs.length) return '<p class="empty">올라온 판이 없어요</p>';
    var groups = [], by = {};
    S.packs.forEach(function (p) {
      var g = p.school + SEP + (p.subject || '');
      if (!by[g]) { by[g] = { school: p.school, subject: p.subject || '', list: [] }; groups.push(by[g]); }
      by[g].list.push(p);
    });
    return '<p class="a-sum">판은 올리기 도구가 미리보기로 올려요. 여기서 열어 본 뒤 공개해요.</p>' + groups.map(function (g) {
      var live = g.list.filter(function (p) { return p.status === 'live'; })[0];
      var prev = live ? prevOld(g.list, live) : null;
      var out = '<section class="pgrp" data-school="' + esc(g.school) + '" data-subject="' + esc(g.subject) + '"><div class="pgrp-h"><h2 class="sec-h">' +
        esc(app.schoolLabel(g.school)) + (g.subject ? ' · ' + esc(g.subject) : '') + '</h2>' +
        (prev ? '<button class="btn sm ghost" data-act="a-rb" data-id="' + esc(prev.id) + '">되돌리기 (판 ' + esc(prev.version) + ')</button>' : '') + '</div>';
      if (prev && S.ask === 'rb:' + prev.id) out += askHTML('바로 전 판(판 ' + prev.version + ')으로 되돌릴까요? 학생 화면이 바로 바뀌어요.', 'a-rb-yes', ' data-id="' + esc(prev.id) + '"', '되돌리기');
      g.list.forEach(function (p) {
        var ct = countsText(p.counts);
        out += '<div class="prow" data-id="' + esc(p.id) + '" data-status="' + esc(p.status) + '"><div class="prow-h"><b>판 ' + esc(p.version) + '</b>' +
          '<span class="tagb ' + esc(p.status) + '">' + stName(p.status) + '</span><span class="smeta">' + esc(p.cycle) + ' · ' + esc(dateText(p.created_at)) + '</span></div>' +
          (ct ? '<p class="smeta">' + esc(ct) + '</p>' : '') + (p.note ? '<p class="smeta">' + esc(p.note) + '</p>' : '') +
          '<div class="btnrow"><button class="btn sm ghost" data-act="a-pv" data-id="' + esc(p.id) + '">미리보기로 열기</button>' +
          (p.status !== 'live' ? '<button class="btn sm" data-act="a-pub" data-id="' + esc(p.id) + '">공개</button>' : '') + '</div>' +
          (S.ask === 'pub:' + p.id ? askHTML('학생들에게 이 판을 공개할까요? 지금 공개된 판은 지난 판이 돼요.', 'a-pub-yes', ' data-id="' + esc(p.id) + '"', '공개하기') : '') +
          '<p class="msg" data-msg="pack:' + esc(p.id) + '" role="alert"></p></div>';
      });
      return out + '</section>';
    }).join('');
  }

  /* ---------- ④ 틀린 곳 알림 ---------- */
  function kindLabel(key) {
    var m = /^([pkwgv]):(.*)$/.exec(key || '');
    if (!m) return key || '';
    var 이름 = { p: '지문', k: '핵심 문장', w: '서술형', g: '어법', v: '단어' }[m[1]];
    if (m[1] === 'p' || m[1] === 'v') return 이름 + ' · ' + m[2];
    var i = m[2].lastIndexOf(':');
    return 이름 + ' · ' + (i > 0 ? m[2].slice(0, i) : m[2]);
  }
  function reportsHTML() {
    if (!S.reports) { if (!S.err.reports) load('reports', ensureReports); return waitHTML('reports'); }
    if (!S.profiles && !S.err.profiles) load('profiles', ensureProfiles);
    var names = {};
    (S.profiles || []).forEach(function (p) { names[p.id] = p.name; });
    var list = S.repAll ? S.reports : S.reports.filter(function (r) { return !r.resolved; });
    var out = '<div class="chips" role="group" aria-label="고르기"><button class="chip" data-act="a-rep-open" aria-pressed="' + !S.repAll + '">처리 안 한 것</button>' +
      '<button class="chip" data-act="a-rep-all" aria-pressed="' + S.repAll + '">전체</button></div>';
    if (!list.length) return out + '<p class="empty">' + (S.repAll ? '알림이 없어요' : '처리할 알림이 없어요') + '</p>';
    return out + list.map(function (r) {
      return '<article class="scard rcard" data-id="' + esc(r.id) + '"><div class="card-h"><span class="tag">' + esc(kindLabel(r.key)) + '</span>' +
        '<span class="src">' + esc(app.schoolLabel(r.school)) + (r.subject ? ' · ' + esc(r.subject) : '') + ' · ' + esc(r.cycle) + '</span>' +
        (r.resolved ? '<span class="state ok">처리함</span>' : '') + '</div>' +
        '<p class="rbody">' + esc(r.body) + '</p>' +
        '<p class="smeta">' + esc(names[r.user_id] || '') + ' · ' + esc(ago(r.created_at)) + '</p><p class="smeta key">' + esc(r.key) + '</p>' +
        (r.resolved ? '' : '<button class="btn sm" data-act="a-resolve" data-id="' + esc(r.id) + '">처리했어요</button>') +
        '<p class="msg" data-msg="rep:' + esc(r.id) + '" role="alert"></p></article>';
    }).join('');
  }

  /* ---------- 하기 ---------- */
  function msgEl(key) {
    var list = document.querySelectorAll('[data-msg]');
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('data-msg') === key) return list[i];
    return null;
  }
  /* 서버에 하나 시키기 — 되면 알림을 띄우고 목록을 새로 받는다. 안 되면 그 자리에 까닭을 적는다(적던 글이 안 지워진다) */
  async function run(fn, okMsg, after, where) {
    if (S.busy) return;
    S.busy = true;
    try {
      await fn();
      S.ask = '';
      invalidate(after);
      app.toast(okMsg);
      app.refresh(true);
    } catch (e) {
      var el = typeof where === 'string' ? msgEl(where) : where;
      var t = Api.words(e);
      if (el) el.textContent = t; else app.toast(t);
    } finally { S.busy = false; }
  }
  async function preview(id) {
    var meta = (S.packs || []).filter(function (p) { return String(p.id) === String(id); })[0];
    if (!meta) return;
    app.toast('판을 여는 중이에요');
    try { app.preview(meta, await packData(meta)); } catch (e) { var el = msgEl('pack:' + id); if (el) el.textContent = Api.words(e); }
  }

  function click(b) {
    var act = b.getAttribute('data-act') || '';
    if (act.indexOf('a-') !== 0) return false;
    var id = b.getAttribute('data-id'), uid = b.getAttribute('data-uid');
    switch (act) {
      case 'a-reload': reset(); app.refresh(true); return true;
      case 'a-retry':
        var w = b.getAttribute('data-what') || '';
        S.err[w] = '';
        if (w === 'packs') S.packs = null;
        if (w === 'profiles') S.profiles = null;
        if (w === 'reports') S.reports = null;
        if (w.indexOf('board:') === 0) { delete S.board[w.slice(6)]; S.packs = null; }
        app.refresh(true); return true;
      case 'a-open': S.openStu = S.openStu === uid ? '' : uid; S.ask = ''; app.refresh(true); return true;
      case 'a-no': S.ask = ''; app.refresh(true); return true;
      case 'a-block': S.ask = 'block:' + uid; app.refresh(true); return true;
      case 'a-block-yes':
        var flag = b.getAttribute('data-flag') === 'true';
        run(function () { return Api.rpc('admin_block', { uid: uid, flag: flag }); }, flag ? '막았어요' : '막기를 풀었어요', 'profiles', uid);
        return true;
      case 'a-pv': preview(id); return true;
      case 'a-pub': S.ask = 'pub:' + id; app.refresh(true); return true;
      case 'a-rb': S.ask = 'rb:' + id; app.refresh(true); return true;
      case 'a-pub-yes': case 'a-rb-yes':
        run(function () { return Api.rpc('pack_publish', { p_id: Number(id) }); }, act === 'a-pub-yes' ? '공개했어요' : '되돌렸어요', 'packs', 'pack:' + id);
        return true;
      case 'a-resolve':
        run(function () { return Api.resolveReport(id); }, '처리했다고 표시했어요', 'reports', 'rep:' + id);
        return true;
      case 'a-rep-open': S.repAll = false; app.refresh(true); return true;
      case 'a-rep-all': S.repAll = true; app.refresh(true); return true;
    }
    return false;
  }

  function submit(form) {
    var kind = form.getAttribute('data-form') || '';
    if (kind.indexOf('a-') !== 0) return false;
    var uid = form.getAttribute('data-uid'), say = form.querySelector('.msg') || msgEl(uid);
    function tell(t) { if (say) say.textContent = t; }
    if (kind === 'a-code') {
      var code = form.elements.code.value.trim();
      if (code.length < 6) { tell('가입 코드는 6자 이상이어야 해요'); return true; }
      run(function () { return Api.rpc('admin_set_join_code', { new_code: code }); }, '가입 코드를 바꿨어요. 가입 안내 카드도 함께 고쳐 주세요', '', say);
    } else if (kind === 'a-school') {
      var sc = form.elements.school.value;
      run(function () { return Api.rpc('admin_set_school', { uid: uid, school: sc }); }, '학교를 고쳤어요', 'profiles', uid);
    } else if (kind === 'a-pw') {
      var pw = form.elements.pw.value;
      if (pw.length < 6) { tell('비밀번호는 6자 이상이어야 해요'); return true; }
      run(function () { return Api.rpc('admin_reset_password', { uid: uid, pw: pw }); }, '새 비밀번호를 정했어요. 학생에게 알려 주세요', '', uid);
    } else if (kind === 'a-remove') {
      var p = profileOf(uid);
      if (!p || form.elements.confirm.value.trim() !== p.name) { tell('이름을 그대로 쳐야 지울 수 있어요'); return true; }
      run(function () { return Api.rpc('admin_remove', { uid: uid }); }, '퇴원 처리했어요', 'profiles', uid);
    }
    return true;
  }

  function input(el) {
    if (el.name === 'confirm' && el.hasAttribute('data-need')) {
      var btn = el.form && el.form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = el.value.trim() !== el.getAttribute('data-need');
      return true;
    }
    return false;
  }

  function change(el) {
    var c = el.getAttribute('data-change') || '';
    if (c === 'a-school') { app.go('admin/board/' + enc(el.value)); return true; }
    if (c === 'a-stu-school') { S.stuSchool = el.value; S.openStu = ''; app.refresh(true); return true; }
    return false;
  }

  return { init: init, reset: reset, render: render, click: click, submit: submit, input: input, change: change, _kindLabel: kindLabel, _prevOld: prevOld };
})();

if (typeof module === 'object' && module.exports) module.exports = Admin;
