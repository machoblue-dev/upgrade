/* UP:GRADE — 고정 값(구현 사양 1절)
   공개 열쇠(publishable)는 앱 화면에 넣어도 되는 열쇠다. 비밀 열쇠는 여기에 절대 넣지 않는다.
   APP_VERSION 을 올리면 version.json 의 v 와 index.html 스크립트 꼬리(?v=)도 함께 올린다 —
   셋이 어긋나면 열 때마다 새로 고치거나(version.json) 옛 스크립트가 남는다(꼬리). 시험 스크립트가 셋을 맞대 본다 */
var CONFIG = {
  url: 'https://lrurwcgkmbinmshicywd.supabase.co',
  key: 'sb_publishable_FyapkcWxN9T6AjpQjPbgpw_1xd7CrO1'
};
var APP_VERSION = '0.4.1';
