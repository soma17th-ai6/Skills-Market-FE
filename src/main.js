// 부트스트랩.
//
// 1. 카테고리 칩 + 카드 그리드 + 카드 클릭 핸들러 등록 (discover)
// 2. 모달 닫기 + 네트워크 배너 닫기
// 3. IntersectionObserver 진입 애니메이션
// 4. 초기 로드: All 카테고리 스킬 목록
//
// Ask AI view 는 후속 작업에서 추가.

import { bindDiscover, loadCategory } from './views/discover.js';
import { bindModalDismiss, attachReveal, $$ } from './lib/ui.js';

function boot() {
  bindDiscover();
  bindModalDismiss();
  attachReveal($$('section, .hero'));
  loadCategory('all');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
