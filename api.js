/* UP:GRADE — 서버 요청(구현 사양 4절)
   supabase-js 를 쓰지 않고 fetch 로 직접 부른다(VOCA꾹과 같다).
   · 모든 요청에 apikey(공개 열쇠), 로그인 뒤에는 Authorization: Bearer <access_token>
   · 토큰 새로 받기는 이 파일 한 곳에서만 하고, 동시에 두 번 안 가게 약속(promise) 하나로 묶는다
   · 401(토큰이 낡았다)이면 한 번 새로 받고 같은 요청을 다시 보낸다
   · 오류는 학생이 알아듣는 말로 바꿔 보인다(words) */
var Api = (function () {
  'use strict';
  var session = null;       // {access_token, refresh_token, exp(초 · 이 폰 시계 기준), user: {id, email}}
  var refreshing = null;    // 새로 받는 중인 약속 — 하나만 돈다
  var hooks = { expired: [], net: [] };
  var online = true;

  function fire(name, arg) { hooks[name].forEach(function (f) { try { f(arg); } catch (e) { /* 알림 받는 쪽 오류는 요청과 상관없다 */ } }); }
  function on(name, f) { hooks[name].push(f); }
  function netState(ok) { if (ok !== online) { online = ok; fire('net', ok); } }

  /* 오류 한 개 — status(0 = 인터넷 끊김) · code(서버 오류 이름) · msg(서버 문구) */
  function makeErr(status, body, offline) {
    var e = new Error('api ' + (status || 'offline'));
    body = body && typeof body === 'object' ? body : { message: String(body || '') };
    e.status = status || 0;
    e.offline = !!offline;
    e.code = String(body.error_code || (typeof body.code === 'string' ? body.code : '') || body.error || '');
    e.msg = String(body.message || body.msg || body.error_description || '');
    return e;
  }

  function headers(opt, hasBody) {
    var h = { apikey: CONFIG.key };
    if (opt.auth !== false && session && session.access_token) h.Authorization = 'Bearer ' + session.access_token;
    if (hasBody) h['Content-Type'] = 'application/json';
    var x = opt.headers || {};
    for (var k in x) h[k] = x[k];
    return h;
  }

  /* 요청 한 번 — 끊겼으면 offline 오류를 던지고, 받은 것은 상태와 함께 돌려준다 */
  async function raw(method, path, body, opt) {
    opt = opt || {};
    var hasBody = body !== undefined;
    var init = { method: method, headers: headers(opt, hasBody), cache: 'no-store' };
    if (hasBody) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (opt.keepalive) init.keepalive = true;
    var res;
    try { res = await fetch(CONFIG.url + path, init); } catch (e) { netState(false); throw makeErr(0, null, true); }
    netState(true);
    var text = '';
    try { text = await res.text(); } catch (e) { text = ''; }
    var data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
    return { status: res.status, ok: res.ok, data: data };
  }

  /* 토큰이 낡았다는 대답인가 — 자료 요청(PostgREST)은 401, 로그인 서버(GoTrue)는 403 bad_jwt 로도 온다 */
  function staleToken(r) {
    if (r.status === 401) return true;
    if (r.status !== 403 || !r.data || typeof r.data !== 'object') return false;
    var s = String(r.data.error_code || '') + ' ' + String(r.data.msg || r.data.message || '');
    return /bad_jwt|jwt|token is expired/i.test(s);
  }

  function soonExpired(s) { return !!(s && s.exp && Date.now() / 1000 > s.exp - 60); }

  async function setSession(d) {
    var prevUser = session && session.user;
    session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      /* 서버가 준 만료 시각 대신 「지금부터 몇 초」로 잰다 — 폰 시계가 틀려도 흔들리지 않게 */
      exp: Math.floor(Date.now() / 1000) + (Number(d.expires_in) > 0 ? Number(d.expires_in) : 3600),
      user: d.user && d.user.id ? { id: d.user.id, email: d.user.email || '' } : prevUser
    };
    await Store.set('auth', session);
    return session;
  }

  async function clearSession() {
    session = null;
    await Store.del('auth');
  }

  /* 토큰 새로 받기 — 한 곳에서만. 새로 받는 중에 또 부르면 같은 약속을 돌려준다 */
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async function () {
      /* 같은 폰의 다른 창이 먼저 새로 받아 두었으면 그것을 쓴다(한 번 쓴 열쇠는 서버가 막는다) */
      try {
        var saved = await Store.get('auth');
        if (saved && session && saved.refresh_token && saved.refresh_token !== session.refresh_token && !soonExpired(saved)) {
          session = saved;
          return session;
        }
      } catch (e) { /* 저장소를 못 읽으면 서버에 묻는다 */ }
      if (!session || !session.refresh_token) { var e0 = makeErr(401, { message: 'no session' }); e0.sessionGone = true; throw e0; }
      var r = await raw('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token }, { auth: false });
      if (r.ok && r.data && r.data.access_token) return setSession(r.data);
      var err = makeErr(r.status, r.data);
      if (r.status >= 400 && r.status < 500 && r.status !== 429) {
        /* 열쇠가 더는 안 통한다(관리자가 비밀번호를 새로 정했거나 로그아웃됐다) — 다시 로그인해야 한다 */
        err.sessionGone = true;
        await clearSession();
        fire('expired', err);
      }
      throw err;
    })();
    var p = refreshing;
    p.then(function () { refreshing = null; }, function () { refreshing = null; });
    return p;
  }

  /* 로그인한 요청 — 곧 만료되면 먼저 새로 받고, 401 이면 한 번 새로 받고 다시 보낸다 */
  async function call(method, path, body, opt) {
    opt = opt || {};
    if (opt.auth !== false && session && soonExpired(session)) {
      try { await refresh(); } catch (e) { if (e.sessionGone) throw e; /* 끊겼으면 가진 토큰으로 해 본다 */ }
    }
    var r = await raw(method, path, body, opt);
    if (opt.auth !== false && session && staleToken(r)) {
      await refresh();
      r = await raw(method, path, body, opt);
    }
    if (!r.ok) throw makeErr(r.status, r.data);
    return r.data;
  }

  function q(v) { return encodeURIComponent(v == null ? '' : String(v)); }

  /* ── 로그인 ── */
  async function signup(p) {
    var r = await raw('POST', '/auth/v1/signup', {
      email: p.email, password: p.password,
      data: { name: p.name, school: p.school, join_code: p.code, agreed: true }
    }, { auth: false });
    if (!r.ok) throw makeErr(r.status, r.data);
    if (!r.data || !r.data.access_token) throw makeErr(200, { error_code: 'no_session', message: 'confirm email is on' });
    return setSession(r.data);
  }

  async function login(email, password) {
    var r = await raw('POST', '/auth/v1/token?grant_type=password', { email: email, password: password }, { auth: false });
    if (!r.ok || !r.data || !r.data.access_token) throw makeErr(r.status || 400, r.data);
    return setSession(r.data);
  }

  async function logout() {
    if (session) {
      try { await raw('POST', '/auth/v1/logout?scope=local', undefined, {}); } catch (e) { /* 끊겼어도 이 폰에서는 나간다 */ }
    }
    await clearSession();
  }

  async function restore() {
    var s = await Store.get('auth');
    session = s && s.access_token && s.refresh_token && s.user && s.user.id ? s : null;
    return session;
  }

  /* ── 오류를 학생 말로(구현 사양 4절) ── */
  var ADMIN_WORDS = {
    FORBIDDEN: '관리자만 할 수 있어요',
    NOT_FOUND: '찾지 못했어요. 목록을 새로 고친 뒤 다시 해 주세요',
    TARGET_IS_ADMIN: '관리자 계정은 여기서 바꿀 수 없어요',
    CANNOT_BLOCK_SELF: '내 계정은 막을 수 없어요',
    CANNOT_REMOVE_SELF: '내 계정은 지울 수 없어요',
    PW_TOO_SHORT: '비밀번호는 6자 이상이어야 해요',
    PW_TOO_LONG: '비밀번호가 너무 길어요. 조금 줄여 주세요',
    SCHOOL_INVALID: '학교 목록에 없는 학교예요',
    CODE_TOO_SHORT: '가입 코드는 6자 이상이어야 해요'
  };

  function words(e, where) {
    if (!e) return '';
    if (e.offline) return '인터넷이 연결되면 다시 해 볼게요';
    var m = (e.msg || '') + ' ' + (e.code || '');
    for (var k in ADMIN_WORDS) {
      if (new RegExp('(^|[^A-Z_])' + k + '([^A-Z_]|$)').test(e.msg || '')) return ADMIN_WORDS[k];
    }
    if (/database error saving new user/i.test(m) || (where === 'signup' && e.status >= 500)) {
      return '가입이 안 됐어요. 가입 코드와 이름(2~20자)을 확인해 주세요';
    }
    if (/already registered|already been registered|user_already_exists|email_exists/i.test(m)) return '이미 가입한 메일이에요';
    if (/no_session/i.test(m)) return '가입은 됐지만 바로 들어가지 못했어요. 선생님께 말해 주세요';
    if (where === 'login' && (e.status === 400 || /invalid_credentials|invalid_grant|invalid login/i.test(m))) return '메일이나 비밀번호가 맞지 않아요';
    if (/weak_password|at least 6|should be at least/i.test(m)) return '비밀번호는 6자 이상으로 정해 주세요';
    if (/same_password|different from the old/i.test(m)) return '지금 비밀번호와 다르게 정해 주세요';
    if (/reauthentication/i.test(m)) return '다시 로그인한 뒤 바꿔 주세요';
    if (/email_address_invalid|validation_failed|invalid format|valid email/i.test(m)) return '메일 주소를 다시 확인해 주세요';
    if (e.status === 429 || /rate limit|too many/i.test(m)) return '잠깐 쉬었다가 다시 해 주세요';
    if (/signup_disabled|signups not allowed/i.test(m)) return '지금은 가입을 받지 않아요. 선생님께 말해 주세요';
    if (e.sessionGone) return '다시 로그인해 주세요';
    if (e.status === 401 || e.status === 403 || e.code === '42501') return '지금은 할 수 없어요. 선생님께 말해 주세요';
    return '잠시 문제가 생겼어요. 조금 뒤 다시 해 주세요';
  }

  var prefMin = { Prefer: 'return=minimal' };

  return {
    on: on,
    session: function () { return session; },
    uid: function () { return session && session.user ? session.user.id : ''; },
    isOnline: function () { return online; },
    restore: restore, signup: signup, login: login, logout: logout, refresh: refresh, words: words,
    call: call,

    /* 학생 */
    changePassword: function (pw) { return call('PUT', '/auth/v1/user', { password: pw }); },
    profile: function (uid) { return call('GET', '/rest/v1/profiles?select=id,name,school,role,blocked,email&id=eq.' + q(uid)); },
    schools: function () {
      return call('GET', '/rest/v1/schools?select=name,label,subjects,sort&order=sort', undefined, session ? {} : { auth: false });
    },
    livePacks: function (school) {
      /* 학생에게는 규칙이 내 학교 공개 판만 준다. 관리자는 모든 판이 보이므로 내 학교로 한 번 더 거른다 */
      return call('GET', '/rest/v1/packs?select=id,subject,cycle,version,hash,counts,created_at&status=eq.live&school=eq.' + q(school));
    },
    packData: function (id) { return call('GET', '/rest/v1/packs?select=data&id=eq.' + q(id)); },
    touch: function () { return call('POST', '/rest/v1/rpc/touch', {}); },
    marksPage: function (sc, offset) {
      return call('GET', '/rest/v1/marks?select=key,state,updated_at&school=eq.' + q(sc.school) + '&subject=eq.' + q(sc.subject) +
        '&cycle=eq.' + q(sc.cycle) + '&order=key&limit=1000&offset=' + (offset | 0));
    },
    upsertMarks: function (body, keepalive) {
      return call('POST', '/rest/v1/marks?on_conflict=user_id,school,subject,cycle,key', body,
        { headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, keepalive: !!keepalive });
    },
    /* 학생은 신고를 읽는 규칙이 없다 — select 를 붙이지 않는다 */
    report: function (row) { return call('POST', '/rest/v1/reports', row, { headers: prefMin }); },

    /* 관리자 */
    adminPacks: function () {
      return call('GET', '/rest/v1/packs?select=id,school,subject,cycle,version,status,hash,counts,note,created_at&order=school.asc,subject.asc,created_at.desc');
    },
    adminProfiles: function () {
      return call('GET', '/rest/v1/profiles?select=id,name,school,role,blocked,email,created_at,last_seen&order=school.asc,name.asc');
    },
    adminMarks: function (school) { return call('POST', '/rest/v1/rpc/admin_marks', { p_school: school }); },
    rpc: function (name, args) { return call('POST', '/rest/v1/rpc/' + name, args || {}); },
    adminReports: function () { return call('GET', '/rest/v1/reports?select=*&order=created_at.desc'); },
    resolveReport: function (id) { return call('PATCH', '/rest/v1/reports?id=eq.' + q(id), { resolved: true }, { headers: prefMin }); }
  };
})();

if (typeof module === 'object' && module.exports) module.exports = Api;
