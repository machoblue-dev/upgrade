/* UP:GRADE — 폰 저장소(구현 사양 6절 · IndexedDB 「upgrade」의 「kv」 한 칸)

   담는 것
     auth                               로그인(토큰) — api.js 가 쓴다
     profile:<uid>                      내 프로필 사본(끊겼을 때 먼저 그린다)
     schools                            학교 목록 사본
     pack:<학교>|<과목>                 받아 둔 공개 판(판 번호 · 회차 · 해시 · 내용)
     marks:<uid>|<학교>|<과목>|<회차>   진도 {key: {s: state, t: 누른 시각}}
     queue:<uid>                        아직 못 보낸 체크(보낼 목록)
     ui:<uid>                           화면 설정(보는 방식 · 고른 칩 · 과목 · 마지막 화면)
     seen:<uid>|<학교>|<과목>           학생이 마지막으로 본 판 해시(「새 내용이 있어요」 띠)

   IndexedDB 가 막힌 브라우저는 localStorage 로, 그것도 막히면 메모리로 버틴다(메모리는 창을 닫으면 사라진다).
   값은 언제나 복사본으로 돌려준다 — 돌려받은 것을 고쳐도 저장된 것은 안 바뀐다 */
var Store = (function () {
  'use strict';
  var DBNAME = 'upgrade', OS = 'kv', PREFIX = 'upgrade:';
  var db = null, mode = '', opening = null;
  var mem = Object.create(null);          // 저장이 실패한 값은 여기에 남는다(같은 창 안에서는 읽힌다)

  function lsOk() {
    try { var k = PREFIX + '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  }

  function open() {
    if (opening) return opening;
    opening = new Promise(function (resolve) {
      var done = false;
      function fin(m) { if (done) return; done = true; mode = m; resolve(m); }
      function fallback() { fin(lsOk() ? 'ls' : 'mem'); }
      if (typeof indexedDB === 'undefined' || !indexedDB) return fallback();
      var rq;
      try { rq = indexedDB.open(DBNAME, 1); } catch (e) { return fallback(); }
      rq.onupgradeneeded = function () {
        try { if (!rq.result.objectStoreNames.contains(OS)) rq.result.createObjectStore(OS); } catch (e) { /* 아래 onerror 가 받는다 */ }
      };
      rq.onsuccess = function () {
        db = rq.result;
        db.onversionchange = function () { try { db.close(); } catch (e) { /* 이미 닫혔다 */ } db = null; opening = null; };
        fin('idb');
      };
      rq.onerror = fallback;
      /* 사생활 보호 창 등에서 열기가 끝나지 않고 멈추는 경우가 있다 — 4초 뒤 다른 길로 간다 */
      setTimeout(fallback, 4000);
    });
    return opening;
  }

  function req(kind, fn) {
    return new Promise(function (resolve, reject) {
      var t;
      try { t = db.transaction(OS, kind); } catch (e) { reject(e); return; }
      var out, r;
      try { r = fn(t.objectStore(OS)); } catch (e) { reject(e); return; }
      if (r) r.onsuccess = function () { out = r.result; };
      t.oncomplete = function () { resolve(out); };
      t.onerror = t.onabort = function () { reject(t.error || new Error('idb')); };
    });
  }

  async function ready() {
    if (mode === 'idb' && !db) { opening = null; mode = ''; }   // 다른 창이 판을 올려 닫혔다 — 다시 연다
    if (!mode) await open();
  }

  async function get(k) {
    await ready();
    if (k in mem) return clone(mem[k]);
    if (mode === 'idb' && db) {
      try { return await req('readonly', function (s) { return s.get(k); }); } catch (e) { return undefined; }
    }
    if (mode === 'ls') {
      try { var v = localStorage.getItem(PREFIX + k); return v == null ? undefined : JSON.parse(v); } catch (e) { return undefined; }
    }
    return undefined;
  }

  async function set(k, v) {
    await ready();
    if (mode === 'idb' && db) {
      try { await req('readwrite', function (s) { return s.put(v, k); }); delete mem[k]; return true; } catch (e) { /* 아래로 */ }
    } else if (mode === 'ls') {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); delete mem[k]; return true; } catch (e) {
        try { localStorage.removeItem(PREFIX + k); } catch (e2) { /* 그대로 둔다 */ }
      }
    }
    mem[k] = clone(v);
    return false;
  }

  async function del(k) {
    await ready();
    delete mem[k];
    if (mode === 'idb' && db) { try { await req('readwrite', function (s) { return s.delete(k); }); } catch (e) { /* 없으면 그만이다 */ } }
    if (mode === 'ls') { try { localStorage.removeItem(PREFIX + k); } catch (e) { /* 그대로 둔다 */ } }
  }

  function clone(v) {
    if (v === undefined || v === null || typeof v !== 'object') return v;
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  return { open: open, get: get, set: set, del: del, mode: function () { return mode; } };
})();
