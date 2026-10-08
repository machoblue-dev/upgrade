/* UP:GRADE — 서비스 워커(0.3.0)

   왜 두나 — 안드로이드 크롬은 이 파일이 요청을 받아 주어야 앱 안 「저장하기」 단추로 설치 창을 띄운다(홈 화면 아이콘).
   설계(260930)는 서비스 워커를 안 쓰기로 했는데, 아이콘 저장을 넣으며 아래처럼 「늘 인터넷 먼저」로만 둔다.

   · 앱 파일(같은 주소의 GET)은 언제나 인터넷에서 먼저 받는다 — 새 판이 늦게 닿는 일이 없다.
     받은 것은 저장해 두었다가 인터넷이 끊겼을 때만 낸다(끊겨도 앱이 열리고 받아 둔 자료로 복습할 수 있다)
   · version.json · sw.js 는 건드리지 않는다(새 판 확인은 늘 인터넷으로)
   · 서버(supabase) · 글꼴 사이트처럼 다른 주소 요청은 건드리지 않는다
   · 같은 파일의 옛 판(?v= 꼬리만 다른 것)은 새 판을 받으면 지운다
   이 파일을 고치면 CACHE 이름 끝 숫자를 올린다 — 옛 저장본이 통째로 지워진다 */
var CACHE = 'upgrade-app-1';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('upgrade-app-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function keep(req, res) {
  var copy = res.clone(), u = new URL(req.url);
  return caches.open(CACHE).then(function (c) {
    return c.put(req, copy).then(function () {
      if (!u.search) return;
      /* 같은 파일의 옛 판을 지운다 — style.css?v=0.2.3 을 받아 두었는데 style.css?v=0.3.0 이 왔다 */
      return c.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { var x = new URL(k.url); return x.pathname === u.pathname && x.search !== u.search; })
          .map(function (k) { return c.delete(k); }));
      });
    });
  }).catch(function () { /* 저장을 못 해도 화면은 그대로 */ });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (/\/(version\.json|sw\.js)$/.test(u.pathname)) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic') e.waitUntil(keep(req, res));
    return res;
  }, function () {
    return caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return c.match(new URL('./', self.registration.scope).href).then(function (h) { return h || c.match(new URL('index.html', self.registration.scope).href); });
        return undefined;
      });
    }).then(function (hit) { return hit || Response.error(); });
  }));
});
