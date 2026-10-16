/* UP:GRADE — 그림 풀이(0.5.0 · 261016 기원T 「이미지들을 UPGRADE 앱에도 올릴 수 있을까」 ·
   「앱에서 이미지가 너무 작게 보이니까 전체 화면 보기를 누르면 스마트폰 전체 화면을 이용하는 가로보기 형태로」)

   · 판 지문의 「그림」 칸 {src, 작은, w, h, 제목} — 그림 풀이 한 면(A4 가로)을 4배로 뜬 큰 WebP(src · 4492×3176)와
     1200px 작은 WebP(작은)다(_도구\폰복습\그림칸.py · 기원T 「확대해도 해상도가 깨지지 않게 최고의 해상도로」).
     지문 화면 카드는 작은 그림 · 전체 화면은 작은 그림을 먼저 보이고 큰 그림이 오면 바꿔 끼운다.
     그림은 서버의 비공개 저장소(pics)에 있고 로그인한 그 학교 학생과 관리자에게만 내준다(서버 규칙 · 261016 그림저장소.sql).
     앱 파일(공개 저장소)에는 그림도 글도 안 들어간다
   · 받은 그림은 이 폰의 캐시(upgrade-pics-1)에 둔다 — 이름이 내용 해시라 바뀌지 않으므로 다시 열 때 서버에 안 간다(끊겨도 보인다)
   · 전체 화면 — 앱 안 검은 칸(position:fixed)이 화면을 채운다. 폰을 세운 채면 그림을 90도 돌려 화면을 꽉 채운다.
     0.5.2(261017 기원T 「전체화면 닫는 방법 안내 팝업이 계속 떠 있다」) — 브라우저 Fullscreen API 와 가로 잠금을 더는 부르지 않는다.
     부르면 폰이 「전체 화면을 끝내려면 …」 안내를 아래에 띄우고 그 안내가 사라지지 않는다(앱에서 못 끈다)
   · 두 손가락으로 벌리기 · 오므리기 · 확대했을 때 한 손가락으로 옮기기 · 두 번 눌러 크게/원래대로 · 닫기 단추 · 뒤로 가기 · Esc */
var Pics = (function () {
  'use strict';
  var CK = 'upgrade-pics-1';
  var mem = {};          // src → object URL(이 화면이 열려 있는 동안)
  var wait = {};         // src → 받는 중인 약속
  var ZMAX = 5;

  function ckey(src) { return location.origin + '/__pics/' + src; }
  function hasCache() { try { return typeof caches !== 'undefined' && window.isSecureContext; } catch (e) { return false; } }

  async function fromCache(src) {
    if (!hasCache()) return null;
    try { var c = await caches.open(CK); var r = await c.match(ckey(src)); return r ? await r.blob() : null; } catch (e) { return null; }
  }
  async function toCache(src, blob) {
    if (!hasCache()) return;
    try { var c = await caches.open(CK); await c.put(ckey(src), new Response(blob, { headers: { 'Content-Type': blob.type || 'image/webp' } })); } catch (e) { /* 못 두어도 그림은 보인다 */ }
  }

  /* 그림 하나 — 캐시 → 서버. 같은 그림을 두 번 받지 않는다 */
  function load(src) {
    if (mem[src]) return Promise.resolve(mem[src]);
    if (wait[src]) return wait[src];
    var p = (async function () {
      var b = await fromCache(src);
      if (!b) { b = await Api.pic(src); toCache(src, b); }
      mem[src] = URL.createObjectURL(b);
      return mem[src];
    })();
    wait[src] = p;
    p.then(function () { delete wait[src]; }, function () { delete wait[src]; });
    return p;
  }

  /* 화면에 그린 뒤 부른다 — img[data-pic] 마다 그림을 채운다 */
  function fill(root) {
    var list = (root || document).querySelectorAll('img[data-pic]');
    Array.prototype.forEach.call(list, function (img) {
      var src = img.getAttribute('data-pic'), box = img.closest('.pic-box');
      if (mem[src]) { img.src = mem[src]; if (box) box.classList.add('ok'); return; }
      load(src).then(function (url) {
        if (!img.isConnected) return;
        img.src = url; if (box) box.classList.add('ok');
      }, function (e) {
        if (!box || !img.isConnected) return;
        var w = box.querySelector('.pic-wait');
        if (w) w.textContent = e && e.offline ? '인터넷이 연결되면 그림이 보여요' : '그림을 받지 못했어요. 조금 뒤 다시 열어 주세요';
        box.classList.add('fail');
      });
    });
  }

  /* ---------- 전체 화면 보기 ---------- */
  var V = null;          // {el, rot, box, img, tip, x}
  var S = { open: false, pushed: false, locked: false, fs: false, rot: false, src: '', w: 1, h: 1, z: 1, tx: 0, ty: 0, bw: 0, bh: 0 };
  var ptrs = {}, gest = null, lastTap = 0, lastXY = null, tipTimer = 0;

  function build() {
    if (V) return V;
    var el = document.createElement('div');
    el.className = 'picv'; el.id = 'picv'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '그림 풀이 크게 보기');
    /* 닫기 단추 · 안내 · 받는 중 글은 돌린 칸 안에 둔다 — 그림을 돌리면 함께 돌아 늘 그림의 오른쪽 위 · 아래 가운데에 선다 */
    el.innerHTML = '<div class="picv-rot"><div class="picv-box"><img class="picv-img" alt="" draggable="false"></div>' +
      '<p class="picv-wait" hidden>그림을 받는 중이에요</p>' +
      '<p class="picv-tip">두 손가락으로 벌리면 커져요</p>' +
      '<button class="picv-x" type="button" aria-label="닫기"><span aria-hidden="true">✕</span> 닫기</button></div>';
    document.body.appendChild(el);
    V = { el: el, rot: el.querySelector('.picv-rot'), box: el.querySelector('.picv-box'), img: el.querySelector('.picv-img'),
      tip: el.querySelector('.picv-tip'), wait: el.querySelector('.picv-wait'), x: el.querySelector('.picv-x') };
    V.x.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); close(false); });
    el.addEventListener('click', function (ev) { ev.stopPropagation(); });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    /* 아이폰 사파리는 화면 확대를 gesture 로도 한다 — 그림 칸 안에서는 막는다(확대는 위 손가락 셈이 한다) */
    el.addEventListener('gesturestart', function (ev) { ev.preventDefault(); });
    el.addEventListener('touchmove', function (ev) { ev.preventDefault(); }, { passive: false });
    return V;
  }

  function vw() { return window.innerWidth || document.documentElement.clientWidth; }
  function vh() { return window.innerHeight || document.documentElement.clientHeight; }

  /* 놓기 — 세운 화면인데 가로 잠금이 안 됐으면 90도 돌린 칸(가로 vh × 세로 vw)에 그림을 맞춘다 */
  function layout() {
    if (!V || !S.open) return;
    var W = vw(), H = vh();
    S.rot = !S.locked && H > W;
    var bw = S.rot ? H : W, bh = S.rot ? W : H;
    V.el.classList.toggle('rot', S.rot);
    V.rot.style.width = bw + 'px'; V.rot.style.height = bh + 'px';
    var s = Math.min(bw / S.w, bh / S.h);
    S.bw = bw; S.bh = bh; S.dw = S.w * s; S.dh = S.h * s;
    V.box.style.width = S.dw + 'px'; V.box.style.height = S.dh + 'px';
    clamp(); paint();
  }
  function clamp() {
    if (S.z < 1) S.z = 1;
    if (S.z > ZMAX) S.z = ZMAX;
    var mx = Math.max(0, (S.dw * S.z - S.bw) / 2), my = Math.max(0, (S.dh * S.z - S.bh) / 2);
    S.tx = Math.max(-mx, Math.min(mx, S.tx)); S.ty = Math.max(-my, Math.min(my, S.ty));
  }
  function paint() { if (V) V.box.style.transform = 'translate(' + S.tx + 'px,' + S.ty + 'px) scale(' + S.z + ')'; }

  /* 화면 좌표(가운데 기준) → 그림 칸 좌표. 돌린 칸은 시계 방향 90도라 칸의 x 축이 화면 아래, y 축이 화면 왼쪽이다 */
  function local(x, y) {
    var cx = x - vw() / 2, cy = y - vh() / 2;
    return S.rot ? { x: cy, y: -cx } : { x: cx, y: cy };
  }
  function pts() { var a = []; for (var k in ptrs) a.push(ptrs[k]); return a; }
  function startGest() {
    var a = pts();
    if (a.length >= 2) {
      var p = local(a[0].x, a[0].y), q = local(a[1].x, a[1].y);
      var m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      gest = { kind: 'pinch', d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, z0: S.z, qx: (m.x - S.tx) / S.z, qy: (m.y - S.ty) / S.z };
    } else if (a.length === 1) {
      var o = local(a[0].x, a[0].y);
      gest = { kind: 'pan', x0: o.x, y0: o.y, tx0: S.tx, ty0: S.ty, moved: 0 };
    } else gest = null;
  }
  function down(ev) {
    if (ev.target.closest && ev.target.closest('.picv-x')) return;
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    try { V.el.setPointerCapture(ev.pointerId); } catch (e) { /* 그대로 */ }
    startGest();
    hideTip();
  }
  function move(ev) {
    if (!ptrs[ev.pointerId] || !gest) return;
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var a = pts();
    if (gest.kind === 'pinch' && a.length >= 2) {
      var p = local(a[0].x, a[0].y), q = local(a[1].x, a[1].y);
      var m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      S.z = Math.max(1, Math.min(ZMAX, gest.z0 * Math.hypot(p.x - q.x, p.y - q.y) / gest.d0));
      S.tx = m.x - S.z * gest.qx; S.ty = m.y - S.z * gest.qy;
    } else if (gest.kind === 'pan' && a.length === 1) {
      var o = local(a[0].x, a[0].y);
      gest.moved = Math.max(gest.moved, Math.hypot(o.x - gest.x0, o.y - gest.y0));
      if (S.z > 1) { S.tx = gest.tx0 + (o.x - gest.x0); S.ty = gest.ty0 + (o.y - gest.y0); }
    } else return;
    clamp(); paint();
  }
  function up(ev) {
    if (!ptrs[ev.pointerId]) return;
    var was = gest, at = ptrs[ev.pointerId];
    delete ptrs[ev.pointerId];
    if (was && was.kind === 'pan' && was.moved < 10 && ev.type === 'pointerup') {
      var now = Date.now();
      if (now - lastTap < 320 && lastXY && Math.hypot(at.x - lastXY.x, at.y - lastXY.y) < 30) { lastTap = 0; dbl(at.x, at.y); }
      else { lastTap = now; lastXY = at; }
    }
    startGest();
    if (was && was.kind === 'pinch' && gest) gest.moved = 99;   // 벌리다 손가락 하나를 뗀 것은 누르기로 안 센다
  }
  /* 두 번 누르기 — 원래 크기면 누른 곳을 2.5배로, 커져 있으면 원래대로 */
  function dbl(x, y) {
    if (S.z > 1.05) { S.z = 1; S.tx = 0; S.ty = 0; }
    else {
      var m = local(x, y), z = 2.5;
      S.tx = m.x - z * (m.x - S.tx) / S.z; S.ty = m.y - z * (m.y - S.ty) / S.z; S.z = z;
    }
    clamp(); paint();
  }
  function wheel(ev) {
    ev.preventDefault();
    var m = local(ev.clientX, ev.clientY), z = Math.max(1, Math.min(ZMAX, S.z * Math.exp(-ev.deltaY / 300)));
    S.tx = m.x - z * (m.x - S.tx) / S.z; S.ty = m.y - z * (m.y - S.ty) / S.z; S.z = z;
    clamp(); paint();
  }
  function hideTip() { if (V && V.tip) V.tip.classList.add('gone'); }

  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

  /* 열기 — 앱 안 칸으로만 화면을 채운다(0.5.2 · 브라우저 전체 화면은 안 청한다) */
  function open(src, w, h, title, small) {
    if (!src) return;
    build();
    S.open = true; S.src = src; S.w = +w || 1600; S.h = +h || 1131; S.z = 1; S.tx = 0; S.ty = 0; S.locked = false; S.fs = false;
    ptrs = {}; gest = null; lastTap = 0;
    V.el.setAttribute('aria-label', '그림 풀이 크게 보기' + (title ? ' — ' + title : ''));
    V.img.alt = '그림 풀이' + (title ? ' — ' + title : '');
    V.img.removeAttribute('src');
    V.tip.classList.remove('gone');
    clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 3500);
    V.el.hidden = false;
    document.documentElement.classList.add('picv-on');
    try { history.pushState({ upgradePic: 1 }, '', location.href); S.pushed = true; } catch (e) { S.pushed = false; }
    layout();
    /* 큰 그림(4배)이 없으면 카드에 쓴 작은 그림을 먼저 보이고, 큰 그림이 오면 바꿔 끼운다 */
    S.big = false;
    if (mem[src]) { V.img.src = mem[src]; V.wait.hidden = true; S.big = true; }
    else {
      var shown = !!(small && small !== src && mem[small]);
      if (shown) { V.img.src = mem[small]; V.wait.hidden = true; }
      else { V.wait.hidden = false; V.wait.textContent = '그림을 받는 중이에요'; }
      load(src).then(function (url) { if (S.open && S.src === src) { V.img.src = url; V.wait.hidden = true; S.big = true; } },
        function (e) { if (S.open && S.src === src && !shown) V.wait.textContent = e && e.offline ? '인터넷이 연결되면 그림이 보여요' : '그림을 받지 못했어요. 조금 뒤 다시 열어 주세요'; });
    }
    setTimeout(function () { if (S.open && V) try { V.x.focus({ preventScroll: true }); } catch (e) { /* 그대로 */ } }, 0);
  }

  /* 닫기 — 닫기 단추 · Esc · 전체 화면이 풀림 · 뒤로 가기(fromPop) */
  function close(fromPop) {
    if (!S.open) return;
    S.open = false;
    clearTimeout(tipTimer);
    V.el.hidden = true; V.el.classList.remove('rot');
    document.documentElement.classList.remove('picv-on');
    ptrs = {}; gest = null;
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* 그대로 */ }
    if (fsEl()) {
      try { var x = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen(); if (x && x.catch) x.catch(function () {}); } catch (e) { /* 그대로 */ }
    }
    if (S.pushed) { S.pushed = false; if (!fromPop) { try { history.back(); } catch (e) { /* 그대로 */ } } }
  }

  window.addEventListener('popstate', function () { if (S.open) close(true); });
  function fsChange() { if (S.open && S.fs && !fsEl()) close(false); }
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);
  document.addEventListener('keydown', function (ev) { if (S.open && ev.key === 'Escape') { ev.preventDefault(); close(false); } });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  return {
    load: load, fill: fill, open: open, close: close,
    state: function () { return { open: S.open, big: !!S.big, rot: S.rot, locked: S.locked, fs: S.fs, z: S.z, tx: S.tx, ty: S.ty, bw: S.bw, bh: S.bh, dw: S.dw, dh: S.dh }; },
    _local: local
  };
})();

if (typeof module === 'object' && module.exports) module.exports = Pics;
