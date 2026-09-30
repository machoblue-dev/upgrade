/* UP:GRADE — 화면 이동 · 첫 화면 · 판 확인(구현 사양 5절 · 6절)

   #주소가 화면을 정한다 — #login · #signup · #home · #me · #jimun·#haeksim·#seosul·#eobeop·#dan · #p-<지문> · #admin/…
   · 열 때: 받아 둔 프로필·판으로 먼저 그리고(끊겨도 읽힌다) → 프로필 → 학교 목록 → 공개 판(해시가 같으면 내용은 안 받는다)
     → 진도 받아 합치기 → 못 보낸 체크 보내기
   · 화면으로 돌아올 때: 앱 판(version.json)과 공개 판을 다시 본다. 새 판이면 「새 내용이 있어요」 띠
   · 떠날 때(visibilitychange hidden): 모아 둔 체크를 보낸다
   · 카톡 안 브라우저 띠 · 끊김 띠 · 미리보기 띠 · 맨 아래 옅은 「○○○ 학생용」 */
(function () {
  'use strict';
  var $app = document.getElementById('app');
  var $bars = document.getElementById('bars');
  var $wm = document.getElementById('wm');
  var $sheet = document.getElementById('sheet');
  var $toast = document.getElementById('toast');
  var esc = Review.util.esc;
  var TABS = { jimun: 1, haeksim: 1, seosul: 1, eobeop: 1, dan: 1 };

  var A = {
    session: null, profile: null, noProfile: false,
    schools: [], schoolMap: {},
    subjects: [], subject: '', pack: null, hasLive: null, banner: false,
    ui: null, preview: null, prevRoute: null, listScroll: {},
    loading: true, flash: '', offline: false, rep: null, dirty: false, lastProfileCheck: 0
  };

  function noop() {}
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function hash() {
    var h = (location.hash || '').replace(/^#/, '');
    try { h = decodeURIComponent(h); } catch (e) { /* 이상한 주소는 그대로 */ }
    return h;
  }
  function go(h) {
    var target = '#' + h;
    if (location.hash === target || hash() === h) render(true);
    else location.hash = h;
  }
  function uid() { return Api.uid(); }
  function isAdmin() { return !!(A.profile && A.profile.role === 'admin' && !A.profile.blocked); }
  function schoolLabel(name) { var s = A.schoolMap[name]; return s ? (s.label || s.name) : (name || ''); }
  function mapSchools() {
    A.schoolMap = {};
    (A.schools || []).forEach(function (s) { if (s && s.name) A.schoolMap[s.name] = s; });
  }
  function defaultUi() { return { mode: 'en', f: {}, wm: 'w2m', shuffle: false, wlist: false, tab: '', subject: '', last: {} }; }
  function subjKey() { return (A.profile ? A.profile.school : '') + '|' + A.subject; }

  var uiTimer = 0;
  function saveUi(now) {
    if (!A.ui || !uid()) return;
    clearTimeout(uiTimer);
    var k = 'ui:' + uid(), v = A.ui;
    if (now === true) { Store.set(k, v).catch(noop); return; }
    uiTimer = setTimeout(function () { Store.set(k, v).catch(noop); }, 400);
  }

  /* ---------- 띠 · 워터마크 · 알림 ---------- */
  function kakao() { return /KAKAOTALK/i.test(navigator.userAgent || ''); }
  function kakaoClosed() { try { return sessionStorage.getItem('upgrade-kakao-x') === '1'; } catch (e) { return false; } }
  function barsHTML() {
    var out = '';
    if (kakao() && !kakaoClosed()) {
      out += '<div class="bar kakao" role="note"><p>카카오톡 안에서 열면 로그인이 유지되지 않을 수 있어요. 오른쪽 위 메뉴에서 다른 브라우저로 열어 주세요</p>' +
        '<button class="bar-x" data-act="kakao-x">닫기</button></div>';
    }
    if (A.offline) out += '<div class="bar net" role="status"><p>인터넷이 끊겨 있어요. 받아 둔 자료로 보여 드리고, 체크는 모아 두었다가 보내요.</p></div>';
    if (A.preview) {
      var m = A.preview.meta;
      out += '<div class="bar pv"><p>미리보기 — ' + esc(schoolLabel(m.school)) + (m.subject ? ' · ' + esc(m.subject) : '') + ' · 판 ' + esc(m.version) +
        '. 체크는 저장하지 않아요.</p><button class="bar-x" data-act="pv-end">끝내기</button></div>';
    }
    return out;
  }
  function drawBars() { $bars.innerHTML = barsHTML(); }
  function setWm() {   // 관리자 계정에는 「학생용」을 띄우지 않는다(260930)
    $wm.textContent = A.session && A.profile && A.profile.name && A.profile.role !== 'admin' ? A.profile.name + ' 학생용' : '';
  }
  var toastT = 0;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { $toast.classList.remove('on'); }, 2600);
  }
  function setOffline(off) {
    off = !!off;
    if (off === A.offline) return;
    A.offline = off;
    drawBars();
  }

  /* ---------- 머리(로그인 뒤) ---------- */
  function topHTML() {
    return '<header class="topbar"><a class="brand" href="#home" aria-label="처음 화면">UP:GRADE</a><span class="sp"></span>' +
      (isAdmin() ? '<a class="tb" href="#admin">관리</a>' : '') +
      '<a class="tb" href="#me">내 정보</a></header>' + subjHTML();
  }
  function subjHTML() {
    if (A.preview || A.subjects.length < 2) return '';
    return '<div class="subj" role="group" aria-label="과목">' + A.subjects.map(function (s) {
      return '<button data-act="subj" data-v="' + esc(s) + '" aria-pressed="' + (s === A.subject) + '">' + esc(s) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- 로그인 · 가입 ---------- */
  function brandHead() {
    return '<header class="brandhead"><img src="img/logo.png" alt="학문당시스템학원 조은희시스템영어" width="260" height="34">' +
      '<h1>UP:GRADE</h1><p>학문당 시험 복습</p></header>';
  }
  function fld(label, control, hint) {
    return '<label class="fld"><span>' + label + '</span>' + control + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
  }
  function loginHTML() {
    return '<section class="auth">' + brandHead() +
      '<form class="card form" id="loginform" novalidate><h2 class="sec-h">로그인</h2>' +
      fld('메일(아이디)', '<input type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false">') +
      fld('비밀번호', '<input type="password" name="pw" autocomplete="current-password">') +
      '<p class="msg" id="login-msg" role="alert">' + esc(A.flash) + '</p>' +
      '<button class="btn" type="submit">로그인</button></form>' +
      '<p class="alt">처음이면 <a href="#signup">가입하기</a></p>' +
      '<p class="hint center">비밀번호를 잊으면 선생님께 말해 주세요. 새 비밀번호를 정해 드려요.</p></section>';
  }
  function schoolOpts() {
    return '<option value="">학교를 골라 주세요</option>' + A.schools.map(function (s) {
      return '<option value="' + esc(s.name) + '">' + esc(s.label || s.name) + '</option>';
    }).join('');
  }
  function signupHTML() {
    return '<section class="auth">' + brandHead() +
      '<form class="card form" id="signupform" novalidate><h2 class="sec-h">가입하기</h2>' +
      fld('이름', '<input name="name" autocomplete="name" maxlength="20">', '실제 이름을 적어 주세요(2~20자)') +
      fld('학교', '<select name="school">' + schoolOpts() + '</select>' +
        (A.schools.length ? '' : '<button type="button" class="link-btn" data-act="schools-again">학교 목록 다시 받기</button>')) +
      fld('메일(아이디)', '<input type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false">', '로그인할 때 아이디로 써요') +
      fld('비밀번호', '<input type="password" name="pw" autocomplete="new-password">', '6자 이상') +
      fld('가입 코드', '<input name="code" autocomplete="off" autocapitalize="off" spellcheck="false">', '선생님이 알려 준 코드') +
      '<div class="consent" id="consent"><p>UP:GRADE(학문당)는 가입과 복습 기록 확인을 위해 아래 정보를 받아요.</p>' +
      '<p>· 받는 것: 이름, 학교·학년, 메일(아이디), 복습 기록(체크한 것과 접속 시각)</p>' +
      '<p>· 쓰는 곳: 시험 복습 자료 제공, 선생님의 학습 현황 확인</p>' +
      '<p>· 두는 기간: 퇴원하거나 졸업할 때까지 — 그 뒤에는 지워요</p>' +
      '<p>동의하지 않으면 가입할 수 없어요.</p></div>' +
      '<label class="agree"><input type="checkbox" name="agree" id="agree"><span>위 내용에 동의해요</span></label>' +
      '<p class="msg" id="signup-msg" role="alert"></p>' +
      '<button class="btn" type="submit" id="signup-btn" disabled>가입하기</button></form>' +
      '<p class="alt">이미 가입했으면 <a href="#login">로그인</a></p></section>';
  }
  function fillSchoolSelect() {
    var sel = document.querySelector('#signupform select[name="school"]');
    if (!sel || sel.value) return;
    sel.innerHTML = schoolOpts();
    var again = document.querySelector('[data-act="schools-again"]');
    if (again && A.schools.length) again.remove();
  }
  function loadSchools() {
    return Api.schools().then(function (sc) {
      if (!Array.isArray(sc)) return;
      A.schools = sc; mapSchools();
      Store.set('schools', sc).catch(noop);
      fillSchoolSelect();
    }, noop);
  }
  function say(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
  }
  function busy(btn, on, text) {
    if (!btn) return;
    if (on) { btn.setAttribute('data-was', btn.textContent); btn.disabled = true; btn.textContent = text || '잠시만요'; }
    else { btn.disabled = false; btn.textContent = btn.getAttribute('data-was') || btn.textContent; }
  }

  async function doLogin(form) {
    var email = form.elements.email.value.trim(), pw = form.elements.pw.value;
    if (!email || !pw) return say('login-msg', '메일과 비밀번호를 넣어 주세요');
    var btn = form.querySelector('button[type="submit"]');
    busy(btn, true);
    try { await Api.login(email, pw); } catch (e) { busy(btn, false); return say('login-msg', Api.words(e, 'login')); }
    A.flash = '';
    /* 첫 화면 주소를 먼저 정해 두고 받아 오기를 시작한다 — 받는 동안 다른 화면으로 가도 끝나고 첫 화면으로 끌려오지 않는다 */
    history.replaceState(null, '', '#home');
    await afterLogin();
  }

  async function doSignup(form) {
    var f = form.elements;
    var name = f.name.value.replace(/\s+/g, ' ').trim(), school = f.school.value, email = f.email.value.trim(), pw = f.pw.value, code = f.code.value.trim();
    if (!f.agree.checked) return say('signup-msg', '개인정보를 받는 데 동의해야 가입할 수 있어요');
    if (name.length < 2 || name.length > 20) return say('signup-msg', '이름은 2~20자로 적어 주세요');
    if (!school) return say('signup-msg', '학교를 골라 주세요');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('signup-msg', '메일 주소를 다시 확인해 주세요');
    if (pw.length < 6) return say('signup-msg', '비밀번호는 6자 이상으로 정해 주세요');
    if (!code) return say('signup-msg', '가입 코드를 넣어 주세요');
    var btn = document.getElementById('signup-btn');
    busy(btn, true);
    try { await Api.signup({ email: email, password: pw, name: name, school: school, code: code }); }
    catch (e) { busy(btn, false); btn.disabled = !f.agree.checked; return say('signup-msg', Api.words(e, 'signup')); }
    history.replaceState(null, '', '#home');
    await afterLogin();
  }

  /* ---------- 로그인 뒤 ---------- */
  async function afterLogin() {
    var id = uid();
    A.session = Api.session();
    A.ui = defaultUi();
    var saved = await Store.get('ui:' + id);
    if (saved && typeof saved === 'object') for (var k in saved) A.ui[k] = saved[k];
    if (!A.ui.last || typeof A.ui.last !== 'object') A.ui.last = {};
    A.profile = (await Store.get('profile:' + id)) || null;
    A.noProfile = false;
    var sc = await Store.get('schools');
    if (Array.isArray(sc) && sc.length) { A.schools = sc; mapSchools(); }
    await Sync.openUser(id);
    A.loading = true;
    A.hasLive = null;
    if (A.profile) await choose(A.ui.subject, false);    // 받아 둔 것으로 먼저 그린다
    render(false);
    await refreshAll();
  }

  async function refreshAll() {
    var id = uid();
    if (!id) return;
    var before = sig();
    try {
      var rows = await Api.profile(id);
      if (uid() !== id) return;
      if (!rows || !rows.length) { A.noProfile = true; A.profile = null; }
      else { A.noProfile = false; A.profile = rows[0]; await Store.set('profile:' + id, A.profile); }
    } catch (e) {
      if (e.sessionGone) return;
    }
    Api.touch().catch(noop);
    try {
      var sc = await Api.schools();
      if (Array.isArray(sc)) { A.schools = sc; mapSchools(); await Store.set('schools', sc); }
    } catch (e) { /* 받아 둔 목록을 쓴다 */ }
    if (A.profile) await choose(A.ui.subject, true);
    else { A.pack = null; setupReview(); }
    var wasLoading = A.loading;
    A.loading = false;
    if (wasLoading || sig() !== before) softRender();
    Sync.flush().catch(noop);
  }

  /* 화면이 바뀌었는지 가늠하는 도장 — 프로필 · 판 · 진도 · 띠 */
  function sig() {
    var p = A.profile || {};
    return [p.id, p.name, p.school, p.role, p.blocked, A.noProfile, A.pack ? A.pack.hash + A.pack.cycle : '-', A.subjects.join(','),
      A.subject, A.banner, A.hasLive, JSON.stringify(Sync.marks())].join('|');
  }

  function packRec(meta, data, school, subject) {
    return {
      school: school, subject: subject, id: meta.id, cycle: meta.cycle, version: meta.version,
      hash: meta.hash, counts: meta.counts || {}, created_at: meta.created_at, data: data
    };
  }
  function sameScope(a, b) { return !a && !b ? true : !!(a && b && a.school === b.school && a.subject === b.subject && a.cycle === b.cycle); }

  /* 과목 고르기 + 그 과목의 공개 판 맞추기 + 진도 받기. net 이 거짓이면 받아 둔 것만 쓴다 */
  async function choose(want, net) {
    var p = A.profile, id = uid();
    if (!p || !p.school || p.blocked) {
      A.pack = null; A.subjects = []; A.subject = ''; A.banner = false;
      await Sync.openScope(null); setupReview();
      return;
    }
    var sch = A.schoolMap[p.school];
    var subs = sch && Array.isArray(sch.subjects) ? sch.subjects.filter(function (x) { return x; }) : [];
    A.subjects = subs;
    var subject = subs.length ? (subs.indexOf(want) >= 0 ? want : subs[0]) : '';
    A.subject = subject;
    if (A.ui.subject !== subject) { A.ui.subject = subject; saveUi(); }
    var pk = 'pack:' + p.school + '|' + subject;
    var rec = await Store.get(pk);
    if (net) {
      try {
        var metas = await Api.livePacks(p.school);
        if (uid() !== id) return;
        A.hasLive = Array.isArray(metas) && metas.length > 0;
        var meta = null;
        (metas || []).forEach(function (m) { if ((m.subject || '') === subject) meta = m; });
        if (!meta) {
          if (rec) await Store.del(pk);
          rec = null;
        } else if (!rec || rec.hash !== meta.hash) {
          /* 폰에 같은 해시가 있으면 내용은 안 받는다 */
          var got = await Api.packData(meta.id);
          var data = got && got[0] && got[0].data;
          if (data && typeof data === 'object') { rec = packRec(meta, data, p.school, subject); await Store.set(pk, rec); }
        } else if (rec.id !== meta.id || rec.cycle !== meta.cycle || rec.version !== meta.version) {
          rec.id = meta.id; rec.cycle = meta.cycle; rec.version = meta.version; rec.counts = meta.counts || {}; rec.created_at = meta.created_at;
          await Store.set(pk, rec);
        }
      } catch (e) {
        if (e.sessionGone) return;
        /* 끊겼으면 받아 둔 판으로 */
      }
    } else if (A.hasLive === null && rec) {
      A.hasLive = true;
    }
    A.pack = rec || null;
    A.banner = false;
    if (A.pack) {
      var sk = 'seen:' + id + '|' + p.school + '|' + subject;
      var seen = await Store.get(sk);
      if (seen == null) await Store.set(sk, A.pack.hash);     // 처음 받은 판은 「새 내용」이 아니다
      else A.banner = seen !== A.pack.hash;
    }
    var sc = A.pack ? { school: p.school, subject: subject, cycle: A.pack.cycle } : null;
    if (!sameScope(Sync.scope(), sc)) await Sync.openScope(sc);
    setupReview();
    if (net && A.pack) { try { await Sync.pull(); } catch (e) { /* 끊겼으면 다음에 */ } }
  }

  /* 그리기 문맥은 판·사람·미리보기가 바뀔 때만 새로 만든다 — 같은 판인데 새로 만들면
     단어 카드가 첫 장으로 돌아가 화면에 보이는 카드와 누른 카드가 어긋난다 */
  var reviewFor = '';
  function setupReview(force) {
    var key = A.preview ? 'pv|' + A.preview.meta.id + '|' + A.preview.meta.hash
      : (A.pack ? uid() + '|' + A.pack.school + '|' + A.subject + '|' + A.pack.cycle + '|' + A.pack.hash : '');
    if (!force && key === reviewFor && (key === '' || Review.ready())) return;
    reviewFor = key;
    if (A.preview) {
      var pv = A.preview;
      Review.setup(pv.data, {
        mark: function (k) { return pv.marks[k] || ''; },
        setMarks: function (pairs) { pairs.forEach(function (x) { if (x[1] === 'none') delete pv.marks[x[0]]; else pv.marks[x[0]] = x[1]; }); },
        ui: pv.ui, saveUi: noop, readonly: false, report: null, cycle: pv.meta.cycle
      });
      return;
    }
    if (!A.pack) { Review.setup(null, null); return; }
    Review.setup(A.pack.data, {
      mark: Sync.get,
      setMarks: function (pairs) { Sync.setMany(pairs).catch(noop); },
      ui: A.ui, saveUi: saveUi, readonly: false, report: openReport, cycle: A.pack.cycle
    });
  }
  function clearReview() { reviewFor = ''; Review.setup(null, null); }

  /* 막혔다는 대답을 받았을 때 — 프로필을 한 번 다시 받아 본다(1분에 한 번까지) */
  async function recheckProfile() {
    if (Date.now() - A.lastProfileCheck < 60000 || !uid()) return;
    A.lastProfileCheck = Date.now();
    try {
      var rows = await Api.profile(uid());
      var np = rows && rows[0];
      if (!np) return;
      var changed = !A.profile || np.school !== A.profile.school || np.blocked !== A.profile.blocked;
      A.profile = np;
      await Store.set('profile:' + uid(), np);
      if (changed) { await choose(A.ui.subject, true); softRender(true); Sync.flush().catch(noop); }
    } catch (e) { /* 다음에 */ }
  }

  /* ---------- 첫 화면 ---------- */
  function notice(title, text) { return '<div class="notice"><b>' + esc(title) + '</b>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div>'; }
  function progressHTML() {
    return '<section class="prog" aria-label="탭별 진도"><h2 class="sec-h">진도</h2><div class="prog-grid">' + Review.progress().map(function (x) {
      var pct = x.N ? Math.round(x.n * 100 / x.N) : 0;
      return '<a class="pcard" href="#' + x.id + '" data-tab="' + x.id + '" data-n="' + x.n + '" data-total="' + x.N + '" data-re="' + x.re + '">' +
        '<span class="pc-k">' + x.name + '</span><span class="pc-n"><b>' + x.n + '</b> / ' + x.N + '</span>' +
        '<span class="pc-l">' + x.what + (x.re ? ' · 다시 볼 것 ' + x.re : '') + '</span>' +
        '<span class="meter" aria-hidden="true"><i style="width:' + pct + '%"></i></span></a>';
    }).join('') + '</div></section>';
  }
  function continueHTML() {
    var last = !A.preview && A.ui.last ? A.ui.last[subjKey()] : '';
    var lab = last ? Review.label(last) : '';
    if (lab) return '<a class="cont" href="#' + Review.href(last) + '"><span class="ck">이어서 보기</span><span class="ct">' + esc(lab) + '</span></a>';
    var first = Review.firstTab();
    return first ? '<a class="cont" href="#' + first + '"><span class="ck">처음부터 보기</span><span class="ct">' + esc(Review.tabName(first)) + '</span></a>' : '';
  }
  function homeHTML() {
    if (!A.preview) {
      var p = A.profile;
      if (A.noProfile) return notice('계정 정보를 찾지 못했어요', '선생님께 말해 주세요.') + '<button class="btn ghost top-gap" data-act="logout">로그아웃</button>';
      if (!p) return A.loading ? '<p class="empty">불러오는 중이에요</p>' : notice('계정 정보를 받지 못했어요', '인터넷이 연결되면 다시 해 볼게요.');
      if (p.blocked) return notice('지금은 자료를 볼 수 없어요', '선생님께 말해 주세요.');
      if (!p.school) return notice('학교가 정해지지 않았어요', isAdmin() ? '관리 화면에서 자료 판을 열어 볼 수 있어요.' : '선생님께 말해 주세요.');
      if (!A.pack) {
        var head = '<header class="hero-lite"><p class="kicker">' + esc(schoolLabel(p.school)) + (A.subject ? ' · ' + esc(A.subject) : '') + '</p></header>';
        if (A.loading) return head + notice('잠시만요', '자료를 받는 중이에요.');
        if (A.offline) return head + notice('자료를 아직 못 받았어요', '인터넷이 연결되면 받아 올게요.');
        return head + notice('아직 올라온 자료가 없어요', '선생님이 자료를 올리면 여기에 나와요.');
      }
    }
    var out = '';
    if (A.banner && !A.preview) {
      out += '<div class="newbar" role="status"><p><b>새 내용이 있어요</b>선생님이 자료를 새로 올렸어요.</p><button data-act="banner-ok">확인</button></div>';
    }
    return out + Review.heroHTML() + progressHTML() + continueHTML();
  }

  /* ---------- 내 정보 ---------- */
  function meHTML() {
    var p = A.profile || {}, s = Api.session() || {}, n = Sync.pending();
    return '<section class="me"><h1 class="page-h">내 정보</h1>' +
      '<dl class="info"><div><dt>이름</dt><dd>' + esc(p.name || '') + '</dd></div>' +
      '<div><dt>학교</dt><dd>' + esc(schoolLabel(p.school)) + '</dd></div>' +
      '<div><dt>메일</dt><dd>' + esc(p.email || (s.user && s.user.email) || '') + '</dd></div></dl>' +
      '<form class="card form" id="pwform" novalidate><h2 class="sec-h">비밀번호 바꾸기</h2>' +
      fld('새 비밀번호', '<input type="password" name="pw" autocomplete="new-password">', '6자 이상') +
      fld('한 번 더', '<input type="password" name="pw2" autocomplete="new-password">') +
      '<p class="msg" id="pw-msg" role="alert"></p><button class="btn" type="submit">비밀번호 바꾸기</button></form>' +
      '<div class="card form"><h2 class="sec-h">로그아웃</h2><p class="hint">이 폰에서 나가요. 다시 들어올 때는 메일과 비밀번호를 넣어요.</p>' +
      (n ? '<p class="pend" data-pending="' + n + '">아직 못 보낸 체크가 ' + n + '개 있어요. 인터넷이 연결되면 보내요. 로그아웃해도 이 폰에 남아 있다가 다시 로그인하면 보내요.</p>' : '') +
      '<button class="btn ghost" data-act="logout">로그아웃</button></div>' +
      '<p class="ver">앱 버전 ' + esc(APP_VERSION) + '</p></section>';
  }
  async function doPassword(form) {
    var pw = form.elements.pw.value, pw2 = form.elements.pw2.value;
    if (pw.length < 6) return say('pw-msg', '비밀번호는 6자 이상으로 정해 주세요');
    if (pw !== pw2) return say('pw-msg', '두 칸의 비밀번호가 서로 달라요');
    var btn = form.querySelector('button[type="submit"]');
    busy(btn, true);
    try { await Api.changePassword(pw); } catch (e) { busy(btn, false); return say('pw-msg', Api.words(e, 'password')); }
    busy(btn, false);
    form.reset();
    say('pw-msg', '비밀번호를 바꿨어요', true);
  }
  async function doLogout() {
    saveUi(true);
    try { await Promise.race([Sync.flush(), wait(3000)]); } catch (e) { /* 못 보낸 것은 이 폰에 남아 다음 로그인 때 간다 */ }
    var id = uid();
    await Api.logout();
    if (id) await Store.del('profile:' + id);     // 이름·메일 사본은 지운다(진도·보낼 목록은 다시 로그인할 때 쓰려고 남긴다)
    A.session = null; A.profile = null; A.pack = null; A.preview = null; A.subjects = []; A.subject = '';
    A.banner = false; A.noProfile = false; A.hasLive = null; A.ui = null; A.prevRoute = null; A.listScroll = {};
    clearReview();
    await Sync.openUser('');
    Admin.reset();
    setWm();
    go('login');
  }

  /* ---------- 틀린 곳 알리기 ---------- */
  function openReport(key, label) {
    A.rep = { key: key, label: label };
    $sheet.innerHTML = '<div class="sheet-bg" data-act="rep-x"></div>' +
      '<div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="rep-h"><h2 id="rep-h" class="sec-h">틀린 곳 알리기</h2>' +
      '<p class="sheet-what">' + esc(label) + '</p>' +
      '<label class="fld"><span>어디가 어떻게 틀렸는지 적어 주세요</span><textarea id="rep-body" rows="5" maxlength="1000"></textarea></label>' +
      '<p class="sheet-n"><span id="rep-n">0</span> / 1000</p><p class="msg" id="rep-msg" role="alert"></p>' +
      '<div class="sheet-btns"><button class="btn ghost" data-act="rep-x">닫기</button><button class="btn" data-act="rep-send" id="rep-send">보내기</button></div></div>';
    $sheet.hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(function () { var t = document.getElementById('rep-body'); if (t) t.focus(); }, 30);
  }
  function closeReport() {
    $sheet.hidden = true; $sheet.innerHTML = ''; A.rep = null;
    document.body.classList.remove('modal-open');
    if (A.dirty) softRender();
  }
  async function sendReport() {
    var t = document.getElementById('rep-body');
    var body = (t ? t.value : '').trim();
    if (!body) return say('rep-msg', '틀린 곳을 한 글자 이상 적어 주세요');
    if (body.length > 1000) return say('rep-msg', '1000자까지 적을 수 있어요');
    var p = A.profile;
    if (!p || !p.school || !A.pack || !A.rep) return say('rep-msg', '지금은 보낼 수 없어요');
    var btn = document.getElementById('rep-send');
    busy(btn, true);
    try {
      await Api.report({ user_id: uid(), school: p.school, subject: A.subject, cycle: A.pack.cycle, key: A.rep.key, body: body });
    } catch (e) { busy(btn, false); return say('rep-msg', Api.words(e)); }
    closeReport();
    toast('보냈어요. 선생님이 확인할게요');
  }

  /* ---------- 미리보기(관리자) ---------- */
  function openPreview(meta, data) {
    A.preview = { meta: meta, data: data, marks: {}, ui: defaultUi() };
    setupReview(true);
    drawBars();
    go('home');
  }
  function endPreview() {
    A.preview = null;
    setupReview(true);
    drawBars();
    go(isAdmin() ? 'admin/packs' : 'home');
  }

  /* ---------- 그리기 ---------- */
  function reviewRoute(h) { return Review.ready() && (TABS[h] || h.indexOf('p-') === 0) ? Review.route(h) : null; }

  function render(fromHash) {
    A.dirty = false;
    var h = hash();
    drawBars();
    if (!A.session) {
      if (h !== 'signup') h = 'login';
      if (location.hash !== '#' + h) history.replaceState(null, '', '#' + h);
      $app.innerHTML = h === 'signup' ? signupHTML() : loginHTML();
      setWm();
      if (fromHash) window.scrollTo(0, 0);
      A.prevRoute = { view: h };
      return;
    }
    if (h === '' || h === 'login' || h === 'signup') { h = 'home'; history.replaceState(null, '', '#home'); }
    var r = null, body;
    if (A.prevRoute && A.prevRoute.view === 't') A.listScroll[A.prevRoute.tab] = window.scrollY;
    if (h === 'me') body = meHTML();
    else if (h === 'admin' || h.indexOf('admin/') === 0) {
      if (isAdmin()) body = Admin.render(h);
      else { h = 'home'; history.replaceState(null, '', '#home'); body = homeHTML(); }
    } else if (h === 'home') body = homeHTML();
    else {
      r = reviewRoute(h);
      if (!r) {
        /* 판이 아직 안 왔거나 없는 지문이다 — 판을 받는 중이면 주소를 그대로 두고 기다린다 */
        if (!A.loading) history.replaceState(null, '', '#home');
        body = homeHTML(); h = 'home';
      } else {
        body = r.view === 'p' ? Review.renderPassage(r.id) : Review.renderTab(r.tab);
        if (!A.preview) { A.ui.last[subjKey()] = h; saveUi(); }
      }
    }
    $app.innerHTML = topHTML() + body;
    setWm();
    if (fromHash) {
      if (r && r.view === 't' && A.prevRoute && A.prevRoute.view === 'p' && A.listScroll[r.tab] != null) window.scrollTo(0, A.listScroll[r.tab]);
      else window.scrollTo(0, 0);
    }
    A.prevRoute = r ? r : { view: h };
  }

  /* 뒤에서 받은 것으로 다시 그리기 — 글을 쓰는 중이거나 신고 창이 열려 있으면 미뤘다가 다음에 그린다 */
  function softRender(force) {
    var ae = document.activeElement;
    if (!force && ((ae && $app.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) || !$sheet.hidden)) { A.dirty = true; return; }
    var y = window.scrollY;
    render(false);
    window.scrollTo(0, y);
  }

  /* ---------- 앱 판 확인 — version.json 이 다르면 새로 고친다(같은 판으로 두 번 돌지 않는다) ---------- */
  async function checkVersion() {
    try {
      var r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      var j = await r.json();
      var v = String((j && j.v) || '');
      if (!v || v === APP_VERSION) return;
      var tried = '';
      try { tried = sessionStorage.getItem('upgrade-reload') || ''; } catch (e) { /* 없으면 빈 글 */ }
      if (tried === v) return;
      try { sessionStorage.setItem('upgrade-reload', v); } catch (e) { /* 못 적어도 한 번은 새로 고친다 */ }
      saveUi(true);
      try { await Promise.race([Sync.flush(), wait(2000)]); } catch (e) { /* 남은 체크는 폰에 있다 */ }
      location.reload();
    } catch (e) { /* 끊겼으면 다음에 */ }
  }

  /* 화면으로 돌아왔을 때 — 새 판이 있나 본다 */
  async function onVisible() {
    checkVersion();
    if (!A.session || !A.profile || A.preview) return;
    Api.touch().catch(noop);
    var before = sig();
    await choose(A.subject, true);
    if (sig() !== before) softRender();
    Sync.flush().catch(noop);
  }

  /* ---------- 누르기 ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act],[data-chip]');
    if (!b) return;
    var act = b.getAttribute('data-act') || '';
    switch (act) {
      case 'rep': ev.preventDefault(); openReport(b.getAttribute('data-key'), b.getAttribute('data-label')); return;
      case 'rep-x': closeReport(); return;
      case 'rep-send': sendReport(); return;
      case 'kakao-x': try { sessionStorage.setItem('upgrade-kakao-x', '1'); } catch (e) { /* 이 화면에서만 닫는다 */ } drawBars(); return;
      case 'pv-end': endPreview(); return;
      case 'banner-ok':
        if (A.pack && A.profile) Store.set('seen:' + uid() + '|' + A.profile.school + '|' + A.subject, A.pack.hash).catch(noop);
        A.banner = false; softRender(true); return;
      case 'logout': doLogout(); return;
      case 'schools-again': loadSchools(); return;
      case 'subj':
        var v = b.getAttribute('data-v');
        if (v === A.subject) return;
        Sync.flush().catch(noop);
        choose(v, true).then(function () {
          var h = hash();
          if (h.indexOf('p-') === 0) go('jimun'); else softRender(true);
          Sync.flush().catch(noop);
        }).catch(noop);
        return;
    }
    if (act.indexOf('a-') === 0) { if (Admin.click(b)) ev.preventDefault(); return; }
    var res = Review.click(b);
    if (res === 'render') softRender(true);
  });

  document.addEventListener('submit', function (ev) {
    var f = ev.target;
    ev.preventDefault();
    if (f.id === 'loginform') doLogin(f);
    else if (f.id === 'signupform') doSignup(f);
    else if (f.id === 'pwform') doPassword(f);
    else Admin.submit(f);
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'agree') { var btn = document.getElementById('signup-btn'); if (btn) btn.disabled = !t.checked; return; }
    if (t.hasAttribute && t.hasAttribute('data-change')) Admin.change(t);
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'rep-body') { var n = document.getElementById('rep-n'); if (n) n.textContent = String(t.value.length); return; }
    Admin.input(t);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !$sheet.hidden) closeReport();
  });

  window.addEventListener('hashchange', function () {
    if (Sync.pending()) Sync.flush().catch(noop);         // 탭을 바꿀 때 보낸다
    render(true);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      saveUi(true);
      Sync.flush({ keepalive: true }).catch(noop);         // 화면을 떠날 때 보낸다
    } else {
      onVisible().catch(noop);
    }
  });
  window.addEventListener('pagehide', function () { saveUi(true); Sync.flush({ keepalive: true }).catch(noop); });
  window.addEventListener('online', function () {
    setOffline(false);
    Sync.flush().catch(noop);
    if (A.session && A.profile && !A.preview && A.hasLive === null) onVisible().catch(noop);
  });
  window.addEventListener('offline', function () { setOffline(true); });

  /* ---------- 서버·진도 알림 ---------- */
  Api.on('net', function (ok) { setOffline(!ok || (typeof navigator.onLine === 'boolean' && !navigator.onLine)); if (ok) Sync.flush().catch(noop); });
  Api.on('expired', function () {
    A.session = null; A.profile = null; A.pack = null; A.preview = null; A.subjects = [];
    A.flash = '다시 로그인해 주세요';
    clearReview();
    Admin.reset();
    closeReport();
    go('login');
  });
  Sync.setGate(function () {
    var p = A.profile;
    return { ok: !!(uid() && p && p.school && !p.blocked && !A.noProfile && A.hasLive !== false && (A.pack || A.hasLive)), school: p ? p.school : '' };
  });
  Sync.on(function (what) { if (what === 'denied') recheckProfile(); });

  Admin.init({
    state: A,
    schools: function () { return A.schools; },
    school: function (name) { return A.schoolMap[name]; },
    schoolLabel: schoolLabel,
    go: go, toast: toast, preview: openPreview,
    refresh: function (force) { if (hash().indexOf('admin') === 0) softRender(force); }
  });

  /* ---------- 열기 ---------- */
  async function boot() {
    await Store.open();
    if (typeof navigator.onLine === 'boolean' && !navigator.onLine) A.offline = true;
    checkVersion();
    var s = await Api.restore();
    if (!s) {
      A.session = null; A.loading = false;
      var sc = await Store.get('schools');
      if (Array.isArray(sc)) { A.schools = sc; mapSchools(); }
      render(false);
      loadSchools();
      return;
    }
    await afterLogin();
  }
  boot().catch(function (e) {
    if (window.console) console.error(e);
    $app.innerHTML = '<p class="empty">화면을 여는 중에 문제가 생겼어요. 새로 고쳐 주세요.</p>';
  });
})();
