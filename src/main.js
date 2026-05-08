// 부트스트랩 (스텁 단계).
//
// 현재는 view 파일이 없어 view 바인딩과 초기 데이터 로드는 생략.
// 후속 작업에서 discover / ask-ai / skill-detail view 가 추가될 때
// 여기에 import + bind*() 호출을 누적한다.

import { bindModalDismiss, attachReveal, $$ } from './lib/ui.js';

function boot() {
  bindModalDismiss();
  attachReveal($$('section, .hero'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
