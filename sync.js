/* UP:GRADE — 진도 합치기 · 보내기 · 받기(구현 사양 3절)

   SyncCore — 순수 함수만 모았다(화면·저장소·서버를 안 건드린다). node 로 따로 불러 시험한다
   Sync     — 폰에 먼저 쓰고(IndexedDB) 3초 모아 보내고, 열 때 · 과목을 바꿀 때 받아 합친다

   진도 한 칸 = {s: state, t: 누른 시각(ISO)} · state 는 done · ok · re · none
   none 도 시각을 가진 값이다 — 지운 체크가 다른 폰의 옛 체크로 되살아나지 않는다(VOCA꾹 묘비와 같다) */
var SyncCore = (function () {
  'use strict';
  var STATES = { done: 1, ok: 1, re: 1, none: 1 };
  var SEP = '␟';
  var PAGE = 1000;       // 서버가 한 번에 주는 줄 수
  var BATCH = 500;       // 한 번에 보내는 줄 수

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  /* ISO 시각 → 마이크로초 수. 서버는 마이크로초까지(…:03.456789+00:00), 폰은 밀리초까지(…:03.456Z) 적는다.
     Date.parse 는 마이크로초를 버리므로 직접 읽는다. 못 읽으면 -Infinity(누구에게나 진다) */
  function tsNum(t) {
    if (typeof t !== 'string' || !t) return -Infinity;
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:[.,](\d+))?\s*(Z|z|[+-]\d{2}(?::?\d{2})?)?$/.exec(t.trim());
    if (!m) { var ms0 = Date.parse(t); return isNaN(ms0) ? -Infinity : ms0 * 1000; }
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    if (isNaN(ms)) return -Infinity;
    var frac = ((m[7] || '') + '000000').slice(0, 6);
    var off = 0, tz = m[8];
    if (tz && tz !== 'Z' && tz !== 'z') {
      var sign = tz.charAt(0) === '-' ? -1 : 1;
      var hh = +tz.slice(1, 3), mm = +(tz.replace(':', '').slice(3, 5) || 0);
      off = sign * (hh * 60 + mm) * 60000;
    }
    return (ms - off) * 1000 + (+frac);
  }

  /* 새로 누른 시각 — 같은 항목의 앞 시각보다 반드시 늦게 한다(폰 시계가 되돌아가도 새 체크가 진다는 일이 없게) */
  function nextStamp(prevIso, nowMs) {
    var n = Math.floor(nowMs) * 1000;
    var p = tsNum(prevIso);
    if (p >= n) n = (Math.floor(p / 1000) + 1) * 1000;
    return new Date(n / 1000).toISOString();
  }

  function validRow(r) { return !!(r && typeof r.key === 'string' && r.key && r.key !== '__proto__' && has(STATES, r.state)); }

  /* 합치기 — key 마다 시각이 늦은 쪽이 이긴다. 같으면 서버 것. local 은 {key: {s, t}}, rows 는 서버 줄 [{key, state, updated_at}] */
  function merge(local, rows) {
    var out = {}, k;
    local = local || {};
    for (k in local) if (has(local, k) && k !== '__proto__' && local[k] && has(STATES, local[k].s)) out[k] = { s: local[k].s, t: local[k].t };
    (rows || []).forEach(function (r) {
      if (!validRow(r)) return;
      var cur = has(out, r.key) ? out[r.key] : null;
      if (!cur || tsNum(r.updated_at) >= tsNum(cur.t)) out[r.key] = { s: r.state, t: r.updated_at };
    });
    return out;
  }

  /* 화면에서 쓰는 상태 — none 은 「체크 없음」과 같다 */
  function stateOf(marks, key) {
    var m = marks && has(marks, key) ? marks[key] : null;
    return m && m.s && m.s !== 'none' ? m.s : '';
  }

  /* ── 보낼 목록 ── {qid: {school, subject, cycle, key, state, updated_at}} — 같은 항목은 마지막 것 하나만 둔다 */
  function qid(e) { return [e.school, e.subject, e.cycle, e.key].join(SEP); }

  function enqueue(queue, e) {
    var out = {}, k;
    for (k in queue) if (has(queue, k)) out[k] = queue[k];
    out[qid(e)] = { school: e.school, subject: e.subject, cycle: e.cycle, key: e.key, state: e.state, updated_at: e.updated_at };
    return out;
  }

  function queueList(queue) {
    var list = [], k;
    for (k in queue) if (has(queue, k)) list.push(queue[k]);
    return list.sort(function (a, b) {
      var x = tsNum(a.updated_at), y = tsNum(b.updated_at);
      if (x !== y) return x < y ? -1 : 1;
      var p = qid(a), q = qid(b);
      return p < q ? -1 : (p > q ? 1 : 0);
    });
  }

  function batches(list, size) {
    size = size > 0 ? size : BATCH;
    var out = [];
    for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  /* 서버로 보내는 줄 — 칸 일곱 개(구현 사양 3절) */
  function toRows(list, uid) {
    return list.map(function (e) {
      return { user_id: uid, school: e.school, subject: e.subject, cycle: e.cycle, key: e.key, state: e.state, updated_at: e.updated_at };
    });
  }

  /* 보낸 뒤 — 보내는 동안 다시 누른 항목(시각이 바뀐 것)은 남긴다 */
  function afterSend(queue, sent) {
    var out = {}, k;
    for (k in queue) if (has(queue, k)) out[k] = queue[k];
    (sent || []).forEach(function (e) {
      var id = qid(e), cur = has(out, id) ? out[id] : null;
      if (cur && cur.updated_at === e.updated_at && cur.state === e.state) delete out[id];
    });
    return out;
  }

  /* 받은 뒤 — 서버에 이미 같은 것이 있거나 더 늦은 것이 있으면 보낼 필요가 없다 */
  function pruneQueue(queue, scope, rows) {
    var best = {};
    (rows || []).forEach(function (r) {
      if (!validRow(r)) return;
      var cur = has(best, r.key) ? best[r.key] : null;
      if (!cur || tsNum(r.updated_at) >= tsNum(cur.updated_at)) best[r.key] = r;
    });
    var out = {}, k;
    for (k in queue) {
      if (!has(queue, k)) continue;
      var e = queue[k];
      if (scope && e.school === scope.school && e.subject === scope.subject && e.cycle === scope.cycle && has(best, e.key)) {
        var a = tsNum(best[e.key].updated_at), b = tsNum(e.updated_at);
        if (a > b || (a === b && best[e.key].state === e.state)) continue;
      }
      out[k] = e;
    }
    return out;
  }

  /* 이어 받기 — 한 번에 1000줄까지만 오므로 1000줄보다 적게 올 때까지 offset 을 늘려 받는다.
     서버가 늘 꽉 찬 쪽을 주는 고장에 빠져도 끝나도록 쪽 수에 상한을 둔다 */
  async function fetchAll(fetchPage, pageSize, maxPages) {
    pageSize = pageSize > 0 ? pageSize : PAGE;
    maxPages = maxPages > 0 ? maxPages : 200;
    var all = [];
    for (var i = 0; i < maxPages; i++) {
      var rows = await fetchPage(i * pageSize, pageSize);
      if (!Array.isArray(rows)) throw new Error('page ' + i + ' is not a list');
      for (var j = 0; j < rows.length; j++) all.push(rows[j]);
      if (rows.length < pageSize) return all;
    }
    return all;
  }

  /* 판 하나에 든 번호들 — 지금 판에 없는 key 는 세지 않기 위해 쓴다 */
  function packKeys(D) {
    D = D || {};
    var p = [], k = [], w = [], g = [], v = [], seenV = {};
    (D['지문'] || []).forEach(function (x) {
      if (x.key) p.push(x.key);
      (x['핵심키'] || []).forEach(function (kk) { if (kk) k.push(kk); });
    });
    (D['서술형'] || []).forEach(function (x) { if (x.key) w.push(x.key); });
    (D['어법'] || []).forEach(function (x) { if (x.key) g.push(x.key); });
    (D['단어'] || []).forEach(function (x) { if (x.key && !has(seenV, x.key)) { seenV[x.key] = 1; v.push(x.key); } });
    return { p: p, k: k, w: w, g: g, v: v };
  }

  /* 세기 — get(key) 가 state 를 돌려준다(학생 폰은 진도 사본, 관리자 현황판은 서버가 준 {key: state}) */
  function tally(get, keys) {
    function n(list, s) { var c = 0; for (var i = 0; i < list.length; i++) if (get(list[i]) === s) c++; return c; }
    return {
      p: { done: n(keys.p, 'done'), N: keys.p.length },
      k: { done: n(keys.k, 'done'), N: keys.k.length },
      w: { ok: n(keys.w, 'ok'), re: n(keys.w, 're'), N: keys.w.length },
      g: { ok: n(keys.g, 'ok'), re: n(keys.g, 're'), N: keys.g.length },
      v: { ok: n(keys.v, 'ok'), re: n(keys.v, 're'), N: keys.v.length }
    };
  }

  return {
    STATES: STATES, PAGE: PAGE, BATCH: BATCH,
    tsNum: tsNum, nextStamp: nextStamp, merge: merge, stateOf: stateOf,
    qid: qid, enqueue: enqueue, queueList: queueList, batches: batches, toRows: toRows,
    afterSend: afterSend, pruneQueue: pruneQueue, fetchAll: fetchAll, packKeys: packKeys, tally: tally
  };
})();

/* ─────────────────────────────────────────────────────────────────────────
   Sync — 폰에 먼저 쓰고 모아 보낸다. 화면(app.js)은 get · setMany · flush · pull 만 부른다 */
var Sync = (function () {
  'use strict';
  var C = SyncCore;
  var st = {
    uid: '', scope: null, marks: {}, queue: {},
    gate: function () { return { ok: false }; },   // 보내도 되는가 — app.js 가 정한다(막힌 학생 · 판 없는 학교는 안 보낸다)
    timer: 0, retry: 0, flushing: null, again: false, hooks: []
  };

  function mkey(uid, sc) { return 'marks:' + uid + '|' + sc.school + '|' + sc.subject + '|' + sc.cycle; }
  function qkey(uid) { return 'queue:' + uid; }
  function notify(what, info) { st.hooks.forEach(function (f) { try { f(what, info); } catch (e) { /* 화면 쪽 오류는 보내기와 상관없다 */ } }); }

  async function openUser(uid) {
    st.uid = uid;
    st.queue = uid ? ((await Store.get(qkey(uid))) || {}) : {};
    st.scope = null;
    st.marks = {};
  }

  async function openScope(sc) {
    st.scope = sc ? { school: sc.school, subject: sc.subject || '', cycle: sc.cycle } : null;
    st.marks = st.scope && st.uid ? ((await Store.get(mkey(st.uid, st.scope))) || {}) : {};
  }

  function get(key) { return C.stateOf(st.marks, key); }

  function saveQueue() { return Store.set(qkey(st.uid), st.queue); }

  /* 체크 여러 개를 한꺼번에 — [[key, state], …]. 폰에 먼저 쓰고 보낼 목록에 넣은 뒤 3초 뒤 보낸다 */
  async function setMany(pairs) {
    if (!st.scope || !st.uid) return;
    var sc = st.scope, now = Date.now(), changed = 0;
    pairs.forEach(function (pr) {
      var key = pr[0], s = pr[1];
      if (!key || !C.STATES[s]) return;
      var prev = st.marks[key];
      if (prev && prev.s === s) return;                       // 같은 것을 다시 적지 않는다
      if (!prev && s === 'none') return;                      // 없던 체크를 지울 것도 없다
      var t = C.nextStamp(prev && prev.t, now);
      st.marks[key] = { s: s, t: t };
      st.queue = C.enqueue(st.queue, { school: sc.school, subject: sc.subject, cycle: sc.cycle, key: key, state: s, updated_at: t });
      changed++;
    });
    if (!changed) return;
    await Store.set(mkey(st.uid, sc), st.marks);
    await saveQueue();
    notify('marked', changed);
    schedule(3000);
  }

  function schedule(ms) {
    clearTimeout(st.timer);
    st.timer = setTimeout(function () { st.timer = 0; flush().catch(function () { /* 다음 기회에 다시 보낸다 */ }); }, ms);
  }

  function pending() { return C.queueList(st.queue).length; }

  function flush(opt) {
    if (st.flushing) { st.again = true; return st.flushing; }
    var p = (async function () {
      var out = { sent: 0 };
      try {
        do { st.again = false; out = await flushOnce(opt || {}); } while (st.again);
      } finally { st.flushing = null; }
      return out;
    })();
    st.flushing = p;
    return p;
  }

  async function flushOnce(opt) {
    clearTimeout(st.timer); st.timer = 0;
    var list = C.queueList(st.queue);
    if (!list.length || !st.uid) return { sent: 0 };
    var gate = st.gate();
    if (!gate.ok) return { sent: 0, held: list.length };
    /* 지금 내 학교가 아닌 줄은 서버 규칙이 받지 않는다(관리자가 학교를 고친 경우) — 목록에서 뺀다 */
    var mine = list.filter(function (e) { return e.school === gate.school; });
    if (mine.length !== list.length) {
      list.forEach(function (e) { if (e.school !== gate.school) delete st.queue[C.qid(e)]; });
      await saveQueue();
    }
    var sent = 0, parts = C.batches(mine, C.BATCH);
    for (var i = 0; i < parts.length; i++) {
      var b = parts[i], body = JSON.stringify(C.toRows(b, st.uid));
      try {
        await Api.upsertMarks(body, !!opt.keepalive && body.length < 60000);
      } catch (e) {
        if (e.offline || e.status >= 500 || e.status === 429 || e.status === 408) { retryLater(); notify('held', e); return { sent: sent, error: e }; }
        if (e.status === 401 || e.status === 403 || e.sessionGone) { notify('denied', e); return { sent: sent, error: e }; }
        /* 그 밖(400 등) — 서버 규칙에 안 맞는 줄이다. 다시 보내도 안 되므로 목록에서 빼고 넘어간다 */
        st.queue = C.afterSend(st.queue, b);
        await saveQueue();
        notify('dropped', e);
        continue;
      }
      st.queue = C.afterSend(st.queue, b);
      await saveQueue();
      sent += b.length;
    }
    st.retry = 0;
    notify('flushed', sent);
    return { sent: sent };
  }

  function retryLater() {
    st.retry = Math.min((st.retry || 0) + 1, 6);
    schedule(Math.min(30000 * st.retry, 180000));
  }

  /* 받기 — 지금 과목·회차의 진도를 다 받아 합친다 */
  async function pull() {
    var sc = st.scope;
    if (!sc || !st.uid) return 0;
    var rows = await C.fetchAll(function (off) { return Api.marksPage(sc, off); }, C.PAGE);
    if (st.scope !== sc) return 0;                           // 받는 동안 과목이 바뀌었다
    st.marks = C.merge(st.marks, rows);
    await Store.set(mkey(st.uid, sc), st.marks);
    st.queue = C.pruneQueue(st.queue, sc, rows);
    await saveQueue();
    notify('pulled', rows.length);
    return rows.length;
  }

  return {
    openUser: openUser, openScope: openScope, get: get, setMany: setMany,
    set: function (key, s) { return setMany([[key, s]]); },
    flush: flush, pull: pull, pending: pending,
    setGate: function (f) { st.gate = f; },
    on: function (f) { st.hooks.push(f); },
    scope: function () { return st.scope; },
    marks: function () { return st.marks; }
  };
})();

if (typeof module === 'object' && module.exports) module.exports = SyncCore;
