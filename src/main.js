// 부트스트랩.
//
// 1. 카테고리 칩 + 카드 그리드 + 카드 클릭 핸들러 등록 (discover)
// 2. Ask AI 입력 / preset / 결과 카드 핸들러 등록 (ask-ai)
// 3. 모달 닫기 + 네트워크 배너 닫기
// 4. IntersectionObserver 진입 애니메이션
// 5. 초기 로드: All 카테고리 스킬 목록

import { bindDiscover, loadCategory } from './views/discover.js';
import { bindAskAi } from './views/ask-ai.js';
import { bindModalDismiss, attachReveal, $$ } from './lib/ui.js';

function boot() {
  bindDiscover();
  bindAskAi();
  bindModalDismiss();
  attachReveal($$('section, .hero'));
  loadCategory('all');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
